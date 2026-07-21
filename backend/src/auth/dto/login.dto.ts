/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for user authentication login requests with Swagger OpenAPI annotations.
 * Validates payload contracts submitted to the `/auth/login` endpoint prior to database credential lookup.
 *
 * IN SIMPLE WORDS:
 * Verifies email and password input during login and documents the fields for Swagger API docs.
 */

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Registered user email address',
    example: 'alex.admin@ammunation.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User account password',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password field cannot be empty.' })
  password!: string;
}
