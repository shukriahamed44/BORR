/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Payment gateway abstraction modelled on the Stripe PaymentIntent lifecycle.
 * `PaymentGateway` declares the contract (`createPaymentIntent`, `confirmPaymentIntent`,
 * `refund`, `retrievePaymentIntent`) using Stripe's own vocabulary — intent identifiers,
 * client secrets, minor-unit amounts and `requires_confirmation` / `succeeded` / `canceled`
 * status values — so a real Stripe SDK driver can replace the mock implementation without
 * altering `PaymentsService` or any HTTP contract.
 *
 * IN SIMPLE WORDS:
 * Defines how the app talks to a card processor, using the same shapes Stripe uses. Today a
 * fake in-memory driver answers those calls; switching to the real Stripe later means writing
 * one new driver class and changing a single line in the module — nothing else changes.
 */

import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';

/** Mirrors the subset of Stripe PaymentIntent statuses this workflow uses. */
export type PaymentIntentStatus =
  | 'requires_confirmation'
  | 'processing'
  | 'succeeded'
  | 'requires_payment_method'
  | 'canceled';

export interface PaymentIntent {
  id: string;
  /** Amount in the smallest currency unit (cents), exactly as Stripe represents it. */
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  clientSecret: string;
  /** Present only on a failed authorisation, mirroring Stripe's decline codes. */
  lastPaymentError?: { code: string; message: string };
  metadata?: Record<string, string>;
  created: number;
}

export interface RefundResult {
  id: string;
  paymentIntentId: string;
  amount: number;
  status: 'succeeded' | 'failed';
  reason?: string;
  created: number;
}

export abstract class PaymentGateway {
  /** Provider identifier persisted on the Payment row (e.g. "mock_stripe", "stripe"). */
  abstract readonly provider: string;

  abstract createPaymentIntent(params: {
    amountMinor: number;
    currency?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent>;

  abstract confirmPaymentIntent(
    intentId: string,
    opts?: { simulateFailure?: boolean },
  ): Promise<PaymentIntent>;

  abstract retrievePaymentIntent(intentId: string): Promise<PaymentIntent | null>;

  abstract refund(params: {
    paymentIntentId: string;
    amountMinor: number;
    reason?: string;
  }): Promise<RefundResult>;
}

/**
 * Development driver. Behaves like Stripe without any network calls or credentials:
 * identifiers use Stripe's `pi_` / `re_` prefixes, amounts are minor units, and confirmation
 * can be forced to decline so the failure path is demonstrable.
 *
 * State is held in memory, so intents do not survive a restart — acceptable because the
 * durable record of every payment is the `Payment` table, not the gateway.
 */
@Injectable()
export class MockStripeGateway extends PaymentGateway {
  readonly provider = 'mock_stripe';

  private readonly intents = new Map<string, PaymentIntent>();

  private id(prefix: string): string {
    return `${prefix}_${randomBytes(12).toString('hex')}`;
  }

  async createPaymentIntent(params: {
    amountMinor: number;
    currency?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    const intent: PaymentIntent = {
      id: this.id('pi'),
      amount: params.amountMinor,
      currency: params.currency ?? 'usd',
      status: 'requires_confirmation',
      // Stripe's client secret is "<intent id>_secret_<random>"; the browser would use this
      // to confirm the payment directly with the provider.
      clientSecret: `${this.id('pi')}_secret_${randomUUID().replace(/-/g, '')}`,
      metadata: params.metadata,
      created: Math.floor(Date.now() / 1000),
    };

    this.intents.set(intent.id, intent);
    return intent;
  }

  async confirmPaymentIntent(
    intentId: string,
    opts: { simulateFailure?: boolean } = {},
  ): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error(`No such payment_intent: ${intentId}`);
    }

    if (opts.simulateFailure) {
      intent.status = 'requires_payment_method';
      intent.lastPaymentError = {
        code: 'card_declined',
        message: 'Your card was declined.',
      };
    } else {
      intent.status = 'succeeded';
      delete intent.lastPaymentError;
    }

    this.intents.set(intentId, intent);
    return intent;
  }

  async retrievePaymentIntent(intentId: string): Promise<PaymentIntent | null> {
    return this.intents.get(intentId) ?? null;
  }

  async refund(params: {
    paymentIntentId: string;
    amountMinor: number;
    reason?: string;
  }): Promise<RefundResult> {
    const intent = this.intents.get(params.paymentIntentId);

    // A restart clears in-memory intents; the Payment row is still authoritative, so a
    // refund must not be blocked just because the gateway has forgotten the intent.
    if (intent) {
      intent.status = 'canceled';
      this.intents.set(params.paymentIntentId, intent);
    }

    return {
      id: this.id('re'),
      paymentIntentId: params.paymentIntentId,
      amount: params.amountMinor,
      status: 'succeeded',
      reason: params.reason,
      created: Math.floor(Date.now() / 1000),
    };
  }
}
