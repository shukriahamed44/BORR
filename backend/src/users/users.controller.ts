/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/users` for the staff-facing account directory.
 * Restricted to `ADMIN` and `STAFF` via `JwtAuthGuard` and `RolesGuard`, since the payload
 * exposes cross-account activity that customers must never read.
 *
 * IN SIMPLE WORDS:
 * The API behind the Customers screen. Only admins and staff can call it, because it lists
 * other people's accounts and booking history.
 */

import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryUsersDto } from './dto/query-users.dto';
import { UsersService } from './users.service';

@ApiTags('User Directory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Paginated account directory with role filter, search and per-account activity aggregates',
  })
  @ApiResponse({ status: 200, description: 'Accounts retrieved (never includes password hashes).' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires STAFF or ADMIN role.' })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('summary/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Account counts grouped by role' })
  @ApiResponse({ status: 200, description: 'Role distribution.' })
  async roleSummary() {
    return this.usersService.roleSummary();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full account profile with reservations and uploaded documents' })
  @ApiResponse({ status: 200, description: 'Account profile.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
