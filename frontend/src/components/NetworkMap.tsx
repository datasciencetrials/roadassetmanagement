import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Compass, Filter, Layers } from 'lucide-react';
import {
  type BridgeItem,
  type CulvertItem,
  CONDITION_COLORS,
  MAINTENANCE_REGIONS,
  AUTHORITATIVE_NETWORK,
} from '../data/statutoryData';

interface NetworkMapProps {
  bridges: BridgeItem[];
  culverts: CulvertItem[];
}

type AssetFilter = 'all' | 'bridges' | 'culverts';

const CONDITION_OPTIONS = [
  'All Conditions',
  'Good',
  'Satisfactory',
  'Marginal',
  'Poor',
  'Critical',
  'Under Construction',
];

const NetworkMap: React.FC<NetworkMapProps> = ({ bridges, culverts }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Record<string, L.CircleMarker>>({});

  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('All 6 Regions');
  const [conditionFilter, setConditionFilter] = useState<string>('All Conditions');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInfo, setSelectedInfo] = useState<string>(
    'Esri World Imagery + Hybrid Labels active across 6 Maintenance Regions and 23 Maintenance Stations.'
  );

  const filteredBridges = useMemo(() => {
    if (assetFilter === 'culverts') return [];
    const q = searchTerm.trim().toLowerCase();
    return bridges.filter((b) => {
      if (regionFilter !== 'All 6 Regions' && b.region !== regionFilter) return false;
      if (conditionFilter !== 'All Conditions' && b.condition !== conditionFilter) return false;
      if (q) {
        const hay = `${b.id} ${b.name} ${b.road} ${b.station} ${b.river}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return b.lat !== null && b.lng !== null;
    });
  }, [bridges, assetFilter, regionFilter, conditionFilter, searchTerm]);

  const filteredCulverts = useMemo(() => {
    if (assetFilter === 'bridges') return [];
    const q = searchTerm.trim().toLowerCase();
    return culverts.filter((c) => {
      if (regionFilter !== 'All 6 Regions' && c.region !== regionFilter) return false;
      if (conditionFilter !== 'All Conditions' && c.condition !== conditionFilter) return false;
      if (q) {
        const hay = `${c.id} ${c.name} ${c.road} ${c.station} ${c.stream}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return c.lat !== null && c.lng !== null;
    });
  }, [culverts, assetFilter, regionFilter, conditionFilter, searchTerm]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [1.3733, 32.2903],
      zoom: 7,
      zoomControl: true,
      preferCanvas: true,
    });

    // Esri World Imagery + Hybrid Labels (Boundaries/Places + Transportation)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri · Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 18,
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.9,
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.95,
      }
    ).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();
    markerByIdRef.current = {};

    filteredBridges.forEach((b) => {
      if (b.lat === null || b.lng === null) return;
      const color = CONDITION_COLORS[b.condition] || '#0071E3';
      const isB162 = b.id === 'B162';
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: isB162 ? 9 : 6,
        color: '#FFFFFF',
        weight: isB162 ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: 0.92,
      });

      const popupHtml = `
        <div class="mowt-light-popup">
          <div class="mowt-popup-badge" style="background:${color};color:#FFFFFF;">BRIDGE · ${b.condition.toUpperCase()}</div>
          <h4>${b.id}: ${b.name}</h4>
          <p><strong>Road:</strong> ${b.road}</p>
          <p><strong>Class:</strong> ${b.roadClass}</p>
          <p><strong>Surface:</strong> ${b.surface}</p>
          <p><strong>Region / Station:</strong> ${b.region} / ${b.station}</p>
          <p><strong>River / Type:</strong> ${b.river} (${b.type})</p>
          <p><strong>Dimensions:</strong> ${b.lengthM} m length · ${b.widthM} m width · Chainage ${b.chainageKm} km</p>
          <p><strong>Rating / AADT (2026):</strong> ${b.rating ?? 'Not recorded'} / 9 · ${b.aadt2026.toLocaleString('en-GB')} veh/day</p>
          <p><strong>Coordinates:</strong> ${b.lat.toFixed(5)}°, ${b.lng.toFixed(5)}°</p>
        </div>
      `;
      marker.bindPopup(popupHtml, { maxWidth: 320 });
      marker.on('click', () => {
        setSelectedInfo(
          `${b.id} (${b.name}) on ${b.road} · ${b.region} Region (${b.station} Station) · Condition: ${b.condition} (Rating ${b.rating ?? 'N/A'}/9)`
        );
      });
      marker.addTo(group);
      markerByIdRef.current[b.id] = marker;
    });

    filteredCulverts.forEach((c) => {
      if (c.lat === null || c.lng === null) return;
      const color = CONDITION_COLORS[c.condition] || '#7C3AED';
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 4.5,
        color: '#FFFFFF',
        weight: 1.2,
        fillColor: color,
        fillOpacity: 0.88,
      });

      const popupHtml = `
        <div class="mowt-light-popup">
          <div class="mowt-popup-badge" style="background:#7C3AED;color:#FFFFFF;">MAJOR CULVERT · ${c.condition.toUpperCase()}</div>
          <h4>${c.id}: ${c.name}</h4>
          <p><strong>Road:</strong> ${c.road}</p>
          <p><strong>Class:</strong> ${c.roadClass}</p>
          <p><strong>Surface:</strong> ${c.surface}</p>
          <p><strong>Region / Station:</strong> ${c.region} / ${c.station}</p>
          <p><strong>Cells / Length:</strong> ${c.cells} · ${c.lengthM} m · Chainage ${c.chainageKm} km</p>
          <p><strong>Rating / AADT (2026):</strong> ${c.rating ?? 'Not recorded'} / 9 · ${c.aadt2026.toLocaleString('en-GB')} veh/day</p>
          <p><strong>Coordinates:</strong> ${c.lat.toFixed(5)}°, ${c.lng.toFixed(5)}°</p>
        </div>
      `;
      marker.bindPopup(popupHtml, { maxWidth: 320 });
      marker.on('click', () => {
        setSelectedInfo(
          `${c.id} (${c.name}) on ${c.road} · ${c.region} Region (${c.station} Station) · Condition: ${c.condition}`
        );
      });
      marker.addTo(group);
      markerByIdRef.current[c.id] = marker;
    });
  }, [filteredBridges, filteredCulverts]);

  const focusB162 = () => {
    setAssetFilter('all');
    setRegionFilter('All 6 Regions');
    setConditionFilter('All Conditions');
    setSearchTerm('');
    setTimeout(() => {
      const target = bridges.find((b) => b.id === 'B162');
      if (target && target.lat && target.lng && mapRef.current) {
        mapRef.current.setView([target.lat, target.lng], 14, { animate: true });
        const mk = markerByIdRef.current['B162'];
        if (mk) mk.openPopup();
        setSelectedInfo(
          `Focused B162: Atari Bridge on Muyembe - Namalu (Class B, Eastern Region, Mbale Station, Poor condition, Rating 3/9)`
        );
      }
    }, 150);
  };

  const resetView = () => {
    setAssetFilter('all');
    setRegionFilter('All 6 Regions');
    setConditionFilter('All Conditions');
    setSearchTerm('');
    if (mapRef.current) {
      mapRef.current.setView([1.3733, 32.2903], 7, { animate: true });
    }
    setSelectedInfo(
      'National view restored: 21,284.02 km National Road Network, 552 Bridges, and 452 Major Culverts.'
    );
  };

  return (
    <div className="card map-module-card">
      <div className="section-header-row">
        <div className="section-title-group">
          <MapPin size={20} color="#0071E3" />
          <h2>National Road Network &amp; Structures Geospatial Map (Esri World Imagery + Hybrid Labels)</h2>
        </div>
        <div className="status-badge-row">
          <span className="status-pill muted">
            <Layers size={13} />
            Esri World Imagery + Hybrid Transportation &amp; Places
          </span>
        </div>
      </div>

      <div className="map-controls-bar">
        <div className="pill-row">
          <button
            type="button"
            className={`pill-btn ${assetFilter === 'all' ? 'active' : ''}`}
            onClick={() => setAssetFilter('all')}
          >
            All Structures (552 Bridges · 452 Culverts)
          </button>
          <button
            type="button"
            className={`pill-btn ${assetFilter === 'bridges' ? 'active' : ''}`}
            onClick={() => setAssetFilter('bridges')}
          >
            Bridges Only (552)
          </button>
          <button
            type="button"
            className={`pill-btn ${assetFilter === 'culverts' ? 'active' : ''}`}
            onClick={() => setAssetFilter('culverts')}
          >
            Major Culverts Only (452)
          </button>
          <button type="button" className="pill-btn accent-amber" onClick={focusB162}>
            <Compass size={13} /> Focus B162: Atari Bridge
          </button>
          <button type="button" className="pill-btn" onClick={resetView}>
            Reset National View
          </button>
        </div>

        <div className="map-filter-selects">
          <div className="filter-field">
            <Filter size={14} color="#334155" />
            <select
              aria-label="Filter map by region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              {MAINTENANCE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <select
              aria-label="Filter map by condition"
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            type="search"
            className="light-search-input"
            aria-label="Search structure ID, bridge name, or road"
            placeholder="Filter by ID (e.g. B162), bridge, road, or station..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="map-wrapper-grid">
        <div className="leaflet-host" ref={mapContainerRef} />

        <aside className="map-legend-panel">
          <h3>Map Legend &amp; Authoritative Totals</h3>
          <div className="legend-group">
            <div className="legend-heading">National Road Network Extent</div>
            <div className="legend-item">
              <span className="legend-line solid" />
              <span>Paved Roads: {AUTHORITATIVE_NETWORK.pavedKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km (30.10%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line dotted" />
              <span>Unpaved Roads: {AUTHORITATIVE_NETWORK.unpavedKm.toLocaleString('en-GB', { minimumFractionDigits: 2 })} km (69.90%)</span>
            </div>
            <div className="legend-total">Total Extent: 21,284.02 km (100.00%)</div>
          </div>

          <div className="legend-group">
            <div className="legend-heading">Structures Condition Symbology</div>
            {Object.entries(CONDITION_COLORS).map(([cond, color]) => (
              <div className="legend-item" key={cond}>
                <span className="legend-dot" style={{ backgroundColor: color }} />
                <span>{cond}</span>
              </div>
            ))}
            <div className="legend-total">
              552 Bridges · 452 Major Culverts (Separate Registers)
            </div>
          </div>

          <div className="legend-status-box">{selectedInfo}</div>
        </aside>
      </div>
    </div>
  );
};

export default NetworkMap;
