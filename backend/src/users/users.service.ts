/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for the User Directory domain (`UsersService`).
 * Provides paginated, filterable account listings enriched with reservation, spend and
 * document-verification aggregates, plus a detailed per-account profile. Every projection
 * explicitly selects columns so `passwordHash` can never leave the service boundary.
 *
 * IN SIMPLE WORDS:
 * Powers the customer directory for staff — who the customers are, how many bookings and how
 * much they have spent, and whether their identity documents have been verified. Password
 * hashes are never included in any response.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  ReservationStatus,
  Role,
  UploadStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';

/**
 * Field allow-list shared by every read. Selecting explicitly (rather than excluding
 * passwordHash) means a future column is private by default instead of leaking.
 */
const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Paginated account directory with per-account activity aggregates. */
  async findAll(query: QueryUsersDto = {}) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users, roleGroups] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          ...PUBLIC_USER_FIELDS,
          _count: { select: { reservations: true, uploads: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);

    // Spend and verification state are per-user aggregates; batch them so the list
    // costs a fixed number of queries rather than N per row.
    const userIds = users.map((u) => u.id);

    const [spendRows, pendingDocRows] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['reservationId'],
        _sum: { amount: true },
        where: {
          status: PaymentStatus.PAID,
          reservation: { userId: { in: userIds } },
        },
      }),
      this.prisma.upload.groupBy({
        by: ['ownerId', 'status'],
        _count: { _all: true },
        where: { ownerId: { in: userIds } },
      }),
    ]);

    // Map reservation-scoped payment sums back onto their owning user.
    const reservationOwners = await this.prisma.reservation.findMany({
      where: { id: { in: spendRows.map((r) => r.reservationId) } },
      select: { id: true, userId: true },
    });
    const ownerByReservation = new Map(reservationOwners.map((r) => [r.id, r.userId]));

    const spendByUser = new Map<string, number>();
    for (const row of spendRows) {
      const ownerId = ownerByReservation.get(row.reservationId);
      if (!ownerId) continue;
      spendByUser.set(ownerId, (spendByUser.get(ownerId) ?? 0) + Number(row._sum.amount ?? 0));
    }

    const docsByUser = new Map<string, { pending: number; verified: number; rejected: number }>();
    for (const row of pendingDocRows) {
      const entry = docsByUser.get(row.ownerId) ?? { pending: 0, verified: 0, rejected: 0 };
      if (row.status === UploadStatus.PENDING_REVIEW) entry.pending = row._count._all;
      if (row.status === UploadStatus.VERIFIED) entry.verified = row._count._all;
      if (row.status === UploadStatus.REJECTED) entry.rejected = row._count._all;
      docsByUser.set(row.ownerId, entry);
    }

    const roleCounts = roleGroups.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = row._count._all;
      return acc;
    }, {});

    return {
      count: users.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      roleCounts,
      users: users.map(({ _count, ...user }) => {
        const docs = docsByUser.get(user.id) ?? { pending: 0, verified: 0, rejected: 0 };
        return {
          ...user,
          reservationCount: _count.reservations,
          documentCount: _count.uploads,
          totalSpend: spendByUser.get(user.id) ?? 0,
          documents: docs,
          // Derived, not stored: an account counts as verified once at least one document
          // has been approved and none are still awaiting review.
          verificationStatus:
            docs.verified > 0 && docs.pending === 0
              ? 'VERIFIED'
              : docs.pending > 0
              ? 'PENDING_REVIEW'
              : 'UNVERIFIED',
        };
      }),
    };
  }

  /** Full profile: account fields, recent reservations and every uploaded document. */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...PUBLIC_USER_FIELDS,
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            totalPrice: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            payments: { select: { id: true, status: true, amount: true, createdAt: true } },
          },
        },
        uploads: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            rejectionNote: true,
            reviewedAt: true,
            createdAt: true,
            reservationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    const outOnHire: ReservationStatus[] = [
      ReservationStatus.APPROVED,
      ReservationStatus.ACTIVE,
    ];
    const activeReservations = user.reservations.filter((r) =>
      outOnHire.includes(r.status),
    ).length;

    const totalSpend = user.reservations
      .flatMap((r) => r.payments)
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      ...user,
      stats: {
        reservationCount: user.reservations.length,
        activeReservations,
        totalSpend,
        documentCount: user.uploads.length,
        pendingDocuments: user.uploads.filter((u) => u.status === UploadStatus.PENDING_REVIEW)
          .length,
      },
    };
  }

  /** Role distribution used by the directory summary tiles. */
  async roleSummary() {
    const groups = await this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
    return groups.reduce<Record<Role, number>>(
      (acc, row) => {
        acc[row.role] = row._count._all;
        return acc;
      },
      { ADMIN: 0, STAFF: 0, CUSTOMER: 0, WAREHOUSE_OPERATOR: 0 },
    );
  }
}
