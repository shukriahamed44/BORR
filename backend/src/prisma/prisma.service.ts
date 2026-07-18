/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Prisma Database Client Provider (`PrismaService`).
 * Extends `@prisma/client` `PrismaClient` and hooks into NestJS `OnModuleInit` and `OnModuleDestroy` lifecycle events
 * to manage connection pooling, automatic database connect on boot, and graceful disconnect on server shutdown.
 *
 * IN SIMPLE WORDS:
 * The component that connects NestJS to your PostgreSQL database and handles disconnecting cleanly when the server stops.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
