/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Objects for the document upload domain — creation metadata, list filtering,
 * and staff review decisions. Multipart binary content is validated separately in
 * `UploadsService` at the trust boundary.
 *
 * IN SIMPLE WORDS:
 * Checks the extra fields sent alongside an uploaded file, and the staff verify/reject form.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadStatus, UploadType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateUploadDto {
  @ApiProperty({ enum: UploadType, description: 'Category of document being uploaded' })
  @IsEnum(UploadType, { message: 'type must be IDENTITY_DOCUMENT, RENTAL_AGREEMENT or EQUIPMENT_IMAGE.' })
  type!: UploadType;

  @ApiPropertyOptional({ description: 'Reservation this document belongs to' })
  @IsUUID('4', { message: 'reservationId must be a valid UUID.' })
  @IsOptional()
  reservationId?: string;
}

export class QueryUploadsDto {
  @ApiPropertyOptional({ description: 'Filter by reservation UUID' })
  @IsString()
  @IsOptional()
  reservationId?: string;

  @ApiPropertyOptional({ description: 'Filter by document owner (STAFF/ADMIN only)' })
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ enum: UploadStatus, description: 'Filter by review status' })
  @IsEnum(UploadStatus)
  @IsOptional()
  status?: UploadStatus;
}

export class ReviewUploadDto {
  @ApiProperty({ enum: UploadStatus, description: 'Review outcome: VERIFIED or REJECTED' })
  @IsEnum(UploadStatus, { message: 'status must be VERIFIED or REJECTED.' })
  status!: UploadStatus;

  @ApiPropertyOptional({ description: 'Explanation shown to the customer when rejecting' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  rejectionNote?: string;
}
