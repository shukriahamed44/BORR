/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Next.js Forgot Password Route Page (`page.tsx`).
 * Renders user password reset request form connected to `AuthContext.forgotPassword()`,
 * displays password reset token response details, and provides navigation back to `/login`.
 *
 * IN SIMPLE WORDS:
 * The webpage where users can type their email address to request a password reset token.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('alex.customer@ammunation.com');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string; token?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await forgotPassword(email);
      setMsg({
        type: 'success',
        text: res.message,
        token: res.resetToken,
      });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Password reset request failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '40px auto' }}>
      <div className="glass-panel">
        <div style={{ marginBottom: '16px' }}>
          <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Reset Password</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Enter your registered email address to receive a secure password reset token.
        </p>

        {msg && (
          <div style={{ padding: '14px', background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '10px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem', marginBottom: '20px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{msg.text}</div>
            {msg.token && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', fontSize: '0.75rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                Reset Token: {msg.token}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
            <KeyRound size={16} /> {loading ? 'Sending Request...' : 'Request Password Reset'}
          </button>
        </form>
      </div>
    </div>
  );
}
