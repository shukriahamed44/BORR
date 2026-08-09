/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Audit Trail Service (`ActivityService`). Writes immutable `ActivityLog` entries for
 * authentication, reservation, payment, inventory and document events, and exposes a
 * paginated, filterable reader for administrators.
 *
 * Recording is intentionally fail-soft: an audit write that errors is logged and swallowed
 * rather than propagated, so a logging fault can never abort the business transaction that
 * triggered it. Reads remain strict.
 *
 * IN SIMPLE WORDS:
 * Keeps a permanent record of who did what — logins, bookings, payments, stock changes.
 * If writing that record ever fails, the original action still succeeds; we do not want a
 * broken audit log to stop someone paying for a rental.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ActivityAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordActivityInput {
  userId?: string | null;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Appends an audit entry. Never throws — see the fail-soft rationale above.
   */
  async record(input: RecordActivityInput): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ipAddress: input.ipAddress,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record activity '${input.action}': ${(error as Error).message}`,
      );
    }
  }

  /** Paginated audit trail for administrators. */
  async findAll(query: {
    action?: ActivityAction;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 200);

    const where: Prisma.ActivityLogWhereInput = {};
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [total, logs, grouped] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.activityLog.groupBy({ by: ['action'], _count: { _all: true } }),
    ]);

    return {
      count: logs.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      actionCounts: grouped.reduce<Record<string, number>>((acc, row) => {
        acc[row.action] = row._count._all;
        return acc;
      }, {}),
      logs,
    };
  }
}
