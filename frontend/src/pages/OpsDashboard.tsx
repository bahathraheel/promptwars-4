import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Loader2, Users, AlertTriangle, Zap, Clock } from 'lucide-react';
import { api, type SituationReport, type SensorReading, type ProposedAction } from '../api/client';

// ── Gate capacity card ─────────────────────────────────────────────────────
function GateCard({ reading }: { reading: SensorReading }) {
  const fillClass =
    reading.alertLevel === 'critical' ? 'progress-fill-critical' :
    reading.alertLevel === 'elevated' ? 'progress-fill-elevated' : 'progress-fill-normal';

  return (
    <div className={`gate-card ${reading.alertLevel}`} aria-label={`${reading.gateId} status: ${reading.alertLevel}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
          {reading.gateId.replace('-', ' ').toUpperCase()}
        </strong>
        <span className={`badge badge-${reading.alertLevel}`}>{reading.alertLevel}</span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
          <span>Capacity</span>
          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{reading.capacityPct.toFixed(0)}%</span>
        </div>
        <div className="progress-bar-track" role="progressbar" aria-valuenow={reading.capacityPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${reading.gateId} capacity ${reading.capacityPct}%`}>
          <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${reading.capacityPct}%` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{reading.flowRatePerMin.toFixed(0)}/min</div>
          <div>Flow rate</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{reading.waitTimeMinutes.toFixed(1)} min</div>
          <div>Wait time</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{reading.occupancy.toLocaleString()}</div>
          <div>Occupancy</div>
        </div>
      </div>
    </div>
  );
}

// ── Action card with HITL buttons ─────────────────────────────────────────
function ActionCard({
  action,
  onDecide,
}: {
  action: ProposedAction;
  onDecide: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
}) {
  const [deciding, setDeciding] = useState(false);

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    setDeciding(true);
    await onDecide(action.id, decision);
    setDeciding(false);
  };

  const categoryIcon: Record<string, string> = {
    open_gate: '🚪', close_gate: '🔒', reroute_fans: '🔀',
    redeploy_volunteers: '👷', adjust_shuttle: '🚌',
    medical_alert: '🏥', pa_announcement: '📢', other: '⚡',
  };

  return (
    <div className={`action-card ${action.status}`} aria-label={`Action: ${action.title}, status: ${action.status}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }} aria-hidden="true">
            {categoryIcon[action.category] ?? '⚡'}
          </span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{action.title}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Priority #{action.priority} · Confidence {(action.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <span className={`badge badge-${action.status === 'pending' ? 'pending' : action.status === 'approved' ? 'normal' : 'critical'}`}>
          {action.status}
        </span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{action.description}</p>

      <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.75rem', borderLeft: '3px solid var(--color-accent)' }}>
        <strong style={{ color: 'var(--color-accent-2)' }}>Rationale:</strong>{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>{action.rationale}</span>
      </div>

      {action.affectedGates.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {action.affectedGates.map((g) => (
            <span key={g} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{g}</span>
          ))}
        </div>
      )}

      {/* HITL buttons — require explicit human approval */}
      {action.status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px' }} role="group" aria-label={`Approve or reject: ${action.title}`}>
          <button
            className="btn-approve"
            onClick={() => void handleDecide('approved')}
            disabled={deciding}
            aria-label={`Approve action: ${action.title}`}
            id={`approve-${action.id}`}
          >
            {deciding ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <CheckCircle size={14} aria-hidden="true" />}
            Approve
          </button>
          <button
            className="btn-reject"
            onClick={() => void handleDecide('rejected')}
            disabled={deciding}
            aria-label={`Reject action: ${action.title}`}
            id={`reject-${action.id}`}
          >
            <XCircle size={14} aria-hidden="true" />
            Reject
          </button>
        </div>
      )}

      {action.status !== 'pending' && action.decidedAt && (
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
          {action.status === 'approved' ? '✅ Approved' : '❌ Rejected'} at{' '}
          {new Date(action.decidedAt).toLocaleTimeString()} by {action.decidedBy}
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function OpsDashboard() {
  const [report, setReport] = useState<SituationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [error, setError] = useState('');

  const loadExistingReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getReport();
      setReport(res.report);
      setActions(res.report.proposedActions);
    } catch {
      // No report yet — that's fine
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.generateReport();
      setReport(res.report);
      setActions(res.report.proposedActions);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDecide = useCallback(async (actionId: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await api.decideAction(actionId, decision);
      setActions((prev) => prev.map((a) => (a.id === actionId ? res.action : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed');
    }
  }, []);

  useEffect(() => {
    void loadExistingReport();
  }, [loadExistingReport]);

  const pendingCount = actions.filter((a) => a.status === 'pending').length;
  const criticalGates = report?.crowdSnapshot.readings.filter((r) => r.alertLevel === 'critical') ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-dot" aria-hidden="true" />
            Ops Control Room
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Human-in-the-loop crowd intelligence · No autonomous actions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {lastRefresh && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} aria-hidden="true" />
              Last: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn-primary"
            onClick={generateReport}
            disabled={generating}
            aria-label="Generate new situation report from latest sensor data"
            id="generate-report-btn"
          >
            {generating
              ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              : <RefreshCw size={15} aria-hidden="true" />}
            {generating ? 'Analyzing…' : 'Generate Report'}
          </button>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={16} aria-hidden="true" /> {error}
          </div>
        )}

        {/* ── KPI strip ── */}
        {report && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Overall Occupancy', value: `${report.crowdSnapshot.overallOccupancyPct}%`, icon: <Users size={18} aria-hidden="true" />, color: 'var(--color-primary)' },
              { label: 'Pending Actions', value: pendingCount, icon: <Zap size={18} aria-hidden="true" />, color: pendingCount > 0 ? 'var(--color-gold)' : 'var(--color-green)' },
              { label: 'Critical Gates', value: criticalGates.length, icon: <AlertTriangle size={18} aria-hidden="true" />, color: criticalGates.length > 0 ? 'var(--color-red)' : 'var(--color-green)' },
              { label: 'Gates Monitored', value: report.crowdSnapshot.readings.length, icon: <CheckCircle size={18} aria-hidden="true" />, color: 'var(--color-accent-2)' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{label}</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</p>
                  </div>
                  <div style={{ color }}>{icon}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && !report && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} aria-hidden="true" />
            <p>Loading report…</p>
          </div>
        )}

        {!report && !loading && (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏟️</div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              No situation report yet. Click "Generate Report" to analyze current crowd conditions.
            </p>
            <button className="btn-primary" onClick={generateReport} id="first-report-btn" aria-label="Generate first situation report">
              <Zap size={15} aria-hidden="true" /> Generate First Report
            </button>
          </div>
        )}

        {report && (
          <>
            {/* ── Situation summary ── */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span aria-hidden="true">📊</span> Situation Summary
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>
                  Model: {report.llmModelUsed.split('-').slice(0, 2).join('-')}
                </span>
              </h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>{report.summary}</p>
            </div>

            {/* ── Gate cards ── */}
            <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Gate Status</h3>
            <div className="ops-grid" style={{ marginBottom: '32px' }}>
              {report.crowdSnapshot.readings.map((r) => (
                <GateCard key={r.gateId} reading={r} />
              ))}
            </div>

            {/* ── Actions ── */}
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Recommended Actions
              {pendingCount > 0 && (
                <span className="badge badge-elevated">{pendingCount} pending approval</span>
              )}
            </h3>
            {actions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                No actions proposed for current conditions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {actions.map((a) => (
                  <ActionCard key={a.id} action={a} onDecide={handleDecide} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
