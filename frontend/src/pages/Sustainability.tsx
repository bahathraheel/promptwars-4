import { useState } from 'react';
import { Leaf, Loader2, Recycle } from 'lucide-react';
import { api, type SustainabilityResponse } from '../api/client';

const BIN_EMOJI: Record<string, string> = {
  blue: '♻️', green: '🌱', black: '🗑️', yellow: '🔋',
};

const SAMPLE_ITEMS = [
  'plastic water bottle', 'aluminum can', 'pizza box', 'food scraps',
  'paper napkin', 'earbuds', 'battery', 'plastic straw',
];

const ROUTES = [
  { id: 'route-downtown', label: 'Downtown Hotels → Stadium' },
  { id: 'route-airport', label: 'Airport → Stadium' },
  { id: 'route-north-suburbs', label: 'North Suburbs → Stadium' },
];

export default function Sustainability() {
  const announce = (text: string) => {
    if (typeof (window as any).announceAccessibility === 'function') {
      (window as any).announceAccessibility(text);
    }
  };

  const [item, setItem] = useState('');
  const [routeId, setRouteId] = useState('route-downtown');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SustainabilityResponse | null>(null);
  const [error, setError] = useState('');

  const check = async (itemText = item) => {
    if (!itemText.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    announce(`Checking correct waste bin for: ${itemText}...`);
    try {
      const res = await api.sustainability(itemText.trim(), routeId);
      setResult(res);
      announce(`Recommendation: Use the ${res.binColor} ${res.binLabel} bin. ${res.explanation}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      announce(`Waste check failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const binBorderColor: Record<string, string> = {
    blue: '#3b82f6', green: '#22c55e', black: '#6b7280', yellow: '#eab308',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={20} color="var(--color-green)" aria-hidden="true" />
            Sustainability Assistant
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Waste sorting guide · Carbon emissions comparison
          </p>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: '720px' }}>
        {/* ── Bin selector ── */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Recycle size={18} color="var(--color-green)" aria-hidden="true" /> What bin does this go in?
          </h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              id="item-input"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void check(); }}
              placeholder="Describe your item, e.g. 'plastic water bottle'"
              aria-label="Describe the item to find its correct waste bin"
            />
            <button
              className="btn-primary"
              onClick={() => void check()}
              disabled={loading || !item.trim()}
              id="check-bin-btn"
              aria-label="Check which bin to use"
              style={{ flexShrink: 0 }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Leaf size={15} aria-hidden="true" />}
              Check
            </button>
          </div>

          {/* Quick sample chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SAMPLE_ITEMS.map((s) => (
              <button
                key={s}
                className="toggle-pill"
                onClick={() => { setItem(s); void check(s); }}
                aria-label={`Check bin for: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Route selector for emissions */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <label htmlFor="route-select" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
            Compare transport emissions for route:
          </label>
          <select
            id="route-select"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            aria-label="Select travel route for emissions comparison"
          >
            {ROUTES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {result && (
          <div className="animate-fadeInUp" aria-live="polite" aria-label="Sustainability recommendations">
            {/* Bin result */}
            <div
              className="card"
              style={{
                marginBottom: '20px',
                borderColor: binBorderColor[result.binColor] ?? 'var(--color-border)',
                borderWidth: '2px',
              }}
              role="region"
              aria-label={`Bin recommendation: ${result.binLabel}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '3.5rem', lineHeight: 1 }} aria-hidden="true">
                  {BIN_EMOJI[result.binColor] ?? '🗑️'}
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Use the</p>
                  <h3 style={{ color: binBorderColor[result.binColor], fontSize: '1.4rem' }}>
                    {result.binLabel} Bin
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    {result.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Emissions comparison */}
            {result.emissionsComparison && (
              <div className="card" role="region" aria-label="Transport emissions comparison">
                <h3 style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                  🌍 Transport Emissions – {result.emissionsComparison.routeName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: '🚗 Car (solo)', value: result.emissionsComparison.carCO2kg, color: '#ef4444' },
                    { label: '🚌 Shuttle', value: result.emissionsComparison.shuttleCO2kg, color: '#f59e0b' },
                    { label: '🚇 Metro', value: result.emissionsComparison.metroCO2kg, color: '#22c55e' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{value.toFixed(2)} kg CO₂</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${(value / result.emissionsComparison!.carCO2kg) * 100}%`,
                            background: color,
                          }}
                          role="img"
                          aria-label={`${label}: ${value} kg CO2`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', padding: '12px', borderLeft: '3px solid var(--color-green)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  🎉 Taking metro vs. driving saves <strong style={{ color: 'var(--color-green)' }}>
                    {result.emissionsComparison.savingsVsCar.toFixed(2)} kg CO₂
                  </strong> — equivalent to charging ~{Math.round(result.emissionsComparison.savingsVsCar * 100)} smartphones.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
