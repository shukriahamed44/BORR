/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/reservations` path prefix.
 * Manages equipment reservation lifecycles, state machine status transitions, and user permission access.
 * Fully decorated with Swagger OpenAPI specifications (`@ApiTags('Reservations')`).
 *
 * IN SIMPLE WORDS:
 * The API controller for booking rentals, reviewing pending requests, approving orders, checking out equipment, and returning items.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-status.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new equipment reservation request (CUSTOMER, STAFF, ADMIN)' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully in PENDING state.' })
  @ApiResponse({ status: 400, description: 'Validation failure, date mismatch, or insufficient equipment stock.' })
  async create(@Request() req: any, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(req.user.id, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List reservations with status filter and pagination (scoped to own rows for CUSTOMER; all for STAFF/ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Paginated reservations with per-status counts.' })
  async findAll(@Request() req: any, @Query() query: QueryReservationsDto) {
    return this.reservationsService.findAll(req.user, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of a specific reservation by ID' })
  @ApiResponse({ status: 200, description: 'Reservation details with items and payment status.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.findOne(id, req.user);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute state transition on reservation (APPROVED, REJECTED, ACTIVE, RETURNED, CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Reservation status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid state machine transition.' })
  @ApiResponse({ status: 403, description: 'Forbidden state transition for user role.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
    @Request() req: any,
  ) {
    return this.reservationsService.updateStatus(id, dto, req.user);
  }

  @Post('cron/process-notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger background scan for upcoming returns and expired reservations' })
  @ApiResponse({ status: 200, description: 'Background notification check completed successfully.' })
  async processNotifications() {
    return this.reservationsService.checkUpcomingAndExpiredReservations();
  }
}
