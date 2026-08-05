/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * BullMQ Queue Worker Consumer (`NotificationsProcessor`).
 * Listens for background notification jobs on the `notifications` Redis queue using `@Processor('notifications')`.
 * Processes `email-notification` and `push-notification` jobs asynchronously without blocking HTTP thread execution.
 *
 * IN SIMPLE WORDS:
 * The background worker that picks up email and push notification tasks from the Redis queue and sends them in the background.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[Queue Worker] Processing job ID: ${job.id} of type: '${job.name}'`);

    switch (job.name) {
      case 'email-notification':
        return this.handleEmailJob(job.data);
      case 'push-notification':
        return this.handlePushJob(job.data);
      case 'reservation-approved':
        return this.handleEmailJob({
          to: job.data.userEmail,
          subject: `Reservation Approved - #${job.data.reservationId}`,
          body: `Your reservation #${job.data.reservationId} (From: ${new Date(job.data.startDate).toLocaleDateString()} To: ${new Date(job.data.endDate).toLocaleDateString()}) has been APPROVED.`,
        });
      case 'reservation-rejected':
        return this.handleEmailJob({
          to: job.data.userEmail,
          subject: `Reservation Rejected - #${job.data.reservationId}`,
          body: `Your reservation #${job.data.reservationId} has been REJECTED.${job.data.reason ? ' Reason: ' + job.data.reason : ''}`,
        });
      case 'upcoming-return':
        return this.handleEmailJob({
          to: job.data.userEmail,
          subject: `Upcoming Return Notice - Reservation #${job.data.reservationId}`,
          body: `Reminder: Your rented equipment for reservation #${job.data.reservationId} is due for return by ${new Date(job.data.endDate).toLocaleDateString()}.`,
        });
      case 'reservation-expired':
        return this.handleEmailJob({
          to: job.data.userEmail,
          subject: `Reservation Expired - #${job.data.reservationId}`,
          body: `Notice: Your reservation #${job.data.reservationId} has passed its start date without pickup and is marked as EXPIRED.`,
        });
      default:
        this.logger.warn(`Unknown job type '${job.name}' received.`);
    }
  }

  private async handleEmailJob(data: { to: string; subject: string; body: string }) {
    // Simulate background email processing latency
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.log(`[EMAIL DISPATCHED] To: ${data.to} | Subject: "${data.subject}" | Body: "${data.body}"`);
    return { status: 'SENT', type: 'EMAIL', recipient: data.to, dispatchedAt: new Date() };
  }

  private async handlePushJob(data: { deviceToken: string; title: string; message: string }) {
    // Simulate background push processing latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    this.logger.log(`[PUSH DISPATCHED] Token: ${data.deviceToken} | Title: "${data.title}" | Alert: "${data.message}"`);
    return { status: 'SENT', type: 'PUSH', deviceToken: data.deviceToken, dispatchedAt: new Date() };
  }
}
