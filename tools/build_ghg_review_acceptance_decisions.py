from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
LEDGER_JSON = WORKBENCH / "world500_ghg_series_acceptance_ledger.json"
OUT_JSON = WORKBENCH / "world500_ghg_review_acceptance_decisions.json"
OUT_CSV = WORKBENCH / "world500_ghg_review_acceptance_decisions.csv"

FIELDS = [
    "decision_id",
    "source_queue",
    "decision_bucket",
    "decision_status",
    "company_id",
    "company_name_en",
    "world500_rank",
    "series_id",
    "series_name_en",
    "review_priority",
    "match_status",
    "evidence_gate",
    "pages",
    "source_files",
    "decision_reason_en",
    "next_action_en",
]

REASONS = {
    "accepted": "Accepted: source text explicitly names this exact controlled GHGP/PCAF standard or guidance.",
    "review": "Review: contextual inventory or Scope wording is present, but the page does not explicitly name this exact GHGP/PCAF series.",
    "demoted": "Demoted: contextual overmapping points to another series or only generic GHG context; keep out of accepted graph.",
}

ACTIONS = {
    "accepted": "Keep in the accepted GHGP fine-series graph with page/source evidence.",
    "review": "Promote only after page-level PDF text explicitly names this exact controlled GHGP/PCAF standard; otherwise keep review-only.",
    "demoted": "Do not draw as accepted. Use only as a search/demotion lead unless new explicit page evidence is found.",
}

PRIORITIES = {
    "accepted": "P0_acceptance_graph",
    "review": "P0_review_queue",
    "demoted": "P0_demoted_overmapping",
}


def clean(value: object) -> str:
    return str(value or "").strip()


def main() -> None:
    payload = json.loads(LEDGER_JSON.read_text(encoding="utf-8"))
    rows = payload.get("rows", [])
    decisions: list[dict] = []
    for row in rows:
        bucket = clean(row.get("decision_bucket"))
        decisions.append({
            "decision_id": clean(row.get("decision_id")),
            "source_queue": "world500_ghg_series_acceptance_ledger.json",
            "decision_bucket": bucket,
            "decision_status": clean(row.get("decision_status")),
            "company_id": clean(row.get("company_id")),
            "company_name_en": clean(row.get("company_name_en")),
            "world500_rank": clean(row.get("world500_rank")),
            "series_id": clean(row.get("series_id")),
            "series_name_en": clean(row.get("series_name_en")),
            "review_priority": PRIORITIES.get(bucket, "P0_unknown"),
            "match_status": clean(row.get("match_status")),
            "evidence_gate": clean(row.get("evidence_gate")),
            "pages": clean(row.get("pages")),
            "source_files": clean(row.get("source_files")),
            "decision_reason_en": REASONS.get(bucket, "Unknown decision bucket."),
            "next_action_en": ACTIONS.get(bucket, "Review manually before any graph use."),
        })
    counts = Counter(row["decision_bucket"] for row in decisions)
    by_status = Counter(row["decision_status"] for row in decisions)
    payload_out = {
        "schema_version": "world500-ghg-review-acceptance-decisions-v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "policy": "This file is the accepted/review/demoted decision view for GHGP fine-series edges and does not promote evidence beyond the acceptance ledger.",
        "source_file": LEDGER_JSON.relative_to(ROOT).as_posix(),
        "row_count": len(decisions),
        "decision_bucket_counts": dict(sorted(counts.items())),
        "decision_status_counts": dict(sorted(by_status.items())),
        "decisions": decisions,
    }
    OUT_JSON.write_text(json.dumps(payload_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(decisions)
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUT_CSV.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
