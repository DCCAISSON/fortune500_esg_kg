import csv
import json
from pathlib import Path

from reporting_queue_utils import effective_queue_count


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_VIEWS_FILE = WORKBENCH / "reporting_views.json"
GAP_SUMMARY_FILE = WORKBENCH / "reporting_gap_status_summary.json"
COMPLETION_AUDIT_FILE = WORKBENCH / "reporting_completion_audit.json"
AUTHORITATIVE_EXPORTS_SUMMARY_FILE = WORKBENCH / "world500_authoritative_reporting_exports_summary.json"
EMISSIONS_GAP_CANDIDATE_SUMMARY_FILE = WORKBENCH / "world500_emissions_gap_candidate_records_from_expanded_evidence_summary.json"
EMISSIONS_P0_REVIEW_PACKET_SUMMARY_FILE = WORKBENCH / "world500_emissions_p0_gap_review_packet_summary.json"
OUTPUT_CSV = WORKBENCH / "world500_reporting_unresolved_issue_register.csv"
OUTPUT_JSON = WORKBENCH / "world500_reporting_unresolved_issue_register.json"


QUEUE_HINTS = {
    "ghg_protocol_fine_series": [
        "world500_ghg_contextual_series_review_queue.csv",
        "world500_ghg_explicit_series_candidate_queue.csv",
        "world500_ghg_p0_overmapped_contextual_edge_queue.csv",
        "world500_ghg_p1_named_series_missing_queue.csv",
        "world500_ghg_p2_low_evidence_contextual_edge_queue.csv",
        "world500_ghg_out_of_whitelist_series_review_queue.csv",
    ],
    "emissions_ranking": [
        "world500_emissions_complete_ranking_verification_queue.csv",
        "world500_emissions_scope1_backfill_queue.csv",
        "world500_emissions_scope2_method_backfill_queue.csv",
        "world500_emissions_scope2_value_backfill_queue.csv",
        "world500_emissions_scope3_backfill_queue.csv",
        "world500_emissions_finance_scope3_boundary_review_queue.csv",
        "world500_emissions_selected_evidence_element_review_queue.csv",
        "world500_emissions_unit_scale_review_queue.csv",
    ],
    "scope_language_policy": [
        "world500_non_ghg_scope_wording_review_queue.csv",
    ],
    "technology_path_axis": [
        "world500_technology_company_evidence_backfill_queue.csv",
        "world500_technology_timeline_validation_queue.csv",
        "world500_technology_cost_validation_queue.csv",
    ],
    "primary_secondary_bubble": [
        "world500_primary_secondary_source_origin_backfill_queue.csv",
        "world500_primary_secondary_unknown_share_review_queue.csv",
        "world500_primary_secondary_calculation_weight_validation_queue.csv",
    ],
}

CLOSURE_BATCH_HINTS = {
    "ghg_protocol_fine_series": [
        "world500_p0_ghg_series_evidence_closure_batch.csv",
        "world500_p0_ghg_series_evidence_closure_batch.json",
    ],
    "emissions_ranking": [
        "world500_p0_emissions_ranking_evidence_closure_batch.csv",
        "world500_p0_emissions_ranking_evidence_closure_batch.json",
    ],
}


PRIORITY = {
    "ghg_protocol_fine_series": "P0",
    "emissions_ranking": "P0",
    "technology_path_axis": "P1",
    "primary_secondary_bubble": "P1",
    "scope_language_policy": "P2",
    "standard_company_relationships": "P2",
    "standard_full_graph_runtime": "Monitor",
    "static_png_sync": "Monitor",
}

EN_TEXT = {
    "ghg_protocol_fine_series": {
        "status": "Partially complete",
        "implemented": "GHG Protocol has been split into fine-series standard, guidance, project-protocol, and program nodes and is shown in Figure 2, the GHG full-screen graph, and the standard role-family graph; current counts are injected from reporting_views.json and the authoritative exports.",
        "remaining": "Explicit evidence remains insufficient: many GHG-related companies still lack concrete series citations, and review-only company-series edges remain open. Contextual mappings must not be treated as strong evidence.",
        "next_action": "Return each edge to page-level PDF evidence; upgrade only edges that explicitly name a concrete GHG series, and demote or remove edges that do not.",
        "blocking_risk": "If weak contextual edges are not demoted, the GHG fine-series graph will be misread as strong-evidence company-series relationships.",
    },
    "standard_company_relationships": {
        "status": "Structure complete, evidence quality still needs improvement",
        "implemented": "The standard role graph contains the current reporting_views.json standard nodes, companies, and standard-company relationships; the full-screen graph colors standards and industries distinctly.",
        "remaining": "The relationship structure exists, but each edge still needs stronger page-level traceability, snippet completeness, and evidence-strength review.",
        "next_action": "Sample and review standard-company edge page numbers and snippet completeness, prioritizing low-confidence or weak-snippet edges.",
        "blocking_risk": "The structure is complete, but uneven edge evidence and weak snippets reduce knowledge-graph credibility.",
    },
    "emissions_ranking": {
        "status": "Partially complete",
        "implemented": "A strong-evidence total-emissions ranking and static PNG have been generated; current counts are injected from reporting_views.json.",
        "remaining": "Complete Scope 1 + selected Scope 2 + Scope 3 comparable-ranking coverage remains partial; current counts are injected from reporting_views.json.",
        "next_action": "Backfill complete strong-evidence totals from the Scope 1, Scope 2 value/method, Scope 3, and finance Scope 3 boundary queues.",
        "blocking_risk": "Mixing partial totals or unclear finance financed-emissions boundaries into the main ranking would make company total-emissions comparisons invalid.",
    },
    "standard_full_graph_runtime": {
        "status": "Implemented",
        "implemented": "All 50 full-graph HTML pages now use embedded JSON. The 4 GHG/Standard role-family pages embed same-source reporting_views graph subsets, while 46 legacy generic pages use strict versioned JSON plus shared generic_full_graph.js. Static fallback and old inline runtime have been removed.",
        "remaining": "Two legacy principle role-family pages have no drawable nodes and now enter a visible empty-data state. This is a data gap, not a runtime fallback.",
        "next_action": "After any reporting_views or full-graph generator update, rerun the full HTML and PNG hash consistency checks.",
        "blocking_risk": "This is now a presentation-layer risk only; future data updates can drift again if sync generation is skipped.",
    },
    "scope_language_policy": {
        "status": "Policy implemented, source quotations still need review",
        "implemented": "Pages and graphs now state that Scope 1/2/3 terminology applies only under GHG Protocol context; non-GHG standards default to direct/indirect emissions wording. Non-GHG standard name/role/principle Scope-term misuse is currently zero.",
        "remaining": "Seventy-four source quotations still contain Scope wording and need review to confirm that they are quoted source context only, not non-GHG standard terminology.",
        "next_action": "Confirm that Scope wording in non-GHG source quotes remains source evidence display and is not promoted into ISO/GB/PCAF wording.",
        "blocking_risk": "Promoting Scope terminology into non-GHG standards would create a conceptual error in the standards taxonomy.",
    },
    "technology_path_axis": {
        "status": "Presentation complete, evidence validation incomplete",
        "implemented": "Figure 6 now shows 9 technology paths with flow, standards alignment, subtypes, timeline signals, cost signals, and bilingual static PNGs.",
        "remaining": "All 1,952 technology-company relationships remain disclosure keyword signals, not verified project cost or abatement evidence. Company-level evidence, timeline validation, and cost/investment validation queues remain open.",
        "next_action": "Upgrade keyword hits to company-level project evidence, then validate timeline milestones and cost/investment evidence boundaries.",
        "blocking_risk": "Treating keyword signals as project-level technology adoption or cost evidence would overstate decarbonization-path conclusions.",
    },
    "primary_secondary_bubble": {
        "status": "Presentation complete, calculation-weight evidence incomplete",
        "implemented": "The primary/secondary bubble chart exists; 306 companies enter the source-mix data and 161 companies have displayable primary/secondary ratios.",
        "remaining": "Only 13 companies use explicitly reported primary-data percentages. Most remaining ratios are method_rows source-mix inference and are not audited calculation weights.",
        "next_action": "Separate source-mix inference from true calculation weights and prioritize explicitly reported primary-data percentages.",
        "blocking_risk": "Treating source-mix ratios as true calculation weights would mislead the primary-data quality assessment.",
    },
    "static_png_sync": {
        "status": "Implemented",
        "implemented": "The emissions ranking, Figure 2, Figure 6, and primary/secondary bubble chart all have bilingual static PNGs. The manifest records the reporting_views source hash and each PNG hash.",
        "remaining": "Whenever reporting_views.json changes, sync_reporting_static_figures.py must be rerun.",
        "next_action": "Rerun sync_reporting_static_figures.py after each reporting_views.json update.",
        "blocking_risk": "If pages and briefing PNGs are not regenerated from the same source, GitHub pages and presentation materials can diverge.",
    },
}

EN_PRIORITY_ORDER = [
    "P0: Return GHG contextual/review edges to page-level PDF evidence; upgrade only explicitly named fine-series citations, and demote or remove weak contextual edges.",
    "P0: Close emissions-ranking gaps for Scope 1, Scope 2 method/value, and Scope 3 so partial totals are not treated as complete comparable rankings.",
    "P1: Upgrade technology paths from keyword signals to company-level project evidence, timeline milestones, and cost/investment evidence.",
    "P1: Upgrade primary/secondary data ratios from source-mix inference to true calculation-weight evidence or explicitly reported primary-data percentages.",
    "P2: Continue reviewing Scope wording in non-GHG standard source quotations so it remains source context and is not promoted into non-GHG standard terminology.",
]


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_csv_rows(path):
    if not path.exists():
        return []
    import csv

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def reporting_summary():
    if not REPORTING_VIEWS_FILE.exists():
        return {}
    return load_json(REPORTING_VIEWS_FILE).get("summary", {})


def dynamic_text(issue_id, field, default, summary):
    if issue_id == "ghg_protocol_fine_series":
        ghg_companies = summary.get("ghg_protocol_company_count", 0)
        explicit_companies = summary.get("ghg_explicit_series_company_count", 0)
        accepted_edges = len(load_csv_rows(WORKBENCH / "world500_ghg_accepted_series_mapping.csv"))
        review_edges = count_rows(WORKBENCH / "world500_ghg_contextual_series_review_queue.csv")
        out_of_whitelist_edges = count_rows(WORKBENCH / "world500_ghg_out_of_whitelist_series_review_queue.csv")
        p1_named_missing = count_rows(WORKBENCH / "world500_ghg_p1_named_series_missing_queue.csv")
        p2_low_evidence = count_rows(WORKBENCH / "world500_ghg_p2_low_evidence_contextual_edge_queue.csv")
        if field == "remaining_zh":
            return (
                f"显式证据仍不足：{ghg_companies} 家 GHG 相关企业中只有 {explicit_companies} 家显式命中具体系列；"
                f"当前只有 {accepted_edges} 条 accepted 细分边，{review_edges} 条 12 类白名单内企业-系列边仍为 effective review；"
                f"另有 {out_of_whitelist_edges} 条白名单外 GHG 衍生/泛化引用已隔离复核。"
                f"其中 P1 样本缺少命名系列 {p1_named_missing} 条、P2 低证据上下文 {p2_low_evidence} 条。"
                "不能把上下文映射当成强证据。"
            )
        if field == "remaining_en":
            return (
                f"Explicit evidence remains insufficient: {explicit_companies}/{ghg_companies} GHG-related companies "
                f"explicitly cite concrete series; only {accepted_edges} fine-series edges are accepted, and "
                f"{review_edges} core-whitelist company-series edges remain effective review rows, and "
                f"{out_of_whitelist_edges} out-of-whitelist GHG-derived/generic references are isolated for separate review. The open queue includes "
                f"{p1_named_missing} P1 named-series-missing rows and {p2_low_evidence} P2 low-evidence contextual rows. "
                "Contextual mappings must not be treated as strong evidence."
            )
        return default
    if issue_id == "technology_path_axis":
        reporting = load_json(REPORTING_VIEWS_FILE)
        technology = reporting.get("technology_paths", {})
        project_summary = technology.get("project_evidence_summary", {})
        project_count = project_summary.get("project_evidence_count", 0)
        project_company_count = project_summary.get("project_company_count", 0)
        project_cost_count = project_summary.get("project_cost_evidence_count", 0)
        project_abatement_count = project_summary.get("project_abatement_evidence_count", 0)
        invalid_project_count = len(load_csv_rows(WORKBENCH / "world500_technology_project_evidence_invalid_queue.csv"))
        legacy_signal_count = len(load_csv_rows(WORKBENCH / "world500_technology_path_audit.csv"))
        project_upgrade = load_json(WORKBENCH / "world500_technology_project_upgrade_queue.json") if (WORKBENCH / "world500_technology_project_upgrade_queue.json").exists() else {}
        project_upgrade_count = project_upgrade.get("row_count", 0)
        project_upgrade_priorities = project_upgrade.get("queue_priority_counts", {})
        if field == "implemented_zh":
            return (
                f"图6 已有 9 类技术路径、流程图、标准对齐、细分技术方向、时间信号和成本信号，并生成中英文静态 PNG。"
                f"另有独立页级项目证据层：{project_count} 条有效项目/措施证据，覆盖 {project_company_count} 家企业，"
                f"其中 {project_cost_count} 条含成本/投资证据，{project_abatement_count} 条含减排效果证据。"
            )
        if field == "implemented_en":
            return (
                f"Figure 6 now shows 9 technology paths with flow, standards alignment, subtypes, timeline signals, cost signals, and bilingual static PNGs. "
                f"A separate page-level project-evidence layer contains {project_count} valid project/measure records across {project_company_count} companies, "
                f"including {project_cost_count} cost/investment records and {project_abatement_count} abatement-effect records. "
                f"A project-upgrade queue now covers {project_upgrade_count} disclosure-signal edges with priority counts {project_upgrade_priorities}."
            )
        if field == "remaining_zh":
            return (
                f"独立项目证据层可作为页级项目/措施强证据使用，invalid 项目证据队列为 {invalid_project_count} 条。"
                f"但旧的 {legacy_signal_count} 条技术-企业关系仍是 disclosure keyword signal，不是已核证项目成本、实施进度或减排量；"
                "公司级证据、时间趋势和成本/投资复核队列仍需继续处理。"
            )
        if field == "remaining_en":
            return (
                f"The separate project-evidence layer can be used as page-level project/measure evidence, with {invalid_project_count} invalid project-evidence rows. "
                f"However, the legacy {legacy_signal_count} technology-company rows remain disclosure keyword signals, not verified project cost, implementation progress, or abatement values. "
                "The project-upgrade queue marks missing project/measure name, page/source binding, implementation stage, timeline, cost/investment, and abatement-effect fields; no row allows automatic promotion."
            )
        return default
    if issue_id != "emissions_ranking":
        return default
    available = summary.get("available_emissions_ranking_company_count", 0)
    complete = summary.get("complete_emissions_ranking_company_count", 0)
    partial = max(0, available - complete)
    if field == "implemented_zh":
        return f"已生成企业总排放强证据排行和静态 PNG；当前有 {available} 家企业可计算可用总量。"
    if field == "implemented_en":
        return f"A strong-evidence total-emissions ranking and static PNG have been generated; {available} companies currently have available total-emissions values."
    if field == "remaining_zh":
        return f"只有 {complete} 家满足完整 Scope 1 + 选定 Scope 2 + Scope 3 强证据可比排行；{partial} 家 partial 总量不能混成完整排行。Scope 1、Scope 2 方法/数值和 Scope 3 缺口仍需继续回到页级证据闭环。"
    if field == "remaining_en":
        return f"Only {complete} companies meet the complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence comparable-ranking gate. The {partial} partial totals must not be mixed into the complete ranking, and Scope 1, Scope 2 value/method, and Scope 3 gaps remain open."
    return default


def enrich_gap_summary(gap_summary):
    summary = reporting_summary()
    for item in gap_summary.get("items", []):
        issue_id = item.get("id", "")
        english = EN_TEXT.get(issue_id, {})
        if english:
            item["status_en"] = english.get("status", "")
            item["implemented_en"] = dynamic_text(issue_id, "implemented_en", english.get("implemented", ""), summary)
            item["remaining_en"] = dynamic_text(issue_id, "remaining_en", english.get("remaining", ""), summary)
        item["implemented_zh"] = dynamic_text(issue_id, "implemented_zh", item.get("implemented_zh", ""), summary)
        item["remaining_zh"] = dynamic_text(issue_id, "remaining_zh", item.get("remaining_zh", ""), summary)
    gap_summary.setdefault("next_priority_order_en", EN_PRIORITY_ORDER)
    gap_summary["p0_closure_batches"] = closure_batch_summary()
    gap_summary["emissions_gap_candidate_diagnostics"] = emissions_gap_candidate_summary()
    gap_summary["emissions_p0_gap_review_packet"] = emissions_p0_review_packet_summary()
    gap_summary["authoritative_exports"] = authoritative_exports_summary()
    return gap_summary


def count_rows(path):
    if not path.exists():
        return 0
    return effective_queue_count(ROOT, str(path.relative_to(ROOT)).replace("\\", "/"))


def output_path(name):
    return WORKBENCH / name


def queue_rows(issue_id):
    rows = []
    for filename in QUEUE_HINTS.get(issue_id, []):
        path = output_path(filename)
        actual = count_rows(path)
        rows.append({
            "file": f"assets/data/world500/workbench/{filename}",
            "row_count": actual,
            "exists": path.exists(),
        })
    return rows


def closure_batch_rows(issue_id):
    rows = []
    for filename in CLOSURE_BATCH_HINTS.get(issue_id, []):
        path = output_path(filename)
        row_count = count_rows(path) if path.suffix.lower() == ".csv" else ""
        rows.append({
            "file": f"assets/data/world500/workbench/{filename}",
            "row_count": row_count,
            "exists": path.exists(),
        })
    return rows


def closure_batch_summary():
    summaries = []
    labels = {
        "ghg_protocol_fine_series": {
            "title_zh": "GHG Protocol 细分系列 P0 页级证据闭环批次",
            "title_en": "GHG Protocol fine-series P0 page-level evidence closure batch",
            "purpose_zh": "把 contextual / overmapped GHG 系列边按公司、报告和页码分组；只作为复核入口，不自动提升采信关系。",
            "purpose_en": "Groups contextual and overmapped GHG series edges by company, report, and page; review entry only, not an automatic promotion.",
        },
        "emissions_ranking": {
            "title_zh": "企业总排放排行 P0 Scope 缺口闭环批次",
            "title_en": "Company total-emissions ranking P0 Scope-gap closure batch",
            "purpose_zh": "把 Scope 1 / Scope 2 / Scope 3 缺口按公司和页级证据分组；确认前不得并入完整可比排行。",
            "purpose_en": "Groups Scope 1 / Scope 2 / Scope 3 gaps by company and page-level evidence; keep out of the complete comparable ranking until confirmed.",
        },
    }
    for issue_id in ("ghg_protocol_fine_series", "emissions_ranking"):
        files = closure_batch_rows(issue_id)
        csv_rows = [item for item in files if item["file"].endswith(".csv")]
        metadata = labels[issue_id]
        summaries.append({
            "issue_id": issue_id,
            "title_zh": metadata["title_zh"],
            "title_en": metadata["title_en"],
            "purpose_zh": metadata["purpose_zh"],
            "purpose_en": metadata["purpose_en"],
            "batch_row_count": sum(int(item["row_count"] or 0) for item in csv_rows),
            "files": files,
        })
    return summaries


def emissions_gap_candidate_summary():
    if not EMISSIONS_GAP_CANDIDATE_SUMMARY_FILE.exists():
        return {}
    payload = load_json(EMISSIONS_GAP_CANDIDATE_SUMMARY_FILE)
    return {
        "title_zh": "排放排行缺口 expanded_evidence 候选诊断",
        "title_en": "Emissions-ranking gap candidate diagnostics from expanded_evidence",
        "purpose_zh": "列出已在 expanded_evidence 中出现、但尚未通过强证据门禁的缺口 Scope 行；只作为复核入口，不自动提升采信。",
        "purpose_en": "Lists missing-scope rows already present in expanded_evidence but not yet passing the strong-evidence gate; review entry only, no automatic promotion.",
        "candidate_record_count": payload.get("candidate_record_count", 0),
        "companies_with_candidate_records": payload.get("companies_with_candidate_records", 0),
        "missing_scope_groups_with_candidates": payload.get("missing_scope_groups_with_candidates", {}),
        "repair_priority_counts": payload.get("repair_priority_counts", {}),
        "csv": payload.get("output_csv", ""),
        "json": payload.get("output_json", ""),
        "summary": str(EMISSIONS_GAP_CANDIDATE_SUMMARY_FILE.relative_to(ROOT)).replace("\\", "/"),
    }


def emissions_p0_review_packet_summary():
    if not EMISSIONS_P0_REVIEW_PACKET_SUMMARY_FILE.exists():
        return {}
    payload = load_json(EMISSIONS_P0_REVIEW_PACKET_SUMMARY_FILE)
    return {
        "title_zh": "排放排行 P0 缺口人工复核包",
        "title_en": "Emissions-ranking P0 gap manual review packet",
        "purpose_zh": "把 P0 候选拆成抽取假阴性、强候选冲突和仍需页级复核三类；所有行均禁止自动提升。",
        "purpose_en": "Splits P0 candidates into extraction false-negative checks, conflicting strong candidates, and page-level rechecks, and generates a near-complete partial-company queue. All rows explicitly forbid automatic promotion.",
        "row_count": payload.get("row_count", 0),
        "near_complete_upgrade_queue_rows": payload.get("near_complete_upgrade_queue_rows", 0),
        "near_complete_review_priority_counts": payload.get("near_complete_review_priority_counts", {}),
        "review_bucket_counts": payload.get("review_bucket_counts", {}),
        "signal_counts": payload.get("signal_counts", {}),
        "auto_promote_allowed": False,
        "csv": payload.get("output_csv", ""),
        "json": payload.get("output_json", ""),
        "near_complete_csv": payload.get("near_complete_upgrade_queue", ""),
        "summary": str(EMISSIONS_P0_REVIEW_PACKET_SUMMARY_FILE.relative_to(ROOT)).replace("\\", "/"),
    }


def authoritative_exports_summary():
    if not AUTHORITATIVE_EXPORTS_SUMMARY_FILE.exists():
        return []
    payload = load_json(AUTHORITATIVE_EXPORTS_SUMMARY_FILE)
    labels = {
        "ghg_accepted_series_mapping": {
            "title_zh": "GHG 已采信细分标准-企业关系",
            "title_en": "Accepted GHG fine-series standard-company mapping",
            "purpose_zh": "仅包含原文明确命名具体 GHG Protocol 细分系列的关系，可作为当前标准-企业结论表。",
            "purpose_en": "Contains only source-explicit GHG Protocol fine-series relationships and can be used as the current standard-company conclusion table.",
        },
        "ghg_review_series_mapping": {
            "title_zh": "GHG 待复核细分标准-企业关系",
            "title_en": "Review-only GHG fine-series standard-company mapping",
            "purpose_zh": "包含上下文、泛化和疑似过度映射关系，不得作为已采信结论。",
            "purpose_en": "Contains contextual, generic, and possible overmapped relationships; not accepted conclusions.",
        },
        "emissions_complete_comparable_ranking": {
            "title_zh": "完整可比企业总排放排行",
            "title_en": "Complete comparable company total-emissions ranking",
            "purpose_zh": "仅包含 Scope 1 + 选定 Scope 2 + Scope 3 均通过强证据门禁的企业。",
            "purpose_en": "Contains only companies with complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence totals.",
        },
        "emissions_partial_ranking_review": {
            "title_zh": "部分总排放排行复核表",
            "title_en": "Partial total-emissions ranking review table",
            "purpose_zh": "包含缺 Scope 或口径未闭环的部分总量，不得混入完整可比排行。",
            "purpose_en": "Contains partial totals with missing scope or open method issues; excluded from the complete comparable ranking.",
        },
        "technology_path_disclosure_signal_review": {
            "title_zh": "技术路径披露信号复核表",
            "title_en": "Technology-path disclosure signal review table",
            "purpose_zh": "包含公司-技术族关键词/披露信号；未经公司级验证前，不得作为技术采用、减排量、时间线或成本结论。",
            "purpose_en": "Contains company-technology disclosure signals; not verified technology adoption, abatement, timeline, or cost conclusions before company-level validation.",
        },
        "primary_secondary_explicit_primary_ratio": {
            "title_zh": "初级数据明示百分比表",
            "title_en": "Explicit primary-data percentage table",
            "purpose_zh": "包含原文明示 primary data 百分比的企业；用于审计级计算权重前仍需验证。",
            "purpose_en": "Contains companies with explicitly reported primary-data percentages; calculation-weight validation is still required before audit-grade use.",
        },
        "primary_secondary_source_mix_inference_review": {
            "title_zh": "初级/次级来源结构推断复核表",
            "title_en": "Primary/secondary source-mix inference review table",
            "purpose_zh": "包含方法行来源结构推断或非明示比例；不得作为已审定 primary data 计算权重。",
            "purpose_en": "Contains method-row source-mix inference or non-explicit ratios; not audited primary-data calculation weights.",
        },
    }
    rows = []
    for export_id, item in (payload.get("exports") or {}).items():
        metadata = labels.get(export_id, {})
        rows.append({
            "export_id": export_id,
            "title_zh": metadata.get("title_zh", export_id),
            "title_en": metadata.get("title_en", export_id),
            "purpose_zh": metadata.get("purpose_zh", ""),
            "purpose_en": metadata.get("purpose_en", ""),
            "row_count": item.get("row_count", 0),
            "csv": item.get("csv", ""),
            "json": item.get("json", ""),
        })
    return rows


def status_bucket(status_key):
    if status_key == "partial":
        return "unresolved"
    if status_key and status_key.startswith("implemented") and "risk" in status_key:
        return "implemented_with_risk"
    if status_key and status_key.startswith("implemented"):
        return "implemented"
    return "review"


def build_register():
    gap_summary = enrich_gap_summary(load_json(GAP_SUMMARY_FILE))
    completion = load_json(COMPLETION_AUDIT_FILE) if COMPLETION_AUDIT_FILE.exists() else {"checks": []}
    check_by_id = {item.get("id"): item for item in completion.get("checks", [])}
    rows = []
    for index, item in enumerate(gap_summary.get("items", []), start=1):
        issue_id = item.get("id", "")
        status_key = item.get("status_key", "")
        queues = queue_rows(issue_id)
        closure_batches = closure_batch_rows(issue_id)
        open_queue_rows = sum(row["row_count"] for row in queues)
        check = check_by_id.get(issue_id, {})
        rows.append({
            "issue_no": index,
            "issue_id": issue_id,
            "priority": PRIORITY.get(issue_id, "P2"),
            "status_key": status_key,
            "status_bucket": status_bucket(status_key),
            "status_zh": item.get("status_zh", ""),
            "status_en": item.get("status_en") or EN_TEXT.get(issue_id, {}).get("status", ""),
            "implemented_zh": item.get("implemented_zh", ""),
            "implemented_en": item.get("implemented_en") or EN_TEXT.get(issue_id, {}).get("implemented", ""),
            "remaining_zh": item.get("remaining_zh", ""),
            "remaining_en": item.get("remaining_en") or EN_TEXT.get(issue_id, {}).get("remaining", ""),
            "current_evidence_zh": check.get("evidence_zh", ""),
            "current_evidence_en": check.get("evidence_en", ""),
            "open_queue_rows": open_queue_rows,
            "queue_files": "; ".join(row["file"] for row in queues),
            "queue_row_counts": "; ".join(f"{Path(row['file']).name}:{row['row_count']}" for row in queues),
            "closure_batch_files": "; ".join(row["file"] for row in closure_batches),
            "closure_batch_row_counts": "; ".join(
                f"{Path(row['file']).name}:{row['row_count']}"
                for row in closure_batches
                if row["row_count"] != ""
            ),
            "next_action_zh": next_action(issue_id),
            "next_action_en": next_action_en(issue_id),
            "blocking_risk_zh": blocking_risk(issue_id),
            "blocking_risk_en": blocking_risk_en(issue_id),
        })
    return {
        "schema_version": "world500-reporting-unresolved-issue-register-v1",
        "generated_at": gap_summary.get("generated_at"),
        "overall_status_key": gap_summary.get("overall_status_key"),
        "source_files": [
            "assets/data/world500/workbench/reporting_gap_status_summary.json",
            "assets/data/world500/workbench/reporting_completion_audit.json",
        ],
        "issues": rows,
    }


def next_action(issue_id):
    actions = {
        "ghg_protocol_fine_series": "逐条回到 PDF 页级证据，能显式命名具体 GHG 系列的升级；不能命名的降级或删除。",
        "standard_company_relationships": "抽样复核标准-企业边的页码与 snippet 完整度，优先处理低置信/弱片段。",
        "emissions_ranking": "按 Scope 1、Scope 2 方法/数值、Scope 3 缺口队列补齐完整强证据总量。",
        "standard_full_graph_runtime": "后续每次改 reporting_views 或 full-graph 生成器后跑全量 HTML/PNG hash 校验。",
        "scope_language_policy": "确认非 GHG 标准源文中的 Scope 词只作为引用展示，不进入标准自身术语。",
        "technology_path_axis": "把关键词信号升级到公司级项目证据，补时间节点和成本/投资证据边界。",
        "primary_secondary_bubble": "把来源结构比例与真实计算权重区分开，优先补原文明示 primary data 百分比。",
        "static_png_sync": "后续 reporting_views.json 更新后重跑 sync_reporting_static_figures.py。",
    }
    return actions.get(issue_id, "继续补证据并更新审计队列。")


def next_action_en(issue_id):
    return EN_TEXT.get(issue_id, {}).get("next_action", "Continue strengthening evidence and updating review queues.")


def blocking_risk(issue_id):
    risks = {
        "ghg_protocol_fine_series": "如果不降级上下文弱边，GHG 细分图会被误读为强证据企业-系列关系。",
        "standard_company_relationships": "结构完整但边证据不均衡，弱 snippet 会影响图谱可信度。",
        "emissions_ranking": "partial 总量若混入主排行，会导致企业总排放排序不可比。",
        "standard_full_graph_runtime": "当前是展示层风险；数据更新后未同步生成会重新漂移。",
        "scope_language_policy": "Scope 术语若进入非 GHG 标准口径，会造成标准体系概念错误。",
        "technology_path_axis": "关键词信号若被当成项目级技术应用或成本证据，会夸大减碳路径结论。",
        "primary_secondary_bubble": "来源结构比例若被当成真实计算权重，会误导初级数据质量判断。",
        "static_png_sync": "页面和汇报 PNG 若不同源，会造成 GitHub 页面与汇报材料不一致。",
    }
    return risks.get(issue_id, "")


def blocking_risk_en(issue_id):
    return EN_TEXT.get(issue_id, {}).get("blocking_risk", "")


def main():
    enriched_gap_summary = enrich_gap_summary(load_json(GAP_SUMMARY_FILE))
    GAP_SUMMARY_FILE.write_text(json.dumps(enriched_gap_summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    register = build_register()
    OUTPUT_JSON.write_text(json.dumps(register, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    fields = [
        "issue_no",
        "issue_id",
        "priority",
        "status_key",
        "status_bucket",
        "status_zh",
        "status_en",
        "implemented_zh",
        "implemented_en",
        "remaining_zh",
        "remaining_en",
        "current_evidence_zh",
        "current_evidence_en",
        "open_queue_rows",
        "queue_files",
        "queue_row_counts",
        "closure_batch_files",
        "closure_batch_row_counts",
        "next_action_zh",
        "next_action_en",
        "blocking_risk_zh",
        "blocking_risk_en",
    ]
    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(register["issues"])
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
