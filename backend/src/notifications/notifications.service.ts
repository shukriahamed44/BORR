/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Async Notification Queue Producer Service (`NotificationsService`).
 * Enqueues email and push notification tasks onto the BullMQ Redis `notifications` queue.
 * Returns instantly to the caller with job ID and status, enabling non-blocking async background execution.
 *
 * IN SIMPLE WORDS:
 * Pushes notification requests onto the Redis queue so the main API responds instantly to users.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /**
   * Enqueues an async email job onto the Redis queue.
   */
  async addEmailNotification(dto: SendEmailDto) {
    const job = await this.notificationQueue.add('email-notification', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });

    this.logger.log(`Enqueued email job #${job.id} for ${dto.to}`);

    return {
      message: 'Email notification task enqueued successfully.',
      jobId: job.id,
      queue: 'notifications',
      status: 'QUEUED',
    };
  }

  /**
   * Enqueues an async push notification job onto the Redis queue.
   */
  async addPushNotification(dto: SendPushDto) {
    const job = await this.notificationQueue.add('push-notification', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });

    this.logger.log(`Enqueued push job #${job.id} for device ${dto.deviceToken}`);

    return {
      message: 'Push notification task enqueued successfully.',
      jobId: job.id,
      queue: 'notifications',
      status: 'QUEUED',
    };
  }

  /**
   * Writes the durable in-app notification row.
   *
   * Persisted here at enqueue time rather than inside the BullMQ worker, so the user's
   * feed does not depend on Redis being reachable — the queue handles outbound email and
   * push delivery, while the database remains the source of truth for the in-app inbox.
   * Fail-soft: a feed write must never abort the reservation transition that triggered it.
   */
  private async persist(
    userId: string | undefined,
    type: NotificationType,
    title: string,
    body: string,
    entityId?: string,
  ) {
    if (!userId) return;
    try {
      await this.prisma.notification.create({
        data: { userId, type, title, body, entityType: 'Reservation', entityId },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist notification: ${(error as Error).message}`);
    }
  }

  /**
   * Enqueues a Reservation Approved async notification job.
   */
  async notifyReservationApproved(data: {
    reservationId: string;
    userEmail: string;
    userId?: string;
    startDate: Date;
    endDate: Date;
  }) {
    await this.persist(
      data.userId,
      NotificationType.RESERVATION_APPROVED,
      'Reservation approved',
      `Your reservation #${data.reservationId.slice(0, 8).toUpperCase()} was approved. Pickup ${new Date(data.startDate).toDateString()}.`,
      data.reservationId,
    );

    const job = await this.notificationQueue.add('reservation-approved', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
    this.logger.log(`Enqueued reservation-approved job #${job.id} for reservation ${data.reservationId}`);
    return job;
  }

  /**
   * Enqueues a Reservation Rejected async notification job.
   */
  async notifyReservationRejected(data: {
    reservationId: string;
    userEmail: string;
    userId?: string;
    reason?: string;
  }) {
    await this.persist(
      data.userId,
      NotificationType.RESERVATION_REJECTED,
      'Reservation rejected',
      data.reason
        ? `Reservation #${data.reservationId.slice(0, 8).toUpperCase()} was rejected: ${data.reason}`
        : `Reservation #${data.reservationId.slice(0, 8).toUpperCase()} was rejected.`,
      data.reservationId,
    );

    const job = await this.notificationQueue.add('reservation-rejected', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
    this.logger.log(`Enqueued reservation-rejected job #${job.id} for reservation ${data.reservationId}`);
    return job;
  }

  /**
   * Enqueues an Upcoming Return async notification job.
   */
  async notifyUpcomingReturn(data: {
    reservationId: string;
    userEmail: string;
    userId?: string;
    endDate: Date;
  }) {
    await this.persist(
      data.userId,
      NotificationType.UPCOMING_RETURN,
      'Return due soon',
      `Reservation #${data.reservationId.slice(0, 8).toUpperCase()} is due back on ${new Date(data.endDate).toDateString()}.`,
      data.reservationId,
    );

    const job = await this.notificationQueue.add('upcoming-return', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
    this.logger.log(`Enqueued upcoming-return job #${job.id} for reservation ${data.reservationId}`);
    return job;
  }

  /**
   * Enqueues a Reservation Expired async notification job.
   */
  async notifyReservationExpired(data: {
    reservationId: string;
    userEmail: string;
    userId?: string;
  }) {
    await this.persist(
      data.userId,
      NotificationType.RESERVATION_EXPIRED,
      'Reservation expired',
      `Reservation #${data.reservationId.slice(0, 8).toUpperCase()} expired before it was collected and has been cancelled.`,
      data.reservationId,
    );

    const job = await this.notificationQueue.add('reservation-expired', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
    this.logger.log(`Enqueued reservation-expired job #${job.id} for reservation ${data.reservationId}`);
    return job;
  }

  /* ── In-app feed ──────────────────────────────────────────────────────── */

  /** Returns the caller's own notifications, newest first, with an unread tally. */
  async findForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    const limit = Math.min(opts.limit ?? 20, 100);

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { count: notifications.length, unreadCount, notifications };
  }

  /** Marks one notification read. Scoped by userId so a caller cannot touch another's row. */
  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return { message: 'Notification marked as read.' };
  }

  /** Marks every unread notification for the caller as read. */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: `Marked ${result.count} notification(s) as read.`, updated: result.count };
  }
}
