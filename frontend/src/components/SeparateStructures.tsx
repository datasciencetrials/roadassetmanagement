import React, { useMemo, useState } from 'react';
import { Building2, Search } from 'lucide-react';
import {
  type BridgeItem,
  type CulvertItem,
  MAINTENANCE_REGIONS,
  REGIONAL_BRIDGES,
  REGIONAL_CULVERTS,
  CONDITION_COLORS,
} from '../data/statutoryData';

interface SeparateStructuresProps {
  bridges: BridgeItem[];
  culverts: CulvertItem[];
}

const SeparateStructures: React.FC<SeparateStructuresProps> = ({ bridges, culverts }) => {
  const [regionFilter, setRegionFilter] = useState<string>('All 6 Regions');
  const [bridgeQuery, setBridgeQuery] = useState<string>('');
  const [culvertQuery, setCulvertQuery] = useState<string>('');
  const [showAllBridges, setShowAllBridges] = useState<boolean>(false);
  const [showAllCulverts, setShowAllCulverts] = useState<boolean>(false);

  const visibleRegionalBridges = useMemo(() => {
    if (regionFilter === 'All 6 Regions') return REGIONAL_BRIDGES;
    return REGIONAL_BRIDGES.filter((r) => r.region === regionFilter);
  }, [regionFilter]);

  const visibleRegionalCulverts = useMemo(() => {
    if (regionFilter === 'All 6 Regions') return REGIONAL_CULVERTS;
    return REGIONAL_CULVERTS.filter((r) => r.region === regionFilter);
  }, [regionFilter]);

  const filteredBridges = useMemo(() => {
    const q = bridgeQuery.trim().toLowerCase();
    const list = bridges.filter((b) => {
      if (regionFilter !== 'All 6 Regions' && b.region !== regionFilter) return false;
      if (q) {
        const hay = `${b.id} ${b.name} ${b.road} ${b.station} ${b.condition} ${b.river}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Surface B162 Atari Bridge prominently when searching or viewing Eastern/All
    return [...list].sort((a, b) => {
      if (a.id === 'B162') return -1;
      if (b.id === 'B162') return 1;
      return a.id.localeCompare(b.id);
    });
  }, [bridges, regionFilter, bridgeQuery]);

  const filteredCulverts = useMemo(() => {
    const q = culvertQuery.trim().toLowerCase();
    return culverts.filter((c) => {
      if (regionFilter !== 'All 6 Regions' && c.region !== regionFilter) return false;
      if (q) {
        const hay = `${c.id} ${c.name} ${c.road} ${c.station} ${c.condition} ${c.stream}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [culverts, regionFilter, culvertQuery]);

  const displayedBridges = showAllBridges ? filteredBridges : filteredBridges.slice(0, 12);
  const displayedCulverts = showAllCulverts ? filteredCulverts : filteredCulverts.slice(0, 12);

  return (
    <div className="card structures-card">
      <div className="section-header-row">
        <div className="section-title-group">
          <Building2 size={20} color="#0071E3" />
          <h2>Separate National Structures Registers (552 Bridges | 452 Major Culverts)</h2>
        </div>
      </div>

      <div className="pill-row" style={{ marginBottom: '1rem' }}>
        {MAINTENANCE_REGIONS.map((reg) => (
          <button
            key={reg}
            type="button"
            className={`pill-btn ${regionFilter === reg ? 'active' : ''}`}
            onClick={() => setRegionFilter(reg)}
          >
            {reg}
          </button>
        ))}
      </div>

      <div className="structures-grid">
        <div className="register-block">
          <h3>Table 1: National Bridges Register (552 Bridges Total)</h3>
          <p className="register-subtitle">
            Condition Profile: Good 247 (44.75%) · Satisfactory 71 (12.86%) · Marginal 162 (29.35%) · Poor 52 (9.42%) · Critical 13 (2.36%) · Under Construction 7 (1.27%)
          </p>
          <div className="table-scroll">
            <table className="mowt-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Maintenance Region</th>
                  <th>Bridges</th>
                  <th>Share (%)</th>
                  <th>Maintenance Stations</th>
                </tr>
              </thead>
              <tbody>
                {visibleRegionalBridges.map((r, idx) => (
                  <tr key={r.region}>
                    <td>{idx + 1}</td>
                    <td><strong>{r.region}</strong></td>
                    <td>{r.count}</td>
                    <td>{r.pct.toFixed(2)}%</td>
                    <td>{r.stations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="register-filter-bar">
            <div className="search-box-inline">
              <Search size={14} color="#334155" />
              <input
                type="search"
                aria-label="Filter Bridges Register"
                placeholder="Search Bridge ID (e.g. B162), name (Atari Bridge), road, or station..."
                value={bridgeQuery}
                onChange={(e) => setBridgeQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="pill-btn"
              onClick={() => setBridgeQuery('B162')}
            >
              Locate B162: Atari Bridge
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => setShowAllBridges(!showAllBridges)}
            >
              {showAllBridges ? 'Show Compact Bridge View' : `Expand Bridges (${filteredBridges.length} Bridges)`}
            </button>
          </div>

          <div className="table-scroll">
            <table className="mowt-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Bridge ID</th>
                  <th>Bridge Name</th>
                  <th>Road Name</th>
                  <th>Region / Station</th>
                  <th>Rating</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {displayedBridges.map((b, i) => (
                  <tr key={b.id} className={b.id === 'B162' ? 'highlight-row' : ''}>
                    <td>{i + 1}</td>
                    <td><strong>{b.id}</strong></td>
                    <td>{b.name}</td>
                    <td>{b.road}</td>
                    <td>{b.region} · {b.station}</td>
                    <td>{b.rating ?? 'Not recorded'} / 9</td>
                    <td>
                      <span
                        className="condition-pill"
                        style={{
                          borderColor: CONDITION_COLORS[b.condition] || '#334155',
                          color: CONDITION_COLORS[b.condition] || '#0F172A',
                        }}
                      >
                        {b.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="register-block">
          <h3>Table 2: National Major Culverts Register (452 Major Culverts Total)</h3>
          <p className="register-subtitle">
            Condition Profile: Good 403 (89.16%) · Satisfactory 39 (8.63%) · Marginal 4 (0.88%) · Poor 1 (0.22%) · Critical 4 (0.88%) · Under Construction 1 (0.22%)
          </p>
          <div className="table-scroll">
            <table className="mowt-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Maintenance Region</th>
                  <th>Major Culverts</th>
                  <th>Share (%)</th>
                  <th>Maintenance Stations</th>
                </tr>
              </thead>
              <tbody>
                {visibleRegionalCulverts.map((r, idx) => (
                  <tr key={r.region}>
                    <td>{idx + 1}</td>
                    <td><strong>{r.region}</strong></td>
                    <td>{r.count}</td>
                    <td>{r.pct.toFixed(2)}%</td>
                    <td>{r.stations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="register-filter-bar">
            <div className="search-box-inline">
              <Search size={14} color="#334155" />
              <input
                type="search"
                aria-label="Filter Major Culverts Register"
                placeholder="Search Culvert ID (e.g. C001), road, station, or condition..."
                value={culvertQuery}
                onChange={(e) => setCulvertQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="pill-btn"
              onClick={() => setShowAllCulverts(!showAllCulverts)}
            >
              {showAllCulverts ? 'Show Compact Culvert View' : `Expand Major Culverts (${filteredCulverts.length} Culverts)`}
            </button>
          </div>

          <div className="table-scroll">
            <table className="mowt-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Culvert ID</th>
                  <th>Crossing</th>
                  <th>Road Name</th>
                  <th>Region / Station</th>
                  <th>Rating</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {displayedCulverts.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td><strong>{c.id}</strong></td>
                    <td>{c.name}</td>
                    <td>{c.road}</td>
                    <td>{c.region} · {c.station}</td>
                    <td>{c.rating ?? 'Not recorded'} / 9</td>
                    <td>
                      <span
                        className="condition-pill"
                        style={{
                          borderColor: CONDITION_COLORS[c.condition] || '#334155',
                          color: CONDITION_COLORS[c.condition] || '#0F172A',
                        }}
                      >
                        {c.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeparateStructures;
