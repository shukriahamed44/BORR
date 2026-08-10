/**
 * BORR Landing Page — Main Application Component
 * ────────────────────────────────────────────────
 * Implements Page 1 (Hero), Page 2 (Categories Carousel), Page 3 (Ready to Rent CTA Banner),
 * and the Modern BORR Footer with massive watermark typography, quick links, and email subscription.
 */

import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { UserProfile } from './types/auth';
import {
  authApi,
  setTokens,
  clearAuthToken,
  getAuthToken,
} from './services/api';

export function App() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  // Blocks the first paint while a stored token is exchanged for the session user,
  // so a refresh does not flash the landing page before restoring the portal.
  const [restoringSession, setRestoringSession] = useState(!!getAuthToken());

  // Auth form state
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Landing search bar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  // Rehydrate the session from a persisted JWT on mount. A rejected or expired token
  // is discarded rather than left to fail every subsequent request.
  useEffect(() => {
    if (!getAuthToken()) return;

    let cancelled = false;
    authApi
      .getProfile()
      .then(({ user }) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setRestoringSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result =
        authMode === 'signin'
          ? await authApi.login(authEmail, authPassword)
          : await authApi.register({
              name: authName,
              email: authEmail,
              password: authPassword,
            });

      setTokens(result.accessToken, result.refreshToken);
      setCurrentUser(result.user);
      setAuthModalOpen(false);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    clearAuthToken();
    setCurrentUser(null);
  };

  if (restoringSession) {
    return (
      <div className="session-restore">
        <div className="session-restore-spinner" />
        <p>Restoring your session…</p>
      </div>
    );
  }

  if (currentUser) {
    return <AppShell currentUser={currentUser} onSignOut={handleSignOut} />;
  }

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const categoryItems = [
    {
      id: 1,
      title: 'Power Tools',
      count: '120+ items',
      icon: (
        <svg viewBox="0 0 64 64" fill="none" className="category-card-icon">
          <path d="M12 40l16-16 8 8-16 16z" fill="#1B69AD" />
          <path d="M36 16l8-8 12 12-8 8z" fill="#002D55" />
          <rect x="8" y="44" width="12" height="12" rx="3" fill="#1B69AD" />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Lifting Equipment',
      count: '80+ items',
      icon: (
        <svg viewBox="0 0 64 64" fill="none" className="category-card-icon">
          <rect x="16" y="12" width="32" height="20" rx="4" fill="#1B69AD" />
          <path d="M20 32l-8 20h40l-8-20z" fill="#002D55" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'Camera & Photo',
      count: '95+ items',
      icon: (
        <svg viewBox="0 0 64 64" fill="none" className="category-card-icon">
          <rect x="12" y="20" width="40" height="28" rx="6" fill="#002D55" />
          <circle cx="32" cy="34" r="9" stroke="#1B69AD" strokeWidth="4" />
          <path d="M24 14h16l4 6H20z" fill="#1B69AD" />
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Generators',
      count: '60+ items',
      icon: (
        <svg viewBox="0 0 64 64" fill="none" className="category-card-icon">
          <rect x="12" y="16" width="40" height="32" rx="6" fill="#1B69AD" />
          <circle cx="24" cy="32" r="6" fill="#002D55" />
          <circle cx="40" cy="32" r="6" fill="#002D55" />
        </svg>
      ),
    },
    {
      id: 5,
      title: 'More',
      count: 'Explore all',
      icon: (
        <svg viewBox="0 0 64 64" fill="none" className="category-card-icon">
          <rect x="16" y="16" width="32" height="32" rx="8" fill="#1B69AD" />
          <path d="M26 32h12M32 26v12" stroke="white" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  // "More" is a call-to-action tile, not a real category, so it stays out of the filter options.
  const selectableCategories = categoryItems
    .filter((item) => item.title !== 'More')
    .map((item) => item.title);

  const query = searchQuery.trim().toLowerCase();
  const visibleCategories = categoryItems.filter(
    (item) =>
      (!searchCategory || item.title === searchCategory) &&
      (!query || item.title.toLowerCase().includes(query)),
  );

  return (
    <div className="landing-page">
      {/* ── Page 1: Hero Section ───────────────────────────────────── */}
      <section className="hero">
        {/* Navbar */}
        <nav className="navbar">
          <div className="nav-brand-spacer" />
          <div className="nav-center">
            <a href="#" className="nav-link">HOME</a>
            <a href="#categories" className="nav-link">EQUIPMENTS</a>
            <button
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
            >
              PORTAL DASHBOARD
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn-signin"
              onClick={() => {
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
            >
              SIGN IN
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="hero-content">
          <div className="hero-brand">
            <img src="/mainLogo.png" alt="BORR Logo" className="hero-brand-img" />
          </div>
          <h1 className="hero-headline">
            <span className="hero-line"><span className="text-white">BORROW</span></span>
            <span className="hero-line"><span className="text-white">BIG </span><span className="text-navy">OWN</span></span>
            <span className="hero-line"><span className="text-navy">SMALL</span></span>
          </h1>
          <a href="#search" className="btn-book-now">
            <span>BOOK NOW</span>
            <span className="btn-arrow">→</span>
          </a>
        </div>
      </section>

      {/* ── Page 2: Categories Section ─────────────────────────────── */}
      <section className="categories-section" id="categories">
        {/* Floating Liquid Glass Search Bar */}
        <div className="search-bar-container" id="search">
          <div className="search-bar liquid-glass">
            {/* Search Input */}
            <div className="search-field search-input-field">
              <svg className="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8.5" cy="8.5" r="6" />
                <path d="M13 13l5 5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="search-divider" />

            {/* Category Filter */}
            <label className="search-field">
              <span className="field-label">Category</span>
              <div className="field-value">
                {/* ponytail: native <select>, no custom dropdown widget */}
                <select
                  className="field-select"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {selectableCategories.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
                <svg className="chevron-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </label>

            <div className="search-divider" />

            {/* Location Filter */}
            <label className="search-field">
              <span className="field-label">Location</span>
              <div className="field-value">
                <select
                  className="field-select"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                >
                  <option value="">Select Location</option>
                  <option value="Colombo">Colombo, Sri Lanka</option>
                </select>
                <svg className="location-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 3.5 8 3.5s2.5 1.1 2.5 2.5S9.4 8.5 8 8.5z" />
                </svg>
              </div>
            </label>

            {/* Find Equipment Button */}
            <button
              className="btn-find"
              onClick={() => {
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
            >
              Find Equipment&nbsp;&nbsp;→
            </button>
          </div>
        </div>

        {/* Main Section Content Layout */}
        <div className="categories-layout">
          {/* Left Column (50% Width): Title & Action */}
          <div className="categories-left">
            <h2 className="categories-title">
              <span className="title-blue">WHATEVER</span><br />
              <span className="title-blue">YOU NEED,</span><br />
              <span className="title-silver">WE'VE</span><br />
              <span className="title-silver">GOT 'EM</span>
            </h2>

            <a href="#" className="btn-browse-categories">
              <span>BROWSE CATEGORIES</span>
              <span className="btn-arrow">→</span>
            </a>
          </div>

          {/* Right Column (50% Width): Equipment Category Carousel */}
          <div className="categories-right">
            <div className="carousel-wrapper">
              <div className="carousel-track" ref={carouselRef}>
                {visibleCategories.map((item) => (
                  <div key={item.id} className="category-card">
                    <div className="category-card-img-placeholder">
                      {item.icon}
                    </div>
                    <h3 className="category-card-title">{item.title}</h3>
                    <p className="category-card-count">{item.count}</p>
                  </div>
                ))}
                {visibleCategories.length === 0 && (
                  <p className="carousel-empty">No categories match “{searchQuery}”.</p>
                )}
              </div>

              {/* Carousel Navigation Arrow Button */}
              <button
                className="carousel-btn-next"
                onClick={scrollRight}
                aria-label="Next categories"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Page 3: Ready to Rent CTA Banner Section ───────────────── */}
      <section className="cta-banner-section" id="ready-to-rent">
        <div className="cta-banner-card">
          <div className="cta-banner-content">
            <h2 className="cta-banner-headline">
              <span className="cta-line">READY</span><br />
              <span className="cta-line">TO RENT ?</span>
            </h2>

            <div className="cta-banner-subtitle">
              <span>Join the community who trusts</span>
              <img src="/mainLogo.png" alt="BORR" className="cta-borr-logo" />
            </div>

            <div className="cta-banner-actions">
              <a href="#" className="btn-cta-browse">
                <span>BROWSE CATEGORIES</span>
                <span className="btn-arrow">→</span>
              </a>

              <button className="btn-cta-video">
                <span className="play-icon-circle">
                  <svg viewBox="0 0 16 16" fill="#1B69AD" className="play-icon">
                    <path d="M5 3.5v9l7-4.5-7-4.5z" />
                  </svg>
                </span>
                <span>WATCH VIDEO</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer Section ─────────────────────────────────────────── */}
      <footer className="footer">
        {/* Giant Watermark Text */}
        <div className="footer-watermark-wrapper">
          <span className="footer-watermark-text">BORR</span>
        </div>

        {/* Main Footer Container */}
        <div className="footer-container">
          <div className="footer-grid">
            {/* Column 1: Brand & Socials */}
            <div className="footer-col footer-col-brand">
              <div className="footer-brand-logo">
                <img src="/mainLogo.png" alt="BORR" className="footer-logo-img" />
              </div>
              <p className="footer-brand-desc">
                BORR is your trusted partner for renting professional equipment. Anytime, anywhere.
              </p>
              <div className="footer-socials">
                <a href="#" className="social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="footer-v-divider" />

            {/* Column 2: Quick Links */}
            <div className="footer-col">
              <h4 className="footer-col-title">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#">Home</a></li>
                <li><a href="#">Equipment</a></li>
                <li><a href="#">How it Works</a></li>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>

            {/* Column 3: Categories */}
            <div className="footer-col">
              <h4 className="footer-col-title">Categories</h4>
              <ul className="footer-links">
                <li><a href="#">Power Tools</a></li>
                <li><a href="#">Lifting Equipment</a></li>
                <li><a href="#">Camera & Photo</a></li>
                <li><a href="#">Generators</a></li>
                <li><a href="#">View All</a></li>
              </ul>
            </div>

            {/* Column 4: Support */}
            <div className="footer-col">
              <h4 className="footer-col-title">Support</h4>
              <ul className="footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Terms & Conditions</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">FAQs</a></li>
              </ul>
            </div>

            {/* Column 5: Stay Updated (Newsletter) */}
            <div className="footer-col footer-col-newsletter">
              <h4 className="footer-col-title">Stay Updated</h4>
              <p className="footer-newsletter-desc">
                Get the latest updates and offers in your inbox.
              </p>
              <form className="footer-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="newsletter-input"
                  required
                />
                <button type="submit" className="newsletter-btn" aria-label="Subscribe">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="newsletter-arrow">
                    <line x1="5" y1="15" x2="15" y2="5" />
                    <polyline points="7 5 15 5 15 13" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom">
            <p>© 2025 BORR. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── iOS Liquid Glass Auth Modal (Sign In / Sign Up) ────────── */}
      {authModalOpen && (
        <div className="auth-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="auth-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="auth-close-btn" onClick={() => setAuthModalOpen(false)} aria-label="Close">
              ✕
            </button>

            {/* Header */}
            <div className="auth-header">
              <h3 className="auth-title">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h3>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authError && <div className="auth-error">{authError}</div>}

              {authMode === 'signup' && (
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="auth-input"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="auth-input"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="auth-input"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {authMode === 'signin' && (
                <div className="auth-options">
                  <label className="auth-checkbox-label">
                    <input type="checkbox" className="auth-checkbox" defaultChecked />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="auth-forgot">Forgot Password?</a>
                </div>
              )}

              <button type="submit" className="btn-auth-submit" disabled={authLoading}>
                {authLoading
                  ? 'Please wait…'
                  : authMode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>

            {/* Footer Toggle Prompt */}
            <div className="auth-footer-prompt">
              {authMode === 'signin' ? (
                <p>Don't have an account? <button type="button" className="auth-toggle-link" onClick={() => setAuthMode('signup')}>Sign Up</button></p>
              ) : (
                <p>Already have an account? <button type="button" className="auth-toggle-link" onClick={() => setAuthMode('signin')}>Sign In</button></p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
