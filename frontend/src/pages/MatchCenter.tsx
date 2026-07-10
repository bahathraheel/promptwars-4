import { useState, useEffect } from 'react';
import { api, type MatchStatus } from '../api/client';
import { Volume2, Sparkles } from 'lucide-react';

export default function MatchCenter() {
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [style, setStyle] = useState<'neutral' | 'hype' | 'tactical'>('neutral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '12px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Match Center</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Live scoreboard & GenAI commentary telemetry feed.
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Scoreboard Card */}
      <section 
        aria-label="Match Scoreboard" 
        className="card" 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: '24px',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, rgba(29, 78, 216, 0.05) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
          <span 
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--color-text-muted)',
              marginBottom: '4px'
            }}
          >
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

      {/* AI Commentary Panel */}
      <section className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--color-primary)" /> AI Live Commentary
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

        {/* Generate Button */}
        <button
          className="btn btn-primary"
          onClick={generateCommentary}
          disabled={loading || (matchStatus ? matchStatus.clockMinutes >= 90 : false)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px' }}
        >
          <Volume2 size={16} />
          {loading ? 'Analyzing Telemetry & Speaking...' : 'Request AI Commentary Flash'}
        </button>

        {/* Commentary Log Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Incident Feed:
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
                Waiting for the referee whistle...
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
