/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Customer Equipment Catalog & Search/Filter Page (`page.tsx`).
 * Fetches equipment products dynamically from NestJS `/api/v1/products` REST API using `apiClient`.
 * Implements search filtering by SKU or product name, stock badge indicators, and triggers reservation modal dialogs.
 *
 * IN SIMPLE WORDS:
 * The equipment catalog page where customers can search items, view daily rental prices, check stock levels, and select items to rent.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Search, Package, Shield, CalendarPlus, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  pricePerDay: number;
  totalStock: number;
  imageUrl: string | null;
}

export default function CatalogPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reservation Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [startDate, setStartDate] = useState('2026-08-10');
  const [endDate, setEndDate] = useState('2026-08-15');
  const [quantity, setQuantity] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProducts = async (searchQuery: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/products', {
        params: searchQuery ? { search: searchQuery } : {},
      });
      setProducts(res.data.products);
    } catch (err: any) {
      setError(err.message || 'Failed to load equipment catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(search);
  }, [search]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setBookingLoading(true);
    setBookingMsg(null);

    try {
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();

      await apiClient.post('/reservations', {
        startDate: startISO,
        endDate: endISO,
        items: [
          {
            productId: selectedProduct.id,
            quantity: Number(quantity),
          },
        ],
      });

      setBookingMsg({ type: 'success', text: `Reservation submitted successfully for ${selectedProduct.name}!` });
      setTimeout(() => {
        setSelectedProduct(null);
        setBookingMsg(null);
      }, 2000);
    } catch (err: any) {
      setBookingMsg({ type: 'error', text: err.message || 'Failed to submit reservation.' });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Search Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Equipment Catalog</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time availability of military-grade tactical equipment and surveillance drones.
          </p>
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by SKU or item name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading equipment catalog...</div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          No equipment items found matching "{search}".
        </div>
      ) : (
        <div className="grid-3">
          {products.map((product) => (
            <div key={product.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    {product.sku}
                  </span>
                  {product.totalStock > 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                      <CheckCircle size={14} /> In Stock ({product.totalStock})
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                      <XCircle size={14} /> Out of Stock
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{product.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px', minHeight: '40px' }}>
                  {product.description || 'Standard tactical deployment unit.'}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--card-border)', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rental Rate</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc' }}>
                    ${Number(product.pricePerDay).toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>/ day</span>
                  </span>
                </div>

                {user ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={product.totalStock === 0}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <CalendarPlus size={16} /> Reserve Equipment
                  </button>
                ) : (
                  <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                    Login to Reserve
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reservation Modal Dialog */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: '#0f172a' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Reserve Equipment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              {selectedProduct.name} ({selectedProduct.sku})
            </p>

            {bookingMsg && (
              <div style={{ padding: '12px', background: bookingMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${bookingMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '10px', color: bookingMsg.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                {bookingMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateReservation}>
              <div className="form-group">
                <label className="form-label">Rental Start Date</label>
                <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Rental End Date</label>
                <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity (Units)</label>
                <input type="number" min="1" max={selectedProduct.totalStock} className="form-input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={bookingLoading}>
                  {bookingLoading ? 'Submitting...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
