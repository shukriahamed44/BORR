/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Query Data Transfer Object governing `GET /api/v1/payments` ledger retrieval.
 * Declares validated, Swagger-documented parameters for status filtering, reservation
 * narrowing and offset pagination. Customer row-scoping is applied by the service.
 *
 * IN SIMPLE WORDS:
 * The options you can put in the payments list URL — which status, which reservation,
 * and which page.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

export class QueryPaymentsDto {
  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter by payment status' })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter to a single reservation UUID' })
  @IsString()
  @IsOptional()
  reservationId?: string;

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
