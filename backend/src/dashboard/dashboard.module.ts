/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Dashboard Analytics Feature Module (`DashboardModule`).
 * Packages `DashboardService` and `DashboardController` into the NestJS DI container.
 *
 * IN SIMPLE WORDS:
 * The module container that bundles the dashboard KPI reporting features together.
 */

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
