/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for Equipment / Product Inventory Domain (`ProductsService`).
 * Encapsulates database queries using `PrismaService` for creating, reading, searching, updating, and deleting
 * equipment records in PostgreSQL.
 *
 * IN SIMPLE WORDS:
 * Handles all database operations for equipment inventory (adding equipment, listing products, finding by ID, updating price/stock, and deleting items).
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new equipment product record in PostgreSQL.
   */
  async create(dto: CreateProductDto) {
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new ConflictException(`Equipment with SKU '${dto.sku}' already exists.`);
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        pricePerDay: dto.pricePerDay,
        totalStock: dto.totalStock,
      },
    });

    return {
      message: 'Equipment product created successfully.',
      product,
    };
  }

  /**
   * Retrieves all equipment products with optional search query matching name or SKU.
   */
  async findAll(search?: string) {
    const whereCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const products = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    });

    return {
      count: products.length,
      products,
    };
  }

  /**
   * Finds a single equipment item by unique UUID.
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Equipment with ID '${id}' not found.`);
    }

    return product;
  }

  /**
   * Updates fields of an existing equipment product.
   */
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // Ensures entity exists

    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(`SKU '${dto.sku}' is already assigned to another product.`);
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    return {
      message: 'Equipment product updated successfully.',
      product: updatedProduct,
    };
  }

  /**
   * Removes an equipment product from database.
   */
  async remove(id: string) {
    await this.findOne(id); // Ensures entity exists

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: `Equipment product '${id}' deleted successfully.`,
    };
  }
}
