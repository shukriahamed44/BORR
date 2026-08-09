/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Query Data Transfer Object governing `GET /api/v1/users` directory retrieval.
 * Declares validated, Swagger-documented parameters for role filtering, free-text search
 * across name and email, and offset pagination.
 *
 * IN SIMPLE WORDS:
 * The options for the customer directory URL — which role, a search term, and which page.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

export class QueryUsersDto {
  @ApiPropertyOptional({ enum: Role, description: 'Filter by account role' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ description: 'Search across name and email', example: 'sarah' })
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
