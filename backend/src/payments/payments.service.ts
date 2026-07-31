/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for Payment Processing Domain (`PaymentsService`).
 * Simulates gateway payment execution (`PAID` / `FAILED`), generates transaction audit IDs,
 * handles refund processing (`REFUNDED`), and updates PostgreSQL payment database records.
 *
 * IN SIMPLE WORDS:
 * Handles mock credit card charges for reservations, generates receipt transaction codes, and processes customer refunds.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Simulates payment processing for an equipment reservation.
   */
  async processPayment(dto: ProcessPaymentDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: { payments: true },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID '${dto.reservationId}' not found.`);
    }

    // Check if reservation is already fully paid
    const existingPaid = reservation.payments.find(p => p.status === PaymentStatus.PAID);
    if (existingPaid) {
      throw new ConflictException(`Reservation '${dto.reservationId}' is already paid (Transaction ID: ${existingPaid.transactionId}).`);
    }

    // Simulate Payment Gateway Failure if flag is set
    if (dto.simulateFailure) {
      const failedPayment = await this.prisma.payment.create({
        data: {
          reservationId: dto.reservationId,
          amount: dto.amount,
          status: PaymentStatus.FAILED,
          transactionId: `TXN_FAIL_${Date.now()}`,
        },
      });

      throw new BadRequestException(`Payment processing failed. Transaction declined (ID: ${failedPayment.transactionId}).`);
    }

    // Generate mock transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await this.prisma.payment.create({
      data: {
        reservationId: dto.reservationId,
        amount: dto.amount,
        status: PaymentStatus.PAID,
        transactionId,
      },
    });

    return {
      message: 'Payment processed successfully.',
      status: PaymentStatus.PAID,
      payment,
    };
  }

  /**
   * Processes a refund for a previously paid transaction.
   */
  async refundPayment(dto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID '${dto.paymentId}' not found.`);
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(`Cannot refund payment '${dto.paymentId}' with current status '${payment.status}'. Only PAID payments can be refunded.`);
    }

    const refunded = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });

    return {
      message: 'Payment refunded successfully.',
      reason: dto.reason || 'No reason provided',
      payment: refunded,
    };
  }

  /**
   * Finds payment transactions for a specific reservation.
   */
  async findByReservation(reservationId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      count: payments.length,
      payments,
    };
  }
}
