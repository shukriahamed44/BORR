/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Dashboard Analytics Service aggregating cross-module KPI metrics from PostgreSQL via Prisma.
 * Computes revenue totals, equipment utilisation, most-rented rankings, and reservation trend
 * series server-side so clients receive pre-aggregated figures rather than raw record sets.
 *
 * IN SIMPLE WORDS:
 * Works out the numbers shown on the dashboard (revenue, active rentals, most popular gear)
 * by asking the database directly, instead of making the browser download everything and add it up.
 */

import { Injectable } from '@nestjs/common';
import { ReservationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Statuses that represent real, billable demand (excludes rejected/cancelled). */
const BILLABLE: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
  ReservationStatus.ACTIVE,
  ReservationStatus.RETURNED,
];

/** Statuses where stock is physically out of the warehouse. */
const OUT_ON_HIRE: ReservationStatus[] = [
  ReservationStatus.APPROVED,
  ReservationStatus.ACTIVE,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin / staff overview: revenue, utilisation, approvals queue, rankings and trends. */
  async getAdminStats() {
    const [
      totalCustomers,
      activeReservations,
      pendingApprovals,
      revenueAgg,
      products,
      unitsOnHire,
      lowStock,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.ACTIVE },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.PENDING },
      }),
      this.prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: { status: { in: BILLABLE } },
      }),
      this.prisma.product.findMany({
        select: { id: true, name: true, sku: true, totalStock: true },
      }),
      this.prisma.reservationItem.aggregate({
        _sum: { quantity: true },
        where: { reservation: { status: { in: OUT_ON_HIRE } } },
      }),
      this.prisma.product.findMany({
        where: { totalStock: { lte: 3 } },
        select: { id: true, name: true, sku: true, totalStock: true },
        orderBy: { totalStock: 'asc' },
      }),
    ]);

    const totalUnits = products.reduce((sum, p) => sum + p.totalStock, 0);
    const rentedUnits = unitsOnHire._sum.quantity ?? 0;

    return {
      totalCustomers,
      activeReservations,
      pendingApprovals,
      totalProducts: products.length,
      totalUnits,
      totalRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
      // Share of physical stock currently out on hire, as a percentage.
      utilisationRate:
        totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 1000) / 10 : 0,
      rentedUnits,
      lowStock,
      mostRented: await this.getMostRented(),
      revenueChangePct: await this.getRevenueChangePct(),
      trends: await this.getReservationTrends(),
    };
  }

  /** Top 5 products by total units reserved across all billable reservations. */
  private async getMostRented() {
    const grouped = await this.prisma.reservationItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { reservation: { status: { in: BILLABLE } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true, sku: true },
    });

    return grouped.map((g) => {
      const product = products.find((p) => p.id === g.productId);
      return {
        productId: g.productId,
        name: product?.name ?? 'Unknown product',
        sku: product?.sku ?? '',
        unitsRented: g._sum.quantity ?? 0,
      };
    });
  }

  /**
   * Revenue movement of the last 30 days against the preceding 30, as a percentage.
   * Returns null when there is no prior-period baseline to compare against — the UI
   * must not invent a trend figure in that case.
   */
  private async getRevenueChangePct(): Promise<number | null> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);

    const [current, previous] = await Promise.all([
      this.prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: { status: { in: BILLABLE }, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: { in: BILLABLE },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    const prior = Number(previous._sum.totalPrice ?? 0);
    if (prior === 0) return null;

    const latest = Number(current._sum.totalPrice ?? 0);
    return Math.round(((latest - prior) / prior) * 1000) / 10;
  }

  /** Reservation count and revenue per day for the last 14 days (oldest first). */
  private async getReservationTrends() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 13);

    const reservations = await this.prisma.reservation.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, totalPrice: true, status: true },
    });

    const buckets = new Map<string, { count: number; revenue: number }>();
    for (let i = 0; i < 14; i++) {
      const day = new Date(start.getTime() + i * 86_400_000);
      buckets.set(day.toISOString().slice(0, 10), { count: 0, revenue: 0 });
    }

    for (const r of reservations) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.count += 1;
      if (BILLABLE.includes(r.status)) bucket.revenue += Number(r.totalPrice);
    }

    return [...buckets.entries()].map(([date, v]) => ({ date, ...v }));
  }

  /** Customer-scoped summary: only the signed-in user's own rental activity. */
  async getCustomerStats(userId: string) {
    const [activeRentals, pendingRequests, spendAgg, upcomingReturns] =
      await Promise.all([
        this.prisma.reservation.count({
          where: { userId, status: { in: OUT_ON_HIRE } },
        }),
        this.prisma.reservation.count({
          where: { userId, status: ReservationStatus.PENDING },
        }),
        this.prisma.reservation.aggregate({
          _sum: { totalPrice: true },
          where: { userId, status: { in: BILLABLE } },
        }),
        this.prisma.reservation.findMany({
          where: {
            userId,
            status: { in: OUT_ON_HIRE },
            endDate: { lte: new Date(Date.now() + 7 * 86_400_000) },
          },
          orderBy: { endDate: 'asc' },
          select: { id: true, endDate: true, totalPrice: true, status: true },
        }),
      ]);

    return {
      activeRentals,
      pendingRequests,
      totalSpend: Number(spendAgg._sum.totalPrice ?? 0),
      upcomingReturns,
    };
  }
}
