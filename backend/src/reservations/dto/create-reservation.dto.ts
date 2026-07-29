/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for creating a new Equipment Reservation request.
 * Contains validated nested array of requested items (`ReservationItemDto`) with quantities, start date, and end date.
 * Annotated with Swagger OpenAPI properties (`@ApiProperty`) and `class-validator` rules for payload sanitation.
 *
 * IN SIMPLE WORDS:
 * Defines what a customer submits when renting equipment (which items, quantities, start date, and return date).
 */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReservationItemInputDto {
  @ApiProperty({
    description: 'Product UUID to reserve',
    example: '64ecbab7-d40e-4225-9a2f-926f95e67c5f',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Quantity of equipment units requested',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1 unit.' })
  quantity!: number;
}

export class CreateReservationDto {
  @ApiProperty({
    description: 'Reservation start date (ISO 8601 string)',
    example: '2026-08-10T09:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({
    description: 'Reservation end date (ISO 8601 string)',
    example: '2026-08-15T18:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({
    description: 'List of equipment items and quantities to reserve',
    type: [ReservationItemInputDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Reservation must contain at least one equipment item.' })
  @ValidateNested({ each: true })
  @Type(() => ReservationItemInputDto)
  items!: ReservationItemInputDto[];
}
