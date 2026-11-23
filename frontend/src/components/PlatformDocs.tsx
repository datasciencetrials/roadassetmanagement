import React, { useState } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { SNAPSHOT_DATE } from '../data/statutoryData';

interface DocSection {
  id: string;
  title: string;
  badge: string;
  summary: string;
  bullets: string[];
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'arch',
    title: '1. Platform Architecture & View-Only Governance',
    badge: 'VIEW-ONLY',
    summary:
      'The National Road Asset Management System (RAMS) operates as a public, strictly view-only analytical portal for the Ministry of Works and Transport (MoWT), Department of National Roads.',
    bullets: [
      'Public view-only analytical portal with direct open read access and zero data-entry forms.',
      `Data synchronises automatically from the Unified SQL Database via Automated Weekly Refresh (snapshot ${SNAPSHOT_DATE}).`,
      'All dates strictly follow UK dd/mm/yyyy formatting, all measurements use metric units (km, m, mm, T, km/h), and all geographic coordinates are in decimal degrees.',
    ],
  },
  {
    id: 'network',
    title: '2. Authoritative National Road Network Baseline',
    badge: '21,284.02 km',
    summary:
      'All pavement, traffic, and preservation analytics anchor to the authoritative FY 2026/27 National Road Network extent of 21,284.02 km.',
    bullets: [
      'Surface Composition: Paved 6,406.69 km (30.10%) and Unpaved 14,877.33 km (69.90%).',
      'Functional Classification: International Trunk Roads (Class A) 2,604.65 km (12.24%), National Trunk Roads (Class B) 2,845.27 km (13.37%), Primary Roads (Class C) 15,689.54 km (73.72%), and Expressways (Class M) 144.56 km (0.68%).',
      'Condition Distribution (FY 2025/26): Good 12,610.00 km (59.20%), Fair 7,844.00 km (36.82%), and Poor 848.00 km (3.98%).',
    ],
  },
  {
    id: 'structures',
    title: '3. Separate Bridges & Major Culverts Registers',
    badge: '552 + 452',
    summary:
      'Bridges and Major Culverts maintain distinct structural typologies, inspection sequences, and life-cycle costing profiles, so they are always tabulated and charted separately.',
    bullets: [
      'National Bridges Register: 552 Bridges (Good 247, Satisfactory 71, Marginal 162, Poor 52, Critical 13, Under Construction 7), including priority crossing B162 (Atari Bridge, Muyembe - Namalu, Class B, Eastern Region, Mbale Station).',
      'National Major Culverts Register: 452 Major Culverts (Good 403, Satisfactory 39, Marginal 4, Poor 1, Critical 4, Under Construction 1).',
      'Visuals adhere to 2D engineering dimensioned schematics, elevation profiles, and official inspection metrics without photorealistic or 3D point-cloud previews.',
    ],
  },
  {
    id: 'tools',
    title: '4. Survey Equipment & Vision 2040 Modelling',
    badge: 'VISION 2040',
    summary:
      'Field data acquisition integrates automated and visual condition assessment tools into HDM-4, AASHTO (SNeff), and ARIS Vision 2040 forecasting models.',
    bullets: [
      'Pavement Condition & Roughness: MOBICAP(Road condition assesment tool) and ROMDAS(Roughness and rutting machine based testing).',
      'ARIS Vision 2040 Engine: Applies a 4.5% annual compound traffic growth rate over 14 years (2026 to 2040) with directional split 0.50 and heavy-vehicle factor 1.2.',
      'Geospatial Basemap Standard: Esri World Imagery + Hybrid Labels (World Boundaries and Places and World Transportation overlays) with light-themed controls and popups.',
    ],
  },
];

const PlatformDocs: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<string>('all');

  const visible = activeDoc === 'all' ? DOC_SECTIONS : DOC_SECTIONS.filter((d) => d.id === activeDoc);

  return (
    <div className="card docs-container">
      <div className="section-header-row">
        <div className="section-title-group">
          <FileText size={20} color="#0071E3" />
          <h2>Platform Documentation (View-Only Technical Reference)</h2>
        </div>
        <span className="status-pill muted">APPLE HIG LIGHT · {SNAPSHOT_DATE}</span>
      </div>

      <div className="pill-row">
        <button
          type="button"
          className={`pill-btn ${activeDoc === 'all' ? 'active' : ''}`}
          onClick={() => setActiveDoc('all')}
        >
          All Documentation Sections (4)
        </button>
        {DOC_SECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`pill-btn ${activeDoc === d.id ? 'active' : ''}`}
            onClick={() => setActiveDoc(d.id)}
          >
            {d.title}
          </button>
        ))}
      </div>

      <div className="docs-grid">
        {visible.map((d) => (
          <article key={d.id} className="doc-card">
            <div className="manual-card-header">
              <h3>{d.title}</h3>
              <span className="page-badge">{d.badge}</span>
            </div>
            <p className="doc-summary">{d.summary}</p>
            <ul className="doc-bullets">
              {d.bullets.map((b) => (
                <li key={b}>
                  <CheckCircle2 size={14} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
};

export default PlatformDocs;
