/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Root Application Module (`AppModule`).
 * Orchestrates and imports core domain feature modules (`PrismaModule`, `AuthModule`, `ProductsModule`, `ReservationsModule`, `InventoryModule`, `PaymentsModule`, `NotificationsModule`, `DashboardModule`).
 *
 * IN SIMPLE WORDS:
 * The main container module that combines Prisma Database, Auth Security, Equipment Product, Reservation Transaction, Warehouse Inventory, Payments, Redis Notification Queue, and Dashboard Analytics modules into one running app.
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
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    PrismaModule,
    // Global: every domain module records audit entries through ActivityService.
    ActivityModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    UploadsModule,
    ReservationsModule,
    InventoryModule,
    PaymentsModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
