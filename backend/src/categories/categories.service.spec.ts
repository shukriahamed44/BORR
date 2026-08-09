/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for the Equipment Category taxonomy (`CategoriesServiceSpec`).
 * Mocks `PrismaService` to verify that the Prisma `_count` relation aggregate is flattened
 * onto each category as `productCount`, and that an unknown UUID raises `NotFoundException`.
 *
 * IN SIMPLE WORDS:
 * Checks the category list reports how many items are in each category, and that asking for
 * a category that does not exist returns a clean 404 rather than null.
 */

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should flatten the _count relation into productCount and drop _count', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Drones', _count: { products: 4 } },
        { id: 'cat-2', name: 'Optics', _count: { products: 0 } },
      ]);

      const result = await service.findAll();

      expect(result.count).toBe(2);
      expect(result.categories[0]).toEqual({
        id: 'cat-1',
        name: 'Drones',
        productCount: 4,
      });
      expect(result.categories[1].productCount).toBe(0);
      expect(result.categories[0]).not.toHaveProperty('_count');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
