/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Payments & Billing page. Renders the transaction ledger from `GET /api/v1/payments` with
 * status facets and collected/refunded totals, drives settlement through a Stripe-style
 * checkout dialog (`POST /api/v1/payments/process`), exposes staff refund initiation
 * (`POST /api/v1/payments/refund`), and produces a printable invoice for any transaction.
 *
 * IN SIMPLE WORDS:
 * The billing screen. Customers settle outstanding reservations through a mock card checkout,
 * staff can refund a payment, and anyone can open a printable receipt for a transaction.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './PaymentsPage.css';
import { EmptyState, Pagination, RefCode, TabBar, Toasts } from '../ui';
import type { Role } from '../../types/auth';
import {
  paymentsApi,
  reservationsApi,
  type PaymentRecord,
  type PaymentStatus,
} from '../../services/api';

interface PaymentsPageProps {
  currentRole: Role;
}

const PAGE_SIZE = 8;

const TABS: { value: PaymentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const money = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ currentRole }) => {
  const isStaff = currentRole === 'ADMIN' || currentRole === 'STAFF';
  const isCustomer = currentRole === 'CUSTOMER';

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState({ collected: 0, refunded: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<PaymentStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Reservations the signed-in customer still owes money on. */
  const [unpaid, setUnpaid] = useState<any[]>([]);

  const [checkout, setCheckout] = useState<any | null>(null);
  const [refunding, setRefunding] = useState<PaymentRecord | null>(null);
  const [invoice, setInvoice] = useState<PaymentRecord | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentsApi.list({
        status: tab === 'ALL' ? undefined : tab,
        page,
        limit: PAGE_SIZE,
      });
      setPayments(data.payments);
      setStatusCounts(data.statusCounts ?? {});
      setTotals(data.totals ?? { collected: 0, refunded: 0 });
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Could not load payments.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Outstanding balances: reservations that are not cancelled/rejected and have no PAID payment.
  useEffect(() => {
    if (!isCustomer) return;
    let cancelled = false;

    reservationsApi
      .list({ limit: 100 })
      .then((data) => {
        if (cancelled) return;
        setUnpaid(
          data.reservations.filter(
            (r: any) =>
              !['CANCELLED', 'REJECTED'].includes(r.status) &&
              !(r.payments ?? []).some((p: any) => p.status === 'PAID'),
          ),
        );
      })
      .catch(() => setUnpaid([]));

    return () => {
      cancelled = true;
    };
  }, [isCustomer, msg]);

  const tabCount = (value: PaymentStatus | 'ALL') =>
    value === 'ALL'
      ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
      : statusCounts[value] ?? 0;

  const netCollected = useMemo(
    () => totals.collected - totals.refunded,
    [totals],
  );

  return (
    <div className="payments-page animate-fade-in">
      <Toasts message={msg} error={error} />

      {/* Revenue summary */}
      <div className="pay-summary">
        <div className="pay-stat glass-panel">
          <span className="pay-stat-label">Collected</span>
          <span className="pay-stat-value ok">${money(totals.collected)}</span>
        </div>
        <div className="pay-stat glass-panel">
          <span className="pay-stat-label">Refunded</span>
          <span className="pay-stat-value warn">${money(totals.refunded)}</span>
        </div>
        <div className="pay-stat glass-panel">
          <span className="pay-stat-label">Net</span>
          <span className="pay-stat-value">${money(netCollected)}</span>
        </div>
        <div className="pay-stat glass-panel">
          <span className="pay-stat-label">Transactions</span>
          <span className="pay-stat-value">{tabCount('ALL')}</span>
        </div>
      </div>

      {/* Outstanding balances (customer) */}
      {isCustomer && unpaid.length > 0 && (
        <section className="glass-panel outstanding-panel">
          <div className="panel-header">
            <h3>Outstanding Balances</h3>
            <span className="panel-hint">{unpaid.length} awaiting payment</span>
          </div>
          <ul className="outstanding-list">
            {unpaid.map((r) => (
              <li className="outstanding-row" key={r.id}>
                <div className="outstanding-info">
                  <RefCode id={r.id} />
                  <span className="outstanding-dates">
                    {shortDate(r.startDate)} → {shortDate(r.endDate)}
                  </span>
                  <span className={`status-pill status-${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
                <div className="outstanding-right">
                  <span className="outstanding-amount">${money(r.totalPrice)}</span>
                  <button className="btn-primary-glass" onClick={() => setCheckout(r)}>
                    Pay Now
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ledger */}
      <TabBar
        className="pay-tabs"
        tabs={TABS}
        active={tab}
        onSelect={(value) => {
          setTab(value);
          setPage(1);
        }}
        count={tabCount}
      />

      <div className="results-meta">
        {loading ? 'Loading transactions…' : `${total} transaction${total === 1 ? '' : 's'}`}
      </div>

      {!loading && payments.length === 0 ? (
        <EmptyState panel>No transactions in this view.</EmptyState>
      ) : (
        <div className="glass-panel pay-panel">
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  {isStaff && <th>Customer</th>}
                  <th>Reservation</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="txn-id" title={p.transactionId ?? ''}>
                        {p.transactionId ? `${p.transactionId.slice(0, 14)}…` : '—'}
                      </span>
                      {p.provider && <span className="txn-provider">{p.provider}</span>}
                    </td>
                    {isStaff && <td>{p.reservation?.user?.name ?? '—'}</td>}
                    <td>
                      <RefCode id={p.reservationId} />
                    </td>
                    <td className="amount-cell">${money(p.amount)}</td>
                    <td className="date-cell">{dateTime(p.createdAt)}</td>
                    <td>
                      <span className={`pay-status pay-${p.status.toLowerCase()}`}>{p.status}</span>
                      {p.status === 'FAILED' && p.failureReason && (
                        <span className="pay-reason">{p.failureReason}</span>
                      )}
                    </td>
                    <td>
                      <div className="pay-actions">
                        <button className="btn-small-glass" onClick={() => setInvoice(p)}>
                          Invoice
                        </button>
                        {isStaff && p.status === 'PAID' && (
                          <button className="btn-table-reject" onClick={() => setRefunding(p)}>
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {checkout && (
        <CheckoutModal
          reservation={checkout}
          onClose={() => setCheckout(null)}
          onPaid={(text) => {
            setCheckout(null);
            flash(text);
            load();
          }}
          onError={setError}
        />
      )}

      {refunding && (
        <RefundModal
          payment={refunding}
          onClose={() => setRefunding(null)}
          onRefunded={(text) => {
            setRefunding(null);
            flash(text);
            load();
          }}
          onError={setError}
        />
      )}

      {invoice && <InvoiceModal payment={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
};

/* ── Stripe-style checkout ──────────────────────────────────────────────── */

const CheckoutModal: React.FC<{
  reservation: any;
  onClose: () => void;
  onPaid: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ reservation, onClose, onPaid, onError }) => {
  const [submitting, setSubmitting] = useState(false);

  const rental = Number(reservation.totalPrice);
  // Deposits are held per line item; summed here for the payer's breakdown.
  const deposit = (reservation.items ?? []).reduce(
    (sum: number, i: any) => sum + Number(i.product?.deposit ?? 0) * i.quantity,
    0,
  );
  const dueNow = rental + deposit;

  const pay = async (simulateFailure: boolean) => {
    setSubmitting(true);
    try {
      await paymentsApi.processPayment({
        reservationId: reservation.id,
        amount: dueNow,
        simulateFailure,
      });
      onPaid(`Payment of $${money(dueNow)} succeeded.`);
    } catch (err: any) {
      onError(err.message || 'Payment failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="liquid-glass-modal checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h3 className="auth-title booking-title">Checkout</h3>
        <p className="booking-product">
          Reservation #{reservation.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="booking-summary checkout-summary">
          <div className="booking-line">
            <span>Rental charge</span>
            <span>${money(rental)}</span>
          </div>
          <div className="booking-line muted">
            <span>Refundable deposit</span>
            <span>${money(deposit)}</span>
          </div>
          <div className="booking-line total">
            <span>Total due</span>
            <span>${money(dueNow)}</span>
          </div>
        </div>

        {/* Presentational card form. No real card data is collected or transmitted —
            the mock gateway settles the intent server-side. */}
        <div className="card-form">
          <div className="card-brand-row">
            <span className="card-chip" />
            <span className="card-brand">mock&nbsp;stripe</span>
          </div>
          <div className="card-field">
            <label>Card number</label>
            <div className="card-value">4242 4242 4242 4242</div>
          </div>
          <div className="card-row">
            <div className="card-field">
              <label>Expiry</label>
              <div className="card-value">12 / 34</div>
            </div>
            <div className="card-field">
              <label>CVC</label>
              <div className="card-value">•••</div>
            </div>
          </div>
          <p className="card-note">
            Demo gateway — a test card is pre-filled and no real card details are collected.
          </p>
        </div>

        <button
          className="btn-auth-submit"
          disabled={submitting}
          onClick={() => pay(false)}
        >
          {submitting ? 'Processing…' : `Pay $${money(dueNow)}`}
        </button>

        <button
          className="btn-simulate-fail"
          disabled={submitting}
          onClick={() => pay(true)}
        >
          Simulate a declined card
        </button>
      </div>
    </div>
  );
};

/* ── Refund dialog ──────────────────────────────────────────────────────── */

const RefundModal: React.FC<{
  payment: PaymentRecord;
  onClose: () => void;
  onRefunded: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ payment, onClose, onRefunded, onError }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await paymentsApi.refundPayment({ paymentId: payment.id, reason: reason.trim() || undefined });
      onRefunded(`Refunded $${money(payment.amount)}.`);
    } catch (err: any) {
      onError(err.message || 'Refund failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="liquid-glass-modal booking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h3 className="auth-title booking-title">Refund Payment</h3>
        <p className="booking-product">
          ${money(payment.amount)} · {payment.transactionId?.slice(0, 18)}…
        </p>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="auth-label">Reason (optional)</label>
            <textarea
              className="auth-input booking-input booking-textarea"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Equipment unavailable at pickup."
            />
          </div>
          <button type="submit" className="btn-auth-submit" disabled={submitting}>
            {submitting ? 'Refunding…' : `Refund $${money(payment.amount)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── Printable invoice ──────────────────────────────────────────────────── */

const InvoiceModal: React.FC<{ payment: PaymentRecord; onClose: () => void }> = ({
  payment,
  onClose,
}) => (
  <div className="auth-overlay" onClick={onClose}>
    <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
      <button className="auth-close-btn invoice-close no-print" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <div className="invoice-sheet" id="invoice-sheet">
        <header className="invoice-head">
          <div>
            <h2 className="invoice-brand">BORR</h2>
            <p className="invoice-tagline">Equipment Rental Receipt</p>
          </div>
          <div className={`invoice-stamp stamp-${payment.status.toLowerCase()}`}>
            {payment.status}
          </div>
        </header>

        <dl className="invoice-meta">
          <div>
            <dt>Transaction ID</dt>
            <dd>{payment.transactionId ?? '—'}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{dateTime(payment.createdAt)}</dd>
          </div>
          <div>
            <dt>Reservation</dt>
            <dd>#{payment.reservationId.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div>
            <dt>Processor</dt>
            <dd>{payment.provider ?? 'mock_stripe'}</dd>
          </div>
          {payment.reservation?.user && (
            <div>
              <dt>Billed to</dt>
              <dd>
                {payment.reservation.user.name}
                <br />
                <span className="invoice-sub">{payment.reservation.user.email}</span>
              </dd>
            </div>
          )}
          {payment.reservation && (
            <div>
              <dt>Rental period</dt>
              <dd>
                {shortDate(payment.reservation.startDate)} → {shortDate(payment.reservation.endDate)}
              </dd>
            </div>
          )}
        </dl>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Equipment rental — reservation #{payment.reservationId.slice(0, 8).toUpperCase()}</td>
              <td>${money(payment.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>Total {payment.status === 'REFUNDED' ? 'refunded' : 'paid'}</th>
              <th>${money(payment.amount)}</th>
            </tr>
          </tfoot>
        </table>

        {payment.status === 'REFUNDED' && payment.refundedAt && (
          <p className="invoice-note">
            Refunded on {dateTime(payment.refundedAt)}
            {payment.failureReason ? ` — ${payment.failureReason}` : ''}.
          </p>
        )}
        {payment.status === 'FAILED' && payment.failureReason && (
          <p className="invoice-note">Declined — {payment.failureReason}</p>
        )}

        <footer className="invoice-foot">
          Thank you for renting with BORR. This receipt was generated by the AmmuNation ERP.
        </footer>
      </div>

      <div className="invoice-actions no-print">
        <button className="btn-small-glass" onClick={onClose}>
          Close
        </button>
        <button className="btn-primary-glass" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>
    </div>
  </div>
);
