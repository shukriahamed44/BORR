/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Main Interactive Application Component (`App.tsx`).
 * Implements a full-stack React authentication testing dashboard communicating with NestJS `/api/v1/auth` endpoints.
 * Handles form state management, JWT Access Token & Refresh Token storage, role badge rendering,
 * and live API request inspection.
 *
 * IN SIMPLE WORDS:
 * The frontend dashboard screen where you can sign up, log in as any role (Admin, Staff, Customer, Warehouse),
 * inspect your JWT token, and test protected API endpoints visually.
 */

import React, { useState } from 'react';

const API_BASE = 'http://localhost:3000/api/v1';

export function App() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('register');
  
  // Registration State
  const [regEmail, setRegEmail] = useState('admin@ammunation.com');
  const [regPassword, setRegPassword] = useState('Password123!');
  const [regName, setRegName] = useState('Commander Alex');
  const [regRole, setRegRole] = useState('ADMIN');

  // Login State
  const [loginEmail, setLoginEmail] = useState('admin@ammunation.com');
  const [loginPassword, setLoginPassword] = useState('Password123!');

  // Auth & Token Storage State
  const [accessToken, setAccessToken] = useState<string>('');
  const [refreshToken, setRefreshToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Status UI State
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [apiResponseLog, setApiResponseLog] = useState<string>('No API calls made yet.');

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    setApiResponseLog('Sending POST /api/v1/auth/register...');

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          name: regName,
          role: regRole,
        }),
      });

      const data = await res.json();
      setApiResponseLog(JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setCurrentUser(data.user);
      setStatusMsg({ type: 'success', text: `Account created successfully as ${data.user.role}!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    setApiResponseLog('Sending POST /api/v1/auth/login...');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      setApiResponseLog(JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setCurrentUser(data.user);
      setStatusMsg({ type: 'success', text: `Logged in as ${data.user.name} (${data.user.role})` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Protected Profile (/auth/me)
  const fetchProfile = async () => {
    if (!accessToken) {
      setStatusMsg({ type: 'error', text: 'No Access Token found. Please login or register first.' });
      return;
    }

    setLoading(true);
    setApiResponseLog('Sending GET /api/v1/auth/me with Bearer Token...');

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      setApiResponseLog(JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch profile.');
      }

      setCurrentUser(data.user);
      setStatusMsg({ type: 'success', text: 'Profile fetched successfully from JWT token payload!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Refresh Token Request (/auth/refresh)
  const handleRefreshToken = async () => {
    if (!refreshToken) {
      setStatusMsg({ type: 'error', text: 'No Refresh Token available.' });
      return;
    }

    setLoading(true);
    setApiResponseLog('Sending POST /api/v1/auth/refresh...');

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json();
      setApiResponseLog(JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.message || 'Token refresh failed.');
      }

      setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      setStatusMsg({ type: 'success', text: 'Access Token refreshed successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setAccessToken('');
    setRefreshToken('');
    setCurrentUser(null);
    setStatusMsg({ type: 'success', text: 'Logged out.' });
    setApiResponseLog('Logged out.');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <h1 className="brand-title">AmmuNation ERP</h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Phase 2 Authentication & Security Tester</p>
          </div>
        </div>
        <div className="badge-tag">NestJS + JWT + Prisma</div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid-layout">
        {/* Left Column: Form Controls */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Authentication Portal</h2>
            <p className="card-subtitle">Create accounts or log in to generate JWT tokens</p>
          </div>

          {/* Navigation Tabs */}
          <div className="nav-tabs">
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register New Account
            </button>
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login Existing User
            </button>
          </div>

          {statusMsg && (
            <div className={`alert-box alert-${statusMsg.type}`}>
              {statusMsg.text}
            </div>
          )}

          {activeTab === 'register' ? (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role (RBAC Target)</label>
                <select
                  className="form-select"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="WAREHOUSE_OPERATOR">WAREHOUSE_OPERATOR</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Register User'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Authenticating...' : 'Log In'}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Live Session & API Inspector */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-title">Live Auth Session</h2>
              <p className="card-subtitle">Inspecting active tokens & protected user profile</p>
            </div>
            {currentUser && (
              <button className="btn-secondary" onClick={handleLogout}>Logout</button>
            )}
          </div>

          {currentUser ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{currentUser.name}</span>
                <span className={`role-badge role-${currentUser.role}`}>{currentUser.role}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>{currentUser.email}</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button className="btn-secondary" onClick={fetchProfile} disabled={loading}>
                  Verify /auth/me
                </button>
                <button className="btn-secondary" onClick={handleRefreshToken} disabled={loading}>
                  Refresh Access Token
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '1.5rem' }}>
              No active session. Register or log in on the left panel to test token authentication.
            </div>
          )}

          {/* Token Inspector */}
          {accessToken && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ color: '#6366f1' }}>JWT Access Token (Bearer)</label>
              <div className="code-box" style={{ fontSize: '0.7rem', wordBreak: 'break-all', color: '#c7d2fe' }}>
                {accessToken}
              </div>
            </div>
          )}

          {/* Raw Response Log */}
          <div>
            <label className="form-label">Backend HTTP Response Log</label>
            <pre className="code-box">{apiResponseLog}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
