export type Role = 'ADMIN' | 'STAFF' | 'WAREHOUSE_OPERATOR' | 'CUSTOMER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  unreadNotificationsCount?: number;
}

export type NavigationItemId =
  | 'dashboard'
  | 'equipment'
  | 'reservations'
  | 'customers'
  | 'inventory'
  | 'payments'
  | 'settings'
  | 'storefront';

export interface NavigationItem {
  id: NavigationItemId;
  label: string;
  icon: string; // SVG icon name or key
  badge?: string | number;
  badgeType?: 'info' | 'warning' | 'success' | 'danger';
  roles: Role[];
}
