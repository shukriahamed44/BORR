/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/notifications` path prefix for Queue Operations.
 * Exposes endpoints to trigger background Redis BullMQ job queues for emails and mobile push alerts.
 * Decorated with Swagger OpenAPI specifications (`@ApiTags('Notifications Queue')`).
 *
 * IN SIMPLE WORDS:
 * The API controller for sending test email and push notification tasks to the background Redis queue.
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications Queue')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-email')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue background email notification job onto BullMQ Redis queue' })
  @ApiResponse({ status: 202, description: 'Email task accepted and enqueued.' })
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.addEmailNotification(dto);
  }

  @Post('test-push')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue background mobile push notification job onto BullMQ Redis queue' })
  @ApiResponse({ status: 202, description: 'Push task accepted and enqueued.' })
  async sendPush(@Body() dto: SendPushDto) {
    return this.notificationsService.addPushNotification(dto);
  }
}
