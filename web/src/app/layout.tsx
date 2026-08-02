/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Root Layout Component (`layout.tsx`).
 * Establishes top-level HTML document structure, embeds global CSS design system tokens,
 * wraps child page routes in `AuthProvider`, and renders persistent Glassmorphism Header Navbar.
 *
 * IN SIMPLE WORDS:
 * The outer frame of our website that stays visible on every page, containing the navigation bar and global login state wrapper.
 */

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './globals.css';

export const metadata = {
  title: 'AmmuNation ERP - Military Equipment Reservation Portal',
  description: 'Enterprise ERP for Equipment Rental, State Machine Reservations, and Warehouse Operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ padding: '32px 24px', maxWidth: '1280px', margin: '0 auto' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
