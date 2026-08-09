/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for Payment Gateway Service (`PaymentsServiceSpec`).
 * Utilizes NestJS `@nestjs/testing` module and Jest framework.
 * Mocks `PrismaService` calls to test payment processing (`PAID`), payment failures (`FAILED`),
 * duplicate payment prevention (`ConflictException`), and refund transactions (`REFUNDED`).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus, Role } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGateway } from './gateway/payment.gateway';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: any;

  /** Staff actor — every service entry point now takes the caller for audit and ownership. */
  const actor = { id: 'staff-uuid-1', role: Role.STAFF };

  const mockReservation = {
    id: 'res-uuid-100',
    userId: 'customer-uuid-1',
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

  /**
   * Stubbed gateway rather than the real MockStripeGateway: these tests are about the
   * service's ledger handling, so the authorisation outcome has to be dictated, not
   * inherited from another component's in-memory state.
   */
  const mockGateway = {
    provider: 'mock_stripe',
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test_1',
      status: 'requires_confirmation',
    }),
    confirmPaymentIntent: jest.fn((id: string, opts?: { simulateFailure?: boolean }) =>
      Promise.resolve(
        opts?.simulateFailure
          ? {
              id,
              status: 'requires_payment_method',
              lastPaymentError: { message: 'Your card was declined.' },
            }
          : { id, status: 'succeeded' },
      ),
    ),
    retrievePaymentIntent: jest.fn(),
    refund: jest.fn().mockResolvedValue({ id: 're_test_1', status: 'succeeded' }),
  };

  const mockActivityService = { record: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PaymentGateway, useValue: mockGateway },
        { provide: ActivityService, useValue: mockActivityService },
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

      await expect(service.processPayment(dto, actor)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if reservation is already paid', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        payments: [mockPaidPayment],
      });

      const dto = { reservationId: 'res-uuid-100', amount: 500 };

      await expect(service.processPayment(dto, actor)).rejects.toThrow(ConflictException);
    });

    it('should process payment successfully and return PAID status', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.payment.create.mockResolvedValue(mockPaidPayment);

      const dto = { reservationId: 'res-uuid-100', amount: 500 };

      const result = await service.processPayment(dto, actor);

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

      await expect(service.processPayment(dto, actor)).rejects.toThrow(BadRequestException);
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
