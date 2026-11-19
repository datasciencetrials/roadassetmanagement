import { useEffect, useState } from 'react';
import ArisStatus from './components/ArisStatus';
import NetworkMap from './components/NetworkMap';
import SeparateStructures from './components/SeparateStructures';
import ChatBot from './components/ChatBot';
import TrafficAnalyzer from './components/TrafficAnalyzer';
import ManualSearch from './components/ManualSearch';
import ChartViewer from './components/ChartViewer';
import PlatformDocs from './components/PlatformDocs';
import MindMap from './components/MindMap';
import { type BridgeItem, type CulvertItem, SNAPSHOT_DATE, type StructuresPayload } from './data/statutoryData';
import './App.css';

type TabId =
  | 'all'
  | 'kpis'
  | 'map'
  | 'structures'
  | 'ai-traffic'
  | 'manuals'
  | 'docs'
  | 'mindmap';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All Dashboard Modules' },
  { id: 'kpis', label: 'Engine & Network KPIs (21,284.02 km)' },
  { id: 'map', label: 'Esri Imagery & Hybrid Map' },
  { id: 'structures', label: 'Separate Structures (552 Bridges · 452 Culverts)' },
  { id: 'ai-traffic', label: 'AI Briefings & Vision 2040 Traffic Analyser' },
  { id: 'manuals', label: 'Statutory Manuals & Figures' },
  { id: 'docs', label: 'Platform Documentation' },
  { id: 'mindmap', label: 'Interactive Mind Map' },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [bridges, setBridges] = useState<BridgeItem[]>([]);
  const [culverts, setCulverts] = useState<CulvertItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('./data/structures_clean.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: StructuresPayload) => {
        if (cancelled) return;
        setBridges(Array.isArray(data.bridges) ? data.bridges : []);
        setCulverts(Array.isArray(data.culverts) ? data.culverts : []);
      })
      .catch(() => {
        // Fallback keeps KPIs and charts operational even if offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const show = (tab: TabId) => activeTab === 'all' || activeTab === tab;

  return (
    <div className="app-container">
      <header className="header">
        <h1>Uganda Road Asset Management AI Engine</h1>
        <p className="subtitle">
          Ministry of Works and Transport (MoWT), Department of National Roads · Unified SQL Database (Automated Weekly Refresh) · Vision 2040 Analytics ({SNAPSHOT_DATE})
        </p>
      </header>

      <nav className="module-nav-bar" aria-label="Dashboard Modules">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`pill-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main-stack">
        {show('kpis') && (
          <section>
            <ArisStatus />
          </section>
        )}

        {show('map') && (
          <section>
            <NetworkMap bridges={bridges} culverts={culverts} />
          </section>
        )}

        {show('ai-traffic') && (
          <section className="two-col-grid">
            <ChatBot />
            <TrafficAnalyzer />
          </section>
        )}

        {show('structures') && (
          <section>
            <SeparateStructures bridges={bridges} culverts={culverts} />
          </section>
        )}

        {show('manuals') && (
          <>
            <section>
              <ManualSearch />
            </section>
            <section>
              <ChartViewer />
            </section>
          </>
        )}

        {show('docs') && (
          <section>
            <PlatformDocs />
          </section>
        )}

        {show('mindmap') && (
          <section>
            <MindMap />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
