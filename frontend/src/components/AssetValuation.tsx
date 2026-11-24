import React, { useState } from 'react';
import { Landmark, TrendingUp } from 'lucide-react';
import { ASSET_VALUATION_2026, SNAPSHOT_DATE } from '../data/statutoryData';

type ValuationView = 'components' | 'history';

const AssetValuation: React.FC = () => {
  const [view, setView] = useState<ValuationView>('components');
  const [basis, setBasis] = useState<'restated' | 'published'>('restated');

  const portfolioCdrc =
    basis === 'restated'
      ? ASSET_VALUATION_2026.restatedPortfolioCdrcMnUsd
      : ASSET_VALUATION_2026.publishedPortfolioCdrcMnUsd;
  const portfolioCrc =
    basis === 'restated'
      ? ASSET_VALUATION_2026.restatedPortfolioCrcMnUsd
      : ASSET_VALUATION_2026.publishedPortfolioCrcMnUsd;
  const portfolioUgxBn =
    basis === 'restated'
      ? ASSET_VALUATION_2026.restatedPortfolioUgxBn
      : ASSET_VALUATION_2026.publishedPortfolioUgxBn;

  return (
    <div className="card valuation-card">
      <div className="section-header-row">
        <div className="section-title-group">
          <Landmark size={20} color="#0071E3" />
          <h2>2026 National Road &amp; Structure Asset Valuation (FY 2025/26)</h2>
        </div>
        <span className="status-pill muted">
          <TrendingUp size={13} />
          CDRC &amp; CRC VALUATION BASELINE · {SNAPSHOT_DATE}
        </span>
      </div>

      <div className="aris-kpi-strip">
        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">TOTAL PORTFOLIO ASSET VALUE (CDRC)</div>
          <div className="aris-kpi-value" style={{ color: '#0071E3' }}>
            USD {portfolioCdrc.toLocaleString('en-GB', { minimumFractionDigits: 2 })} Mn
          </div>
          <div className="aris-kpi-sub">
            UGX {portfolioUgxBn.toLocaleString('en-GB', { minimumFractionDigits: 2 })} Bn (CRC: USD{' '}
            {portfolioCrc.toLocaleString('en-GB', { minimumFractionDigits: 2 })} Mn)
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">NATIONAL ROAD NETWORK VALUE (CDRC)</div>
          <div className="aris-kpi-value" style={{ color: '#16A34A' }}>
            USD {ASSET_VALUATION_2026.roadTotalCdrcMnUsd.toLocaleString('en-GB', { minimumFractionDigits: 2 })} Mn
          </div>
          <div className="aris-kpi-sub">
            Paved: USD 5,918.27 Mn (77% cond.) · Unpaved: USD 817.32 Mn (56% cond.)
          </div>
        </div>

        <div className="aris-kpi-chip">
          <div className="aris-kpi-label">BRIDGES &amp; MAJOR CULVERTS (SEPARATE)</div>
          <div className="aris-kpi-value" style={{ color: '#7C3AED' }}>
            {basis === 'restated' ? 'USD 1,046.79 Mn' : 'USD 1,001.37 Mn'}
          </div>
          <div className="aris-kpi-sub">
            {basis === 'restated'
              ? '552 Bridges: USD 798.88 Mn · 452 Major Culverts: USD 247.91 Mn'
              : '521 Bridges: USD 754.02 Mn · 451 Major Culverts: USD 247.36 Mn'}
          </div>
        </div>
      </div>

      <div className="pill-row" style={{ marginBottom: '0.85rem' }}>
        <button
          type="button"
          className={`pill-btn ${view === 'components' ? 'active' : ''}`}
          onClick={() => setView('components')}
        >
          Component Valuation Breakdown (FY 2025/26)
        </button>
        <button
          type="button"
          className={`pill-btn ${view === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          Historical Trajectory (FY 2017/18 to FY 2025/26)
        </button>
        <button
          type="button"
          className={`pill-btn ${basis === 'restated' ? 'active' : ''}`}
          onClick={() => setBasis('restated')}
        >
          October 2026 Register (552 Bridges · 452 Culverts)
        </button>
        <button
          type="button"
          className={`pill-btn ${basis === 'published' ? 'active' : ''}`}
          onClick={() => setBasis('published')}
        >
          Published Valuation Count (521 Bridges · 451 Culverts)
        </button>
      </div>

      {view === 'components' ? (
        <div className="table-scroll">
          <table className="national_roads-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Asset Component</th>
                <th>Authoritative Scope</th>
                <th>Unit Replacement Rate</th>
                <th>CRC (USD Mn)</th>
                <th>CDRC Asset Value (USD Mn)</th>
                <th>Asset Loss (USD Mn)</th>
                <th>Condition &amp; Basis</th>
              </tr>
            </thead>
            <tbody>
              {ASSET_VALUATION_2026.components.map((row, idx) => {
                const isBridge = row.component.includes('Bridges');
                const isCulvert = row.component.includes('Culverts');
                const crc =
                  basis === 'published' && isBridge
                    ? 944.01
                    : basis === 'published' && isCulvert
                      ? 338.17
                      : row.crcMnUsd;
                const cdrc =
                  basis === 'published' && isBridge
                    ? 754.02
                    : basis === 'published' && isCulvert
                      ? 247.36
                      : row.cdrcMnUsd;
                const loss = Number((crc - cdrc).toFixed(2));
                const scope =
                  basis === 'published' && isBridge
                    ? '521 Bridges (published valuation basis)'
                    : basis === 'published' && isCulvert
                      ? '451 Major Culverts (published valuation basis)'
                      : row.scope;
                return (
                  <tr key={row.component}>
                    <td>{idx + 1}</td>
                    <td><strong>{row.component}</strong></td>
                    <td>{scope}</td>
                    <td>{row.unitRate}</td>
                    <td>{crc.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                    <td><strong>{cdrc.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></td>
                    <td>{loss.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                    <td>{row.conditionNote}</td>
                  </tr>
                );
              })}
              <tr>
                <td>5</td>
                <td><strong>Total National Portfolio</strong></td>
                <td>21,284.02 km Network + Separate Structures</td>
                <td>Blended Portfolio</td>
                <td><strong>{portfolioCrc.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></td>
                <td><strong style={{ color: '#0071E3' }}>{portfolioCdrc.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></td>
                <td><strong>{(portfolioCrc - portfolioCdrc).toFixed(2)}</strong></td>
                <td>UGX {portfolioUgxBn.toLocaleString('en-GB', { minimumFractionDigits: 2 })} Bn (3,700 UGX/USD)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="national_roads-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Financial Year</th>
                <th>Paved Length (km)</th>
                <th>Unpaved Length (km)</th>
                <th>Paved CDRC (USD Mn)</th>
                <th>Unpaved CDRC (USD Mn)</th>
                <th>Total Road CDRC (USD Mn)</th>
              </tr>
            </thead>
            <tbody>
              {ASSET_VALUATION_2026.history.map((yr, idx) => (
                <tr key={yr.fy} className={yr.fy === 'FY 2025/26' ? 'highlight-row' : ''}>
                  <td>{idx + 1}</td>
                  <td><strong>{yr.fy}</strong></td>
                  <td>{yr.pavedKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km</td>
                  <td>{yr.unpavedKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km</td>
                  <td>{yr.pavedCdrcMnUsd.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                  <td>{yr.unpavedCdrcMnUsd.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                  <td><strong>{yr.totalRoadCdrcMnUsd.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssetValuation;
