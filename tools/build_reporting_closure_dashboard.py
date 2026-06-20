from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from reporting_queue_utils import closed_queue_count, effective_queue_rows


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
WORKPLAN = WORKBENCH / "world500_reporting_completion_workplan.json"
OUTPUT_JSON = WORKBENCH / "world500_reporting_closure_dashboard.json"
OUTPUT_CSV = WORKBENCH / "world500_reporting_closure_dashboard.csv"


PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3, "Monitor": 9, "": 99}


CSV_FIELDS = [
    "priority",
    "requirement_id",
    "issue_id",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "open_queue_rows",
    "queue_files",
    "queue_types",
    "review_priorities",
    "evidence_boundaries",
    "acceptance_gate_en",
    "safe_next_action_zh",
    "safe_next_action_en",
    "sample_source_files",
    "sample_pages",
    "sample_snippet_en",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict]:
    if not path.exists() or not path.name:
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fields})


def split_values(value: object) -> list[str]:
    text = str(value or "").strip()
    if not text:
        return []
    separators = [" | ", ";", ","]
    values = [text]
    for separator in separators:
        next_values: list[str] = []
        for item in values:
            next_values.extend(part.strip() for part in item.split(separator))
        values = next_values
    return [item for item in values if item]


def join_values(values: list[object]) -> str:
    seen = set()
    cleaned = []
    for value in values:
        for part in split_values(value):
            if part not in seen:
                cleaned.append(part)
                seen.add(part)
    return " | ".join(cleaned)


def first_value(rows: list[dict], *keys: str) -> str:
    for row in rows:
        for key in keys:
            value = str(row.get(key, "")).strip()
            if value:
                return value
    return ""


def group_key(workplan_row: dict, queue_row: dict) -> tuple[str, str, str, str]:
    company_id = str(queue_row.get("company_id") or "").strip()
    if not company_id:
        company_id = "_issue_level"
    return (
        str(workplan_row.get("priority") or ""),
        str(workplan_row.get("requirement_id") or ""),
        str(workplan_row.get("issue_id") or ""),
        company_id,
    )


def queue_type(row: dict) -> str:
    return (
        row.get("queue_type")
        or row.get("_queue_type")
        or row.get("review_bucket")
        or row.get("review_priority")
        or row.get("repair_priority")
        or ""
    )


def sample_pages(rows: list[dict]) -> str:
    values = []
    for row in rows:
        values.extend([
            row.get("pages"),
            row.get("sample_pages"),
            row.get("selected_evidence_pages"),
            row.get("evidence_page"),
        ])
    return join_values(values)


def sample_sources(rows: list[dict]) -> str:
    values = []
    for row in rows:
        values.extend([
            row.get("source_files"),
            row.get("sample_source_files"),
            row.get("selected_source_files"),
            row.get("source_file"),
        ])
    return join_values(values)


def safe_next_action_en(issue_id: str) -> str:
    actions = {
        "ghg_protocol_fine_series": (
            "Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; "
            "otherwise keep review-only or demote the edge."
        ),
        "emissions_ranking": (
            "Backfill missing Scope value, unit, year, boundary, and Scope 2 method before adding the company to the "
            "complete comparable ranking."
        ),
        "scope_language_policy": (
            "Confirm Scope wording is source-quote context only and is not promoted into non-GHG standard terminology."
        ),
        "technology_path_axis": (
            "Backfill company-specific project evidence, timeline milestone, cost/investment, or abatement evidence "
            "before treating the company-technology edge as validated."
        ),
        "primary_secondary_bubble": (
            "Separate explicit reported primary-data calculation weights from source-mix inference before using the "
            "ratio as a data-quality conclusion."
        ),
    }
    return actions.get(issue_id, "Close the source queue against page-level evidence before promoting the relationship.")


def build_dashboard() -> dict:
    workplan = read_json(WORKPLAN)
    grouped: dict[tuple[str, str, str, str], list[dict]] = defaultdict(list)
    group_meta: dict[tuple[str, str, str, str], dict] = {}
    queue_file_counts = Counter()

    for workplan_row in workplan.get("rows", []):
        queue_file = str(workplan_row.get("queue_file") or "").strip()
        if not queue_file:
            continue
        relative = queue_file.replace("\\", "/")
        raw_rows = read_csv(ROOT / relative)
        rows = effective_queue_rows(ROOT, relative, raw_rows)
        queue_file_counts[relative] += len(rows)
        for queue_row in rows:
            key = group_key(workplan_row, queue_row)
            grouped[key].append({**queue_row, "_queue_file": relative})
            group_meta[key] = workplan_row

    batches: list[dict] = []
    for key, rows in grouped.items():
        priority, requirement_id, issue_id, company_id = key
        workplan_row = group_meta[key]
        batches.append({
            "priority": priority,
            "requirement_id": requirement_id,
            "issue_id": issue_id,
            "company_id": "" if company_id == "_issue_level" else company_id,
            "company_name_en": first_value(rows, "company_name_en"),
            "company_name_zh": first_value(rows, "company_name_zh"),
            "world500_rank": first_value(rows, "world500_rank"),
            "open_queue_rows": len(rows),
            "queue_files": join_values([row.get("_queue_file") for row in rows]),
            "queue_types": join_values([queue_type(row) for row in rows]),
            "review_priorities": join_values([row.get("review_priority") for row in rows]),
            "evidence_boundaries": join_values([row.get("evidence_boundary") for row in rows]),
            "acceptance_gate_en": workplan_row.get("acceptance_gate_en", ""),
            "safe_next_action_zh": workplan_row.get("next_action_zh", ""),
            "safe_next_action_en": safe_next_action_en(issue_id),
            "sample_source_files": sample_sources(rows),
            "sample_pages": sample_pages(rows),
            "sample_snippet_en": first_value(rows, "sample_snippet_en", "snippet_en", "company_sample_snippet_en"),
        })

    batches.sort(
        key=lambda row: (
            PRIORITY_ORDER.get(row["priority"], 99),
            row["requirement_id"],
            row["issue_id"],
            -int(row["open_queue_rows"]),
            int(row["world500_rank"] or 999999),
            row["company_id"],
        )
    )

    issue_totals = Counter()
    requirement_totals = Counter()
    priority_totals = Counter()
    for row in batches:
        issue_totals[row["issue_id"]] += int(row["open_queue_rows"])
        requirement_totals[row["requirement_id"]] += int(row["open_queue_rows"])
        priority_totals[row["priority"]] += int(row["open_queue_rows"])

    return {
        "schema_version": "world500-reporting-closure-dashboard-v1",
        "generated_at": now_iso(),
        "policy": (
            "This dashboard groups unresolved queues into executable review batches. It does not promote evidence, "
            "does not change graph edges, and does not mark requirements complete."
        ),
        "source_files": [
            "assets/data/world500/workbench/world500_reporting_completion_workplan.json",
            *sorted(queue_file_counts),
        ],
        "effective_queue_policy": (
            "Rows already closed by explicit demotion ledgers, such as demoted GHG overmapping edges, are retained "
            "in source CSVs for traceability but excluded from open_queue_rows and executable closure batches."
        ),
        "closed_queue_rows_excluded": {
            relative: closed_queue_count(ROOT, relative)
            for relative in sorted(queue_file_counts)
            if closed_queue_count(ROOT, relative)
        },
        "batch_count": len(batches),
        "open_queue_rows": sum(priority_totals.values()),
        "priority_totals": dict(sorted(priority_totals.items(), key=lambda item: PRIORITY_ORDER.get(item[0], 99))),
        "requirement_totals": dict(sorted(requirement_totals.items())),
        "issue_totals": dict(sorted(issue_totals.items())),
        "queue_file_counts": dict(sorted(queue_file_counts.items())),
        "top_p0_batches": [row for row in batches if row["priority"] == "P0"][:25],
        "top_p1_batches": [row for row in batches if row["priority"] == "P1"][:25],
        "batches": batches,
    }


def main() -> None:
    dashboard = build_dashboard()
    OUTPUT_JSON.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    write_csv(OUTPUT_CSV, dashboard["batches"], CSV_FIELDS)
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")
    print(json.dumps({
        "batch_count": dashboard["batch_count"],
        "open_queue_rows": dashboard["open_queue_rows"],
        "priority_totals": dashboard["priority_totals"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
