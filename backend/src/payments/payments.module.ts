/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Mock Payment Operations Feature Module (`PaymentsModule`).
 * Packages `PaymentsService` and `PaymentsController` into NestJS dependency injection container.
 * Exports `PaymentsService` for consumption by notification and background queue modules.
 *
 * IN SIMPLE WORDS:
 * The module container that bundles all payment processing and refund features together.
 */

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockStripeGateway, PaymentGateway } from './gateway/payment.gateway';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // Swap this useClass for a real StripeGateway (same interface) to go live —
    // no changes required in PaymentsService, the controller, or the HTTP contract.
    { provide: PaymentGateway, useClass: MockStripeGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
