#!/usr/bin/env python3
"""
Exhaustive manual text-extraction pipeline for the National Roads Authority PMS backend.
Walks '0. Manuals' (all subfolders), registers every pdf/docx/doc file in
pms_source_files (repository_group='pavement_manuals') if not already present,
extracts full text, and stores it in pms_manual_documents.searchable_text.

Designed to run unattended via nohup on the user's device (Linux VM bridge),
since the manual tree is ~4GB across ~2,400 files. Logs progress every 10 files
to extract_progress.log so it can be polled mid-run.

IMPORTANT (2026-08-24): the DB lives on a OneDrive-synced FUSE mount that
intermittently throws 'database disk image is malformed' / 'disk I/O error'
on any query that has to scan many rows (e.g. SELECT ... WHERE repository_group=
'pavement_manuals', a full-table scan since there's no index on that column).
Single-row point lookups (by the UNIQUE absolute_path, or by rowid/source_id)
and small single-row INSERT/UPDATE writes have proven reliable in repeated
testing. So this script does NOT do a startup bulk SELECT to figure out what's
already done -- instead it keeps a plain-text manifest file (one absolute_path
per line) of files it has successfully extracted, appended to as it goes, and
uses that (ordinary filesystem read, not a SQLite scan) to decide what to skip
on resume. Registration dedup uses a single-row point SELECT by absolute_path
(UNIQUE-indexed) rather than a bulk existing-rows fetch.
"""
import os, sys, sqlite3, hashlib, time, subprocess, traceback, signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_retry import connect_rw

class PerFileTimeout(Exception):
    pass

def _alarm_handler(signum, frame):
    raise PerFileTimeout("per-file hard timeout")

signal.signal(signal.SIGALRM, _alarm_handler)

HOME = os.path.expanduser("~")
REPO_MOUNT = os.path.join(HOME, "mnt", "Uganda National Road Network Repository")
MANUALS_DIR = os.path.join(REPO_MOUNT, "0. Manuals")
DB_PATH = os.path.join(REPO_MOUNT, "ugnrms", "data", "traffic_platform.db")
SCRIPT_DIR = os.path.join(REPO_MOUNT, "ugnrms", "scripts", "pavement_ml")
MANIFEST_PATH = os.path.join(SCRIPT_DIR, "extracted_manifest.txt")
LOG_PATH = "/tmp/manual_extract/extract_progress.log"
WIN_PREFIX = r"D:\OneDrive\Uganda National Road Network Repository"
MAX_CHARS = 3_000_000  # sanity cap per document
TIME_BUDGET_SECONDS = 34  # self-terminate before the caller's timeout; re-run to resume
START_TIME = time.time()

def log(msg):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

def to_windows_path(unix_path):
    rel = os.path.relpath(unix_path, REPO_MOUNT)
    return WIN_PREFIX + "\\" + rel.replace("/", "\\")

def extract_pdf(path):
    import pdfplumber
    text_parts = []
    page_count = 0
    try:
        with pdfplumber.open(path) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                t = page.extract_text() or ""
                text_parts.append(t)
                if sum(len(x) for x in text_parts) > MAX_CHARS:
                    break
    except Exception as e:
        log(f"  pdf extract error: {e}")
    return "\n".join(text_parts), page_count

def extract_docx(path):
    import docx
    d = docx.Document(path)
    parts = [p.text for p in d.paragraphs]
    for table in d.tables:
        for row in table.rows:
            parts.append(" | ".join(c.text for c in row.cells))
    text = "\n".join(parts)
    return text[:MAX_CHARS], 0

def extract_doc_via_soffice(path):
    outdir = "/tmp/manual_extract/converted"
    os.makedirs(outdir, exist_ok=True)
    try:
        subprocess.run(
            ["soffice", "--headless", "--convert-to", "txt:Text", "--outdir", outdir, path],
            timeout=10, capture_output=True
        )
        base = os.path.splitext(os.path.basename(path))[0]
        txt_path = os.path.join(outdir, base + ".txt")
        if os.path.exists(txt_path):
            with open(txt_path, "r", errors="ignore") as f:
                text = f.read()
            os.remove(txt_path)
            return text[:MAX_CHARS], 0
    except Exception as e:
        log(f"  soffice convert error: {e}")
    return "", 0

def commit_retry(con, retries=5, delay=1.0):
    last_err = None
    for _ in range(retries):
        try:
            con.commit()
            return True
        except sqlite3.Error as e:
            last_err = e
            time.sleep(delay)
    log(f"  commit failed after {retries} retries: {last_err}")
    return False

def point_lookup_source_id(con, win_path, retries=5, delay=0.6):
    """Single-row lookup by the UNIQUE absolute_path column -- proven reliable."""
    last_err = None
    for _ in range(retries):
        try:
            cur = con.cursor()
            cur.execute("SELECT source_id FROM pms_source_files WHERE absolute_path=?", (win_path,))
            row = cur.fetchone()
            return row[0] if row else None
        except sqlite3.Error as e:
            last_err = e
            time.sleep(delay)
    raise last_err

def load_manifest():
    done = set()
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, "r", errors="ignore") as f:
            for line in f:
                line = line.rstrip("\n")
                if line:
                    done.add(line)
    return done

def append_manifest(win_path):
    with open(MANIFEST_PATH, "a") as f:
        f.write(win_path + "\n")

def main():
    os.makedirs("/tmp/manual_extract", exist_ok=True)
    open(LOG_PATH, "a").close()

    done_paths = load_manifest()
    log(f"Loaded manifest: {len(done_paths)} already-extracted paths")

    con = connect_rw(DB_PATH, retries=5)
    cur = con.cursor()
    try:
        cur.execute("PRAGMA journal_mode=DELETE")
    except Exception:
        pass

    files = []
    for root, dirs, fnames in os.walk(MANUALS_DIR):
        for fn in fnames:
            ext = os.path.splitext(fn)[1].lower()
            if ext in (".pdf", ".docx", ".doc"):
                files.append(os.path.join(root, fn))
    files.sort()
    log(f"Found {len(files)} candidate manual files under 0. Manuals")

    n_new_registered = 0
    n_extracted = 0
    n_skipped_existing_extracted = 0
    n_failed = 0

    for i, fpath in enumerate(files, 1):
        try:
            win_path = to_windows_path(fpath)

            if win_path in done_paths:
                n_skipped_existing_extracted += 1
                if i % 200 == 0:
                    log(f"progress {i}/{len(files)} (registered={n_new_registered} extracted={n_extracted} skipped={n_skipped_existing_extracted} failed={n_failed})")
                continue

            size = os.path.getsize(fpath)
            mtime = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(os.path.getmtime(fpath)))
            ext = os.path.splitext(fpath)[1].lower()
            rel_to_manuals = os.path.relpath(fpath, MANUALS_DIR).replace("/", "\\")
            fname = os.path.basename(fpath)

            source_id = point_lookup_source_id(con, win_path)
            if source_id is None:
                sha = None  # skipped for throughput; absolute_path is the dedup key
                cur.execute("""
                    INSERT INTO pms_source_files
                    (repository_group, absolute_path, relative_path, file_name, extension, byte_size, modified_at, content_sha256, ingestion_status, record_count, registered_at)
                    VALUES ('pavement_manuals', ?, ?, ?, ?, ?, ?, ?, 'registered', 0, CURRENT_TIMESTAMP)
                """, (win_path, rel_to_manuals, fname, ext, size, mtime, sha))
                source_id = cur.lastrowid
                n_new_registered += 1
                if not commit_retry(con):
                    try:
                        con.close()
                    except Exception:
                        pass
                    con = connect_rw(DB_PATH, retries=5)
                    cur = con.cursor()

            # Extract text (hard per-file wall-clock cap so one bad file can't stall the batch)
            signal.alarm(12)
            try:
                if ext == ".pdf":
                    text, page_count = extract_pdf(fpath)
                    doctype = "pdf"
                elif ext == ".docx":
                    text, page_count = extract_docx(fpath)
                    doctype = "docx"
                else:  # .doc
                    text, page_count = extract_doc_via_soffice(fpath)
                    doctype = "doc"
            except PerFileTimeout:
                signal.alarm(0)
                n_failed += 1
                log(f"  TIMEOUT (>12s) extracting {fname} - left unextracted, will retry on a future pass")
                if i % 25 == 0 or i == len(files):
                    log(f"progress {i}/{len(files)} (registered={n_new_registered} extracted={n_extracted} skipped={n_skipped_existing_extracted} failed={n_failed})")
                if time.time() - START_TIME > TIME_BUDGET_SECONDS:
                    log(f"TIME BUDGET REACHED at {i}/{len(files)} (registered={n_new_registered} extracted={n_extracted} skipped={n_skipped_existing_extracted} failed={n_failed}) - re-run script to resume")
                    con.close()
                    return
                continue
            finally:
                signal.alarm(0)

            char_count = len(text)
            title = os.path.splitext(fname)[0]

            cur.execute("""
                INSERT OR REPLACE INTO pms_manual_documents
                (source_id, title, document_type, page_count, extracted_character_count, searchable_text, indexed_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (source_id, title, doctype, page_count, char_count, text))
            cur.execute("UPDATE pms_source_files SET ingestion_status='complete', record_count=?, ingested_at=CURRENT_TIMESTAMP WHERE source_id=?", (page_count, source_id))
            if not commit_retry(con):
                try:
                    con.close()
                except Exception:
                    pass
                con = connect_rw(DB_PATH, retries=5)
                cur = con.cursor()
            append_manifest(win_path)
            n_extracted += 1
            if char_count < 50:
                log(f"  WARNING near-zero text ({char_count} chars) - likely scanned/image doc: {fname}")

        except Exception as e:
            n_failed += 1
            log(f"  FAILED on {fpath}: {e}\n{traceback.format_exc()[:500]}")
            try:
                con.rollback()
            except Exception:
                try:
                    con.close()
                except Exception:
                    pass
                con = connect_rw(DB_PATH, retries=5)
                cur = con.cursor()

        if i % 25 == 0 or i == len(files):
            log(f"progress {i}/{len(files)} (registered={n_new_registered} extracted={n_extracted} skipped={n_skipped_existing_extracted} failed={n_failed})")

        if time.time() - START_TIME > TIME_BUDGET_SECONDS:
            log(f"TIME BUDGET REACHED at {i}/{len(files)} (registered={n_new_registered} extracted={n_extracted} skipped={n_skipped_existing_extracted} failed={n_failed}) - re-run script to resume")
            con.close()
            return

    log(f"DONE. total_files={len(files)} new_registered={n_new_registered} newly_extracted={n_extracted} already_had_text={n_skipped_existing_extracted} failed={n_failed}")
    con.close()

if __name__ == "__main__":
    main()
