#!/usr/bin/env python3
"""
Register all FWD (Falling Weight Deflectometer) structural survey files into
pms_source_files (repository_group='fwd_structural') and parse deflection
readings from the structured per-drop xlsx summary workbooks into
pms_fwd_observations.

Recognized layouts (all folded into a small set of flexible column-alias
lookups rather than one branch per exact header spelling, since the same
survey data shows up under many slightly different column names across
files):
  Pattern A: chainage-like column (Chainage/CH/Chainge-typo/'Corrected Chainage (m)'/
             'Imported Chainage (km from source)') + D1..D9-style deflection columns,
             optionally with a per-drop id column (DropID/Drop/Drops/Imp) and/or
             Lane/Force/Stress/Air/Surface columns. Covers the majority of the
             per-drop summary workbooks in this repository.
  Pattern B: raw Dynatest export - Distance/Imp/Load/D0..D6/Air/Pave/Lat/Long/Time
  Pattern C: StationID/DropID/.../Force/D1..D9 ('Drops'/'LHS'/'RHS' sheets) with NO
             direct chainage column - resolved via a companion StationID->Station(km)
             lookup, either a sheet in the same workbook ('Stations'/'StationsLHS'/
             'StationsRHS') or a sibling file in the same folder carrying that lookup.
  Pattern F: Station/'Air T'/'Surf T'/Drop/Load/Pressure/D0..D1200 ('FWD_LHS'/'FWD_RHS'
             sheets) - Station is already a direct km chainage value (not an id needing
             lookup, unlike Pattern C's StationID).

Workbooks that carry BOTH a 'Raw_Data' sheet and separate 'LHS'/'RHS' sheets
(e.g. the FWD_Analysis_Tool_* files) store the same physical drops twice -
once combined with an explicit chainage in Raw_Data, once split by lane and
joined to chainage only via a Stations sheet. Only Raw_Data is parsed in that
case to avoid double-counting.

A couple of "*_Pavement_Structural_Analysis_Template.xlsx" files contain a
deliberately-labeled subsample ("sampled every 20th station... REAL data
from FWD_Analysis_Tool_Kiboga_Hoima.xlsx") of a file already ingested in
full - skipped outright to avoid mixing duplicate/coarser data into the
real dataset.

Raw .fwd / .fwd.txt Dynatest exports (proprietary UTF-16 text format with
per-project calibration headers) are registered for discoverability but not
parsed here - left as a follow-up given the heterogeneous per-file layouts.
"""
import os, sqlite3, time, json, re
import pandas as pd

REPO_MOUNT = os.path.expanduser("~/mnt")
FWD_DIR = os.path.join(REPO_MOUNT, "FWD")
DB_PATH = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/data/traffic_platform.db")
WIN_PREFIX = r"D:\OneDrive\FWD"

SKIP_DUPLICATE_SAMPLE_FILES = {
    'pavement_structural_analysis_template.xlsx',
    'kiboga_hoima_pavement_structural_analysis_template.xlsx',
}

def to_win_path(rel):
    return WIN_PREFIX + "\\" + rel.replace("/", "\\")

def fnum(v):
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None

def ensure_schema(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pms_fwd_observations (
            fwd_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL REFERENCES pms_source_files(source_id),
            link_id TEXT REFERENCES pms_road_links(link_id),
            road_label TEXT,
            lane TEXT,
            chainage_km REAL,
            drop_id INTEGER,
            load_kn REAL,
            stress_kpa REAL,
            d0_um REAL,
            deflections_json TEXT,
            air_temp_c REAL,
            surface_temp_c REAL,
            survey_datetime TEXT,
            data_quality TEXT NOT NULL DEFAULT 'source',
            UNIQUE(source_id, lane, chainage_km, drop_id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_fwd_link ON pms_fwd_observations(link_id)")
    cols = [r[1] for r in cur.execute("PRAGMA table_info(pms_fwd_observations)").fetchall()]
    if 'lon' not in cols:
        cur.execute("ALTER TABLE pms_fwd_observations ADD COLUMN lon REAL")
    if 'lat' not in cols:
        cur.execute("ALTER TABLE pms_fwd_observations ADD COLUMN lat REAL")

def register_all_fwd_files(cur):
    cur.execute("SELECT absolute_path FROM pms_source_files WHERE repository_group='fwd_structural'")
    existing = set(r[0] for r in cur.fetchall())
    n_new = 0
    parseable = []
    for root, dirs, fnames in os.walk(FWD_DIR):
        for fn in fnames:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in ('.fwd', '.txt', '.xlsx', '.xls', '.doc', '.docx', '.pdf', '.csv'):
                continue
            fpath = os.path.join(root, fn)
            rel = os.path.relpath(fpath, FWD_DIR)
            win_path = to_win_path(rel)
            if win_path in existing:
                if ext in ('.xlsx', '.xls'):
                    parseable.append(fpath)
                continue
            try:
                size = os.path.getsize(fpath)
                mtime = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(os.path.getmtime(fpath)))
                cur.execute("""
                    INSERT INTO pms_source_files
                    (repository_group, absolute_path, relative_path, file_name, extension, byte_size, modified_at, ingestion_status, record_count, registered_at)
                    VALUES ('fwd_structural', ?, ?, ?, ?, ?, ?, 'registered', 0, CURRENT_TIMESTAMP)
                """, (win_path, rel, fn, ext, size, mtime))
                n_new += 1
                if ext in ('.xlsx', '.xls'):
                    parseable.append(fpath)
            except Exception as e:
                print(f"  register error {fn}: {e}", flush=True)
    return n_new, parseable

_FOLDER_STATION_CACHE = {}

def _extract_station_map_from_sheet(df):
    """Given a parsed sheet whose header has StationID + Station columns, build {stationid: station_km}."""
    colmap = {str(c).strip().lower().replace(' ', ''): c for c in df.columns}
    c_sid = colmap.get('stationid')
    c_sta = colmap.get('station')
    if not c_sid or not c_sta:
        return {}
    m = {}
    for _, r in df.iterrows():
        sid = fnum(r.get(c_sid))
        sta = fnum(r.get(c_sta))
        if sid is not None and sta is not None:
            m[int(sid)] = sta
    return m

def get_folder_station_map(folder):
    """Scan every xlsx/xls in `folder` for a StationID->Station(km) lookup sheet, cached per folder."""
    if folder in _FOLDER_STATION_CACHE:
        return _FOLDER_STATION_CACHE[folder]
    combined = {}
    try:
        fnames = os.listdir(folder)
    except OSError:
        _FOLDER_STATION_CACHE[folder] = combined
        return combined
    for fn in fnames:
        if os.path.splitext(fn)[1].lower() not in ('.xlsx', '.xls'):
            continue
        fpath = os.path.join(folder, fn)
        try:
            xl = pd.ExcelFile(fpath)
        except Exception:
            continue
        for sheet in xl.sheet_names:
            if 'station' not in sheet.lower():
                continue
            try:
                df = xl.parse(sheet, header=0)
                df.columns = [str(c).strip() for c in df.columns]
            except Exception:
                continue
            m = _extract_station_map_from_sheet(df)
            if m:
                combined.update(m)
    _FOLDER_STATION_CACHE[folder] = combined
    return combined

def try_parse_summary(cur, fpath):
    """Try each recognized per-drop layout. Returns rows inserted, or -1 if no layout matched."""
    rel = os.path.relpath(fpath, FWD_DIR)
    win_path = to_win_path(rel)
    fn = os.path.basename(fpath)
    cur.execute("SELECT source_id, ingestion_status FROM pms_source_files WHERE absolute_path=?", (win_path,))
    row = cur.fetchone()
    if not row:
        return -1
    source_id, status = row
    if status == 'fwd_parsed':
        return 0

    if fn.lower() in SKIP_DUPLICATE_SAMPLE_FILES:
        cur.execute("UPDATE pms_source_files SET ingestion_status='skipped_duplicate_sample', record_count=0, ingested_at=CURRENT_TIMESTAMP WHERE source_id=?", (source_id,))
        return -1

    try:
        xl = pd.ExcelFile(fpath)
    except Exception as e:
        print(f"  cannot open {fn}: {e}", flush=True)
        return -1

    parent_folder = os.path.basename(os.path.dirname(fpath))
    stem = fn.rsplit('.', 1)[0]
    generic = stem.strip().upper() in ('LHS', 'RHS', 'FINAL RHS', 'FINAL LHS', 'RHS 2', 'LHS AND RHS',
                                        'INVERTED RHS', 'SUMMARY LHS', 'SUMMARY LHS 1', 'EXECEL',
                                        'AASHTO CALC', 'SUMMARY ANALYSIS', 'ANALYSIS SUMMARY LHS',
                                        'ANALYSIS SUMMARY RHS', 'RHS  INNER LANE', 'DROPS', 'STATIONS',
                                        'RAW_DATA')
    road_label = f"{parent_folder} - {stem}" if generic and parent_folder.upper() not in ('FWD', '0. MANUALS') else stem
    total_ins = 0
    matched_any_sheet = False
    station_map = None  # lazily built only if a Pattern-C sheet is found

    # Workbooks with a Raw_Data sheet store the LHS/RHS-split sheets as a
    # redundant re-shape of the same drops (joined to chainage only via a
    # separate Stations sheet) - skip those to avoid double-counting.
    has_raw_data = any(s.strip().lower() == 'raw_data' for s in xl.sheet_names)

    for sheet in xl.sheet_names:
        su = sheet.strip().upper()
        if has_raw_data and su in ('LHS', 'RHS'):
            continue
        try:
            raw = xl.parse(sheet, header=None, nrows=6)
        except Exception:
            continue
        header_row_idx, pattern = None, None
        for i in range(min(6, len(raw))):
            vals = [str(v).strip() for v in raw.iloc[i].tolist()]
            lower_ns = [v.lower().replace(' ', '') for v in vals]

            chainage_like = any(('chainage' in v) or (v in ('ch', 'chainge')) for v in lower_ns)
            dropid_like = any(v in ('dropid', 'drop', 'drops', 'imp') or 'dropid' in v for v in lower_ns)
            dcols_present = any(re.fullmatch(r'd\d+', v) for v in lower_ns)
            if chainage_like and (dropid_like or dcols_present):
                header_row_idx, pattern = i, 'A'
                break
            if any(v == 'distance' for v in lower_ns) and any(v == 'load' for v in lower_ns) and any(v == 'd0' for v in lower_ns):
                header_row_idx, pattern = i, 'B'
                break
            if any(v == 'stationid' for v in lower_ns) and any(v == 'dropid' for v in lower_ns) and any(v == 'force' for v in lower_ns):
                header_row_idx, pattern = i, 'C'
                break
            if any(v == 'station' for v in lower_ns) and any(v == 'drop' for v in lower_ns) and any(v == 'load' for v in lower_ns) and dcols_present:
                header_row_idx, pattern = i, 'F'
                break
        if header_row_idx is None:
            continue
        matched_any_sheet = True
        df = xl.parse(sheet, header=header_row_idx)
        df.columns = [str(c).strip() for c in df.columns]
        if len(df) and all(len(str(v)) <= 6 for v in df.iloc[0].tolist() if pd.notna(v)):
            first_vals = [str(v) for v in df.iloc[0].tolist() if pd.notna(v)]
            if first_vals and all(v in ('m', 'Num', 'kN', 'µm', '°C', 'NaN') or v == '' for v in first_vals):
                df = df.iloc[1:].reset_index(drop=True)
        colmap = {c.lower().replace(' ', ''): c for c in df.columns}

        def col(*names):
            for n in names:
                if n in colmap:
                    return colmap[n]
            return None

        d_cols = [c for c in df.columns if re.fullmatch(r'D\d+', str(c).strip())]
        c_lat = col('lat', 'latitude', 'gps1')
        c_lon = col('long', 'lon', 'longitude', 'gps2')
        c_stationid_for_lookup = None
        chain_div = 1.0

        if pattern == 'A':
            c_lane = col('i', 'lane')
            if col('chainage'):
                c_chain, chain_div = col('chainage'), 1.0
            elif col('ch'):
                c_chain, chain_div = col('ch'), 1.0
            elif col('chainge'):
                c_chain, chain_div = col('chainge'), 1.0
            elif col('correctedchainage(m)'):
                c_chain, chain_div = col('correctedchainage(m)'), 1000.0
            elif col('importedchainage(kmfromsource)'):
                c_chain, chain_div = col('importedchainage(kmfromsource)'), 1.0
            else:
                c_chain, chain_div = None, 1.0
            c_drop = col('dropid', 'drop', 'drops', 'imp')
            c_stress = col('stress')
            c_force = col('force', 'load', 'loadkn')
            c_air = col('air', 'airt')
            c_surf = col('surface', 'surft', 'pave')
            c_dt = col('datetime', 'time')
            row_gate = c_drop or c_chain
        elif pattern == 'B':
            c_lane = None
            c_chain = col('distance')
            c_drop = col('imp')
            c_stress = None
            c_force = col('load')
            c_air = col('air')
            c_surf = col('pave')
            c_dt = col('time')
            row_gate = col('load')
        elif pattern == 'F':
            c_lane = None
            c_chain = col('station')
            c_drop = col('drop')
            c_stress = col('pressure')
            c_force = col('load')
            c_air = col('airt')
            c_surf = col('surft')
            c_dt = col('time')
            row_gate = c_drop
        else:  # pattern C - StationID/DropID/.../Force/D1..
            c_lane = None
            c_chain = None
            c_stationid_for_lookup = col('stationid')
            c_drop = col('dropid')
            c_stress = col('stress')
            c_force = col('force')
            c_air = col('air')
            c_surf = col('surface')
            c_dt = col('datetime')
            row_gate = c_drop
            if station_map is None:
                station_map = get_folder_station_map(os.path.dirname(fpath))

        d0_key = 'D0' if 'D0' in df.columns else ('D1' if 'D1' in df.columns else (d_cols[0] if d_cols else None))

        lane_from_sheet = None
        if 'LHS' in su:
            lane_from_sheet = 'LHS'
        elif 'RHS' in su:
            lane_from_sheet = 'RHS'

        for idx, r in df.iterrows():
            gate_val = r.get(row_gate) if row_gate else None
            if pd.isna(gate_val):
                continue
            try:
                lane = lane_from_sheet or (str(r.get(c_lane)).strip() if c_lane and pd.notna(r.get(c_lane)) else None)
                if pattern == 'C':
                    sid = fnum(r.get(c_stationid_for_lookup)) if c_stationid_for_lookup else None
                    chainage = station_map.get(int(sid)) if (sid is not None and station_map) else None
                else:
                    raw_chain = fnum(r.get(c_chain)) if c_chain else None
                    chainage = (raw_chain / chain_div) if raw_chain is not None else None
                deflections = {d: fnum(r.get(d)) for d in d_cols}
                d0 = deflections.get(d0_key) if d0_key else None
                dt_val = r.get(c_dt) if c_dt else None
                dt_str = str(dt_val) if pd.notna(dt_val) else None
                drop_id_val = fnum(r.get(c_drop)) if c_drop else None
                lon_val = fnum(r.get(c_lon)) if c_lon else None
                lat_val = fnum(r.get(c_lat)) if c_lat else None
                if lon_val is not None and not (25 < lon_val < 36):
                    lon_val = None
                if lat_val is not None and not (-3 < lat_val < 5):
                    lat_val = None

                cur.execute("""
                    INSERT OR IGNORE INTO pms_fwd_observations
                    (source_id, link_id, road_label, lane, chainage_km, drop_id, load_kn, stress_kpa,
                     d0_um, deflections_json, air_temp_c, surface_temp_c, survey_datetime, data_quality, lon, lat)
                    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'source', ?, ?)
                """, (source_id, road_label, lane, chainage, int(drop_id_val) if drop_id_val is not None else None,
                      fnum(r.get(c_force)) if c_force else None, fnum(r.get(c_stress)) if c_stress else None,
                      d0, json.dumps(deflections), fnum(r.get(c_air)) if c_air else None,
                      fnum(r.get(c_surf)) if c_surf else None, dt_str, lon_val, lat_val))
                if cur.rowcount:
                    total_ins += 1
            except Exception:
                pass

    cur.execute("UPDATE pms_source_files SET ingestion_status=?, record_count=?, ingested_at=CURRENT_TIMESTAMP WHERE source_id=?",
                ('fwd_parsed' if matched_any_sheet else 'complete', total_ins, source_id))
    return total_ins if matched_any_sheet else -1

def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()
    ensure_schema(cur)
    con.commit()

    n_new, parseable = register_all_fwd_files(cur)
    con.commit()
    print(f"Registered {n_new} new FWD files ({len(parseable)} xlsx/xls candidates for structured parsing)", flush=True)

    n_matched_files = 0
    n_total_obs = 0
    for fpath in parseable:
        result = try_parse_summary(cur, fpath)
        con.commit()
        fn = os.path.basename(fpath)
        if result > 0:
            n_matched_files += 1
            n_total_obs += result
            print(f"  PARSED {fn}: {result} deflection readings", flush=True)
        elif result == 0:
            print(f"  {fn}: already parsed", flush=True)
        else:
            print(f"  {fn}: layout not recognized (registered only)", flush=True)

    print(f"\nDONE. new_files_registered={n_new} xlsx_files_parsed={n_matched_files} total_deflection_readings={n_total_obs}", flush=True)
    con.close()

if __name__ == "__main__":
    main()
