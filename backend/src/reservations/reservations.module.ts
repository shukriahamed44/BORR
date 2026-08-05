/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Reservation Transaction Feature Module (`ReservationsModule`).
 * Packages `ReservationsService` and `ReservationsController` into NestJS dependency injection container.
 * Exports `ReservationsService` for consumption by payments and inventory logging modules.
 *
 * IN SIMPLE WORDS:
 * The module container that packages all reservation transaction and state machine features together.
 */

import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
