/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for initiating a payment refund request.
 * Validates target payment UUID and reason string for payloads to `/api/v1/payments/refund`.
 *
 * IN SIMPLE WORDS:
 * Defines what a staff member submits when refunding a customer's payment.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Target payment UUID to refund',
    example: '88ecbab7-d40e-4225-9a2f-926f95e67c5f',
  })
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @ApiPropertyOptional({
    description: 'Reason for processing refund',
    example: 'Customer cancelled reservation prior to equipment checkout.',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
