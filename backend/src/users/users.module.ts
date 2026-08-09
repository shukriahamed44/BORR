/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * User Directory Feature Module (`UsersModule`).
 * Packages `UsersService` and `UsersController` into the NestJS DI container. Kept separate
 * from `AuthModule`, which owns authentication rather than account administration.
 *
 * IN SIMPLE WORDS:
 * Bundles the customer directory feature. Deliberately separate from the login/auth module.
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
