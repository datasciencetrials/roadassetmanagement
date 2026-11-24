import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';

interface FigureItem {
  id: string;
  label: string;
  title: string;
  src: string;
}

const FIGURES: FigureItem[] = [
  {
    id: 'fig1',
    label: 'Figure 1: Surface & Condition',
    title: 'Figure 1: National Road Surface & Condition Profile (FY 2025/26)',
    src: './chart1.svg',
  },
  {
    id: 'fig2',
    label: 'Figure 2: Classes & Vision 2040',
    title: 'Figure 2: Functional Classification & Vision 2040 Preservation',
    src: './chart2.svg',
  },
  {
    id: 'fig3',
    label: 'Figure 3: 552 Bridges (Separate)',
    title: 'Figure 3: National Bridges Condition & Regional Profile (552 Bridges)',
    src: './chart3.svg',
  },
  {
    id: 'fig4',
    label: 'Figure 4: 452 Major Culverts (Separate)',
    title: 'Figure 4: National Major Culverts Condition & Regional Profile (452 Culverts)',
    src: './chart4.svg',
  },
  {
    id: 'fig5',
    label: 'Figure 5: 2026 Asset Valuation',
    title: 'Figure 5: National Road & Structure Asset Valuation (FY 2025/26)',
    src: './chart5.svg',
  },
];

const ChartViewer: React.FC = () => {
  const [selected, setSelected] = useState<string>('all');

  const visibleFigures = useMemo(() => {
    if (selected === 'all') return FIGURES;
    return FIGURES.filter((f) => f.id === selected);
  }, [selected]);

  return (
    <div className="charts-container card">
      <div className="section-header-row">
        <div className="section-title-group">
          <BarChart3 size={20} color="#0071E3" />
          <h2>Statutory Network &amp; Separate Structures Figures</h2>
        </div>
      </div>

      <div className="pill-row">
        <button
          type="button"
          className={`pill-btn ${selected === 'all' ? 'active' : ''}`}
          onClick={() => setSelected('all')}
        >
          All Figures (5)
        </button>
        {FIGURES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`pill-btn ${selected === f.id ? 'active' : ''}`}
            onClick={() => setSelected(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="charts-grid">
        {visibleFigures.map((f) => (
          <figure key={f.id} className="chart-figure-card">
            <figcaption>{f.title}</figcaption>
            <img src={f.src} alt={f.title} className="chart-svg-img" />
          </figure>
        ))}
      </div>
    </div>
  );
};

export default ChartViewer;
