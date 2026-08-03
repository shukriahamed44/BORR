/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Navigation Header Bar Component (`Navbar.tsx`).
 * Renders brand branding, role-based page navigation links (`Catalog`, `Reservations`, `Admin`, `Inventory`),
 * current logged-in user role badge, and `Login` / `Logout` action triggers.
 *
 * IN SIMPLE WORDS:
 * The top bar of our app showing links to equipment catalog, my bookings, admin metrics, warehouse logs, and your user role.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, Package, Calendar, Warehouse, LogOut, LogIn } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <Link href="/" className="nav-brand">
        <div className="brand-icon">A</div>
        <div>
          <span>AmmuNation ERP</span>
        </div>
      </Link>

      <nav className="nav-links">
        <Link href="/catalog" className="nav-link flex items-center gap-1">
          <Package size={16} /> Equipment Catalog
        </Link>

        {user && (
          <Link href="/reservations" className="nav-link flex items-center gap-1">
            <Calendar size={16} /> My Reservations
          </Link>
        )}

        {user && (user.role === 'ADMIN' || user.role === 'STAFF') && (
          <Link href="/admin" className="nav-link flex items-center gap-1">
            <ShieldAlert size={16} /> Admin Dashboard
          </Link>
        )}

        {user && (user.role === 'WAREHOUSE_OPERATOR' || user.role === 'ADMIN' || user.role === 'STAFF') && (
          <Link href="/inventory" className="nav-link flex items-center gap-1">
            <Warehouse size={16} /> Warehouse Logs
          </Link>
        )}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge badge-${user.role}`}>{user.role}</span>
            <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{user.name}</span>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary" style={{ padding: '6px 16px' }}>
            <LogIn size={14} /> Login
          </Link>
        )}
      </nav>
    </header>
  );
}
