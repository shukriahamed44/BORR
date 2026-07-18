/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Root Application Module (`AppModule`).
 * Orchestrates and imports core domain feature modules (`PrismaModule`, `AuthModule`, `ProductsModule`, `ReservationsModule`, `InventoryModule`, `PaymentsModule`, `NotificationsModule`).
 *
 * IN SIMPLE WORDS:
 * The main container module that combines Prisma Database, Auth Security, Equipment Product, Reservation Transaction, Warehouse Inventory, Payments, and Redis Notification Queue modules into one running app.
 */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ReservationsModule } from './reservations/reservations.module';
import { InventoryModule } from './inventory/inventory.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    ReservationsModule,
    InventoryModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
