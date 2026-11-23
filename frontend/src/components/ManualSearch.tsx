import React, { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { SNAPSHOT_DATE } from '../data/statutoryData';

interface ManualItem {
  category: string;
  title: string;
  page: string;
  text: string;
}

const MANUALS: ManualItem[] = [
  {
    category: 'Road Network & Condition (21,284.02 km)',
    title: 'Road Asset Management Manual 2026',
    page: 'Page 18',
    text: 'National Road Network statutory extent is 21,284.02 km, comprising 6,406.69 km Paved (30.10%) and 14,877.33 km Unpaved (69.90%) across International Trunk Roads (Class A: 2,604.65 km, 12.24%), National Trunk Roads (Class B: 2,845.27 km, 13.37%), Primary Roads (Class C: 15,689.54 km, 73.72%), and Expressways (Class M: 144.56 km, 0.68%). FY 2025/26 condition is 12,610.00 km Good (59.20%), 7,844.00 km Fair (36.82%), and 848.00 km Poor (3.98%).',
  },
  {
    category: '552 Bridges Register',
    title: 'National Bridges Inspection Guidelines (552 Bridges)',
    page: 'Page 44',
    text: `The separate National Bridges Register (as at ${SNAPSHOT_DATE}) comprises 552 Bridges: Good 247 (44.75%), Satisfactory 71 (12.86%), Marginal 162 (29.35%), Poor 52 (9.42%), Critical 13 (2.36%), and Under Construction 7 (1.27%). Regional distribution comprises Northern 175, Central 107, Eastern 95, Southern 80, North Eastern 49, and Western 46, including priority crossing B162 (Atari Bridge, Muyembe - Namalu).`,
  },
  {
    category: '452 Major Culverts Register',
    title: 'National Major Culverts Guidelines (452 Major Culverts)',
    page: 'Page 51',
    text: `The separate National Major Culverts Register (as at ${SNAPSHOT_DATE}) comprises 452 Major Culverts: Good 403 (89.16%), Satisfactory 39 (8.63%), Marginal 4 (0.88%), Poor 1 (0.22%), Critical 4 (0.88%), and Under Construction 1 (0.22%). Regional distribution comprises Western 96, Eastern 82, Northern 76, Southern 75, North Eastern 69, and Central 54 across the 21,284.02 km network.`,
  },
  {
    category: 'Condition Survey Standards',
    title: 'Condition Survey & Equipment Standards',
    page: 'Page 29',
    text: `Field condition monitoring across the 21,284.02 km National Road Network uses MOBICAP(Road condition assesment tool) and ROMDAS(Roughness and rutting machine based testing) in metric units (km, m, mm, T, km/h) with decimal-degree coordinates, synchronised to the Unified SQL Database with automated weekly refresh (snapshot ${SNAPSHOT_DATE}).`,
  },
  {
    category: 'Vision 2040 & Traffic',
    title: 'Traffic & Vision 2040 Design Guide',
    page: 'Page 62',
    text: 'Axle load and traffic forecasting models enforce an authoritative 4.5% annual weighted compound growth rate projecting all findings to 2040 as per Vision 2040, integrated with HDM-4 pavement deterioration and AASHTO Structural Capacity (SNeff) modelling via the Unified SQL Database.',
  },
  {
    category: '6 Regions & 23 Stations',
    title: 'Regional & Maintenance Station Operations',
    page: 'Page 75',
    text: 'Ministry of Works and Transport (MoWT), Department of National Roads operates across 6 Maintenance Regions (Central, Eastern, North Eastern, Northern, Southern, Western) and 23 Maintenance Stations: Arua, Fort Portal, Gulu, Hoima, Ibanda, Jinja, Kabale, Kampala, Kasese, Kitgum, Kotido, Lira, Luwero, Masaka, Masindi, Mbale, Mbarara, Moroto, Moyo, Mpigi, Mubende, Soroti, and Tororo.',
  },
];

const CATEGORIES = ['All Statutory Manuals (6)', ...MANUALS.map((m) => m.category)];

const ManualSearch: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<string>('All Statutory Manuals (6)');

  const filtered = useMemo(() => {
    if (selectedCat === 'All Statutory Manuals (6)') return MANUALS;
    return MANUALS.filter((m) => m.category === selectedCat);
  }, [selectedCat]);

  return (
    <div className="search-container card">
      <div className="section-header-row">
        <div className="section-title-group">
          <BookOpen size={20} color="#0071E3" />
          <h2>Statutory Asset Management Manuals &amp; Technical Guidelines</h2>
        </div>
        <span className="status-pill muted">VIEW-ONLY STATUTORY REPOSITORY · {SNAPSHOT_DATE}</span>
      </div>

      <div className="pill-row">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`pill-btn ${selectedCat === c ? 'active' : ''}`}
            onClick={() => setSelectedCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="manuals-grid">
        {filtered.map((m) => (
          <article key={m.title} className="manual-card">
            <div className="manual-card-header">
              <h4>{m.title}</h4>
              <span className="page-badge">{m.page}</span>
            </div>
            <p className="result-snippet">{m.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ManualSearch;
