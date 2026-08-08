/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Query Data Transfer Object governing `GET /api/v1/reservations` list retrieval.
 * Declares validated, Swagger-documented parameters for status filtering and offset
 * pagination. Customer-scoped row restriction is applied by the service, not here.
 *
 * IN SIMPLE WORDS:
 * Defines the options for the reservations list URL — which status tab and which page.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

export class QueryReservationsDto {
  @ApiPropertyOptional({
    enum: ReservationStatus,
    description: 'Filter by reservation status; omit for all statuses',
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: 'Search by reservation id or customer name/email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number, 1-based', example: 1, minimum: 1 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page (max 100)', example: 10, minimum: 1 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
