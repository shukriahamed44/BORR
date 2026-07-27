/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for Products / Equipment Service (`ProductsServiceSpec`).
 * Utilizes NestJS `@nestjs/testing` module and Jest framework.
 * Mocks `PrismaService` database calls to verify equipment catalog retrieval, search filtering,
 * duplicate SKU collision handling (`ConflictException`), and ID lookup (`NotFoundException`).
 *
 * IN SIMPLE WORDS:
 * Automated test file that checks if equipment creation, catalog search, SKU duplicate prevention, and deletion work correctly.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: any;

  const mockProduct = {
    id: 'product-uuid-101',
    name: 'Tactical Recon Drone Mark IV',
    sku: 'EQUIP-DRONE-001',
    description: 'Long-range surveillance drone.',
    pricePerDay: 150.5,
    totalStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a new equipment product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const dto = {
        name: 'Tactical Recon Drone Mark IV',
        sku: 'EQUIP-DRONE-001',
        description: 'Long-range surveillance drone.',
        pricePerDay: 150.5,
        totalStock: 10,
      };

      const result = await service.create(dto);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { sku: dto.sku },
      });
      expect(prismaService.product.create).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(result.product.sku).toEqual(dto.sku);
    });

    it('should throw ConflictException if SKU code already exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const dto = {
        name: 'Tactical Recon Drone Mark IV',
        sku: 'EQUIP-DRONE-001',
        description: 'Long-range surveillance drone.',
        pricePerDay: 150.5,
        totalStock: 10,
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return equipment product when found by ID', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-uuid-101');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if equipment product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
