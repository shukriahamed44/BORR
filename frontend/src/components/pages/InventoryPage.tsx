/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Inventory & Warehouse Operations page. Presents live stock levels per equipment SKU alongside
 * the immutable audit trail returned by `GET /api/v1/inventory/logs`. Warehouse actions
 * (`RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`, `MAINTENANCE`) are submitted through
 * `POST /api/v1/inventory/logs`, which mutates `Product.totalStock` and writes the log entry
 * inside a single Prisma transaction.
 *
 * IN SIMPLE WORDS:
 * The warehouse screen. Shows how many of each item are in stock, lets operators record
 * deliveries, dispatches, damage and maintenance, and keeps a running history of every change.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './InventoryPage.css';
import type { Role } from '../../types/auth';
import {
  inventoryApi,
  productsApi,
  type InventoryAction,
  type InventoryLog,
  type Product,
} from '../../services/api';

interface InventoryPageProps {
  currentRole: Role;
}

/** Threshold at which stock is surfaced as low; mirrors the dashboard's lowStock query. */
const LOW_STOCK_AT = 3;

const ACTIONS: {
  value: InventoryAction;
  label: string;
  blurb: string;
  effect: 'add' | 'remove' | 'none';
  icon: string;
}[] = [
  {
    value: 'RECEIVE',
    label: 'Receive',
    blurb: 'Stock arriving into the warehouse',
    effect: 'add',
    icon: '📥',
  },
  {
    value: 'RELEASE',
    label: 'Release',
    blurb: 'Dispatch for an approved reservation',
    effect: 'remove',
    icon: '📤',
  },
  {
    value: 'DAMAGE_RECORDED',
    label: 'Damage',
    blurb: 'Write off damaged units',
    effect: 'remove',
    icon: '⚠️',
  },
  {
    value: 'MAINTENANCE',
    label: 'Service',
    blurb: 'Log servicing — stock level unchanged',
    effect: 'none',
    icon: '🔧',
  },
];

const ACTION_META: Record<InventoryAction, { label: string; tone: string }> = {
  RECEIVE: { label: 'Receive', tone: 'add' },
  RELEASE: { label: 'Release', tone: 'remove' },
  DAMAGE_RECORDED: { label: 'Damage', tone: 'danger' },
  MAINTENANCE: { label: 'Maintenance', tone: 'neutral' },
};

const when = (ts: string) =>
  new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const InventoryPage: React.FC<InventoryPageProps> = ({ currentRole }) => {
  // The backend allows WAREHOUSE_OPERATOR, STAFF and ADMIN to record inventory actions.
  const canRecord =
    currentRole === 'WAREHOUSE_OPERATOR' || currentRole === 'STAFF' || currentRole === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('');

  const [action, setAction] = useState<{ product: Product; action: InventoryAction } | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productList, logList] = await Promise.all([
        productsApi.getAll(),
        inventoryApi.getLogs(),
      ]);
      setProducts(productList);
      setLogs(logList);
    } catch (err: any) {
      setError(err.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => (lowOnly ? p.totalStock <= LOW_STOCK_AT : true))
      .filter((p) =>
        term ? p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) : true,
      )
      .sort((a, b) => a.totalStock - b.totalStock);
  }, [products, search, lowOnly]);

  const visibleLogs = useMemo(
    () => (logFilter ? logs.filter((l) => l.product?.id === logFilter) : logs),
    [logs, logFilter],
  );

  const totals = useMemo(
    () => ({
      skus: products.length,
      units: products.reduce((sum, p) => sum + p.totalStock, 0),
      low: products.filter((p) => p.totalStock <= LOW_STOCK_AT).length,
      out: products.filter((p) => p.totalStock === 0).length,
    }),
    [products],
  );

  return (
    <div className="inventory-page animate-fade-in">
      {msg && <div className="page-toast success">{msg}</div>}
      {error && <div className="page-toast error">{error}</div>}

      {/* Stock summary */}
      <div className="inv-summary">
        <div className="inv-stat glass-panel">
          <span className="inv-stat-label">Tracked SKUs</span>
          <span className="inv-stat-value">{totals.skus}</span>
        </div>
        <div className="inv-stat glass-panel">
          <span className="inv-stat-label">Units in stock</span>
          <span className="inv-stat-value">{totals.units}</span>
        </div>
        <div className="inv-stat glass-panel">
          <span className="inv-stat-label">Low stock</span>
          <span className="inv-stat-value warn">{totals.low}</span>
        </div>
        <div className="inv-stat glass-panel">
          <span className="inv-stat-label">Out of stock</span>
          <span className="inv-stat-value danger">{totals.out}</span>
        </div>
      </div>

      <div className="inv-layout">
        {/* Stock table */}
        <section className="glass-panel inv-panel">
          <div className="panel-header">
            <h3>Stock Levels</h3>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />
              <span>Low stock only</span>
            </label>
          </div>

          <div className="inv-search liquid-glass-search">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="header-search-input"
              placeholder="Search equipment or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="dash-empty">Loading stock…</div>
          ) : visibleProducts.length === 0 ? (
            <div className="dash-empty">No equipment matches this view.</div>
          ) : (
            <div className="table-responsive">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>SKU</th>
                    <th>In stock</th>
                    {canRecord && <th>Warehouse actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => {
                    const out = p.totalStock === 0;
                    const low = !out && p.totalStock <= LOW_STOCK_AT;
                    return (
                      <tr key={p.id} className={out ? 'row-out' : low ? 'row-low' : ''}>
                        <td>
                          <button
                            className="inv-name-btn"
                            onClick={() => setLogFilter(logFilter === p.id ? '' : p.id)}
                            title="Filter the activity log by this item"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td>
                          <span className="id-code">{p.sku}</span>
                        </td>
                        <td>
                          <span className={`stock-badge ${out ? 'out' : low ? 'low' : 'ok'}`}>
                            {p.totalStock} {out ? '· out' : low ? '· low' : 'units'}
                          </span>
                        </td>
                        {canRecord && (
                          <td>
                            <div className="inv-actions">
                              {ACTIONS.map((a) => (
                                <button
                                  key={a.value}
                                  className={`inv-action-btn tone-${a.effect}`}
                                  // Deductions are impossible at zero stock; the server rejects
                                  // them anyway, so don't offer a button that must fail.
                                  disabled={a.effect === 'remove' && p.totalStock === 0}
                                  title={a.blurb}
                                  onClick={() => setAction({ product: p, action: a.value })}
                                >
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Audit trail */}
        <section className="glass-panel inv-panel">
          <div className="panel-header">
            <h3>Activity Audit Log</h3>
            {logFilter && (
              <button className="btn-link" onClick={() => setLogFilter('')}>
                Clear filter
              </button>
            )}
          </div>

          {loading ? (
            <div className="dash-empty">Loading history…</div>
          ) : visibleLogs.length === 0 ? (
            <div className="dash-empty">No inventory activity recorded yet.</div>
          ) : (
            <ol className="timeline">
              {visibleLogs.map((log) => {
                const meta = ACTION_META[log.action];
                return (
                  <li className="timeline-row" key={log.id}>
                    <span className={`timeline-dot dot-${meta.tone}`} />
                    <div className="timeline-body">
                      <div className="timeline-head">
                        <span className={`action-chip chip-${meta.tone}`}>{meta.label}</span>
                        <span className="timeline-qty">
                          {log.action === 'RECEIVE' ? '+' : log.action === 'MAINTENANCE' ? '' : '−'}
                          {log.quantity}
                        </span>
                        <span className="timeline-time">{when(log.timestamp)}</span>
                      </div>
                      <div className="timeline-product">{log.product?.name ?? 'Equipment'}</div>
                      {log.notes && <div className="timeline-notes">{log.notes}</div>}
                      <div className="timeline-operator">
                        by {log.operator?.name ?? 'Unknown'}
                        {log.operator?.role ? ` · ${log.operator.role.replace('_', ' ')}` : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {action && (
        <InventoryActionModal
          product={action.product}
          action={action.action}
          onClose={() => setAction(null)}
          onDone={(text) => {
            setAction(null);
            flash(text);
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
};

/* ── Warehouse action dialog ────────────────────────────────────────────── */

const InventoryActionModal: React.FC<{
  product: Product;
  action: InventoryAction;
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ product, action, onClose, onDone, onError }) => {
  const meta = ACTIONS.find((a) => a.value === action)!;
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const projected =
    meta.effect === 'add'
      ? product.totalStock + quantity
      : meta.effect === 'remove'
      ? product.totalStock - quantity
      : product.totalStock;

  // Mirrors the server guard: a deduction may not exceed available stock.
  const exceedsStock = meta.effect === 'remove' && quantity > product.totalStock;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exceedsStock) return;
    setSubmitting(true);
    try {
      const res = await inventoryApi.createLog({
        productId: product.id,
        action,
        quantity,
        notes: notes.trim() || undefined,
      });
      onDone(`${meta.label} recorded — ${product.name} now at ${res.newStockLevel} units.`);
    } catch (err: any) {
      onError(err.message || 'Inventory action failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="liquid-glass-modal booking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h3 className="auth-title booking-title">
          {meta.icon} {meta.label}
        </h3>
        <p className="booking-product">{product.name}</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="auth-label">Quantity</label>
            <input
              type="number"
              className="auth-input booking-input"
              min={1}
              max={meta.effect === 'remove' ? product.totalStock : undefined}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              required
            />
          </div>

          {exceedsStock && (
            <div className="auth-error">
              Only {product.totalStock} unit{product.totalStock === 1 ? '' : 's'} available.
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Notes (optional)</label>
            <textarea
              className="auth-input booking-input booking-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={meta.blurb}
            />
          </div>

          <div className="booking-summary">
            <div className="booking-line">
              <span>Current stock</span>
              <span>{product.totalStock}</span>
            </div>
            <div className="booking-line total">
              <span>After this action</span>
              <span>{meta.effect === 'none' ? `${product.totalStock} (unchanged)` : projected}</span>
            </div>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={submitting || exceedsStock}>
            {submitting ? 'Recording…' : `Confirm ${meta.label}`}
          </button>
        </form>
      </div>
    </div>
  );
};
