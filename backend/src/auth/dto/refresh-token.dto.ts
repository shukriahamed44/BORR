/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for token refresh operations with Swagger OpenAPI annotations.
 * Validates incoming refresh token payload for token renewal requests.
 *
 * IN SIMPLE WORDS:
 * Validates the refresh token key sent by the user to issue a new access token.
 */

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Valid long-lived JWT refresh token string',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token must be provided.' })
  refreshToken!: string;
}
