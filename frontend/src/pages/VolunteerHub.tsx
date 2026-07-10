import { useState, useEffect } from 'react';
import { api, type VolunteerBriefing } from '../api/client';
import { Send, CheckSquare, Square, AlertOctagon, HeartHandshake } from 'lucide-react';

export default function VolunteerHub() {
  const [briefings, setBriefings] = useState<VolunteerBriefing[]>([]);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [category, setCategory] = useState<'medical' | 'congestion' | 'facility' | 'security' | 'other'>('congestion');
  const [gateId, setGateId] = useState('gate-3');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const announce = (text: string) => {
    if (typeof (window as any).announceAccessibility === 'function') {
      (window as any).announceAccessibility(text);
    }
  };

  useEffect(() => {
    const fetchBriefings = async () => {
      setLoading(true);
      try {
        const res = await api.getVolunteerBriefings();
        setBriefings(res.briefings);
      } catch (err) {
        setError('Failed to load briefings');
      } finally {
        setLoading(false);
      }
    };
    fetchBriefings();
  }, []);

  const toggleCheck = (id: string) => {
    setChecklist((prev) => {
      const isChecked = prev.includes(id);
      const title = briefings.find((b) => b.id === id)?.title ?? '';
      if (isChecked) {
        announce(`Unchecked briefing item: ${title}`);
        return prev.filter((item) => item !== id);
      } else {
        announce(`Checked briefing item: ${title}`);
        return [...prev, id];
      }
    });
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 5) {
      setError('Please provide a descriptive report of at least 5 characters');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    announce("Submitting incident report to ops command center...");

    try {
      const payload = { category, gateId, severity, description: description.trim() };
      const res = await api.postVolunteerIncident(payload);
      setSuccess(res.message);
      setDescription('');
      announce(`Incident reported successfully. ${res.message}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit incident';
      setError(msg);
      announce(`Error submitting incident: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '12px' }}>
      <header className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Volunteer Hub</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Check gate safety briefings and report real-time incidents on the ground to the control room.
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '16px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>{success}</div>}

      <div 
        style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: '1fr',
        }}
        className="grid-volunteer"
      >
        {/* Left Column: Briefings Checklist */}
        <section aria-labelledby="briefings-heading" className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <HeartHandshake size={18} color="var(--color-primary)" />
            <h3 id="briefings-heading" style={{ margin: 0, fontSize: '1.1rem' }}>Active Briefings</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>Loading safety briefings...</p>
            ) : briefings.length > 0 ? (
              briefings.map((b) => {
                const isChecked = checklist.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleCheck(b.id)}
                    aria-pressed={isChecked}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      background: isChecked ? 'rgba(29, 78, 216, 0.03)' : 'var(--color-bg)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                      color: 'var(--color-text)'
                    }}
                  >
                    <span style={{ color: isChecked ? 'var(--color-primary)' : 'var(--color-text-muted)', marginTop: '2px' }}>
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, textDecoration: isChecked ? 'line-through' : 'none' }}>
                        {b.title}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {b.content}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>No active briefings at this moment.</p>
            )}
          </div>
        </section>

        {/* Right Column: Incident Report Form */}
        <section aria-labelledby="report-heading" className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertOctagon size={18} color="var(--color-red)" />
            <h3 id="report-heading" style={{ margin: 0, fontSize: '1.1rem' }}>One-Tap Incident Reporter</h3>
          </div>

          <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Category dropdown */}
              <div style={{ flex: 1, minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="inc-category" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Category</label>
                <select
                  id="inc-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ minHeight: '38px', padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  <option value="congestion">Crowd Congestion</option>
                  <option value="medical">Medical Assistance</option>
                  <option value="security">Security Threat</option>
                  <option value="facility">Facility Damage</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              {/* Gate select */}
              <div style={{ flex: 1, minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="inc-gate" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Gate Location</label>
                <select
                  id="inc-gate"
                  value={gateId}
                  onChange={(e) => setGateId(e.target.value)}
                  style={{ minHeight: '38px', padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  <option value="gate-1">Gate 1 (North)</option>
                  <option value="gate-2">Gate 2 (East)</option>
                  <option value="gate-3">Gate 3 (South)</option>
                  <option value="gate-4">Gate 4 (West)</option>
                </select>
              </div>

              {/* Severity select */}
              <div style={{ flex: 1, minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="inc-severity" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Severity</label>
                <select
                  id="inc-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  style={{ minHeight: '38px', padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  <option value="low">Low Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="high">High Severity</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="inc-desc" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Description Details</label>
              <textarea
                id="inc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident (e.g. Queue backing up past turnstiles, steward assistance requested...)"
                rows={3}
                style={{
                  padding: '10px',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '40px',
                fontWeight: 700
              }}
            >
              <Send size={14} />
              {submitting ? 'Submitting Report...' : 'Submit Incident Alert'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
