import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './api/firebase';
import {
  MessageCircle, LayoutDashboard, Activity, Leaf, BookOpen, Zap, LogOut, Radio,
  Settings, Keyboard, Volume2, VolumeX, Eye, EyeOff, HelpCircle, X,
  Award, Utensils, HeartHandshake
} from 'lucide-react';
import FanCopilot from './pages/FanCopilot';
import OpsDashboard from './pages/OpsDashboard';
import WhatIf from './pages/WhatIf';
import Sustainability from './pages/Sustainability';
import AuditLog from './pages/AuditLog';
import LiveVoice from './pages/LiveVoice';
import Login from './pages/Login';
import MatchCenter from './pages/MatchCenter';
import FoodConcessions from './pages/FoodConcessions';
import VolunteerHub from './pages/VolunteerHub';
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
      <AppContent user={user} />
    </BrowserRouter>
  );
}

function AppContent({ user }: { user: User }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Accessibility State
  const [panelOpen, setPanelOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('access-font-size') as any) || 'standard';
  });
  
  const [theme, setTheme] = useState<'standard' | 'contrast-dark' | 'contrast-light'>(() => {
    return (localStorage.getItem('access-theme') as any) || 'standard';
  });

  const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(() => {
    return localStorage.getItem('access-dyslexia') === 'true';
  });

  const [screenReaderActive, setScreenReaderActive] = useState<boolean>(() => {
    return localStorage.getItem('access-tts') === 'true';
  });

  const [announcement, setAnnouncement] = useState('');

  const announce = (text: string) => {
    setAnnouncement(text);
    if (screenReaderActive && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Expose global announcement function
  useEffect(() => {
    (window as any).announceAccessibility = (text: string) => {
      announce(text);
    };
    return () => {
      try { delete (window as any).announceAccessibility; } catch { /* ignore */ }
    };
  }, [screenReaderActive, fontSize, theme, dyslexiaFont]);

  // Keyboard Navigation & Control Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); navigate('/'); }
        if (e.key === '2') { e.preventDefault(); navigate('/sustainability'); }
        if (e.key === '3') { e.preventDefault(); navigate('/live'); }
        if (e.key === '4') { e.preventDefault(); navigate('/ops'); }
        if (e.key === '5') { e.preventDefault(); navigate('/whatif'); }
        if (e.key === '6') { e.preventDefault(); navigate('/audit'); }
        if (e.key === '7') { e.preventDefault(); navigate('/match'); }
        if (e.key === '8') { e.preventDefault(); navigate('/food'); }
        if (e.key === '9') { e.preventDefault(); navigate('/volunteer'); }
      }
      if (e.key === 'Escape') {
        setPanelOpen(false);
        setShortcutsOpen(false);
      }
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const input = document.getElementById('chat-input') || document.getElementById('item-input');
        if (input) {
          input.focus();
          announce('Focused input field');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, screenReaderActive]);

  // Page tracking announcement
  useEffect(() => {
    const pageName = 
      location.pathname === '/' ? 'Fan Copilot' :
      location.pathname === '/sustainability' ? 'Sustainability Assistant' :
      location.pathname === '/live' ? 'Live Voice Copilot' :
      location.pathname === '/ops' ? 'Operations Dashboard' :
      location.pathname === '/whatif' ? 'What If Simulation' :
      location.pathname === '/audit' ? 'Audit Log' :
      location.pathname === '/match' ? 'Match Center' :
      location.pathname === '/food' ? 'Food concessions Finder' :
      location.pathname === '/volunteer' ? 'Volunteer Hub' : 'Stadium Pulse';
    announce(`Loaded page: ${pageName}`);
  }, [location.pathname]);

  // CSS Class sync effects
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('font-scale-large', 'font-scale-xlarge');
    if (fontSize === 'large') html.classList.add('font-scale-large');
    if (fontSize === 'xlarge') html.classList.add('font-scale-xlarge');
    localStorage.setItem('access-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-high-contrast-dark', 'theme-high-contrast-light');
    if (theme === 'contrast-dark') body.classList.add('theme-high-contrast-dark');
    if (theme === 'contrast-light') body.classList.add('theme-high-contrast-light');
    localStorage.setItem('access-theme', theme);
  }, [theme]);

  useEffect(() => {
    const body = document.body;
    if (dyslexiaFont) {
      body.classList.add('font-dyslexia');
    } else {
      body.classList.remove('font-dyslexia');
    }
    localStorage.setItem('access-dyslexia', String(dyslexiaFont));
  }, [dyslexiaFont]);

  useEffect(() => {
    localStorage.setItem('access-tts', String(screenReaderActive));
    if (screenReaderActive) {
      announce('Voice narration enabled');
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }, [screenReaderActive]);

  return (
    <>
      {/* Screen Reader live announcer */}
      <div className="sr-only" aria-live="assertive">
        {announcement}
      </div>

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
              to="/match"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Match Center – live scores and AI commentaries"
            >
              <Award size={16} aria-hidden="true" />
              Match Center
            </NavLink>
            <NavLink
              to="/food"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Food concessions – order food and skip lines"
            >
              <Utensils size={16} aria-hidden="true" />
              Food Finder
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
              to="/volunteer"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              aria-label="Volunteer Hub – safety briefings and ground incident reports"
            >
              <HeartHandshake size={16} aria-hidden="true" />
              Volunteer Hub
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
            <Route path="/match" element={<MatchCenter />} />
            <Route path="/food" element={<FoodConcessions />} />
            <Route path="/volunteer" element={<VolunteerHub />} />
          </Routes>
        </main>
      </div>

      {/* ── Floating Accessibility Toolbar ── */}
      <div className="accessibility-widget" role="region" aria-label="Accessibility panel">
        {panelOpen && (
          <div className="accessibility-panel-card card">
            <h4>
              <Settings size={18} color="var(--color-primary)" aria-hidden="true" />
              Accessibility Panel
            </h4>
            
            {/* Font Sizing Option */}
            <div className="accessibility-option-group">
              <span className="accessibility-option-label">Text Size</span>
              <div className="accessibility-btn-row">
                <button
                  className={fontSize === 'standard' ? 'active' : ''}
                  onClick={() => { setFontSize('standard'); }}
                  aria-label="Standard text size"
                >
                  A
                </button>
                <button
                  className={fontSize === 'large' ? 'active' : ''}
                  onClick={() => { setFontSize('large'); }}
                  aria-label="Large text size"
                  style={{ fontSize: '1rem' }}
                >
                  A+
                </button>
                <button
                  className={fontSize === 'xlarge' ? 'active' : ''}
                  onClick={() => { setFontSize('xlarge'); }}
                  aria-label="Extra large text size"
                  style={{ fontSize: '1.2rem' }}
                >
                  A++
                </button>
              </div>
            </div>

            {/* Contrast Themes Option */}
            <div className="accessibility-option-group">
              <span className="accessibility-option-label">Contrast Theme</span>
              <div className="accessibility-btn-row">
                <button
                  className={theme === 'standard' ? 'active' : ''}
                  onClick={() => { setTheme('standard'); }}
                  aria-label="Standard contrast theme"
                >
                  Standard
                </button>
                <button
                  className={theme === 'contrast-dark' ? 'active' : ''}
                  onClick={() => { setTheme('contrast-dark'); }}
                  aria-label="High contrast dark theme"
                >
                  HC Dark
                </button>
                <button
                  className={theme === 'contrast-light' ? 'active' : ''}
                  onClick={() => { setTheme('contrast-light'); }}
                  aria-label="High contrast light theme"
                >
                  HC Light
                </button>
              </div>
            </div>

            {/* Dyslexia Friendly Option */}
            <div className="accessibility-option-group">
              <span className="accessibility-option-label">Dyslexia Support</span>
              <div className="accessibility-btn-row">
                <button
                  className={dyslexiaFont ? 'active' : ''}
                  onClick={() => { setDyslexiaFont(prev => !prev); }}
                  aria-label="Toggle dyslexia friendly font spacing"
                >
                  {dyslexiaFont ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Screen Reader Voice Toggle */}
            <div className="accessibility-option-group">
              <span className="accessibility-option-label">Voice Narration</span>
              <div className="accessibility-btn-row">
                <button
                  className={screenReaderActive ? 'active' : ''}
                  onClick={() => setScreenReaderActive(prev => !prev)}
                  aria-label="Toggle text to speech narration"
                >
                  {screenReaderActive ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
                  {screenReaderActive ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {/* Helper modal toggle */}
            <button
              className="btn-ghost"
              onClick={() => setShortcutsOpen(true)}
              style={{ fontSize: '0.75rem', justifyContent: 'center' }}
              aria-label="View keyboard shortcuts"
            >
              <Keyboard size={14} aria-hidden="true" /> Keyboard Shortcuts
            </button>
          </div>
        )}

        <button
          className="accessibility-toggle-btn"
          onClick={() => setPanelOpen(prev => !prev)}
          aria-expanded={panelOpen}
          aria-label="Open accessibility control settings"
        >
          {panelOpen ? <X size={24} aria-hidden="true" /> : <Settings size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* ── Keyboard Shortcuts Modal ── */}
      {shortcutsOpen && (
        <div className="shortcut-list-modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
          <div className="shortcut-modal-content">
            <h3 id="shortcut-title">
              <Keyboard size={20} color="var(--color-primary)" aria-hidden="true" />
              Keyboard Navigation Shortcuts
            </h3>
            <table>
              <thead>
                <tr className="sr-only">
                  <th>Shortcut key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><kbd>Alt + 1</kbd></td>
                  <td>Go to Fan Copilot</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 2</kbd></td>
                  <td>Go to Sustainability Assistant</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 3</kbd></td>
                  <td>Go to Live Voice Copilot</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 4</kbd></td>
                  <td>Go to Operations Control Room</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 5</kbd></td>
                  <td>Go to What-If Simulation</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 6</kbd></td>
                  <td>Go to Audit Log</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 7</kbd></td>
                  <td>Go to Match Center</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 8</kbd></td>
                  <td>Go to Food Finder</td>
                </tr>
                <tr>
                  <td><kbd>Alt + 9</kbd></td>
                  <td>Go to Volunteer Hub</td>
                </tr>
                <tr>
                  <td><kbd>Alt + S</kbd></td>
                  <td>Focus main search/input field</td>
                </tr>
                <tr>
                  <td><kbd>Shift + ?</kbd></td>
                  <td>Open / close shortcuts list</td>
                </tr>
                <tr>
                  <td><kbd>Esc</kbd></td>
                  <td>Close modals / panels</td>
                </tr>
              </tbody>
            </table>
            <button
              className="btn-primary"
              onClick={() => setShortcutsOpen(false)}
              style={{ alignSelf: 'flex-end' }}
              aria-label="Close shortcuts list"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
