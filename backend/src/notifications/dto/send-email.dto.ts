/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for queueing background email notification jobs.
 * Validates recipient email address, subject line, and body content for payloads to `/api/v1/notifications/test-email`.
 *
 * IN SIMPLE WORDS:
 * Defines the email recipient address, subject, and text message sent to the background queue.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'alex.customer@ammunation.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'Email subject header',
    example: 'AmmuNation Reservation Approved',
  })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({
    description: 'Email text or HTML body message',
    example: 'Your equipment reservation #102 has been approved for pickup.',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
