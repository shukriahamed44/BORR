/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Account Settings page. Provides self-service profile maintenance via `PATCH /api/v1/auth/me`,
 * credential rotation via `POST /api/v1/auth/change-password`, appearance preference control
 * bound to the persisted theme attribute, and a read-only summary of the signed-in principal
 * and its effective permissions.
 *
 * IN SIMPLE WORDS:
 * Where a signed-in user edits their own name, email and phone, changes their password, and
 * switches between light and dark mode. It also shows which role they hold and what that role
 * is allowed to do.
 */

import React, { useEffect, useState } from 'react';
import './SettingsPage.css';
import { Toasts } from '../ui';
import type { Role, UserProfile } from '../../types/auth';
import { authApi } from '../../services/api';

interface SettingsPageProps {
  currentUser: UserProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onProfileUpdated: (user: UserProfile) => void;
}

/** Mirrors the backend @Roles guards so the summary reflects real, enforced permissions. */
const ROLE_CAPABILITIES: Record<Role, string[]> = {
  ADMIN: [
    'Full system administration',
    'Create, edit and delete equipment',
    'Approve, reject and progress reservations',
    'Record warehouse inventory movements',
    'View the customer directory and verify documents',
    'Process refunds',
  ],
  STAFF: [
    'Create and edit equipment (cannot delete)',
    'Approve, reject and progress reservations',
    'Record warehouse inventory movements',
    'View the customer directory and verify documents',
    'Process refunds',
  ],
  WAREHOUSE_OPERATOR: [
    'Receive, release and service stock',
    'Record damaged equipment',
    'View the inventory audit trail',
    'Cannot create catalog entries or approve reservations',
  ],
  CUSTOMER: [
    'Browse and search the equipment catalog',
    'Create and cancel own reservations',
    'Upload identity documents and rental agreements',
    'Pay for own reservations and view own receipts',
  ],
};

const ROLE_TITLE: Record<Role, string> = {
  ADMIN: 'System Administrator',
  STAFF: 'Reservation Staff',
  WAREHOUSE_OPERATOR: 'Warehouse Operator',
  CUSTOMER: 'Customer',
};

const roleBadgeClass = (role: Role) =>
  role === 'WAREHOUSE_OPERATOR' ? 'warehouse' : role.toLowerCase();

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  theme,
  onToggleTheme,
  onProfileUpdated,
}) => {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="settings-page animate-fade-in">
      <Toasts message={msg} error={error} />

      <div className="settings-layout">
        <div className="settings-column">
          <ProfileCard
            currentUser={currentUser}
            onSaved={(user) => {
              onProfileUpdated(user);
              flash('Profile updated.');
            }}
            onError={setError}
          />

          <PasswordCard onDone={() => flash('Password changed successfully.')} onError={setError} />
        </div>

        <div className="settings-column">
          <AppearanceCard theme={theme} onToggleTheme={onToggleTheme} />
          <RoleCard currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};

/* ── Profile ────────────────────────────────────────────────────────────── */

const ProfileCard: React.FC<{
  currentUser: UserProfile;
  onSaved: (user: UserProfile) => void;
  onError: (msg: string) => void;
}> = ({ currentUser, onSaved, onError }) => {
  const [name, setName] = useState(currentUser.name ?? '');
  const [email, setEmail] = useState(currentUser.email ?? '');
  const [phone, setPhone] = useState(currentUser.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Keep the form in step when the session user is refreshed elsewhere.
  useEffect(() => {
    setName(currentUser.name ?? '');
    setEmail(currentUser.email ?? '');
    setPhone(currentUser.phone ?? '');
  }, [currentUser]);

  const dirty =
    name !== (currentUser.name ?? '') ||
    email !== (currentUser.email ?? '') ||
    phone !== (currentUser.phone ?? '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      // Send only changed fields so an untouched email is never revalidated.
      const payload: { name?: string; email?: string; phone?: string } = {};
      if (name !== currentUser.name) payload.name = name.trim();
      if (email !== currentUser.email) payload.email = email.trim();
      if (phone !== (currentUser.phone ?? '')) payload.phone = phone.trim();

      const res = await authApi.updateProfile(payload);
      onSaved(res.user);
    } catch (err: any) {
      onError(err.message || 'Could not update the profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-panel settings-card">
      <div className="panel-header">
        <h3>Profile</h3>
      </div>

      <form className="settings-form" onSubmit={submit}>
        <div className="settings-field">
          <label className="settings-label">Full name</label>
          <input
            className="settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">Email address</label>
          <input
            type="email"
            className="settings-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <span className="settings-hint">This is also your sign-in identifier.</span>
        </div>

        <div className="settings-field">
          <label className="settings-label">Phone number</label>
          <input
            className="settings-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+94 77 123 4567"
            maxLength={32}
          />
        </div>

        <button type="submit" className="btn-primary-glass settings-submit" disabled={saving || !dirty}>
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'No Changes'}
        </button>
      </form>
    </section>
  );
};

/* ── Password ───────────────────────────────────────────────────────────── */

const PasswordCard: React.FC<{
  onDone: () => void;
  onError: (msg: string) => void;
}> = ({ onDone, onError }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current && next.length >= 8 && next === confirm && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone();
    } catch (err: any) {
      onError(err.message || 'Could not change the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-panel settings-card">
      <div className="panel-header">
        <h3>Password</h3>
      </div>

      <form className="settings-form" onSubmit={submit}>
        <div className="settings-field">
          <label className="settings-label">Current password</label>
          <input
            type="password"
            className="settings-input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="settings-field">
          <label className="settings-label">New password</label>
          <input
            type="password"
            className="settings-input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
          {tooShort && <span className="settings-error">Must be at least 8 characters.</span>}
        </div>

        <div className="settings-field">
          <label className="settings-label">Confirm new password</label>
          <input
            type="password"
            className="settings-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {mismatch && <span className="settings-error">Passwords do not match.</span>}
        </div>

        <p className="settings-hint">
          You will stay signed in on this device. Sessions on other devices remain active until
          their tokens expire.
        </p>

        <button type="submit" className="btn-primary-glass settings-submit" disabled={!canSubmit}>
          {saving ? 'Updating…' : 'Change Password'}
        </button>
      </form>
    </section>
  );
};

/* ── Appearance ─────────────────────────────────────────────────────────── */

const AppearanceCard: React.FC<{ theme: 'light' | 'dark'; onToggleTheme: () => void }> = ({
  theme,
  onToggleTheme,
}) => (
  <section className="glass-panel settings-card">
    <div className="panel-header">
      <h3>Appearance</h3>
    </div>

    <div className="pref-row">
      <div className="pref-text">
        <span className="pref-title">Dark mode</span>
        <span className="pref-sub">
          Currently using the {theme} theme. Your choice is remembered on this device.
        </span>
      </div>
      <button
        className={`theme-switch ${theme === 'dark' ? 'on' : ''}`}
        onClick={onToggleTheme}
        aria-label="Toggle dark mode"
      >
        <span className="theme-switch-knob" />
      </button>
    </div>
  </section>
);

/* ── Role & permissions ─────────────────────────────────────────────────── */

const RoleCard: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => (
  <section className="glass-panel settings-card">
    <div className="panel-header">
      <h3>Role &amp; Permissions</h3>
    </div>

    <div className="role-summary">
      <span className={`role-pill role-badge-${roleBadgeClass(currentUser.role)}`}>
        {currentUser.role.replace('_', ' ')}
      </span>
      <span className="role-summary-title">{ROLE_TITLE[currentUser.role]}</span>
    </div>

    <ul className="capability-list">
      {ROLE_CAPABILITIES[currentUser.role].map((c) => (
        <li key={c}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{c}</span>
        </li>
      ))}
    </ul>

    <p className="settings-hint">
      Roles are assigned by an administrator and enforced by the API, not the interface.
    </p>
  </section>
);
