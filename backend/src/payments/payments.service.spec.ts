/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for Payment Gateway Service (`PaymentsServiceSpec`).
 * Utilizes NestJS `@nestjs/testing` module and Jest framework.
 * Mocks `PrismaService` calls to test payment processing (`PAID`), payment failures (`FAILED`),
 * duplicate payment prevention (`ConflictException`), and refund transactions (`REFUNDED`).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: any;

  const mockReservation = {
    id: 'res-uuid-100',
    totalPrice: 500,
    payments: [],
  };

  const mockPaidPayment = {
    id: 'payment-uuid-1',
    reservationId: 'res-uuid-100',
    amount: 500,
    status: PaymentStatus.PAID,
    transactionId: 'TXN_12345_6789',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    reservation: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPayment', () => {
    it('should throw NotFoundException if reservation does not exist', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      const dto = { reservationId: 'invalid-res-id', amount: 500 };

      await expect(service.processPayment(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if reservation is already paid', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        payments: [mockPaidPayment],
      });

      const dto = { reservationId: 'res-uuid-100', amount: 500 };

      await expect(service.processPayment(dto)).rejects.toThrow(ConflictException);
    });

    it('should process payment successfully and return PAID status', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.payment.create.mockResolvedValue(mockPaidPayment);

      const dto = { reservationId: 'res-uuid-100', amount: 500 };

      const result = await service.processPayment(dto);

      expect(result).toHaveProperty('status', PaymentStatus.PAID);
      expect(result.message).toContain('successfully');
    });

    it('should throw BadRequestException when simulateFailure flag is active', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.payment.create.mockResolvedValue({
        ...mockPaidPayment,
        status: PaymentStatus.FAILED,
        transactionId: 'TXN_FAIL_9999',
      });

      const dto = { reservationId: 'res-uuid-100', amount: 500, simulateFailure: true };

      await expect(service.processPayment(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    it('should refund a PAID payment successfully', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPaidPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPaidPayment,
        status: PaymentStatus.REFUNDED,
      });

      const dto = { paymentId: 'payment-uuid-1', reason: 'Customer requested cancellation' };

      const result = await service.refundPayment(dto);

      expect(result.payment.status).toEqual(PaymentStatus.REFUNDED);
      expect(result.message).toContain('refunded successfully');
    });
  });
});
