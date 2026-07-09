import { useState, useEffect, useCallback } from 'react';
import { BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { api, type AuditEntry } from '../api/client';

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  situation_report:  { label: 'Situation Report', color: '#818cf8', emoji: '📊' },
  action_proposed:   { label: 'Action Proposed',  color: '#94a3b8', emoji: '💡' },
  action_approved:   { label: 'Action Approved',  color: '#22c55e', emoji: '✅' },
  action_rejected:   { label: 'Action Rejected',  color: '#ef4444', emoji: '❌' },
};

function AuditRow({ entry }: { entry: AuditEntry }) {
  const config = TYPE_CONFIG[entry.type] ?? { label: entry.type, color: '#94a3b8', emoji: '📝' };
  return (
    <div className="audit-row" role="listitem" aria-label={`${config.label} at ${new Date(entry.timestamp).toLocaleTimeString()}`}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }} aria-hidden="true">{config.emoji}</span>
      <div style={{ flexShrink: 0, minWidth: '130px', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
        {new Date(entry.timestamp).toLocaleString()}
      </div>
      <span
        className="badge"
        style={{ background: `${config.color}22`, color: config.color, flexShrink: 0 }}
      >
        {config.label}
      </span>
      <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        {entry.actionTitle ?? entry.metadata?.['summary'] as string ?? entry.actionId ?? '—'}
      </div>
      {entry.confidence !== undefined && (
        <div style={{ flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          {(entry.confidence * 100).toFixed(0)}%
        </div>
      )}
      {entry.operatorId && (
        <div style={{ flexShrink: 0, fontSize: '0.7rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
          {entry.operatorId}
        </div>
      )}
    </div>
  );
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLog(100);
      setEntries(res.log);
      setTotal(res.total);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--color-accent-2)" aria-hidden="true" />
            Audit Log
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Immutable record of all AI suggestions and operator decisions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {total} total entries
          </span>
          <button className="btn-ghost" onClick={load} disabled={loading} aria-label="Refresh audit log" id="refresh-audit-btn">
            {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filter pills */}
        <div className="toggle-group" style={{ marginBottom: '20px' }} role="group" aria-label="Filter audit log by type">
          {['all', 'situation_report', 'action_proposed', 'action_approved', 'action_rejected'].map((t) => (
            <button
              key={t}
              className={`toggle-pill ${filter === t ? 'active' : ''}`}
              onClick={() => setFilter(t)}
              aria-pressed={filter === t}
              aria-label={`Show ${t === 'all' ? 'all entries' : t.replace(/_/g, ' ')}`}
            >
              {t === 'all' ? 'All' : TYPE_CONFIG[t]?.emoji + ' ' + (TYPE_CONFIG[t]?.label ?? t)}
            </button>
          ))}
        </div>

        <div className="card">
          {loading && entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} aria-hidden="true" />
              <p>Loading audit log…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
              <p>No entries yet. Generate a situation report in the Ops Dashboard to start logging.</p>
            </div>
          ) : (
            <div role="list" aria-label="Audit log entries">
              {filtered.map((entry) => <AuditRow key={entry.id} entry={entry} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
