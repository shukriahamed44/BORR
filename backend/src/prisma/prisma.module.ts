/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Global Prisma Database Module (`PrismaModule`).
 * Annotated with `@Global()` to make `PrismaService` available across all NestJS feature modules without requiring repetitive module imports.
 *
 * IN SIMPLE WORDS:
 * Makes the database service available everywhere in the app automatically.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
