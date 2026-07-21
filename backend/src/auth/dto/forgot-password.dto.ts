/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for initiating a password reset request (`ForgotPasswordDto`).
 * Validates requested user email address for payloads to `/api/v1/auth/forgot-password`.
 *
 * IN SIMPLE WORDS:
 * Defines the email address submitted when a user requests a password reset link.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address for password reset request',
    example: 'alex.customer@ammunation.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;
}
