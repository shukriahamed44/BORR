/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for the Dashboard Analytics Service (`DashboardServiceSpec`).
 * Mocks `PrismaService` aggregates to verify the three figures the service derives rather
 * than reads: stock utilisation percentage, the null revenue-trend guard when no prior
 * period exists, and the fixed 14-day trend window (gaps included as zero-value buckets).
 *
 * IN SIMPLE WORDS:
 * Checks the dashboard's own maths — the utilisation percentage, that it refuses to invent
 * a revenue trend when there is nothing to compare against, and that the chart always has
 * 14 days on it even on days when nobody booked anything.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    user: { count: jest.fn() },
    reservation: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    reservationItem: { aggregate: jest.fn(), groupBy: jest.fn() },
    product: { findMany: jest.fn() },
  };

  /**
   * Baseline where every query answers. `reservation.aggregate` is called three times in a
   * fixed order — billable revenue, then last-30-days, then the preceding 30 — so tests set
   * that one with `mockResolvedValueOnce` chains.
   */
  const seedHappyPath = () => {
    mockPrismaService.user.count.mockResolvedValue(7);
    mockPrismaService.reservation.count.mockResolvedValue(2);
    mockPrismaService.reservation.findMany.mockResolvedValue([]);
    mockPrismaService.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Drone', sku: 'D-1', totalStock: 8 },
    ]);
    mockPrismaService.reservationItem.aggregate.mockResolvedValue({
      _sum: { quantity: 2 },
    });
    mockPrismaService.reservationItem.groupBy.mockResolvedValue([]);
    mockPrismaService.reservation.aggregate
      .mockResolvedValueOnce({ _sum: { totalPrice: 500 } }) // billable revenue
      .mockResolvedValueOnce({ _sum: { totalPrice: 300 } }) // last 30 days
      .mockResolvedValueOnce({ _sum: { totalPrice: null } }); // prior 30 days
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
    seedHappyPath();
  });

  it('should express utilisation as the percentage of stock out on hire', async () => {
    const stats = await service.getAdminStats();

    expect(stats.totalUnits).toBe(8);
    expect(stats.rentedUnits).toBe(2);
    expect(stats.utilisationRate).toBe(25); // 2 of 8 units
    expect(stats.totalRevenue).toBe(500);
  });

  it('should return null revenue change when there is no prior period to compare against', async () => {
    const stats = await service.getAdminStats();

    expect(stats.revenueChangePct).toBeNull();
  });

  it('should return 14 trend buckets even when no reservations fall in the window', async () => {
    const stats = await service.getAdminStats();

    expect(stats.trends).toHaveLength(14);
    expect(stats.trends.every((t) => t.count === 0 && t.revenue === 0)).toBe(
      true,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(stats.trends[13].date).toBe(today.toISOString().slice(0, 10));
  });

  it('should not divide by zero when the catalog is empty', async () => {
    mockPrismaService.product.findMany.mockResolvedValue([]);

    const stats = await service.getAdminStats();

    expect(stats.totalUnits).toBe(0);
    expect(stats.utilisationRate).toBe(0);
  });
});
