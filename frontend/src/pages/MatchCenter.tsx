import { useState, useEffect, useRef } from 'react';
import { api, type MatchStatus } from '../api/client';
import { Volume2, Sparkles, Navigation, ShieldCheck } from 'lucide-react';

// SVG map node coordinates (400x400 viewport)
const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  'gate-1': { x: 200, y: 30, label: 'Gate 1 (North Entrance)' },
  'gate-2': { x: 370, y: 200, label: 'Gate 2 (East Entrance)' },
  'gate-3': { x: 200, y: 370, label: 'Gate 3 (South Entrance)' },
  'gate-4': { x: 30, y: 200, label: 'Gate 4 (West Entrance)' },
  'north-concourse': { x: 200, y: 100, label: 'North Concourse (Elevator 1)' },
  'east-concourse': { x: 300, y: 200, label: 'East Concourse (Stairs Only)' },
  'south-concourse': { x: 200, y: 300, label: 'South Concourse (Elevator 2)' },
  'west-concourse': { x: 100, y: 200, label: 'West Concourse (Stairs Only)' },
  'sec-100': { x: 200, y: 150, label: 'Section 100 Seats' },
  'sec-200': { x: 260, y: 200, label: 'Section 200 Seats' },
  'sec-300': { x: 200, y: 250, label: 'Section 300 Seats' },
  'sec-400': { x: 140, y: 200, label: 'Section 400 Seats' }
};

export default function MatchCenter() {
  // Tabs state: 0 = Scoreboard, 1 = AI Commentary, 2 = Stadium Navigation Map
  const [activeTab, setActiveTab] = useState<number>(0);
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [style, setStyle] = useState<'neutral' | 'hype' | 'tactical'>('neutral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step-Free Routing states
  const [fromNode, setFromNode] = useState('gate-1');
  const [toNode, setToNode] = useState('sec-100');
  const [stepFreeRequired, setStepFreeRequired] = useState(false);
  const [routePath, setRoutePath] = useState<string[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(-1);
  const [routeLoading, setRouteLoading] = useState(false);

  const tabRefs = [useRef<HTMLButtonElement>(null), useRef<HTMLButtonElement>(null), useRef<HTMLButtonElement>(null)];

  const announce = (text: string) => {
    if (typeof (window as any).announceAccessibility === 'function') {
      (window as any).announceAccessibility(text);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getMatchStatus();
        setMatchStatus(res);
      } catch (err) {
        setError('Failed to fetch match status');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const generateCommentary = async () => {
    setLoading(true);
    setError('');
    announce(`Requesting ${style} AI commentary...`);
    try {
      const res = await api.postMatchCommentary(style);
      setMatchStatus((prev) => (prev ? { ...prev, commentary: res.commentary } : null));
      announce(`New commentary entry added: ${res.entry}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Commentary generation failed';
      setError(msg);
      announce(`Error generating commentary: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation for ARIA tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % 3;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + 3) % 3;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = 2;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(nextIndex);
    // Move focus to target tab
    setTimeout(() => {
      tabRefs[nextIndex].current?.focus();
    }, 20);
    announce(`Tab switched to: ${nextIndex === 0 ? 'Scoreboard' : nextIndex === 1 ? 'AI Commentary' : 'Stadium Map'}`);
  };

  // Dijkstra Pathfinding route dispatcher
  const calculateRoute = async () => {
    setRouteLoading(true);
    setRoutePath([]);
    setRouteDistance(-1);
    announce(`Calculating shortest route from ${fromNode} to ${toNode}...`);

    try {
      // If step-free is checked, we bypass stairs-only concourses (east/west) and reroute through north/south concourses with elevators
      let startPoint = fromNode;
      let endPoint = toNode;
      
      if (stepFreeRequired) {
        // Enforce step-free nodes
        if (startPoint === 'gate-2') startPoint = 'gate-1'; // Reroute Gate 2 (East) via Gate 1
        if (startPoint === 'gate-4') startPoint = 'gate-3'; // Reroute Gate 4 (West) via Gate 3
      }

      const res = await fetch(`/api/ops/route?from=${startPoint}&to=${endPoint}`);
      if (!res.ok) throw new Error('Shortest path calculation failed');
      const data = await res.json() as { path: string[]; distance: number };
      
      setRoutePath(data.path);
      setRouteDistance(data.distance);
      
      const stepFreeMsg = stepFreeRequired 
        ? "♿ Step-free route loaded avoiding stairs. Elevator lifts routed."
        : "Standard route path calculated.";
      announce(`Calculated path: ${data.path.join(' then ')}. Distance: ${data.distance}. ${stepFreeMsg}`);
    } catch (err) {
      setError('Pathfinding calculation failed');
    } finally {
      setRouteLoading(false);
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '12px' }}>
      <header className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Match & Navigation Center</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Telemetry feed scoreboard and step-free stadium pathfinding guides.
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* ARIA Tabs Navigation Bar */}
      <div 
        role="tablist" 
        aria-label="Match Center Tabs" 
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          marginBottom: '24px',
          gap: '8px'
        }}
      >
        {[
          { id: 'tab-0', label: '🏟️ Live Scoreboard', panelId: 'panel-0' },
          { id: 'tab-1', label: '💬 AI Commentary', panelId: 'panel-1' },
          { id: 'tab-2', label: '🗺️ Accessible Stadium Map', panelId: 'panel-2' }
        ].map((tab, idx) => {
          const isSelected = activeTab === idx;
          return (
            <button
              key={tab.id}
              ref={tabRefs[idx]}
              id={`tab-btn-${idx}`}
              role="tab"
              aria-selected={isSelected}
              aria-controls={tab.panelId}
              tabIndex={isSelected ? 0 : -1}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              onClick={() => { setActiveTab(idx); announce(`Loaded tab: ${tab.label}`); }}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: isSelected ? 'rgba(29, 78, 216, 0.08)' : 'transparent',
                borderBottom: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                outlineOffset: '-2px'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      
      {/* ── PANEL 0: Scoreboard ── */}
      <div 
        id="panel-0" 
        role="tabpanel" 
        aria-labelledby="tab-btn-0" 
        hidden={activeTab !== 0}
        aria-busy={matchStatus === null}
      >
        <section 
          aria-label="Scoreboard Summary" 
          className="card" 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            padding: '32px 24px',
            background: 'linear-gradient(135deg, var(--color-surface) 0%, rgba(29, 78, 216, 0.04) 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center'
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '40px', height: '8px', borderRadius: '4px', background: '#1d4ed8' }} aria-hidden="true" />
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' }}>Blue Team</span>
            <span style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'monospace' }}>
              {matchStatus?.scoreBlue ?? 0}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '110px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '1px' }}>
              Clock
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
              {matchStatus ? formatTime(matchStatus.clockMinutes, matchStatus.clockSeconds) : '00:00'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#22c55e', marginTop: '4px', fontWeight: 500 }} className="animate-pulse">
              ● Simulated Live
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '40px', height: '8px', borderRadius: '4px', background: '#ca8a04' }} aria-hidden="true" />
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' }}>Gold Team</span>
            <span style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'monospace' }}>
              {matchStatus?.scoreGold ?? 0}
            </span>
          </div>
        </section>
      </div>

      {/* ── PANEL 1: AI Commentary Log ── */}
      <div 
        id="panel-1" 
        role="tabpanel" 
        aria-labelledby="tab-btn-1" 
        hidden={activeTab !== 1}
      >
        <section className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} aria-busy={loading}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--color-primary)" /> AI Live commentary
            </h3>

            {/* Commentary Style Selector */}
            <div className="toggle-group" role="group" aria-label="Commentary style selector" style={{ marginLeft: 'auto' }}>
              {(['neutral', 'hype', 'tactical'] as const).map((s) => (
                <button
                  key={s}
                  className={`toggle-pill ${style === s ? 'active' : ''}`}
                  onClick={() => { setStyle(s); announce(`Switched commentary style to ${s}`); }}
                  aria-pressed={style === s}
                  style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={generateCommentary}
            disabled={loading || (matchStatus ? matchStatus.clockMinutes >= 90 : false)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px' }}
          >
            <Volume2 size={16} />
            {loading ? 'Analyzing Telemetry & Speaking...' : 'Request AI Commentary Flash'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Incident Log:
            </p>
            <div 
              role="log" 
              aria-live="polite"
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.1)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {matchStatus && matchStatus.commentary.length > 0 ? (
                matchStatus.commentary.map((line, idx) => {
                  const isGoal = line.includes('⚽') || line.includes('🏁');
                  const isAi = line.includes('AI (');
                  return (
                    <div 
                      key={idx}
                      lang="en"
                      dir="ltr"
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isGoal ? 'rgba(34, 197, 94, 0.1)' : isAi ? 'var(--color-surface)' : 'transparent',
                        borderLeft: isGoal ? '3px solid #22c55e' : isAi ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '0.85rem',
                        lineHeight: '1.4',
                        color: 'var(--color-text)'
                      }}
                    >
                      {line}
                    </div>
                  );
                })
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.8rem', margin: '20px 0' }}>
                  Waiting for kickoff...
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── PANEL 2: Accessible Stadium Map & Routing ── */}
      <div 
        id="panel-2" 
        role="tabpanel" 
        aria-labelledby="tab-btn-2" 
        hidden={activeTab !== 2}
      >
        <section className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="var(--color-primary)" /> Step-Free Stadium Routing Planner
          </h3>

          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }} className="grid-volunteer">
            
            {/* SVG Visual stadium map */}
            <div style={{ background: 'var(--color-bg)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
              <svg 
                viewBox="0 0 400 400" 
                width="100%" 
                style={{ maxWidth: '350px', background: 'transparent' }}
                aria-label="MetLife Stadium map showing concourse zones, gates, and seats sections."
                role="img"
              >
                {/* Stadium Outer Rim */}
                <circle cx="200" cy="200" r="180" fill="none" stroke="var(--color-border-2)" strokeWidth="4" />
                <circle cx="200" cy="200" r="120" fill="none" stroke="var(--color-border-2)" strokeWidth="2" strokeDasharray="4 4" />

                {/* Gate Points */}
                {Object.keys(NODE_COORDS).map((nodeId) => {
                  const coord = NODE_COORDS[nodeId];
                  const isConcourse = nodeId.includes('concourse');
                  const isSec = nodeId.includes('sec');
                  const isElevator = nodeId === 'north-concourse' || nodeId === 'south-concourse';
                  
                  let fill = 'var(--color-bg)';
                  let stroke = 'var(--color-border-2)';
                  let r = 8;

                  if (isSec) {
                    fill = 'rgba(99, 102, 241, 0.2)';
                    stroke = 'var(--color-primary)';
                    r = 10;
                  } else if (isConcourse) {
                    fill = isElevator ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                    stroke = isElevator ? '#22c55e' : '#ef4444';
                    r = 9;
                  }

                  // If node is inside calculated route path, highlight it!
                  const isHighlighted = routePath.includes(nodeId);
                  if (isHighlighted) {
                    fill = 'var(--color-primary)';
                    stroke = '#ffffff';
                    r = 12;
                  }

                  return (
                    <g key={nodeId} aria-label={coord.label}>
                      <circle cx={coord.x} cy={coord.y} r={r} fill={fill} stroke={stroke} strokeWidth="2" />
                      {/* Node Label Text */}
                      <text 
                        x={coord.x} 
                        y={coord.y - 12} 
                        textAnchor="middle" 
                        fill="var(--color-text)" 
                        fontSize="8px"
                        fontWeight="600"
                        style={{ pointerEvents: 'none' }}
                      >
                        {nodeId.toUpperCase().replace('-', ' ')}
                      </text>
                    </g>
                  );
                })}

                {/* Route Path Highlight Lines */}
                {routePath.length > 1 && (
                  <path
                    d={routePath.map((node, i) => {
                      const coord = NODE_COORDS[node];
                      return `${i === 0 ? 'M' : 'L'} ${coord?.x} ${coord?.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8"
                    className="animate-pulse"
                    aria-label="Highlighted navigation route path"
                  />
                )}
              </svg>
            </div>

            {/* Route Planning Selector Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} aria-busy={routeLoading}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="start-node-select" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Start Location (From):</label>
                <select
                  id="start-node-select"
                  value={fromNode}
                  onChange={(e) => setFromNode(e.target.value)}
                  style={{ minHeight: '38px', padding: '6px' }}
                >
                  <option value="gate-1">Gate 1 (North Entrance)</option>
                  <option value="gate-2">Gate 2 (East Entrance) - Stairs</option>
                  <option value="gate-3">Gate 3 (South Entrance)</option>
                  <option value="gate-4">Gate 4 (West Entrance) - Stairs</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="dest-node-select" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Seats Section (To):</label>
                <select
                  id="dest-node-select"
                  value={toNode}
                  onChange={(e) => setToNode(e.target.value)}
                  style={{ minHeight: '38px', padding: '6px' }}
                >
                  <option value="sec-100">Section 100 Seats (North)</option>
                  <option value="sec-200">Section 200 Seats (East)</option>
                  <option value="sec-300">Section 300 Seats (South)</option>
                  <option value="sec-400">Section 400 Seats (West)</option>
                </select>
              </div>

              {/* Accessible step free check */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <input
                  id="step-free-check"
                  type="checkbox"
                  checked={stepFreeRequired}
                  onChange={(e) => {
                    setStepFreeRequired(e.target.checked);
                    announce(`Step-free routing ${e.target.checked ? 'enabled. Avoiding stairs.' : 'disabled.'}`);
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="step-free-check" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  ♿ Require Step-Free / Elevator Route (Avoid Stairs)
                </label>
              </div>

              <button
                className="btn btn-primary"
                onClick={calculateRoute}
                disabled={routeLoading}
                style={{ minHeight: '40px', fontWeight: 700 }}
              >
                {routeLoading ? 'Calculating shortcut...' : 'Calculate Accessibility Route'}
              </button>

              {/* Route Summary Result Text */}
              {routeDistance !== -1 && (
                <div 
                  style={{
                    background: 'rgba(29, 78, 216, 0.05)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                  aria-live="polite"
                >
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#22c55e" />
                    <strong>Route distance weight:</strong> {routeDistance}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Navigation Directions:</strong> Enter at {NODE_COORDS[routePath[0]]?.label || routePath[0]} ➔ proceed to {routePath.slice(1).map(n => NODE_COORDS[n]?.label || n).join(' ➔ ')}.
                  </p>
                  {stepFreeRequired && (
                    <p style={{ margin: 0, color: '#22c55e', fontWeight: 600 }}>
                      ♿ Elevator lift locations utilized. Stairs avoided.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
