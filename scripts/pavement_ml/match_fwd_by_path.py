#!/usr/bin/env python3
"""
Second-pass FWD-to-link matcher for rows the road_label-keyword pass couldn't
place, because their road_label was built from a generic immediate-parent
folder name (e.g. 'Analysis data', 'Summary folder', 'Combined Analysis') and
lost the real corridor name that lives further up the path
(e.g. 'FWD REPORTS/Mukono -Katosi/Analysis data/AASHTO Calc.xls').

Matches by substring on the source file's relative_path instead of road_label.
Rules with explicit link_ids skip the chainage-bucket step (single-link
corridors); rules with keywords fall back to the same candidate + cumulative
chainage bucketing used by match_fwd_links.py.
"""
import sqlite3, os, re

DB_PATH = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/data/traffic_platform.db")

# path substring (case-insensitive) -> either {"link_id": "..."} (single link, no bucketing)
# or {"keywords": [...]} (multi-link corridor, bucket by chainage like match_fwd_links.py)
PATH_RULES = [
    ("FWD REPORTS/Bugiri -Malaba", {"keywords": ["Bugiri", "Malaba"]}),
    ("FWD REPORTS/KIREKA-KIRA ROAD", {"keywords": ["Kireka"]}),
    ("FWD REPORTS/Mukono -Katosi", {"link_id": "C024_Link01"}),  # Mukono-Kyetume-Kisoga-Katosi
    ("FWD REPORTS/Namutere-Busia", {"keywords": ["Namutere", "Busia"]}),
    ("Dinah (fwd NPS)/Northern By Pass", {"link_id": "M20"}),  # Kampala NorthernBypass
    ("Dinah (fwd NPS)/RHS  Inner Lane", {"link_id": "M20"}),
]


def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()
    cur.execute("SELECT link_id, link_name, chainage_from_km, chainage_to_km, length_km FROM pms_road_links")
    links = cur.fetchall()
    valid_link_ids = {l[0] for l in links}

    cur.execute("""
        SELECT o.fwd_id, sf.relative_path, o.chainage_km
        FROM pms_fwd_observations o JOIN pms_source_files sf ON sf.source_id = o.source_id
        WHERE o.link_id IS NULL
    """)
    rows = cur.fetchall()
    print(f"{len(rows)} unmatched rows to consider")

    def link_num(lid):
        m = re.search(r'Link(\d+)$', lid)
        return int(m.group(1)) if m else 0

    n_updated = 0
    by_rule = {}
    for fwd_id, rel_path, chainage_km in rows:
        rp_l = rel_path.lower()
        rule = None
        for substr, spec in PATH_RULES:
            if substr.lower() in rp_l:
                rule = spec
                break
        if rule is None:
            continue

        if "link_id" in rule:
            if rule["link_id"] not in valid_link_ids:
                continue
            assigned = rule["link_id"]
        else:
            keywords = rule["keywords"]
            candidates = []
            for link_id, link_name, c_from, c_to, length_km in links:
                name_l = (link_name or "").lower()
                if sum(1 for kw in keywords if kw.lower() in name_l) >= 1:
                    candidates.append((link_id, length_km or 0))
            if not candidates:
                continue
            candidates.sort(key=lambda c: link_num(c[0]))
            cum = 0.0
            buckets = []
            for link_id, length_km in candidates:
                buckets.append((cum, cum + length_km, link_id))
                cum += length_km
            ck = (chainage_km or 0) / 1000.0 if chainage_km and chainage_km > cum * 2 else (chainage_km or 0)
            assigned = buckets[0][2]
            for lo, hi, lid in buckets:
                if lo <= ck < hi or (hi == buckets[-1][1] and ck >= hi):
                    assigned = lid
                    break

        cur.execute("UPDATE pms_fwd_observations SET link_id=? WHERE fwd_id=?", (assigned, fwd_id))
        n_updated += 1
        key = next(s for s, _ in PATH_RULES if s.lower() in rp_l)
        by_rule[key] = by_rule.get(key, 0) + 1

    con.commit()
    print(f"\nUpdated {n_updated} rows via path-based rules")
    for k, v in by_rule.items():
        print(f"  {k}: {v} rows")
    con.close()


if __name__ == "__main__":
    main()
