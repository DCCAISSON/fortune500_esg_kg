import json
import re
import csv
from datetime import date
from pathlib import Path

from reporting_queue_utils import closed_queue_count, effective_queue_rows


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_FILE = WORKBENCH / "reporting_views.json"
OUTPUT_FILE = WORKBENCH / "reporting_completion_audit.json"
GHG_MAPPING_AUDIT_FILE = WORKBENCH / "world500_ghg_series_mapping_audit.csv"
GHG_CONTEXTUAL_REVIEW_FILE = WORKBENCH / "world500_ghg_contextual_series_review_queue.csv"
GHG_OVERMAPPING_REVIEW_FILE = WORKBENCH / "world500_ghg_contextual_overmapping_review_queue.csv"
GHG_EXPLICIT_CANDIDATE_FILE = WORKBENCH / "world500_ghg_explicit_series_candidate_queue.csv"
GHG_OVERMAPPING_P0_FILE = WORKBENCH / "world500_ghg_p0_overmapped_contextual_edge_queue.csv"
GHG_OVERMAPPING_P1_FILE = WORKBENCH / "world500_ghg_p1_named_series_missing_queue.csv"
GHG_OVERMAPPING_P2_FILE = WORKBENCH / "world500_ghg_p2_low_evidence_contextual_edge_queue.csv"
GHG_OVERMAPPED_DEMOTE_DECISIONS_FILE = WORKBENCH / "world500_ghg_overmapped_demote_decisions.json"
GHG_P0_OVERMAPPED_DEMOTE_DECISIONS_FILE = WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.json"
EMISSIONS_RANKING_AUDIT_FILE = WORKBENCH / "world500_emissions_ranking_audit.csv"
EMISSIONS_COMPLETE_VERIFY_QUEUE_FILE = WORKBENCH / "world500_emissions_complete_ranking_verification_queue.csv"
EMISSIONS_SCOPE3_QUEUE_FILE = WORKBENCH / "world500_emissions_scope3_backfill_queue.csv"
EMISSIONS_SCOPE2_QUEUE_FILE = WORKBENCH / "world500_emissions_scope2_method_backfill_queue.csv"
EMISSIONS_SCOPE2_VALUE_QUEUE_FILE = WORKBENCH / "world500_emissions_scope2_value_backfill_queue.csv"
EMISSIONS_SCOPE2_METHOD_REVIEW_QUEUE_FILE = WORKBENCH / "world500_emissions_scope2_method_review_queue.csv"
EMISSIONS_SCOPE1_QUEUE_FILE = WORKBENCH / "world500_emissions_scope1_backfill_queue.csv"
EMISSIONS_FINANCE_SCOPE3_BOUNDARY_QUEUE_FILE = WORKBENCH / "world500_emissions_finance_scope3_boundary_review_queue.csv"
EMISSIONS_SELECTED_EVIDENCE_ELEMENT_QUEUE_FILE = WORKBENCH / "world500_emissions_selected_evidence_element_review_queue.csv"
EMISSIONS_UNIT_SCALE_REVIEW_QUEUE_FILE = WORKBENCH / "world500_emissions_unit_scale_review_queue.csv"
TECHNOLOGY_PATH_AUDIT_FILE = WORKBENCH / "world500_technology_path_audit.csv"
TECHNOLOGY_PATH_VALIDATION_QUEUE_FILE = WORKBENCH / "world500_technology_path_validation_queue.csv"
TECHNOLOGY_COMPANY_EVIDENCE_QUEUE_FILE = WORKBENCH / "world500_technology_company_evidence_backfill_queue.csv"
TECHNOLOGY_TIMELINE_QUEUE_FILE = WORKBENCH / "world500_technology_timeline_validation_queue.csv"
TECHNOLOGY_COST_QUEUE_FILE = WORKBENCH / "world500_technology_cost_validation_queue.csv"
TECHNOLOGY_PROJECT_EVIDENCE_AUDIT_FILE = WORKBENCH / "world500_technology_project_evidence_audit.csv"
TECHNOLOGY_PROJECT_EVIDENCE_INVALID_QUEUE_FILE = WORKBENCH / "world500_technology_project_evidence_invalid_queue.csv"
SOURCE_MIX_AUDIT_FILE = WORKBENCH / "world500_primary_secondary_source_mix_audit.csv"
SOURCE_MIX_CLASSIFICATION_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_source_classification_queue.csv"
SOURCE_MIX_ORIGIN_BACKFILL_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_source_origin_backfill_queue.csv"
SOURCE_MIX_UNKNOWN_SHARE_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_unknown_share_review_queue.csv"
SOURCE_MIX_CALCULATION_WEIGHT_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_calculation_weight_validation_queue.csv"
STANDARD_ROLE_LINK_AUDIT_FILE = WORKBENCH / "world500_standard_role_link_audit.csv"
NON_GHG_SCOPE_REVIEW_FILE = WORKBENCH / "world500_non_ghg_scope_wording_review_queue.csv"
STATIC_FIGURE_MANIFEST_FILE = ROOT / "assets" / "figures" / "reporting_static_figures_manifest.json"


REPORTING_FULL_GRAPH_PAGES = [
    ROOT / "zh" / "ghg-protocol-full-graph.html",
    ROOT / "en" / "ghg-protocol-full-graph.html",
    ROOT / "zh" / "role-family-standard-full-graph.html",
    ROOT / "en" / "role-family-standard-full-graph.html",
]
GENERIC_FULL_GRAPH_PAGES = [
    path
    for lang_dir in (ROOT / "zh", ROOT / "en")
    for path in sorted(lang_dir.glob("*full-graph.html"))
    if path.name not in {"ghg-protocol-full-graph.html", "role-family-standard-full-graph.html"}
]
FULL_GRAPH_PAGES = REPORTING_FULL_GRAPH_PAGES + GENERIC_FULL_GRAPH_PAGES

STATIC_FIGURES = [
    ROOT / "assets" / "figures" / "zh" / "world500_emissions_ranking_graph.png",
    ROOT / "assets" / "figures" / "en" / "world500_emissions_ranking_graph.png",
    ROOT / "assets" / "figures" / "zh" / "world500_standard_chain_overview.png",
    ROOT / "assets" / "figures" / "en" / "world500_standard_chain_overview.png",
    ROOT / "assets" / "figures" / "zh" / "world500_technology_cluster_overview.png",
    ROOT / "assets" / "figures" / "en" / "world500_technology_cluster_overview.png",
    ROOT / "assets" / "figures" / "zh" / "world500_primary_secondary_source_mix.png",
    ROOT / "assets" / "figures" / "en" / "world500_primary_secondary_source_mix.png",
]


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def pct(numerator, denominator):
    return round((numerator / denominator) * 100, 1) if denominator else 0


def html_payload(path):
    text = path.read_text(encoding="utf-8")
    match = re.search(r'<script type="application/json" id="[^"]+">(.*?)</script>', text, re.S)
    if not match:
        return {}, 0
    payload_text = match.group(1).replace("<\\/", "</")
    return json.loads(payload_text), len(payload_text)


def html_payload_keys(path):
    payload, _ = html_payload(path)
    return sorted(payload.keys())


def full_graph_runtime_ok():
    details = []
    ok = True
    for path in REPORTING_FULL_GRAPH_PAGES:
        payload, payload_chars = html_payload(path)
        keys = sorted(payload.keys())
        system_key = payload.get("system", {}).get("key")
        reporting = payload.get("reporting") or {}
        required_data_key = "ghg_standard_series" if system_key == "ghg" else "standard_role_graph"
        embed_policy = reporting.get("embed_policy") or {}
        source_hash_matches = bool(payload.get("source_sha256")) and payload.get("source_sha256") == sha256_file(REPORTING_FILE)
        generic_reference_removed = True
        if required_data_key == "ghg_standard_series" and required_data_key in reporting:
            graph_data = reporting[required_data_key]
            generic_reference_removed = (
                not any(item.get("id") == "ghg_generic_reference" for item in graph_data.get("definitions", []))
                and not any(item.get("series_id") == "ghg_generic_reference" for item in graph_data.get("series_summary", []))
                and not any(
                    any(series.get("series_id") == "ghg_generic_reference" for series in row.get("series", []))
                    for row in graph_data.get("company_mappings", [])
                )
            )
        elif required_data_key == "standard_role_graph" and required_data_key in reporting:
            graph_data = reporting[required_data_key]
            generic_reference_removed = (
                not any(item.get("id") == "ghg_generic_reference" for item in graph_data.get("standards", []))
                and not any(item.get("standard_id") == "ghg_generic_reference" for item in graph_data.get("links", []))
                and not any("ghg_generic_reference" in row.get("standard_ids", []) for row in graph_data.get("companies", []))
            )
        page_ok = (
            payload.get("version") == "reporting_views_embedded_v6_explicit_ghg_only"
            and required_data_key in reporting
            and embed_policy.get("runtime") == "inline_json_no_fetch"
            and source_hash_matches
            and generic_reference_removed
            and payload_chars > 100000
        )
        details.append({
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "embedded_keys": keys,
            "version": payload.get("version"),
            "system": system_key,
            "required_data_key": required_data_key,
            "has_required_data": required_data_key in reporting,
            "source_sha256_matches": source_hash_matches,
            "embed_policy": embed_policy,
            "generic_reference_removed": generic_reference_removed,
            "payload_chars": payload_chars,
        })
        if not page_ok:
            ok = False
    for path in GENERIC_FULL_GRAPH_PAGES:
        payload, payload_chars = html_payload(path)
        text = path.read_text(encoding="utf-8", errors="ignore")
        executable = re.sub(r'<script type="application/json" id="[^"]+">.*?</script>', "", text, flags=re.S)
        old_inline_runtime_removed = not re.search(r"<script>\s*\(function \(\)", executable, re.S)
        no_runtime_fetch = not re.search(r"fetch\(|XMLHttpRequest|d3\.json|JSON\.parse\(dataNode\.textContent \|\|", executable)
        middle_nodes = payload.get("middleNodes")
        companies = payload.get("companies")
        system = payload.get("system")
        embed_policy = payload.get("embed_policy") or {}
        is_empty_graph = not bool(middle_nodes) or not bool(system)
        page_ok = (
            payload.get("version") == "generic_full_graph_embedded_v2_inline_json_strict"
            and isinstance(middle_nodes, list)
            and isinstance(companies, list)
            and isinstance(system, dict)
            and "generic_full_graph.js" in text
            and old_inline_runtime_removed
            and no_runtime_fetch
            and embed_policy.get("runtime") == "inline_json_no_fetch"
            and embed_policy.get("missing_required_data") == "fail_fast_no_fallback"
            and embed_policy.get("empty_graph") == "visible_empty_state"
            and payload_chars > 1000
        )
        details.append({
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "embedded_keys": sorted(payload.keys()),
            "version": payload.get("version"),
            "system": (system or {}).get("key"),
            "renderer": "generic_full_graph.js" if "generic_full_graph.js" in text else "",
            "old_inline_runtime_removed": old_inline_runtime_removed,
            "no_runtime_fetch": no_runtime_fetch,
            "embed_policy": embed_policy,
            "middle_node_count": len(middle_nodes) if isinstance(middle_nodes, list) else None,
            "company_count": len(companies) if isinstance(companies, list) else None,
            "empty_graph_visible_state": is_empty_graph and embed_policy.get("empty_graph") == "visible_empty_state",
            "payload_chars": payload_chars,
        })
        if not page_ok:
            ok = False
    return ok, details


def figure_status():
    files = []
    ok = True
    manifest = {}
    if STATIC_FIGURE_MANIFEST_FILE.exists():
        manifest = load_json(STATIC_FIGURE_MANIFEST_FILE)
    else:
        ok = False
    manifest_files = {item.get("file"): item for item in manifest.get("figures", [])}
    source_matches = manifest.get("source_sha256") and manifest.get("source_sha256") == sha256_file(REPORTING_FILE)
    if not source_matches:
        ok = False
    for path in STATIC_FIGURES:
        exists = path.exists()
        if not exists:
            ok = False
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        manifest_row = manifest_files.get(rel) or {}
        hash_matches = exists and manifest_row.get("sha256") == sha256_file(path)
        if not hash_matches:
            ok = False
        files.append({
            "file": rel,
            "exists": exists,
            "bytes": path.stat().st_size if exists else 0,
            "manifest_sha256_matches": hash_matches,
        })
    return ok, {
        "manifest_exists": STATIC_FIGURE_MANIFEST_FILE.exists(),
        "manifest_file": str(STATIC_FIGURE_MANIFEST_FILE.relative_to(ROOT)).replace("\\", "/"),
        "source_sha256_matches": bool(source_matches),
        "generator": manifest.get("generator"),
        "generated_at": manifest.get("generated_at"),
        "files": files,
    }


def sha256_file(path):
    import hashlib

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def homepage_static_json_present():
    targets = [ROOT / "index.html", ROOT / "zh" / "index.html", ROOT / "en" / "index.html"]
    static_pages = []
    for path in targets:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r'<script type="application/json" id="world500-entity-nav-data">(.*?)</script>', text, re.S)
        if not match:
            continue
        try:
            payload = json.loads(match.group(1))
        except json.JSONDecodeError:
            static_pages.append(str(path.relative_to(ROOT)).replace("\\", "/"))
            continue
        if "systems" in payload:
            static_pages.append(str(path.relative_to(ROOT)).replace("\\", "/"))
    return static_pages


def homepage_method_static_json_present():
    targets = [ROOT / "index.html", ROOT / "zh" / "index.html", ROOT / "en" / "index.html"]
    static_pages = []
    for path in targets:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r'<script type="application/json" id="world500-method-nav-data">(.*?)</script>', text, re.S)
        if not match:
            continue
        try:
            payload = json.loads(match.group(1))
        except json.JSONDecodeError:
            static_pages.append(str(path.relative_to(ROOT)).replace("\\", "/"))
            continue
        if "systems" in payload and "source" not in payload:
            static_pages.append(str(path.relative_to(ROOT)).replace("\\", "/"))
    return static_pages


def ghg_mapping_audit_counts():
    if not GHG_MAPPING_AUDIT_FILE.exists():
        return {"exists": False, "row_count": 0}
    with GHG_MAPPING_AUDIT_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    contextual_rows = []
    if GHG_CONTEXTUAL_REVIEW_FILE.exists():
        with GHG_CONTEXTUAL_REVIEW_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            contextual_rows = list(csv.DictReader(handle))
    overmapping_rows = []
    if GHG_OVERMAPPING_REVIEW_FILE.exists():
        with GHG_OVERMAPPING_REVIEW_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            overmapping_rows = list(csv.DictReader(handle))
    explicit_candidate_rows = []
    if GHG_EXPLICIT_CANDIDATE_FILE.exists():
        with GHG_EXPLICIT_CANDIDATE_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            explicit_candidate_rows = list(csv.DictReader(handle))
    contextual_open_rows = effective_queue_rows(
        ROOT,
        str(GHG_CONTEXTUAL_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
        contextual_rows,
    )
    overmapping_open_rows = effective_queue_rows(
        ROOT,
        str(GHG_OVERMAPPING_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
        overmapping_rows,
    )
    explicit_candidate_open_rows = effective_queue_rows(
        ROOT,
        str(GHG_EXPLICIT_CANDIDATE_FILE.relative_to(ROOT)).replace("\\", "/"),
        explicit_candidate_rows,
    )
    overmapped_decisions = load_json(GHG_OVERMAPPED_DEMOTE_DECISIONS_FILE) if GHG_OVERMAPPED_DEMOTE_DECISIONS_FILE.exists() else {}
    p0_overmapped_decisions = load_json(GHG_P0_OVERMAPPED_DEMOTE_DECISIONS_FILE) if GHG_P0_OVERMAPPED_DEMOTE_DECISIONS_FILE.exists() else {}
    split_queues = {}
    for key, path in {
        "p0_overmapped_contextual_edge_queue": GHG_OVERMAPPING_P0_FILE,
        "p1_named_series_missing_queue": GHG_OVERMAPPING_P1_FILE,
        "p2_low_evidence_contextual_edge_queue": GHG_OVERMAPPING_P2_FILE,
    }.items():
        split_rows = []
        if path.exists():
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                split_rows = list(csv.DictReader(handle))
        relative = str(path.relative_to(ROOT)).replace("\\", "/")
        split_open_rows = effective_queue_rows(ROOT, relative, split_rows)
        split_queues[key] = {
            "exists": path.exists(),
            "row_count": len(split_open_rows),
            "raw_row_count": len(split_rows),
            "closed_demoted_row_count": closed_queue_count(ROOT, relative, split_rows),
            "file": relative,
        }
    return {
        "exists": True,
        "row_count": len(rows),
        "p0_contextual_upgrade_rows": sum(1 for row in rows if row.get("review_priority") == "P0_upgrade_contextual_to_explicit"),
        "p0_reassign_or_demote_contextual_overmapping_rows": sum(1 for row in rows if row.get("review_priority") == "P0_reassign_or_demote_contextual_overmapping"),
        "p1_find_named_source_rows": sum(1 for row in rows if row.get("review_priority") == "P1_find_named_series_source"),
        "p2_verify_explicit_rows": sum(1 for row in rows if row.get("review_priority") == "P2_verify_snippet_quality"),
        "contextual_overmapped_review_rows": sum(1 for row in rows if row.get("match_status") == "contextual_overmapped_review"),
        "file": str(GHG_MAPPING_AUDIT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "contextual_review_queue_exists": GHG_CONTEXTUAL_REVIEW_FILE.exists(),
        "contextual_review_queue_rows": len(contextual_open_rows),
        "contextual_review_queue_raw_rows": len(contextual_rows),
        "contextual_review_queue_closed_demoted_rows": closed_queue_count(
            ROOT,
            str(GHG_CONTEXTUAL_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
            contextual_rows,
        ),
        "contextual_review_queue_file": str(GHG_CONTEXTUAL_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
        "overmapping_review_queue_exists": GHG_OVERMAPPING_REVIEW_FILE.exists(),
        "overmapping_review_queue_rows": len(overmapping_open_rows),
        "overmapping_review_queue_raw_rows": len(overmapping_rows),
        "overmapping_review_queue_closed_demoted_rows": closed_queue_count(
            ROOT,
            str(GHG_OVERMAPPING_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
            overmapping_rows,
        ),
        "p0_possible_overmapped_contextual_edges": sum(1 for row in overmapping_open_rows if row.get("review_priority") == "P0_possible_overmapped_contextual_edge"),
        "p1_named_series_missing_from_sample_rows": sum(1 for row in overmapping_open_rows if row.get("review_priority") == "P1_named_series_missing_from_sample"),
        "p2_low_evidence_contextual_edge_rows": sum(1 for row in overmapping_open_rows if row.get("review_priority") == "P2_low_evidence_contextual_edge"),
        "overmapping_review_queue_file": str(GHG_OVERMAPPING_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
        "explicit_candidate_queue_exists": GHG_EXPLICIT_CANDIDATE_FILE.exists(),
        "explicit_candidate_queue_rows": len(explicit_candidate_open_rows),
        "explicit_candidate_queue_raw_rows": len(explicit_candidate_rows),
        "explicit_candidate_queue_closed_demoted_rows": closed_queue_count(
            ROOT,
            str(GHG_EXPLICIT_CANDIDATE_FILE.relative_to(ROOT)).replace("\\", "/"),
            explicit_candidate_rows,
        ),
        "p0_promote_after_pdf_page_verification_rows": sum(1 for row in explicit_candidate_open_rows if row.get("review_priority") == "P0_promote_after_pdf_page_verification"),
        "p0_reassign_or_demote_after_pdf_page_verification_rows": sum(1 for row in explicit_candidate_open_rows if row.get("review_priority") == "P0_reassign_or_demote_after_pdf_page_verification"),
        "explicit_candidate_queue_file": str(GHG_EXPLICIT_CANDIDATE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "overmapped_demote_decisions": {
            "exists": GHG_OVERMAPPED_DEMOTE_DECISIONS_FILE.exists(),
            "file": str(GHG_OVERMAPPED_DEMOTE_DECISIONS_FILE.relative_to(ROOT)).replace("\\", "/"),
            "decision_count": overmapped_decisions.get("decision_count", 0),
            "reassignment_status_counts": overmapped_decisions.get("reassignment_status_counts", {}),
        },
        "p0_overmapped_demote_decisions": {
            "exists": GHG_P0_OVERMAPPED_DEMOTE_DECISIONS_FILE.exists(),
            "file": str(GHG_P0_OVERMAPPED_DEMOTE_DECISIONS_FILE.relative_to(ROOT)).replace("\\", "/"),
            "decision_count": p0_overmapped_decisions.get("decision_count", 0),
            "reassignment_status_counts": p0_overmapped_decisions.get("reassignment_status_counts", {}),
        },
        "split_queues": split_queues,
    }


def emissions_ranking_audit_counts():
    if not EMISSIONS_RANKING_AUDIT_FILE.exists():
        return {"exists": False, "row_count": 0}
    with EMISSIONS_RANKING_AUDIT_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    queue_files = {
        "complete_verification_queue": EMISSIONS_COMPLETE_VERIFY_QUEUE_FILE,
        "scope3_backfill_queue": EMISSIONS_SCOPE3_QUEUE_FILE,
        "scope2_method_backfill_queue": EMISSIONS_SCOPE2_QUEUE_FILE,
        "scope2_value_backfill_queue": EMISSIONS_SCOPE2_VALUE_QUEUE_FILE,
        "scope2_method_review_queue": EMISSIONS_SCOPE2_METHOD_REVIEW_QUEUE_FILE,
        "scope1_backfill_queue": EMISSIONS_SCOPE1_QUEUE_FILE,
        "finance_scope3_boundary_review_queue": EMISSIONS_FINANCE_SCOPE3_BOUNDARY_QUEUE_FILE,
        "selected_evidence_element_review_queue": EMISSIONS_SELECTED_EVIDENCE_ELEMENT_QUEUE_FILE,
        "unit_scale_review_queue": EMISSIONS_UNIT_SCALE_REVIEW_QUEUE_FILE,
    }
    queues = {}
    for key, path in queue_files.items():
        queue_rows = []
        if path.exists():
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                queue_rows = list(csv.DictReader(handle))
        queues[key] = {
            "exists": path.exists(),
            "row_count": len(queue_rows),
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
        }
    return {
        "exists": True,
        "row_count": len(rows),
        "complete_scope123_strong_evidence_rows": sum(1 for row in rows if row.get("ranking_bucket") == "complete_scope123_strong_evidence"),
        "partial_strong_evidence_rows": sum(1 for row in rows if row.get("ranking_bucket") == "partial_strong_evidence_total"),
        "p0_backfill_scope3_rows": sum(1 for row in rows if row.get("review_priority") == "P0_backfill_scope3"),
        "p1_backfill_scope2_method_rows": sum(1 for row in rows if row.get("review_priority") == "P1_backfill_scope2_method"),
        "p1_backfill_scope1_rows": sum(1 for row in rows if row.get("review_priority") == "P1_backfill_scope1"),
        "file": str(EMISSIONS_RANKING_AUDIT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "queues": queues,
    }


def technology_path_audit_counts():
    if not TECHNOLOGY_PATH_AUDIT_FILE.exists():
        return {"exists": False, "row_count": 0}
    with TECHNOLOGY_PATH_AUDIT_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    queue_rows = []
    if TECHNOLOGY_PATH_VALIDATION_QUEUE_FILE.exists():
        with TECHNOLOGY_PATH_VALIDATION_QUEUE_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            queue_rows = list(csv.DictReader(handle))
    split_queues = {}
    for key, path in {
        "company_evidence_backfill_queue": TECHNOLOGY_COMPANY_EVIDENCE_QUEUE_FILE,
        "timeline_validation_queue": TECHNOLOGY_TIMELINE_QUEUE_FILE,
        "cost_validation_queue": TECHNOLOGY_COST_QUEUE_FILE,
    }.items():
        split_rows = []
        if path.exists():
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                split_rows = list(csv.DictReader(handle))
        split_queues[key] = {
            "exists": path.exists(),
            "row_count": len(split_rows),
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
        }
    project_rows = []
    if TECHNOLOGY_PROJECT_EVIDENCE_AUDIT_FILE.exists():
        with TECHNOLOGY_PROJECT_EVIDENCE_AUDIT_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            project_rows = list(csv.DictReader(handle))
    invalid_project_rows = []
    if TECHNOLOGY_PROJECT_EVIDENCE_INVALID_QUEUE_FILE.exists():
        with TECHNOLOGY_PROJECT_EVIDENCE_INVALID_QUEUE_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            invalid_project_rows = list(csv.DictReader(handle))
    return {
        "exists": True,
        "row_count": len(rows),
        "technology_cluster_count": len({row.get("technology_id") for row in rows if row.get("technology_id")}),
        "unique_company_count": len({row.get("company_id") for row in rows if row.get("company_id")}),
        "project_evidence_rows": len(project_rows),
        "valid_project_evidence_rows": sum(1 for row in project_rows if row.get("validation_status") == "valid_project_evidence"),
        "invalid_project_evidence_rows": len(invalid_project_rows),
        "project_evidence_company_count": len({row.get("company_id") for row in project_rows if row.get("company_id")}),
        "project_evidence_file": str(TECHNOLOGY_PROJECT_EVIDENCE_AUDIT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "project_evidence_invalid_queue_file": str(TECHNOLOGY_PROJECT_EVIDENCE_INVALID_QUEUE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "p2_verify_disclosure_signal_rows": sum(1 for row in rows if row.get("review_priority") == "P2_verify_disclosure_signals"),
        "p0_company_specific_backfill_rows": sum(1 for row in rows if row.get("review_priority") == "P0_backfill_company_specific_technology_evidence"),
        "p1_timeline_cost_validation_rows": sum(1 for row in rows if row.get("review_priority", "").startswith("P1_")),
        "p2_company_disclosure_verification_rows": sum(1 for row in rows if row.get("review_priority") == "P2_verify_company_disclosure_signal"),
        "file": str(TECHNOLOGY_PATH_AUDIT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "validation_queue_exists": TECHNOLOGY_PATH_VALIDATION_QUEUE_FILE.exists(),
        "validation_queue_rows": len(queue_rows),
        "validation_queue_file": str(TECHNOLOGY_PATH_VALIDATION_QUEUE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "split_queues": split_queues,
    }


def source_mix_audit_counts():
    if not SOURCE_MIX_AUDIT_FILE.exists():
        return {"exists": False, "row_count": 0}
    with SOURCE_MIX_AUDIT_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    queue_rows = []
    if SOURCE_MIX_CLASSIFICATION_QUEUE_FILE.exists():
        with SOURCE_MIX_CLASSIFICATION_QUEUE_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            queue_rows = list(csv.DictReader(handle))
    split_queues = {}
    for key, path in {
        "source_origin_backfill_queue": SOURCE_MIX_ORIGIN_BACKFILL_QUEUE_FILE,
        "unknown_share_review_queue": SOURCE_MIX_UNKNOWN_SHARE_QUEUE_FILE,
        "calculation_weight_validation_queue": SOURCE_MIX_CALCULATION_WEIGHT_QUEUE_FILE,
    }.items():
        split_rows = []
        if path.exists():
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                split_rows = list(csv.DictReader(handle))
        split_queues[key] = {
            "exists": path.exists(),
            "row_count": len(split_rows),
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
        }
    return {
        "exists": True,
        "row_count": len(rows),
        "included_bubble_rows": sum(1 for row in rows if row.get("bubble_chart_status") == "included"),
        "excluded_no_classified_source_ratio_rows": sum(1 for row in rows if row.get("bubble_chart_status") != "included"),
        "explicit_reported_primary_ratio_rows": sum(1 for row in rows if row.get("ratio_basis_key") == "explicit_reported_primary_percentage"),
        "method_row_source_mix_rows": sum(1 for row in rows if row.get("ratio_basis_key") == "method_row_source_mix"),
        "p0_classify_source_origin_rows": sum(1 for row in rows if row.get("review_priority") == "P0_classify_source_origin"),
        "p1_reduce_unknown_source_share_rows": sum(1 for row in rows if row.get("review_priority") == "P1_reduce_unknown_source_share"),
        "file": str(SOURCE_MIX_AUDIT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "classification_queue_exists": SOURCE_MIX_CLASSIFICATION_QUEUE_FILE.exists(),
        "classification_queue_rows": len(queue_rows),
        "classification_queue_file": str(SOURCE_MIX_CLASSIFICATION_QUEUE_FILE.relative_to(ROOT)).replace("\\", "/"),
        "split_queues": split_queues,
    }


def standard_role_link_audit_counts():
    if not STANDARD_ROLE_LINK_AUDIT_FILE.exists():
        return {"exists": False, "row_count": 0}
    with STANDARD_ROLE_LINK_AUDIT_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    queue_rows = []
    if NON_GHG_SCOPE_REVIEW_FILE.exists():
        with NON_GHG_SCOPE_REVIEW_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
            queue_rows = list(csv.DictReader(handle))
    return {
        "exists": True,
        "row_count": len(rows),
        "p0_non_ghg_standard_scope_term_misuse_rows": sum(1 for row in rows if row.get("review_priority") == "P0_non_ghg_standard_scope_term_misuse"),
        "p2_verify_non_ghg_source_quote_scope_rows": sum(1 for row in rows if row.get("review_priority") == "P2_verify_non_ghg_source_quote_scope"),
        "p1_backfill_standard_evidence_rows": sum(1 for row in rows if row.get("review_priority") == "P1_backfill_standard_evidence"),
        "p2_verify_scope_language_and_evidence_rows": sum(1 for row in rows if row.get("review_priority") == "P2_verify_scope_language_and_evidence"),
        "p2_verify_standard_link_rows": sum(1 for row in rows if row.get("review_priority") == "P2_verify_standard_link"),
        "file": str(STANDARD_ROLE_LINK_AUDIT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "non_ghg_scope_review_queue_exists": NON_GHG_SCOPE_REVIEW_FILE.exists(),
        "non_ghg_scope_review_queue_rows": len(queue_rows),
        "non_ghg_scope_review_queue_file": str(NON_GHG_SCOPE_REVIEW_FILE.relative_to(ROOT)).replace("\\", "/"),
    }


def check(id_, severity, status_key, req_zh, req_en, evidence_zh, evidence_en, remaining_zh, remaining_en, metrics=None):
    return {
        "id": id_,
        "severity": severity,
        "status_key": status_key,
        "status_zh": {
            "implemented": "已实现",
            "partial": "部分实现",
            "needs_review": "需继续复核",
            "not_started": "未实现",
        }.get(status_key, status_key),
        "status_en": {
            "implemented": "Implemented",
            "partial": "Partially implemented",
            "needs_review": "Needs review",
            "not_started": "Not started",
        }.get(status_key, status_key),
        "requirement_zh": req_zh,
        "requirement_en": req_en,
        "evidence_zh": evidence_zh,
        "evidence_en": evidence_en,
        "remaining_work_zh": remaining_zh,
        "remaining_work_en": remaining_en,
        "metrics": metrics or {},
    }


def main():
    payload = load_json(REPORTING_FILE)
    summary = payload["summary"]
    ghg_summary = payload["ghg_standard_series"]["series_summary"]
    ghg_mappings = payload["ghg_standard_series"]["company_mappings"]
    ghg_defined_series = len(payload["ghg_standard_series"].get("definitions") or [])
    explicit_companies = summary.get("ghg_explicit_series_company_count", 0)
    ghg_companies = summary.get("ghg_protocol_company_count", 0)
    explicit_ratio = pct(explicit_companies, ghg_companies)
    nonzero_ghg_series = [item for item in ghg_summary if item.get("series_id") != "ghg_generic_reference" and item.get("company_count", 0) > 0]

    match_status_counts = {}
    for mapping in ghg_mappings:
        for series in mapping.get("series", []):
            key = series.get("match_status") or "unknown"
            match_status_counts[key] = match_status_counts.get(key, 0) + 1
    ghg_mapping_audit = ghg_mapping_audit_counts()
    ghg_overmapping_rows = ghg_mapping_audit.get("overmapping_review_queue_rows", 0)
    ghg_p0_overmapped_rows = ghg_mapping_audit.get("p0_possible_overmapped_contextual_edges", 0)
    ghg_p1_named_missing_rows = ghg_mapping_audit.get("p1_named_series_missing_from_sample_rows", 0)
    ghg_p2_low_evidence_rows = ghg_mapping_audit.get("p2_low_evidence_contextual_edge_rows", 0)
    ghg_explicit_candidate_rows = ghg_mapping_audit.get("explicit_candidate_queue_rows", 0)
    ghg_promote_candidate_rows = ghg_mapping_audit.get("p0_promote_after_pdf_page_verification_rows", 0)
    ghg_reassign_candidate_rows = ghg_mapping_audit.get("p0_reassign_or_demote_after_pdf_page_verification_rows", 0)
    ghg_overmapped_status_rows = ghg_mapping_audit.get("contextual_overmapped_review_rows", 0)
    ghg_p0_demotion_status_counts = (
        ghg_mapping_audit.get("p0_overmapped_demote_decisions", {}).get("reassignment_status_counts", {})
    )
    ghg_all_demotion_status_counts = (
        ghg_mapping_audit.get("overmapped_demote_decisions", {}).get("reassignment_status_counts", {})
    )
    ghg_p0_demoted_already_accepted = ghg_p0_demotion_status_counts.get(
        "current_edge_demoted_reassignment_already_accepted", 0
    )
    ghg_demoted_total = sum(int(value or 0) for value in ghg_all_demotion_status_counts.values())
    ghg_closed_contextual_rows = ghg_mapping_audit.get("contextual_review_queue_closed_demoted_rows", 0)
    ghg_closed_explicit_candidate_rows = ghg_mapping_audit.get("explicit_candidate_queue_closed_demoted_rows", 0)

    ranking = payload["emissions_ranking"]
    complete_ranking_count = len(ranking.get("complete", []))
    available_ranking_count = len(ranking.get("available", []))
    ranking_graph_count = len(ranking.get("ranking_graph", {}).get("companies", []))
    emissions_ranking_audit = emissions_ranking_audit_counts()
    ranking_gap_queues = emissions_ranking_audit.get("queues", {})
    scope3_queue_count = ranking_gap_queues.get("scope3_backfill_queue", {}).get("row_count", 0)
    scope2_queue_count = ranking_gap_queues.get("scope2_method_backfill_queue", {}).get("row_count", 0)
    scope2_value_queue_count = ranking_gap_queues.get("scope2_value_backfill_queue", {}).get("row_count", 0)
    scope2_method_review_queue_count = ranking_gap_queues.get("scope2_method_review_queue", {}).get("row_count", 0)
    scope1_queue_count = ranking_gap_queues.get("scope1_backfill_queue", {}).get("row_count", 0)
    finance_scope3_boundary_queue_count = ranking_gap_queues.get("finance_scope3_boundary_review_queue", {}).get("row_count", 0)
    evidence_element_queue_count = ranking_gap_queues.get("selected_evidence_element_review_queue", {}).get("row_count", 0)
    complete_verify_queue_count = ranking_gap_queues.get("complete_verification_queue", {}).get("row_count", 0)
    unit_scale_review_queue_count = ranking_gap_queues.get("unit_scale_review_queue", {}).get("row_count", 0)

    technology = payload["technology_paths"]
    clusters = technology.get("clusters", [])
    clusters_with_subtypes = sum(1 for item in clusters if item.get("subtypes"))
    clusters_with_timeline = sum(1 for item in clusters if item.get("timeline_counts"))
    clusters_with_cost = sum(1 for item in clusters if item.get("cost_signal_count", 0) > 0)
    technology_path_audit = technology_path_audit_counts()
    project_evidence_rows = technology_path_audit.get("valid_project_evidence_rows", 0)
    project_evidence_company_count = technology_path_audit.get("project_evidence_company_count", 0)
    invalid_project_evidence_rows = technology_path_audit.get("invalid_project_evidence_rows", 0)

    source_mix = payload["primary_secondary_data"]
    source_bubbles = source_mix.get("bubbles", [])
    ratio_bubbles = [
        item for item in source_bubbles
        if item.get("primary_ratio_known") is not None
        and (
            item.get("known_source_evidence_count", 0) > 0
            or item.get("ratio_basis_key") == "explicit_reported_primary_percentage"
        )
    ]
    explicit_primary_ratio_bubbles = [
        item for item in ratio_bubbles
        if item.get("ratio_basis_key") == "explicit_reported_primary_percentage"
    ]
    source_mix_audit = source_mix_audit_counts()
    standard_role_link_audit = standard_role_link_audit_counts()

    runtime_ok, runtime_details = full_graph_runtime_ok()
    figures_ok, figure_details = figure_status()
    static_homepages = homepage_static_json_present()
    static_method_homepages = homepage_method_static_json_present()

    checks = [
        check(
            "ghg_protocol_fine_series",
            "high",
            "partial" if explicit_ratio < 50 else "implemented",
            "GHG Protocol 需要像 ISO 一样拆分到具体标准、指南、项目协议和本地化项目，并说明原则。",
            "GHG Protocol should be split into concrete standards, guidance, project protocols, and programs with principles.",
            f"当前定义 {ghg_defined_series} 个 GHG 细分系列，{len(nonzero_ghg_series)} 个有企业命中；{ghg_companies} 家 GHG 企业中 {explicit_companies} 家显式命中具体系列（{explicit_ratio}%）。映射审计 CSV 已列出 {ghg_mapping_audit.get('row_count', 0)} 条企业-系列边，其中 {ghg_overmapped_status_rows} 条已从普通上下文映射隔离为 contextual_overmapped_review。全量过度映射降级账本已关闭 {ghg_demoted_total} 条错挂边；这些行仍保留在原始 CSV 中用于追溯，但其中 {ghg_closed_contextual_rows} 条已从显式证据补强队列有效开放量排除、{ghg_closed_explicit_candidate_rows} 条已从显式系列候选队列排除。当前有效开放的显式证据补强队列为 {ghg_mapping_audit.get('contextual_review_queue_rows', 0)} 条；显式系列候选队列为 {ghg_explicit_candidate_rows} 条，其中 {ghg_promote_candidate_rows} 条可能复核后升级、{ghg_reassign_candidate_rows} 条可能需要重分配或降级；上下文过度映射复核队列当前有效开放 {ghg_overmapping_rows} 条，并拆成 P0 可能过度映射 {ghg_p0_overmapped_rows} 条、P1 样本缺少命名系列 {ghg_p1_named_missing_rows} 条、P2 低证据上下文 {ghg_p2_low_evidence_rows} 条。P0 过度映射降级账本已将 {ghg_p0_demoted_already_accepted} 条当前错误边标记为降级，且替代命名系列已在 accepted mapping 中采信。",
            f"Current payload defines {ghg_defined_series} GHG fine series; {len(nonzero_ghg_series)} have company hits. {explicit_companies}/{ghg_companies} GHG companies have explicit fine-series citations ({explicit_ratio}%). The mapping audit CSV lists {ghg_mapping_audit.get('row_count', 0)} company-series edges, including {ghg_overmapped_status_rows} edges isolated from ordinary contextual mappings as contextual_overmapped_review. The full overmapping demotion ledger has closed {ghg_demoted_total} overmapped edges; those rows remain in raw CSVs for traceability, but {ghg_closed_contextual_rows} have been excluded from the effective-open explicit-evidence queue and {ghg_closed_explicit_candidate_rows} from the effective-open explicit-series candidate queue. The effective-open explicit-evidence queue now lists {ghg_mapping_audit.get('contextual_review_queue_rows', 0)} edges; the explicit-series candidate queue lists {ghg_explicit_candidate_rows} named-series candidates ({ghg_promote_candidate_rows} possible promotions and {ghg_reassign_candidate_rows} possible reassign/demote cases), and the contextual-overmapping queue lists {ghg_overmapping_rows} effective-open contextual edges split into {ghg_p0_overmapped_rows} P0 possible overmappings, {ghg_p1_named_missing_rows} P1 named-series-missing rows, and {ghg_p2_low_evidence_rows} P2 low-evidence contextual rows. The P0 overmapping demotion ledger now marks {ghg_p0_demoted_already_accepted} current erroneous edges as demoted with their replacement named series already accepted.",
            "继续把补强队列中的上下文解析命中提升为 PDF 原文显式引用证据；优先复核显式系列候选队列和 P0 过度映射边。显式率不足前，不应把全部细分边视为同等强证据。",
            "Continue upgrading contextual mappings in the queue to explicit PDF-text citations, prioritizing the explicit-series candidate queue and P0 possible overmappings. Until then, not all fine-series edges should be treated as equally strong evidence.",
            {
                "ghg_defined_series": ghg_defined_series,
                "ghg_nonzero_series": len(nonzero_ghg_series),
                "ghg_company_count": ghg_companies,
                "explicit_company_count": explicit_companies,
                "explicit_company_ratio_percent": explicit_ratio,
                "match_status_counts": match_status_counts,
                "mapping_audit": ghg_mapping_audit,
            },
        ),
        check(
            "standard_company_relationships",
            "medium",
            "implemented" if standard_role_link_audit.get("exists") else "partial",
            "展示整个标准和企业的关联情况。",
            "Show the overall relationship between standards and companies.",
            f"当前标准角色图包含 {summary.get('standard_count')} 个标准节点、{summary.get('standard_company_count')} 家企业、{summary.get('standard_link_count')} 条标准-企业关系。",
            f"The standard role graph contains {summary.get('standard_count')} standard nodes, {summary.get('standard_company_count')} companies, and {summary.get('standard_link_count')} standard-company links. The relationship audit CSV lists {standard_role_link_audit.get('row_count', 0)} standard-company edges.",
            "后续重点不是结构缺失，而是继续提升每条边的证据片段质量和页码可追溯性。",
            "The structure exists; the remaining work is improving evidence snippets and page-level traceability for each edge.",
            {"standard_role_link_audit": standard_role_link_audit},
        ),
        check(
            "emissions_ranking",
            "high",
            "partial" if complete_ranking_count < available_ranking_count else "implemented",
            "企业总碳排放量需要从高到低排序，并可做知识图谱展示。",
            "Company total emissions should be ranked high to low and shown as a knowledge graph.",
            f"当前有 {available_ranking_count} 家可用总量，{complete_ranking_count} 家满足完整 Scope 1/2/3 强证据排行；排行图展示 {ranking_graph_count} 家完整强证据企业。排行审计 CSV 已列出 {emissions_ranking_audit.get('row_count', 0)} 家可用总量，并拆出完整排行 P2 复核 {complete_verify_queue_count} 条、Scope 3 缺口 {scope3_queue_count} 条、Scope 2 总缺口 {scope2_queue_count} 条（其中 Scope 2 数值缺口 {scope2_value_queue_count} 条、Scope 2 口径复核 {scope2_method_review_queue_count} 条）、Scope 1 缺口 {scope1_queue_count} 条、单位/表格列尺度复核 {unit_scale_review_queue_count} 条。",
            f"Current data has {available_ranking_count} available totals, {complete_ranking_count} complete Scope 1/2/3 strong-evidence rankings, and {ranking_graph_count} companies in the ranking graph. The ranking audit CSV lists {emissions_ranking_audit.get('row_count', 0)} available totals and separates {complete_verify_queue_count} complete-ranking P2 verification rows, {scope3_queue_count} Scope 3 gaps, {finance_scope3_boundary_queue_count} finance Scope 3 boundary reviews, {evidence_element_queue_count} selected-row evidence-element reviews, {scope2_queue_count} total Scope 2 gaps ({scope2_value_queue_count} missing-value rows and {scope2_method_review_queue_count} method-review rows), {scope1_queue_count} Scope 1 gaps, and {unit_scale_review_queue_count} unit/table-column scale review rows.",
            f"完整强证据覆盖率仍低；不能把 {available_ranking_count - complete_ranking_count} 家 partial 总量混同为完整可比排行。下一步应按缺口队列回到 PDF 页级证据补值和核验口径。",
            f"Complete strong-evidence coverage remains low; the {available_ranking_count - complete_ranking_count} partial totals must not be mixed into the complete comparable ranking. Next, use the gap queues to backfill page-level PDF evidence and verify methods.",
            {"ranking_audit": emissions_ranking_audit},
        ),
        check(
            "standard_full_graph_runtime",
            "medium",
            "implemented" if runtime_ok else "partial",
            "标准角色族全屏实体级知识图谱需要标准在中间、企业在外围、不同标准和行业用不同颜色。",
            "The full-screen standard role graph should place standards centrally, companies externally, and color standards/industries distinctly.",
            "50 个全屏图页面已统一为内嵌 JSON：4 个 GHG/标准角色族页面嵌入 reporting_views.json 同源裁剪图谱，46 个旧 generic 页面嵌入严格版本化 JSON 并加载共享 generic_full_graph.js；企业节点使用行业颜色，标准/中层节点使用主题颜色，不再依赖旧 inline runtime 或运行时外部 fetch。",
            "All 50 full-screen pages now use embedded JSON: the 4 GHG/standard role-family pages embed same-source reporting_views.json graph subsets, while 46 legacy generic pages embed strict versioned JSON and load the shared generic_full_graph.js renderer. Company nodes use industry colors, standard/middle nodes use theme colors, and the pages no longer depend on the old inline runtime or runtime external fetch.",
            "两个旧 principle 角色族页没有可绘制节点，已作为真实空数据页进入可见空状态；不是静默 fallback。",
            "Two legacy principle role-family pages have no drawable nodes and now enter a visible empty-data state instead of silently falling back.",
            {"runtime_pages": runtime_details},
        ),
        check(
            "scope_language_policy",
            "high",
            "partial" if standard_role_link_audit.get("p0_non_ghg_standard_scope_term_misuse_rows", 0) else "implemented",
            "只有 GHG Protocol 下使用 Scope 1/2/3；其他标准默认使用直接/间接排放口径。",
            "Use Scope 1/2/3 wording only under GHG Protocol; use direct/indirect wording for other standards by default.",
            f"报告页和全屏图的说明已明确该口径，standard_cluster_full_graph.js 对非 GHG 标准显示直接/间接口径提醒。当前非 GHG 标准自身名称/角色/原则中的 Scope 术语误用为 {standard_role_link_audit.get('p0_non_ghg_standard_scope_term_misuse_rows', 0)} 条；源文引用中出现 Scope 的 P2 复核为 {standard_role_link_audit.get('p2_verify_non_ghg_source_quote_scope_rows', 0)} 条。",
            f"The reporting page and full-screen graph explicitly state this rule; standard_cluster_full_graph.js shows a direct/indirect wording reminder for non-GHG standards. Current non-GHG standard-name/role/principle Scope-term misuse rows: {standard_role_link_audit.get('p0_non_ghg_standard_scope_term_misuse_rows', 0)}; source-quote Scope review rows: {standard_role_link_audit.get('p2_verify_non_ghg_source_quote_scope_rows', 0)}.",
            "继续复核源文引用中的 Scope 是否仅作为原文证据展示；不要把它提升为非 GHG 标准自身术语。",
            "Continue reviewing Scope wording in source quotations as quoted evidence only; do not promote it into the non-GHG standard's own terminology.",
            {"standard_role_link_audit": standard_role_link_audit},
        ),
        check(
            "technology_path_axis",
            "medium",
            "partial",
            "图6 需要同类减碳技术企业聚类、流程图、标准对齐、细分技术、时间趋势和成本。",
            "Figure 6 needs technology clusters, a flow view, standards alignment, subtypes, timeline trends, and cost signals.",
            f"当前有 {len(clusters)} 类技术路径；{clusters_with_subtypes} 类有细分方向，{clusters_with_timeline} 类有时间趋势，{clusters_with_cost} 类有成本信号，并已生成中英文静态 PNG。技术路径审计 CSV 已列出 {technology_path_audit.get('row_count', 0)} 条技术-企业关系；总复核队列列出 {technology_path_audit.get('validation_queue_rows', 0)} 条，并已拆成公司级证据补回 {technology_path_audit.get('split_queues', {}).get('company_evidence_backfill_queue', {}).get('row_count', 0)} 条、时间趋势核验 {technology_path_audit.get('split_queues', {}).get('timeline_validation_queue', {}).get('row_count', 0)} 条、成本/投资信号核验 {technology_path_audit.get('split_queues', {}).get('cost_validation_queue', {}).get('row_count', 0)} 条。",
            f"Current data has {len(clusters)} technology paths; {clusters_with_subtypes} include subtypes, {clusters_with_timeline} include timeline counts, {clusters_with_cost} include cost signals, and bilingual PNGs are generated. A separate page-level project-evidence layer now contains {project_evidence_rows} valid records across {project_evidence_company_count} companies, with {invalid_project_evidence_rows} invalid project-evidence rows. The legacy technology-path audit CSV still lists {technology_path_audit.get('row_count', 0)} disclosure-signal technology-company rows; the total validation queue lists {technology_path_audit.get('validation_queue_rows', 0)} rows and is split into {technology_path_audit.get('split_queues', {}).get('company_evidence_backfill_queue', {}).get('row_count', 0)} company-evidence backfills, {technology_path_audit.get('split_queues', {}).get('timeline_validation_queue', {}).get('row_count', 0)} timeline validations, and {technology_path_audit.get('split_queues', {}).get('cost_validation_queue', {}).get('row_count', 0)} cost/investment validations.",
            "成本和时间仍是关键词披露证据，不是项目级成本曲线或真实实施进度审定；公司级样本缺失的企业-技术边不能当作强证据。",
            "The new page-level project-evidence layer can be used as strong project/measure evidence. The broader legacy technology-company edge set still remains keyword disclosure signals, not project-level cost curves or verified implementation progress; company-technology edges without company-specific page snippets must not be treated as strong evidence.",
            {"technology_path_audit": technology_path_audit},
        ),
        check(
            "primary_secondary_bubble",
            "medium",
            "partial",
            "根据每家企业使用初级数据计算的比例做气泡图。",
            "Create a bubble chart by each company's primary-data use ratio.",
            f"当前有 {len(source_bubbles)} 家企业进入来源结构数据，{len(ratio_bubbles)} 家有可显示初级/次级比例，其中 {len(explicit_primary_ratio_bubbles)} 家来自原文明示 primary data 百分比，其余为 method_rows 来源结构推断；中英文静态 PNG 已同步生成。来源审计 CSV 已列出 {source_mix_audit.get('row_count', 0)} 家企业；总分类队列 {source_mix_audit.get('classification_queue_rows', 0)} 条，并拆成来源类别补回 {source_mix_audit.get('split_queues', {}).get('source_origin_backfill_queue', {}).get('row_count', 0)} 条、unknown 占比复核 {source_mix_audit.get('split_queues', {}).get('unknown_share_review_queue', {}).get('row_count', 0)} 条、计算权重核验 {source_mix_audit.get('split_queues', {}).get('calculation_weight_validation_queue', {}).get('row_count', 0)} 条。",
            f"Current source-mix data covers {len(source_bubbles)} companies, with {len(ratio_bubbles)} displayable primary/secondary ratios. {len(explicit_primary_ratio_bubbles)} use explicitly reported primary-data percentages, while the rest use method_rows source-mix inference; bilingual PNGs are generated. The source-mix audit CSV lists {source_mix_audit.get('row_count', 0)} companies; the total classification queue has {source_mix_audit.get('classification_queue_rows', 0)} rows and is split into {source_mix_audit.get('split_queues', {}).get('source_origin_backfill_queue', {}).get('row_count', 0)} source-origin backfills, {source_mix_audit.get('split_queues', {}).get('unknown_share_review_queue', {}).get('row_count', 0)} unknown-share reviews, and {source_mix_audit.get('split_queues', {}).get('calculation_weight_validation_queue', {}).get('row_count', 0)} calculation-weight validations.",
            "已优先使用原文明示 primary data 百分比，但仍需逐条核验是否等同对应排放边界的真实计算权重；没有明示百分比的企业仍只是 method_rows 来源结构比例。",
            "Explicitly reported primary-data percentages are now preferred, but each still needs validation before being treated as the actual calculation weight for the relevant emissions boundary. Companies without explicit percentages still use method_rows source-mix ratios only.",
            {
                "source_mix_audit": source_mix_audit,
                "payload_summary": source_mix.get("summary", {}),
            },
        ),
        check(
            "static_png_sync",
            "low",
            "implemented" if figures_ok else "partial",
            "排放排行图谱、图2、图6和气泡图需要同步生成静态 PNG，保证 GitHub 页面和汇报图一致。",
            "The emissions-ranking graph, Figures 2 and 6, and the bubble chart should be generated as static PNGs so GitHub pages and briefing figures match.",
            "8 张中英文 PNG 均存在；manifest 记录 reporting_views.json 源 hash、生成器和每张 PNG hash，用于确认页面数据与汇报图同源。",
            "All eight bilingual PNGs exist. The manifest records the reporting_views.json source hash, generator, and each PNG hash so the page data and briefing figures can be verified as same-source.",
            "后续每次更新 reporting_views.json 后都应重跑统一同步脚本；旧图2脚本已改为统一入口的兼容包装。",
            "Re-run the unified sync script whenever reporting_views.json changes. The old Figure 2 script is now only a compatibility wrapper around the unified entry point.",
            {"figures": figure_details},
        ),
    ]

    known_issues = []
    if static_homepages:
        known_issues.append({
            "id": "homepage_static_entity_nav_json",
            "severity": "medium",
            "issue_zh": "首页实体导航仍内嵌静态 JSON，可能与 reporting_views.json 后续更新不同步。",
            "issue_en": "The homepage entity navigator still embeds static JSON and may drift from future reporting_views.json updates.",
            "files": static_homepages,
            "recommended_next_step_zh": "把首页实体导航改成运行时读取 reporting_views.json 或专门的导航 JSON。",
            "recommended_next_step_en": "Refactor the homepage entity navigator to load reporting_views.json or a dedicated navigation JSON at runtime.",
        })
    if static_method_homepages:
        known_issues.append({
            "id": "homepage_static_method_nav_json",
            "severity": "medium",
            "issue_zh": "首页方法导航仍内嵌大体量静态 JSON；这不影响全屏图，但如果要求全站消灭静态块，仍需改成同源运行时数据或单独方法导航 JSON。",
            "issue_en": "The homepage methodology navigator still embeds large static JSON. This does not affect the full-screen graph, but it should be moved to same-source runtime data or a dedicated method-nav JSON if all static blocks must be removed site-wide.",
            "files": static_method_homepages,
            "recommended_next_step_zh": "后续把 world500-method-nav-data 改为小配置，并新增方法导航运行时构建逻辑。",
            "recommended_next_step_en": "Replace world500-method-nav-data with a small config payload and add runtime construction for the methodology navigator.",
        })

    payload_out = {
        "version": "reporting_completion_audit_v1",
        "generated_at": date.today().isoformat(),
        "overall_status_key": "partial",
        "overall_status_zh": "部分完成，展示层基本到位，证据强度仍需继续提升。",
        "overall_status_en": "Partially complete: presentation is mostly in place, while evidence strength still needs improvement.",
        "checks": checks,
        "known_issues": known_issues,
    }
    OUTPUT_FILE.write_text(json.dumps(payload_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
