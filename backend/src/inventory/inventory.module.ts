/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Warehouse Inventory Operations Feature Module (`InventoryModule`).
 * Packages `InventoryService` and `InventoryController` into NestJS dependency injection container.
 * Exports `InventoryService` for background tasks and reporting modules.
 *
 * IN SIMPLE WORDS:
 * The module container that bundles all warehouse stock audit logging features together.
 */

import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
