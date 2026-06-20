from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"

BACKFILL_JSON = WORKBENCH / "ghg_series_pdf_page_backfill.json"
ACCEPTED_CSV = WORKBENCH / "world500_ghg_accepted_series_mapping.csv"
OUTPUT_CSV = WORKBENCH / "world500_ghg_backfill_explicit_recheck_queue.csv"
OUTPUT_JSON = WORKBENCH / "world500_ghg_backfill_explicit_recheck_summary.json"

CORE_PATTERNS = {
    "ghg_policy_action_standard": [
        r"ghg protocol policy and action standard",
        r"policy and action standard",
    ],
    "ghg_mitigation_goal_standard": [
        r"ghg protocol mitigation goal standard",
        r"mitigation goal standard",
    ],
    "ghg_land_sector_removals_standard": [
        r"ghg protocol land sector and removals standard",
        r"land sector and removals standard",
        r"land-sector-and-removals-standard",
    ],
    "ghg_grid_connected_electricity_projects": [
        r"ghg protocol guidelines for grid-connected electricity projects",
        r"guidelines for grid-connected electricity projects",
        r"grid-connected electricity projects",
        r"grid connected electricity projects",
    ],
    "ghg_cities_gpc": [
        r"global protocol for community-scale greenhouse gas emission inventories",
        r"global protocol for community-scale greenhouse gas inventories",
        r"\bgpc\b.*community-scale greenhouse gas emission inventories",
    ],
    "ghg_scope3_standard": [
        r"ghg protocol corporate value chain\s*\(scope 3\)\s*accounting and reporting standard",
        r"corporate value chain\s*\(scope 3\)\s*accounting and reporting standard",
        r"scope 3 accounting and reporting standard",
    ],
    "ghg_financial_industry_standard": [
        r"global ghg accounting and reporting standard for the financial industry",
        r"the global ghg accounting and reporting standard for the financial industry",
        r"partnership for carbon accounting financials",
        r"\bpcaf\b",
    ],
    "ghg_scope2_guidance": [
        r"ghg protocol scope 2 guidance",
        r"scope 2 guidance",
    ],
    "ghg_scope3_calculation_guidance": [
        r"ghg protocol scope 3 calculation guidance",
        r"scope 3 calculation guidance",
        r"technical guidance.*calculat.*scope 3",
    ],
    "ghg_corporate_standard": [
        r"ghg protocol corporate accounting and reporting standard",
        r"greenhouse gas protocol.?s corporate accounting and reporting standard",
        r"greenhouse gas protocol corporate accounting and reporting standard",
        r"corporate accounting and reporting standard",
    ],
    "ghg_project_protocol": [
        r"ghg protocol project protocol",
        r"project protocol",
        r"the ghg protocol for project accounting",
        r"ghg protocol for project accounting",
    ],
    "ghg_product_standard": [
        r"ghg protocol product life cycle accounting and reporting standard",
        r"product life cycle accounting and reporting standard",
        r"ghg protocol product standard",
        r"greenhouse gas protocol product standard",
        r"\bghgp\b.*product life cycle",
    ],
}

COMPILED_PATTERNS = {
    series_id: [re.compile(pattern, re.I) for pattern in patterns]
    for series_id, patterns in CORE_PATTERNS.items()
}

FIELDS = [
    "review_priority",
    "recommended_action",
    "accepted_edge",
    "strict_named_series_ids",
    "accepted_replacement_series_ids",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "series_id",
    "name_en",
    "name_zh",
    "match_status",
    "source_file",
    "page",
    "page_window",
    "document_match_pages",
    "snippet_en",
    "recognition_basis_en",
    "recognition_basis_zh",
]


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def strict_named_series_ids(row: dict) -> list[str]:
    text = clean(
        " ".join(
            str(row.get(key, ""))
            for key in (
                "snippet_en",
                "snippet_zh",
            )
        )
    )
    return sorted(
        series_id
        for series_id, patterns in COMPILED_PATTERNS.items()
        if any(pattern.search(text) for pattern in patterns)
    )


def context_window(text: str, pattern: re.Pattern, radius: int = 360) -> str:
    match = pattern.search(text)
    if not match:
        return text
    start = max(0, match.start() - radius)
    end = min(len(text), match.end() + radius)
    return clean(text[start:end])


def has_acceptance_context(text: str) -> bool:
    return bool(re.search(
        r"in accordance with|in line with|align(?:ed|ment)? (?:with|to)|adher(?:e|es|ed|ing) to|according to|under (?:the )?|basis set out (?:within|in)|participated in the pilot|pilot of the standard|since[\s\S]{0,80}published|calculated(?:\s+\w+){0,8}\s+(?:per|using|under|according to|in accordance with|based on|consistent with)|prepared(?:\s+\w+){0,8}\s+(?:using|under|according to|in accordance with|based on|consistent with)|using|uses|used|following|followed|based on|criteria|methodolog|accounted|guided|pursuant to|consistent with|conform(?:s|ed|ing)? to|reference to|draws on|defined by|defined in|classif(?:y|ies|ied)|standard(?:s)? used|standards? including|recommended by|as recommended by|assessment.*in line|we follow|we use|we also use|we apply|apply|applies|applied|verification conducted|assurance.*against|report(?:ed|ing)?(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)|disclos(?:e|ed|ing)(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)|按照|依据|根据|参照|采用|使用|遵循|符合|依據|根據|參照|採用|遵循",
        clean(text),
        re.I,
    ))


def has_series_acceptance_context(series_id: str, text: str) -> bool:
    source = clean(text)
    if not source or not has_acceptance_context(source):
        return False
    if series_id != "ghg_financial_industry_standard":
        return True
    has_finance_boundary = bool(re.search(
        r"financed(?: and facilitated)? emissions|facilitated emissions|portfolio emissions|insurance[-\s]+associated emissions|insured emissions|loans? and investments?|investment emissions|investments? emission|category\s*15|asset classes?|data quality score|pcaf score|listed equity|corporate bonds?|business loans?|project finance|commercial real estate|mortgages?|sovereign debt|lending\/capital markets|green bonds?|renewable energy power plants",
        source,
        re.I,
    ))
    negative_use = bool(re.search(
        r"(?:do|does|did)\s+not\s+(?:use|apply|follow)|not\s+(?:used|applied|followed)|pcaf[\s\S]{0,160}not\s+suitable|pcaf methodology[\s\S]{0,160}nonsensical|determined[\s\S]{0,160}pcaf[\s\S]{0,160}not\s+suitable|pcaf[\s\S]{0,80}lacks guidance|pcaf-like",
        source,
        re.I,
    ))
    return has_finance_boundary and not negative_use


def acceptance_context_series_ids(row: dict) -> list[str]:
    text = clean(" ".join(str(row.get(key, "")) for key in ("snippet_en", "snippet_zh")))
    accepted = []
    for series_id, patterns in COMPILED_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(text) and has_series_acceptance_context(series_id, context_window(text, pattern)):
                accepted.append(series_id)
                break
    return sorted(set(accepted))


def classify(row: dict, accepted_keys: set[tuple[str, str]], accepted_by_company: dict[str, set[str]]) -> dict:
    named_ids = strict_named_series_ids(row)
    context_named_ids = acceptance_context_series_ids(row)
    key = (clean(row.get("company_id")), clean(row.get("series_id")))
    accepted = key in accepted_keys
    company_id = clean(row.get("company_id"))
    accepted_replacements = sorted(
        series_id
        for series_id in context_named_ids
        if series_id != clean(row.get("series_id")) and series_id in accepted_by_company.get(company_id, set())
    )

    if accepted:
        action = "already_accepted"
        priority = "closed"
    elif accepted_replacements:
        action = "current_edge_demoted_reassignment_already_accepted"
        priority = "closed"
    elif clean(row.get("series_id")) in context_named_ids:
        action = "P0_possible_acceptance_gap_strict_alias_not_in_accepted"
        priority = "P0"
    elif context_named_ids:
        action = "P0_reassign_to_named_series_missing_accepted_edge"
        priority = "P0"
    elif named_ids:
        action = "P1_demote_raw_explicit_to_contextual_review_no_acceptance_context"
        priority = "P1"
    else:
        action = "P1_demote_raw_explicit_to_contextual_review_no_strict_alias"
        priority = "P1"

    return {
        "review_priority": priority,
        "recommended_action": action,
        "accepted_edge": "yes" if accepted else "no",
        "strict_named_series_ids": "|".join(named_ids),
        "accepted_replacement_series_ids": "|".join(accepted_replacements),
        **{
            field: clean(row.get(field))
            for field in FIELDS
            if field not in {
                "review_priority",
                "recommended_action",
                "accepted_edge",
                "strict_named_series_ids",
                "accepted_replacement_series_ids",
            }
        },
    }


def main() -> None:
    backfill = read_json(BACKFILL_JSON)
    accepted_rows = read_csv(ACCEPTED_CSV)
    accepted_keys = {
        (clean(row.get("company_id")), clean(row.get("series_id")))
        for row in accepted_rows
    }
    accepted_by_company: dict[str, set[str]] = {}
    for row in accepted_rows:
        accepted_by_company.setdefault(clean(row.get("company_id")), set()).add(clean(row.get("series_id")))

    raw_explicit_rows = [
        row
        for row in backfill.get("records", [])
        if clean(row.get("match_status")) == "pdf_explicit_series_citation"
    ]
    output_rows = [classify(row, accepted_keys, accepted_by_company) for row in raw_explicit_rows]
    output_rows.sort(
        key=lambda row: (
            row["review_priority"] == "closed",
            row["review_priority"],
            int(row["world500_rank"] or 9999),
            row["company_id"],
            row["series_id"],
        )
    )

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(output_rows)

    action_counts = Counter(row["recommended_action"] for row in output_rows)
    payload = {
        "schema_version": "world500-ghg-backfill-explicit-recheck-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": "Raw PDF backfill explicit labels are rechecked against the controlled 12-item GHG/PCAF whitelist before any accepted graph promotion.",
        "source_files": [
            "assets/data/world500/workbench/ghg_series_pdf_page_backfill.json",
            "assets/data/world500/workbench/world500_ghg_accepted_series_mapping.csv",
        ],
        "raw_explicit_row_count": len(raw_explicit_rows),
        "already_accepted_count": action_counts["already_accepted"],
        "demoted_reassignment_already_accepted_count": action_counts["current_edge_demoted_reassignment_already_accepted"],
        "possible_acceptance_gap_count": action_counts["P0_possible_acceptance_gap_strict_alias_not_in_accepted"],
        "reassign_missing_accepted_edge_count": action_counts["P0_reassign_to_named_series_missing_accepted_edge"],
        "raw_explicit_without_strict_alias_count": action_counts["P1_demote_raw_explicit_to_contextual_review_no_strict_alias"],
        "raw_explicit_without_acceptance_context_count": action_counts["P1_demote_raw_explicit_to_contextual_review_no_acceptance_context"],
        "action_counts": dict(action_counts),
        "queue_file": "assets/data/world500/workbench/world500_ghg_backfill_explicit_recheck_queue.csv",
    }
    OUTPUT_JSON.write_text(f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
