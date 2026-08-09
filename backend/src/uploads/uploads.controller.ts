/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/uploads` for customer document submission and
 * staff verification. Accepts multipart/form-data via `FileInterceptor` with an in-memory
 * buffer, then delegates validation and persistence to `UploadsService`. Download streams
 * the stored object with a non-inline disposition.
 *
 * IN SIMPLE WORDS:
 * The API for uploading identity documents and rental agreements, downloading them again,
 * and letting staff approve or reject them.
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUploadDto, QueryUploadsDto, ReviewUploadDto } from './dto/upload.dto';
import { UploadsService } from './uploads.service';

@ApiTags('Document Uploads')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['IDENTITY_DOCUMENT', 'RENTAL_AGREEMENT', 'EQUIPMENT_IMAGE'] },
        reservationId: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an identity document, rental agreement or equipment image' })
  @ApiResponse({ status: 201, description: 'Document stored and queued for review.' })
  @ApiResponse({ status: 400, description: 'Unsupported file type or file too large.' })
  async create(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body() dto: CreateUploadDto,
  ) {
    return this.uploadsService.create(req.user, file, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List documents (customers see only their own)' })
  @ApiResponse({ status: 200, description: 'Documents retrieved.' })
  async findAll(@Request() req: any, @Query() query: QueryUploadsDto) {
    return this.uploadsService.findAll(req.user, query);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download the stored document binary' })
  @ApiResponse({ status: 200, description: 'File stream.' })
  @ApiResponse({ status: 403, description: 'Not permitted to read this document.' })
  async download(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const { upload, buffer } = await this.uploadsService.getFile(id, req.user);

    res.setHeader('Content-Type', upload.mimeType);
    res.setHeader('Content-Length', buffer.length);
    // attachment rather than inline: never render user-supplied files in the page origin.
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(upload.originalName)}"`,
    );
    // send() terminates the response deterministically — an earlier stream .pipe()
    // here re-emitted the file thousands of times and never closed the connection.
    res.send(buffer);
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify or reject an uploaded document' })
  @ApiResponse({ status: 200, description: 'Review recorded.' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires STAFF or ADMIN role.' })
  async review(@Param('id') id: string, @Request() req: any, @Body() dto: ReviewUploadDto) {
    return this.uploadsService.review(id, req.user.id, dto);
  }
}
