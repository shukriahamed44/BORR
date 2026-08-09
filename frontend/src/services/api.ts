/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Frontend API Service Layer connecting React components to NestJS backend (`http://localhost:3000`).
 * Handles Bearer token injection, request/response serialization, error mapping, and live data fetching.
 */

import type { Role } from '../types/auth';

// Backend mounts every route under the /api/v1 version prefix (see backend/src/main.ts).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'ammunation_token';
const REFRESH_KEY = 'ammunation_refresh_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Persists the dual-token pair returned by login / register / refresh. */
export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * In-flight refresh, shared across concurrent callers. Several requests can 401 at
 * once when the 15-minute access token expires; without this they would each spend
 * the refresh token and the rotating tokens would invalidate one another.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearAuthToken();
          return null;
        }
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

async function send(endpoint: string, options: RequestInit, token: string | null) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // FormData must set its own Content-Type so the multipart boundary is generated;
  // forcing application/json here would make the upload unparseable server-side.
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response = await send(endpoint, options, getAuthToken());

  // An expired access token is recoverable: rotate it once, then replay the request.
  // Credential endpoints are excluded so a genuine bad-password 401 surfaces as-is
  // (/auth/me is deliberately NOT excluded — session restore relies on it refreshing).
  const isCredentialCall = ['/auth/login', '/auth/register', '/auth/refresh'].some((p) =>
    endpoint.startsWith(p),
  );

  if (response.status === 401 && !isCredentialCall) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await send(endpoint, options, newToken);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ── Auth Services ────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; name: string }) =>
    request<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request<{ user: any }>('/auth/me'),

  updateProfile: (data: { name?: string; email?: string; phone?: string }) =>
    request<{ message: string; user: any }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Dashboard Analytics Services ────────────────────────────────────────
export interface AdminStats {
  totalCustomers: number;
  activeReservations: number;
  pendingApprovals: number;
  totalProducts: number;
  totalUnits: number;
  totalRevenue: number;
  utilisationRate: number;
  rentedUnits: number;
  lowStock: { id: string; name: string; sku: string; totalStock: number }[];
  mostRented: { productId: string; name: string; sku: string; unitsRented: number }[];
  /** null when there is no prior period to compare against — render nothing rather than a fake trend. */
  revenueChangePct: number | null;
  trends: { date: string; count: number; revenue: number }[];
}

export interface CustomerSummary {
  activeRentals: number;
  pendingRequests: number;
  totalSpend: number;
  upcomingReturns: { id: string; endDate: string; totalPrice: string; status: string }[];
}

export const dashboardApi = {
  getStats: () => request<AdminStats>('/dashboard/stats'),
  getMySummary: () => request<CustomerSummary>('/dashboard/my-summary'),
};

// ── Product Equipment Services ──────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconKey?: string | null;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  pricePerDay: string | number;
  deposit: string | number;
  totalStock: number;
  imageUrl?: string | null;
  specifications?: Record<string, string> | null;
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string } | null;
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
  page?: number;
  limit?: number;
}

export interface ProductPage {
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  products: Product[];
}

/** Drops undefined/empty values so we never send `?minPrice=undefined`. */
function toQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const categoriesApi = {
  getAll: async () =>
    (await request<{ count: number; categories: Category[] }>('/categories')).categories,
};

export const productsApi = {
  /** Full paginated envelope — use for the catalog grid. */
  list: (query: ProductQuery = {}) =>
    request<ProductPage>(`/products${toQueryString(query as Record<string, unknown>)}`),

  // Convenience wrapper returning just the rows, for widgets that don't paginate.
  getAll: async (search?: string) =>
    (await request<ProductPage>(`/products${toQueryString({ search, limit: 100 })}`)).products,

  getById: (id: string) => request<any>(`/products/${id}`),

  create: (data: {
    sku: string;
    name: string;
    description?: string;
    pricePerDay: number;
    totalStock: number;
    deposit?: number;
    categoryId?: string;
    imageUrl?: string;
    specifications?: Record<string, string>;
  }) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      pricePerDay: number;
      totalStock: number;
      deposit: number;
      categoryId: string;
      imageUrl: string;
      specifications: Record<string, string>;
    }>,
  ) =>
    request<any>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),
};

// ── Reservation Services ────────────────────────────────────────────────
export type ReservationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'RETURNED'
  | 'CANCELLED';

export interface ReservationPage {
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Partial<Record<ReservationStatus, number>>;
  reservations: any[];
}

export type UploadType = 'IDENTITY_DOCUMENT' | 'RENTAL_AGREEMENT' | 'EQUIPMENT_IMAGE';
export type UploadStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface UploadRecord {
  id: string;
  type: UploadType;
  status: UploadStatus;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  reservationId?: string | null;
  rejectionNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  owner?: { id: string; name: string; email: string };
}

export const uploadsApi = {
  list: async (params: { reservationId?: string; ownerId?: string; status?: UploadStatus } = {}) =>
    (await request<{ count: number; uploads: UploadRecord[] }>(
      `/uploads${toQueryString(params as Record<string, unknown>)}`,
    )).uploads,

  /** Multipart upload — Content-Type must be left to the browser so the boundary is set. */
  upload: async (file: File, type: UploadType, reservationId?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (reservationId) form.append('reservationId', reservationId);

    return request<{ message: string; upload: UploadRecord }>('/uploads', {
      method: 'POST',
      body: form,
    });
  },

  review: (id: string, status: 'VERIFIED' | 'REJECTED', rejectionNote?: string) =>
    request<{ message: string; upload: UploadRecord }>(`/uploads/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionNote }),
    }),

  /**
   * The download route is JWT-protected, so a bare <a href> would 401 — the browser
   * does not attach the Authorization header to plain navigations. Fetch the bytes
   * with auth, then hand the viewer a short-lived object URL instead.
   */
  open: async (id: string) => {
    const res = await send(`/uploads/${id}/file`, { method: 'GET' }, getAuthToken());
    if (!res.ok) throw new Error('Could not open document.');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    // Release once the new tab has had a chance to read it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export const reservationsApi = {
  /** Full paginated envelope with per-status tallies for the tab bar. */
  list: (query: {
    status?: ReservationStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    request<ReservationPage>(`/reservations${toQueryString(query as Record<string, unknown>)}`),

  getAll: async () =>
    (await request<ReservationPage>('/reservations?limit=100')).reservations,

  getById: (id: string) => request<any>(`/reservations/${id}`),

  create: (data: { startDate: string; endDate: string; items: { productId: string; quantity: number }[] }) =>
    request<any>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string, rejectionReason?: string) =>
    request<any>(`/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason }),
    }),
};

// ── Inventory Log Services ──────────────────────────────────────────────
export type InventoryAction = 'RECEIVE' | 'RELEASE' | 'DAMAGE_RECORDED' | 'MAINTENANCE';

export interface InventoryLog {
  id: string;
  action: InventoryAction;
  quantity: number;
  notes?: string | null;
  timestamp: string;
  product?: { id: string; name: string; sku: string };
  operator?: { id: string; name: string; email: string; role: string };
}

// ── Notification Feed Services ──────────────────────────────────────────
export type NotificationType =
  | 'RESERVATION_APPROVED'
  | 'RESERVATION_REJECTED'
  | 'UPCOMING_RETURN'
  | 'RESERVATION_EXPIRED'
  | 'PAYMENT_RECEIVED'
  | 'DOCUMENT_VERIFIED';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (opts: { unreadOnly?: boolean; limit?: number } = {}) =>
    request<{ count: number; unreadCount: number; notifications: NotificationRecord[] }>(
      `/notifications${toQueryString(opts as Record<string, unknown>)}`,
    ),

  markRead: (id: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    request<{ message: string; updated: number }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};

// ── User Directory Services (STAFF / ADMIN) ─────────────────────────────
export type VerificationStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'UNVERIFIED';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt: string;
  reservationCount: number;
  documentCount: number;
  totalSpend: number;
  documents: { pending: number; verified: number; rejected: number };
  verificationStatus: VerificationStatus;
}

export interface UserPage {
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  roleCounts: Partial<Record<Role, number>>;
  users: DirectoryUser[];
}

export interface UserProfileDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt: string;
  reservations: any[];
  uploads: UploadRecord[];
  stats: {
    reservationCount: number;
    activeReservations: number;
    totalSpend: number;
    documentCount: number;
    pendingDocuments: number;
  };
}

export const usersApi = {
  list: (query: { role?: Role; search?: string; page?: number; limit?: number } = {}) =>
    request<UserPage>(`/users${toQueryString(query as Record<string, unknown>)}`),

  getById: (id: string) => request<UserProfileDetail>(`/users/${id}`),
};

export const inventoryApi = {
  getLogs: async (productId?: string) =>
    (await request<{ count: number; logs: InventoryLog[] }>(
      `/inventory/logs${productId ? `?productId=${encodeURIComponent(productId)}` : ''}`,
    )).logs,

  createLog: (data: {
    productId: string;
    action: InventoryAction;
    quantity: number;
    notes?: string;
  }) =>
    request<{ message: string; newStockLevel: number; log: InventoryLog }>('/inventory/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Payment Services ────────────────────────────────────────────────────
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PaymentRecord {
  id: string;
  reservationId: string;
  amount: string | number;
  status: PaymentStatus;
  transactionId?: string | null;
  provider?: string | null;
  failureReason?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  reservation?: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    user?: { id: string; name: string; email: string };
  };
}

export interface PaymentPage {
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Partial<Record<PaymentStatus, number>>;
  totals: { collected: number; refunded: number };
  payments: PaymentRecord[];
}

export const paymentsApi = {
  list: (query: {
    status?: PaymentStatus;
    reservationId?: string;
    page?: number;
    limit?: number;
  } = {}) => request<PaymentPage>(`/payments${toQueryString(query as Record<string, unknown>)}`),

  processPayment: (data: {
    reservationId: string;
    amount: number;
    paymentMethod?: string;
    simulateFailure?: boolean;
  }) =>
    request<{ message: string; status: string; payment: PaymentRecord; clientSecret: string }>(
      '/payments/process',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  refundPayment: (data: { paymentId: string; reason?: string }) =>
    request<{ message: string; payment: PaymentRecord }>('/payments/refund', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getByReservation: async (reservationId: string) =>
    (await request<{ count: number; payments: PaymentRecord[] }>(
      `/payments/reservation/${reservationId}`,
    )).payments,
};
