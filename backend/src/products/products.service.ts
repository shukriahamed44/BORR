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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductSort, QueryProductsDto } from './dto/query-products.dto';

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
        deposit: dto.deposit ?? 0,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
        specifications: dto.specifications,
      },
      include: { category: true },
    });

    return {
      message: 'Equipment product created successfully.',
      product,
    };
  }

  /**
   * Retrieves a paginated, filterable page of equipment.
   * Supports free-text search, category (id or slug), price range, availability,
   * and sort ordering. Returns pagination metadata alongside the rows.
   */
  async findAll(query: QueryProductsDto = {}) {
    const page = query.page ?? 1;
    // Cap page size so a caller cannot request the entire table in one response.
    const limit = Math.min(query.limit ?? 12, 100);

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.categorySlug) where.category = { slug: query.categorySlug };
    if (query.availableOnly) where.totalStock = { gt: 0 };

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.pricePerDay = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === ProductSort.PRICE_ASC
        ? { pricePerDay: 'asc' }
        : query.sort === ProductSort.PRICE_DESC
        ? { pricePerDay: 'desc' }
        : query.sort === ProductSort.NAME_ASC
        ? { name: 'asc' }
        : { createdAt: 'desc' };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
    ]);

    return {
      // `count` is the length of this page — kept for backwards compatibility with existing clients.
      count: products.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      products,
    };
  }

  /**
   * Finds a single equipment item by unique UUID, including its category.
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
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
