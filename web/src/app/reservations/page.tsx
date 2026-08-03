/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Customer & Staff Reservation Management Page (`page.tsx`).
 * Fetches user reservations from `/api/v1/reservations`, renders State Machine status indicators (`PENDING` ➔ `APPROVED` ➔ `ACTIVE` ➔ `RETURNED`),
 * provides staff state transition buttons, and handles mock payment processing modals.
 *
 * IN SIMPLE WORDS:
 * The bookings page where customers view their equipment rentals and staff members approve bookings, process checkouts, and mark returned equipment.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, CreditCard, CheckCircle, Clock, ArrowRight, DollarSign } from 'lucide-react';

interface ReservationItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    sku: string;
  };
}

interface Reservation {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'RETURNED' | 'CANCELLED';
  totalPrice: number;
  startDate: string;
  endDate: string;
  items: ReservationItem[];
  user?: {
    name: string;
    email: string;
  };
}

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal State
  const [payReservation, setPayReservation] = useState<Reservation | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg, setPayMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/reservations');
      setReservations(res.data.reservations);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/reservations/${id}/status`, { status: newStatus });
      fetchReservations();
    } catch (err: any) {
      alert(err.message || 'Failed to update reservation status.');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payReservation) return;
    setPayLoading(true);
    setPayMsg(null);

    try {
      await apiClient.post('/payments/process', {
        reservationId: payReservation.id,
        amount: Number(payReservation.totalPrice),
        paymentMethod: 'CREDIT_CARD',
        simulateFailure: false,
      });

      setPayMsg({ type: 'success', text: 'Payment processed successfully!' });
      setTimeout(() => {
        setPayReservation(null);
        setPayMsg(null);
        fetchReservations();
      }, 1500);
    } catch (err: any) {
      setPayMsg({ type: 'error', text: err.message || 'Payment processing failed.' });
    } finally {
      setPayLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Authentication Required</h2>
        <p style={{ color: 'var(--text-muted)', margin: '12px 0 24px 0' }}>Please log in to view your reservation bookings.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Equipment Reservations</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          State machine reservation workflow tracking and payment processing.
        </p>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading bookings...</div>
      ) : reservations.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          No reservation bookings found. Explore the catalog to create your first booking.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reservations.map((res) => (
            <div key={res.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className={`badge badge-${res.status === 'PENDING' ? 'STAFF' : res.status === 'APPROVED' ? 'CUSTOMER' : res.status === 'ACTIVE' ? 'WAREHOUSE_OPERATOR' : 'ADMIN'}`}>
                    {res.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {res.id.slice(0, 8)}...</span>
                  {res.user && <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Renter: {res.user.name}</span>}
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Start: {new Date(res.startDate).toLocaleDateString()}</span>
                  <span>End: {new Date(res.endDate).toLocaleDateString()}</span>
                </div>

                <div style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                  {res.items?.map((item) => (
                    <div key={item.id}>
                      • {item.product.name} ({item.quantity} units @ ${Number(item.unitPrice)}/day)
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Cost</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#34d399' }}>
                    ${Number(res.totalPrice).toFixed(2)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {res.status === 'PENDING' && (user.role === 'ADMIN' || user.role === 'STAFF') && (
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleUpdateStatus(res.id, 'APPROVED')}>
                      Approve Booking
                    </button>
                  )}

                  {res.status === 'APPROVED' && (user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'WAREHOUSE_OPERATOR') && (
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} onClick={() => handleUpdateStatus(res.id, 'ACTIVE')}>
                      Checkout Equipment
                    </button>
                  )}

                  {res.status === 'ACTIVE' && (user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'WAREHOUSE_OPERATOR') && (
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleUpdateStatus(res.id, 'RETURNED')}>
                      Mark Returned
                    </button>
                  )}

                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setPayReservation(res)}>
                    <CreditCard size={14} /> Pay Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Processing Modal */}
      {payReservation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', background: '#0f172a' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Process Reservation Payment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Reservation ID: {payReservation.id.slice(0, 8)}...
            </p>

            {payMsg && (
              <div style={{ padding: '12px', background: payMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${payMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '10px', color: payMsg.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                {payMsg.text}
              </div>
            )}

            <form onSubmit={handleProcessPayment}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Due</span>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#34d399' }}>
                  ${Number(payReservation.totalPrice).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPayReservation(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={payLoading}>
                  {payLoading ? 'Processing...' : 'Pay with Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
