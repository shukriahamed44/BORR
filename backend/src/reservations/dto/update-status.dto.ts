/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for executing status state transitions on a reservation.
 * Validates the requested new `ReservationStatus` enum value (`APPROVED`, `REJECTED`, `ACTIVE`, `RETURNED`, `CANCELLED`).
 *
 * IN SIMPLE WORDS:
 * Defines the request payload when a staff member or customer updates a reservation's status (approving, rejecting, picking up, or returning equipment).
 */

import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateReservationStatusDto {
  @ApiProperty({
    description: 'Target state transition for the reservation',
    enum: ReservationStatus,
    example: ReservationStatus.APPROVED,
  })
  @IsEnum(ReservationStatus, { message: 'Invalid reservation status transition.' })
  @IsNotEmpty()
  status!: ReservationStatus;
}
