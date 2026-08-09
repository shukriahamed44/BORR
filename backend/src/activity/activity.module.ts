/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Audit Trail Feature Module (`ActivityModule`). Declared `@Global()` because nearly every
 * domain module must record activity; making it global avoids importing it into each one
 * and keeps the dependency graph flat.
 *
 * IN SIMPLE WORDS:
 * Bundles the audit log. Marked global so any part of the app can write to it without extra
 * wiring.
 */

import { Global, Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
