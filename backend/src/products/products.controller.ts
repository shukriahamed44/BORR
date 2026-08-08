/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing requests under `/products` path prefix for Equipment Inventory Management.
 * Enforces Role-Based Access Control via `JwtAuthGuard` and `RolesGuard`, restricting mutation operations
 * to `ADMIN` and `STAFF` roles while exposing search and read routes to all authenticated users.
 * Decorated with Swagger OpenAPI specifications (`@ApiTags('Equipment')`).
 *
 * IN SIMPLE WORDS:
 * The API controller for equipment items. Allows anyone to browse catalog items, but only Admins and Staff can add, modify, or delete equipment.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ProductsService } from './products.service';

@ApiTags('Equipment')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add new equipment item (ADMIN or STAFF only)' })
  @ApiResponse({ status: 201, description: 'Equipment item created successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN or STAFF role.' })
  @ApiResponse({ status: 409, description: 'SKU code conflict.' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List equipment with search, category / price filtering, sorting and pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of equipment items retrieved.' })
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of a specific equipment item by ID' })
  @ApiResponse({ status: 200, description: 'Equipment item details.' })
  @ApiResponse({ status: 404, description: 'Equipment item not found.' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update equipment details or stock level (ADMIN or STAFF only)' })
  @ApiResponse({ status: 200, description: 'Equipment updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN or STAFF role.' })
  @ApiResponse({ status: 404, description: 'Equipment not found.' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete equipment item (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Equipment deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role.' })
  @ApiResponse({ status: 404, description: 'Equipment not found.' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
