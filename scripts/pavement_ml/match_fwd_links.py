#!/usr/bin/env python3
"""
Match FWD deflection readings to road links by corridor keyword (the raw GPS
'Lat'/'Long' columns in the source workbooks turned out to be non-WGS84 device
output, not usable for spatial matching - values like lat=20.79, long=3238.94
fall far outside Uganda's real -1.5..4.3 / 29..35 range).

Instead: map each distinct road_label to the road-link corridor it names
(via place-name keywords against pms_road_links.link_name), then for corridors
spanning multiple links, bucket each reading's chainage_km into the right link
using cumulative length_km in link-number order.
"""
import sqlite3, os, re

DB_PATH = os.path.expanduser("~/mnt/Uganda National Road Network Repository/ugnrms/data/traffic_platform.db")

# road_label -> ordered list of place-name keywords defining the corridor, in travel order
CORRIDOR_KEYWORDS = {
    "Summary of FWD Data for Mbarara -Ishaka": ["Mbarara", "Ishanyu", "Kabwohe", "Ishaka"],
    "Summary of fwd Data for Matugga -Semuto -Kapeeka both lanes": ["Matugga", "Semuto", "Kapeeka"],
    "FWD_Analysis_Tool_Gulu_Nimule_Atiak_final_v2": ["Gulu", "Atiak", "Nimule"],
    "Summary analysis data for Mubende -Kyenjojo": ["Mubende", "Kyenjojo"],
    "FWD_Analysis_Tool_Kiboga_Hoima_final_v2": ["Kiboga", "Hoima"],
    "FWD_Analysis_Tool_Kiboga_Hoima": ["Kiboga", "Hoima"],
    "Analysis of FWD Data for LHS_KH_31.07.2026": ["Kiboga", "Hoima"],
    "FWD_Analysis_Tool_Rukungiri_Ntungamo_final_v2": ["Rukungiri", "Ntungamo"],
    "FWD_Analysis_Tool_Rukungiri_Ntungamo_corrected": ["Rukungiri", "Ntungamo"],
    "Tororo - Mbale - Soroti": ["Tororo", "Mbale", "Soroti"],
    "AASHTO Calc (Bugiri - Malaba Road)": ["Bugiri", "Malaba"],
    "AASHTO Calc Bumbobi - Lwakhakha": ["Bumbobi", "Lwakhakha"],
    "AASHTO Calc (Namutere -Busia Road)": ["Namutere", "Busia"],
    "Kaserem_Kapchorwa Deflection Data": ["Kaserem", "Kapchorwa"],
    "Summary of Analysis Table of Kireka -Kiira": ["Kireka", "Kiira"],
    "Namutere-Busia - AASHTO Calc": ["Namutere", "Busia"],
    # added after Pattern C/D parser extension (StationID/Stations-lookup + Raw_Data layouts)
    "ATIAK - GULU Drops": ["Gulu", "Atiak"],
    "FWD_Analysis_Tool_Gulu_Nimule_Atiak": ["Gulu", "Atiak", "Nimule"],
    "FWD_Analysis_Tool_Rukungiri_Ntungamo": ["Rukungiri", "Ntungamo"],
    "Ataik - Gulu": ["Gulu", "Atiak"],
    "Ataik - Nimule Section 2": ["Atiak", "Nimule"],
    "Gulu - Ataik": ["Gulu", "Atiak"],
    "Nimule Ataik RHS": ["Nimule", "Atiak"],
    "FWD DATA NTUNGAMO - RUKUNGIRI ROAD": ["Ntungamo", "Rukungiri"],
    "KIREKA DATA)_ACCESS": ["Kireka"],
    "Mbuya Silver spring -Joka's": ["Mbuya", "Kireka"],
    # Kikorongo - Bwera - Mpondwe corridor (single link A005_Link15)
    "Both lane Analysis Summary": ["Mpondwe"],
    "Kikorongo (Analysis)(LHS)": ["Mpondwe"],
    "Kikorongo (Analysis)": ["Mpondwe"],
    "Stations RHS lane": ["Mpondwe"],
}

def main():
    con = sqlite3.connect(DB_PATH, timeout=60)
    cur = con.cursor()
    cur.execute("SELECT link_id, link_name, chainage_from_km, chainage_to_km, length_km FROM pms_road_links")
    links = cur.fetchall()

    total_matched_rows = 0
    total_matched_labels = 0
    unmatched_labels = []

    cur.execute("SELECT DISTINCT road_label FROM pms_fwd_observations")
    all_labels = [r[0] for r in cur.fetchall()]

    for label in all_labels:
        keywords = CORRIDOR_KEYWORDS.get(label)
        if not keywords:
            unmatched_labels.append(label)
            continue
        # find links whose link_name contains at least one adjacent keyword pair (rough corridor membership)
        candidates = []
        for link_id, link_name, c_from, c_to, length_km in links:
            name_l = (link_name or "").lower()
            hits = sum(1 for kw in keywords if kw.lower() in name_l)
            if hits >= 1:
                candidates.append((link_id, length_km or 0))

        if not candidates:
            unmatched_labels.append(f"{label} (no link_name match for {keywords})")
            continue

        def link_num(lid):
            m = re.search(r'Link(\d+)$', lid)
            return int(m.group(1)) if m else 0
        candidates.sort(key=lambda c: link_num(c[0]))

        if len(candidates) == 1:
            link_id = candidates[0][0]
            cur.execute("UPDATE pms_fwd_observations SET link_id=? WHERE road_label=?", (link_id, label))
            n = cur.rowcount
        else:
            # bucket by cumulative chainage across the ordered candidate links
            cum = 0.0
            buckets = []
            for link_id, length_km in candidates:
                buckets.append((cum, cum + length_km, link_id))
                cum += length_km
            cur.execute("SELECT fwd_id, chainage_km FROM pms_fwd_observations WHERE road_label=?", (label,))
            rows = cur.fetchall()
            n = 0
            for fwd_id, chainage_km in rows:
                ck = (chainage_km or 0) / 1000.0 if chainage_km and chainage_km > cum * 2 else (chainage_km or 0)
                assigned = None
                for lo, hi, lid in buckets:
                    if lo <= ck < hi or (hi == buckets[-1][1] and ck >= hi):
                        assigned = lid
                        break
                if assigned is None:
                    assigned = buckets[0][2]
                cur.execute("UPDATE pms_fwd_observations SET link_id=? WHERE fwd_id=?", (assigned, fwd_id))
                n += 1
        total_matched_rows += n
        total_matched_labels += 1
        print(f"  {label}: {len(candidates)} candidate link(s), {n} rows matched")

    con.commit()
    print(f"\nMatched {total_matched_labels}/{len(all_labels)} distinct road labels, {total_matched_rows} rows total")
    print(f"Unmatched labels ({len(unmatched_labels)}):")
    for u in unmatched_labels:
        print(f"  - {u}")
    con.close()

if __name__ == "__main__":
    main()
