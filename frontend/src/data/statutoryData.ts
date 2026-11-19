export interface BridgeItem {
  id: string;
  name: string;
  road: string;
  roadClass: string;
  surface: string;
  region: string;
  station: string;
  chainageKm: number;
  river: string;
  type: string;
  spans: number | string;
  lengthM: number;
  widthM: number;
  year: number | string;
  rating: number | null;
  condition: string;
  scourRisk: string;
  aadt2026: number;
  lat: number | null;
  lng: number | null;
  isCritical: boolean;
}

export interface CulvertItem {
  id: string;
  name: string;
  road: string;
  roadClass: string;
  surface: string;
  region: string;
  station: string;
  chainageKm: number;
  stream: string;
  cells: number | string;
  lengthM: number;
  rating: number | null;
  condition: string;
  aadt2026: number;
  lat: number | null;
  lng: number | null;
  isCritical: boolean;
}

export interface RegionKmItem {
  region: string;
  pavedKm: number;
  unpavedKm: number;
  totalKm: number;
}

export interface StructuresPayload {
  snapshotDate: string;
  summary: Record<string, number>;
  regionKm: RegionKmItem[];
  bridges: BridgeItem[];
  culverts: CulvertItem[];
}

export const SNAPSHOT_DATE = '19/11/2026';

export const AUTHORITATIVE_NETWORK = {
  totalKm: 21284.02,
  pavedKm: 6406.69,
  pavedPct: 30.1,
  unpavedKm: 14877.33,
  unpavedPct: 69.9,
  goodKm: 12610.0,
  goodPct: 59.2,
  fairKm: 7844.0,
  fairPct: 36.82,
  poorKm: 848.0,
  poorPct: 3.98,
  classAKm: 2604.65,
  classAPct: 12.24,
  classBKm: 2845.27,
  classBPct: 13.37,
  classCKm: 15689.54,
  classCPct: 73.72,
  classMKm: 144.56,
  classMPct: 0.68,
  bridgesTotal: 552,
  culvertsTotal: 452,
};

export const BRIDGE_CONDITIONS = [
  { label: 'Good', count: 247, pct: 44.75, color: '#16A34A' },
  { label: 'Satisfactory', count: 71, pct: 12.86, color: '#0D9488' },
  { label: 'Marginal', count: 162, pct: 29.35, color: '#D97706' },
  { label: 'Poor', count: 52, pct: 9.42, color: '#EA580C' },
  { label: 'Critical', count: 13, pct: 2.36, color: '#DC2626' },
  { label: 'Under Construction', count: 7, pct: 1.27, color: '#0071E3' },
];

export const CULVERT_CONDITIONS = [
  { label: 'Good', count: 403, pct: 89.16, color: '#16A34A' },
  { label: 'Satisfactory', count: 39, pct: 8.63, color: '#0D9488' },
  { label: 'Marginal', count: 4, pct: 0.88, color: '#D97706' },
  { label: 'Poor', count: 1, pct: 0.22, color: '#EA580C' },
  { label: 'Critical', count: 4, pct: 0.88, color: '#DC2626' },
  { label: 'Under Construction', count: 1, pct: 0.22, color: '#0071E3' },
];

export const REGIONAL_BRIDGES = [
  { region: 'Northern', count: 175, pct: 31.7, stations: 'Gulu, Kitgum, Lira' },
  { region: 'Central', count: 107, pct: 19.38, stations: 'Kampala, Luwero, Mpigi, Mubende' },
  { region: 'Eastern', count: 95, pct: 17.21, stations: 'Jinja, Mbale, Soroti, Tororo' },
  { region: 'Southern', count: 80, pct: 14.49, stations: 'Ibanda, Kabale, Masaka, Mbarara' },
  { region: 'North Eastern', count: 49, pct: 8.88, stations: 'Kotido, Moroto' },
  { region: 'Western', count: 46, pct: 8.33, stations: 'Arua, Fort Portal, Hoima, Kasese, Masindi, Moyo' },
];

export const REGIONAL_CULVERTS = [
  { region: 'Western', count: 96, pct: 21.24, stations: 'Arua, Fort Portal, Hoima, Kasese, Masindi, Moyo' },
  { region: 'Eastern', count: 82, pct: 18.14, stations: 'Jinja, Mbale, Soroti, Tororo' },
  { region: 'Northern', count: 76, pct: 16.81, stations: 'Gulu, Kitgum, Lira' },
  { region: 'Southern', count: 75, pct: 16.59, stations: 'Ibanda, Kabale, Masaka, Mbarara' },
  { region: 'North Eastern', count: 69, pct: 15.27, stations: 'Kotido, Moroto' },
  { region: 'Central', count: 54, pct: 11.95, stations: 'Kampala, Luwero, Mpigi, Mubende' },
];

export const MAINTENANCE_REGIONS = [
  'All 6 Regions',
  'Northern',
  'Central',
  'Eastern',
  'Southern',
  'North Eastern',
  'Western',
];

export const CONDITION_COLORS: Record<string, string> = {
  Good: '#16A34A',
  Satisfactory: '#0D9488',
  Marginal: '#D97706',
  Poor: '#EA580C',
  Critical: '#DC2626',
  'Under Construction': '#0071E3',
};
