import React, { useState } from 'react';
import { TrendingUp, Play } from 'lucide-react';

interface CorridorPreset {
  label: string;
  baseAadt: number;
  km: number;
  pct: number;
  growthRate: number;
}

const PRESETS: CorridorPreset[] = [
  { label: 'National Weighted (5,000 AADT)', baseAadt: 5000, km: 21284.02, pct: 100.0, growthRate: 0.045 },
  { label: 'Class A: International Trunk (4,500 AADT)', baseAadt: 4500, km: 2604.65, pct: 12.24, growthRate: 0.045 },
  { label: 'Class B: National Trunk (2,800 AADT)', baseAadt: 2800, km: 2845.27, pct: 13.37, growthRate: 0.045 },
  { label: 'Class C: Primary Roads (1,200 AADT)', baseAadt: 1200, km: 15689.54, pct: 73.72, growthRate: 0.045 },
  { label: 'Class M: Expressways (8,500 AADT)', baseAadt: 8500, km: 144.56, pct: 0.68, growthRate: 0.045 },
];

const TrafficAnalyzer: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [runCount, setRunCount] = useState<number>(1);

  const preset = PRESETS[selectedIdx];
  const years = 14; // 2026 to 2040
  const growthFactor = Math.pow(1 + preset.growthRate, years);
  const projected2040 = Math.round(preset.baseAadt * growthFactor * 1.059); // adjusted with HV factor
  const peakDir2040 = Math.round(projected2040 * 0.5);

  const milestones = [2026, 2030, 2035, 2040].map((yr) => {
    const dt = yr - 2026;
    const val = Math.round(preset.baseAadt * Math.pow(1 + preset.growthRate, dt) * (dt === 0 ? 1 : 1.059));
    return { year: yr, aadt: val };
  });

  return (
    <div className="traffic-analyser card">
      <div className="analyser-header">
        <div className="section-title-group">
          <TrendingUp size={20} color="#16A34A" />
          <h2>ARIS Traffic Analyser · Vision 2040 Engine</h2>
        </div>
        <span className="status-pill muted">HORIZON 2040 · 4.5% P.A.</span>
      </div>

      <div className="pill-row">
        {PRESETS.map((p, idx) => (
          <button
            key={p.label}
            type="button"
            className={`pill-btn ${selectedIdx === idx ? 'active' : ''}`}
            onClick={() => setSelectedIdx(idx)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="analyser-kpi-grid">
        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">BASELINE AADT (2026)</div>
          <div className="aris-kpi-value">{preset.baseAadt.toLocaleString('en-GB')} veh/day</div>
        </div>
        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">PHYSICAL CLASS EXTENT</div>
          <div className="aris-kpi-value">
            {preset.km.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km ({preset.pct.toFixed(2)}%)
          </div>
        </div>
        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">COMPOUND GROWTH &amp; HORIZON</div>
          <div className="aris-kpi-value">4.5% p.a. · 14 Years (to 2040)</div>
        </div>
        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">VEHICLE &amp; DIRECTIONAL FACTORS</div>
          <div className="aris-kpi-value">LV 1.0 · HV 1.2 · Split 0.50</div>
        </div>
      </div>

      <div className="analyser-action-row">
        <button
          type="button"
          className="pill-btn active"
          onClick={() => setRunCount((c) => c + 1)}
        >
          <Play size={14} /> Run ARIS Vision 2040 Model
        </button>
        <span className="footer-meta">Model Cycle #{runCount} · Growth Factor {growthFactor.toFixed(2)}x</span>
      </div>

      <div className="projection-result-box">
        <h4>Projected Vision 2040 Traffic Profile ({preset.label})</h4>
        <div className="projection-grid">
          <div className="proj-metric">
            <span className="proj-label">Total Adjusted AADT (2040)</span>
            <strong className="proj-val" style={{ color: '#0071E3' }}>
              {projected2040.toLocaleString('en-GB')} veh/day
            </strong>
          </div>
          <div className="proj-metric">
            <span className="proj-label">Peak Direction Volume (2040)</span>
            <strong className="proj-val" style={{ color: '#16A34A' }}>
              {peakDir2040.toLocaleString('en-GB')} veh/day
            </strong>
          </div>
        </div>

        <div className="milestone-bar-row">
          {milestones.map((m) => (
            <div key={m.year} className="milestone-chip">
              <span>{m.year}</span>
              <strong>{m.aadt.toLocaleString('en-GB')} veh/day</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrafficAnalyzer;
