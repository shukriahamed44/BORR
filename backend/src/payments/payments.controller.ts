/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/payments` path prefix for Payment Workflow Operations.
 * Manages mock payment processing and refund transactions with Swagger OpenAPI specifications (`@ApiTags('Payments')`).
 *
 * IN SIMPLE WORDS:
 * The API controller for customers to pay for equipment rentals and staff to process refunds.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process mock payment for a reservation (CUSTOMER, STAFF, ADMIN)' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully.' })
  @ApiResponse({ status: 400, description: 'Payment processing declined or parameter validation error.' })
  @ApiResponse({ status: 409, description: 'Reservation already paid.' })
  async processPayment(@Request() req: any, @Body() dto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(dto, req.user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Paginated payment ledger with status filter (customers see only their own transactions)',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved with totals and status counts.' })
  async findAll(@Request() req: any, @Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(req.user, query);
  }

  @Post('refund')
  @Roles(Role.STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate payment refund (STAFF or ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully.' })
  @ApiResponse({ status: 400, description: 'Payment cannot be refunded in current status.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires STAFF or ADMIN role.' })
  async refundPayment(@Request() req: any, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(dto, req.user.id);
  }

  @Get('reservation/:reservationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment records for a specific reservation' })
  @ApiResponse({ status: 200, description: 'Payment records for reservation.' })
  async findByReservation(
    @Param('reservationId') reservationId: string,
    @Request() req: any,
  ) {
    return this.paymentsService.findByReservation(reservationId, req.user);
  }
}
