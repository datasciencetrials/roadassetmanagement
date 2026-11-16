#!/usr/bin/env python3
"""
Apply the cloud-trained 'Uganda Pavement Current Value DNN' retrain results
into the live traffic_platform.db (pure sqlite3, no scikit-learn needed).
Mirrors the write pattern of pavement_data_engine.py's train_current_value_model():
insert a new pms_model_runs row, then DELETE + re-INSERT pms_current_values and
pms_predictions against the new model_run_id.
"""
import sqlite3, csv, os

DB_PATH = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/data/traffic_platform.db")
OUT_DIR = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/scripts/pavement_ml/cloud_export/out")

def read_csv(name):
    with open(os.path.join(OUT_DIR, name), newline="") as f:
        return list(csv.DictReader(f))

def to_num(v):
    if v is None or v == "" or v == "nan":
        return None
    try:
        return float(v)
    except ValueError:
        return None

def to_int(v):
    n = to_num(v)
    return int(n) if n is not None else None

def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()

    runs = read_csv("pms_model_runs_new.csv")
    assert len(runs) == 1
    r = runs[0]
    cur.execute("""INSERT INTO pms_model_runs
        (model_name,model_version,algorithm,feature_variables_json,target_variables_json,
         hyperparameters_json,training_rows,validation_metrics_json,trained_at,reporting_at,artifact_path,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (r["model_name"], r["model_version"], r["algorithm"], r["feature_variables_json"],
         r["target_variables_json"], r["hyperparameters_json"], int(r["training_rows"]),
         r["validation_metrics_json"], r["trained_at"], r["reporting_at"], None, r["status"]))
    model_run_id = cur.lastrowid
    print(f"New pms_model_runs row: model_run_id={model_run_id} version={r['model_version']}")

    cur.execute("DELETE FROM pms_current_values")
    cur.execute("DELETE FROM pms_predictions")

    cv_rows = read_csv("pms_current_values_new.csv")
    cv_params = [
        (row["link_id"], to_int(row["variable_id"]), to_num(row["value_numeric"]),
         row["value_text"] or None, row["reporting_at"], row["observed_at"] or None,
         row["value_method"], to_num(row["confidence"]), to_int(row["source_id"]),
         model_run_id if row["model_run_id"] not in (None, "", "nan") else None)
        for row in cv_rows
    ]
    cur.executemany("""INSERT INTO pms_current_values
        (link_id,variable_id,value_numeric,value_text,reporting_at,observed_at,value_method,
         confidence,source_id,model_run_id) VALUES (?,?,?,?,?,?,?,?,?,?)""", cv_params)
    print(f"Inserted {len(cv_params)} pms_current_values rows")

    pr_rows = read_csv("pms_predictions_new.csv")
    pr_params = [
        (row["link_id"], model_run_id, to_int(row["prediction_year"]), to_num(row["iri_m_per_km"]),
         row["condition_class"], row["intervention_type"] or None, to_int(row["intervention_year"]),
         to_num(row["confidence"]))
        for row in pr_rows
    ]
    cur.executemany("""INSERT INTO pms_predictions
        (link_id,model_run_id,prediction_year,iri_m_per_km,condition_class,
         intervention_type,intervention_year,confidence) VALUES (?,?,?,?,?,?,?,?)""", pr_params)
    print(f"Inserted {len(pr_params)} pms_predictions rows")

    con.commit()
    print("Committed.")
    con.close()

if __name__ == "__main__":
    main()
