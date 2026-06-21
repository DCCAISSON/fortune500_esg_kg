from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
SOURCE = WORKBENCH / "world500_technology_project_evidence.json"
OUT_JSON = WORKBENCH / "world500_technology_cost_p0_strict_evidence_batch.json"
OUT_CSV = WORKBENCH / "world500_technology_cost_p0_strict_evidence_batch.csv"

P0_TECHS = {
    "electrified_transport",
    "battery_storage",
    "renewable_power",
    "energy_efficiency",
    "low_carbon_fuels",
}

INVALID_COST_RE = re.compile(
    r"no quantified|not disclose|not disclosed|does not disclose|transaction amount is not|not separately quantified|"
    r"share is not|no cost|not provided|not quantified|sales revenue|cost advantage|reduce operating costs",
    re.I,
)
AMOUNT_RE = re.compile(
    r"(?:\$|US\$|USD|EUR|€|£|CNY|RMB|¥)\s?\d|\d+(?:\.\d+)?\s?(?:million|billion|trillion|bn|m)\b",
    re.I,
)
COST_WORD_RE = re.compile(
    r"invest|investment|capex|capital expenditure|allocation|green loan|loan|finance|financing|budget|bond|cost|saving",
    re.I,
)

FIELDS = [
    "batch_id",
    "validation_status",
    "technology_id",
    "company_id",
    "company_name_en",
    "world500_rank",
    "project_name_en",
    "measure_name_en",
    "timeline_years",
    "cost_or_investment_en",
    "abatement_effect_en",
    "evidence_page",
    "source_file",
    "snippet_en",
    "decision_reason_en",
]


def clean(value: object) -> str:
    if isinstance(value, list):
        return " | ".join(str(item).strip() for item in value if str(item).strip())
    return str(value or "").strip()


def is_strict_cost(text: str) -> bool:
    source = clean(text)
    if not source or INVALID_COST_RE.search(source):
        return False
    return bool(AMOUNT_RE.search(source) and COST_WORD_RE.search(source))


def cost_scope_note(text: str) -> str:
    source = clean(text)
    if re.search(r"combined|bundle|does not allocate|not allocate|not separately", source, re.I):
        return "Accepted as bundled cost/investment evidence; do not read as technology-specific allocated cost."
    return "Accepted as technology-path cost/investment evidence with page-level source binding."


def main() -> None:
    payload = json.loads(SOURCE.read_text(encoding="utf-8"))
    records = [row for row in payload.get("records", []) if row.get("technology_id") in P0_TECHS]
    accepted = []
    review = []
    for row in records:
        cost_text = clean(row.get("cost_or_investment_en"))
        target = accepted if is_strict_cost(cost_text) else review
        target.append({
            "validation_status": "accepted_strict_cost_or_investment_evidence" if target is accepted else "review_missing_or_unquantified_cost_evidence",
            "technology_id": clean(row.get("technology_id")),
            "company_id": clean(row.get("company_id")),
            "company_name_en": clean(row.get("company_name_en")),
            "world500_rank": clean(row.get("world500_rank")),
            "project_name_en": clean(row.get("project_name_en")),
            "measure_name_en": clean(row.get("measure_name_en")),
            "timeline_years": clean(row.get("timeline_years")),
            "cost_or_investment_en": cost_text,
            "abatement_effect_en": clean(row.get("abatement_effect_en")),
            "evidence_page": clean(row.get("evidence_page") or row.get("page")),
            "source_file": clean(row.get("source_file")),
            "snippet_en": clean(row.get("snippet_en")),
            "decision_reason_en": (
                cost_scope_note(cost_text)
                if target is accepted
                else "Keep as review: no explicit monetary amount, no investment/cost wording, or wording says cost is not disclosed/unquantified."
            ),
        })
    rows = []
    for index, row in enumerate(accepted + review, 1):
        rows.append({"batch_id": f"TECH-COST-P0-{index:04d}", **row})
    counts = Counter(row["validation_status"] for row in rows)
    by_tech = Counter(row["technology_id"] for row in rows if row["validation_status"] == "accepted_strict_cost_or_investment_evidence")
    payload_out = {
        "schema_version": "world500-technology-cost-p0-strict-evidence-batch-v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "policy": "Counts only existing page-level project records whose cost/investment field contains explicit monetary amount plus investment/cost/finance wording; capacity, procurement volume, and unquantified cost advantage text stay review-only.",
        "source_file": SOURCE.relative_to(ROOT).as_posix(),
        "target_technology_ids": sorted(P0_TECHS),
        "row_count": len(rows),
        "accepted_strict_cost_evidence_count": counts.get("accepted_strict_cost_or_investment_evidence", 0),
        "review_missing_or_unquantified_cost_count": counts.get("review_missing_or_unquantified_cost_evidence", 0),
        "accepted_strict_cost_company_count": len({row["company_id"] for row in accepted if row["company_id"]}),
        "accepted_strict_cost_technology_counts": dict(sorted(by_tech.items())),
        "records": rows,
    }
    OUT_JSON.write_text(json.dumps(payload_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUT_CSV.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
