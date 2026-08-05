/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for queueing mobile push notification background jobs.
 * Validates device token, title, and alert message for payloads to `/api/v1/notifications/test-push`.
 *
 * IN SIMPLE WORDS:
 * Defines the device token and alert text for mobile push notifications sent asynchronously.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendPushDto {
  @ApiProperty({
    description: 'Target mobile device push token or topic',
    example: 'device_fcm_token_9901823',
  })
  @IsString()
  @IsNotEmpty()
  deviceToken!: string;

  @ApiProperty({
    description: 'Push notification alert title',
    example: 'Equipment Return Alert',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'Push notification message text',
    example: 'Tactical Recon Drone Mark IV is due for return by 6:00 PM today.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
