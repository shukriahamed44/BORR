/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * State Machine & Transaction Service for Equipment Reservations (`ReservationsService`).
 * Encapsulates multi-item reservation creation, atomic price calculation, stock availability verification,
 * and state transitions (`PENDING` ➔ `APPROVED` ➔ `ACTIVE` ➔ `RETURNED`).
 * Uses Prisma `$transaction` API for atomic database operations.
 *
 * IN SIMPLE WORDS:
 * The core transaction engine that processes equipment rental requests, checks stock availability, calculates rental costs, and enforces reservation approval and return workflows.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-status.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';

@Injectable()
export class ReservationsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Run periodic check for upcoming returns and expired reservations every 10 minutes
    setInterval(() => {
      this.checkUpcomingAndExpiredReservations().catch(() => {});
    }, 10 * 60 * 1000);
  }

  /**
   * Creates a new reservation in PENDING state with atomic price calculation and stock validation.
   */
  async create(userId: string, dto: CreateReservationDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start >= end) {
      throw new BadRequestException('Reservation end date must be strictly after the start date.');
    }

    if (start < new Date()) {
      throw new BadRequestException('Reservation start date cannot be in the past.');
    }

    // Calculate duration in days (round up partial days to at least 1 day)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let totalPrice = 0;
    const itemsToCreate: { productId: string; quantity: number; unitPrice: number }[] = [];

    // Verify each requested product and stock availability
    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Equipment with ID '${item.productId}' does not exist.`);
      }

      if (product.totalStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for equipment '${product.name}'. Requested: ${item.quantity}, Available: ${product.totalStock}.`,
        );
      }

      const unitPrice = Number(product.pricePerDay);
      const itemSubtotal = durationDays * unitPrice * item.quantity;
      totalPrice += itemSubtotal;

      itemsToCreate.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
      });
    }

    // Execute atomic transaction: Create Reservation + ReservationItems
    const reservation = await this.prisma.$transaction(async (tx) => {
      const createdReservation = await tx.reservation.create({
        data: {
          userId,
          status: ReservationStatus.PENDING,
          startDate: start,
          endDate: end,
          totalPrice,
          items: {
            createMany: {
              data: itemsToCreate,
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return createdReservation;
    });

    return {
      message: 'Reservation created successfully and is pending approval.',
      reservation,
    };
  }

  /**
   * Enforces State Machine rules and executes status transitions.
   */
  async updateStatus(
    id: string,
    dto: UpdateReservationStatusDto,
    currentUser: { id: string; role: Role },
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID '${id}' not found.`);
    }

    const currentStatus = reservation.status;
    const targetStatus = dto.status;

    // Role Permission Check: CUSTOMER can only CANCEL their own PENDING reservation
    if (currentUser.role === Role.CUSTOMER) {
      if (reservation.userId !== currentUser.id) {
        throw new ForbiddenException('You can only modify your own reservations.');
      }
      if (targetStatus !== ReservationStatus.CANCELLED || currentStatus !== ReservationStatus.PENDING) {
        throw new ForbiddenException('Customers can only cancel PENDING reservations.');
      }
    }

    // State Machine Validation Rules
    this.validateStatusTransition(currentStatus, targetStatus);

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: targetStatus,
        // Only meaningful on rejection; cleared on any other transition so a stale
        // reason never lingers on an approved reservation.
        rejectionReason:
          targetStatus === ReservationStatus.REJECTED ? dto.rejectionReason ?? null : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Asynchronously enqueue notification tasks via BullMQ Redis queue
    if (targetStatus === ReservationStatus.APPROVED) {
      await this.notificationsService.notifyReservationApproved({
        reservationId: updated.id,
        userEmail: updated.user.email,
        startDate: updated.startDate,
        endDate: updated.endDate,
      });
    } else if (targetStatus === ReservationStatus.REJECTED) {
      await this.notificationsService.notifyReservationRejected({
        reservationId: updated.id,
        userEmail: updated.user.email,
      });
    }

    return {
      message: `Reservation status updated from ${currentStatus} to ${targetStatus}.`,
      reservation: updated,
    };
  }

  /**
   * Background task: Checks for upcoming returns (within 24 hours) and expired pending reservations.
   */
  async checkUpcomingAndExpiredReservations() {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Process Upcoming Returns for ACTIVE or APPROVED reservations ending within 24 hours
    const upcoming = await this.prisma.reservation.findMany({
      where: {
        status: { in: [ReservationStatus.APPROVED, ReservationStatus.ACTIVE] },
        endDate: { gte: now, lte: next24Hours },
      },
      include: { user: { select: { email: true } } },
    });

    for (const res of upcoming) {
      await this.notificationsService.notifyUpcomingReturn({
        reservationId: res.id,
        userEmail: res.user.email,
        endDate: res.endDate,
      });
    }

    // 2. Process Expired Reservations (PENDING past startDate)
    const expired = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.PENDING,
        startDate: { lt: now },
      },
      include: { user: { select: { email: true } } },
    });

    for (const res of expired) {
      await this.prisma.reservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.CANCELLED },
      });

      await this.notificationsService.notifyReservationExpired({
        reservationId: res.id,
        userEmail: res.user.email,
      });
    }

    return {
      upcomingCount: upcoming.length,
      expiredCount: expired.length,
    };
  }

  /**
   * State Machine transition validator logic.
   */
  private validateStatusTransition(current: ReservationStatus, target: ReservationStatus) {
    if (current === target) return;

    const terminalStates: ReservationStatus[] = [
      ReservationStatus.RETURNED,
      ReservationStatus.REJECTED,
      ReservationStatus.CANCELLED,
    ];

    // Terminal states cannot transition
    if (terminalStates.includes(current)) {
      throw new BadRequestException(`Cannot change status of a reservation in terminal '${current}' state.`);
    }

    // Valid Transitions
    if (current === ReservationStatus.PENDING) {
      const allowedFromPending: ReservationStatus[] = [
        ReservationStatus.APPROVED,
        ReservationStatus.REJECTED,
        ReservationStatus.CANCELLED,
      ];
      if (!allowedFromPending.includes(target)) {
        throw new BadRequestException(`PENDING reservation can only transition to APPROVED, REJECTED, or CANCELLED.`);
      }
    } else if (current === ReservationStatus.APPROVED) {
      const allowedFromApproved: ReservationStatus[] = [
        ReservationStatus.ACTIVE,
        ReservationStatus.CANCELLED,
      ];
      if (!allowedFromApproved.includes(target)) {
        throw new BadRequestException(`APPROVED reservation can only transition to ACTIVE (checked out) or CANCELLED.`);
      }
    } else if (current === ReservationStatus.ACTIVE) {
      if (target !== ReservationStatus.RETURNED) {
        throw new BadRequestException(`ACTIVE reservation can only transition to RETURNED (checked in).`);
      }
    }
  }

  /**
   * Retrieves all reservations (Filtered by user for CUSTOMER role).
   */
  async findAll(user: { id: string; role: Role }, query: QueryReservationsDto = {}) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.ReservationWhereInput = {};

    // Customers are hard-scoped to their own rows regardless of any query parameters.
    if (user.role === Role.CUSTOMER) where.userId = user.id;
    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, reservations, grouped] = await Promise.all([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          items: { include: { product: true } },
          payments: true,
          uploads: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // Per-status tallies for the UI tabs, scoped the same way but ignoring the
      // status filter itself so every tab keeps showing its own count.
      this.prisma.reservation.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: user.role === Role.CUSTOMER ? { userId: user.id } : {},
      }),
    ]);

    const statusCounts = grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      count: reservations.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      statusCounts,
      reservations,
    };
  }

  /**
   * Retrieves single reservation by ID.
   */
  async findOne(id: string, user: { id: string; role: Role }) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID '${id}' not found.`);
    }

    if (user.role === Role.CUSTOMER && reservation.userId !== user.id) {
      throw new ForbiddenException('Access denied to this reservation.');
    }

    return reservation;
  }
}
