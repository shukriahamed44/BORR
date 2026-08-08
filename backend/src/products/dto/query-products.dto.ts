/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Query Data Transfer Object governing `GET /api/v1/products` list retrieval.
 * Declares validated, Swagger-documented parameters for full-text search, category
 * filtering, price-range narrowing, sort ordering, and offset pagination.
 *
 * IN SIMPLE WORDS:
 * Defines and checks the options you can put in the catalog URL — search text,
 * category, price limits, sort order, and which page of results you want.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ProductSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME_ASC = 'name_asc',
}

/** Query strings arrive as text; coerce to number and drop values that aren't numeric. */
const toNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

export class QueryProductsDto {
  @ApiPropertyOptional({ description: 'Free-text search across equipment name and SKU', example: 'drill' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by category slug', example: 'power-tools' })
  @IsString()
  @IsOptional()
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'Minimum daily rental price', example: 50 })
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum daily rental price', example: 300 })
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only return equipment with stock remaining', example: true })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  availableOnly?: boolean;

  @ApiPropertyOptional({ enum: ProductSort, description: 'Result ordering', example: ProductSort.NEWEST })
  @IsEnum(ProductSort)
  @IsOptional()
  sort?: ProductSort;

  @ApiPropertyOptional({ description: 'Page number, 1-based', example: 1, minimum: 1 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page (max 100)', example: 12, minimum: 1 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
