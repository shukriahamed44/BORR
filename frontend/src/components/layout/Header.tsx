import React, { useEffect, useRef, useState } from 'react';
import type { Role, UserProfile, NavigationItemId } from '../../types/auth';
import { reservationsApi } from '../../services/api';

interface HeaderProps {
  currentUser: UserProfile;
  currentRole: Role;
  onToggleMobileSidebar: () => void;
  activeNavId: NavigationItemId;
  onSelectNav: (itemId: NavigationItemId) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => void;
}

interface Alert {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'warning' | 'danger' | 'success' | 'info';
}

/** Days between now and a date string (negative = already past). */
function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * The backend exposes no notifications-feed endpoint (only test-email / test-push),
 * so the bell derives its alerts from live reservation data: pending approvals,
 * upcoming returns, and overdue returns.
 */
function deriveAlerts(reservations: any[], role: Role): Alert[] {
  const alerts: Alert[] = [];

  for (const r of reservations) {
    const ref = r.id ? `#${String(r.id).slice(0, 8)}` : '';
    const customer = r.user?.name || r.user?.email || 'A customer';

    if (r.status === 'PENDING' && role !== 'CUSTOMER') {
      alerts.push({
        id: `pending-${r.id}`,
        title: 'Reservation Awaiting Approval',
        desc: `${customer} submitted reservation ${ref}`,
        time: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
        type: 'warning',
      });
    }

    if ((r.status === 'ACTIVE' || r.status === 'APPROVED') && r.endDate) {
      const days = daysUntil(r.endDate);
      if (days < 0) {
        alerts.push({
          id: `overdue-${r.id}`,
          title: 'Return Overdue',
          desc: `Reservation ${ref} was due ${Math.abs(days)} day(s) ago`,
          time: new Date(r.endDate).toLocaleDateString(),
          type: 'danger',
        });
      } else if (days <= 3) {
        alerts.push({
          id: `due-${r.id}`,
          title: 'Upcoming Return',
          desc: `Reservation ${ref} is due in ${days} day(s)`,
          time: new Date(r.endDate).toLocaleDateString(),
          type: 'info',
        });
      }
    }

    if (r.status === 'APPROVED' && role === 'CUSTOMER') {
      alerts.push({
        id: `approved-${r.id}`,
        title: 'Reservation Approved',
        desc: `Your reservation ${ref} was approved`,
        time: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '',
        type: 'success',
      });
    }
    if (r.status === 'REJECTED' && role === 'CUSTOMER') {
      alerts.push({
        id: `rejected-${r.id}`,
        title: 'Reservation Rejected',
        desc: r.rejectionReason || `Your reservation ${ref} was rejected`,
        time: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '',
        type: 'danger',
      });
    }
  }

  return alerts;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentRole,
  onToggleMobileSidebar,
  activeNavId,
  onSelectNav,
  theme,
  onToggleTheme,
  onSignOut,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const reservations = await reservationsApi.getAll();
        if (!cancelled) setAlerts(deriveAlerts(reservations, currentRole));
      } catch {
        if (!cancelled) setAlerts([]);
      }
    };
    load();
    // Poll so approvals/returns surface without a manual refresh.
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentRole]);

  // Close popovers on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const roleLabel = currentRole.replace('_', ' ');
  // CSS defines .role-badge-warehouse (not ...-warehouse_operator).
  const roleBadgeClass =
    currentRole === 'WAREHOUSE_OPERATOR' ? 'warehouse' : currentRole.toLowerCase();

  const getNavTitle = (id: NavigationItemId) => {
    switch (id) {
      case 'dashboard':
        return 'Operations Dashboard';
      case 'storefront':
        return 'Equipment Storefront';
      case 'equipment':
        return 'Equipment Management';
      case 'reservations':
        return 'Reservation Workflows';
      case 'inventory':
        return 'Inventory & Stock Logistics';
      case 'customers':
        return 'Customer Directory & Identity Verification';
      case 'payments':
        return 'Payments & Revenue Ledger';
      case 'settings':
        return 'Account & System Preferences';
    }
  };

  return (
    <header className="app-header liquid-glass-header" ref={headerRef}>
      {/* Left Section: Mobile Hamburger Toggle & Title */}
      <div className="header-left">
        <button
          className="hamburger-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Open Navigation Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
            <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
            <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="header-page-heading">
          <h1 className="page-title">{getNavTitle(activeNavId)}</h1>
          <span className="page-subtitle">Equipment Rental Management Platform</span>
        </div>
      </div>

      {/* Center Section: Quick Search Bar */}
      <div className="header-center">
        <div className="header-search-bar liquid-glass-search">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search equipment, reservations, customers..."
            className="header-search-input"
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
      </div>

      {/* Right Section: Notifications, Profile & Quick Actions */}
      <div className="header-right">
        {/* Notifications Bell */}
        <div className="notifications-container">
          <button
            className="header-icon-btn glass-icon-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {alerts.length > 0 && (
              <span className="notification-badge-count">{alerts.length}</span>
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="notifications-popover liquid-glass-popover">
              <div className="popover-header">
                <span>SYSTEM NOTIFICATIONS</span>
                <button
                  className="popover-close"
                  onClick={() => setShowNotifications(false)}
                >
                  ✕
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="notifications-empty">You're all caught up.</div>
              ) : (
                <ul className="notifications-list">
                  {alerts.map((n) => (
                    <li key={n.id} className="notification-item">
                      <div className={`notif-indicator indicator-${n.type}`} />
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-desc">{n.desc}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="popover-footer">
                <button
                  className="btn-view-all-notifs"
                  onClick={() => {
                    setShowNotifications(false);
                    onSelectNav('reservations');
                  }}
                >
                  View All Reservations →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Quick Actions */}
        <div className="profile-menu-container">
          <button
            className="user-profile-pill"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            aria-label="Account menu"
          >
            <div className="user-avatar">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-email">{currentUser.email}</span>
            </div>
            <svg
              className={`chevron-icon ${showProfileMenu ? 'open' : ''}`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showProfileMenu && (
            <div className="profile-menu-popover liquid-glass-popover">
              <div className="profile-menu-identity">
                <div className="user-avatar large">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="profile-menu-info">
                  <span className="profile-menu-name">{currentUser.name}</span>
                  <span className="profile-menu-email">{currentUser.email}</span>
                  <span className={`role-pill role-badge-${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="profile-menu-divider" />

              <button
                className="profile-menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onSelectNav('settings');
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Account Settings</span>
              </button>

              <button className="profile-menu-item" onClick={onToggleTheme}>
                {theme === 'light' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
                  </svg>
                )}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                <span className={`theme-switch ${theme === 'dark' ? 'on' : ''}`}>
                  <span className="theme-switch-knob" />
                </span>
              </button>

              <div className="profile-menu-divider" />

              <button className="profile-menu-item danger" onClick={onSignOut}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
