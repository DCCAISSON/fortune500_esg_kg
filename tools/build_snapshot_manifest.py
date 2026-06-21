from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / "assets" / "data" / "world500" / "graph"
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
FIGURES = ROOT / "assets" / "figures"

SNAPSHOT_MANIFEST = WORKBENCH / "snapshot_manifest.json"
SNAPSHOT_AUDIT_JSON = WORKBENCH / "world500_snapshot_consistency_audit.json"
SNAPSHOT_AUDIT_CSV = WORKBENCH / "world500_snapshot_consistency_audit.csv"
EDGE_AUDIT_JSON = WORKBENCH / "world500_edge_evidence_coverage_audit.json"
EDGE_AUDIT_CSV = WORKBENCH / "world500_edge_evidence_coverage_audit.csv"

STRICT_SUMMARY = GRAPH / "world500_strict_traceable_graph_summary.json"
PUBLISHED_SUMMARY = GRAPH / "world500_published_graph_summary.json"
STRICT_GRAPHML = GRAPH / "world500_strict_traceable_kg.graphml"
PUBLISHED_GRAPHML = GRAPH / "world500_published_kg.graphml"
STRICT_EDGES = GRAPH / "world500_strict_traceable_edges.csv"
REPORTING_VIEWS = WORKBENCH / "reporting_views.json"
STATIC_FIGURES_MANIFEST = FIGURES / "reporting_static_figures_manifest.json"
READINESS_SUMMARY = WORKBENCH / "full_accounting_readiness_summary.json"

FACT_EDGE_RELATIONS_REQUIRING_PAGE = {
    "discloses_emission",
    "documents_methodology",
    "documents_standard_reference",
    "documents_scope3_category_candidate",
    "documents_scope_candidate",
    "documents_gwp_version",
    "documents_economic_instrument",
}

ONTOLOGY_OR_SCAFFOLD_RELATIONS = {
    "for_scope",
    "has_methodology_fact",
    "has_scope3_category",
    "references_standard",
    "has_data_source_type",
    "has_calculation_method",
    "has_data_quality_flag",
    "has_source_file",
    "publishes",
    "reports_emission",
    "has_source_trace",
    "has_evidence_page",
    "has_recognition_basis",
    "has_gwp_version_fact",
    "has_economic_instrument_fact",
    "uses_economic_instrument",
    "uses_gwp_version",
    "has_unit",
    "has_year",
    "has_value",
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def file_meta(path: Path) -> dict:
    return {
        "path": rel(path),
        "exists": path.exists(),
        "bytes": path.stat().st_size if path.exists() else 0,
        "sha256": sha256(path) if path.exists() else "",
    }


def graphml_counts(path: Path) -> dict:
    if not path.exists():
        return {"node_count": None, "edge_count": None}
    node_count = 0
    edge_count = 0
    for _, elem in ET.iterparse(path, events=("end",)):
        tag = elem.tag.rsplit("}", 1)[-1]
        if tag == "node":
            node_count += 1
        elif tag == "edge":
            edge_count += 1
        elem.clear()
    return {"node_count": node_count, "edge_count": edge_count}


def normalize_graph_summary(path: Path, layer_id: str, graphml_path: Path, source_script: str) -> dict:
    data = read_json(path)
    graphml = graphml_counts(graphml_path)
    company_count = data.get("company_count", data.get("strict_company_count"))
    return {
        "layer_id": layer_id,
        "kind": "graph_snapshot",
        "source_script": source_script,
        "summary_file": file_meta(path),
        "graphml_file": file_meta(graphml_path),
        "node_count": int(data.get("node_count", 0)),
        "edge_count": int(data.get("edge_count", 0)),
        "company_count": int(company_count) if company_count is not None else None,
        "node_type_count": data.get("node_type_count"),
        "relation_type_count": data.get("relation_type_count"),
        "graphml_node_count": graphml.get("node_count"),
        "graphml_edge_count": graphml.get("edge_count"),
        "graphml_matches_summary": graphml.get("node_count") == data.get("node_count") and graphml.get("edge_count") == data.get("edge_count"),
        "description": data.get("description", ""),
    }


def reporting_view_snapshot() -> dict:
    data = read_json(REPORTING_VIEWS)
    summary = data.get("summary", {})
    accepted = data.get("accepted_standard_role_graph", {})
    return {
        "layer_id": "reporting_views",
        "kind": "reporting_snapshot",
        "source_script": "tools/build_world500_reporting_views.js",
        "data_file": file_meta(REPORTING_VIEWS),
        "generated_at": data.get("generated_at"),
        "company_count": summary.get("company_count"),
        "ghg_protocol_company_count": summary.get("ghg_protocol_company_count"),
        "ghg_pcaf_core_whitelist_standard_count": summary.get("ghg_pcaf_core_whitelist_standard_count"),
        "ghg_accepted_series_company_count": summary.get("ghg_accepted_series_company_count"),
        "accepted_standard_count": summary.get("accepted_standard_count"),
        "accepted_standard_company_count": summary.get("accepted_standard_company_count"),
        "accepted_standard_link_count": summary.get("accepted_standard_link_count"),
        "standard_review_edges_excluded_from_drawn_graph": summary.get("standard_review_edges_excluded_from_drawn_graph"),
        "complete_emissions_ranking_company_count": summary.get("complete_emissions_ranking_company_count"),
        "technology_project_evidence_count": summary.get("technology_project_evidence_count"),
        "technology_project_cost_evidence_count": summary.get("technology_project_cost_evidence_count"),
        "source_mix_explicit_reported_primary_ratio_company_count": summary.get("source_mix_explicit_reported_primary_ratio_company_count"),
        "accepted_standard_role_graph_counts": {
            "standards": len(accepted.get("standards", [])),
            "companies": len(accepted.get("companies", [])),
            "links": len(accepted.get("links", [])),
        },
    }


def static_figures_snapshot() -> dict:
    data = read_json(STATIC_FIGURES_MANIFEST)
    figures = data.get("figures", [])
    return {
        "layer_id": "reporting_static_figures",
        "kind": "figure_snapshot",
        "source_script": data.get("generator", "tools/sync_reporting_static_figures.py"),
        "manifest_file": file_meta(STATIC_FIGURES_MANIFEST),
        "generated_at": data.get("generated_at"),
        "source": data.get("source"),
        "source_sha256": data.get("source_sha256"),
        "source_hash_matches": (ROOT / data.get("source", "")).exists() and sha256(ROOT / data.get("source", "")) == data.get("source_sha256"),
        "figure_count": len(figures),
        "figure_files": [
            {
                **file_meta(ROOT / item.get("file", "")),
                "lang": item.get("lang"),
                "figure_no": item.get("figure_no"),
                "manifest_sha256": item.get("sha256"),
                "hash_matches": (ROOT / item.get("file", "")).exists() and sha256(ROOT / item.get("file", "")) == item.get("sha256"),
            }
            for item in figures
        ],
    }


def readiness_snapshot() -> dict:
    data = read_json(READINESS_SUMMARY)
    return {
        "layer_id": "full_accounting_readiness",
        "kind": "readiness_snapshot",
        "source_script": "tools/build_full_accounting_readiness.py or current workbench generator",
        "data_file": file_meta(READINESS_SUMMARY),
        "company_count": data.get("company_count"),
        "full_accounting_ready_company_count": data.get("full_accounting_ready_company_count"),
        "candidate_or_partial_company_count": data.get("candidate_or_partial_company_count"),
        "evidence_graph_only_company_count": data.get("evidence_graph_only_company_count"),
        "source_gap_company_count": data.get("source_gap_company_count"),
        "status_counts": data.get("status_counts", {}),
    }


def edge_evidence_audit() -> dict:
    rows = []
    with STRICT_EDGES.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    by_relation = Counter(row.get("relation", "") for row in rows)
    missing_by_relation = Counter(row.get("relation", "") for row in rows if not str(row.get("evidence_page", "")).strip())
    fact_rows = [row for row in rows if row.get("relation") in FACT_EDGE_RELATIONS_REQUIRING_PAGE]
    scaffold_rows = [row for row in rows if row.get("relation") in ONTOLOGY_OR_SCAFFOLD_RELATIONS]
    other_rows = [row for row in rows if row.get("relation") not in FACT_EDGE_RELATIONS_REQUIRING_PAGE | ONTOLOGY_OR_SCAFFOLD_RELATIONS]
    fact_missing = [row for row in fact_rows if not str(row.get("evidence_page", "")).strip()]
    scaffold_missing = [row for row in scaffold_rows if not str(row.get("evidence_page", "")).strip()]
    relation_rows = []
    for relation, total in sorted(by_relation.items()):
        missing = missing_by_relation.get(relation, 0)
        if relation in FACT_EDGE_RELATIONS_REQUIRING_PAGE:
            bucket = "accepted_fact_edge_requires_page"
        elif relation in ONTOLOGY_OR_SCAFFOLD_RELATIONS:
            bucket = "ontology_or_scaffold_edge_page_optional"
        else:
            bucket = "uncategorized_edge_review_required"
        relation_rows.append({
            "relation": relation,
            "bucket": bucket,
            "edge_count": total,
            "missing_evidence_page_count": missing,
            "missing_evidence_page_ratio": round(missing / total, 6) if total else 0,
        })
    payload = {
        "schema_version": "world500-edge-evidence-coverage-audit-v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source_file": rel(STRICT_EDGES),
        "source_sha256": sha256(STRICT_EDGES),
        "policy": {
            "accepted_fact_edges": "Fact edges in the accepted strict layer that document a report fact must carry evidence_page.",
            "ontology_or_scaffold_edges": "Ontology, linking, and scaffold edges are excluded from the page-evidence denominator; they inherit traceability through adjacent fact nodes or source-trace edges.",
        },
        "summary": {
            "total_edge_count": len(rows),
            "total_missing_evidence_page_count": sum(1 for row in rows if not str(row.get("evidence_page", "")).strip()),
            "accepted_fact_edge_count": len(fact_rows),
            "accepted_fact_missing_evidence_page_count": len(fact_missing),
            "accepted_fact_evidence_page_coverage_ratio": round((len(fact_rows) - len(fact_missing)) / len(fact_rows), 6) if fact_rows else 1,
            "ontology_or_scaffold_edge_count": len(scaffold_rows),
            "ontology_or_scaffold_missing_evidence_page_count": len(scaffold_missing),
            "uncategorized_edge_count": len(other_rows),
            "uncategorized_missing_evidence_page_count": sum(1 for row in other_rows if not str(row.get("evidence_page", "")).strip()),
            "accepted_fact_missing_page_gate_passed": len(fact_missing) == 0,
        },
        "relation_rows": relation_rows,
    }
    return payload


def build_manifest(edge_payload: dict) -> dict:
    strict = normalize_graph_summary(
        STRICT_SUMMARY,
        "strict_traceable_graph",
        STRICT_GRAPHML,
        "tools/build_world500_strict_traceable_graph.py or current graph export pipeline",
    )
    published = normalize_graph_summary(
        PUBLISHED_SUMMARY,
        "published_graph",
        PUBLISHED_GRAPHML,
        "tools/build_world500_published_graph.py or current graph export pipeline",
    )
    reporting = reporting_view_snapshot()
    figures = static_figures_snapshot()
    readiness = readiness_snapshot()
    manifest = {
        "schema_version": "world500-snapshot-manifest-v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "policy": {
            "canonical_public_graph_layer": "published_graph",
            "canonical_traceability_layer": "strict_traceable_graph",
            "canonical_reporting_layer": "reporting_views",
            "count_rule": "Public node/edge/company counts must cite a layer_id from this manifest. Counts from different layers must not be described as the same snapshot.",
            "evidence_page_rule": "Accepted fact edges require evidence_page. Ontology/scaffold edges are reported separately and are not used as the evidence-page denominator.",
        },
        "snapshots": [strict, published, reporting, figures, readiness],
        "edge_evidence_coverage": {
            "audit_file": rel(EDGE_AUDIT_JSON),
            "audit_csv": rel(EDGE_AUDIT_CSV),
            "source_sha256": edge_payload.get("source_sha256"),
            "summary": edge_payload.get("summary", {}),
        },
    }
    return manifest


def snapshot_consistency_audit(manifest: dict) -> dict:
    snapshots = {item["layer_id"]: item for item in manifest["snapshots"]}
    issues = []
    for layer_id in ["strict_traceable_graph", "published_graph"]:
        item = snapshots[layer_id]
        if not item.get("graphml_matches_summary"):
            issues.append({
                "severity": "error",
                "layer_id": layer_id,
                "issue": "graphml_summary_count_mismatch",
                "details": f"summary={item.get('node_count')}/{item.get('edge_count')} graphml={item.get('graphml_node_count')}/{item.get('graphml_edge_count')}",
            })
    figures = snapshots["reporting_static_figures"]
    if not figures.get("source_hash_matches"):
        issues.append({"severity": "error", "layer_id": "reporting_static_figures", "issue": "source_hash_mismatch", "details": figures.get("source", "")})
    bad_figures = [item for item in figures.get("figure_files", []) if not item.get("hash_matches")]
    for figure in bad_figures:
        issues.append({"severity": "error", "layer_id": "reporting_static_figures", "issue": "figure_hash_mismatch", "details": figure.get("path", "")})
    strict = snapshots["strict_traceable_graph"]
    published = snapshots["published_graph"]
    if strict.get("node_count") == published.get("node_count") and strict.get("edge_count") == published.get("edge_count"):
        issues.append({
            "severity": "warning",
            "layer_id": "strict_traceable_graph/published_graph",
            "issue": "unexpected_same_counts",
            "details": "Strict and published layers are expected to be distinct layers with independently cited counts.",
        })
    return {
        "schema_version": "world500-snapshot-consistency-audit-v1",
        "generated_at": manifest["generated_at"],
        "manifest_file": rel(SNAPSHOT_MANIFEST),
        "manifest_sha256": sha256(SNAPSHOT_MANIFEST) if SNAPSHOT_MANIFEST.exists() else "pending",
        "status": "passed" if not any(item["severity"] == "error" for item in issues) else "failed",
        "issues": issues,
        "public_count_layers": [
            {
                "layer_id": item["layer_id"],
                "kind": item["kind"],
                "node_count": item.get("node_count"),
                "edge_count": item.get("edge_count"),
                "company_count": item.get("company_count"),
                "source_script": item.get("source_script"),
            }
            for item in manifest["snapshots"]
        ],
    }


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_edge_csv(payload: dict) -> None:
    with EDGE_AUDIT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        fieldnames = ["relation", "bucket", "edge_count", "missing_evidence_page_count", "missing_evidence_page_ratio"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(payload["relation_rows"])


def write_snapshot_csv(payload: dict) -> None:
    with SNAPSHOT_AUDIT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        fieldnames = ["layer_id", "kind", "node_count", "edge_count", "company_count", "source_script"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in payload["public_count_layers"]:
            writer.writerow(row)


def main() -> None:
    edge_payload = edge_evidence_audit()
    write_json(EDGE_AUDIT_JSON, edge_payload)
    write_edge_csv(edge_payload)
    manifest = build_manifest(edge_payload)
    write_json(SNAPSHOT_MANIFEST, manifest)
    audit = snapshot_consistency_audit(manifest)
    audit["manifest_sha256"] = sha256(SNAPSHOT_MANIFEST)
    write_json(SNAPSHOT_AUDIT_JSON, audit)
    write_snapshot_csv(audit)
    if audit["status"] != "passed":
        raise SystemExit(f"Snapshot consistency audit failed: {audit['issues']}")
    if not edge_payload["summary"].get("accepted_fact_missing_page_gate_passed"):
        raise SystemExit("Accepted fact-edge evidence-page gate failed.")
    print(f"Wrote {rel(SNAPSHOT_MANIFEST)}")
    print(f"Wrote {rel(SNAPSHOT_AUDIT_JSON)}")
    print(f"Wrote {rel(EDGE_AUDIT_JSON)}")


if __name__ == "__main__":
    main()
