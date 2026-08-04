/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Warehouse Inventory Management & Audit Trail View Page (`page.tsx`).
 * Restricted to `WAREHOUSE_OPERATOR`, `STAFF`, and `ADMIN` roles.
 * Displays audit trail logs from `/api/v1/inventory/logs` and provides modal forms to log stock receipts (`RECEIVE`),
 * damage records (`DAMAGE_RECORDED`), and repair maintenance events (`MAINTENANCE`).
 *
 * IN SIMPLE WORDS:
 * The warehouse manager screen for logging stock shipments, recording damaged gear, and reviewing complete inventory history tables.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Warehouse, PlusCircle, History, PackageCheck, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface InventoryLog {
  id: string;
  action: 'RECEIVE' | 'RELEASE' | 'DAMAGE_RECORDED' | 'MAINTENANCE';
  quantity: number;
  notes: string | null;
  timestamp: string;
  product: {
    name: string;
    sku: string;
  };
  operator: {
    name: string;
    email: string;
    role: string;
  };
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Log Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [action, setAction] = useState<'RECEIVE' | 'RELEASE' | 'DAMAGE_RECORDED' | 'MAINTENANCE'>('RECEIVE');
  const [quantity, setQuantity] = useState(5);
  const [notes, setNotes] = useState('Stock shipment received at central warehouse.');
  const [logLoading, setLogLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, prodRes] = await Promise.all([
        apiClient.get('/inventory/logs'),
        apiClient.get('/products'),
      ]);

      setLogs(logsRes.data.logs || []);
      setProducts(prodRes.data.products || []);

      if (prodRes.data.products?.length > 0) {
        setSelectedProductId(prodRes.data.products[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'WAREHOUSE_OPERATOR' || user.role === 'STAFF' || user.role === 'ADMIN')) {
      fetchData();
    }
  }, [user]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setLogLoading(true);
    setMsg(null);

    try {
      const res = await apiClient.post('/inventory/logs', {
        productId: selectedProductId,
        action,
        quantity: Number(quantity),
        notes,
      });

      setMsg({ type: 'success', text: `Log created! New stock level: ${res.data.newStockLevel}` });
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to record log.' });
    } finally {
      setLogLoading(false);
    }
  };

  if (!user || (user.role !== 'WAREHOUSE_OPERATOR' && user.role !== 'STAFF' && user.role !== 'ADMIN')) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', margin: '12px 0 0 0' }}>Requires WAREHOUSE_OPERATOR, STAFF, or ADMIN role permissions.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Warehouse Inventory Operations</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Real-time stock audit trail logging for stock receipts, damage inspection reports, and maintenance.
        </p>
      </div>

      <div className="grid-2">
        {/* Left Column: Log Entry Form */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={20} /> Log Stock Action Event
          </h3>

          {msg && (
            <div style={{ padding: '12px', background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '10px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleCreateLog}>
            <div className="form-group">
              <label className="form-label">Target Equipment Item</label>
              <select className="form-select" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Inventory Action Type</label>
              <select className="form-select" value={action} onChange={(e: any) => setAction(e.target.value)} required>
                <option value="RECEIVE">RECEIVE (Add new stock shipment)</option>
                <option value="RELEASE">RELEASE (Checkout gear to customer)</option>
                <option value="DAMAGE_RECORDED">DAMAGE_RECORDED (Deduct damaged gear)</option>
                <option value="MAINTENANCE">MAINTENANCE (Repair audit note)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unit Quantity Affected</label>
              <input type="number" min="1" className="form-input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>

            <div className="form-group">
              <label className="form-label">Operator Notes / Inspection Details</label>
              <input type="text" className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={logLoading}>
              {logLoading ? 'Recording Log...' : 'Record Inventory Action'}
            </button>
          </form>
        </div>

        {/* Right Column: Audit Trail Table */}
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} /> Stock Audit Trail History
          </h3>

          {error && <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</div>}

          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No inventory logs recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className={`badge badge-${log.action === 'RECEIVE' ? 'CUSTOMER' : log.action === 'DAMAGE_RECORDED' ? 'ADMIN' : 'STAFF'}`}>
                      {log.action} ({log.quantity} units)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc' }}>
                    {log.product.name} ({log.product.sku})
                  </div>

                  {log.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Note: {log.notes}</div>}
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '4px' }}>Operator: {log.operator.name} ({log.operator.role})</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
