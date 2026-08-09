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
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The authenticated user's own notification feed with unread count" })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Notifications retrieved.' })
  async findMine(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findForUser(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found for this user.' })
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  async markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
