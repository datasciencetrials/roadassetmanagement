#!/usr/bin/env python3
"""
Backfill VCI + defect-level observations from the real MobiCap UNPAVED network
visual condition survey workbooks (2021-22, 2022-23) - gravel/earth road defects:
gravel thickness, material quality, corrugations, erosion/gullies, potholes,
rutting - previously not ingested anywhere in the database.
"""
import os, sqlite3, time, json
import pandas as pd

REPO_MOUNT = os.path.expanduser("~/mnt/Uganda National Road Network Repository")
DB_PATH = os.path.join(REPO_MOUNT, "ugnrms", "data", "traffic_platform.db")
WIN_PREFIX = r"D:\OneDrive\Uganda National Road Network Repository"

FILES = [
    ("5.Road Condition Data/2021-22/Mobicap unpaved-Combined - 2021-22.xlsx", 2021, "Mobicap Unpaved"),
    ("5.Road Condition Data/2022-23/Mobicap unpaved-Combined - 2022 - 2023.xlsx", 2022, "Mobicap Unpaved"),
]

def to_win_path(rel):
    return WIN_PREFIX + "\\" + rel.replace("/", "\\")

def fnum(v):
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None

def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()
    cur.execute("SELECT link_id FROM pms_road_links")
    valid_links = set(r[0] for r in cur.fetchall())
    print(f"{len(valid_links)} known road links", flush=True)

    total_inserted = 0
    total_updated = 0

    for rel_path, default_year, sheet_name in FILES:
        abs_path = os.path.join(REPO_MOUNT, rel_path)
        win_path = to_win_path(rel_path)
        if not os.path.exists(abs_path):
            print(f"MISSING: {abs_path}", flush=True)
            continue
        size = os.path.getsize(abs_path)
        mtime = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(os.path.getmtime(abs_path)))

        cur.execute("SELECT source_id, ingestion_status FROM pms_source_files WHERE absolute_path=?", (win_path,))
        row = cur.fetchone()
        if row:
            source_id, status = row
            if status == 'vci_backfilled':
                print(f"  {rel_path}: already vci-backfilled, skipping", flush=True)
                continue
        else:
            cur.execute("""
                INSERT INTO pms_source_files
                (repository_group, absolute_path, relative_path, file_name, extension, byte_size, modified_at, ingestion_status, record_count, registered_at)
                VALUES ('road_condition', ?, ?, ?, '.xlsx', ?, ?, 'registered', 0, CURRENT_TIMESTAMP)
            """, (win_path, rel_path, os.path.basename(rel_path), size, mtime))
            source_id = cur.lastrowid
            con.commit()

        cur.execute("""SELECT observation_id, link_id, chainage_from_km, chainage_to_km
                        FROM pms_condition_observations WHERE source_id=?""", (source_id,))
        existing_obs = {}
        for obs_id, l_id, c_from, c_to in cur.fetchall():
            existing_obs[(l_id, round(c_from, 3) if c_from is not None else None,
                          round(c_to, 3) if c_to is not None else None)] = obs_id
        print(f"  {len(existing_obs)} existing observation rows for this source", flush=True)

        print(f"Reading {rel_path} ...", flush=True)
        df = pd.read_excel(abs_path, sheet_name=sheet_name)
        df = df.iloc[1:].reset_index(drop=True)  # drop units/code sub-header row
        print(f"  {len(df)} segment rows", flush=True)

        n_ins = 0
        n_upd = 0
        n_unmatched = 0
        for idx, row in df.iterrows():
            link_id = row.get('Link ID')
            if pd.isna(link_id):
                continue
            link_id = str(link_id).strip()
            if link_id not in valid_links:
                n_unmatched += 1
                continue
            try:
                date_raw = row.get('Date')
                survey_date, survey_year = None, default_year
                if pd.notna(date_raw):
                    s = str(int(date_raw)) if isinstance(date_raw, (int, float)) else str(date_raw)
                    if len(s) == 8 and s.isdigit():
                        survey_date = f"{s[0:4]}-{s[4:6]}-{s[6:8]}"
                        survey_year = int(s[0:4])

                vci = fnum(row.get('vci'))
                weighted_vci = fnum(row.get('Weighted VCI'))
                final_vci = weighted_vci if weighted_vci is not None else vci
                potholes = fnum(row.get('Potholes'))
                chainage_from = fnum(row.get('SegmentStart'))
                chainage_to = fnum(row.get('SegmentEnd'))
                rutting = fnum(row.get('Rutting'))

                raw = {
                    "road_code": None if pd.isna(row.get('RoadCode')) else str(row.get('RoadCode')),
                    "region": None if pd.isna(row.get('Region')) else str(row.get('Region')),
                    "station": None if pd.isna(row.get('Station')) else str(row.get('Station')),
                    "weighted_vci": weighted_vci,
                    "gravel_thickness_rating": fnum(row.get('GravelThickness')),
                    "material_quality_rating": fnum(row.get('MaterialQuality')),
                    "roughness_rating": fnum(row.get('Roughness')),
                    "potholes_rating": potholes,
                    "rutting_rating": rutting,
                    "corrugations_rating": fnum(row.get('Corrugations')),
                    "erosion_gullies_rating": fnum(row.get('Erosion/Gullies')),
                    "severe_isolated_problems": fnum(row.get('SevereIsolatedProblems')),
                    "formation_level_rating": fnum(row.get('FormationLevel')),
                    "side_drain_condition_rating": fnum(row.get('SDrainCond')),
                    "segment_length_km": fnum(row.get('SegmentLength')),
                }

                key = (link_id, round(chainage_from, 3) if chainage_from is not None else None,
                       round(chainage_to, 3) if chainage_to is not None else None)
                obs_id = existing_obs.get(key)
                if obs_id is not None:
                    cur.execute("""
                        UPDATE pms_condition_observations
                        SET vci = COALESCE(vci, ?), potholes_value = COALESCE(potholes_value, ?),
                            rut_depth_mm = COALESCE(rut_depth_mm, ?), raw_values_json = ?
                        WHERE observation_id = ?
                    """, (final_vci, potholes, rutting, json.dumps(raw), obs_id))
                    n_upd += 1
                else:
                    cur.execute("""
                        INSERT INTO pms_condition_observations
                        (source_id, source_row_number, link_id, survey_date, survey_year,
                         chainage_from_km, chainage_to_km, iri_m_per_km, rut_depth_mm, vci, pci,
                         cracking_percent, potholes_value, condition_class, data_quality, raw_values_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, NULL, 'source', ?)
                    """, (source_id, 2_000_000 + idx, link_id, survey_date, survey_year,
                          chainage_from, chainage_to, rutting, final_vci, potholes, json.dumps(raw)))
                    n_ins += 1
            except sqlite3.IntegrityError:
                pass
            except Exception as e:
                print(f"  row {idx} error: {e}", flush=True)

        con.commit()
        cur.execute("UPDATE pms_source_files SET ingestion_status='vci_backfilled', record_count=COALESCE(record_count,0)+?, ingested_at=CURRENT_TIMESTAMP WHERE source_id=?", (n_ins, source_id))
        con.commit()
        print(f"  inserted={n_ins} updated={n_upd} unmatched_link_id={n_unmatched}", flush=True)
        total_inserted += n_ins
        total_updated += n_upd

    print(f"\nTOTAL inserted={total_inserted} updated={total_updated}", flush=True)
    con.close()

if __name__ == "__main__":
    main()
