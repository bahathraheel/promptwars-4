import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Activity, Loader2, AlertTriangle } from 'lucide-react';
import { api, type WhatIfResponse } from '../api/client';

const GATES = [
  { id: 'gate-1', label: 'Gate 1 – North Main' },
  { id: 'gate-2', label: 'Gate 2 – East VIP' },
  { id: 'gate-3', label: 'Gate 3 – South General' },
  { id: 'gate-4', label: 'Gate 4 – West Family' },
];

export default function WhatIf() {
  const [extraFans, setExtraFans] = useState(5000);
  const [gateId, setGateId] = useState('gate-3');
  const [minutesBefore, setMinutesBefore] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [error, setError] = useState('');

  const runSimulation = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.whatIf(extraFans, gateId, minutesBefore);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--color-accent-2)" aria-hidden="true" />
            What-If Simulation
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Scenario planning for surge events · LLM-narrated crowd impact analysis
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* ── Form ── */}
        <div className="card" style={{ marginBottom: '24px', maxWidth: '640px' }}>
          <h3 style={{ marginBottom: '20px' }}>Configure Scenario</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="extra-fans" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Additional fans arriving
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="extra-fans"
                  type="range"
                  min={500}
                  max={20000}
                  step={500}
                  value={extraFans}
                  onChange={(e) => setExtraFans(Number(e.target.value))}
                  style={{ flex: 1, background: 'transparent', accentColor: 'var(--color-primary)' }}
                  aria-label={`Extra fans: ${extraFans.toLocaleString()}`}
                />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', minWidth: '70px', textAlign: 'right' }}>
                  {extraFans.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="gate-select" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Via gate
              </label>
              <select
                id="gate-select"
                value={gateId}
                onChange={(e) => setGateId(e.target.value)}
                aria-label="Select gate for surge scenario"
              >
                {GATES.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="minutes-before" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                In the next <strong style={{ color: 'var(--color-text)' }}>{minutesBefore} minutes</strong>
              </label>
              <input
                id="minutes-before"
                type="range"
                min={5}
                max={120}
                step={5}
                value={minutesBefore}
                onChange={(e) => setMinutesBefore(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                aria-label={`Time window: ${minutesBefore} minutes`}
              />
            </div>

            <button
              className="btn-primary"
              onClick={runSimulation}
              disabled={loading}
              id="run-simulation-btn"
              aria-label={`Run simulation: ${extraFans.toLocaleString()} extra fans via ${gateId} in ${minutesBefore} minutes`}
              style={{ alignSelf: 'flex-start' }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Simulating…</>
                : <><Activity size={15} aria-hidden="true" /> Run Simulation</>}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={16} aria-hidden="true" /> {error}
          </div>
        )}

        {result && (
          <div className="animate-fadeInUp" aria-live="polite" aria-label="Simulation results">
            {/* Narrative */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span aria-hidden="true">📋</span> Scenario Narrative
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>
                  {result.responseTimeMs}ms · {result.modelUsed.split('-').slice(0, 2).join('-')}
                </span>
              </h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>{result.narrative}</p>
            </div>

            <div className="ops-grid" style={{ marginBottom: '20px' }}>
              {/* Bottlenecks */}
              <div className="card">
                <h3 style={{ marginBottom: '12px', color: 'var(--color-red)', fontSize: '0.95rem' }}>
                  ⚠️ Predicted Bottlenecks
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.bottlenecks.map((b, i) => (
                    <li key={i} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--color-red)', fontSize: '1rem' }} aria-hidden="true">●</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mitigations */}
              <div className="card">
                <h3 style={{ marginBottom: '12px', color: 'var(--color-green)', fontSize: '0.95rem' }}>
                  ✅ Recommended Mitigations
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.mitigations.map((m, i) => (
                    <li key={i} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--color-green)', fontSize: '1rem' }} aria-hidden="true">●</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '0.95rem' }}>
                📊 Capacity Impact – Baseline vs. Simulated
              </h3>
              <div style={{ height: '280px' }} aria-label="Bar chart showing baseline versus simulated gate capacity percentages">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: '#1a2235', border: '1px solid #1e2d45', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(v: any, name: any) => [`${v}%`, name === 'baseline' ? 'Baseline' : 'Simulated']}
                    />
                    <Legend formatter={(v) => v === 'baseline' ? 'Baseline' : 'Simulated'} wrapperStyle={{ color: '#94a3b8', fontSize: '0.75rem' }} />
                    <Bar dataKey="baseline" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="simulated" radius={[4, 4, 0, 0]}>
                      {result.chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.simulated >= 90 ? '#ef4444' : entry.simulated >= 75 ? '#f59e0b' : '#ed872d'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
