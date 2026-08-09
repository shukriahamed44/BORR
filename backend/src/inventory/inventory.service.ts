/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for Warehouse Inventory Operations (`InventoryService`).
 * Handles recording audit trail logs for equipment actions (`RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`, `MAINTENANCE`)
 * and atomically updates `Product.totalStock` levels within Prisma database transactions (`$transaction`).
 *
 * IN SIMPLE WORDS:
 * Manages warehouse stock logs and automatically adjusts equipment quantity numbers when stock arrives or gets damaged.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, InventoryAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateInventoryLogDto } from './dto/create-inventory-log.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  /**
   * Records an inventory log entry and updates product stock levels atomically.
   */
  async createLog(operatorId: string, dto: CreateInventoryLogDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Equipment product with ID '${dto.productId}' not found.`);
    }

    // Validate stock deduction
    const deductionActions: InventoryAction[] = [
      InventoryAction.RELEASE,
      InventoryAction.DAMAGE_RECORDED,
    ];

    if (deductionActions.includes(dto.action) && product.totalStock < dto.quantity) {
      throw new BadRequestException(
        `Cannot execute '${dto.action}'. Requested deduction (${dto.quantity}) exceeds available stock (${product.totalStock}).`,
      );
    }

    // Execute atomic transaction: Create InventoryLog + Update Product stock
    const result = await this.prisma.$transaction(async (tx) => {
      let stockChange = 0;
      if (dto.action === InventoryAction.RECEIVE) {
        stockChange = dto.quantity; // Increase stock
      } else if (
        dto.action === InventoryAction.RELEASE ||
        dto.action === InventoryAction.DAMAGE_RECORDED
      ) {
        stockChange = -dto.quantity; // Decrease stock
      }

      // Update product stock if applicable
      const updatedProduct = stockChange !== 0
        ? await tx.product.update({
            where: { id: dto.productId },
            data: { totalStock: { increment: stockChange } },
          })
        : product;

      // Create log entry
      const log = await tx.inventoryLog.create({
        data: {
          productId: dto.productId,
          operatorId,
          action: dto.action,
          quantity: dto.quantity,
          notes: dto.notes,
        },
        include: {
          product: true,
          operator: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return { log, updatedStock: updatedProduct.totalStock };
    });

    await this.activity.record({
      userId: operatorId,
      action: ActivityAction.INVENTORY_CHANGED,
      entityType: 'Product',
      entityId: dto.productId,
      metadata: {
        inventoryAction: dto.action,
        quantity: dto.quantity,
        newStockLevel: result.updatedStock,
        productName: product.name,
        sku: product.sku,
      },
    });

    return {
      message: `Inventory action '${dto.action}' logged successfully.`,
      newStockLevel: result.updatedStock,
      log: result.log,
    };
  }

  /**
   * Retrieves all inventory audit logs.
   */
  async findAll(productId?: string) {
    const whereCondition = productId ? { productId } : {};

    const logs = await this.prisma.inventoryLog.findMany({
      where: whereCondition,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        operator: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return {
      count: logs.length,
      logs,
    };
  }

  /**
   * Retrieves history logs for a specific equipment product.
   */
  async findByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Equipment product with ID '${productId}' not found.`);
    }

    return this.findAll(productId);
  }
}
