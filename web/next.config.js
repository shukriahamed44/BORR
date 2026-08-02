/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Configuration Module (`next.config.js`).
 * Defines HTTP server rewrites that proxy all `/api/v1/*` requests from the
 * Next.js dev server (port 3001) to the NestJS backend server (port 3000).
 * This eliminates CORS issues and makes the frontend work regardless of backend host.
 *
 * IN SIMPLE WORDS:
 * This file tells Next.js: "Any request to /api/v1/... should silently be forwarded
 * to the backend running on port 3000" — so all API calls work correctly.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
