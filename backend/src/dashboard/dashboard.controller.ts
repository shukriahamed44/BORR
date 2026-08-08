/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/dashboard` for aggregated analytics KPIs.
 * Splits access by role: `/dashboard/stats` is restricted to STAFF and ADMIN, while
 * `/dashboard/my-summary` returns figures scoped to the authenticated customer only.
 *
 * IN SIMPLE WORDS:
 * Serves the dashboard numbers. Managers get the business-wide view; customers get
 * only their own rental summary, never anyone else's data.
 */

import { Controller, Get, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Business-wide KPIs: revenue, utilisation, approvals queue, most-rented equipment and 14-day trends',
  })
  @ApiResponse({ status: 200, description: 'Aggregated dashboard metrics.' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires STAFF or ADMIN role.' })
  async getStats() {
    return this.dashboardService.getAdminStats();
  }

  @Get('my-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rental summary scoped to the authenticated user's own reservations" })
  @ApiResponse({ status: 200, description: 'Personal rental summary.' })
  async getMySummary(@Request() req: any) {
    return this.dashboardService.getCustomerStats(req.user.id);
  }
}
