import React, { useEffect, useState } from 'react';
import type { Role, NavigationItemId } from '../../types/auth';
import {
  productsApi,
  reservationsApi,
  inventoryApi,
  dashboardApi,
} from '../../services/api';
import type { AdminStats } from '../../services/api';

interface DashboardOverviewProps {
  currentRole: Role;
  onNavigate: (page: NavigationItemId) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentRole,
  onNavigate,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isManager = currentRole === 'ADMIN' || currentRole === 'STAFF';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsData, resData, logsData, statsData] = await Promise.all([
        productsApi.getAll().catch(() => []),
        reservationsApi.getAll().catch(() => []),
        inventoryApi.getLogs().catch(() => []),
        // Aggregated KPIs are staff/admin-only; customers legitimately get 403 here.
        isManager ? dashboardApi.getStats().catch(() => null) : Promise.resolve(null),
      ]);
      setProducts(prodsData);
      setReservations(resData);
      setInventoryLogs(logsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load live backend data:', err);
      setError(err.message || 'Error connecting to backend API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentRole]);

  // Status handler for Approve / Reject actions
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await reservationsApi.updateStatus(id, newStatus);
      setActionSuccessMsg(`Reservation #${id.slice(0, 8)} updated to ${newStatus}`);
      fetchDashboardData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Calculations from Live Backend Data
  const activeReservations = reservations.filter((r) => r.status === 'ACTIVE');
  const pendingReservations = reservations.filter((r) => r.status === 'PENDING');
  const approvedReservations = reservations.filter((r) => r.status === 'APPROVED');
  const returnedReservations = reservations.filter((r) => r.status === 'RETURNED');

  const totalRevenue = reservations
    .filter((r) => r.status !== 'REJECTED' && r.status !== 'CANCELLED')
    .reduce((acc, curr) => acc + Number(curr.totalPrice || 0), 0);

  const totalStockCount = products.reduce((acc, p) => acc + Number(p.totalStock || 0), 0);
  const lowStockItems = products.filter((p) => Number(p.totalStock || 0) <= 3);

  if (loading) {
    return (
      <div className="dashboard-view animate-fade-in" style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px', margin: '0 auto 16px' }}></div>
        <p style={{ fontWeight: 600, fontSize: '14px' }}>Loading real-time equipment portal data from backend...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-view animate-fade-in">
      {/* Toast Notification Banner */}
      {actionSuccessMsg && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '20px',
          borderRadius: '16px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#059669',
          fontWeight: 600,
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>✅</span>
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '20px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#DC2626',
          fontSize: '13.5px',
        }}>
          ⚠️ Backend API Notice: {error}. Make sure NestJS backend is running at http://localhost:3000
        </div>
      )}

      {/* ── ADMIN DASHBOARD ─────────────────────────────────────────────── */}
      {currentRole === 'ADMIN' && (
        <div className="dashboard-grid">
          {/* KPI Stat Cards */}
          <div className="stats-row">
            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">TOTAL REVENUE</span>
                {/* Only render a trend when the API actually computed one (null = no prior period). */}
                {stats?.revenueChangePct != null && (
                  <span
                    className={`stat-trend ${stats.revenueChangePct >= 0 ? 'positive' : 'danger'}`}
                  >
                    {stats.revenueChangePct >= 0 ? '+' : ''}
                    {stats.revenueChangePct}%
                  </span>
                )}
              </div>
              <div className="stat-value">
                ${(stats?.totalRevenue ?? totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="stat-footer">Live earnings from reservations</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">TOTAL CUSTOMERS</span>
                <span className="stat-badge badge-info">Registered</span>
              </div>
              <div className="stat-value">{stats?.totalCustomers ?? '—'}</div>
              <div className="stat-footer">Accounts with the CUSTOMER role</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">ACTIVE RESERVATIONS</span>
                <span className="stat-badge badge-warning">
                  {stats?.activeReservations ?? activeReservations.length} Active
                </span>
              </div>
              <div className="stat-value">{stats?.activeReservations ?? activeReservations.length}</div>
              <div className="stat-footer">Items currently checked out</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">EQUIPMENT UTILISATION</span>
                <span className="stat-badge badge-info">
                  {stats ? `${stats.rentedUnits}/${stats.totalUnits} units` : '—'}
                </span>
              </div>
              <div className="stat-value">{stats ? `${stats.utilisationRate}%` : '—'}</div>
              <div className="stat-footer">Share of stock currently out on hire</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">EQUIPMENT CATALOG</span>
                <span className="stat-trend positive">{stats?.totalProducts ?? products.length} Products</span>
              </div>
              <div className="stat-value">{stats?.totalProducts ?? products.length}</div>
              <div className="stat-footer">
                Total SKUs in inventory ({stats?.totalUnits ?? totalStockCount} units)
              </div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">PENDING APPROVALS</span>
                <span className="stat-badge badge-danger">
                  {stats?.pendingApprovals ?? pendingReservations.length} Pending
                </span>
              </div>
              <div className="stat-value">{stats?.pendingApprovals ?? pendingReservations.length}</div>
              <div className="stat-footer">Awaiting staff review</div>
            </div>
          </div>

          {/* Most Rented Equipment & 14-Day Reservation Trends */}
          {stats && (
            <div className="dashboard-content-split">
              <div className="glass-panel">
                <div className="panel-header">
                  <h3>Most Rented Equipment</h3>
                  <button className="btn-link" onClick={() => onNavigate('equipment')}>
                    Catalog →
                  </button>
                </div>

                {stats.mostRented.length === 0 ? (
                  <div className="dash-empty">No rental history recorded yet.</div>
                ) : (
                  <ul className="ranking-list">
                    {stats.mostRented.map((item, i) => {
                      const top = stats.mostRented[0].unitsRented || 1;
                      return (
                        <li className="ranking-row" key={item.productId}>
                          <span className="ranking-position">{i + 1}</span>
                          <div className="ranking-body">
                            <div className="ranking-head">
                              <span className="ranking-name">{item.name}</span>
                              <span className="ranking-count">
                                {item.unitsRented} {item.unitsRented === 1 ? 'unit' : 'units'}
                              </span>
                            </div>
                            <div className="ranking-bar-track">
                              <div
                                className="ranking-bar-fill"
                                style={{ width: `${(item.unitsRented / top) * 100}%` }}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="glass-panel">
                <div className="panel-header">
                  <h3>Reservation Trends</h3>
                  <span className="panel-hint">Last 14 days</span>
                </div>

                {stats.trends.every((t) => t.count === 0) ? (
                  <div className="dash-empty">No reservations created in the last 14 days.</div>
                ) : (
                  <div className="trend-chart">
                    {stats.trends.map((t) => {
                      const peak = Math.max(...stats.trends.map((x) => x.count), 1);
                      return (
                        <div className="trend-col" key={t.date}>
                          <div
                            className="trend-bar"
                            style={{ height: `${Math.max((t.count / peak) * 100, 3)}%` }}
                            title={`${t.date}: ${t.count} reservation(s), $${t.revenue.toFixed(2)}`}
                          />
                          <span className="trend-label">{t.date.slice(8)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Action Tables Grid */}
          <div className="dashboard-content-split">
            {/* Pending Approvals Widget */}
            <div className="glass-panel">
              <div className="panel-header">
                <h3>Pending Reservation Approvals</h3>
                <button
                  className="btn-link"
                  onClick={() => onNavigate('reservations')}
                >
                  View All ({pendingReservations.length}) →
                </button>
              </div>

              <div className="table-responsive">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Reservation ID</th>
                      <th>Customer</th>
                      <th>Rental Period</th>
                      <th>Total Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReservations.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#64748B', padding: '24px' }}>
                          No pending reservation approvals at this moment.
                        </td>
                      </tr>
                    ) : (
                      pendingReservations.map((res) => (
                        <tr key={res.id}>
                          <td><span className="id-code">#{res.id.slice(0, 8).toUpperCase()}</span></td>
                          <td>{res.user?.name || res.user?.email || 'Customer'}</td>
                          <td>
                            {new Date(res.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                            {new Date(res.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ fontWeight: 600 }}>${Number(res.totalPrice).toFixed(2)}</td>
                          <td>
                            <div className="table-action-btns">
                              <button
                                className="btn-table-approve"
                                onClick={() => handleUpdateStatus(res.id, 'APPROVED')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-table-reject"
                                onClick={() => handleUpdateStatus(res.id, 'REJECTED')}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Alerts & Activity Widget */}
            <div className="glass-panel">
              <div className="panel-header">
                <h3>Critical Inventory Alerts</h3>
                <button
                  className="btn-link"
                  onClick={() => onNavigate('inventory')}
                >
                  Stock Logs →
                </button>
              </div>

              <div className="inventory-alerts-list">
                {lowStockItems.length > 0 ? (
                  lowStockItems.slice(0, 3).map((item) => (
                    <div className="alert-card danger" key={item.id}>
                      <div className="alert-icon">⚠️</div>
                      <div className="alert-details">
                        <span className="alert-title">Low Stock: {item.name}</span>
                        <span className="alert-sub">Only {item.totalStock} units total in warehouse</span>
                      </div>
                      <button
                        className="btn-small-glass"
                        onClick={() => onNavigate('inventory')}
                      >
                        Restock
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="alert-card info">
                    <div className="alert-icon">✅</div>
                    <div className="alert-details">
                      <span className="alert-title">Stock Levels Optimal</span>
                      <span className="alert-sub">All equipment items have adequate stock quantity</span>
                    </div>
                  </div>
                )}

                {inventoryLogs.slice(0, 2).map((log) => (
                  <div className="alert-card info" key={log.id}>
                    <div className="alert-icon">📦</div>
                    <div className="alert-details">
                      <span className="alert-title">{log.action}: {log.product?.name || 'Equipment'}</span>
                      <span className="alert-sub">{log.notes || `Quantity change: ${log.quantity}`}</span>
                    </div>
                    <span className="time-tag">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF DASHBOARD ─────────────────────────────────────────────── */}
      {currentRole === 'STAFF' && (
        <div className="dashboard-grid">
          <div className="stats-row">
            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">PENDING APPROVALS</span>
                <span className="stat-badge badge-warning">{pendingReservations.length} Action Needed</span>
              </div>
              <div className="stat-value">{pendingReservations.length}</div>
              <div className="stat-footer">Awaiting staff verification</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">SCHEDULED PICKUPS</span>
                <span className="stat-badge badge-info">{approvedReservations.length} Approved</span>
              </div>
              <div className="stat-value">{approvedReservations.length}</div>
              <div className="stat-footer">Ready for customer check-out</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">EXPECTED RETURNS</span>
                <span className="stat-badge badge-success">{activeReservations.length} Active</span>
              </div>
              <div className="stat-value">{activeReservations.length}</div>
              <div className="stat-footer">Currently checked out to users</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">COMPLETED RENTALS</span>
                <span className="stat-badge badge-info">{returnedReservations.length} Returned</span>
              </div>
              <div className="stat-value">{returnedReservations.length}</div>
              <div className="stat-footer">Items checked back in</div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <h3>Staff Quick Actions — Pending Reservations</h3>
              <button
                className="btn-link"
                onClick={() => onNavigate('reservations')}
              >
                Go to Reservations →
              </button>
            </div>

            <div className="table-responsive">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Reservation ID</th>
                    <th>Rental Dates</th>
                    <th>Total Price</th>
                    <th>Quick Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#64748B', padding: '24px' }}>
                        No pending reservation requests awaiting review.
                      </td>
                    </tr>
                  ) : (
                    pendingReservations.map((res) => (
                      <tr key={res.id}>
                        <td style={{ fontWeight: 600 }}>{res.user?.name || res.user?.email || 'Customer'}</td>
                        <td><span className="id-code">#{res.id.slice(0, 8).toUpperCase()}</span></td>
                        <td>
                          {new Date(res.startDate).toLocaleDateString()} - {new Date(res.endDate).toLocaleDateString()}
                        </td>
                        <td>${Number(res.totalPrice).toFixed(2)}</td>
                        <td>
                          <div className="table-action-btns">
                            <button
                              className="btn-table-approve"
                              onClick={() => handleUpdateStatus(res.id, 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-table-reject"
                              onClick={() => handleUpdateStatus(res.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── WAREHOUSE OPERATOR DASHBOARD ─────────────────────────────────── */}
      {currentRole === 'WAREHOUSE_OPERATOR' && (
        <div className="dashboard-grid">
          <div className="stats-row">
            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">OUTGOING DISPATCHES</span>
                <span className="stat-badge badge-info">{approvedReservations.length} Approved</span>
              </div>
              <div className="stat-value">{approvedReservations.length} Orders</div>
              <div className="stat-footer">Ready for customer pickup</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">ACTIVE IN FIELD</span>
                <span className="stat-badge badge-warning">{activeReservations.length} Active</span>
              </div>
              <div className="stat-value">{activeReservations.length} Rentals</div>
              <div className="stat-footer">Currently checked out</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">INVENTORY LOGS</span>
                <span className="stat-badge badge-success">{inventoryLogs.length} Logged</span>
              </div>
              <div className="stat-value">{inventoryLogs.length} Actions</div>
              <div className="stat-footer">Warehouse transactions recorded</div>
            </div>
          </div>

          <div className="dashboard-content-split">
            <div className="glass-panel">
              <div className="panel-header">
                <h3>Warehouse Operations — Quick Action Hub</h3>
                <button
                  className="btn-link"
                  onClick={() => onNavigate('inventory')}
                >
                  Inventory Logs →
                </button>
              </div>

              <div className="warehouse-action-cards">
                <button
                  className="wh-action-tile glass-interactive-btn"
                  onClick={() => onNavigate('inventory')}
                >
                  <span className="tile-icon">📥</span>
                  <span className="tile-title">Receive Equipment</span>
                  <span className="tile-desc">Check-in returned gear & perform inspection</span>
                </button>

                <button
                  className="wh-action-tile glass-interactive-btn"
                  onClick={() => onNavigate('inventory')}
                >
                  <span className="tile-icon">📤</span>
                  <span className="tile-title">Release Equipment</span>
                  <span className="tile-desc">Hand over reserved items to customer</span>
                </button>

                <button
                  className="wh-action-tile glass-interactive-btn"
                  onClick={() => onNavigate('inventory')}
                >
                  <span className="tile-icon">⚠️</span>
                  <span className="tile-title">Record Damage</span>
                  <span className="tile-desc">Log damaged condition or missing parts</span>
                </button>

                <button
                  className="wh-action-tile glass-interactive-btn"
                  onClick={() => onNavigate('inventory')}
                >
                  <span className="tile-icon">🛠️</span>
                  <span className="tile-title">Schedule Maintenance</span>
                  <span className="tile-desc">Send equipment for repair or service</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER DASHBOARD ──────────────────────────────────────────── */}
      {currentRole === 'CUSTOMER' && (
        <div className="dashboard-grid">
          <div className="customer-welcome-banner liquid-glass-panel">
            <div className="welcome-text">
              <h2>Welcome to AmmuNation Equipment Portal! 👋</h2>
              <p>Borrow heavy equipment, power tools & cameras with instant reservation approval.</p>
            </div>
            <button
              className="btn-primary-glass"
              onClick={() => onNavigate('equipment')}
            >
              Browse Equipment Catalog ({products.length} Items) →
            </button>
          </div>

          <div className="stats-row">
            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">MY ACTIVE RENTALS</span>
                <span className="stat-badge badge-success">{activeReservations.length} Active</span>
              </div>
              <div className="stat-value">{activeReservations.length} Items</div>
              <div className="stat-footer">Currently checked out</div>
            </div>

            <div className="glass-stat-card">
              <div className="stat-header">
                <span className="stat-label">MY TOTAL BOOKINGS</span>
                <span className="stat-trend positive">History</span>
              </div>
              <div className="stat-value">{reservations.length} Total</div>
              <div className="stat-footer">Reservations made</div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <h3>My Equipment Reservations</h3>
              <button
                className="btn-link"
                onClick={() => onNavigate('reservations')}
              >
                View All My Bookings →
              </button>
            </div>

            <div className="table-responsive">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Reservation ID</th>
                    <th>Rental Dates</th>
                    <th>Total Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#64748B', padding: '24px' }}>
                        You have no active or previous reservations yet. Browse equipment to create your first booking!
                      </td>
                    </tr>
                  ) : (
                    reservations.map((res) => (
                      <tr key={res.id}>
                        <td><span className="id-code">#{res.id.slice(0, 8).toUpperCase()}</span></td>
                        <td>
                          {new Date(res.startDate).toLocaleDateString()} - {new Date(res.endDate).toLocaleDateString()}
                        </td>
                        <td style={{ fontWeight: 600 }}>${Number(res.totalPrice).toFixed(2)}</td>
                        <td>
                          <span className={`status-tag ${
                            res.status === 'ACTIVE' || res.status === 'APPROVED' ? 'success' : 'warning'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
