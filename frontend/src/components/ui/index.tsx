/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Shared presentational component library. Encapsulates the interaction patterns repeated
 * across the feature pages — offset pagination, transient status banners, faceted tab bars,
 * status pills and empty states — behind a single typed API.
 *
 * These components deliberately emit the existing class names (`pagination`, `page-toast`,
 * `res-tab`, `status-pill`, …) so the established design system in `index.css` and the
 * per-page stylesheets continue to apply unchanged; this extraction removes duplicated
 * markup without altering a single pixel.
 *
 * IN SIMPLE WORDS:
 * The reusable building blocks every page shares — page numbers, success/error messages,
 * filter tabs, status badges. Previously each page copy-pasted its own; now they all use
 * these, so a fix in one place fixes every page.
 */

import React from 'react';

/* ── Pagination ─────────────────────────────────────────────────────────── */

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Offset pager. Renders nothing for a single page, so callers need no guard. */
export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination">
      <button
        className="btn-small-glass"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        ← Prev
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-small-glass"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        Next →
      </button>
    </nav>
  );
};

/* ── Toasts ─────────────────────────────────────────────────────────────── */

export interface ToastsProps {
  message?: string | null;
  error?: string | null;
}

/** The success/error banner pair every page renders above its content. */
export const Toasts: React.FC<ToastsProps> = ({ message, error }) => (
  <>
    {message && <div className="page-toast success">{message}</div>}
    {error && <div className="page-toast error">{error}</div>}
  </>
);

/* ── Faceted tab bar ────────────────────────────────────────────────────── */

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

export interface TabBarProps<T extends string> {
  tabs: readonly TabOption<T>[];
  active: T;
  onSelect: (value: T) => void;
  /** Optional per-tab count badge. Return undefined to omit the badge. */
  count?: (value: T) => number | undefined;
  className?: string;
}

/** Pill tab bar with optional count badges, used for status and role facets. */
export function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
  count,
  className = 'res-tabs',
}: TabBarProps<T>) {
  return (
    <div className={className}>
      {tabs.map((t) => {
        const badge = count?.(t.value);
        return (
          <button
            key={t.value}
            className={`res-tab ${active === t.value ? 'active' : ''}`}
            onClick={() => onSelect(t.value)}
          >
            {t.label}
            {badge !== undefined && <span className="res-tab-count">{badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Status pill ────────────────────────────────────────────────────────── */

export interface StatusPillProps {
  status: string;
  /** Class prefix, e.g. "status" → `status-pending`, "pay" → `pay-paid`. */
  prefix?: string;
}

/** Coloured status badge. Underscores in the value become spaces for display. */
export const StatusPill: React.FC<StatusPillProps> = ({ status, prefix = 'status' }) => (
  <span className={`${prefix === 'status' ? 'status-pill' : 'pay-status'} ${prefix}-${status.toLowerCase()}`}>
    {status.replace(/_/g, ' ')}
  </span>
);

/* ── Reference code ─────────────────────────────────────────────────────── */

/** Short uppercase reference derived from a UUID, e.g. #A1B2C3D4. */
export const RefCode: React.FC<{ id: string }> = ({ id }) => (
  <span className="id-code">#{id.slice(0, 8).toUpperCase()}</span>
);

/* ── Empty & loading states ─────────────────────────────────────────────── */

export interface EmptyStateProps {
  children: React.ReactNode;
  /** Wrap in a glass panel; omit when already inside one. */
  panel?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ children, panel = false }) => (
  <div className={panel ? 'glass-panel dash-empty' : 'dash-empty'}>{children}</div>
);

/* ── Search input ───────────────────────────────────────────────────────── */

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Shows an inline clear affordance once there is text. */
  clearable?: boolean;
}

/** The glass search field used by the catalog, reservations and directory pages. */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  clearable = false,
}) => (
  <div className={`liquid-glass-search ${className}`.trim()}>
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      type="text"
      className="header-search-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {clearable && value && (
      <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
        ✕
      </button>
    )}
  </div>
);
