#!/usr/bin/env python3
"""Export the minimal set of tables needed to retrain the 'Uganda Pavement
Current Value DNN' model in a full-featured cloud environment (this device
bridge lacks scikit-learn and has no network access to install it)."""
import os, sqlite3, csv, json

DB_PATH = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/data/traffic_platform.db")
OUT_DIR = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/scripts/pavement_ml/cloud_export")
os.makedirs(OUT_DIR, exist_ok=True)

con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
cur = con.cursor()

def dump_query(sql, filename, params=()):
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    with open(os.path.join(OUT_DIR, filename), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)
    print(f"{filename}: {len(rows)} rows")

dump_query("SELECT * FROM pms_road_links", "pms_road_links.csv")
dump_query("""SELECT link_id, survey_year, iri_m_per_km, rut_depth_mm, vci, pci,
                     cracking_percent, potholes_value
              FROM pms_condition_observations
              WHERE link_id IS NOT NULL""", "pms_condition_observations.csv")
dump_query("SELECT setting_key, value_numeric, value_text FROM pms_engine_settings", "pms_engine_settings.csv")
dump_query("SELECT canonical_name, variable_id FROM pms_variable_definitions", "pms_variable_definitions.csv")
dump_query("""SELECT source_id FROM pms_source_files WHERE repository_group='road_condition'
              AND extension='.xlsx' ORDER BY modified_at DESC LIMIT 1""", "source_id_condition.csv")
dump_query("""SELECT source_id FROM pms_source_files WHERE repository_group IN ('road_condition','road_inventory')
              AND lower(file_name) LIKE '%national road network%' ORDER BY modified_at DESC LIMIT 1""", "source_id_links.csv")
dump_query("""SELECT link_id, COUNT(*) n_tests, AVG(d0_um) mean_d0_um, MIN(d0_um) min_d0_um,
                     AVG(load_kn) mean_load_kn
              FROM pms_fwd_observations WHERE link_id IS NOT NULL GROUP BY link_id""", "pms_fwd_summary_by_link.csv")

# Copy the prior predictions JSON verbatim (small, needed for confidence/horizon carryover)
import shutil
pred_src = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/public/data/romdas_predictions.json")
if os.path.exists(pred_src):
    shutil.copy(pred_src, os.path.join(OUT_DIR, "romdas_predictions.json"))
    print("romdas_predictions.json copied")

print("Export complete ->", OUT_DIR)
