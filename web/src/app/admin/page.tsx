/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Admin & Staff Management Dashboard (`page.tsx`).
 * Restricted to `ADMIN` and `STAFF` roles. Displays real-time ERP operational metrics (total products, active bookings,
 * pending approvals, revenue metrics) and provides new equipment inventory creation forms.
 *
 * IN SIMPLE WORDS:
 * The administration panel for managers to monitor high-level system metrics and add new equipment items to the catalog.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Shield, PackagePlus, BarChart3, Clock, CheckCircle2, DollarSign } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalReservations: 0,
    pendingApprovals: 0,
    activeBookings: 0,
  });

  // Create Product Form State
  const [name, setName] = useState('Tactical Recon Drone Mark IV');
  const [sku, setSku] = useState(`EQUIP-DRONE-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('Long-range surveillance drone with thermal imaging.');
  const [pricePerDay, setPricePerDay] = useState(150);
  const [totalStock, setTotalStock] = useState(10);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMetrics = async () => {
    try {
      const [prodRes, resRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/reservations'),
      ]);

      const products = prodRes.data.products || [];
      const reservations = resRes.data.reservations || [];

      setStats({
        totalProducts: products.length,
        totalReservations: reservations.length,
        pendingApprovals: reservations.filter((r: any) => r.status === 'PENDING').length,
        activeBookings: reservations.filter((r: any) => r.status === 'ACTIVE').length,
      });
    } catch {
      // Handle gracefully
    }
  };

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      fetchMetrics();
    }
  }, [user]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      await apiClient.post('/products', {
        name,
        sku,
        description,
        pricePerDay: Number(pricePerDay),
        totalStock: Number(totalStock),
      });

      setMsg({ type: 'success', text: `Equipment '${name}' added successfully!` });
      setSku(`EQUIP-DRONE-${Math.floor(100 + Math.random() * 900)}`);
      fetchMetrics();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create product.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', margin: '12px 0 0 0' }}>Requires ADMIN or STAFF role permissions.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Admin & Staff Control Center</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Real-time system telemetry, stock metrics, and catalog management.
        </p>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid-4">
        <div className="glass-panel">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Equipment</span>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#60a5fa', margin: '4px 0' }}>{stats.totalProducts}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Catalog Products</span>
        </div>

        <div className="glass-panel">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Approvals</span>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fbbf24', margin: '4px 0' }}>{stats.pendingApprovals}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Awaiting Staff Action</span>
        </div>

        <div className="glass-panel">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Deployments</span>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#34d399', margin: '4px 0' }}>{stats.activeBookings}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Checked-out Units</span>
        </div>

        <div className="glass-panel">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Bookings</span>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#c084fc', margin: '4px 0' }}>{stats.totalReservations}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>System Transactions</span>
        </div>
      </div>

      {/* Add Equipment Form */}
      <div className="glass-panel" style={{ maxWidth: '640px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PackagePlus size={20} /> Add New Equipment to Catalog
        </h3>

        {msg && (
          <div style={{ padding: '12px', background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '10px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleCreateProduct}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Equipment Name</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Unique SKU Code</label>
              <input type="text" className="form-input" value={sku} onChange={(e) => setSku(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Item Description</label>
            <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Price Per Day ($)</label>
              <input type="number" min="0.01" step="0.01" className="form-input" value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} required />
            </div>

            <div className="form-group">
              <label className="form-label">Total Stock Quantity</label>
              <input type="number" min="1" className="form-input" value={totalStock} onChange={(e) => setTotalStock(Number(e.target.value))} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Adding Equipment...' : 'Create Equipment Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
