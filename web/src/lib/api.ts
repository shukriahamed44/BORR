/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Centralized Axios HTTP API Client Instance (`api.ts`).
 * Encapsulates base URL configuration (`http://localhost:3000/api/v1`), request header interceptors,
 * and automatic Bearer JWT Access Token injection from client storage for downstream REST API requests.
 *
 * IN SIMPLE WORDS:
 * The single HTTP client file that connects our Next.js frontend to the NestJS backend and automatically attaches your login token to every API request.
 */

import axios from 'axios';

// In the browser, use a relative path so the Next.js proxy in next.config.js
// forwards /api/v1/* → http://localhost:3000/api/v1/*.
// This avoids CORS and port-mismatch issues between port 3001 (Next.js) and 3000 (NestJS).
export const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer JWT Token automatically if stored
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ammunation_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Global Error Handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected API error occurred.';
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);
