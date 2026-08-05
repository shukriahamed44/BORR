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
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectQueue('notifications') private notificationQueue: Queue) {}

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
   * Enqueues a Reservation Approved async notification job.
   */
  async notifyReservationApproved(data: { reservationId: string; userEmail: string; startDate: Date; endDate: Date }) {
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
  async notifyReservationRejected(data: { reservationId: string; userEmail: string; reason?: string }) {
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
  async notifyUpcomingReturn(data: { reservationId: string; userEmail: string; endDate: Date }) {
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
  async notifyReservationExpired(data: { reservationId: string; userEmail: string }) {
    const job = await this.notificationQueue.add('reservation-expired', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
    this.logger.log(`Enqueued reservation-expired job #${job.id} for reservation ${data.reservationId}`);
    return job;
  }
}
