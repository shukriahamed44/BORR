/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for the Payment Processing Domain (`PaymentsService`).
 * Orchestrates the injected `PaymentGateway` (Stripe-shaped) through the PaymentIntent
 * lifecycle — create, confirm, refund — and persists the resulting authoritative `Payment`
 * records in PostgreSQL. Enforces reservation ownership for customers, prevents duplicate
 * settlement, and exposes a paginated, filterable transaction ledger.
 *
 * IN SIMPLE WORDS:
 * Handles paying for a reservation and refunding it. It talks to the card processor through a
 * swappable adapter, then records what happened in the database — which stays the source of
 * truth even if the processor is unavailable.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { PaymentGateway } from './gateway/payment.gateway';

/** Currency is stored in major units in the DB but exchanged with the gateway in minor units. */
const toMinor = (amount: number) => Math.round(amount * 100);

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: PaymentGateway,
    private activity: ActivityService,
  ) {}

  /**
   * Runs a reservation payment through the gateway and records the outcome.
   * A declined authorisation is persisted as FAILED before the error is surfaced, so the
   * attempt still appears in the ledger.
   */
  async processPayment(dto: ProcessPaymentDto, user: { id: string; role: Role }) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: { payments: true },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID '${dto.reservationId}' not found.`);
    }

    // Customers may only pay for their own reservations.
    if (user.role === Role.CUSTOMER && reservation.userId !== user.id) {
      throw new ForbiddenException('You can only pay for your own reservations.');
    }

    const existingPaid = reservation.payments.find((p) => p.status === PaymentStatus.PAID);
    if (existingPaid) {
      throw new ConflictException(
        `Reservation '${dto.reservationId}' is already paid (Transaction ID: ${existingPaid.transactionId}).`,
      );
    }

    const amountMinor = toMinor(dto.amount);

    const intent = await this.gateway.createPaymentIntent({
      amountMinor,
      metadata: {
        reservationId: reservation.id,
        customerId: reservation.userId,
      },
    });

    const confirmed = await this.gateway.confirmPaymentIntent(intent.id, {
      simulateFailure: dto.simulateFailure,
    });

    if (confirmed.status !== 'succeeded') {
      const failed = await this.prisma.payment.create({
        data: {
          reservationId: dto.reservationId,
          amount: dto.amount,
          status: PaymentStatus.FAILED,
          transactionId: confirmed.id,
          provider: this.gateway.provider,
          failureReason: confirmed.lastPaymentError?.message ?? 'Payment was declined.',
        },
      });

      // Declines are audited too — a failed attempt is security-relevant.
      await this.activity.record({
        userId: user.id,
        action: ActivityAction.PAYMENT_PROCESSED,
        entityType: 'Payment',
        entityId: failed.id,
        metadata: {
          outcome: 'FAILED',
          amount: dto.amount,
          reservationId: dto.reservationId,
          transactionId: failed.transactionId,
        },
      });

      throw new BadRequestException(
        `Payment declined: ${failed.failureReason} (Transaction ID: ${failed.transactionId}).`,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        reservationId: dto.reservationId,
        amount: dto.amount,
        status: PaymentStatus.PAID,
        transactionId: confirmed.id,
        provider: this.gateway.provider,
      },
    });

    await this.activity.record({
      userId: user.id,
      action: ActivityAction.PAYMENT_PROCESSED,
      entityType: 'Payment',
      entityId: payment.id,
      metadata: {
        outcome: 'PAID',
        amount: dto.amount,
        reservationId: dto.reservationId,
        transactionId: payment.transactionId,
        provider: this.gateway.provider,
      },
    });

    return {
      message: 'Payment processed successfully.',
      status: PaymentStatus.PAID,
      payment,
      // Surfaced so a real Stripe front end could confirm client-side; harmless for the mock.
      clientSecret: confirmed.clientSecret,
    };
  }

  /** Refunds a settled payment through the gateway, then marks the record REFUNDED. */
  async refundPayment(dto: RefundPaymentDto, actorId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID '${dto.paymentId}' not found.`);
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        `Cannot refund payment '${dto.paymentId}' with current status '${payment.status}'. Only PAID payments can be refunded.`,
      );
    }

    await this.gateway.refund({
      paymentIntentId: payment.transactionId ?? '',
      amountMinor: toMinor(Number(payment.amount)),
      reason: dto.reason,
    });

    const refunded = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        failureReason: dto.reason ?? null,
      },
    });

    await this.activity.record({
      userId: actorId,
      action: ActivityAction.PAYMENT_REFUNDED,
      entityType: 'Payment',
      entityId: refunded.id,
      metadata: {
        amount: Number(refunded.amount),
        reservationId: refunded.reservationId,
        transactionId: refunded.transactionId,
        reason: dto.reason ?? null,
      },
    });

    return {
      message: 'Payment refunded successfully.',
      reason: dto.reason || 'No reason provided',
      payment: refunded,
    };
  }

  /**
   * Paginated transaction ledger. Customers are hard-scoped to payments on their own
   * reservations regardless of the filters supplied.
   */
  async findAll(user: { id: string; role: Role }, query: QueryPaymentsDto = {}) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.PaymentWhereInput = {};

    if (user.role === Role.CUSTOMER) {
      where.reservation = { userId: user.id };
    }
    if (query.status) where.status = query.status;
    if (query.reservationId) where.reservationId = query.reservationId;

    const [total, payments, grouped, paidAgg, refundedAgg] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reservation: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: user.role === Role.CUSTOMER ? { reservation: { userId: user.id } } : {},
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          ...(user.role === Role.CUSTOMER ? { reservation: { userId: user.id } } : {}),
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          ...(user.role === Role.CUSTOMER ? { reservation: { userId: user.id } } : {}),
          status: PaymentStatus.REFUNDED,
        },
      }),
    ]);

    const statusCounts = grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      count: payments.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      statusCounts,
      totals: {
        collected: Number(paidAgg._sum.amount ?? 0),
        refunded: Number(refundedAgg._sum.amount ?? 0),
      },
      payments,
    };
  }

  /** Payment history for one reservation, ownership-checked. */
  async findByReservation(reservationId: string, user: { id: string; role: Role }) {
    if (user.role === Role.CUSTOMER) {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        select: { userId: true },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');
      if (reservation.userId !== user.id) {
        throw new ForbiddenException('Access denied to this reservation.');
      }
    }

    const payments = await this.prisma.payment.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
    });

    return { count: payments.length, payments };
  }
}
