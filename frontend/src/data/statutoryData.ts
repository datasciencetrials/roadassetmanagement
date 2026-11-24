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
  { label: 'Poor', count: 52, pct: 9.42, color: '#DC2626' },
  { label: 'Critical', count: 13, pct: 2.36, color: '#7F1D1D' },
  { label: 'Under Construction', count: 7, pct: 1.27, color: '#7C3AED' },
];

export const CULVERT_CONDITIONS = [
  { label: 'Good', count: 403, pct: 89.16, color: '#16A34A' },
  { label: 'Satisfactory', count: 39, pct: 8.63, color: '#0D9488' },
  { label: 'Marginal', count: 4, pct: 0.88, color: '#D97706' },
  { label: 'Poor', count: 1, pct: 0.22, color: '#DC2626' },
  { label: 'Critical', count: 4, pct: 0.88, color: '#7F1D1D' },
  { label: 'Under Construction', count: 1, pct: 0.22, color: '#7C3AED' },
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
  Poor: '#DC2626',
  Critical: '#7F1D1D',
  'Under Construction': '#7C3AED',
};

export const MAINTENANCE_STATIONS: string[] = [
  'Arua',
  'Fort Portal',
  'Gulu',
  'Hoima',
  'Ibanda',
  'Jinja',
  'Kabale',
  'Kampala',
  'Kasese',
  'Kitgum',
  'Kotido',
  'Lira',
  'Luwero',
  'Masaka',
  'Masindi',
  'Mbale',
  'Mbarara',
  'Moroto',
  'Moyo',
  'Mpigi',
  'Mubende',
  'Soroti',
  'Tororo',
];

export interface AssetComponentValuation {
  component: string;
  scope: string;
  unitRate: string;
  crcMnUsd: number;
  cdrcMnUsd: number;
  assetLossMnUsd: number;
  conditionNote: string;
}

export interface AssetValuationYear {
  fy: string;
  pavedKm: number;
  unpavedKm: number;
  pavedCdrcMnUsd: number;
  unpavedCdrcMnUsd: number;
  totalRoadCdrcMnUsd: number;
}

export const ASSET_VALUATION_2026 = {
  exchangeRateUgxPerUsd: 3700,
  roadTotalCdrcMnUsd: 6735.59,
  roadTotalCrcMnUsd: 9145.95,
  roadAssetLossMnUsd: 2410.35,
  publishedPortfolioCdrcMnUsd: 7736.96,
  publishedPortfolioCrcMnUsd: 10428.13,
  publishedPortfolioUgxBn: 28626.77,
  restatedPortfolioCdrcMnUsd: 7782.38,
  restatedPortfolioCrcMnUsd: 10485.05,
  restatedPortfolioUgxBn: 28794.82,
  components: [
    {
      component: 'Paved National Roads',
      scope: '6,406.69 km register (6,405.05 km valuation basis)',
      unitRate: '$1.20 Mn / km',
      crcMnUsd: 7686.06,
      cdrcMnUsd: 5918.27,
      assetLossMnUsd: 1767.79,
      conditionNote: 'Condition Factor 0.77 (77%)',
    },
    {
      component: 'Unpaved National Roads',
      scope: '14,877.33 km register (14,896.76 km valuation basis)',
      unitRate: '$0.098 Mn / km',
      crcMnUsd: 1459.88,
      cdrcMnUsd: 817.32,
      assetLossMnUsd: 642.56,
      conditionNote: 'Condition Factor 0.56 (56%)',
    },
    {
      component: 'National Bridges (Separate)',
      scope: '552 Bridges (restated from 521 published count)',
      unitRate: '$1.45 Mn / bridge',
      crcMnUsd: 1000.18,
      cdrcMnUsd: 798.88,
      assetLossMnUsd: 201.3,
      conditionNote: 'Published 521 value: $754.02 Mn CDRC / $944.01 Mn CRC',
    },
    {
      component: 'National Major Culverts (Separate)',
      scope: '452 Major Culverts (restated from 451 published count)',
      unitRate: '$0.55 Mn / culvert',
      crcMnUsd: 338.92,
      cdrcMnUsd: 247.91,
      assetLossMnUsd: 91.01,
      conditionNote: 'Published 451 value: $247.36 Mn CDRC / $338.17 Mn CRC',
    },
  ] as AssetComponentValuation[],
  history: [
    { fy: 'FY 2017/18', pavedKm: 4551.0, unpavedKm: 15993.0, pavedCdrcMnUsd: 2933.0, unpavedCdrcMnUsd: 646.0, totalRoadCdrcMnUsd: 3579.0 },
    { fy: 'FY 2018/19', pavedKm: 5015.0, unpavedKm: 15841.0, pavedCdrcMnUsd: 3220.0, unpavedCdrcMnUsd: 649.0, totalRoadCdrcMnUsd: 3869.0 },
    { fy: 'FY 2019/20', pavedKm: 5398.0, unpavedKm: 15612.0, pavedCdrcMnUsd: 3900.0, unpavedCdrcMnUsd: 610.0, totalRoadCdrcMnUsd: 4510.0 },
    { fy: 'FY 2020/21', pavedKm: 5528.0, unpavedKm: 15497.87, pavedCdrcMnUsd: 4817.65, unpavedCdrcMnUsd: 577.14, totalRoadCdrcMnUsd: 5394.79 },
    { fy: 'FY 2021/22', pavedKm: 5745.0, unpavedKm: 15375.61, pavedCdrcMnUsd: 5042.51, unpavedCdrcMnUsd: 769.38, totalRoadCdrcMnUsd: 5811.88 },
    { fy: 'FY 2022/23', pavedKm: 6056.3, unpavedKm: 15143.9, pavedCdrcMnUsd: 5378.0, unpavedCdrcMnUsd: 876.0, totalRoadCdrcMnUsd: 6254.0 },
    { fy: 'FY 2023/24', pavedKm: 6306.0, unpavedKm: 14982.0, pavedCdrcMnUsd: 5600.0, unpavedCdrcMnUsd: 822.0, totalRoadCdrcMnUsd: 6422.0 },
    { fy: 'FY 2024/25', pavedKm: 6312.0, unpavedKm: 14979.0, pavedCdrcMnUsd: 5832.29, unpavedCdrcMnUsd: 820.0, totalRoadCdrcMnUsd: 6652.29 },
    { fy: 'FY 2025/26', pavedKm: 6405.05, unpavedKm: 14896.76, pavedCdrcMnUsd: 5918.27, unpavedCdrcMnUsd: 817.32, totalRoadCdrcMnUsd: 6735.59 },
  ] as AssetValuationYear[],
};
