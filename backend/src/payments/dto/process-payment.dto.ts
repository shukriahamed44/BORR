/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for processing a reservation payment transaction.
 * Validates reservation UUID, transaction amount, payment gateway method, and optional failure simulation flag
 * for request payloads to `/api/v1/payments/process`.
 *
 * IN SIMPLE WORDS:
 * Defines the details submitted when paying for a reservation (reservation ID, amount, card/method, and optional test flag for payment failure).
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Target reservation UUID to pay for',
    example: '64ecbab7-d40e-4225-9a2f-926f95e67c5f',
  })
  @IsString()
  @IsNotEmpty()
  reservationId!: string;

  @ApiProperty({
    description: 'Payment transaction amount in USD',
    example: 903.00,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than zero.' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Payment method string',
    example: 'CREDIT_CARD',
    default: 'CREDIT_CARD',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Flag to simulate a gateway payment decline/failure during testing',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  simulateFailure?: boolean;
}
