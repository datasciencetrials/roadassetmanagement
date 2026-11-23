import React, { useState } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MindNode {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  parentId?: string;
  detail: string;
}

const NODES: MindNode[] = [
  {
    id: 'root',
    label: 'National RAMS',
    sublabel: '21,284.02 km Network',
    x: 480,
    y: 250,
    color: '#0071E3',
    detail:
      'Ministry of Works and Transport (MoWT), Department of National Roads: View-only National Road Asset Management System synchronised with the Unified SQL Database.',
  },
  {
    id: 'surface',
    label: 'Surface & Condition',
    sublabel: '30.10% Paved · 69.90% Unpaved',
    x: 170,
    y: 95,
    color: '#16A34A',
    parentId: 'root',
    detail:
      'Paved: 6,406.69 km (30.10%); Unpaved: 14,877.33 km (69.90%). FY 2025/26 Condition: Good 12,610.00 km (59.20%), Fair 7,844.00 km (36.82%), Poor 848.00 km (3.98%).',
  },
  {
    id: 'classes',
    label: 'Functional Classes',
    sublabel: 'Class A, B, C & M',
    x: 165,
    y: 255,
    color: '#0D9488',
    parentId: 'root',
    detail:
      'International Trunk Roads (Class A): 2,604.65 km (12.24%); National Trunk Roads (Class B): 2,845.27 km (13.37%); Primary Roads (Class C): 15,689.54 km (73.72%); Expressways (Class M): 144.56 km (0.68%).',
  },
  {
    id: 'tools',
    label: 'Survey Tools',
    sublabel: 'Field Condition & Roughness',
    x: 170,
    y: 410,
    color: '#D97706',
    parentId: 'root',
    detail:
      'Field surveys execute using MOBICAP(Road condition assesment tool) and ROMDAS(Roughness and rutting machine based testing) in metric units and decimal-degree coordinates.',
  },
  {
    id: 'bridges',
    label: '552 Bridges (Separate)',
    sublabel: 'Includes B162 Atari Bridge',
    x: 790,
    y: 95,
    color: '#DC2626',
    parentId: 'root',
    detail:
      '552 Bridges: Good 247 (44.75%), Satisfactory 71 (12.86%), Marginal 162 (29.35%), Poor 52 (9.42%), Critical 13 (2.36%), Under Construction 7 (1.27%). Includes B162 Atari Bridge (Muyembe - Namalu, Class B, Poor, Rating 3/9).',
  },
  {
    id: 'culverts',
    label: '452 Major Culverts',
    sublabel: 'Separate Register',
    x: 795,
    y: 255,
    color: '#7C3AED',
    parentId: 'root',
    detail:
      '452 Major Culverts: Good 403 (89.16%), Satisfactory 39 (8.63%), Marginal 4 (0.88%), Poor 1 (0.22%), Critical 4 (0.88%), Under Construction 1 (0.22%).',
  },
  {
    id: 'vision2040',
    label: 'Vision 2040 & Regions',
    sublabel: '6 Regions · 23 Stations',
    x: 790,
    y: 410,
    color: '#0071E3',
    parentId: 'root',
    detail:
      'ARIS Vision 2040 Compound Growth Engine (4.5% p.a. to 2040), HDM-4 deterioration, AASHTO (SNeff), and Esri World Imagery + Hybrid Labels mapping across 6 Maintenance Regions and 23 Maintenance Stations.',
  },
];

const MindMap: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('root');
  const [zoom, setZoom] = useState<number>(1);

  const selectedNode = NODES.find((n) => n.id === selectedId) || NODES[0];

  return (
    <div className="card mindmap-container">
      <div className="section-header-row">
        <div className="section-title-group">
          <Network size={20} color="#7C3AED" />
          <h2>Interactive System Mind Map (View-Only Architecture)</h2>
        </div>
        <div className="pill-row">
          <button
            type="button"
            className="pill-btn"
            onClick={() => setZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
          >
            <ZoomIn size={14} /> Zoom In
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.1).toFixed(2))))}
          >
            <ZoomOut size={14} /> Zoom Out
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              setZoom(1);
              setSelectedId('root');
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="pill-row" style={{ marginBottom: '0.85rem' }}>
        {NODES.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`pill-btn ${selectedId === n.id ? 'active' : ''}`}
            onClick={() => setSelectedId(n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="mindmap-layout">
        <div className="mindmap-canvas-wrap">
          <svg
            viewBox="0 0 960 500"
            className="mindmap-svg"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            role="img"
            aria-label="Interactive Mind Map of National Road Asset Management System"
          >
            {NODES.filter((n) => n.parentId).map((node) => {
              const parent = NODES.find((p) => p.id === node.parentId)!;
              const midX = (parent.x + node.x) / 2;
              return (
                <path
                  key={`edge-${node.id}`}
                  d={`M ${parent.x} ${parent.y} C ${midX} ${parent.y}, ${midX} ${node.y}, ${node.x} ${node.y}`}
                  fill="none"
                  stroke={selectedId === node.id ? node.color : '#CBD5E1'}
                  strokeWidth={selectedId === node.id ? 3 : 2}
                />
              );
            })}

            {NODES.map((node) => {
              const isSelected = selectedId === node.id;
              const boxW = node.id === 'root' ? 190 : 228;
              const boxH = 56;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x - boxW / 2}, ${node.y - boxH / 2})`}
                  onClick={() => setSelectedId(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    width={boxW}
                    height={boxH}
                    rx={12}
                    fill="#FFFFFF"
                    stroke={isSelected ? node.color : '#E2E8F0'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <rect width={8} height={boxH} rx={4} fill={node.color} />
                  <text
                    x={18}
                    y={23}
                    fill="#0F172A"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="Arial, sans-serif"
                  >
                    {node.label}
                  </text>
                  <text
                    x={18}
                    y={41}
                    fill="#334155"
                    fontSize="10.5"
                    fontWeight="500"
                    fontFamily="Arial, sans-serif"
                  >
                    {node.sublabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="mindmap-inspector">
          <div className="inspector-badge" style={{ backgroundColor: selectedNode.color }}>
            SELECTED NODE
          </div>
          <h3>{selectedNode.label}</h3>
          <div className="inspector-sub">{selectedNode.sublabel}</div>
          <p>{selectedNode.detail}</p>
        </aside>
      </div>
    </div>
  );
};

export default MindMap;
