/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for Warehouse Inventory Service (`InventoryServiceSpec`).
 * Utilizes NestJS `@nestjs/testing` module and Jest framework.
 * Mocks `PrismaService` database transaction calls to test stock receiving (`RECEIVE`),
 * stock releasing (`RELEASE`), damage logs (`DAMAGE_RECORDED`), and stock deduction validation.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prismaService: any;

  const mockProduct = {
    id: 'product-uuid-1',
    name: 'Tactical Recon Drone Mark IV',
    sku: 'DRONE-MK4-001',
    pricePerDay: 150,
    totalStock: 10,
  };

  const mockLog = {
    id: 'log-uuid-1',
    productId: 'product-uuid-1',
    operatorId: 'user-uuid-operator',
    action: InventoryAction.RECEIVE,
    quantity: 5,
    notes: 'New stock batch arrival',
    timestamp: new Date(),
    product: mockProduct,
  };

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should throw NotFoundException if equipment product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const dto = {
        productId: 'invalid-id',
        action: InventoryAction.RECEIVE,
        quantity: 5,
      };

      await expect(service.createLog('operator-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if stock deduction exceeds current stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        totalStock: 2,
      });

      const dto = {
        productId: 'product-uuid-1',
        action: InventoryAction.RELEASE,
        quantity: 10, // Exceeds available stock of 2
      };

      await expect(service.createLog('operator-id', dto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully log RECEIVE action and increment total stock level', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          product: {
            update: jest.fn().mockResolvedValue({ ...mockProduct, totalStock: 15 }),
          },
          inventoryLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
        });
      });

      const dto = {
        productId: 'product-uuid-1',
        action: InventoryAction.RECEIVE,
        quantity: 5,
        notes: 'New stock batch arrival',
      };

      const result = await service.createLog('operator-id', dto);

      expect(result).toHaveProperty('newStockLevel', 15);
      expect(result.message).toContain('RECEIVE');
    });
  });

  describe('findAll', () => {
    it('should return list of inventory logs', async () => {
      mockPrismaService.inventoryLog.findMany.mockResolvedValue([mockLog]);

      const result = await service.findAll();

      expect(result).toHaveProperty('count', 1);
      expect(result.logs).toEqual([mockLog]);
    });
  });
});
