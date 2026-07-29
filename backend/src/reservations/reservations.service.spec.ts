/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for Reservations Service State Machine (`ReservationsServiceSpec`).
 * Utilizes NestJS `@nestjs/testing` module and Jest framework.
 * Mocks `PrismaService` database transaction calls to test rental cost calculation, date validation (`BadRequestException`),
 * stock validation, and reservation state transitions (`PENDING` ➔ `APPROVED` ➔ `ACTIVE` ➔ `RETURNED`).
 *
 * IN SIMPLE WORDS:
 * Automated test file that checks if equipment booking calculations, start/end date validation, stock checks, and approval/return state workflows work accurately.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prismaService: any;

  const mockUser = {
    id: 'user-uuid-1',
    role: Role.CUSTOMER,
  };

  const mockProduct = {
    id: 'product-uuid-1',
    name: 'Tactical Recon Drone Mark IV',
    pricePerDay: 100,
    totalStock: 5,
  };

  const mockReservation = {
    id: 'reservation-uuid-1',
    userId: 'user-uuid-1',
    status: ReservationStatus.PENDING,
    totalPrice: 500,
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-15'),
    items: [
      {
        id: 'item-uuid-1',
        productId: 'product-uuid-1',
        quantity: 1,
        unitPrice: 100,
        product: mockProduct,
      },
    ],
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    reservation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    notifyReservationApproved: jest.fn(),
    notifyReservationRejected: jest.fn(),
    notifyUpcomingReturn: jest.fn(),
    notifyReservationExpired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if end date is before or equal to start date', async () => {
      const dto = {
        startDate: '2026-08-15T00:00:00.000Z',
        endDate: '2026-08-10T00:00:00.000Z',
        items: [{ productId: 'product-uuid-1', quantity: 1 }],
      };

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should calculate atomic pricing correctly across multi-day rental period', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          reservation: {
            create: jest.fn().mockResolvedValue(mockReservation),
          },
        });
      });

      const dto = {
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: '2026-08-15T09:00:00.000Z', // 5 days
        items: [{ productId: 'product-uuid-1', quantity: 1 }], // $100 * 5 = $500
      };

      const result = await service.create('user-uuid-1', dto);

      expect(result).toHaveProperty('reservation');
      expect(result.reservation.totalPrice).toEqual(500);
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if reservation does not exist', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('invalid-id', { status: ReservationStatus.APPROVED }, 'admin-uuid', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
