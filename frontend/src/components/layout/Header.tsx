import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Role, UserProfile, NavigationItemId } from '../../types/auth';
import { notificationsApi, type NotificationRecord } from '../../services/api';

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

/** Maps a notification type to the indicator colour used in the popover. */
const NOTIFICATION_TONE: Record<string, 'warning' | 'danger' | 'success' | 'info'> = {
  RESERVATION_APPROVED: 'success',
  RESERVATION_REJECTED: 'danger',
  UPCOMING_RETURN: 'warning',
  RESERVATION_EXPIRED: 'danger',
  PAYMENT_RECEIVED: 'success',
  DOCUMENT_VERIFIED: 'info',
};

/** Compact relative timestamp for the notification list. */
const relativeTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
};

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
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  /** Reads the persisted notification feed; the badge shows unread only. */
  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.list({ limit: 15 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Poll so approvals and return reminders surface without a manual refresh.
    const timer = setInterval(loadNotifications, 60_000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      loadNotifications();
    } catch {
      /* leave the badge as-is if the call fails */
    }
  };

  const openNotification = async (n: NotificationRecord) => {
    if (!n.readAt) {
      try {
        await notificationsApi.markRead(n.id);
        loadNotifications();
      } catch {
        /* non-fatal */
      }
    }
    setShowNotifications(false);
    onSelectNav('reservations');
  };

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
            {unreadCount > 0 && (
              <span className="notification-badge-count">{unreadCount}</span>
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="notifications-popover liquid-glass-popover">
              <div className="popover-header">
                <span>NOTIFICATIONS</span>
                {unreadCount > 0 && (
                  <button className="popover-mark-read" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button
                  className="popover-close"
                  onClick={() => setShowNotifications(false)}
                >
                  ✕
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="notifications-empty">You're all caught up.</div>
              ) : (
                <ul className="notifications-list">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`notification-item ${n.readAt ? '' : 'unread'}`}
                      onClick={() => openNotification(n)}
                    >
                      <div
                        className={`notif-indicator indicator-${
                          NOTIFICATION_TONE[n.type] ?? 'info'
                        }`}
                      />
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-desc">{n.body}</div>
                        <div className="notif-time">{relativeTime(n.createdAt)}</div>
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
