from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
COMPANIES_DIR = WORKBENCH / "companies"
P0_QUEUE = WORKBENCH / "world500_technology_project_upgrade_queue.csv"
OUTPUT_CSV = WORKBENCH / "world500_technology_p0_project_candidate_snippets.csv"
OUTPUT_JSON = WORKBENCH / "world500_technology_p0_project_candidate_snippets_summary.json"

TECH_PATTERNS = {
    "carbon_management": [
        r"\bccus\b",
        r"carbon capture",
        r"carbon storage",
        r"carbon removal",
        r"direct air capture",
        r"\bmethane\b",
        r"flaring",
    ],
    "low_carbon_materials": [
        r"low-?carbon (?:material|steel|concrete|cement|aluminum|aluminium)",
        r"green steel",
        r"recycled aluminum",
        r"recycled aluminium",
        r"sustainable material",
    ],
    "electrified_transport": [
        r"electric vehicle",
        r"\bev\b",
        r"fleet electrification",
        r"electric truck",
        r"charging infrastructure",
        r"zero-emission vehicle",
    ],
    "battery_storage": [
        r"battery storage",
        r"energy storage",
        r"\bbess\b",
        r"storage system",
        r"battery energy storage",
    ],
    "renewable_power": [
        r"renewable electricity",
        r"renewable energy",
        r"\bsolar\b",
        r"\bwind\b",
        r"power purchase agreement",
        r"\bppa\b",
    ],
    "low_carbon_fuels": [
        r"low-?carbon fuel",
        r"sustainable aviation fuel",
        r"\bsaf\b",
        r"renewable diesel",
        r"\bbiofuel",
        r"bio-?fuel",
    ],
    "hydrogen_or_methanol": [
        r"green hydrogen",
        r"low-?carbon hydrogen",
        r"\bhydrogen\b",
        r"\bmethanol\b",
        r"\bammonia\b",
    ],
    "circularity": [
        r"circular economy",
        r"\brecycling\b",
        r"\brecycled\b",
        r"\breuse\b",
        r"waste reduction",
    ],
    "advanced_clean_power": [
        r"advanced nuclear",
        r"small modular reactor",
        r"\bsmr\b",
        r"clean power",
        r"geothermal",
    ],
}

PROJECT_SIGNAL = re.compile(
    r"project|program|initiative|facility|plant|pilot|deploy|deployment|install|installation|launch|"
    r"invest|investment|capex|cost|million|billion|\$|target|by 20[2-5]\d|in 20[2-5]\d|"
    r"reduce|reduction|abatement|avoid|avoided",
    re.I,
)

FIELDS = [
    "review_priority",
    "auto_promote_allowed",
    "candidate_status",
    "technology_id",
    "technology_name_en",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "industry_section_en",
    "source_file",
    "source_path",
    "page",
    "matched_terms",
    "project_signal_present",
    "candidate_snippet_en",
    "recommended_action_en",
    "recommended_action_zh",
]


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def company_payload(company_id: str) -> dict:
    path = COMPANIES_DIR / f"{company_id}.json"
    if not path.exists():
        return {}
    return read_json(path)


def source_pairs(company: dict) -> list[tuple[str, str]]:
    files = company.get("source_files") or []
    paths = company.get("source_paths") or []
    pairs = []
    for index, source_path in enumerate(paths):
        source_file = files[index] if index < len(files) else Path(str(source_path)).name
        if source_path and Path(source_path).exists():
            pairs.append((clean(source_file), clean(source_path)))
    return pairs


def snippet(text: str, start: int, end: int, radius: int = 320) -> str:
    return clean(text[max(0, start - radius): min(len(text), end + radius)])


def scan_pdf(source_file: str, source_path: str, technology_id: str, max_hits: int = 3) -> list[dict]:
    patterns = [re.compile(pattern, re.I) for pattern in TECH_PATTERNS.get(technology_id, [])]
    if not patterns:
        return []
    hits = []
    try:
        with fitz.open(source_path) as doc:
            for page_index in range(doc.page_count):
                text = clean(doc.load_page(page_index).get_text("text"))
                if not text:
                    continue
                matched = []
                first_span = None
                for pattern in patterns:
                    match = pattern.search(text)
                    if match:
                        matched.append(pattern.pattern)
                        if first_span is None or match.start() < first_span[0]:
                            first_span = (match.start(), match.end())
                if not matched or first_span is None:
                    continue
                page_snippet = snippet(text, first_span[0], first_span[1])
                hits.append({
                    "source_file": source_file,
                    "source_path": source_path,
                    "page": str(page_index + 1),
                    "matched_terms": " | ".join(matched),
                    "project_signal_present": "yes" if PROJECT_SIGNAL.search(page_snippet) else "no",
                    "candidate_snippet_en": page_snippet,
                })
                if len(hits) >= max_hits:
                    break
    except Exception:
        return []
    return hits


def main() -> None:
    p0_rows = [
        row
        for row in read_csv(P0_QUEUE)
        if row.get("queue_priority") == "P0"
        and row.get("current_signal_status") == "missing_company_specific_snippet"
    ]

    output_rows = []
    for row in p0_rows:
        company = company_payload(clean(row.get("company_id")))
        pairs = source_pairs(company)
        candidates = []
        for source_file, source_path in pairs:
            candidates.extend(scan_pdf(source_file, source_path, clean(row.get("technology_id"))))
            if len(candidates) >= 3:
                break
        if not candidates:
            output_rows.append({
                "review_priority": "P0_find_company_pdf_project_snippet",
                "auto_promote_allowed": "false",
                "candidate_status": "no_company_pdf_keyword_hit",
                "technology_id": clean(row.get("technology_id")),
                "technology_name_en": clean(row.get("technology_name_en")),
                "company_id": clean(row.get("company_id")),
                "company_name_en": clean(row.get("company_name_en")),
                "company_name_zh": clean(row.get("company_name_zh")),
                "world500_rank": clean(row.get("world500_rank")),
                "industry_section_en": clean(row.get("industry_section_en")),
                "source_file": "",
                "source_path": "",
                "page": "",
                "matched_terms": "",
                "project_signal_present": "no",
                "candidate_snippet_en": "",
                "recommended_action_en": "No company-report keyword hit was found. Keep this company-technology edge as a disclosure signal until a page-level company snippet is found.",
                "recommended_action_zh": "未在该公司报告中命中技术关键词。找到公司页级片段前，该企业-技术边只能保留为披露信号。",
            })
            continue
        for candidate in candidates[:3]:
            output_rows.append({
                "review_priority": "P0_review_candidate_project_snippet",
                "auto_promote_allowed": "false",
                "candidate_status": "candidate_company_pdf_keyword_hit",
                "technology_id": clean(row.get("technology_id")),
                "technology_name_en": clean(row.get("technology_name_en")),
                "company_id": clean(row.get("company_id")),
                "company_name_en": clean(row.get("company_name_en")),
                "company_name_zh": clean(row.get("company_name_zh")),
                "world500_rank": clean(row.get("world500_rank")),
                "industry_section_en": clean(row.get("industry_section_en")),
                **candidate,
                "recommended_action_en": "Review the candidate page. Promote only after extracting a concrete project or measure name, implementation stage, timeline/cost/abatement fields where disclosed, and source-page binding.",
                "recommended_action_zh": "复核候选页。只有抽取到具体项目/措施名称、实施阶段、时间/成本/减排字段（如披露）和页码来源绑定后，才能升级为项目证据。",
            })

    output_rows.sort(key=lambda item: (
        item["candidate_status"] != "candidate_company_pdf_keyword_hit",
        int(item["world500_rank"] or 9999),
        item["company_id"],
        item["technology_id"],
        item["page"],
    ))
    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(output_rows)

    hit_company_edges = {
        (row["company_id"], row["technology_id"])
        for row in output_rows
        if row["candidate_status"] == "candidate_company_pdf_keyword_hit"
    }
    payload = {
        "schema_version": "world500-technology-p0-project-candidate-snippets-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": "Candidate snippets are retrieval aids only. auto_promote_allowed is always false; candidates do not enter project evidence or the drawn graph until manually validated.",
        "source_file": "assets/data/world500/workbench/world500_technology_project_upgrade_queue.csv",
        "p0_company_technology_edge_count": len(p0_rows),
        "candidate_row_count": len(output_rows),
        "candidate_hit_edge_count": len(hit_company_edges),
        "candidate_no_hit_edge_count": len(p0_rows) - len(hit_company_edges),
        "output_csv": "assets/data/world500/workbench/world500_technology_p0_project_candidate_snippets.csv",
    }
    OUTPUT_JSON.write_text(f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
