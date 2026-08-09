/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Reservations page component. Presents the rental lifecycle as status-filtered tabs backed by
 * `GET /api/v1/reservations`, with a detail drawer exposing line items, rental period, totals,
 * payment state and attached documents. Staff and administrators drive the status state machine
 * (approve / reject with reason / check out / check in); customers may cancel a pending request
 * and upload the identity document and rental agreement required for approval.
 *
 * IN SIMPLE WORDS:
 * The bookings page. Staff review requests and move them through approval, hand-over and return.
 * Customers see their own bookings, can cancel one that is still pending, and upload the
 * paperwork needed before staff approve it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import './ReservationsPage.css';
import { EmptyState, Pagination, SearchInput, TabBar, Toasts } from '../ui';
import type { Role } from '../../types/auth';
import {
  reservationsApi,
  uploadsApi,
  type ReservationStatus,
  type UploadRecord,
  type UploadType,
} from '../../services/api';

interface ReservationsPageProps {
  currentRole: Role;
}

const PAGE_SIZE = 8;

const TABS: { value: ReservationStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/**
 * Transitions the UI offers, mirroring the server-side state machine in
 * ReservationsService.validateStatusTransition. The server remains the authority;
 * this only avoids presenting buttons that would be rejected.
 */
const STAFF_ACTIONS: Partial<
  Record<ReservationStatus, { to: ReservationStatus; label: string; tone: string }[]>
> = {
  PENDING: [
    { to: 'APPROVED', label: 'Approve', tone: 'approve' },
    { to: 'REJECTED', label: 'Reject', tone: 'reject' },
  ],
  APPROVED: [
    { to: 'ACTIVE', label: 'Hand Over', tone: 'approve' },
    { to: 'CANCELLED', label: 'Cancel', tone: 'reject' },
  ],
  ACTIVE: [{ to: 'RETURNED', label: 'Mark Returned', tone: 'approve' }],
};

const money = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const DOC_LABEL: Record<UploadType, string> = {
  IDENTITY_DOCUMENT: 'Identity Document',
  RENTAL_AGREEMENT: 'Rental Agreement',
  EQUIPMENT_IMAGE: 'Equipment Image',
};

export const ReservationsPage: React.FC<ReservationsPageProps> = ({ currentRole }) => {
  const isStaff = currentRole === 'ADMIN' || currentRole === 'STAFF';
  const isCustomer = currentRole === 'CUSTOMER';

  const [reservations, setReservations] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<ReservationStatus | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reservationsApi.list({
        status: tab === 'ALL' ? undefined : tab,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setReservations(data.reservations);
      setStatusCounts(data.statusCounts ?? {});
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Could not load reservations.');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search, page]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const updateStatus = async (
    reservation: any,
    status: ReservationStatus,
    rejectionReason?: string,
  ) => {
    try {
      await reservationsApi.updateStatus(reservation.id, status, rejectionReason);
      flash(`Reservation #${reservation.id.slice(0, 8).toUpperCase()} → ${status}`);
      setDetail(null);
      setRejecting(null);
      fetchReservations();
    } catch (err: any) {
      setError(err.message || 'Status update failed.');
    }
  };

  const totalForTab = (value: ReservationStatus | 'ALL') =>
    value === 'ALL'
      ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
      : statusCounts[value] ?? 0;

  return (
    <div className="reservations-page animate-fade-in">
      <Toasts message={msg} error={error} />

      {/* Status tabs */}
      <TabBar
        tabs={TABS}
        active={tab}
        onSelect={(value) => {
          setTab(value);
          setPage(1);
        }}
        count={totalForTab}
      />

      {isStaff && (
        <SearchInput
          className="res-search"
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by reservation id, customer name or email…"
        />
      )}

      <div className="results-meta">
        {loading ? 'Loading reservations…' : `${total} reservation${total === 1 ? '' : 's'}`}
      </div>

      {!loading && reservations.length === 0 ? (
        <EmptyState panel>No reservations in this view.</EmptyState>
      ) : (
        <div className="res-list">
          {reservations.map((r) => {
            const actions = STAFF_ACTIONS[r.status as ReservationStatus] ?? [];
            return (
              <article className="res-card glass-panel" key={r.id}>
                <div className="res-card-main" onClick={() => setDetail(r)}>
                  <div className="res-card-head">
                    <span className="id-code">#{r.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`status-pill status-${r.status.toLowerCase()}`}>{r.status}</span>
                  </div>

                  <div className="res-card-body">
                    {isStaff && (
                      <div className="res-field">
                        <span className="res-field-label">Customer</span>
                        <span className="res-field-value">{r.user?.name ?? '—'}</span>
                      </div>
                    )}
                    <div className="res-field">
                      <span className="res-field-label">Rental period</span>
                      <span className="res-field-value">
                        {shortDate(r.startDate)} → {shortDate(r.endDate)}
                      </span>
                    </div>
                    <div className="res-field">
                      <span className="res-field-label">Items</span>
                      <span className="res-field-value">{r.items?.length ?? 0}</span>
                    </div>
                    <div className="res-field">
                      <span className="res-field-label">Total</span>
                      <span className="res-field-value strong">${money(r.totalPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="res-card-actions">
                  <button className="btn-small-glass" onClick={() => setDetail(r)}>
                    Details
                  </button>

                  {isStaff &&
                    actions.map((a) => (
                      <button
                        key={a.to}
                        className={a.tone === 'approve' ? 'btn-table-approve' : 'btn-table-reject'}
                        onClick={() =>
                          a.to === 'REJECTED' ? setRejecting(r) : updateStatus(r, a.to)
                        }
                      >
                        {a.label}
                      </button>
                    ))}

                  {isCustomer && r.status === 'PENDING' && (
                    <button className="btn-table-reject" onClick={() => updateStatus(r, 'CANCELLED')}>
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {detail && (
        <ReservationDrawer
          reservation={detail}
          currentRole={currentRole}
          onClose={() => setDetail(null)}
          onAction={(status) =>
            status === 'REJECTED' ? setRejecting(detail) : updateStatus(detail, status)
          }
          onError={setError}
          onFlash={flash}
        />
      )}

      {rejecting && (
        <RejectModal
          reservation={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => updateStatus(rejecting, 'REJECTED', reason)}
        />
      )}
    </div>
  );
};

/* ── Detail drawer ──────────────────────────────────────────────────────── */

const ReservationDrawer: React.FC<{
  reservation: any;
  currentRole: Role;
  onClose: () => void;
  onAction: (status: ReservationStatus) => void;
  onError: (msg: string) => void;
  onFlash: (msg: string) => void;
}> = ({ reservation, currentRole, onClose, onAction, onError, onFlash }) => {
  const isStaff = currentRole === 'ADMIN' || currentRole === 'STAFF';
  const isCustomer = currentRole === 'CUSTOMER';
  const actions = STAFF_ACTIONS[reservation.status as ReservationStatus] ?? [];

  const [docs, setDocs] = useState<UploadRecord[]>(reservation.uploads ?? []);
  const [uploading, setUploading] = useState<UploadType | null>(null);

  const refreshDocs = useCallback(async () => {
    try {
      setDocs(await uploadsApi.list({ reservationId: reservation.id }));
    } catch {
      /* leave the previously rendered list in place */
    }
  }, [reservation.id]);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  const handleFile = async (type: UploadType, file: File | undefined) => {
    if (!file) return;
    setUploading(type);
    try {
      await uploadsApi.upload(file, type, reservation.id);
      onFlash(`${DOC_LABEL[type]} uploaded — awaiting staff review.`);
      refreshDocs();
    } catch (err: any) {
      onError(err.message || 'Upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const review = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await uploadsApi.review(id, status);
      onFlash(`Document ${status.toLowerCase()}.`);
      refreshDocs();
    } catch (err: any) {
      onError(err.message || 'Review failed.');
    }
  };

  const days =
    Math.round(
      (new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime()) /
        86_400_000,
    ) + 1;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="res-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <span className="id-code">#{reservation.id.slice(0, 8).toUpperCase()}</span>
            <span className={`status-pill status-${reservation.status.toLowerCase()}`}>
              {reservation.status}
            </span>
          </div>
          <button className="auth-close-btn drawer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          {reservation.status === 'REJECTED' && reservation.rejectionReason && (
            <div className="drawer-alert">
              <strong>Rejected:</strong> {reservation.rejectionReason}
            </div>
          )}

          <section className="drawer-section">
            <h4 className="drawer-section-title">Rental</h4>
            <dl className="drawer-grid">
              {isStaff && (
                <div>
                  <dt>Customer</dt>
                  <dd>
                    {reservation.user?.name}
                    <span className="drawer-sub">{reservation.user?.email}</span>
                  </dd>
                </div>
              )}
              <div>
                <dt>Pickup</dt>
                <dd>{shortDate(reservation.startDate)}</dd>
              </div>
              <div>
                <dt>Return</dt>
                <dd>{shortDate(reservation.endDate)}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{days} day{days === 1 ? '' : 's'}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd className="strong">${money(reservation.totalPrice)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  {reservation.payments?.length
                    ? reservation.payments[reservation.payments.length - 1].status
                    : 'No payment recorded'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="drawer-section">
            <h4 className="drawer-section-title">Equipment</h4>
            <ul className="drawer-items">
              {(reservation.items ?? []).map((item: any) => (
                <li key={item.id}>
                  <span className="drawer-item-name">{item.product?.name ?? 'Equipment'}</span>
                  <span className="drawer-item-meta">
                    ×{item.quantity} · ${money(item.unitPrice)}/day
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="drawer-section">
            <h4 className="drawer-section-title">Documents</h4>

            {docs.length === 0 && <p className="drawer-empty">No documents attached yet.</p>}

            <ul className="doc-list">
              {docs.map((d) => (
                <li className="doc-row" key={d.id}>
                  <div className="doc-info">
                    <span className="doc-name">{DOC_LABEL[d.type]}</span>
                    <span className="doc-meta">
                      {d.originalName} · {(d.sizeBytes / 1024).toFixed(0)} KB
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
                      onClick={() =>
                        uploadsApi.open(d.id).catch((e) => onError(e.message))
                      }
                    >
                      Open
                    </button>
                    {isStaff && d.status === 'PENDING_REVIEW' && (
                      <>
                        <button className="btn-table-approve" onClick={() => review(d.id, 'VERIFIED')}>
                          Verify
                        </button>
                        <button className="btn-table-reject" onClick={() => review(d.id, 'REJECTED')}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {isCustomer && (
              <div className="doc-upload-row">
                {(['IDENTITY_DOCUMENT', 'RENTAL_AGREEMENT'] as UploadType[]).map((type) => (
                  <label className="doc-upload-btn" key={type}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      hidden
                      onChange={(e) => handleFile(type, e.target.files?.[0])}
                    />
                    {uploading === type ? 'Uploading…' : `Upload ${DOC_LABEL[type]}`}
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        {(isStaff && actions.length > 0) ||
        (isCustomer && reservation.status === 'PENDING') ? (
          <footer className="drawer-footer">
            {isStaff &&
              actions.map((a) => (
                <button
                  key={a.to}
                  className={a.tone === 'approve' ? 'btn-table-approve' : 'btn-table-reject'}
                  onClick={() => onAction(a.to)}
                >
                  {a.label}
                </button>
              ))}
            {isCustomer && reservation.status === 'PENDING' && (
              <button className="btn-table-reject" onClick={() => onAction('CANCELLED')}>
                Cancel Reservation
              </button>
            )}
          </footer>
        ) : null}
      </aside>
    </div>
  );
};

/* ── Reject-with-reason dialog ──────────────────────────────────────────── */

const RejectModal: React.FC<{
  reservation: any;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ reservation, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="liquid-glass-modal booking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h3 className="auth-title booking-title">Reject Reservation</h3>
        <p className="booking-product">#{reservation.id.slice(0, 8).toUpperCase()}</p>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(reason.trim());
          }}
        >
          <div className="auth-field">
            <label className="auth-label">Reason shown to the customer</label>
            <textarea
              className="auth-input booking-input booking-textarea"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Equipment is under maintenance for the requested dates."
              required
            />
          </div>
          <button type="submit" className="btn-auth-submit">
            Confirm Rejection
          </button>
        </form>
      </div>
    </div>
  );
};
