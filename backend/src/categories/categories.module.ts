/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Equipment Category Feature Module (`CategoriesModule`).
 * Packages `CategoriesService` and `CategoriesController` into the NestJS DI container.
 *
 * IN SIMPLE WORDS:
 * The module container that bundles the equipment category features together.
 */

import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
