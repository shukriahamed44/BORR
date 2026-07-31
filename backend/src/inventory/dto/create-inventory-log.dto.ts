/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for creating an Inventory Audit Log entry.
 * Validates `productId`, inventory action enum (`RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`, `MAINTENANCE`),
 * unit quantity, and optional operator notes for request payloads to `/api/v1/inventory/logs`.
 *
 * IN SIMPLE WORDS:
 * Defines what a warehouse operator submits when recording stock changes (adding new stock, recording damage, sending item for repair).
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryAction } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryLogDto {
  @ApiProperty({
    description: 'Target equipment product UUID',
    example: '64ecbab7-d40e-4225-9a2f-926f95e67c5f',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Inventory action type',
    enum: InventoryAction,
    example: InventoryAction.RECEIVE,
  })
  @IsEnum(InventoryAction, { message: 'Invalid inventory action type.' })
  @IsNotEmpty()
  action!: InventoryAction;

  @ApiProperty({
    description: 'Quantity of equipment units affected',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1 unit.' })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Optional warehouse operator notes or inspection report details',
    example: 'Received shipment batch #402 from manufacturer.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
