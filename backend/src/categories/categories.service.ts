/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Business Logic Service for the Equipment Category taxonomy (`CategoriesService`).
 * Reads category records via `PrismaService`, attaching an aggregate product count to each
 * entry so clients can render filter facets without issuing follow-up queries.
 *
 * IN SIMPLE WORDS:
 * Fetches the equipment categories, including how many items sit in each one, so the
 * catalog filter list can show counts next to every category name.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /** Lists every category alphabetically with its product tally. */
  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return {
      count: categories.length,
      categories: categories.map(({ _count, ...category }) => ({
        ...category,
        productCount: _count.products,
      })),
    };
  }

  /** Resolves a single category by UUID. */
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found.`);
    }

    const { _count, ...rest } = category;
    return { ...rest, productCount: _count.products };
  }
}
