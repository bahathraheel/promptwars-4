import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './api/firebase';
import {
  MessageCircle, LayoutDashboard, Activity, Leaf, BookOpen, Zap, LogOut, Radio,
} from 'lucide-react';
import FanCopilot from './pages/FanCopilot';
import OpsDashboard from './pages/OpsDashboard';
import WhatIf from './pages/WhatIf';
import Sustainability from './pages/Sustainability';
import AuditLog from './pages/AuditLog';
import LiveVoice from './pages/LiveVoice';
import Login from './pages/Login';
import './index.css';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--color-primary)' }}>
          <Zap size={36} className="animate-spin" aria-hidden="true" />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      {/* Accessibility: skip to main content */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="app-layout">
        {/* ── Sidebar ── */}
        <nav className="sidebar" aria-label="Main navigation">
          <div className="sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Zap size={20} color="#ed872d" aria-hidden="true" />
              <h1 style={{ fontSize: '1rem' }}>StadiumPulse AI</h1>
            </div>
            <p>FIFA World Cup 2026</p>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-label">Fan Services</p>
            <NavLink
              to="/"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Fan Copilot – AI assistant for fans"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Fan Copilot
            </NavLink>
            <NavLink
              to="/sustainability"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Sustainability assistant – waste and transport"
            >
              <Leaf size={16} aria-hidden="true" />
              Sustainability
            </NavLink>
            <NavLink
              to="/live"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Live Voice Copilot – real-time AI voice with Gemini Live API"
            >
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Radio size={16} aria-hidden="true" />
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                    animation: 'pulse 2s infinite',
                  }}
                  aria-hidden="true"
                />
              </span>
              Live Voice
            </NavLink>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-label">Operations</p>
            <NavLink
              to="/ops"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Operations Dashboard – crowd intelligence and actions"
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              Ops Dashboard
            </NavLink>
            <NavLink
              to="/whatif"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="What-If simulation for crowd scenarios"
            >
              <Activity size={16} aria-hidden="true" />
              What-If Sim
            </NavLink>
            <NavLink
              to="/audit"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Audit log of all operator decisions"
            >
              <BookOpen size={16} aria-hidden="true" />
              Audit Log
            </NavLink>
          </div>

          <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
            {user && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.email ?? ''}>
                  👤 {user.email}
                </p>
                <button
                  onClick={() => signOut(auth)}
                  className="sidebar-item"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    color: 'var(--color-red)',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 'var(--radius-md)',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                  aria-label="Sign Out from portal"
                >
                  <LogOut size={12} aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            )}
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', lineHeight: 1.4 }}>
              Privacy-by-design: no PII, no biometrics, aggregate counts only.
            </p>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<FanCopilot />} />
            <Route path="/ops" element={<OpsDashboard />} />
            <Route path="/whatif" element={<WhatIf />} />
            <Route path="/sustainability" element={<Sustainability />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/live" element={<LiveVoice />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

