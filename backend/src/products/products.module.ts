/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Equipment / Product Feature Module (`ProductsModule`).
 * Packages `ProductsService` and `ProductsController` into NestJS dependency injection container.
 * Exports `ProductsService` for consumption by downstream reservation and inventory modules.
 *
 * IN SIMPLE WORDS:
 * The module container that bundles all equipment product features together.
 */

import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule { }
