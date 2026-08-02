/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Home Portal Gateway Page (`page.tsx`).
 * Serves as the landing hub displaying system overview, active role status, quick links to Equipment Catalog,
 * Reservation Manager, Admin Metrics, and Warehouse Audit Logs.
 *
 * IN SIMPLE WORDS:
 * The main homepage welcoming users to AmmuNation ERP with quick action buttons to explore equipment, make bookings, or view admin stats.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Package, Calendar, ShieldCheck, Warehouse, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AmmuNation Enterprise ERP
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto 24px auto' }}>
          Next-generation tactical equipment rental platform with real-time inventory tracking, state machine reservations, and automated warehouse dispatch.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/catalog" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            Explore Equipment Catalog <ArrowRight size={18} />
          </Link>
          {!user && (
            <Link href="/login" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
              Portal Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid-3">
        <div className="glass-panel">
          <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '16px' }}>
            <Package size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Equipment Catalog</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Browse tactical drones, night-vision gear, and surveillance equipment with real-time stock availability.
          </p>
          <Link href="/catalog" style={{ color: 'var(--primary-accent)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Browse Items <ArrowRight size={14} />
          </Link>
        </div>

        <div className="glass-panel">
          <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: '16px' }}>
            <Calendar size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>State Machine Bookings</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Atomic multi-day rental reservations with automatic cost calculation and approval state transitions.
          </p>
          <Link href="/reservations" style={{ color: '#34d399', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Manage Bookings <ArrowRight size={14} />
          </Link>
        </div>

        <div className="glass-panel">
          <div style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: '16px' }}>
            <Warehouse size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Warehouse Audit Logs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Audit trail logging for RECEIVE, RELEASE, and DAMAGE_RECORDED operations managed by warehouse staff.
          </p>
          <Link href="/inventory" style={{ color: '#c084fc', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            View Stock Logs <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
