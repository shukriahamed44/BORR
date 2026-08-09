/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Objects for self-service account management — profile field updates and
 * password rotation. Both operate strictly on the authenticated principal; neither accepts a
 * user identifier, so a caller can never target another account.
 *
 * IN SIMPLE WORDS:
 * Checks the details someone submits when editing their own profile or changing their own
 * password. There is deliberately no "user id" field, so nobody can edit someone else's account.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Display name', example: 'John Customer' })
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Contact email address', example: 'john@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+94 77 123 4567' })
  @IsString()
  @MaxLength(32)
  // Permissive on formatting, strict on characters: digits, spaces and common separators.
  @Matches(/^[0-9+()\-\s]*$/, { message: 'Phone number contains invalid characters.' })
  @IsOptional()
  phone?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'The account\'s current password', example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword!: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'NewPassword456!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @MaxLength(128)
  newPassword!: string;
}
