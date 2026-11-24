#!/usr/bin/env python3
r"""
Ingest repository files into the National Road Network Pavement Management System database.

Features:
- Recursive discovery and registration into pms_source_files (repository_group='dnpe_data').
- Idempotent and resumable (tracks ingestion_status).
- Extracts searchable text from PDF, DOCX, PPTX into pms_manual_documents.
- Parses traffic data (MCC, ODS, AADT summaries, Growth Factors) into pms_traffic_surveys and pms_traffic_growth_factors.
- Indexes MS Access database schemas (.accdb / .mdb) into pms_source_tables and pms_source_fields using pyodbc.
- Links road corridor names to pms_road_links.
"""

from __future__ import annotations

import os
import re
import sys
import json
import sqlite3
import hashlib
import traceback
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)


from openpyxl import load_workbook
from pypdf import PdfReader
from docx import Document

try:
    from pptx import Presentation
except ImportError:
    Presentation = None

try:
    import pyodbc
except ImportError:
    pyodbc = None

DB_PATH = Path(r"D:\tmp\uganda-build\traffic_platform.db")

DNPE_ROOT = Path(os.environ.get("RAMS_DATA_ROOT", "./data_source"))

SKIP_EXTENSIONS = {".tmp", ".lnk", ".bak", ".vfgj"}
LARGE_ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".tar", ".gz"}

ALIASES = {
    "linkid": "link_id", "link_id": "link_id", "link": "link_id", "gisid": "external_id",
    "road": "road_no", "roadcode": "road_no", "road_no": "road_no", "roadname": "road_name",
    "link_name": "link_name", "linkname": "link_name",
    "survey_date": "survey_date", "date": "survey_date", "survey_year": "survey_year",
    "lane_iri": "iri_m_per_km", "average_iri": "iri_m_per_km", "avg_iri": "iri_m_per_km",
    "iri": "iri_m_per_km", "calib_rgh": "iri_m_per_km",
    "average_rut_depth": "rut_depth_mm", "average_lane_rutting_mm": "rut_depth_mm",
    "rutting": "rut_depth_mm", "vci": "vci", "pci": "pci",
    "cracking": "cracking_percent", "cracking_percent": "cracking_percent",
    "potholes": "potholes_value", "condition": "condition_class",
    "chainage": "chainage_from_km", "chainage_km": "chainage_from_km", "chainage_from": "chainage_from_km",
    "chainage_end": "chainage_to_km",
}

def print_log(msg: str):
    print(msg, flush=True)

def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def clean_name(value: Any) -> str:
    text = str(value or "").strip().lower().replace("%", " percent ")
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return re.sub(r"_+", "_", text)

def canonical_field(value: Any) -> str:
    cleaned = clean_name(value)
    return ALIASES.get(cleaned, cleaned)

def sha256_file(path: Path, max_mb: float = 500.0) -> str | None:
    try:
        if path.stat().st_size > max_mb * 1024 * 1024:
            return None
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()
    except Exception:
        return None

def init_db(conn: sqlite3.Connection):
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    
    conn.execute("""
    CREATE TABLE IF NOT EXISTS pms_traffic_surveys (
        survey_id       INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id       INTEGER NOT NULL REFERENCES pms_source_files(source_id),
        link_id         TEXT REFERENCES pms_road_links(link_id),
        road_label      TEXT,
        station_name    TEXT,
        survey_type     TEXT NOT NULL,
        survey_year     INTEGER,
        survey_date     TEXT,
        direction       TEXT,
        time_period     TEXT,
        vehicle_class   TEXT,
        vehicle_count   INTEGER,
        aadt            REAL,
        adt             REAL,
        raw_values_json TEXT,
        UNIQUE(source_id, link_id, survey_date, direction, time_period, vehicle_class, station_name)
    );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_pms_traffic_link_year ON pms_traffic_surveys(link_id, survey_year);")

    conn.execute("""
    CREATE TABLE IF NOT EXISTS pms_traffic_growth_factors (
        factor_id       INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id       INTEGER NOT NULL REFERENCES pms_source_files(source_id),
        link_id         TEXT REFERENCES pms_road_links(link_id),
        road_label      TEXT,
        vehicle_class   TEXT,
        base_year       INTEGER,
        target_year     INTEGER,
        growth_rate     REAL,
        base_aadt       REAL,
        projected_aadt  REAL,
        raw_values_json TEXT,
        UNIQUE(source_id, link_id, vehicle_class, base_year, target_year)
    );
    """)
    conn.commit()

def load_road_links(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT link_id, link_name, road_no, chainage_from_km, chainage_to_km, length_km FROM pms_road_links").fetchall()
    links = []
    for r in rows:
        links.append({
            "link_id": r[0],
            "link_name": r[1] or "",
            "road_no": r[2] or "",
            "chainage_from": r[3] or 0.0,
            "chainage_to": r[4] or 0.0,
            "length_km": r[5] or 0.0
        })
    return links

def match_link_id(path_str: str, text: str, links: list[dict[str, Any]]) -> str | None:
    combined = f"{path_str} {text}"
    
    # 1. Direct link ID search
    m = re.search(r"([A-Z]\d{3,4}(?:N\d+)?_Link\d+|[A-Z]\d+_Link\d+)", combined, re.IGNORECASE)
    if m:
        target = m.group(1).upper()
        for l in links:
            if l["link_id"].upper() == target:
                return l["link_id"]
    
    # 2. Substring match on road name
    lower_comb = combined.lower()
    best_match = None
    best_len = 0
    for l in links:
        lname = l["link_name"].strip().lower()
        if len(lname) > 4 and lname in lower_comb:
            if len(lname) > best_len:
                best_len = len(lname)
                best_match = l["link_id"]
    if best_match:
        return best_match

    # 3. Match individual key town names
    for l in links:
        tokens = [t.strip().lower() for t in re.split(r"[-–/]+", l["link_name"]) if len(t.strip()) > 3]
        if tokens:
            matches = sum(1 for tok in tokens if tok in lower_comb)
            if matches >= 2 or (len(tokens) == 1 and matches == 1 and tokens[0] in lower_comb):
                return l["link_id"]

    return None

def register_files(conn: sqlite3.Connection, force_rescan: bool = False) -> tuple[int, int]:
    existing_count = conn.execute("SELECT COUNT(*) FROM pms_source_files WHERE repository_group='dnpe_data'").fetchone()[0]
    if existing_count > 0 and not force_rescan:
        print_log(f"Found {existing_count} existing files in repository_group 'dnpe_data'. Skipping rescan.")
        return 0, existing_count

    existing = set()
    for row in conn.execute("SELECT absolute_path FROM pms_source_files WHERE repository_group='dnpe_data'"):
        existing.add(row[0])

    registered_count = 0
    skipped_count = 0

    print_log(f"Scanning {DNPE_ROOT}...")

    for root, dirs, files in os.walk(DNPE_ROOT):
        # Skip ACL denied or forbidden folders
        dirs[:] = [d for d in dirs if d.lower() not in {"dnpe office 4mgt", "quality control"}]
        for fname in files:
            ext = Path(fname).suffix.lower()
            if ext in SKIP_EXTENSIONS:
                continue

            abs_path = os.path.join(root, fname)
            if abs_path in existing:
                skipped_count += 1
                continue

            rel_path = os.path.relpath(abs_path, DNPE_ROOT)
            try:
                stat = os.stat(abs_path)
                size = stat.st_size
                mtime = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
            except Exception:
                continue

            status = "registered"
            if ext in LARGE_ARCHIVE_EXTENSIONS:
                status = "archive_skipped"

            digest = sha256_file(Path(abs_path)) if status == "registered" else None

            conn.execute("""
                INSERT INTO pms_source_files
                (repository_group, absolute_path, relative_path, file_name, extension, byte_size, modified_at, content_sha256, ingestion_status, registered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ("dnpe_data", abs_path, rel_path, fname, ext, size, mtime, digest, status, utc_now()))
            registered_count += 1

            if registered_count % 500 == 0:
                conn.commit()
                print(f"  Registered {registered_count} files...")

    conn.commit()
    print(f"Registration complete. New: {registered_count}, Already Registered: {skipped_count}")
    return registered_count, skipped_count

def process_documents(conn: sqlite3.Connection):
    query = """
        SELECT source_id, absolute_path, file_name, extension 
        FROM pms_source_files 
        WHERE repository_group='dnpe_data' 
          AND ingestion_status='registered'
          AND lower(extension) IN ('.pdf', '.docx', '.pptx', '.doc')
    """
    files = conn.execute(query).fetchall()
    print_log(f"Extracting text from {len(files)} document files...")
    
    count_success = 0
    count_fail = 0

    for source_id, abs_path, file_name, ext in files:
        text = ""
        pages = None
        status = "complete"
        err_msg = None

        try:
            p = Path(abs_path)
            if not p.exists():
                status = "file_not_found"
                err_msg = "File does not exist at path"
            elif ext == ".pdf":
                try:
                    reader = PdfReader(str(p))
                    pages = len(reader.pages)
                    extracted = []
                    for page in reader.pages:
                        t = page.extract_text()
                        if t:
                            extracted.append(t)
                    text = "\n".join(extracted)
                except Exception as pdf_err:
                    status = "parse_failed"
                    err_msg = f"PDF error: {str(pdf_err)[:400]}"
            elif ext == ".docx":
                try:
                    doc = Document(str(p))
                    text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
                except Exception as docx_err:
                    status = "parse_failed"
                    err_msg = f"DOCX error: {str(docx_err)[:400]}"
            elif ext == ".pptx" and Presentation:
                try:
                    prs = Presentation(str(p))
                    extracted = []
                    for slide in prs.slides:
                        for shape in slide.shapes:
                            if hasattr(shape, "text") and shape.text:
                                extracted.append(shape.text)
                    text = "\n".join(extracted)
                    pages = len(prs.slides)
                except Exception as pptx_err:
                    status = "parse_failed"
                    err_msg = f"PPTX error: {str(pptx_err)[:400]}"
            elif ext == ".doc":
                status = "unsupported_binary_doc"

            if text:
                conn.execute("""
                    INSERT INTO pms_manual_documents
                    (source_id, title, document_type, page_count, extracted_character_count, searchable_text, indexed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(source_id) DO UPDATE SET
                    title=excluded.title, document_type=excluded.document_type, page_count=excluded.page_count,
                    extracted_character_count=excluded.extracted_character_count, searchable_text=excluded.searchable_text,
                    indexed_at=excluded.indexed_at
                """, (source_id, Path(file_name).stem, ext.lstrip("."), pages, len(text), text, utc_now()))

            conn.execute(
                "UPDATE pms_source_files SET ingestion_status=?, record_count=?, error_message=?, ingested_at=? WHERE source_id=?",
                (status, 1 if text else 0, err_msg, utc_now(), source_id)
            )
            if status == "complete":
                count_success += 1
            else:
                count_fail += 1

        except Exception as outer_exc:
            count_fail += 1
            try:
                conn.execute(
                    "UPDATE pms_source_files SET ingestion_status='parse_failed', error_message=?, ingested_at=? WHERE source_id=?",
                    (f"Outer exception: {str(outer_exc)[:400]}", utc_now(), source_id)
                )
            except Exception:
                pass

        if (count_success + count_fail) % 50 == 0:
            print_log(f"  Document text extraction progress: {count_success + count_fail}/{len(files)} files (extracted: {count_success}, failed/skipped: {count_fail})")
            try:
                conn.commit()
            except Exception:
                pass


    try:
        conn.commit()
    except Exception:
        pass
    print_log(f"Document extraction complete. Processed: {count_success}, Failed/Skipped: {count_fail}")


def process_access_databases(conn: sqlite3.Connection):
    if not pyodbc:
        print("pyodbc module not available; skipping Access DB schema indexing.")
        return

    query = """
        SELECT source_id, absolute_path, file_name 
        FROM pms_source_files 
        WHERE repository_group='dnpe_data' 
          AND ingestion_status='registered'
          AND lower(extension) IN ('.accdb', '.mdb')
    """
    files = conn.execute(query).fetchall()
    print(f"Indexing metadata for {len(files)} Access Database files...")

    for source_id, abs_path, file_name in files:
        try:
            conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={abs_path};ReadOnly=1;"
            db_conn = pyodbc.connect(conn_str, timeout=15)
            cursor = db_conn.cursor()
            
            tables = sorted({r.table_name for r in cursor.tables(tableType="TABLE") if not r.table_name.startswith("MSys")})
            total_records = 0
            
            for tname in tables:
                columns = [col.column_name for col in cursor.columns(table=tname)]
                try:
                    rcount = int(cursor.execute(f"SELECT COUNT(*) FROM [{tname}]").fetchone()[0])
                except Exception:
                    rcount = 0
                
                # Register table
                conn.execute("""
                    INSERT INTO pms_source_tables(source_id, table_name, table_kind, header_row, row_count, column_count)
                    VALUES(?,?,?,?,?,?) ON CONFLICT(source_id, table_name) DO UPDATE SET
                    table_kind=excluded.table_kind, header_row=excluded.header_row, row_count=excluded.row_count, column_count=excluded.column_count
                """, (source_id, tname, "access_table", 1, rcount, len(columns)))
                
                table_id = conn.execute("SELECT source_table_id FROM pms_source_tables WHERE source_id=? AND table_name=?", (source_id, tname)).fetchone()[0]
                
                fields = []
                for pos, col in enumerate(columns, 1):
                    cname = canonical_field(col)
                    fields.append((table_id, pos, col, cname, "UNKNOWN"))
                
                conn.executemany("""
                    INSERT OR REPLACE INTO pms_source_fields (source_table_id, ordinal_position, source_name, canonical_name, inferred_type)
                    VALUES (?, ?, ?, ?, ?)
                """, fields)
                total_records += rcount

            db_conn.close()
            conn.execute("UPDATE pms_source_files SET ingestion_status='complete', record_count=?, ingested_at=? WHERE source_id=?",
                         (total_records, utc_now(), source_id))
        except Exception as exc:
            err_msg = f"{type(exc).__name__}: {str(exc)[:500]}"
            conn.execute("UPDATE pms_source_files SET ingestion_status='parse_failed', error_message=?, ingested_at=? WHERE source_id=?",
                         (err_msg, utc_now(), source_id))

    conn.commit()

def process_traffic_spreadsheets(conn: sqlite3.Connection, links: list[dict[str, Any]]):
    query = """
        SELECT source_id, absolute_path, relative_path, file_name, extension 
        FROM pms_source_files 
        WHERE repository_group='dnpe_data' 
          AND ingestion_status='registered'
          AND lower(extension) IN ('.xlsx', '.xls', '.csv')
    """
    files = conn.execute(query).fetchall()
    
    # Filter strictly for traffic-related path/filename indicators
    traffic_files = []
    for r in files:
        rel_l = r["relative_path"].lower().replace("\\", "/")
        fn_l = r["file_name"].lower()
        if "traffic" in rel_l or "traffic" in fn_l or "growth" in fn_l or "aadt" in fn_l or "mcc" in rel_l or "ods" in rel_l or "mcc" in fn_l or "ods" in fn_l:
            traffic_files.append(r)

    print_log(f"Parsing {len(traffic_files)} traffic & growth spreadsheets...")

    total_traffic_rows = 0
    total_growth_rows = 0
    parsed_files = 0

    for idx, r in enumerate(traffic_files, 1):
        source_id = r["source_id"]
        abs_path = r["absolute_path"]
        rel_path = r["relative_path"]
        file_name = r["file_name"]
        ext = r["extension"].lower()

        try:
            matched_link = match_link_id(rel_path, file_name, links)
            file_traffic_rows = 0
            file_growth_rows = 0

            # Read all sheets using pandas (handles both .xlsx and .xls)
            import pandas as pd
            excel_file = pd.ExcelFile(abs_path)
            
            for sheet_name in excel_file.sheet_names:
                try:
                    df = excel_file.parse(sheet_name, header=None)
                    if df.empty or len(df) < 2:
                        continue

                    header_row_idx = None
                    headers = []

                    for row_idx in range(min(20, len(df))):
                        row_vals = [str(v).strip() for v in df.iloc[row_idx].tolist() if pd.notna(v)]
                        if len(row_vals) >= 3:
                            header_row_idx = row_idx
                            headers = [str(v).strip() if pd.notna(v) else "" for v in df.iloc[row_idx].tolist()]
                            break

                    if header_row_idx is None or not headers:
                        continue

                    df_data = df.iloc[header_row_idx + 1:].reset_index(drop=True)
                    col_map = {clean_name(h): i for i, h in enumerate(headers) if h}

                    is_growth = "growth" in file_name.lower() or "growth" in sheet_name.lower()

                    for _, row_vals in df_data.iterrows():
                        row_list = row_vals.tolist()
                        if not any(pd.notna(v) and str(v).strip() != "" for v in row_list):
                            continue

                        if is_growth:
                            road_label = str(row_list[col_map["road"]] if "road" in col_map and col_map["road"] < len(row_list) and pd.notna(row_list[col_map["road"]]) else file_name)
                            link_id = matched_link or match_link_id("", road_label, links)
                            vclass = str(row_list[col_map["vehicle_class"]] if "vehicle_class" in col_map and col_map["vehicle_class"] < len(row_list) and pd.notna(row_list[col_map["vehicle_class"]]) else "All Vehicles")
                            
                            grate_val = row_list[col_map["growth_rate"]] if "growth_rate" in col_map and col_map["growth_rate"] < len(row_list) else 0.0
                            try:
                                grate = float(grate_val) if pd.notna(grate_val) else 0.0
                            except Exception:
                                grate = 0.0

                            row_json = json.dumps({headers[i]: str(row_list[i]) for i in range(min(len(headers), len(row_list))) if pd.notna(row_list[i])})
                            
                            try:
                                conn.execute("""
                                    INSERT OR IGNORE INTO pms_traffic_growth_factors
                                    (source_id, link_id, road_label, vehicle_class, base_year, target_year, growth_rate, raw_values_json)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                """, (source_id, link_id, road_label, vclass, 2022, 2040, grate, row_json))
                                file_growth_rows += 1
                            except Exception:
                                pass

                        else: # Traffic Survey Sheet
                            link_id = matched_link or match_link_id("", file_name, links)
                            stype = "MCC" if "mcc" in file_name.lower() or "mcc" in sheet_name.lower() else ("ODS" if "ods" in file_name.lower() else "TRAFFIC_SURVEY")
                            row_json = json.dumps({headers[i]: str(row_list[i]) for i in range(min(len(headers), len(row_list))) if pd.notna(row_list[i])})

                            try:
                                conn.execute("""
                                    INSERT OR IGNORE INTO pms_traffic_surveys
                                    (source_id, link_id, road_label, survey_type, survey_year, raw_values_json)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                """, (source_id, link_id, file_name, stype, 2022, row_json))
                                file_traffic_rows += 1
                            except Exception:
                                pass
                except Exception:
                    pass

            parsed_files += 1
            total_traffic_rows += file_traffic_rows
            total_growth_rows += file_growth_rows
            
            try:
                conn.execute("UPDATE pms_source_files SET ingestion_status='complete', record_count=?, ingested_at=? WHERE source_id=?",
                             (file_traffic_rows + file_growth_rows, utc_now(), source_id))
            except Exception:
                pass

            if file_traffic_rows > 0 or file_growth_rows > 0:
                print_log(f"  Parsed {file_name}: {file_traffic_rows} traffic rows, {file_growth_rows} growth rows (link: {matched_link or 'unmatched'})")

        except Exception as exc:
            try:
                conn.execute("UPDATE pms_source_files SET ingestion_status='parse_failed', error_message=?, ingested_at=? WHERE source_id=?",
                             (f"{type(exc).__name__}: {str(exc)[:400]}", utc_now(), source_id))
            except Exception:
                pass

        if idx % 10 == 0:
            try:
                conn.commit()
            except Exception:
                pass

    try:
        conn.commit()
    except Exception:
        pass
    print_log(f"Traffic parsing complete. Spreadsheets processed: {parsed_files}, Traffic rows: {total_traffic_rows}, Growth Factor rows: {total_growth_rows}")



def main():
    print(f"Starting DNPE Ingestion into {DB_PATH}")
    conn = sqlite3.connect(DB_PATH, timeout=60.0)
    conn.row_factory = sqlite3.Row

    init_db(conn)
    links = load_road_links(conn)

    reg_new, reg_skipped = register_files(conn)
    process_traffic_spreadsheets(conn, links)
    process_access_databases(conn)
    process_documents(conn)


    # Print summary report
    print("\n================ DNPE INGESTION REPORT ================")
    summary = conn.execute("""
        SELECT ingestion_status, COUNT(*), SUM(record_count) 
        FROM pms_source_files 
        WHERE repository_group='dnpe_data' 
        GROUP BY ingestion_status
    """).fetchall()

    for row in summary:
        print(f"  Status: {row[0]:25s} | Files: {row[1]:6d} | Records: {row[2] or 0:8d}")

    total_dnpe_files = conn.execute("SELECT COUNT(*) FROM pms_source_files WHERE repository_group='dnpe_data'").fetchone()[0]
    total_docs = conn.execute("SELECT COUNT(*) FROM pms_manual_documents md JOIN pms_source_files sf ON sf.source_id=md.source_id WHERE sf.repository_group='dnpe_data'").fetchone()[0]
    total_tsurveys = conn.execute("SELECT COUNT(*) FROM pms_traffic_surveys").fetchone()[0]
    total_tgrowth = conn.execute("SELECT COUNT(*) FROM pms_traffic_growth_factors").fetchone()[0]
    matched_links = conn.execute("SELECT COUNT(DISTINCT link_id) FROM pms_traffic_surveys WHERE link_id IS NOT NULL").fetchone()[0]

    print("-------------------------------------------------------")
    print(f"  Total DNPE Files Registered : {total_dnpe_files}")
    print(f"  Extracted Document Texts   : {total_docs}")
    print(f"  Traffic Survey Records     : {total_tsurveys}")
    print(f"  Traffic Growth Records     : {total_tgrowth}")
    print(f"  Matched Road Link IDs      : {matched_links}")
    print("=======================================================\n")

    conn.close()

if __name__ == "__main__":
    main()
