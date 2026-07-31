/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/inventory` path prefix for Warehouse Inventory Operations.
 * Restricts access to `WAREHOUSE_OPERATOR`, `STAFF`, and `ADMIN` roles using `JwtAuthGuard` and `RolesGuard`.
 * Fully decorated with Swagger OpenAPI specifications (`@ApiTags('Inventory Logs')`).
 *
 * IN SIMPLE WORDS:
 * The API controller for warehouse managers to log stock arrivals, damage records, and view inventory history.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInventoryLogDto } from './dto/create-inventory-log.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.WAREHOUSE_OPERATOR, Role.STAFF, Role.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record warehouse inventory action log (RECEIVE, RELEASE, DAMAGE_RECORDED, MAINTENANCE)' })
  @ApiResponse({ status: 201, description: 'Inventory log recorded and stock level updated.' })
  @ApiResponse({ status: 400, description: 'Invalid stock deduction or payload error.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires WAREHOUSE_OPERATOR, STAFF, or ADMIN role.' })
  async createLog(@Request() req: any, @Body() dto: CreateInventoryLogDto) {
    return this.inventoryService.createLog(req.user.id, dto);
  }

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all inventory action logs with optional productId filter' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter logs for a specific product UUID' })
  @ApiResponse({ status: 200, description: 'List of inventory action logs.' })
  async findAll(@Query('productId') productId?: string) {
    return this.inventoryService.findAll(productId);
  }

  @Get('logs/product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete inventory audit history for a specific product' })
  @ApiResponse({ status: 200, description: 'Product inventory audit logs.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }
}
