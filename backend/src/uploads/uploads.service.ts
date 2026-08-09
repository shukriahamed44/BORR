/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for document uploads (`UploadsService`). Validates MIME type and
 * size at the trust boundary, delegates binary persistence to the injected `StorageDriver`,
 * and records metadata rows. Enforces ownership on read and restricts verification
 * transitions to STAFF/ADMIN.
 *
 * IN SIMPLE WORDS:
 * Handles customer document uploads — checks the file is an allowed type and size, saves it
 * through the storage driver, and makes sure people can only see their own documents while
 * staff can review and verify them.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, Role, UploadStatus, UploadType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { StorageDriver } from './storage/storage.driver';

/** Documents are identity papers and agreements; images cover equipment photos. */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageDriver,
    private activity: ActivityService,
  ) {}

  async create(
    user: { id: string; role: Role },
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    dto: { type: UploadType; reservationId?: string },
  ) {
    if (!file) throw new BadRequestException('A file is required.');

    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}'. Allowed: JPEG, PNG, WebP, PDF.`,
      );
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${MAX_BYTES / (1024 * 1024)}MB limit.`,
      );
    }

    // A customer may only attach documents to their own reservation.
    if (dto.reservationId) {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
        select: { id: true, userId: true },
      });
      if (!reservation) {
        throw new NotFoundException('Reservation not found.');
      }
      if (user.role === Role.CUSTOMER && reservation.userId !== user.id) {
        throw new ForbiddenException('You can only attach documents to your own reservation.');
      }
    }

    const stored = await this.storage.put(file.buffer, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      prefix: dto.type.toLowerCase(),
    });

    const upload = await this.prisma.upload.create({
      data: {
        type: dto.type,
        originalName: file.originalname,
        storageKey: stored.storageKey,
        mimeType: file.mimetype,
        sizeBytes: stored.sizeBytes,
        ownerId: user.id,
        reservationId: dto.reservationId,
      },
    });

    await this.activity.record({
      userId: user.id,
      action: ActivityAction.DOCUMENT_UPLOADED,
      entityType: 'Upload',
      entityId: upload.id,
      metadata: {
        type: dto.type,
        reservationId: dto.reservationId ?? null,
        sizeBytes: stored.sizeBytes,
        mimeType: file.mimetype,
      },
    });

    return { message: 'Document uploaded and awaiting review.', upload };
  }

  /** Lists uploads; customers see only their own. */
  async findAll(
    user: { id: string; role: Role },
    filter: { reservationId?: string; ownerId?: string; status?: UploadStatus } = {},
  ) {
    const where: any = {};

    if (user.role === Role.CUSTOMER) {
      where.ownerId = user.id;
    } else if (filter.ownerId) {
      where.ownerId = filter.ownerId;
    }

    if (filter.reservationId) where.reservationId = filter.reservationId;
    if (filter.status) where.status = filter.status;

    const uploads = await this.prisma.upload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    return { count: uploads.length, uploads };
  }

  /** Resolves an upload the caller is entitled to read, with its bytes. */
  async getFile(id: string, user: { id: string; role: Role }) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Document not found.');

    if (user.role === Role.CUSTOMER && upload.ownerId !== user.id) {
      throw new ForbiddenException('Access denied to this document.');
    }

    const buffer = await this.storage.get(upload.storageKey);
    return { upload, buffer };
  }

  /** STAFF/ADMIN verification decision. */
  async review(
    id: string,
    reviewerId: string,
    dto: { status: UploadStatus; rejectionNote?: string },
  ) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Document not found.');

    if (dto.status === UploadStatus.PENDING_REVIEW) {
      throw new BadRequestException('A review must resolve to VERIFIED or REJECTED.');
    }

    const updated = await this.prisma.upload.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionNote:
          dto.status === UploadStatus.REJECTED ? dto.rejectionNote ?? null : null,
      },
    });

    await this.activity.record({
      userId: reviewerId,
      action: ActivityAction.DOCUMENT_REVIEWED,
      entityType: 'Upload',
      entityId: updated.id,
      metadata: {
        outcome: dto.status,
        documentType: updated.type,
        ownerId: updated.ownerId,
        ...(dto.rejectionNote ? { rejectionNote: dto.rejectionNote } : {}),
      },
    });

    return { message: `Document marked ${dto.status}.`, upload: updated };
  }
}
