import React, { useState } from 'react';
import { Server, Activity, Layers, ShieldCheck, Database } from 'lucide-react';
import { AUTHORITATIVE_NETWORK, SNAPSHOT_DATE } from '../data/statutoryData';

interface SpecDetail {
  title: string;
  summary: string;
  metrics: string[];
}

const TOPOLOGY_SPECS: Record<string, SpecDetail> = {
  'HDM-4 Pavement Deterioration': {
    title: 'HDM-4 Pavement Deterioration Model',
    summary: 'Evaluates roughness progression (IRI m/km), rutting, and cracking across 6,406.69 km Paved and 14,877.33 km Unpaved National Roads.',
    metrics: [
      'Surface Condition: 12,610.00 km Good (59.20%), 7,844.00 km Fair (36.82%), 848.00 km Poor (3.98%)',
      'Survey Input: ROMDAS(Roughness and rutting machine based testing) & MOBICAP(Road condition assesment tool)',
      'Horizon: Multi-year preservation projection to 2040 as per Vision 2040',
    ],
  },
  'AASHTO Structural Capacity (SNeff)': {
    title: 'AASHTO Structural Capacity (SNeff)',
    summary: 'Computes effective structural number (SNeff), residual pavement life, and subgrade resilient modulus across trunk and primary corridors.',
    metrics: [
      'Paved Network Scope: 6,406.69 km (30.10% of 21,284.02 km)',
      'Subgrade & Layer Evaluation: Deflection basins D1 to D9 normalised to 40 kN standard load',
      'Synchronisation: Unified SQL Database Automated Weekly Refresh',
    ],
  },
  'Vision 2040 Network Preservation Model': {
    title: 'Vision 2040 Network Preservation Model',
    summary: 'Long-term strategic preservation and upgrading model projecting National Road Network condition and traffic demand to 2040.',
    metrics: [
      'Authoritative Extent: 21,284.02 km across 6 Maintenance Regions and 23 Maintenance Stations',
      'Compounded Traffic Growth: 4.5% per annum baseline weighted growth to 2040',
      'Asset Valuation: Aligned with FY 2026/27 national asset valuation baseline',
    ],
  },
  'Multi-Criteria Prioritisation (MCA)': {
    title: 'Multi-Criteria Prioritisation (MCA)',
    summary: 'Ranks periodic maintenance, rehabilitation, and bridge/culvert interventions using condition, traffic, connectivity, and climate resilience weights.',
    metrics: [
      'Critical Structures Flagged: 13 Critical & 52 Poor Bridges; 4 Critical & 1 Poor Major Culvert',
      'Priority Corridor Example: B162 Atari Bridge (Muyembe - Namalu, Class B, Poor, Rating 3)',
      'Reporting Basis: Strictly physical km and % shares',
    ],
  },
  'Bridges & Major Culverts Life-Cycle Costing': {
    title: 'Bridges & Major Culverts Life-Cycle Costing',
    summary: 'Separates 552 Bridges and 452 Major Culverts into distinct inspection and capital intervention profiles.',
    metrics: [
      'Bridges (552): Good 247, Satisfactory 71, Marginal 162, Poor 52, Critical 13, Under Construction 7',
      'Major Culverts (452): Good 403, Satisfactory 39, Marginal 4, Poor 1, Critical 4, Under Construction 1',
      'Visuals: 2D engineering dimensioned schematics, elevation profiles, and inspection records',
    ],
  },
  'Unified SQL Database (Automated Weekly Refresh)': {
    title: 'Unified SQL Database (Automated Weekly Refresh)',
    summary: 'Centralised read-only analytical repository synchronised weekly with field condition surveys and structure registers.',
    metrics: [
      `Latest Snapshot: ${SNAPSHOT_DATE} (dd/mm/yyyy)`,
      'Coverage: 6 Maintenance Regions, 23 Maintenance Stations, 552 Bridges, 452 Major Culverts',
      'Access Mode: Public View-Only Analytical Dashboard',
    ],
  },
};

const TRAFFIC_SPECS: Record<string, SpecDetail> = {
  'ARIS Vision 2040 Compound Growth Engine (4.5% p.a.)': {
    title: 'ARIS Vision 2040 Compound Growth Engine (4.5% p.a.)',
    summary: 'Projects 2026 baseline Annual Average Daily Traffic (AADT) across 14 years to 2040 using a 4.5% annual compound growth factor (1.96x).',
    metrics: [
      'National Weighted Baseline (2026): 5,000 veh/day -> 2040 Projection: 9,801 veh/day',
      'Directional Split: 0.50 peak direction allocation with heavy vehicle equivalence factor 1.2',
      'Horizon: 2026 to 2040 as per Vision 2040',
    ],
  },
  'International Trunk Roads (Class A): 2,604.65 km (12.24%)': {
    title: 'International Trunk Roads (Class A)',
    summary: 'Cross-border strategic corridors linking Uganda to regional East African trade gateways.',
    metrics: [
      'Physical Extent: 2,604.65 km (12.24% of National Road Network)',
      'Representative Corridor AADT (2026): 4,500 veh/day -> 2040 Projection: 8,821 veh/day',
      'Survey Coverage: ROMDAS(Roughness and rutting machine based testing) & MOBICAP(Road condition assesment tool)',
    ],
  },
  'National Trunk Roads (Class B): 2,845.27 km (13.37%)': {
    title: 'National Trunk Roads (Class B)',
    summary: 'Principal inter-regional highways connecting major urban centres and administrative hubs.',
    metrics: [
      'Physical Extent: 2,845.27 km (13.37% of National Road Network)',
      'Representative Corridor AADT (2026): 2,800 veh/day -> 2040 Projection: 5,489 veh/day',
      'Key Structure Example: B162 Atari Bridge on Muyembe - Namalu (Eastern Region, Mbale Station)',
    ],
  },
  'Primary Roads (Class C): 15,689.54 km (73.72%)': {
    title: 'Primary Roads (Class C)',
    summary: 'Extensive feeder and agricultural-access network forming the largest share of the National Road Network.',
    metrics: [
      'Physical Extent: 15,689.54 km (73.72% of National Road Network)',
      'Representative Corridor AADT (2026): 1,200 veh/day -> 2040 Projection: 2,352 veh/day',
      'Surface Composition: Predominantly unpaved gravel corridors targeted for progressive upgrading',
    ],
  },
  'Expressways (Class M): 144.56 km (0.68%)': {
    title: 'Expressways (Class M)',
    summary: 'High-speed, access-controlled dual carriageways serving high-density metropolitan and airport corridors.',
    metrics: [
      'Physical Extent: 144.56 km (0.68% of National Road Network)',
      'Representative Corridor AADT (2026): 8,500 veh/day -> 2040 Projection: 16,662 veh/day',
      'Surface Standard: 100% Paved high-capacity bituminous/concrete carriageway',
    ],
  },
};

const ArisStatus: React.FC = () => {
  const [selectedTopSpec, setSelectedTopSpec] = useState<string | null>(null);
  const [selectedTrafSpec, setSelectedTrafSpec] = useState<string | null>(null);

  const activeTop = selectedTopSpec ? TOPOLOGY_SPECS[selectedTopSpec] : null;
  const activeTraf = selectedTrafSpec ? TRAFFIC_SPECS[selectedTrafSpec] : null;

  return (
    <div className="aris-container card">
      <div className="aris-header">
        <div className="aris-title-group">
          <Server className="aris-icon" size={20} color="#0071E3" />
          <h3>ARIS .NET Engine &amp; Unified SQL Database Status</h3>
        </div>
        <div className="status-badge-row">
          <span className="status-pill online">
            <span className="pulse-dot" />
            ONLINE · UNIFIED SQL DATABASE SYNC
          </span>
          <span className="status-pill muted">
            <Database size={13} />
            AUTOMATED WEEKLY REFRESH · {SNAPSHOT_DATE}
          </span>
        </div>
      </div>

      <div className="aris-kpi-strip">
        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">NATIONAL ROAD NETWORK</div>
          <div className="aris-kpi-value">{AUTHORITATIVE_NETWORK.totalKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km</div>
          <div className="aris-kpi-sub">
            Paved: {AUTHORITATIVE_NETWORK.pavedKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km (30.10%) · Unpaved: {AUTHORITATIVE_NETWORK.unpavedKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km (69.90%)
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">NATIONAL ROAD CONDITION (FY 2025/26)</div>
          <div className="aris-kpi-value" style={{ color: '#16A34A' }}>
            {AUTHORITATIVE_NETWORK.goodKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km Good (59.20%)
          </div>
          <div className="aris-kpi-sub">
            Fair: {AUTHORITATIVE_NETWORK.fairKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km (36.82%) · Poor: {AUTHORITATIVE_NETWORK.poorKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km (3.98%)
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">DECODED FUNCTIONAL CLASSES</div>
          <div className="aris-kpi-value">Class A, B, C &amp; M</div>
          <div className="aris-kpi-sub">
            Class A: 2,604.65 km (12.24%) · Class B: 2,845.27 km (13.37%) · Class C: 15,689.54 km (73.72%) · Class M: 144.56 km (0.68%)
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">BRIDGES REGISTER (SEPARATE)</div>
          <div className="aris-kpi-value" style={{ color: '#0071E3' }}>552 Bridges</div>
          <div className="aris-kpi-sub">
            Good 247 · Satisfactory 71 · Marginal 162 · Poor 52 · Critical 13 · Under Construction 7
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">MAJOR CULVERTS REGISTER (SEPARATE)</div>
          <div className="aris-kpi-value" style={{ color: '#7C3AED' }}>452 Major Culverts</div>
          <div className="aris-kpi-sub">
            Good 403 · Satisfactory 39 · Marginal 4 · Poor 1 · Critical 4 · Under Construction 1
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">SURVEY TOOLS &amp; COVERAGE</div>
          <div className="aris-kpi-value">6 Regions · 23 Stations</div>
          <div className="aris-kpi-sub">
            MOBICAP(Road condition assesment tool) · ROMDAS(Roughness and rutting machine based testing)
          </div>
        </div>
      </div>

      <div className="aris-content">
        <div className="model-group">
          <h4 className="model-title">
            <Layers size={15} color="#0071E3" /> Topology &amp; Preservation Models (Click to Inspect Specification)
          </h4>
          <div className="model-badges">
            {Object.keys(TOPOLOGY_SPECS).map((key) => (
              <button
                key={key}
                type="button"
                className={`pill-btn ${selectedTopSpec === key ? 'active' : ''}`}
                onClick={() => setSelectedTopSpec(selectedTopSpec === key ? null : key)}
              >
                {key}
              </button>
            ))}
          </div>
          {activeTop && (
            <div className="spec-detail-box">
              <h5>{activeTop.title}</h5>
              <p>{activeTop.summary}</p>
              <ul>
                {activeTop.metrics.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="model-group">
          <h4 className="model-title">
            <Activity size={15} color="#16A34A" /> Traffic &amp; Network Classification Models (Click to Inspect Specification)
          </h4>
          <div className="model-badges">
            {Object.keys(TRAFFIC_SPECS).map((key) => (
              <button
                key={key}
                type="button"
                className={`pill-btn ${selectedTrafSpec === key ? 'active' : ''}`}
                onClick={() => setSelectedTrafSpec(selectedTrafSpec === key ? null : key)}
              >
                {key}
              </button>
            ))}
          </div>
          {activeTraf && (
            <div className="spec-detail-box">
              <h5>{activeTraf.title}</h5>
              <p>{activeTraf.summary}</p>
              <ul>
                {activeTraf.metrics.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="sync-footer-note">
          <ShieldCheck size={15} color="#16A34A" />
          <span>
            Unified SQL Database Live Sync: Automated Weekly Refresh active across all 6 Maintenance Regions and 23 Maintenance Stations (Snapshot: {SNAPSHOT_DATE}).
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArisStatus;
