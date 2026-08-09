/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Document Upload Feature Module (`UploadsModule`). Binds the abstract `StorageDriver`
 * token to a concrete implementation, so swapping local disk for S3/R2 is a single
 * provider change rather than a code change in consuming services.
 *
 * IN SIMPLE WORDS:
 * Bundles the document upload feature and decides which storage backend is used.
 */

import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { LocalDiskStorageDriver, StorageDriver } from './storage/storage.driver';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    // Swap this useClass for an S3StorageDriver / R2StorageDriver to change backends.
    { provide: StorageDriver, useClass: LocalDiskStorageDriver },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
