/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for user registration requests with Swagger API Documentation annotations.
 * Enforces strict input validation, type safety, and OpenAPI schema metadata for the `/auth/register` endpoint.
 *
 * IN SIMPLE WORDS:
 * Checks registration fields (email, password, name, role) and tells Swagger how to display them in API docs.
 */

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Unique user email address',
    example: 'customer@ammunation.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'Password123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password!: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Customer',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
