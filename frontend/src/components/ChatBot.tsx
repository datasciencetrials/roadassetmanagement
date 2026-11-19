import React, { useState } from 'react';
import { Bot, ArrowRight } from 'lucide-react';
import { SNAPSHOT_DATE } from '../data/statutoryData';

interface TopicEntry {
  label: string;
  content: string;
}

const TOPICS: TopicEntry[] = [
  {
    label: 'National Network (21,284.02 km)',
    content:
      'National Road Network extent is 21,284.02 km (Paved: 6,406.69 km [30.10%], Unpaved: 14,877.33 km [69.90%]; Good: 12,610.00 km [59.20%], Fair: 7,844.00 km [36.82%], Poor: 848.00 km [3.98%]). Functional breakdown: International Trunk Roads (Class A) 2,604.65 km (12.24%), National Trunk Roads (Class B) 2,845.27 km (13.37%), Primary Roads (Class C) 15,689.54 km (73.72%), and Expressways (Class M) 144.56 km (0.68%).',
  },
  {
    label: '552 Bridges Profile',
    content:
      'The separate National Bridges Register comprises 552 Bridges: Good 247 (44.75%), Satisfactory 71 (12.86%), Marginal 162 (29.35%), Poor 52 (9.42%), Critical 13 (2.36%), and Under Construction 7 (1.27%). Regional distribution: Northern 175 (31.70%), Central 107 (19.38%), Eastern 95 (17.21%), Southern 80 (14.49%), North Eastern 49 (8.88%), and Western 46 (8.33%).',
  },
  {
    label: '452 Major Culverts Profile',
    content:
      'The separate National Major Culverts Register comprises 452 Major Culverts: Good 403 (89.16%), Satisfactory 39 (8.63%), Marginal 4 (0.88%), Poor 1 (0.22%), Critical 4 (0.88%), and Under Construction 1 (0.22%). Regional distribution: Western 96 (21.24%), Eastern 82 (18.14%), Northern 76 (16.81%), Southern 75 (16.59%), North Eastern 69 (15.27%), and Central 54 (11.95%).',
  },
  {
    label: 'B162 Atari Bridge',
    content:
      'B162 (Atari Bridge) is located on Muyembe - Namalu (Class B National Trunk Road, Unpaved Gravel) at chainage 32.50 km in Eastern Region (Mbale Maintenance Station), crossing the Atari River (1.50021°, 34.44423°). Built in 1975 (7.0 m length, 7.6 m overall width, simply supported steel and concrete span), it holds an overall condition rating of 3 / 9 (Poor) with scour risk flagged.',
  },
  {
    label: 'MOBICAP & ROMDAS Tools',
    content:
      'Field pavement condition and roughness surveys across the 21,284.02 km National Road Network are executed using MOBICAP(Road condition assesment tool) and ROMDAS(Roughness and rutting machine based testing). All measurements use metric units (km, m, mm, T, km/h) and decimal-degree coordinates.',
  },
  {
    label: '6 Regions & 23 Stations',
    content:
      'Ministry of Works and Transport (MoWT), Department of National Roads operates across 6 Maintenance Regions (Central, Eastern, North Eastern, Northern, Southern, Western) and 23 Maintenance Stations: Arua, Fort Portal, Gulu, Hoima, Ibanda, Jinja, Kabale, Kampala, Kasese, Kitgum, Kotido, Lira, Luwero, Masaka, Masindi, Mbale, Mbarara, Moroto, Moyo, Mpigi, Mubende, Soroti, and Tororo.',
  },
  {
    label: 'Vision 2040 & SQL Sync',
    content:
      `All traffic forecasts enforce the authoritative 4.5% annual compound growth engine projecting 2026 baselines to 2040 as per Vision 2040 (1.96x growth factor). Data is synchronised via Automated Weekly Refresh (snapshot ${SNAPSHOT_DATE}).`,
  },
];

const ChatBot: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const nextTopic = () => {
    setActiveIdx((prev) => (prev + 1) % TOPICS.length);
  };

  return (
    <div className="chatbot-container card">
      <div className="chatbot-header">
        <div className="section-title-group">
          <Bot size={20} color="#0071E3" />
          <h2>AI Assistant · Statutory Briefings</h2>
        </div>
        <span className="status-pill muted">VIEW-ONLY BRIEFINGS</span>
      </div>

      <div className="pill-row">
        {TOPICS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            className={`pill-btn ${activeIdx === i ? 'active' : ''}`}
            onClick={() => setActiveIdx(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="briefing-stream">
        <div className="briefing-bubble">
          <p>
            Welcome to the View-Only Statutory Intelligence Assistant for the Ministry of Works and Transport (MoWT), Department of National Roads. All metrics are synchronised with the Unified SQL Database via automated weekly refresh (snapshot {SNAPSHOT_DATE}) and project to 2040 as per Vision 2040.
          </p>
          <p className="briefing-highlight">{TOPICS[activeIdx].content}</p>
        </div>
      </div>

      <div className="chatbot-footer-bar">
        <span className="footer-meta">Unified SQL Database · Automated Weekly Refresh</span>
        <button type="button" className="pill-btn active" onClick={nextTopic}>
          Next Statutory Briefing <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
