/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for executing status state transitions on a reservation.
 * Validates the requested new `ReservationStatus` enum value (`APPROVED`, `REJECTED`, `ACTIVE`, `RETURNED`, `CANCELLED`).
 *
 * IN SIMPLE WORDS:
 * Defines the request payload when a staff member or customer updates a reservation's status (approving, rejecting, picking up, or returning equipment).
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReservationStatusDto {
  @ApiProperty({
    description: 'Target state transition for the reservation',
    enum: ReservationStatus,
    example: ReservationStatus.APPROVED,
  })
  @IsEnum(ReservationStatus, { message: 'Invalid reservation status transition.' })
  @IsNotEmpty()
  status!: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Reason shown to the customer when a reservation is rejected',
    example: 'Requested equipment is under maintenance for the selected dates.',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  rejectionReason?: string;
}
