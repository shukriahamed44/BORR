import React, { useEffect, useState } from 'react';
import type { Role } from '../../types/auth';
import { reservationsApi, paymentsApi } from '../../services/api';

interface PaymentsPageProps {
  currentRole: Role;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ currentRole }) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRes, setSelectedRes] = useState<any | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const data = await reservationsApi.getAll();
      setReservations(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleProcessPayment = async () => {
    if (!selectedRes) return;
    try {
      await paymentsApi.processPayment({
        reservationId: selectedRes.id,
        amount: Number(selectedRes.totalPrice),
        paymentMethod: 'CREDIT_CARD',
      });
      setMsg(`Payment of $${Number(selectedRes.totalPrice).toFixed(2)} processed successfully for #${selectedRes.id.slice(0, 8)}!`);
      setIsPayModalOpen(false);
      fetchReservations();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    }
  };

  const totalCollected = reservations
    .filter((r) => r.payments?.some((p: any) => p.status === 'PAID'))
    .reduce((acc, curr) => acc + Number(curr.totalPrice || 0), 0);

  return (
    <div className="payments-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-body)' }}>
            💳 Payments & Financial Transactions Ledger
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Process mock payments, receipts, deposits & refund management
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="role-pill role-badge-admin">{currentRole} VIEW</span>
          <div style={{ padding: '10px 20px', borderRadius: '16px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#2563EB', fontWeight: 700 }}>
            Total Paid Volume: ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '16px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#059669',
          fontWeight: 600,
          fontSize: '13.5px',
        }}>
          ✅ {msg}
        </div>
      )}

      <div className="glass-panel">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>Customer</th>
                <th>Total Rental Amount</th>
                <th>Payment Status</th>
                <th>Transaction ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Loading payment records...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => {
                  const payment = res.payments?.[0];
                  const isPaid = payment?.status === 'PAID';

                  return (
                    <tr key={res.id}>
                      <td><span className="id-code">#{res.id.slice(0, 8).toUpperCase()}</span></td>
                      <td style={{ fontWeight: 600 }}>{res.user?.name || res.user?.email || 'Customer'}</td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>${Number(res.totalPrice).toFixed(2)}</td>
                      <td>
                        <span className={`status-tag ${isPaid ? 'success' : 'warning'}`}>
                          {payment?.status || 'PENDING'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748B' }}>
                        {payment?.transactionId || 'N/A'}
                      </td>
                      <td>
                        {!isPaid ? (
                          <button
                            onClick={() => {
                              setSelectedRes(res);
                              setIsPayModalOpen(true);
                            }}
                            className="btn-table-approve"
                            style={{ background: '#2563EB', borderColor: '#2563EB', color: '#FFF' }}
                          >
                            Process Payment
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Paid & Verified</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Payment Modal */}
      {isPayModalOpen && selectedRes && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="glass-panel" style={{ width: '400px', background: '#FFFFFF', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Process Mock Payment</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Reservation #{selectedRes.id.slice(0, 8).toUpperCase()} — {selectedRes.user?.name}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>TOTAL AMOUNT DUE</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB' }}>
                  ${Number(selectedRes.totalPrice).toFixed(2)}
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Mock Card Details</label>
                <input
                  type="text"
                  disabled
                  value="4242 •••• •••• 4242 (Mock Stripe Visa)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F1F5F9', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPayment}
                  style={{ padding: '8px 20px', borderRadius: '8px', background: '#059669', color: '#FFF', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Confirm & Charge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
