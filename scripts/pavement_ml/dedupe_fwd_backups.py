#!/usr/bin/env python3
"""
Several FWD source files exist as byte-identical copies under backup folders
(e.g. 'Field FWD data backup/...', a second 'FWD KNBP 40kN/...' tree, nested
'Summary folder/' copies) and were each registered + parsed as independent
source files, causing their deflection readings to be counted 2-3x over.

For every (file_name, byte_size) group of already-parsed FWD sources with
more than one member, keep the one with the shortest relative_path (the
top-level/canonical copy) and delete the other copies' rows from
pms_fwd_observations, marking their source_files row 'duplicate_skipped' so
future re-runs of ingest_fwd.py leave them alone.
"""
import sqlite3, os

DB_PATH = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/data/traffic_platform.db")

def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()
    cur.execute("""
        SELECT file_name, byte_size, source_id, relative_path
        FROM pms_source_files
        WHERE repository_group='fwd_structural' AND ingestion_status='fwd_parsed'
        ORDER BY file_name, byte_size
    """)
    groups = {}
    for fn, sz, sid, rel in cur.fetchall():
        groups.setdefault((fn, sz), []).append((sid, rel))

    total_deleted_rows = 0
    total_dup_files = 0
    for (fn, sz), members in groups.items():
        if len(members) < 2:
            continue
        members.sort(key=lambda m: len(m[1]))  # shortest relative_path first = canonical
        canonical_sid = members[0][0]
        for sid, rel in members[1:]:
            cur.execute("DELETE FROM pms_fwd_observations WHERE source_id=?", (sid,))
            n = cur.rowcount
            cur.execute("UPDATE pms_source_files SET ingestion_status='duplicate_skipped' WHERE source_id=?", (sid,))
            total_deleted_rows += n
            total_dup_files += 1
            print(f"  duplicate of '{fn}': removed {n} rows from '{rel}' (kept '{members[0][1]}')")

    con.commit()
    print(f"\nRemoved {total_deleted_rows} duplicate rows across {total_dup_files} duplicate-copy files")
    con.close()

if __name__ == "__main__":
    main()
