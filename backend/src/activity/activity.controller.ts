/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/activity` for audit trail retrieval.
 * Restricted to `ADMIN`: the log spans every account's actions, so it must never be
 * readable by staff or customers.
 *
 * IN SIMPLE WORDS:
 * Lets an administrator read the audit history. Admin-only, because it shows what everyone
 * in the system has been doing.
 */

import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivityAction, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActivityService } from './activity.service';

@ApiTags('Activity Audit Log')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paginated audit trail of system activity (ADMIN only)' })
  @ApiQuery({ name: 'action', required: false, enum: ActivityAction })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Audit entries retrieved.' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires ADMIN role.' })
  async findAll(
    @Query('action') action?: ActivityAction,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.findAll({
      action,
      userId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
