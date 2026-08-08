import React, { useEffect, useState } from 'react';
import type { Role } from '../../types/auth';
import { inventoryApi, productsApi } from '../../services/api';

interface InventoryPageProps {
  currentRole: Role;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ currentRole }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Modal Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [action, setAction] = useState<string>('RECEIVE');
  const [quantity, setQuantity] = useState<string>('5');
  const [notes, setNotes] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, prodsData] = await Promise.all([
        inventoryApi.getLogs(),
        productsApi.getAll(),
      ]);
      setLogs(logsData);
      setProducts(prodsData);
      if (prodsData.length > 0) setSelectedProductId(prodsData[0].id);
    } catch (err: any) {
      console.error('Failed to load inventory logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createLog({
        productId: selectedProductId,
        action,
        quantity: parseInt(quantity, 10),
        notes,
      });
      setMsg(`Inventory action ${action} recorded successfully!`);
      setIsLogModalOpen(false);
      setNotes('');
      fetchData();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to record log: ${err.message}`);
    }
  };

  return (
    <div className="inventory-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-body)' }}>
            📦 Warehouse Inventory & Stock Audit Logs
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Real-time stock movement, receives, releases, damage records, and maintenance logs
          </p>
        </div>

        {(currentRole === 'WAREHOUSE_OPERATOR' || currentRole === 'STAFF' || currentRole === 'ADMIN') && (
          <button
            onClick={() => setIsLogModalOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            + Record Inventory Action
          </button>
        )}
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

      {/* Audit Log Table */}
      <div className="glass-panel">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Log Timestamp</th>
                <th>Equipment Product</th>
                <th>Action Type</th>
                <th>Stock Quantity Change</th>
                <th>Operator</th>
                <th>Notes / Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Loading warehouse logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    No inventory logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{log.product?.name || 'Equipment'}</td>
                    <td>
                      <span className={`status-tag ${
                        log.action === 'RECEIVE' ? 'success' : log.action === 'RELEASE' ? 'info' : 'danger'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{
                      fontWeight: 700,
                      color: log.quantity > 0 ? '#059669' : '#DC2626',
                    }}>
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </td>
                    <td>{log.operator?.name || log.operator?.email || 'Warehouse Staff'}</td>
                    <td style={{ fontSize: '12.5px', color: '#64748B' }}>{log.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Action Modal */}
      {isLogModalOpen && (
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
          <div className="glass-panel" style={{ width: '450px', background: '#FFFFFF', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Record Warehouse Action</h3>
            <form onSubmit={handleCreateLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Select Equipment Item</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Current Stock: {p.totalStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Action Type</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                >
                  <option value="RECEIVE">RECEIVE (Add new shipment stock)</option>
                  <option value="RELEASE">RELEASE (Dispatch equipment to customer)</option>
                  <option value="DAMAGE_RECORDED">DAMAGE_RECORDED (Quarantine damaged unit)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Send for repair/service)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Audit Notes / Inspection Details</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received shipment batch #104..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
