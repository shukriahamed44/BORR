import React, { useEffect, useState } from 'react';
import type { Role, NavigationItemId, NavigationItem } from '../../types/auth';
import { reservationsApi, dashboardApi } from '../../services/api';

interface SidebarProps {
  currentRole: Role;
  activeItem: NavigationItemId;
  onSelectNav: (itemId: NavigationItemId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

export const ALL_NAV_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'chart-bar',
    roles: ['ADMIN', 'STAFF', 'WAREHOUSE_OPERATOR'],
  },
  {
    id: 'storefront',
    label: 'Storefront',
    icon: 'home',
    roles: ['CUSTOMER'],
  },
  {
    id: 'equipment',
    label: 'Equipment Catalog',
    icon: 'tool',
    roles: ['ADMIN', 'STAFF', 'CUSTOMER'],
  },
  {
    id: 'reservations',
    label: 'Reservations',
    icon: 'calendar',
    // Badge value is injected at render time from live counts — see useNavBadges below.
    badgeType: 'warning',
    roles: ['ADMIN', 'STAFF', 'WAREHOUSE_OPERATOR', 'CUSTOMER'],
  },
  {
    id: 'inventory',
    label: 'Inventory & Stock',
    icon: 'box',
    badgeType: 'danger',
    roles: ['ADMIN', 'WAREHOUSE_OPERATOR'],
  },
  {
    id: 'customers',
    label: 'Customers & Docs',
    icon: 'users',
    roles: ['ADMIN', 'STAFF'],
  },
  {
    id: 'payments',
    label: 'Payments & Billing',
    icon: 'credit-card',
    roles: ['ADMIN', 'STAFF', 'CUSTOMER'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    roles: ['ADMIN', 'STAFF', 'WAREHOUSE_OPERATOR', 'CUSTOMER'],
  },
];

/**
 * Live counts for the nav badges. Previously these were hardcoded ("12", "3 Alert"),
 * which displayed numbers that did not correspond to any real data.
 */
function useNavBadges(currentRole: Role) {
  const [badges, setBadges] = useState<Partial<Record<NavigationItemId, string>>>({});

  useEffect(() => {
    let cancelled = false;
    const isManager = currentRole === 'ADMIN' || currentRole === 'STAFF';

    const load = async () => {
      const next: Partial<Record<NavigationItemId, string>> = {};

      try {
        // statusCounts is already scoped per role by the API, so customers see their own.
        const { statusCounts } = await reservationsApi.list({ limit: 1 });
        const pending = statusCounts?.PENDING ?? 0;
        if (pending > 0) next.reservations = String(pending);
      } catch {
        /* leave the badge off rather than show a stale number */
      }

      // Low-stock count comes from /dashboard/stats, which is ADMIN/STAFF-only.
      // Warehouse operators would get a 403, so the badge is simply omitted for them.
      if (isManager) {
        try {
          const stats = await dashboardApi.getStats();
          const low = stats.lowStock?.length ?? 0;
          if (low > 0) next.inventory = `${low} Alert`;
        } catch {
          /* badge simply omitted */
        }
      }

      if (!cancelled) setBadges(next);
    };

    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentRole]);

  return badges;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeItem,
  onSelectNav,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onSignOut,
}) => {
  const navBadges = useNavBadges(currentRole);

  // Filter nav items based on user's active role, then attach live badge counts.
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(currentRole)
  ).map((item) => ({ ...item, badge: navBadges[item.id] }));

  const getRoleDisplayName = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'System Administrator';
      case 'STAFF':
        return 'Staff Manager';
      case 'WAREHOUSE_OPERATOR':
        return 'Warehouse Logistics';
      case 'CUSTOMER':
        return 'Customer Portal';
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'role-badge-admin';
      case 'STAFF':
        return 'role-badge-staff';
      case 'WAREHOUSE_OPERATOR':
        return 'role-badge-warehouse';
      case 'CUSTOMER':
        return 'role-badge-customer';
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'chart-bar':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="12" width="4" height="9" rx="1" />
            <rect x="10" y="7" width="4" height="14" rx="1" />
            <rect x="17" y="3" width="4" height="18" rx="1" />
          </svg>
        );
      case 'home':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
          </svg>
        );
      case 'tool':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'box':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        );
      case 'users':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'credit-card':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar liquid-glass-sidebar ${
          isCollapsed ? 'collapsed' : ''
        } ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/mainLogo.png" alt="BORR" className="sidebar-brand-img" />
            {!isCollapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-name">BORR</span>
                <span className={`role-pill ${getRoleBadgeColor(currentRole)}`}>
                  {currentRole.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`collapse-icon ${isCollapsed ? 'rotated' : ''}`}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Role Sub-Header */}
        {!isCollapsed && (
          <div className="sidebar-role-banner">
            <span className="role-sublabel">CURRENT ROLE VIEW</span>
            <div className="role-title">{getRoleDisplayName(currentRole)}</div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu-list">
            {visibleNavItems.map((item) => {
              const isActive = activeItem === item.id;
              return (
                <li key={item.id} className="sidebar-menu-item">
                  <button
                    className={`glass-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectNav(item.id);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="nav-btn-icon-wrapper">
                      {renderIcon(item.icon)}
                    </span>

                    {!isCollapsed && (
                      <span className="nav-btn-label">{item.label}</span>
                    )}

                    {item.badge && (
                      <span
                        className={`nav-btn-badge badge-${
                          item.badgeType || 'info'
                        } ${isCollapsed ? 'badge-collapsed-dot' : ''}`}
                      >
                        {!isCollapsed ? item.badge : ''}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Action (Sign out & Status) */}
        <div className="sidebar-footer">
          <button
            className="glass-signout-btn"
            onClick={onSignOut}
            title="Sign Out"
          >
            <svg
              className="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
