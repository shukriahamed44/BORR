/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * BullMQ Redis Notification Feature Module (`NotificationsModule`).
 * Configures Redis connection settings, registers `notifications` BullMQ queue, `NotificationsProcessor` worker,
 * and `NotificationsService` producer into NestJS dependency injection container.
 *
 * IN SIMPLE WORDS:
 * The module container that sets up Redis queue connections and worker listeners for background tasks.
 */

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '172.20.75.38',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
