/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for creating a new Equipment Product entity in the inventory system.
 * Annotated with Swagger OpenAPI properties (`@ApiProperty`, `@ApiPropertyOptional`) and `class-validator` rules
 * to enforce payload validation and document request contracts for `/api/v1/products`.
 *
 * IN SIMPLE WORDS:
 * Defines and checks the fields needed when adding new equipment (name, SKU code, description, daily rental price, and initial stock count).
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Equipment product name',
    example: 'Tactical Recon Drone Mark IV',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Unique Stock Keeping Unit (SKU) code',
    example: 'EQUIP-DRONE-001',
  })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional({
    description: 'Detailed equipment specification or description',
    example: 'Long-range surveillance drone with thermal imaging capacity.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Daily rental price in USD',
    example: 150.50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Price per day must be a non-negative number.' })
  pricePerDay!: number;

  @ApiProperty({
    description: 'Initial total stock inventory count available',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Total stock cannot be negative.' })
  totalStock!: number;

  @ApiPropertyOptional({
    description: 'Refundable security deposit held for the rental duration, in USD',
    example: 250,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Deposit cannot be negative.' })
  @IsOptional()
  deposit?: number;

  @ApiPropertyOptional({
    description: 'UUID of the category this equipment belongs to',
    example: 'a3f1c2d4-5678-4abc-9def-0123456789ab',
  })
  @IsUUID('4', { message: 'categoryId must be a valid UUID.' })
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Public path to the equipment image',
    example: '/equipment/tl-drill-001.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Key/value technical specifications',
    example: { Motor: '10.0 Amp', Weight: '6.7 lbs' },
  })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, string>;
}
