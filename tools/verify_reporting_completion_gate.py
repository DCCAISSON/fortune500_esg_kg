from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path

from reporting_queue_utils import effective_queue_count


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
GRAPH = ROOT / "assets" / "data" / "world500" / "graph"
FIGURES = ROOT / "assets" / "figures"


REQUIRED_FILES = [
    WORKBENCH / "reporting_views.json",
    WORKBENCH / "snapshot_manifest.json",
    WORKBENCH / "world500_snapshot_consistency_audit.json",
    WORKBENCH / "world500_snapshot_consistency_audit.csv",
    WORKBENCH / "world500_edge_evidence_coverage_audit.json",
    WORKBENCH / "world500_edge_evidence_coverage_audit.csv",
    WORKBENCH / "reporting_completion_audit.json",
    WORKBENCH / "reporting_gap_status_summary.json",
    WORKBENCH / "world500_requirement_completion_matrix.json",
    WORKBENCH / "world500_reporting_unresolved_issue_register.json",
    WORKBENCH / "world500_reporting_completion_workplan.json",
    WORKBENCH / "world500_reporting_closure_dashboard.json",
    WORKBENCH / "world500_reporting_closure_dashboard.csv",
    WORKBENCH / "world500_ghg_series_acceptance_ledger.json",
    WORKBENCH / "world500_ghg_series_acceptance_ledger.csv",
    WORKBENCH / "world500_ghg_zero_accepted_standard_audit.json",
    WORKBENCH / "world500_ghg_zero_accepted_standard_audit.csv",
    WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.json",
    WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.csv",
    WORKBENCH / "world500_ghg_review_acceptance_decisions.json",
    WORKBENCH / "world500_ghg_review_acceptance_decisions.csv",
    WORKBENCH / "world500_ghg_pcaf_standard_registry.json",
    WORKBENCH / "world500_ghg_backfill_explicit_recheck_summary.json",
    WORKBENCH / "world500_ghg_backfill_explicit_recheck_queue.csv",
    WORKBENCH / "world500_ghg_overmapped_demote_decisions.json",
    WORKBENCH / "world500_ghg_overmapped_demote_decisions.csv",
    WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.json",
    WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.csv",
    WORKBENCH / "world500_emissions_partial_exclusion_decisions.json",
    WORKBENCH / "world500_emissions_partial_exclusion_decisions.csv",
    WORKBENCH / "world500_emissions_ranking_evidence_ledger.json",
    WORKBENCH / "world500_emissions_ranking_evidence_ledger.csv",
    WORKBENCH / "world500_emissions_unit_scale_review_queue.csv",
    WORKBENCH / "world500_emissions_unit_scale_review_queue.json",
    WORKBENCH / "world500_emissions_unit_scale_review_summary.json",
    WORKBENCH / "world500_emissions_year_alignment_demotions.json",
    WORKBENCH / "world500_emissions_year_alignment_demotions.csv",
    WORKBENCH / "world500_technology_project_upgrade_queue.csv",
    WORKBENCH / "world500_technology_project_upgrade_queue.json",
    WORKBENCH / "world500_technology_p0_project_candidate_snippets.csv",
    WORKBENCH / "world500_technology_p0_project_candidate_snippets_summary.json",
    WORKBENCH / "world500_technology_cost_p0_backfill_targets.json",
    WORKBENCH / "world500_technology_cost_p0_backfill_targets.csv",
    WORKBENCH / "world500_technology_cost_p0_strict_evidence_batch.json",
    WORKBENCH / "world500_technology_cost_p0_strict_evidence_batch.csv",
    FIGURES / "reporting_static_figures_manifest.json",
    ROOT / "REPORTING_COMPLETION_AUDIT_ZH.md",
    ROOT / "reporting-completion-audit.html",
]

OLD_TEXT_PATTERNS = [
    "15/98",
    "16/104",
    "71/222",
    "147 remain outside",
    "98 companies",
    "Only 15 companies",
]

FORBIDDEN_OVERCLAIM_TEXT = [
    "可直接看到不同企业在同类减碳技术上的聚集关系",
    "哪些企业采用了相近减碳技术路径",
    "companies that use similar decarbonization technologies",
    "which companies share similar decarbonization technology paths",
]

REQUIRED_SYNCED_REPORT_FIGURES = {
    "world500_emissions_ranking_graph.png": "emissions_ranking",
    "world500_standard_chain_overview.png": "figure_2",
    "world500_standard_role_entity_graph.png": "figure_2_entity_graph",
    "world500_technology_cluster_overview.png": "figure_6",
    "world500_primary_secondary_source_mix.png": "primary_secondary_bubble",
}

FULL_GRAPH_FORBIDDEN_STATIC_FALLBACK_TOKENS = [
    "assets/figures",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    "<picture",
    "<source",
]

GENERIC_FULL_GRAPH_PAYLOAD_VERSION = "generic_full_graph_embedded_v2_inline_json_strict"
CLUSTER_FULL_GRAPH_PAYLOAD_VERSION = "reporting_views_embedded_v6_explicit_ghg_only"
CLUSTER_FULL_GRAPH_SCRIPT = "../assets/js/standard_cluster_full_graph.js"
GENERIC_FULL_GRAPH_SCRIPT = "../assets/js/generic_full_graph.js"
CLUSTER_FULL_GRAPH_PAGES = {
    "ghg-protocol-full-graph.html",
    "role-family-standard-full-graph.html",
}

GENERIC_GHG_ID = "ghg_generic_reference"
FORBIDDEN_GHG_DRAWN_MATCH_STATUSES = {
    "contextual_overmapped_review",
    "contextual_scope_inventory_mapping",
    "pdf_contextual_scope_inventory_mapping",
}
ALLOWED_GHG_DRAWN_MATCH_STATUSES = {
    "explicit_series_citation",
    "pdf_explicit_series_citation",
}
CORE_GHG_PCAF_STANDARD_IDS = {
    "ghg_policy_action_standard",
    "ghg_mitigation_goal_standard",
    "ghg_land_sector_removals_standard",
    "ghg_grid_connected_electricity_projects",
    "ghg_cities_gpc",
    "ghg_scope3_standard",
    "ghg_financial_industry_standard",
    "ghg_scope2_guidance",
    "ghg_scope3_calculation_guidance",
    "ghg_corporate_standard",
    "ghg_project_protocol",
    "ghg_product_standard",
}
GHG_SCOPE_ALLOWED_IDS = {
    "ghg_corporate_standard",
    "ghg_scope2_guidance",
    "ghg_scope3_standard",
    "ghg_scope3_calculation_guidance",
}
GHG_LIMITED_SCOPE_IDS = {"ghg_financial_industry_standard"}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def queue_count(relative_path: str) -> int:
    if not relative_path:
        return 0
    path = ROOT / relative_path
    if not path.exists():
        raise AssertionError(f"Missing queue file: {relative_path}")
    return effective_queue_count(ROOT, relative_path)


def split_queue_files(raw: str) -> list[str]:
    return [item.strip() for item in (raw or "").split(";") if item.strip()]


def assert_required_files() -> None:
    missing = [str(path.relative_to(ROOT)) for path in REQUIRED_FILES if not path.exists()]
    if missing:
        raise AssertionError(f"Missing required reporting files: {missing}")


def assert_matrix_and_gap_status() -> None:
    matrix = read_json(WORKBENCH / "world500_requirement_completion_matrix.json")
    gap = read_json(WORKBENCH / "reporting_gap_status_summary.json")
    if matrix.get("overall_status_key") != "partial":
        raise AssertionError("Current matrix should remain partial until all evidence gates are closed.")
    if matrix.get("can_claim_overall_complete") is not False:
        raise AssertionError("Matrix must not allow an overall completion claim while open queues remain.")
    if gap.get("overall_status_key") != matrix.get("overall_status_key"):
        raise AssertionError("Gap summary overall status does not match requirement matrix.")

    requirements = matrix.get("requirements", [])
    if len(requirements) != 6:
        raise AssertionError(f"Expected 6 requirements, found {len(requirements)}")
    incomplete = [item for item in requirements if not item.get("can_claim_complete")]
    if len(incomplete) < 5:
        raise AssertionError("Completion matrix appears to overclaim completion.")


def assert_workplan_matches_issue_register() -> None:
    issues = read_json(WORKBENCH / "world500_reporting_unresolved_issue_register.json").get("issues", [])
    workplan = read_json(WORKBENCH / "world500_reporting_completion_workplan.json")
    rows = workplan.get("rows", [])
    if not rows:
        raise AssertionError("Completion workplan has no rows.")

    workplan_issue_totals = workplan.get("issue_queue_totals", {})
    issue_expected = {issue.get("issue_id"): int(issue.get("open_queue_rows", 0)) for issue in issues}
    for issue_id, expected in issue_expected.items():
        actual = int(workplan_issue_totals.get(issue_id, 0))
        if actual != expected:
            raise AssertionError(f"Workplan issue total mismatch for {issue_id}: {actual} != {expected}")

    for row in rows:
        queue_file = row.get("queue_file", "")
        if queue_file:
            actual_count = queue_count(queue_file)
            declared_count = int(row.get("queue_rows", 0))
            if actual_count != declared_count:
                raise AssertionError(f"Queue row count mismatch for {queue_file}: {declared_count} != {actual_count}")


def assert_closure_dashboard_matches_workplan() -> None:
    matrix = read_json(WORKBENCH / "world500_requirement_completion_matrix.json")
    workplan = read_json(WORKBENCH / "world500_reporting_completion_workplan.json")
    dashboard = read_json(WORKBENCH / "world500_reporting_closure_dashboard.json")
    csv_path = WORKBENCH / "world500_reporting_closure_dashboard.csv"

    if dashboard.get("schema_version") != "world500-reporting-closure-dashboard-v1":
        raise AssertionError("Closure dashboard has an unexpected schema version.")
    if "does not promote evidence" not in str(dashboard.get("policy", "")):
        raise AssertionError("Closure dashboard must explicitly state that it does not promote evidence.")

    batches = dashboard.get("batches", [])
    if not batches:
        raise AssertionError("Closure dashboard has no executable batches.")
    if int(dashboard.get("batch_count", -1)) != len(batches):
        raise AssertionError("Closure dashboard batch_count does not match batches length.")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        csv_rows = list(csv.DictReader(handle))
    if len(csv_rows) != len(batches):
        raise AssertionError("Closure dashboard CSV row count does not match JSON batches.")

    queue_file_counts = dashboard.get("queue_file_counts", {})
    if not queue_file_counts:
        raise AssertionError("Closure dashboard has no queue_file_counts.")
    for queue_file, declared_count in queue_file_counts.items():
        actual_count = queue_count(queue_file)
        if actual_count != int(declared_count):
            raise AssertionError(
                f"Closure dashboard queue count mismatch for {queue_file}: {declared_count} != {actual_count}"
            )

    expected_priority_totals = {
        key: int(value)
        for key, value in (workplan.get("priority_queue_totals") or {}).items()
        if int(value) > 0 and key != "Monitor"
    }
    actual_priority_totals = {
        key: int(value)
        for key, value in (dashboard.get("priority_totals") or {}).items()
    }
    if actual_priority_totals != expected_priority_totals:
        raise AssertionError(
            f"Closure dashboard priority totals mismatch: {actual_priority_totals} != {expected_priority_totals}"
        )

    expected_requirement_totals = {
        item.get("requirement_id"): int(item.get("open_queue_rows") or 0)
        for item in matrix.get("requirements", [])
        if int(item.get("open_queue_rows") or 0) > 0
    }
    actual_requirement_totals = {
        key: int(value)
        for key, value in (dashboard.get("requirement_totals") or {}).items()
    }
    if actual_requirement_totals != expected_requirement_totals:
        raise AssertionError(
            f"Closure dashboard requirement totals mismatch: {actual_requirement_totals} != {expected_requirement_totals}"
        )

    if int(dashboard.get("open_queue_rows", -1)) != sum(expected_priority_totals.values()):
        raise AssertionError("Closure dashboard open_queue_rows does not match workplan priority totals.")
    if not dashboard.get("top_p0_batches"):
        raise AssertionError("Closure dashboard must expose top P0 batches.")


def assert_ghg_overmapping_demotions() -> None:
    def check_package(source_file: Path, json_file: Path, csv_file: Path, schema_version: str, source_filter) -> None:
        decisions_json = read_json(json_file)
        with source_file.open("r", encoding="utf-8-sig", newline="") as handle:
            source_rows = [row for row in csv.DictReader(handle) if source_filter(row)]
        with csv_file.open("r", encoding="utf-8-sig", newline="") as handle:
            csv_rows = list(csv.DictReader(handle))
        decisions = decisions_json.get("decisions", [])

        if decisions_json.get("schema_version") != schema_version:
            raise AssertionError(f"GHG overmapping demotion decisions have an unexpected schema version: {json_file.name}")
        policy = str(decisions_json.get("policy", ""))
        if "does not promote" not in policy or "must not be treated as accepted or drawn" not in policy:
            raise AssertionError(f"GHG overmapping demotion decisions must prevent promotion/drawn use: {json_file.name}")
        if int(decisions_json.get("decision_count", -1)) != len(source_rows):
            raise AssertionError(f"GHG overmapping demotion decision_count mismatch for {json_file.name}.")
        if len(decisions) != len(source_rows) or len(csv_rows) != len(source_rows):
            raise AssertionError(f"GHG overmapping demotion JSON/CSV rows do not match source rows: {json_file.name}.")

        for decision in decisions:
            if decision.get("decision_status") != "demote_current_edge_reassign_only_after_page_review":
                raise AssertionError(f"Unexpected GHG overmapping decision status: {decision.get('decision_status')}")
            reassignment_ids = str(decision.get("recommended_reassignment_series_ids", "")).split(" | ")
            if decision.get("current_series_id") in reassignment_ids:
                raise AssertionError(f"GHG overmapping decision reassigns back to current series: {decision.get('decision_id')}")

    check_package(
        WORKBENCH / "world500_ghg_review_series_mapping.csv",
        WORKBENCH / "world500_ghg_overmapped_demote_decisions.json",
        WORKBENCH / "world500_ghg_overmapped_demote_decisions.csv",
        "world500-ghg-overmapped-demote-decisions-v1",
        lambda row: row.get("match_status") == "contextual_overmapped_review",
    )
    check_package(
        WORKBENCH / "world500_ghg_p0_overmapped_contextual_edge_queue.csv",
        WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.json",
        WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.csv",
        "world500-ghg-p0-overmapped-demote-decisions-v1",
        lambda row: True,
    )


def assert_ghg_series_acceptance_ledger() -> None:
    accepted_rows = []
    review_rows = []
    with (WORKBENCH / "world500_ghg_accepted_series_mapping.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        accepted_rows = list(csv.DictReader(handle))
    with (WORKBENCH / "world500_ghg_review_series_mapping.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        review_rows = list(csv.DictReader(handle))
    ledger = read_json(WORKBENCH / "world500_ghg_series_acceptance_ledger.json")
    with (WORKBENCH / "world500_ghg_series_acceptance_ledger.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        ledger_csv_rows = list(csv.DictReader(handle))

    if ledger.get("schema_version") != "world500-ghg-series-acceptance-ledger-v1":
        raise AssertionError("GHG series acceptance ledger has an unexpected schema version.")
    policy = f"{ledger.get('policy_en', '')} {ledger.get('policy_zh', '')}"
    for required in ["explicitly names", "review-only", "demoted"]:
        if required not in policy:
            raise AssertionError(f"GHG series acceptance ledger policy is missing required language: {required}")

    rows = ledger.get("rows", [])
    expected_total = len(accepted_rows) + len(review_rows)
    if int(ledger.get("row_count", -1)) != expected_total:
        raise AssertionError("GHG series acceptance ledger row_count does not match accepted+review mappings.")
    if len(rows) != expected_total or len(ledger_csv_rows) != expected_total:
        raise AssertionError("GHG series acceptance ledger JSON/CSV row counts do not match accepted+review mappings.")
    if int(ledger.get("accepted_edge_count", -1)) != len(accepted_rows):
        raise AssertionError("GHG series acceptance ledger accepted_edge_count mismatch.")

    review_status_count = sum(1 for row in review_rows if row.get("match_status") == "contextual_scope_inventory_mapping")
    demoted_status_count = sum(1 for row in review_rows if row.get("match_status") == "contextual_overmapped_review")
    if int(ledger.get("review_edge_count", -1)) != review_status_count:
        raise AssertionError("GHG series acceptance ledger review_edge_count mismatch.")
    if int(ledger.get("demoted_edge_count", -1)) != demoted_status_count:
        raise AssertionError("GHG series acceptance ledger demoted_edge_count mismatch.")
    if int(ledger.get("generic_reference_accepted_count", -1)) != 0:
        raise AssertionError("Generic GHG references must never be accepted in the GHG series ledger.")
    if int(ledger.get("accepted_outside_whitelist_count", -1)) != 0:
        raise AssertionError("Accepted GHG series edges must all belong to the controlled 12-item GHG/PCAF whitelist.")

    accepted_keys = {
        (row.get("company_id"), row.get("series_id"))
        for row in accepted_rows
    }
    review_keys = {
        (row.get("company_id"), row.get("series_id"))
        for row in review_rows
    }
    if accepted_keys.intersection(review_keys):
        raise AssertionError("Accepted GHG series edges overlap review edges.")

    ledger_accepted_keys = {
        (row.get("company_id"), row.get("series_id"))
        for row in rows
        if row.get("decision_bucket") == "accepted"
    }
    ledger_review_keys = {
        (row.get("company_id"), row.get("series_id"))
        for row in rows
        if row.get("decision_bucket") in {"review", "demoted"}
    }
    if ledger_accepted_keys != accepted_keys:
        raise AssertionError("GHG series acceptance ledger accepted keys do not match accepted mapping.")
    if ledger_review_keys != review_keys:
        raise AssertionError("GHG series acceptance ledger review/demoted keys do not match review mapping.")

    allowed_status_by_bucket = {
        "accepted": {"accepted_explicit_named_series_edge"},
        "review": {"review_required_contextual_inventory_mapping"},
        "demoted": {"demoted_overmapped_edge_not_accepted"},
    }
    for row in rows:
        bucket = row.get("decision_bucket")
        if bucket not in allowed_status_by_bucket:
            raise AssertionError(f"Unexpected GHG series ledger bucket: {bucket}")
        if row.get("decision_status") not in allowed_status_by_bucket[bucket]:
            raise AssertionError(f"Unexpected GHG series ledger status for bucket {bucket}: {row.get('decision_status')}")
        if bucket == "accepted" and row.get("core_whitelist") != "yes":
            raise AssertionError(f"Accepted GHG series ledger row is outside the controlled whitelist: {row.get('company_id')} {row.get('series_id')}")
        if row.get("series_id") == GENERIC_GHG_ID and bucket == "accepted":
            raise AssertionError(f"Generic GHG reference accepted in ledger: {row.get('decision_id')}")
        if bucket == "accepted" and row.get("match_status") not in {"explicit_series_citation", "pdf_explicit_series_citation"}:
            raise AssertionError(f"Accepted GHG ledger row is not explicit: {row.get('decision_id')}")
        if bucket == "review" and row.get("match_status") != "contextual_scope_inventory_mapping":
            raise AssertionError(f"Review GHG ledger row is not contextual mapping: {row.get('decision_id')}")
        if bucket == "demoted" and row.get("match_status") != "contextual_overmapped_review":
            raise AssertionError(f"Demoted GHG ledger row is not overmapped review: {row.get('decision_id')}")


def assert_ghg_zero_accepted_standard_audit() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    audit = read_json(WORKBENCH / "world500_ghg_zero_accepted_standard_audit.json")
    with (WORKBENCH / "world500_ghg_zero_accepted_standard_audit.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        csv_rows = list(csv.DictReader(handle))
    rows = audit.get("rows") or []
    if audit.get("schema_version") != "world500-ghg-zero-accepted-standard-audit-v1":
        raise AssertionError("GHG zero-accepted audit has unexpected schema version.")
    if len(rows) != len(csv_rows):
        raise AssertionError("GHG zero-accepted audit JSON/CSV row count mismatch.")
    summaries = [
        row for row in reporting.get("ghg_standard_series", {}).get("series_summary", [])
        if row.get("core_whitelist")
    ]
    zero_summary_ids = {row.get("series_id") for row in summaries if int(row.get("accepted_company_count") or 0) == 0}
    zero_audit_ids = {row.get("series_id") for row in rows if int(row.get("accepted_company_count") or 0) == 0}
    if zero_summary_ids != zero_audit_ids:
        raise AssertionError("GHG zero-accepted audit does not match reporting_views series_summary zero-accepted set.")
    if int(audit.get("zero_accepted_standard_count", -1)) != len(zero_summary_ids):
        raise AssertionError("GHG zero-accepted audit count mismatch.")
    expected_zero_ids = {
        "ghg_land_sector_removals_standard",
        "ghg_cities_gpc",
        "ghg_mitigation_goal_standard",
        "ghg_policy_action_standard",
        "ghg_grid_connected_electricity_projects",
    }
    if zero_summary_ids != expected_zero_ids:
        raise AssertionError(f"GHG zero-accepted set changed without an explicit evidence-gate update: {sorted(zero_summary_ids ^ expected_zero_ids)}")
    if int(audit.get("zero_accepted_standard_count", -1)) != 5:
        raise AssertionError("Expected exactly five zero-accepted GHGP/PCAF standards under the current evidence gate.")
    for row in rows:
        if int(row.get("accepted_company_count") or 0) == 0 and not row.get("audit_decision_en"):
            raise AssertionError(f"GHG zero-accepted audit missing decision: {row.get('series_id')}")

    closure = read_json(WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.json")
    with (WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        closure_csv_rows = list(csv.DictReader(handle))
    closure_rows = closure.get("rows") or []
    if closure.get("schema_version") != "world500-ghgp-zero-accepted-review-closure-queue-v1":
        raise AssertionError("GHGP zero-accepted review closure queue has unexpected schema version.")
    if len(closure_rows) != len(closure_csv_rows):
        raise AssertionError("GHGP zero-accepted review closure JSON/CSV row count mismatch.")
    if int(closure.get("row_count", -1)) != len(closure_rows):
        raise AssertionError("GHGP zero-accepted review closure row_count mismatch.")
    if int(closure.get("zero_accepted_standard_count", -1)) != len(zero_summary_ids):
        raise AssertionError("GHGP zero-accepted review closure zero standard count mismatch.")
    if int(closure.get("promotion_allowed_count", -1)) != 0:
        raise AssertionError("GHGP zero-accepted review closure must not allow automatic promotion.")
    closure_series_ids = {row.get("series_id") for row in closure_rows}
    if closure_series_ids != zero_summary_ids:
        raise AssertionError("GHGP zero-accepted review closure does not cover exactly the zero-accepted standards.")
    for row in closure_rows:
        if row.get("promotion_allowed") != "false":
            raise AssertionError(f"GHGP zero-accepted closure row allows promotion: {row.get('closure_id')}")
        if not row.get("not_acceptance_reason_code") or not row.get("required_next_evidence_en"):
            raise AssertionError(f"GHGP zero-accepted closure row missing reason or next evidence: {row.get('closure_id')}")

def assert_ghg_backfill_explicit_recheck() -> None:
    summary = read_json(WORKBENCH / "world500_ghg_backfill_explicit_recheck_summary.json")
    with (WORKBENCH / "world500_ghg_backfill_explicit_recheck_queue.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if summary.get("schema_version") != "world500-ghg-backfill-explicit-recheck-v1":
        raise AssertionError("GHG backfill explicit recheck has an unexpected schema version.")
    if len(rows) != int(summary.get("raw_explicit_row_count", -1)):
        raise AssertionError("GHG backfill explicit recheck row count does not match summary.")

    action_counts = Counter(row.get("recommended_action", "") for row in rows)
    for key, count in summary.get("action_counts", {}).items():
        if action_counts.get(key, 0) != int(count):
            raise AssertionError(f"GHG backfill explicit recheck action count mismatch for {key}.")

    possible_gap_count = action_counts.get("P0_possible_acceptance_gap_strict_alias_not_in_accepted", 0)
    if possible_gap_count != int(summary.get("possible_acceptance_gap_count", -1)):
        raise AssertionError("GHG backfill explicit recheck possible-gap count does not match summary.")
    if possible_gap_count:
        raise AssertionError(
            "GHG backfill contains strict whitelisted series aliases that are not accepted; "
            "review and either promote with page evidence or demote before passing the gate."
        )
    missing_reassignment_count = action_counts.get("P0_reassign_to_named_series_missing_accepted_edge", 0)
    if missing_reassignment_count != int(summary.get("reassign_missing_accepted_edge_count", -1)):
        raise AssertionError("GHG backfill explicit recheck reassignment-missing count does not match summary.")
    if missing_reassignment_count:
        raise AssertionError(
            "GHG backfill contains raw explicit rows whose named replacement series is not accepted; "
            "promote the replacement with page evidence or leave the current edge out of the accepted graph."
        )


def assert_ghg_pcaf_standard_registry_integrity() -> None:
    registry = read_json(WORKBENCH / "world500_ghg_pcaf_standard_registry.json")
    reporting = read_json(WORKBENCH / "reporting_views.json")

    if registry.get("schema_version") != "world500-ghg-pcaf-standard-registry-v1":
        raise AssertionError("GHG/PCAF standard registry has an unexpected schema version.")
    if int(registry.get("standard_count", -1)) != len(CORE_GHG_PCAF_STANDARD_IDS):
        raise AssertionError("GHG/PCAF registry standard_count does not match the controlled whitelist.")

    standards = registry.get("standards") or []
    registry_ids = {row.get("id") for row in standards}
    if registry_ids != CORE_GHG_PCAF_STANDARD_IDS:
        raise AssertionError(f"GHG/PCAF registry IDs mismatch: {sorted(registry_ids ^ CORE_GHG_PCAF_STANDARD_IDS)}")

    required_scalar_fields = [
        "name_en",
        "name_zh",
        "category_en",
        "category_zh",
        "role_en",
        "role_zh",
        "principle_en",
        "principle_zh",
        "applicable_boundary_en",
        "applicable_boundary_zh",
        "language_policy_en",
        "language_policy_zh",
        "scope_terms_allowed_for",
        "accepted_evidence_gate_en",
        "accepted_evidence_gate_zh",
    ]
    for row in standards:
        standard_id = row.get("id")
        for field in required_scalar_fields:
            if not str(row.get(field, "")).strip():
                raise AssertionError(f"GHG/PCAF registry missing {field}: {standard_id}")
        if not row.get("aliases_en") or not row.get("aliases_zh"):
            raise AssertionError(f"GHG/PCAF registry missing aliases: {standard_id}")
        if standard_id in GHG_SCOPE_ALLOWED_IDS and row.get("scope_terms_allowed") is not True:
            raise AssertionError(f"GHG/PCAF registry should allow Scope wording for {standard_id}.")
        if standard_id in GHG_LIMITED_SCOPE_IDS and row.get("scope_terms_allowed") != "limited":
            raise AssertionError(f"GHG/PCAF registry should mark limited Scope wording for {standard_id}.")
        if standard_id not in GHG_SCOPE_ALLOWED_IDS | GHG_LIMITED_SCOPE_IDS and row.get("scope_terms_allowed") is not False:
            raise AssertionError(f"GHG/PCAF registry should not allow Scope wording for {standard_id}.")

    definitions = reporting.get("ghg_standard_series", {}).get("definitions", [])
    definition_ids = {row.get("id") for row in definitions}
    if definition_ids != CORE_GHG_PCAF_STANDARD_IDS:
        raise AssertionError("reporting_views GHG definitions do not match the controlled registry whitelist.")

    company_mappings = reporting.get("ghg_standard_series", {}).get("company_mappings", [])
    for company in company_mappings:
        for series in company.get("series", []):
            series_id = series.get("series_id")
            match_status = series.get("match_status")
            if series_id == GENERIC_GHG_ID and match_status in ALLOWED_GHG_DRAWN_MATCH_STATUSES:
                raise AssertionError(f"Generic GHG reference accepted for {company.get('company_id')}.")
            if match_status in ALLOWED_GHG_DRAWN_MATCH_STATUSES and series_id not in CORE_GHG_PCAF_STANDARD_IDS:
                raise AssertionError(f"Accepted GHG series outside whitelist: {series_id}")


def assert_ghg_review_acceptance_decisions() -> None:
    payload = read_json(WORKBENCH / "world500_ghg_review_acceptance_decisions.json")
    ledger = read_json(WORKBENCH / "world500_ghg_series_acceptance_ledger.json")
    if payload.get("schema_version") != "world500-ghg-review-acceptance-decisions-v1":
        raise AssertionError("GHG review acceptance decisions have an unexpected schema version.")
    if "does not promote evidence" not in str(payload.get("policy", "")):
        raise AssertionError("GHG review acceptance decisions must state that they do not promote evidence.")
    if payload.get("source_file") != "assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json":
        raise AssertionError("GHG review acceptance decisions must be sourced from the unified acceptance ledger.")
    with (WORKBENCH / "world500_ghg_review_acceptance_decisions.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != int(payload.get("row_count", -1)):
        raise AssertionError("GHG review acceptance decision CSV/JSON row count mismatch.")
    counts = Counter(row.get("decision_bucket", "") for row in rows)
    if counts != Counter(payload.get("decision_bucket_counts", {})):
        raise AssertionError("GHG review acceptance decision bucket counts mismatch.")
    expected = Counter(ledger.get("decision_bucket_counts", {}))
    if counts != expected:
        raise AssertionError(f"GHG review decision buckets do not match acceptance ledger: {counts} != {expected}")
    for bucket in ("accepted", "review", "demoted"):
        if counts.get(bucket, 0) <= 0:
            raise AssertionError(f"GHG review decision file is missing {bucket} rows.")
    for row in rows:
        bucket = row.get("decision_bucket")
        status = row.get("decision_status", "")
        if bucket == "accepted" and status != "accepted_explicit_named_series_edge":
            raise AssertionError(f"Accepted GHGP decision has unexpected status: {row.get('decision_id')}")
        if bucket == "review" and status != "review_required_contextual_inventory_mapping":
            raise AssertionError(f"Review GHGP decision has unexpected status: {row.get('decision_id')}")
        if bucket == "demoted" and status != "demoted_overmapped_edge_not_accepted":
            raise AssertionError(f"Demoted GHGP decision has unexpected status: {row.get('decision_id')}")

def assert_emissions_ranking_gate() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    summary = reporting.get("summary", {})
    ranking = reporting.get("emissions_ranking", {})
    available = ranking.get("available", [])
    complete = ranking.get("complete", [])
    ranking_graph = ranking.get("ranking_graph", {})
    graph_companies = ranking_graph.get("companies", [])
    gate = ranking.get("gate", {})

    if len(available) != int(summary.get("available_emissions_ranking_company_count", -1)):
        raise AssertionError("Available emissions ranking count does not match reporting summary.")
    if len(complete) != int(summary.get("complete_emissions_ranking_company_count", -1)):
        raise AssertionError("Complete emissions ranking count does not match reporting summary.")
    if len(complete) != int(gate.get("complete_count", -1)):
        raise AssertionError("Complete emissions ranking count does not match gate metadata.")
    if len(available) != int(gate.get("available_count", -1)):
        raise AssertionError("Available emissions ranking count does not match gate metadata.")

    partial = [row for row in available if row.get("completeness_key") != "complete_scope123_strong_evidence_total"]
    if len(partial) != int(gate.get("partial_excluded_count", -1)):
        raise AssertionError("Partial emissions exclusion count does not match gate metadata.")
    if not gate.get("complete_sorted_desc") or not gate.get("available_sorted_desc"):
        raise AssertionError("Emissions ranking gate must declare complete and available lists sorted descending.")

    def totals(rows: list[dict]) -> list[float]:
        values = []
        for row in rows:
            value = row.get("total_mtco2e")
            if not isinstance(value, (int, float)):
                raise AssertionError(f"Missing numeric total_mtco2e for emissions ranking row: {row.get('company_id')}")
            values.append(float(value))
        return values

    def assert_descending(rows: list[dict], label: str) -> None:
        values = totals(rows)
        if values != sorted(values, reverse=True):
            raise AssertionError(f"{label} emissions ranking is not sorted by total_mtco2e descending.")

    assert_descending(available, "Available")
    assert_descending(complete, "Complete")
    assert_descending(graph_companies, "Ranking graph")

    complete_ids = [row.get("company_id") for row in complete]
    graph_ids = [row.get("company_id") for row in graph_companies]
    if graph_ids != complete_ids:
        raise AssertionError("Emissions ranking graph must contain exactly the complete comparable ranking companies, in order.")
    partial_ids = {row.get("company_id") for row in partial}
    if partial_ids.intersection(graph_ids):
        raise AssertionError("Partial emissions totals leaked into the comparable ranking graph.")

    for index, row in enumerate(complete, start=1):
        if row.get("complete_rank") != index:
            raise AssertionError(f"Complete emissions rank sequence is broken for {row.get('company_id')}.")
        if row.get("completeness_key") != "complete_scope123_strong_evidence_total":
            raise AssertionError(f"Non-complete row entered complete ranking: {row.get('company_id')}")
        if row.get("missing_scopes"):
            raise AssertionError(f"Complete ranking row still has missing scopes: {row.get('company_id')}")
        for key in ("scope1_mtco2e", "scope2_mtco2e", "scope3_mtco2e"):
            if not isinstance(row.get(key), (int, float)):
                raise AssertionError(f"Complete ranking row missing numeric {key}: {row.get('company_id')}")
        method = str(row.get("scope2_method_en") or "").strip().lower()
        if not method or method in {"unspecified", "unknown", "n/a", "not specified"}:
            raise AssertionError(f"Complete ranking row missing accepted Scope 2 method: {row.get('company_id')}")
        years = [str(year).strip() for year in row.get("inventory_years", []) if str(year).strip()]
        if len(set(years)) != 1:
            raise AssertionError(f"Complete ranking row mixes inventory years: {row.get('company_id')}")

    for index, row in enumerate(graph_companies, start=1):
        if row.get("evidence_rank") != index:
            raise AssertionError(f"Ranking graph evidence rank sequence is broken for {row.get('company_id')}.")

    if partial:
        highest = partial[0]
        if highest.get("company_name_en") != gate.get("highest_partial_excluded_company_en"):
            raise AssertionError("Highest partial emissions exclusion metadata has the wrong company.")
        if float(highest.get("total_mtco2e")) != float(gate.get("highest_partial_excluded_total_mtco2e")):
            raise AssertionError("Highest partial emissions exclusion metadata has the wrong total.")


def assert_emissions_partial_exclusions() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    ranking = reporting.get("emissions_ranking", {})
    available = ranking.get("available", [])
    complete = ranking.get("complete", [])
    graph_companies = ranking.get("ranking_graph", {}).get("companies", [])
    gate = ranking.get("gate", {})
    partial = [
        row for row in available
        if row.get("completeness_key") != "complete_scope123_strong_evidence_total"
    ]

    decisions_json = read_json(WORKBENCH / "world500_emissions_partial_exclusion_decisions.json")
    with (WORKBENCH / "world500_emissions_partial_exclusion_decisions.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        csv_rows = list(csv.DictReader(handle))
    decisions = decisions_json.get("decisions", [])

    if decisions_json.get("schema_version") != "world500-emissions-partial-exclusion-decisions-v1":
        raise AssertionError("Emissions partial exclusion decisions have an unexpected schema version.")
    policy = str(decisions_json.get("policy", ""))
    if "must not be drawn in the complete emissions ranking graph" not in policy:
        raise AssertionError("Emissions partial exclusion decisions must forbid complete graph use.")
    if int(decisions_json.get("decision_count", -1)) != len(partial):
        raise AssertionError("Emissions partial exclusion decision_count does not match partial rows.")
    if int(decisions_json.get("gate_partial_excluded_count", -1)) != int(gate.get("partial_excluded_count", -2)):
        raise AssertionError("Emissions partial exclusion gate count mismatch.")
    if len(decisions) != len(partial) or len(csv_rows) != len(partial):
        raise AssertionError("Emissions partial exclusion JSON/CSV rows do not match partial rows.")

    complete_ids = {row.get("company_id") for row in complete}
    graph_ids = {row.get("company_id") for row in graph_companies}
    partial_ids = {row.get("company_id") for row in partial}
    decision_ids = {row.get("company_id") for row in decisions}
    if decision_ids != partial_ids:
        raise AssertionError("Emissions partial exclusion decisions do not cover exactly the partial company IDs.")
    if partial_ids.intersection(complete_ids) or partial_ids.intersection(graph_ids):
        raise AssertionError("Excluded partial emissions totals leaked into complete ranking or graph.")
    for decision in decisions:
        if decision.get("decision_status") != "excluded_from_complete_comparable_ranking_until_scope123_gate_passes":
            raise AssertionError(f"Unexpected emissions partial exclusion status: {decision.get('decision_status')}")
        if not decision.get("missing_scopes"):
            raise AssertionError(f"Emissions partial exclusion missing missing_scopes: {decision.get('decision_id')}")
        if not decision.get("repair_queue_files"):
            raise AssertionError(f"Emissions partial exclusion missing repair_queue_files: {decision.get('decision_id')}")


def assert_emissions_ranking_evidence_ledger() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    ranking = reporting.get("emissions_ranking", {})
    available = ranking.get("available", [])
    complete = ranking.get("complete", [])
    partial = [
        row for row in available
        if row.get("completeness_key") != "complete_scope123_strong_evidence_total"
    ]
    partial_exclusions = read_json(WORKBENCH / "world500_emissions_partial_exclusion_decisions.json")
    with (WORKBENCH / "world500_emissions_gap_candidate_records_from_expanded_evidence.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        gap_candidates = list(csv.DictReader(handle))
    with (WORKBENCH / "world500_emissions_p0_gap_review_packet.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        p0_packet = list(csv.DictReader(handle))
    ledger = read_json(WORKBENCH / "world500_emissions_ranking_evidence_ledger.json")
    with (WORKBENCH / "world500_emissions_ranking_evidence_ledger.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        ledger_csv_rows = list(csv.DictReader(handle))

    if ledger.get("schema_version") != "world500-emissions-ranking-evidence-ledger-v1":
        raise AssertionError("Emissions ranking evidence ledger has an unexpected schema version.")
    policy = f"{ledger.get('policy_en', '')} {ledger.get('policy_zh', '')}"
    for required in ["Scope 1", "Scope 2", "Scope 3", "cannot be auto-promoted"]:
        if required not in policy:
            raise AssertionError(f"Emissions ranking evidence ledger policy missing required language: {required}")

    rows = ledger.get("rows", [])
    expected_total = len(available) + len(gap_candidates)
    if int(ledger.get("row_count", -1)) != expected_total:
        raise AssertionError("Emissions ranking evidence ledger row_count mismatch.")
    if len(rows) != expected_total or len(ledger_csv_rows) != expected_total:
        raise AssertionError("Emissions ranking evidence ledger JSON/CSV rows mismatch.")
    if int(ledger.get("complete_accepted_count", -1)) != len(complete):
        raise AssertionError("Emissions ranking evidence ledger complete_accepted_count mismatch.")
    if int(ledger.get("partial_excluded_count", -1)) != len(partial):
        raise AssertionError("Emissions ranking evidence ledger partial_excluded_count mismatch.")
    if int(ledger.get("gap_candidate_count", -1)) != len(gap_candidates):
        raise AssertionError("Emissions ranking evidence ledger gap_candidate_count mismatch.")
    if int(ledger.get("p0_gap_candidate_count", -1)) != len(p0_packet):
        raise AssertionError("Emissions ranking evidence ledger p0_gap_candidate_count mismatch.")
    if int(ledger.get("auto_promote_allowed_count", -1)) != 0:
        raise AssertionError("Emissions ranking evidence ledger must not allow candidate auto-promotion.")

    bucket_counts = ledger.get("decision_bucket_counts", {})
    expected_bucket_counts = {
        "complete_comparable_accepted": len(complete),
        "gap_candidate_review": len(gap_candidates),
        "partial_review_excluded": len(partial),
    }
    if bucket_counts != expected_bucket_counts:
        raise AssertionError(f"Emissions ranking evidence ledger bucket counts mismatch: {bucket_counts}")
    p0_bucket_counts = ledger.get("p0_review_bucket_counts", {})
    expected_p0_counts = Counter(row.get("review_bucket", "") for row in p0_packet)
    expected_p0_counts.pop("", None)
    if p0_bucket_counts != dict(sorted(expected_p0_counts.items())):
        raise AssertionError("Emissions ranking evidence ledger P0 bucket counts mismatch.")
    for row in p0_packet:
        if row.get("auto_promote_allowed") != "false":
            raise AssertionError(f"P0 emissions gap packet row must not auto-promote: {row.get('company_id')}")
        for required in ["review_bucket", "manual_action_en", "manual_action_zh", "evidence_page", "source_file"]:
            if not str(row.get(required, "")).strip():
                raise AssertionError(f"P0 emissions gap packet missing {required}: {row.get('company_id')}")
        if row.get("all_basic_signals_present") not in {"true", "false"}:
            raise AssertionError(f"P0 emissions gap packet has invalid all_basic_signals_present: {row.get('company_id')}")

    complete_ids = {row.get("company_id") for row in complete}
    partial_ids = {row.get("company_id") for row in partial}
    partial_decision_ids = {row.get("company_id") for row in partial_exclusions.get("decisions", [])}
    if partial_ids != partial_decision_ids:
        raise AssertionError("Partial emissions rows are not exactly covered by partial exclusion decisions.")

    ledger_complete_ids = {
        row.get("company_id")
        for row in rows
        if row.get("decision_bucket") == "complete_comparable_accepted"
    }
    ledger_partial_ids = {
        row.get("company_id")
        for row in rows
        if row.get("decision_bucket") == "partial_review_excluded"
    }
    if ledger_complete_ids != complete_ids:
        raise AssertionError("Emissions ranking evidence ledger complete IDs mismatch.")
    if ledger_partial_ids != partial_ids:
        raise AssertionError("Emissions ranking evidence ledger partial IDs mismatch.")

    for row in rows:
        bucket = row.get("decision_bucket")
        status = row.get("decision_status")
        if bucket == "complete_comparable_accepted" and status != "accepted_complete_scope123_strong_evidence_total":
            raise AssertionError(f"Unexpected complete emissions ledger status: {status}")
        if bucket == "partial_review_excluded" and status != "excluded_from_complete_comparable_ranking_until_scope123_gate_passes":
            raise AssertionError(f"Unexpected partial emissions ledger status: {status}")
        if bucket == "gap_candidate_review":
            if row.get("auto_promote_allowed") != "false":
                raise AssertionError(f"Gap candidate must not auto-promote: {row.get('ledger_id')}")
            if "candidate" not in status:
                raise AssertionError(f"Unexpected gap-candidate emissions ledger status: {status}")

    for row in p0_packet:
        method = str(row.get("candidate_scope2_method", "")).lower()
        if row.get("missing_scope") != "Scope 2" or row.get("scope2_method_signal") != "true":
            continue
        snippet = str(row.get("snippet_en", "")).lower()
        if method.startswith("market") and not re.search(r"\bmarket\s*-\s*based\b|\bmarket\s+based\b", snippet):
            raise AssertionError(f"False-positive market-based Scope 2 method signal: {row.get('company_id')}")
        if method.startswith("location") and not re.search(r"\blocation\s*-\s*based\b|\blocation\s+based\b", snippet):
            raise AssertionError(f"False-positive location-based Scope 2 method signal: {row.get('company_id')}")


def assert_emissions_year_alignment_demotions() -> None:
    payload = read_json(WORKBENCH / "world500_emissions_year_alignment_demotions.json")
    with (WORKBENCH / "world500_emissions_year_alignment_demotions.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        csv_rows = list(csv.DictReader(handle))
    reporting = read_json(WORKBENCH / "reporting_views.json")

    if payload.get("schema_version") != "world500-emissions-year-alignment-demotions-v1":
        raise AssertionError("Emissions year-alignment demotions have an unexpected schema version.")
    policy = f"{payload.get('policy_en', '')} {payload.get('policy_zh', '')}"
    for required in ["year column", "inventory_year", "strong-evidence"]:
        if required not in policy:
            raise AssertionError(f"Emissions year-alignment demotion policy missing required language: {required}")

    expanded_conflicts = []
    for path in sorted((WORKBENCH / "expanded_evidence").glob("*.json")):
        data = read_json(path)
        for record in data.get("records", []):
            conflicts = record.get("conflict_parts") if isinstance(record.get("conflict_parts"), list) else []
            if "year_column_alignment" in conflicts:
                expanded_conflicts.append(record)
    decisions = payload.get("decisions", [])
    if int(payload.get("decision_count", -1)) != len(expanded_conflicts):
        raise AssertionError("Year-alignment demotion decision_count does not match expanded evidence conflicts.")
    if len(decisions) != len(expanded_conflicts) or len(csv_rows) != len(expanded_conflicts):
        raise AssertionError("Year-alignment demotion JSON/CSV rows do not match expanded evidence conflicts.")

    conflict_keys = {record.get("evidence_key") for record in expanded_conflicts}
    decision_keys = {row.get("evidence_key") for row in decisions}
    if conflict_keys != decision_keys:
        raise AssertionError("Year-alignment demotion keys do not exactly match expanded evidence conflicts.")
    for row in decisions:
        if row.get("decision_status") != "demoted_from_strong_gate_year_column_mismatch":
            raise AssertionError(f"Unexpected year-alignment demotion status: {row.get('decision_status')}")
        if "mismatch" not in str(row.get("demotion_reason", "")).lower():
            raise AssertionError(f"Missing year-alignment demotion reason: {row.get('decision_id')}")

    selected_keys = set()
    for row in reporting.get("emissions_ranking", {}).get("available", []):
        for selected in row.get("selected_rows", []):
            key = selected.get("evidence_key")
            if key:
                selected_keys.add(key)
    leaked = selected_keys.intersection(decision_keys)
    if leaked:
        raise AssertionError(f"Year-alignment demoted rows leaked into emissions ranking: {sorted(leaked)[:3]}")


def assert_accepted_standard_role_graph() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    full_graph = reporting.get("standard_role_graph") or {}
    accepted_graph = reporting.get("accepted_standard_role_graph") or {}
    if not accepted_graph:
        raise AssertionError("reporting_views.json missing accepted_standard_role_graph.")

    accepted_links = accepted_graph.get("links") or []
    if not accepted_links:
        raise AssertionError("accepted_standard_role_graph has no accepted links.")
    for link in accepted_links:
        if link.get("standard_id") == GENERIC_GHG_ID:
            raise AssertionError("Generic GHG reference leaked into accepted_standard_role_graph.")
        if link.get("decision_bucket") != "accepted":
            raise AssertionError(
                f"Non-accepted standard link leaked into accepted_standard_role_graph: {link.get('standard_id')}"
            )

    accepted_company_ids = {link.get("company_id") for link in accepted_links if link.get("company_id")}
    graph_company_ids = {row.get("company_id") for row in accepted_graph.get("companies", [])}
    if accepted_company_ids != graph_company_ids:
        raise AssertionError("accepted_standard_role_graph company nodes do not match accepted links.")

    accepted_standard_ids = {link.get("standard_id") for link in accepted_links if link.get("standard_id")}
    graph_standard_ids = {row.get("id") for row in accepted_graph.get("standards", [])}
    zero_edge_core_ghg_ids = {
        row.get("id")
        for row in accepted_graph.get("standards", [])
        if row.get("is_ghg_series") and row.get("core_whitelist") and row.get("id") not in accepted_standard_ids
    }
    unexpected_standard_ids = graph_standard_ids - accepted_standard_ids - zero_edge_core_ghg_ids
    if not accepted_standard_ids.issubset(graph_standard_ids) or unexpected_standard_ids:
        raise AssertionError(
            "accepted_standard_role_graph standard nodes must match accepted links plus zero-edge core GHG/PCAF nodes."
        )
    if not CORE_GHG_PCAF_STANDARD_IDS.issubset(graph_standard_ids):
        raise AssertionError("accepted_standard_role_graph must retain all 12 core GHG/PCAF standard nodes.")

    exclusion = accepted_graph.get("graph_exclusion_summary") or {}
    source_links = [
        link for link in (full_graph.get("links") or [])
        if link.get("standard_id") != GENERIC_GHG_ID
    ]
    expected_review_edges = len(source_links) - len(accepted_links)
    if int(exclusion.get("review_edges_excluded", -1)) != expected_review_edges:
        raise AssertionError("accepted_standard_role_graph review exclusion count mismatch.")
    if exclusion.get("drawn_decision_bucket") != "accepted":
        raise AssertionError("accepted_standard_role_graph must declare drawn_decision_bucket=accepted.")


def assert_primary_secondary_bubble_layers() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    source_mix = reporting.get("primary_secondary_data") or {}
    bubbles = source_mix.get("bubbles") or []
    strong = source_mix.get("strong_bubbles") or []
    inference = source_mix.get("inference_bubbles") or []
    summary = source_mix.get("summary") or {}

    if not bubbles:
        raise AssertionError("primary_secondary_data.bubbles is empty.")
    if not strong:
        raise AssertionError("primary_secondary_data.strong_bubbles is empty; strong evidence bubble layer missing.")
    if len(strong) + len(inference) != len(bubbles):
        raise AssertionError("Primary/secondary strong and inference bubble layers do not partition bubbles.")
    if int(summary.get("strong_bubble_count", -1)) != len(strong):
        raise AssertionError("Primary/secondary strong_bubble_count mismatch.")
    if int(summary.get("inference_bubble_count", -1)) != len(inference):
        raise AssertionError("Primary/secondary inference_bubble_count mismatch.")
    if int(summary.get("companies_with_explicit_reported_primary_ratio", -1)) != len(strong):
        raise AssertionError("Explicit reported primary-ratio count must match strong bubbles.")

    for row in strong:
        if row.get("ratio_basis_key") != "explicit_reported_primary_percentage":
            raise AssertionError(f"Non-explicit row leaked into strong_bubbles: {row.get('company_id')}")
        if row.get("bubble_evidence_bucket") != "strong_explicit_reported_primary_ratio":
            raise AssertionError(f"Strong bubble missing strong evidence bucket: {row.get('company_id')}")
        if row.get("reported_primary_percent") in (None, ""):
            raise AssertionError(f"Strong bubble missing reported primary percent: {row.get('company_id')}")
    for row in inference:
        if row.get("ratio_basis_key") == "explicit_reported_primary_percentage":
            raise AssertionError(f"Explicit row leaked into inference_bubbles: {row.get('company_id')}")
        if row.get("bubble_evidence_bucket") != "inference_source_mix_review":
            raise AssertionError(f"Inference bubble missing review evidence bucket: {row.get('company_id')}")
    policy = f"{source_mix.get('display_policy_en', '')} {source_mix.get('policy_en', '')}"
    for required in ["strong", "inference", "not drawn as strong evidence"]:
        if required not in policy:
            raise AssertionError(f"Primary/secondary policy missing required boundary language: {required}")


def assert_technology_project_layers() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    technology = reporting.get("technology_paths") or {}
    clusters = technology.get("clusters") or []
    project_clusters = technology.get("project_clusters") or []
    disclosure_clusters = technology.get("disclosure_signal_clusters") or []
    project_evidence = technology.get("project_evidence") or []
    project_summary = technology.get("project_evidence_summary") or {}

    if not clusters:
        raise AssertionError("technology_paths.clusters is empty.")
    if not project_clusters:
        raise AssertionError("technology_paths.project_clusters is empty.")
    if len(disclosure_clusters) != len(clusters):
        raise AssertionError("technology_paths.disclosure_signal_clusters must mirror the disclosure cluster layer.")
    if int(project_summary.get("project_evidence_count", -1)) != len(project_evidence):
        raise AssertionError("Technology project evidence summary count mismatch.")

    project_count_from_clusters = sum(int(item.get("project_evidence_count") or 0) for item in project_clusters)
    if project_count_from_clusters != len(project_evidence):
        raise AssertionError("Technology project clusters do not account for all project evidence rows.")

    for cluster in project_clusters:
        if cluster.get("evidence_bucket") != "strong_project_evidence":
            raise AssertionError(f"Technology project cluster missing strong evidence bucket: {cluster.get('id')}")
        if cluster.get("evidence_boundary") != "page_level_project_or_measure_evidence":
            raise AssertionError(f"Technology project cluster has wrong evidence boundary: {cluster.get('id')}")
        if int(cluster.get("evidence_count") or 0) != int(cluster.get("project_evidence_count") or 0):
            raise AssertionError(f"Technology project cluster evidence_count must equal project_evidence_count: {cluster.get('id')}")
        if int(cluster.get("project_evidence_count") or 0) > 0 and not cluster.get("project_evidence"):
            raise AssertionError(f"Technology project cluster missing project_evidence samples: {cluster.get('id')}")

    for cluster in disclosure_clusters:
        if cluster.get("evidence_bucket") != "disclosure_signal_review":
            raise AssertionError(f"Technology disclosure cluster missing review bucket: {cluster.get('id')}")
        if cluster.get("evidence_boundary") != "keyword_or_methodology_disclosure_signal_not_project_evidence":
            raise AssertionError(f"Technology disclosure cluster has wrong evidence boundary: {cluster.get('id')}")

    accepted_cost_rows = [
        row for row in project_evidence
        if row.get("cost_evidence_status") == "accepted_project_cost_or_investment_evidence"
    ]
    cost_review_rows = [
        row for row in project_evidence
        if row.get("cost_evidence_status") == "cost_not_disclosed_or_unquantified_review_note"
    ]
    missing_cost_rows = [
        row for row in project_evidence
        if row.get("cost_evidence_status") == "missing_project_cost_or_investment_evidence"
    ]
    if int(project_summary.get("project_cost_evidence_count", -1)) != len(accepted_cost_rows):
        raise AssertionError("Technology project strict cost evidence count mismatch.")
    if int(project_summary.get("project_cost_review_note_count", -1)) != len(cost_review_rows):
        raise AssertionError("Technology project cost review-note count mismatch.")
    if int(project_summary.get("project_abatement_evidence_count", -1)) != sum(1 for row in project_evidence if str(row.get("abatement_effect_en", "")).strip()):
        raise AssertionError("Technology project abatement evidence count mismatch.")

    allowed_cost_statuses = {
        "accepted_project_cost_or_investment_evidence",
        "cost_not_disclosed_or_unquantified_review_note",
        "missing_project_cost_or_investment_evidence",
    }
    forbidden_cost_review_terms = [
        "no quantified",
        "not disclosed",
        "no cost",
        "not quantified",
        "amount is not",
        "transaction amount is not",
        "share is not",
        "not separately quantified",
        "sales revenue",
        "revenue goes",
        "revenue from",
    ]
    for row in project_evidence:
        for required in ["company_id", "technology_id", "evidence_page", "source_file", "snippet_en"]:
            if not str(row.get(required, "")).strip():
                raise AssertionError(f"Technology project evidence missing {required}: {row.get('company_id')} {row.get('technology_id')}")
        status = row.get("cost_evidence_status")
        if status not in allowed_cost_statuses:
            raise AssertionError(f"Unexpected technology project cost evidence status: {status}")
        cost_text = str(row.get("cost_or_investment_en", "")).strip()
        review_note = str(row.get("cost_or_investment_review_note_en", "")).strip()
        if status == "accepted_project_cost_or_investment_evidence":
            if not cost_text:
                raise AssertionError(f"Accepted technology project cost row is missing cost text: {row.get('company_id')} {row.get('technology_id')}")
            lower_cost = cost_text.lower()
            if any(term in lower_cost for term in forbidden_cost_review_terms):
                raise AssertionError(f"Review-only cost wording leaked into accepted cost evidence: {row.get('company_id')} {row.get('technology_id')}")
            if review_note:
                raise AssertionError(f"Accepted technology project cost row has review-note text: {row.get('company_id')} {row.get('technology_id')}")
        if status in {"cost_not_disclosed_or_unquantified_review_note", "missing_project_cost_or_investment_evidence"} and cost_text:
            raise AssertionError(f"Non-accepted technology project cost row has accepted cost text: {row.get('company_id')} {row.get('technology_id')}")
        if status == "missing_project_cost_or_investment_evidence" and review_note:
            raise AssertionError(f"Missing-cost technology project row should not carry review-note text: {row.get('company_id')} {row.get('technology_id')}")

    by_technology = Counter(row.get("technology_id", "") for row in project_evidence)
    zero_project_clusters = [cluster.get("id") for cluster in clusters if by_technology.get(cluster.get("id"), 0) == 0]
    if "circular_recycling" not in zero_project_clusters:
        raise AssertionError("Figure 6 should continue surfacing circular_recycling as lacking project-level evidence until source evidence is added.")
    if len(accepted_cost_rows) + len(cost_review_rows) + len(missing_cost_rows) != len(project_evidence):
        raise AssertionError("Technology project cost status partitions do not cover all project evidence rows.")

    with (WORKBENCH / "world500_technology_project_upgrade_queue.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        upgrade_rows = list(csv.DictReader(handle))
    upgrade_summary = read_json(WORKBENCH / "world500_technology_project_upgrade_queue.json")
    if int(upgrade_summary.get("row_count", -1)) != len(upgrade_rows):
        raise AssertionError("Technology project upgrade queue row_count mismatch.")
    for row in upgrade_rows:
        if row.get("current_signal_status") == "missing_company_specific_snippet":
            if str(row.get("sample_pages", "")).strip() or str(row.get("sample_source_files", "")).strip():
                raise AssertionError(
                    "Technology project upgrade row without company-specific evidence must not display cluster-level sample pages/files: "
                    f"{row.get('company_id')} {row.get('technology_id')}"
                )

    with (WORKBENCH / "world500_technology_p0_project_candidate_snippets.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        candidate_rows = list(csv.DictReader(handle))
    candidate_summary = read_json(WORKBENCH / "world500_technology_p0_project_candidate_snippets_summary.json")
    if candidate_summary.get("schema_version") != "world500-technology-p0-project-candidate-snippets-v1":
        raise AssertionError("Technology P0 project candidate snippets have an unexpected schema version.")
    if len(candidate_rows) != int(candidate_summary.get("candidate_row_count", -1)):
        raise AssertionError("Technology P0 project candidate snippet row_count mismatch.")
    if any(row.get("auto_promote_allowed") != "false" for row in candidate_rows):
        raise AssertionError("Technology P0 candidate snippets must never be auto-promotable.")
    hit_edges = {
        (row.get("company_id", ""), row.get("technology_id", ""))
        for row in candidate_rows
        if row.get("candidate_status") == "candidate_company_pdf_keyword_hit"
    }
    if len(hit_edges) != int(candidate_summary.get("candidate_hit_edge_count", -1)):
        raise AssertionError("Technology P0 project candidate hit-edge count mismatch.")


def assert_snapshot_manifest_and_edge_coverage() -> None:
    manifest_path = WORKBENCH / "snapshot_manifest.json"
    snapshot_audit_path = WORKBENCH / "world500_snapshot_consistency_audit.json"
    edge_audit_path = WORKBENCH / "world500_edge_evidence_coverage_audit.json"
    snapshot_csv_path = WORKBENCH / "world500_snapshot_consistency_audit.csv"
    edge_csv_path = WORKBENCH / "world500_edge_evidence_coverage_audit.csv"

    manifest = read_json(manifest_path)
    snapshot_audit = read_json(snapshot_audit_path)
    edge_audit = read_json(edge_audit_path)

    if manifest.get("schema_version") != "world500-snapshot-manifest-v1":
        raise AssertionError("Snapshot manifest has an unexpected schema version.")
    if snapshot_audit.get("schema_version") != "world500-snapshot-consistency-audit-v1":
        raise AssertionError("Snapshot consistency audit has an unexpected schema version.")
    if edge_audit.get("schema_version") != "world500-edge-evidence-coverage-audit-v1":
        raise AssertionError("Edge evidence coverage audit has an unexpected schema version.")
    if snapshot_audit.get("status") != "passed":
        raise AssertionError("Snapshot consistency audit must pass before publication.")
    if snapshot_audit.get("manifest_sha256") != sha256(manifest_path):
        raise AssertionError("Snapshot consistency audit manifest hash is stale.")

    policy = manifest.get("policy", {})
    if policy.get("canonical_public_graph_layer") != "published_graph":
        raise AssertionError("Snapshot manifest must identify published_graph as the public graph layer.")
    if policy.get("canonical_traceability_layer") != "strict_traceable_graph":
        raise AssertionError("Snapshot manifest must identify strict_traceable_graph as the traceability layer.")
    if policy.get("canonical_reporting_layer") != "reporting_views":
        raise AssertionError("Snapshot manifest must identify reporting_views as the reporting layer.")
    if "must cite a layer_id" not in str(policy.get("count_rule", "")):
        raise AssertionError("Snapshot manifest count_rule must require layer_id citation.")
    if "Accepted fact edges require evidence_page" not in str(policy.get("evidence_page_rule", "")):
        raise AssertionError("Snapshot manifest evidence_page_rule is missing the accepted fact-edge gate.")

    snapshots = {item.get("layer_id"): item for item in manifest.get("snapshots", [])}
    required_layers = {
        "strict_traceable_graph",
        "published_graph",
        "reporting_views",
        "reporting_static_figures",
        "full_accounting_readiness",
    }
    if set(snapshots) != required_layers:
        raise AssertionError(f"Snapshot manifest layers mismatch: {sorted(set(snapshots) ^ required_layers)}")

    strict_summary = read_json(GRAPH / "world500_strict_traceable_graph_summary.json")
    published_summary = read_json(GRAPH / "world500_published_graph_summary.json")
    strict = snapshots["strict_traceable_graph"]
    published = snapshots["published_graph"]
    if strict.get("node_count") != strict_summary.get("node_count") or strict.get("edge_count") != strict_summary.get("edge_count"):
        raise AssertionError("Strict snapshot manifest counts do not match strict summary JSON.")
    if published.get("node_count") != published_summary.get("node_count") or published.get("edge_count") != published_summary.get("edge_count"):
        raise AssertionError("Published snapshot manifest counts do not match published summary JSON.")
    if strict.get("graphml_matches_summary") is not True or published.get("graphml_matches_summary") is not True:
        raise AssertionError("GraphML counts must match graph summary JSON counts.")
    if strict.get("node_count") == published.get("node_count") and strict.get("edge_count") == published.get("edge_count"):
        raise AssertionError("Strict and published graph layers must be cited as distinct snapshots, not collapsed.")

    reporting = snapshots["reporting_views"]
    reporting_file = ROOT / reporting.get("data_file", {}).get("path", "")
    if not reporting_file.exists() or reporting.get("data_file", {}).get("sha256") != sha256(reporting_file):
        raise AssertionError("Reporting snapshot hash mismatch in snapshot manifest.")

    figures = snapshots["reporting_static_figures"]
    if figures.get("source_hash_matches") is not True:
        raise AssertionError("Static figure snapshot source hash does not match reporting_views.json.")
    for figure in figures.get("figure_files", []):
        if figure.get("hash_matches") is not True:
            raise AssertionError(f"Static figure hash mismatch in snapshot manifest: {figure.get('path')}")

    edge_source = ROOT / edge_audit.get("source_file", "")
    if not edge_source.exists() or edge_audit.get("source_sha256") != sha256(edge_source):
        raise AssertionError("Edge evidence coverage audit source hash is stale.")
    edge_summary = edge_audit.get("summary", {})
    if edge_summary.get("accepted_fact_missing_page_gate_passed") is not True:
        raise AssertionError("Accepted fact-edge evidence-page gate failed.")
    if int(edge_summary.get("accepted_fact_missing_evidence_page_count", -1)) != 0:
        raise AssertionError("Accepted fact edges must not be missing evidence_page.")
    if float(edge_summary.get("accepted_fact_evidence_page_coverage_ratio", 0)) != 1.0:
        raise AssertionError("Accepted fact-edge evidence page coverage must be 100%.")
    if int(edge_summary.get("total_missing_evidence_page_count", 0)) <= 0:
        raise AssertionError("Edge audit should expose missing page counts for scaffold edges instead of hiding them.")
    if int(edge_summary.get("ontology_or_scaffold_missing_evidence_page_count", 0)) <= 0:
        raise AssertionError("Edge audit should separately report scaffold edges with optional evidence_page.")

    with snapshot_csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        snapshot_rows = list(csv.DictReader(handle))
    if len(snapshot_rows) != len(snapshots):
        raise AssertionError("Snapshot audit CSV row count does not match manifest snapshot layers.")
    with edge_csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        edge_rows = list(csv.DictReader(handle))
    if len(edge_rows) != len(edge_audit.get("relation_rows", [])):
        raise AssertionError("Edge evidence CSV row count does not match JSON relation rows.")
    for row in edge_audit.get("relation_rows", []):
        if row.get("bucket") == "accepted_fact_edge_requires_page" and int(row.get("missing_evidence_page_count", -1)) != 0:
            raise AssertionError(f"Accepted fact relation is missing evidence_page: {row.get('relation')}")

def assert_technology_cost_p0_targets() -> None:
    payload = read_json(WORKBENCH / "world500_technology_cost_p0_backfill_targets.json")
    if payload.get("schema_version") != "world500-technology-cost-p0-backfill-targets-v1":
        raise AssertionError("Technology cost P0 target list has an unexpected schema version.")
    if "does not create cost evidence" not in str(payload.get("policy", "")):
        raise AssertionError("Technology cost P0 target list must not claim accepted cost evidence.")
    expected = {"electrified_transport", "battery_storage", "renewable_power", "energy_efficiency", "low_carbon_fuels"}
    if set(payload.get("target_technology_ids", [])) != expected:
        raise AssertionError("Technology cost P0 target list must cover the five demand-side priority paths.")
    with (WORKBENCH / "world500_technology_cost_p0_backfill_targets.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != int(payload.get("row_count", -1)):
        raise AssertionError("Technology cost P0 target CSV/JSON row count mismatch.")
    if not rows:
        raise AssertionError("Technology cost P0 target list is empty.")
    if any(row.get("technology_id") not in expected for row in rows):
        raise AssertionError("Technology cost P0 target list contains a non-priority technology path.")
    if not any(row.get("technology_id") == "battery_storage" for row in rows):
        raise AssertionError("Technology cost P0 target list must retain battery/storage targets even when sparse.")


def assert_technology_cost_p0_strict_evidence_batch() -> None:
    payload = read_json(WORKBENCH / "world500_technology_cost_p0_strict_evidence_batch.json")
    if payload.get("schema_version") != "world500-technology-cost-p0-strict-evidence-batch-v1":
        raise AssertionError("Technology cost P0 strict evidence batch has an unexpected schema version.")
    if "capacity, procurement volume" not in str(payload.get("policy", "")):
        raise AssertionError("Technology cost P0 strict evidence batch must exclude capacity/procurement volume as cost evidence.")
    expected = {"electrified_transport", "battery_storage", "renewable_power", "energy_efficiency", "low_carbon_fuels"}
    if set(payload.get("target_technology_ids", [])) != expected:
        raise AssertionError("Technology cost P0 strict evidence batch must cover the five priority paths.")
    with (WORKBENCH / "world500_technology_cost_p0_strict_evidence_batch.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != int(payload.get("row_count", -1)):
        raise AssertionError("Technology cost P0 strict evidence CSV/JSON row count mismatch.")
    accepted = [row for row in rows if row.get("validation_status") == "accepted_strict_cost_or_investment_evidence"]
    if len(accepted) != int(payload.get("accepted_strict_cost_evidence_count", -1)):
        raise AssertionError("Technology cost P0 strict accepted count mismatch.")
    accepted_techs = {row.get("technology_id") for row in accepted}
    if accepted_techs != expected:
        raise AssertionError(f"Technology cost P0 strict evidence does not cover all five priority paths: {accepted_techs}")
    for row in accepted:
        if not row.get("evidence_page") or not row.get("source_file") or not row.get("cost_or_investment_en"):
            raise AssertionError(f"Accepted technology cost evidence missing page/source/cost: {row.get('batch_id')}")
        text = row.get("cost_or_investment_en", "").lower()
        if any(token in text for token in ["no quantified", "not disclosed", "does not disclose", "transaction amount is not", "cost advantage"]):
            raise AssertionError(f"Invalid cost text accepted in P0 strict batch: {row.get('batch_id')}")

def assert_static_figures_manifest() -> None:
    manifest = read_json(FIGURES / "reporting_static_figures_manifest.json")
    source = ROOT / manifest.get("source", "")
    if not source.exists():
        raise AssertionError(f"Missing manifest source: {manifest.get('source')}")
    if sha256(source) != manifest.get("source_sha256"):
        raise AssertionError("Static figure source hash mismatch.")

    figures = manifest.get("figures", [])
    expected_figure_count = len(REQUIRED_SYNCED_REPORT_FIGURES) * 2
    if len(figures) != expected_figure_count:
        raise AssertionError(f"Expected {expected_figure_count} reporting PNGs, found {len(figures)}")
    synced_seen = {name: set() for name in REQUIRED_SYNCED_REPORT_FIGURES}
    for figure in figures:
        file_name = figure.get("file", "")
        path = ROOT / file_name
        if not path.exists():
            raise AssertionError(f"Missing reporting PNG: {file_name}")
        if sha256(path) != figure.get("sha256"):
            raise AssertionError(f"PNG hash mismatch: {file_name}")
        for required_key in [
            "requirement_id",
            "claim_status",
            "can_claim_requirement_complete",
            "static_sync_can_claim_complete",
            "audit_boundary_en",
            "audit_boundary_zh",
        ]:
            if required_key not in figure:
                raise AssertionError(f"Static figure manifest missing {required_key}: {file_name}")
        if figure.get("can_claim_requirement_complete") is not False:
            raise AssertionError(f"Static figure must not claim requirement completion: {file_name}")
        if figure.get("static_sync_can_claim_complete") is not True:
            raise AssertionError(f"Static figure must declare sync gate completion: {file_name}")
        if not str(figure.get("audit_boundary_en", "")).strip() or not str(figure.get("audit_boundary_zh", "")).strip():
            raise AssertionError(f"Static figure missing audit-boundary language: {file_name}")

        basename = path.name
        if basename in REQUIRED_SYNCED_REPORT_FIGURES:
            expected_figure_no = REQUIRED_SYNCED_REPORT_FIGURES[basename]
            if figure.get("figure_no") != expected_figure_no:
                raise AssertionError(
                    f"Static figure {file_name} has figure_no={figure.get('figure_no')}, "
                    f"expected {expected_figure_no}"
                )
            lang = figure.get("lang")
            if lang not in {"zh", "en"}:
                raise AssertionError(f"Static figure {file_name} must declare lang zh/en, found {lang}")
            expected_prefix = f"assets/figures/{lang}/"
            if not file_name.replace("\\", "/").startswith(expected_prefix):
                raise AssertionError(f"Static figure {file_name} is not under expected {expected_prefix}")
            synced_seen[basename].add(lang)

    for basename, langs in synced_seen.items():
        if langs != {"zh", "en"}:
            raise AssertionError(f"Required reporting figure {basename} missing zh/en sync pair: {sorted(langs)}")


def assert_full_graph_pages() -> None:
    pages = sorted(list((ROOT / "zh").glob("*full-graph.html")) + list((ROOT / "en").glob("*full-graph.html")))
    if len(pages) != 50:
        raise AssertionError(f"Expected 50 full graph pages, found {len(pages)}")
    json_re = re.compile(r'<script type="application/json" id="world500-(?:generic|ghg)-full-graph-data">(.*?)</script>', re.S)
    script_re = re.compile(r'<script src="([^"]+)"></script>')
    for page in pages:
        text = page.read_text(encoding="utf-8")
        if "fetch(" in text:
            raise AssertionError(f"Full graph page still contains fetch(): {page.relative_to(ROOT)}")
        if "<img" in text.lower():
            raise AssertionError(f"Full graph page still contains image fallback: {page.relative_to(ROOT)}")
        if re.search(r"<script>\s*\(function \(\) \{", text):
            raise AssertionError(f"Full graph page still contains inline runtime fallback: {page.relative_to(ROOT)}")
        lowered = text.lower()
        for token in FULL_GRAPH_FORBIDDEN_STATIC_FALLBACK_TOKENS:
            if token in lowered:
                raise AssertionError(
                    f"Full graph page still contains static fallback token {token}: {page.relative_to(ROOT)}"
                )
        match = json_re.search(text)
        if not match:
            raise AssertionError(f"Full graph page missing inline JSON: {page.relative_to(ROOT)}")
        payload = json.loads(match.group(1))
        scripts = script_re.findall(text)
        is_cluster_page = page.name in CLUSTER_FULL_GRAPH_PAGES
        expected_script = CLUSTER_FULL_GRAPH_SCRIPT if is_cluster_page else GENERIC_FULL_GRAPH_SCRIPT
        if scripts != [expected_script]:
            raise AssertionError(
                f"Full graph page has unexpected runtime scripts {scripts}, expected {[expected_script]}: "
                f"{page.relative_to(ROOT)}"
            )
        expected_version = CLUSTER_FULL_GRAPH_PAYLOAD_VERSION if is_cluster_page else GENERIC_FULL_GRAPH_PAYLOAD_VERSION
        if payload.get("version") != expected_version:
            raise AssertionError(
                f"Full graph page payload version {payload.get('version')!r} does not match runtime "
                f"{expected_version!r}: {page.relative_to(ROOT)}"
            )
        if not is_cluster_page:
            if payload.get("source") != "inline:world500-generic-full-graph-data":
                raise AssertionError(f"Generic full graph page must declare inline payload source: {page.relative_to(ROOT)}")
            embed_policy = payload.get("embed_policy", {})
            if embed_policy.get("runtime") != "inline_json_no_fetch":
                raise AssertionError(f"Generic full graph page missing inline-json policy: {page.relative_to(ROOT)}")
        reporting = payload.get("reporting", {})
        ghg = reporting.get("ghg_standard_series", {})
        if ghg:
            embed_policy = reporting.get("embed_policy", {})
            if embed_policy.get("runtime") != "inline_json_no_fetch":
                raise AssertionError(f"Full graph page missing inline-json runtime policy: {page.relative_to(ROOT)}")
            if embed_policy.get("generic_ghg_reference") != "excluded_from_drawn_graph":
                raise AssertionError(f"Full graph page does not exclude generic GHG references: {page.relative_to(ROOT)}")
            if embed_policy.get("contextual_overmapped_review") != "excluded_from_drawn_graph_retained_in_reporting_review_queues":
                raise AssertionError(f"Full graph page does not exclude overmapped GHG review edges: {page.relative_to(ROOT)}")
            if embed_policy.get("contextual_scope_inventory_mapping") != "excluded_from_drawn_graph_retained_in_reporting_review_queues":
                raise AssertionError(f"Full graph page does not exclude contextual GHG review edges: {page.relative_to(ROOT)}")
            definition_ids = {item.get("id") for item in ghg.get("definitions", [])}
            summary_ids = {item.get("series_id") for item in ghg.get("series_summary", [])}
            if definition_ids != CORE_GHG_PCAF_STANDARD_IDS:
                raise AssertionError(f"GHG full graph definitions must retain all 12 controlled standards: {page.relative_to(ROOT)}")
            if summary_ids != CORE_GHG_PCAF_STANDARD_IDS:
                raise AssertionError(f"GHG full graph summary must retain all 12 controlled standards, including zero-accepted standards: {page.relative_to(ROOT)}")
            if int(reporting.get("summary", {}).get("ghg_graph_series_count", -1)) != len(CORE_GHG_PCAF_STANDARD_IDS):
                raise AssertionError(f"GHG full graph summary count must be 12 controlled standards: {page.relative_to(ROOT)}")
            for row in ghg.get("company_mappings", []):
                for item in row.get("series", []):
                    series_id = item.get("series_id")
                    match_status = item.get("match_status")
                    if series_id == GENERIC_GHG_ID:
                        raise AssertionError(f"Generic GHG reference leaked into drawn graph payload: {page.relative_to(ROOT)}")
                    if match_status in FORBIDDEN_GHG_DRAWN_MATCH_STATUSES:
                        raise AssertionError(f"Overmapped GHG review edge leaked into drawn graph payload: {page.relative_to(ROOT)}")
                    if match_status not in ALLOWED_GHG_DRAWN_MATCH_STATUSES:
                        raise AssertionError(
                            f"Unknown GHG drawn match_status={match_status!r} in {page.relative_to(ROOT)}"
                        )
            exclusion = ghg.get("graph_exclusion_summary", {})
            if int(exclusion.get("overmapped_review_edges_excluded", 0)) <= 0:
                raise AssertionError(f"GHG full graph should record excluded overmapped review edges: {page.relative_to(ROOT)}")
        role_graph = reporting.get("standard_role_graph", {})
        if role_graph:
            embed_policy = reporting.get("embed_policy", {})
            if embed_policy.get("standard_role_graph") != "accepted_standard_company_edges_only":
                raise AssertionError(
                    f"Standard role full graph must declare accepted-edge-only policy: {page.relative_to(ROOT)}"
                )
            if any(item.get("id") == GENERIC_GHG_ID for item in role_graph.get("standards", [])):
                raise AssertionError(f"Generic GHG standard leaked into standard role graph: {page.relative_to(ROOT)}")
            if any(item.get("standard_id") == GENERIC_GHG_ID for item in role_graph.get("links", [])):
                raise AssertionError(f"Generic GHG link leaked into standard role graph: {page.relative_to(ROOT)}")
            leaked_review_links = [
                item for item in role_graph.get("links", [])
                if item.get("decision_bucket") != "accepted"
            ]
            if leaked_review_links:
                raise AssertionError(
                    f"Review/non-accepted link leaked into standard role full graph: {page.relative_to(ROOT)}"
                )
            exclusion = role_graph.get("graph_exclusion_summary", {})
            if exclusion.get("drawn_decision_bucket") != "accepted":
                raise AssertionError(
                    f"Standard role full graph must declare drawn_decision_bucket=accepted: {page.relative_to(ROOT)}"
                )


def assert_homepage_and_report_links() -> None:
    reporting = read_json(WORKBENCH / "reporting_views.json")
    summary = reporting.get("summary", {})
    ghg_badge = (
        f"{summary.get('ghg_explicit_series_company_count')}/"
        f"{summary.get('ghg_protocol_company_count')}"
    )
    emissions_badge = (
        f"{summary.get('complete_emissions_ranking_company_count')}/"
        f"{summary.get('available_emissions_ranking_company_count')}"
    )

    checked_pages = [
        ROOT / "index.html",
        ROOT / "zh" / "index.html",
        ROOT / "en" / "index.html",
        ROOT / "README.md",
        ROOT / "REPORTING_COMPLETION_AUDIT_ZH.md",
        ROOT / "reporting-completion-audit.html",
    ]
    combined = "\n".join(path.read_text(encoding="utf-8") for path in checked_pages)
    for pattern in OLD_TEXT_PATTERNS:
        if pattern in combined:
            raise AssertionError(f"Old reporting status text still present: {pattern}")

    for page in [ROOT / "index.html", ROOT / "zh" / "index.html", ROOT / "en" / "index.html"]:
        text = page.read_text(encoding="utf-8")
        if "reporting-completion-audit.html" not in text:
            raise AssertionError(f"Homepage missing completion audit HTML link: {page.relative_to(ROOT)}")
        if ghg_badge not in text:
            raise AssertionError(f"Homepage missing current GHG fine-series badge {ghg_badge}: {page.relative_to(ROOT)}")
        if emissions_badge not in text:
            raise AssertionError(
                f"Homepage missing current emissions ranking badge {emissions_badge}: {page.relative_to(ROOT)}"
            )

    report_html = (ROOT / "reporting-completion-audit.html").read_text(encoding="utf-8")
    for required in [
        "world500_reporting_completion_workplan.json",
        "world500_reporting_completion_workplan.csv",
        "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
        "R4_TECHNOLOGY_PATH_AXIS",
    ]:
        if required not in report_html:
            raise AssertionError(f"Completion audit HTML missing {required}")

    reporting_js = (ROOT / "assets" / "js" / "reporting_views.js").read_text(encoding="utf-8")
    for required in [
        "world500_reporting_completion_workplan.json",
        "renderCompletionWorkplan",
        "state.workplan",
    ]:
        if required not in reporting_js:
            raise AssertionError(f"Reporting views frontend missing workplan integration: {required}")


def assert_disclosure_boundary_language() -> None:
    checked_pages = [
        ROOT / "index.html",
        ROOT / "zh" / "index.html",
        ROOT / "en" / "index.html",
        ROOT / "assets" / "js" / "reporting_views.js",
    ]
    combined = "\n".join(path.read_text(encoding="utf-8") for path in checked_pages)
    for pattern in FORBIDDEN_OVERCLAIM_TEXT:
        if pattern in combined:
            raise AssertionError(f"Overclaiming disclosure wording still present: {pattern}")

    required_terms = {
        ROOT / "index.html": [
            "披露信号聚类",
            "不等同于已核证项目实施",
            "不等于已审定计算权重",
        ],
        ROOT / "zh" / "index.html": [
            "披露信号聚类",
            "不等同于已核证项目实施",
            "不等于已审定计算权重",
        ],
        ROOT / "en" / "index.html": [
            "disclosure-signal cluster",
            "not verified project implementation",
            "not audited calculation weights",
        ],
        ROOT / "assets" / "js" / "reporting_views.js": [
            "披露信号聚类",
            "not verified project implementation",
            "not audited calculation weights",
        ],
    }
    for path, terms in required_terms.items():
        text = path.read_text(encoding="utf-8")
        for term in terms:
            if term not in text:
                raise AssertionError(f"Missing disclosure-boundary language in {path.relative_to(ROOT)}: {term}")


def assert_audit_report_freshness() -> None:
    manifest = read_json(FIGURES / "reporting_static_figures_manifest.json")
    audit = read_json(WORKBENCH / "reporting_completion_audit.json")
    closure_dashboard = read_json(WORKBENCH / "world500_reporting_closure_dashboard.json")
    ghg_series_acceptance_ledger = read_json(WORKBENCH / "world500_ghg_series_acceptance_ledger.json")
    all_overmapped_decisions = read_json(WORKBENCH / "world500_ghg_overmapped_demote_decisions.json")
    overmapped_decisions = read_json(WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.json")
    emissions_partial_exclusions = read_json(WORKBENCH / "world500_emissions_partial_exclusion_decisions.json")
    emissions_ranking_ledger = read_json(WORKBENCH / "world500_emissions_ranking_evidence_ledger.json")
    report_files = [
        ROOT / "REPORTING_COMPLETION_AUDIT_ZH.md",
        ROOT / "reporting-completion-audit.html",
    ]
    required_values = [
        manifest.get("generated_at"),
        manifest.get("source_sha256"),
        audit.get("generated_at"),
    ]
    for report in report_files:
        text = report.read_text(encoding="utf-8")
        for value in required_values:
            if value and value not in text:
                raise AssertionError(f"Audit report {report.relative_to(ROOT)} is stale; missing {value}")
        for required in [
            "静态 PNG 业务完成边界",
            "partial_disclosure_signal_only",
            "partial_source_mix_inference",
            "partial_complete_comparable_only",
            "Evidence Closure Dashboard",
            "world500_reporting_closure_dashboard.json",
            "world500_reporting_closure_dashboard.csv",
            str(closure_dashboard.get("batch_count")),
            str(closure_dashboard.get("open_queue_rows")),
            "GHG Fine-Series Acceptance Ledger",
            "world500_ghg_series_acceptance_ledger.json",
            "world500_ghg_series_acceptance_ledger.csv",
            str(ghg_series_acceptance_ledger.get("accepted_edge_count")),
            str(ghg_series_acceptance_ledger.get("review_edge_count")),
            str(ghg_series_acceptance_ledger.get("demoted_edge_count")),
            str(ghg_series_acceptance_ledger.get("accepted_outside_whitelist_count")),
            str(ghg_series_acceptance_ledger.get("review_outside_whitelist_count")),
            "GHG Overmapping Demotion Decisions",
            "world500_ghg_overmapped_demote_decisions.json",
            "world500_ghg_overmapped_demote_decisions.csv",
            "world500_ghg_p0_overmapped_demote_decisions.json",
            "world500_ghg_p0_overmapped_demote_decisions.csv",
            str(all_overmapped_decisions.get("decision_count")),
            str(overmapped_decisions.get("decision_count")),
            "Emissions Partial-Total Exclusion Decisions",
            "world500_emissions_partial_exclusion_decisions.json",
            "world500_emissions_partial_exclusion_decisions.csv",
            str(emissions_partial_exclusions.get("decision_count")),
            "Emissions Ranking Evidence Ledger",
            "world500_emissions_ranking_evidence_ledger.json",
            "world500_emissions_ranking_evidence_ledger.csv",
            str(emissions_ranking_ledger.get("complete_accepted_count")),
            str(emissions_ranking_ledger.get("partial_excluded_count")),
            str(emissions_ranking_ledger.get("gap_candidate_count")),
            "Emissions Year-Alignment Demotion Ledger",
            "world500_emissions_year_alignment_demotions.json",
            "world500_emissions_year_alignment_demotions.csv",
        ]:
            if required not in text:
                raise AssertionError(f"Audit report {report.relative_to(ROOT)} missing required audit/dashboard content: {required}")

    audit_text = json.dumps(audit, ensure_ascii=False)
    if '"source_sha256_matches": false' in audit_text:
        raise AssertionError("Reporting completion audit still contains a source_sha256 mismatch.")


def assert_javascript_syntax() -> None:
    node = shutil.which("node")
    if not node:
        print("WARN: node not found; skipped JS syntax checks.")
        return
    targets = [
        ROOT / "assets" / "js" / "reporting_views.js",
        ROOT / "assets" / "js" / "standard_cluster_full_graph.js",
        ROOT / "assets" / "js" / "generic_full_graph.js",
    ]
    for target in targets:
        subprocess.run([node, "--check", str(target)], check=True, cwd=ROOT)


def main() -> None:
    checks = [
        assert_required_files,
        assert_matrix_and_gap_status,
        assert_workplan_matches_issue_register,
        assert_closure_dashboard_matches_workplan,
        assert_ghg_overmapping_demotions,
        assert_ghg_series_acceptance_ledger,
        assert_ghg_zero_accepted_standard_audit,
        assert_ghg_backfill_explicit_recheck,
        assert_ghg_pcaf_standard_registry_integrity,
        assert_ghg_review_acceptance_decisions,
        assert_emissions_ranking_gate,
        assert_emissions_partial_exclusions,
        assert_emissions_ranking_evidence_ledger,
        assert_emissions_year_alignment_demotions,
        assert_accepted_standard_role_graph,
        assert_primary_secondary_bubble_layers,
        assert_technology_project_layers,
        assert_snapshot_manifest_and_edge_coverage,
        assert_technology_cost_p0_targets,
        assert_static_figures_manifest,
        assert_full_graph_pages,
        assert_homepage_and_report_links,
        assert_disclosure_boundary_language,
        assert_audit_report_freshness,
        assert_javascript_syntax,
    ]
    for check in checks:
        check()
    print("Reporting completion gate verified: status is accurately partial and all audit artifacts are consistent.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
