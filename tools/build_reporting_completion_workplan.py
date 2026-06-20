from __future__ import annotations

import csv
import json
from pathlib import Path

from reporting_queue_utils import effective_queue_count


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
ISSUE_REGISTER = WORKBENCH / "world500_reporting_unresolved_issue_register.json"
MATRIX = WORKBENCH / "world500_requirement_completion_matrix.json"
OUTPUT_JSON = WORKBENCH / "world500_reporting_completion_workplan.json"
OUTPUT_CSV = WORKBENCH / "world500_reporting_completion_workplan.csv"


ISSUE_TO_REQUIREMENT = {
    "ghg_protocol_fine_series": "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
    "standard_company_relationships": "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
    "emissions_ranking": "R2_TOTAL_EMISSIONS_RANKING_DESC",
    "standard_full_graph_runtime": "R3_STANDARD_ROLE_FULL_GRAPH_AND_SCOPE_LANGUAGE",
    "scope_language_policy": "R3_STANDARD_ROLE_FULL_GRAPH_AND_SCOPE_LANGUAGE",
    "technology_path_axis": "R4_TECHNOLOGY_PATH_AXIS",
    "primary_secondary_bubble": "R5_PRIMARY_SECONDARY_BUBBLE",
    "static_png_sync": "R6_STATIC_PNG_SYNC_SUPPORTING_GATE",
}


ACCEPTANCE_GATES = {
    "ghg_protocol_fine_series": "Only explicitly named GHG Protocol series citations can be upgraded to strong standard-company-series edges; contextual edges must stay review-only or be demoted.",
    "standard_company_relationships": "Standard-company edges need page-level source, complete snippet, and evidence-strength review before being treated as high-confidence links.",
    "emissions_ranking": "Only companies with complete strong Scope 1 + selected Scope 2 value/method + Scope 3 evidence, plus explicit finance Scope 3 boundary where applicable, can enter the comparable total-emissions ranking.",
    "standard_full_graph_runtime": "All full-screen graph pages must embed parseable JSON and must not contain fetch-based or image fallback rendering.",
    "scope_language_policy": "Scope 1/2/3 wording must remain GHG Protocol context or source quotation only; non-GHG standard language must use direct/indirect emissions wording.",
    "technology_path_axis": "Technology-company relationships need company-specific project, timeline, cost/investment, or abatement evidence before being treated as validated technology-path evidence.",
    "primary_secondary_bubble": "Primary-data ratios must distinguish explicit reported calculation weights from method-row source-mix inference.",
    "static_png_sync": "After reporting_views.json changes, regenerate static PNGs and manifest so source hash and figure hashes match.",
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def queue_count(relative_path: str) -> int:
    path = ROOT / relative_path
    if not path.exists():
        return 0
    return effective_queue_count(ROOT, relative_path)


def split_queue_files(raw: str) -> list[str]:
    return [item.strip() for item in (raw or "").split(";") if item.strip()]


def build_workplan() -> dict:
    issue_register = read_json(ISSUE_REGISTER)
    matrix = read_json(MATRIX)
    requirement_status = {
        item.get("requirement_id"): {
            "status_key": item.get("status_key"),
            "can_claim_complete": bool(item.get("can_claim_complete")),
            "open_queue_rows": item.get("open_queue_rows", 0),
        }
        for item in matrix.get("requirements", [])
    }

    rows = []
    sequence = 1
    for issue in issue_register.get("issues", []):
        issue_id = issue.get("issue_id", "")
        requirement_id = ISSUE_TO_REQUIREMENT.get(issue_id, "")
        queues = split_queue_files(issue.get("queue_files", ""))
        if queues:
            for queue_file in queues:
                rows.append(
                    {
                        "work_item_no": sequence,
                        "priority": issue.get("priority", ""),
                        "requirement_id": requirement_id,
                        "issue_id": issue_id,
                        "issue_status_key": issue.get("status_key", ""),
                        "requirement_status_key": requirement_status.get(requirement_id, {}).get("status_key", ""),
                        "can_claim_requirement_complete": requirement_status.get(requirement_id, {}).get("can_claim_complete", False),
                        "queue_file": queue_file,
                        "queue_rows": queue_count(queue_file),
                        "next_action_zh": issue.get("next_action_zh", ""),
                        "blocking_risk_zh": issue.get("blocking_risk_zh", ""),
                        "acceptance_gate_en": ACCEPTANCE_GATES.get(issue_id, ""),
                    }
                )
                sequence += 1
        else:
            rows.append(
                {
                    "work_item_no": sequence,
                    "priority": issue.get("priority", ""),
                    "requirement_id": requirement_id,
                    "issue_id": issue_id,
                    "issue_status_key": issue.get("status_key", ""),
                    "requirement_status_key": requirement_status.get(requirement_id, {}).get("status_key", ""),
                    "can_claim_requirement_complete": requirement_status.get(requirement_id, {}).get("can_claim_complete", False),
                    "queue_file": "",
                    "queue_rows": 0,
                    "next_action_zh": issue.get("next_action_zh", ""),
                    "blocking_risk_zh": issue.get("blocking_risk_zh", ""),
                    "acceptance_gate_en": ACCEPTANCE_GATES.get(issue_id, ""),
                }
            )
            sequence += 1

    priority_totals: dict[str, int] = {}
    issue_totals: dict[str, int] = {}
    for row in rows:
        priority_totals[row["priority"]] = priority_totals.get(row["priority"], 0) + int(row["queue_rows"])
        issue_totals[row["issue_id"]] = issue_totals.get(row["issue_id"], 0) + int(row["queue_rows"])

    return {
        "schema_version": "world500-reporting-completion-workplan-v1",
        "generated_at": matrix.get("generated_at"),
        "overall_status_key": matrix.get("overall_status_key"),
        "can_claim_overall_complete": bool(matrix.get("can_claim_overall_complete")),
        "source_files": [
            "assets/data/world500/workbench/world500_requirement_completion_matrix.json",
            "assets/data/world500/workbench/world500_reporting_unresolved_issue_register.json",
        ],
        "priority_queue_totals": priority_totals,
        "issue_queue_totals": issue_totals,
        "rows": rows,
    }


def write_csv(rows: list[dict]) -> None:
    fieldnames = [
        "work_item_no",
        "priority",
        "requirement_id",
        "issue_id",
        "issue_status_key",
        "requirement_status_key",
        "can_claim_requirement_complete",
        "queue_file",
        "queue_rows",
        "next_action_zh",
        "blocking_risk_zh",
        "acceptance_gate_en",
    ]
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    payload = build_workplan()
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    write_csv(payload["rows"])
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
