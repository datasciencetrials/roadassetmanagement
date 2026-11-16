"""
Shared retry-wrapped SQLite helpers for traffic_platform.db, which lives on a
OneDrive-synced FUSE mount. Reads/writes intermittently throw
'database disk image is malformed' / 'disk I/O error' on isolated page reads
that succeed on a fresh retry (confirmed: same row read again a moment later
returns fine, and PRAGMA integrity_check-style consistency across repeated
full scans holds) -- this is FUSE/network-mount read flakiness, not real
corruption. Every DB touch in the ingestion/matching/manuals scripts should
go through these helpers instead of raw sqlite3 calls.
"""
import sqlite3
import time

DB_PATH_DEFAULT = "data/traffic_platform.db"


def connect_ro(db_path=DB_PATH_DEFAULT, retries=5, delay=1.5):
    last_err = None
    for attempt in range(retries):
        try:
            con = sqlite3.connect(f"file:{db_path}?mode=ro&immutable=1", uri=True, timeout=10)
            con.execute("SELECT 1")
            return con
        except sqlite3.Error as e:
            last_err = e
            time.sleep(delay)
    raise last_err


def connect_rw(db_path=DB_PATH_DEFAULT, retries=5, delay=1.5):
    last_err = None
    for attempt in range(retries):
        try:
            con = sqlite3.connect(db_path, timeout=20)
            con.execute("SELECT 1")
            return con
        except sqlite3.Error as e:
            last_err = e
            time.sleep(delay)
    raise last_err


def fetchall_retry(db_path, sql, params=(), retries=6, delay=1.0, mode="ro"):
    """Run one query end-to-end (fresh connection) with retries on transient errors."""
    last_err = None
    for attempt in range(retries):
        try:
            con = connect_ro(db_path, retries=2) if mode == "ro" else connect_rw(db_path, retries=2)
            cur = con.cursor()
            cur.execute(sql, params)
            rows = cur.fetchall()
            con.close()
            return rows
        except sqlite3.Error as e:
            last_err = e
            try:
                con.close()
            except Exception:
                pass
            time.sleep(delay)
    raise last_err


def paginated_fetch(db_path, sql_base, page=25, retries_per_page=6, delay=1.0):
    """
    sql_base must be a full SELECT without LIMIT/OFFSET; this appends them.
    Yields rows one page at a time, retrying each page independently.
    """
    offset = 0
    while True:
        sql = f"{sql_base} LIMIT {page} OFFSET {offset}"
        rows = fetchall_retry(db_path, sql, retries=retries_per_page, delay=delay)
        if not rows:
            break
        for r in rows:
            yield r
        if len(rows) < page:
            break
        offset += page


def execute_retry(db_path, sql, params=(), retries=6, delay=1.5):
    """Single-statement write with retry + commit."""
    last_err = None
    for attempt in range(retries):
        con = None
        try:
            con = connect_rw(db_path, retries=2)
            cur = con.cursor()
            cur.execute(sql, params)
            con.commit()
            n = cur.rowcount
            con.close()
            return n
        except sqlite3.Error as e:
            last_err = e
            if con:
                try:
                    con.close()
                except Exception:
                    pass
            time.sleep(delay)
    raise last_err
