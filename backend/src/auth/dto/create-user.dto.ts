/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for Admin User Provisioning endpoint (`POST /auth/users`).
 * Enforces role specification (ADMIN, STAFF, WAREHOUSE_OPERATOR, CUSTOMER) under Admin authorization.
 */

import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'new.staff@ammunation.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'StaffPass123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password!: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Officer John',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Assigned system role',
    enum: Role,
    example: Role.STAFF,
  })
  @IsEnum(Role, { message: 'Invalid role provided.' })
  @IsNotEmpty()
  role!: Role;
}
