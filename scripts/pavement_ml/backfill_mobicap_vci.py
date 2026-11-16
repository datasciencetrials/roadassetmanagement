#!/usr/bin/env python3
"""
Backfill VCI + defect-level condition observations from the real MobiCap Paved
Network visual condition survey workbooks (2024-25 and 2025-26) into
pms_condition_observations / pms_source_files. These workbooks are segment-level
(GPS-tagged sub-sections of each link) visual condition surveys with a computed
VCI and individual defect ratings (rutting, cracking, ravelling, bleeding,
potholes, shoulder condition) - previously registered nowhere in the database
(VCI coverage was 1.2%, PCI/defects ~0.1%).
"""
import os, sqlite3, time, json
import pandas as pd

REPO_MOUNT = os.path.expanduser("~/mnt/Uganda National Road Network Repository")
DB_PATH = os.path.join(REPO_MOUNT, "ugnrms", "data", "traffic_platform.db")
WIN_PREFIX = r"D:\OneDrive\Uganda National Road Network Repository"

FILES = [
    ("5.Road Condition Data/2021-22/Mobicap Paved Network - Combined  2021-22.xlsx", 2021, "Mobicap Paved"),
    ("5.Road Condition Data/2022-23/Mobicap Paved Network - Combined  2022-23.xlsx", 2022, "Mobicap Paved"),
    ("5.Road Condition Data/2024-25/Mobicap Paved Network - Combined  2024-25.xlsx", 2024, "Mobicap Paved"),
    ("5.Road Condition Data/2025-26/Mobicap Paved Network - Combined  2025-26.xlsx", 2025, "Mobicap Paved"),
]

COLS = ['GISID','RoadCode','RoadName','Link','SegmentStart','SegmentEnd','Date','vci',
        'Weighted VCI','Potholes','NrofPotholes/Failures','Potholedepth','Cracksall','Crackswide',
        'Ravelling/Disintegration','Bleeding','L/Rutting','R/Rutting','Rutting','Roughness',
        'Region','Station','Link ID','Link_ID','SegmentLength','gps1','gps2']

def to_win_path(rel):
    return WIN_PREFIX + "\\" + rel.replace("/", "\\")

def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()
    cur.execute("SELECT link_id FROM pms_road_links")
    valid_links = set(r[0] for r in cur.fetchall())
    print(f"{len(valid_links)} known road links")

    total_inserted = 0
    total_updated = 0
    total_unmatched_links = 0

    for rel_path, default_year, sheet_name in FILES:
        abs_path = os.path.join(REPO_MOUNT, rel_path)
        win_path = to_win_path(rel_path)
        if not os.path.exists(abs_path):
            print(f"MISSING: {abs_path}")
            continue
        size = os.path.getsize(abs_path)
        mtime = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(os.path.getmtime(abs_path)))

        # Register (or reuse) source file - VCI/defect backfill runs regardless of prior
        # ingestion_status, since an earlier pass may have only extracted IRI/rutting.
        cur.execute("SELECT source_id, ingestion_status FROM pms_source_files WHERE absolute_path=?", (win_path,))
        row = cur.fetchone()
        if row:
            source_id, status = row
            if status == 'vci_backfilled':
                print(f"  {rel_path}: already vci-backfilled, skipping")
                continue
        else:
            cur.execute("""
                INSERT INTO pms_source_files
                (repository_group, absolute_path, relative_path, file_name, extension, byte_size, modified_at, ingestion_status, record_count, registered_at)
                VALUES ('road_condition', ?, ?, ?, '.xlsx', ?, ?, 'registered', 0, CURRENT_TIMESTAMP)
            """, (win_path, rel_path, os.path.basename(rel_path), size, mtime))
            source_id = cur.lastrowid
            con.commit()

        # Build a lookup of existing observation rows for this source (for UPDATE-in-place)
        cur.execute("""SELECT observation_id, link_id, chainage_from_km, chainage_to_km, vci
                        FROM pms_condition_observations WHERE source_id=?""", (source_id,))
        existing_obs = {}
        for obs_id, l_id, c_from, c_to, existing_vci in cur.fetchall():
            existing_obs[(l_id, round(c_from, 3) if c_from is not None else None,
                          round(c_to, 3) if c_to is not None else None)] = (obs_id, existing_vci)
        print(f"  {len(existing_obs)} existing observation rows for this source")

        print(f"Reading {rel_path} ...")
        df = pd.read_excel(abs_path, sheet_name=sheet_name)
        # Row 0 is a units/code sub-header (e.g. 'date', '(rating)', 'pnpo') - drop it
        df = df.iloc[1:].reset_index(drop=True)
        print(f"  {len(df)} segment rows")

        n_ins = 0
        n_unmatched = 0
        for idx, row in df.iterrows():
            link_id = row.get('Link_ID')
            if pd.isna(link_id):
                link_id = row.get('Link ID')
            if pd.isna(link_id):
                continue
            link_id = str(link_id).strip()
            if link_id not in valid_links:
                n_unmatched += 1
                continue

            try:
                date_raw = row.get('Date')
                survey_date = None
                survey_year = default_year
                if pd.notna(date_raw):
                    s = str(int(date_raw)) if isinstance(date_raw, (int, float)) else str(date_raw)
                    if len(s) == 8 and s.isdigit():
                        survey_date = f"{s[0:4]}-{s[4:6]}-{s[6:8]}"
                        survey_year = int(s[0:4])

                def fnum(v):
                    try:
                        f = float(v)
                        return f if f == f else None  # NaN check
                    except (TypeError, ValueError):
                        return None

                vci = fnum(row.get('vci'))
                weighted_vci = fnum(row.get('Weighted VCI'))
                potholes_count = fnum(row.get('NrofPotholes/Failures'))
                chainage_from = fnum(row.get('SegmentStart'))
                chainage_to = fnum(row.get('SegmentEnd'))

                raw = {
                    "gisid": None if pd.isna(row.get('GISID')) else str(row.get('GISID')),
                    "road_code": None if pd.isna(row.get('RoadCode')) else str(row.get('RoadCode')),
                    "road_name": None if pd.isna(row.get('RoadName')) else str(row.get('RoadName')),
                    "region": None if pd.isna(row.get('Region')) else str(row.get('Region')),
                    "station": None if pd.isna(row.get('Station')) else str(row.get('Station')),
                    "vci_raw": vci,
                    "weighted_vci": weighted_vci,
                    "potholes_rating": fnum(row.get('Potholes')),
                    "potholes_count": potholes_count,
                    "pothole_depth": fnum(row.get('Potholedepth')),
                    "cracks_all_rating": fnum(row.get('Cracksall')),
                    "cracks_wide_rating": fnum(row.get('Crackswide')),
                    "ravelling_rating": fnum(row.get('Ravelling/Disintegration')),
                    "bleeding_rating": fnum(row.get('Bleeding')),
                    "rutting_left_rating": fnum(row.get('L/Rutting')),
                    "rutting_right_rating": fnum(row.get('R/Rutting')),
                    "rutting_measured_mm": fnum(row.get('Rutting')),
                    "roughness_measured": fnum(row.get('Roughness')),
                    "segment_length_km": fnum(row.get('SegmentLength')),
                    "gps1": None if pd.isna(row.get('gps1')) else str(row.get('gps1')),
                    "gps2": None if pd.isna(row.get('gps2')) else str(row.get('gps2')),
                }

                final_vci = weighted_vci if weighted_vci is not None else vci
                key = (link_id, round(chainage_from, 3) if chainage_from is not None else None,
                       round(chainage_to, 3) if chainage_to is not None else None)
                match = existing_obs.get(key)

                if match is not None:
                    obs_id, prior_vci = match
                    cur.execute("""
                        UPDATE pms_condition_observations
                        SET vci = COALESCE(vci, ?), potholes_value = COALESCE(potholes_value, ?),
                            raw_values_json = ?
                        WHERE observation_id = ?
                    """, (final_vci, potholes_count, json.dumps(raw), obs_id))
                    total_updated += 1
                else:
                    cur.execute("""
                        INSERT INTO pms_condition_observations
                        (source_id, source_row_number, link_id, survey_date, survey_year,
                         chainage_from_km, chainage_to_km, iri_m_per_km, rut_depth_mm, vci, pci,
                         cracking_percent, potholes_value, condition_class, data_quality, raw_values_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'source', ?)
                    """, (source_id, 1_000_000 + idx, link_id, survey_date, survey_year,
                          chainage_from, chainage_to, raw['roughness_measured'], raw['rutting_measured_mm'],
                          final_vci, potholes_count, None, json.dumps(raw)))
                    n_ins += 1
            except sqlite3.IntegrityError:
                pass  # duplicate (source_id, source_row_number) - already inserted
            except Exception as e:
                print(f"  row {idx} error: {e}")

        con.commit()
        cur.execute("UPDATE pms_source_files SET ingestion_status='vci_backfilled', record_count=COALESCE(record_count,0)+?, ingested_at=CURRENT_TIMESTAMP WHERE source_id=?", (n_ins, source_id))
        con.commit()
        print(f"  inserted={n_ins} updated_in_place={total_updated} unmatched_link_id={n_unmatched}")
        total_inserted += n_ins
        total_unmatched_links += n_unmatched

    print(f"\nTOTAL inserted={total_inserted} updated_in_place={total_updated} unmatched={total_unmatched_links}")
    con.close()

if __name__ == "__main__":
    main()
