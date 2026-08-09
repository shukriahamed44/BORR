/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Directory & Document Verification page. Lists accounts from `GET /api/v1/users`
 * with role facets, search and activity aggregates, and opens a profile drawer sourced from
 * `GET /api/v1/users/:id` exposing reservation history and submitted documents. Staff resolve
 * identity verification through `PATCH /api/v1/uploads/:id/review`.
 *
 * IN SIMPLE WORDS:
 * The staff screen for looking up customers — how many bookings they have made, what they have
 * spent, and whether their ID paperwork checks out. Staff open a customer to read their
 * documents and approve or reject them.
 */

import React, { useCallback, useEffect, useState } from 'react';
import './CustomersPage.css';
import { EmptyState, Pagination, RefCode, SearchInput, TabBar, Toasts } from '../ui';
import type { Role } from '../../types/auth';
import {
  usersApi,
  uploadsApi,
  type DirectoryUser,
  type UserProfileDetail,
  type VerificationStatus,
} from '../../services/api';

interface CustomersPageProps {
  currentRole: Role;
}

const PAGE_SIZE = 10;

const ROLE_TABS: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All accounts' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'WAREHOUSE_OPERATOR', label: 'Warehouse' },
  { value: 'ADMIN', label: 'Admins' },
];

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  VERIFIED: 'Verified',
  PENDING_REVIEW: 'Awaiting review',
  UNVERIFIED: 'No documents',
};

const DOC_LABEL: Record<string, string> = {
  IDENTITY_DOCUMENT: 'Identity Document',
  RENTAL_AGREEMENT: 'Rental Agreement',
  EQUIPMENT_IMAGE: 'Equipment Image',
};

const money = (v: number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const roleBadgeClass = (role: Role) =>
  role === 'WAREHOUSE_OPERATOR' ? 'warehouse' : role.toLowerCase();

export const CustomersPage: React.FC<CustomersPageProps> = () => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [roleTab, setRoleTab] = useState<Role | 'ALL'>('CUSTOMER');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list({
        role: roleTab === 'ALL' ? undefined : roleTab,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setUsers(data.users);
      setRoleCounts(data.roleCounts ?? {});
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Could not load the customer directory.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleTab, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const tabCount = (value: Role | 'ALL') =>
    value === 'ALL'
      ? Object.values(roleCounts).reduce((a, b) => a + b, 0)
      : roleCounts[value] ?? 0;

  const pendingDocsTotal = users.reduce((sum, u) => sum + u.documents.pending, 0);

  return (
    <div className="customers-page animate-fade-in">
      <Toasts message={msg} error={error} />

      <div className="cust-summary">
        <div className="cust-stat glass-panel">
          <span className="cust-stat-label">Accounts shown</span>
          <span className="cust-stat-value">{total}</span>
        </div>
        <div className="cust-stat glass-panel">
          <span className="cust-stat-label">Total customers</span>
          <span className="cust-stat-value">{roleCounts.CUSTOMER ?? 0}</span>
        </div>
        <div className="cust-stat glass-panel">
          <span className="cust-stat-label">Docs awaiting review</span>
          <span className={`cust-stat-value ${pendingDocsTotal > 0 ? 'warn' : ''}`}>
            {pendingDocsTotal}
          </span>
        </div>
      </div>

      <TabBar
        tabs={ROLE_TABS}
        active={roleTab}
        onSelect={(value) => {
          setRoleTab(value);
          setPage(1);
        }}
        count={tabCount}
      />

      <SearchInput
        className="cust-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Search by name or email…"
      />

      <div className="results-meta">
        {loading ? 'Loading accounts…' : `${total} account${total === 1 ? '' : 's'}`}
      </div>

      {!loading && users.length === 0 ? (
        <EmptyState panel>No accounts match this view.</EmptyState>
      ) : (
        <div className="glass-panel cust-panel">
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Reservations</th>
                  <th>Total spend</th>
                  <th>Verification</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cust-identity">
                        <span className="cust-avatar">{u.name.charAt(0).toUpperCase()}</span>
                        <div className="cust-identity-text">
                          <span className="cust-name">{u.name}</span>
                          <span className="cust-email">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-pill role-badge-${roleBadgeClass(u.role)}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{u.reservationCount}</td>
                    <td className="amount-cell">${money(u.totalSpend)}</td>
                    <td>
                      <span className={`verify-chip verify-${u.verificationStatus.toLowerCase()}`}>
                        {VERIFICATION_LABEL[u.verificationStatus]}
                      </span>
                      {u.documents.pending > 0 && (
                        <span className="verify-sub">{u.documents.pending} pending</span>
                      )}
                    </td>
                    <td className="date-cell">{shortDate(u.createdAt)}</td>
                    <td>
                      <button className="btn-small-glass" onClick={() => setSelectedId(u.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {selectedId && (
        <CustomerDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onError={setError}
          onFlash={(t) => {
            flash(t);
            load();
          }}
        />
      )}
    </div>
  );
};

/* ── Customer profile drawer ────────────────────────────────────────────── */

const CustomerDrawer: React.FC<{
  userId: string;
  onClose: () => void;
  onError: (msg: string) => void;
  onFlash: (msg: string) => void;
}> = ({ userId, onClose, onError, onFlash }) => {
  const [profile, setProfile] = useState<UserProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await usersApi.getById(userId));
    } catch (err: any) {
      onError(err.message || 'Could not load the account profile.');
    } finally {
      setLoading(false);
    }
  }, [userId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, status: 'VERIFIED' | 'REJECTED', note?: string) => {
    try {
      await uploadsApi.review(id, status, note);
      onFlash(`Document ${status === 'VERIFIED' ? 'verified' : 'rejected'}.`);
      setRejecting(null);
      setRejectNote('');
      load();
    } catch (err: any) {
      onError(err.message || 'Review failed.');
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="res-drawer cust-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <div className="cust-drawer-head">
            <span className="cust-avatar large">
              {profile?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div>
              <div className="cust-drawer-name">{profile?.name ?? 'Loading…'}</div>
              <div className="cust-drawer-email">{profile?.email}</div>
            </div>
          </div>
          <button className="auth-close-btn drawer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          {loading || !profile ? (
            <div className="dash-empty">Loading profile…</div>
          ) : (
            <>
              <section className="drawer-section">
                <h4 className="drawer-section-title">Account</h4>
                <dl className="drawer-grid">
                  <div>
                    <dt>Role</dt>
                    <dd>
                      <span className={`role-pill role-badge-${roleBadgeClass(profile.role)}`}>
                        {profile.role.replace('_', ' ')}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{shortDate(profile.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{profile.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt>Total spend</dt>
                    <dd className="strong">${money(profile.stats.totalSpend)}</dd>
                  </div>
                  <div>
                    <dt>Reservations</dt>
                    <dd>{profile.stats.reservationCount}</dd>
                  </div>
                  <div>
                    <dt>Active now</dt>
                    <dd>{profile.stats.activeReservations}</dd>
                  </div>
                </dl>
              </section>

              <section className="drawer-section">
                <h4 className="drawer-section-title">
                  Identity Documents
                  {profile.stats.pendingDocuments > 0 && (
                    <span className="section-badge">{profile.stats.pendingDocuments} pending</span>
                  )}
                </h4>

                {profile.uploads.length === 0 ? (
                  <p className="drawer-empty">This account has not submitted any documents.</p>
                ) : (
                  <ul className="doc-list">
                    {profile.uploads.map((d) => (
                      <li className="doc-row" key={d.id}>
                        <div className="doc-info">
                          <span className="doc-name">{DOC_LABEL[d.type] ?? d.type}</span>
                          <span className="doc-meta">
                            {d.originalName} · {(d.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                            {shortDate(d.createdAt)}
                          </span>
                          {d.status === 'REJECTED' && d.rejectionNote && (
                            <span className="doc-note">{d.rejectionNote}</span>
                          )}
                        </div>

                        <span className={`doc-status doc-${d.status.toLowerCase()}`}>
                          {d.status.replace('_', ' ')}
                        </span>

                        <div className="doc-actions">
                          <button
                            className="btn-small-glass"
                            onClick={() => uploadsApi.open(d.id).catch((e) => onError(e.message))}
                          >
                            Open
                          </button>
                          {d.status === 'PENDING_REVIEW' && (
                            <>
                              <button
                                className="btn-table-approve"
                                onClick={() => review(d.id, 'VERIFIED')}
                              >
                                Verify
                              </button>
                              <button
                                className="btn-table-reject"
                                onClick={() => setRejecting(d.id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>

                        {rejecting === d.id && (
                          <div className="doc-reject-row">
                            <input
                              className="doc-reject-input"
                              placeholder="Reason shown to the customer…"
                              value={rejectNote}
                              maxLength={500}
                              onChange={(e) => setRejectNote(e.target.value)}
                            />
                            <button
                              className="btn-table-reject"
                              onClick={() => review(d.id, 'REJECTED', rejectNote.trim() || undefined)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn-small-glass"
                              onClick={() => {
                                setRejecting(null);
                                setRejectNote('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="drawer-section">
                <h4 className="drawer-section-title">Reservation History</h4>
                {profile.reservations.length === 0 ? (
                  <p className="drawer-empty">No reservations yet.</p>
                ) : (
                  <ul className="cust-res-list">
                    {profile.reservations.map((r: any) => (
                      <li className="cust-res-row" key={r.id}>
                        <div className="cust-res-main">
                          <RefCode id={r.id} />
                          <span className={`status-pill status-${r.status.toLowerCase()}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="cust-res-meta">
                          {shortDate(r.startDate)} → {shortDate(r.endDate)} ·{' '}
                          {r.items?.length ?? 0} item{(r.items?.length ?? 0) === 1 ? '' : 's'}
                        </div>
                        <div className="cust-res-amount">${money(Number(r.totalPrice))}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
