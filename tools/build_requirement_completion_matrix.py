import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
FIGURES = ROOT / "assets" / "figures"

REPORTING_VIEWS = WORKBENCH / "reporting_views.json"
GAP_SUMMARY = WORKBENCH / "reporting_gap_status_summary.json"
COMPLETION_AUDIT = WORKBENCH / "reporting_completion_audit.json"
ISSUE_REGISTER = WORKBENCH / "world500_reporting_unresolved_issue_register.json"
FIGURE_MANIFEST = FIGURES / "reporting_static_figures_manifest.json"
AUTHORITATIVE_EXPORTS_SUMMARY = WORKBENCH / "world500_authoritative_reporting_exports_summary.json"
EMISSIONS_GAP_CANDIDATE_SUMMARY = WORKBENCH / "world500_emissions_gap_candidate_records_from_expanded_evidence_summary.json"
EMISSIONS_P0_REVIEW_PACKET_SUMMARY = WORKBENCH / "world500_emissions_p0_gap_review_packet_summary.json"

OUTPUT_JSON = WORKBENCH / "world500_requirement_completion_matrix.json"
OUTPUT_CSV = WORKBENCH / "world500_requirement_completion_matrix.csv"


def load_json(path, default=None):
    if not path.exists():
        return default if default is not None else {}
    return json.loads(path.read_text(encoding="utf-8"))


def csv_row_count(path):
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return sum(1 for _ in csv.DictReader(handle))


def issue_map():
    register = load_json(ISSUE_REGISTER, {"issues": []})
    return {item.get("issue_id"): item for item in register.get("issues", [])}


def file_ref(path):
    return str(path).replace("\\", "/")


def queue_files(issue):
    if not issue:
        return []
    raw = str(issue.get("queue_files") or "").strip()
    return [item.strip() for item in raw.split(";") if item.strip()]


def queue_row_count(issue, filename):
    raw = str(issue.get("queue_row_counts") or "").strip()
    for item in [part.strip() for part in raw.split(";") if part.strip()]:
        if ":" not in item:
            continue
        name, value = item.split(":", 1)
        if name.strip() != filename:
            continue
        try:
            return int(value.strip())
        except ValueError:
            return 0
    return 0


def export_item(exports_summary, export_id):
    return (exports_summary.get("exports") or {}).get(export_id, {})


def export_files(exports_summary, *export_ids):
    files = []
    for export_id in export_ids:
        item = export_item(exports_summary, export_id)
        for key in ("csv", "json"):
            if item.get(key):
                files.append(item[key])
    return files


def export_counts(exports_summary, *export_ids):
    return {
        export_id: export_item(exports_summary, export_id).get("row_count", 0)
        for export_id in export_ids
    }


def can_claim_complete(status_key):
    return status_key == "implemented"


def status_bucket(status_key):
    if status_key == "implemented":
        return "complete"
    if status_key in {"implemented_with_evidence_quality_risk", "implemented_with_review_queue"}:
        return "implemented_with_remaining_review"
    if status_key == "partial":
        return "partial"
    return "review"


def display_status(status_key):
    labels = {
        "implemented": ("已实现", "Implemented"),
        "implemented_with_review_queue": ("展示已实现，仍有复核队列", "Implemented with review queue"),
        "implemented_with_evidence_quality_risk": ("结构已实现，证据质量有风险", "Implemented with evidence-quality risk"),
        "partial": ("部分完成", "Partial"),
    }
    return labels.get(status_key, ("待复核", "Review required"))


def completion_boundary(status_key, can_complete):
    if can_complete:
        return (
            "当前证据足以声明该项完成；后续只需在源数据变化后重新同步。",
            "Current evidence is sufficient to claim this requirement complete; rerun sync after source-data changes.",
        )
    if status_key == "implemented_with_review_queue":
        return (
            "展示和运行层已经实现，但仍不能声明业务采信完全闭环。",
            "Presentation/runtime is implemented, but business-evidence acceptance is not fully closed.",
        )
    return (
        "只能声明阶段性完成；剩余队列关闭前不能声明该项完整完成。",
        "Only interim completion can be claimed; this requirement is not complete until the remaining queues are closed.",
    )


def first_text(items, fallback=""):
    for item in items or []:
        if item:
            return item
    return fallback


def build_matrix():
    reporting = load_json(REPORTING_VIEWS, {})
    completion = load_json(COMPLETION_AUDIT, {})
    gap_summary = load_json(GAP_SUMMARY, {})
    figures = load_json(FIGURE_MANIFEST, {})
    exports_summary = load_json(AUTHORITATIVE_EXPORTS_SUMMARY, {"exports": {}})
    emissions_gap_candidates = load_json(EMISSIONS_GAP_CANDIDATE_SUMMARY, {})
    emissions_p0_review_packet = load_json(EMISSIONS_P0_REVIEW_PACKET_SUMMARY, {})
    issues = issue_map()
    summary = reporting.get("summary", {})
    audit_by_id = {item.get("id"): item for item in completion.get("checks", [])}
    available_emissions_count = summary.get("available_emissions_ranking_company_count", 0)
    complete_emissions_count = summary.get("complete_emissions_ranking_company_count", 0)
    partial_emissions_count = max(0, available_emissions_count - complete_emissions_count)
    ghg_series_count = len((reporting.get("ghg_standard_series") or {}).get("definitions") or [])
    ghg_company_count = summary.get("ghg_protocol_company_count", 0)
    ghg_explicit_company_count = summary.get("ghg_explicit_series_company_count", 0)
    ghg_accepted_rows = export_item(exports_summary, "ghg_accepted_series_mapping").get("row_count", 0)
    ghg_review_rows = export_item(exports_summary, "ghg_review_series_mapping").get("row_count", 0)
    ghg_out_of_whitelist_rows = export_item(exports_summary, "ghg_out_of_whitelist_series_review").get("row_count", 0)
    standard_count = summary.get("standard_count", 0)
    standard_company_count = summary.get("standard_company_count", 0)
    standard_link_count = summary.get("standard_link_count", 0)

    def issue(issue_id):
        return issues.get(issue_id, {})

    def row(
        requirement_id,
        requirement_zh,
        requirement_en,
        issue_ids,
        status_key,
        implemented_zh,
        implemented_en,
        remaining_zh,
        remaining_en,
        proof_files,
        supporting_metrics,
    ):
        linked_issues = [issue(item) for item in issue_ids if issue(item)]
        open_queue_rows = sum(int(item.get("open_queue_rows") or 0) for item in linked_issues)
        queues = []
        for item in linked_issues:
            queues.extend(queue_files(item))
        next_actions_zh = [item.get("next_action_zh", "") for item in linked_issues if item.get("next_action_zh")]
        next_actions_en = [item.get("next_action_en", "") for item in linked_issues if item.get("next_action_en")]
        return {
            "requirement_id": requirement_id,
            "requirement_zh": requirement_zh,
            "requirement_en": requirement_en,
            "status_key": status_key,
            "status_bucket": status_bucket(status_key),
            "can_claim_complete": can_claim_complete(status_key),
            "display_status_zh": display_status(status_key)[0],
            "display_status_en": display_status(status_key)[1],
            "completion_boundary_zh": completion_boundary(status_key, can_claim_complete(status_key))[0],
            "completion_boundary_en": completion_boundary(status_key, can_claim_complete(status_key))[1],
            "evidence_summary_zh": implemented_zh,
            "evidence_summary_en": implemented_en,
            "primary_blocker_zh": remaining_zh if not can_claim_complete(status_key) else "",
            "primary_blocker_en": remaining_en if not can_claim_complete(status_key) else "",
            "primary_next_action_zh": first_text(next_actions_zh),
            "primary_next_action_en": first_text(next_actions_en),
            "implemented_zh": implemented_zh,
            "implemented_en": implemented_en,
            "remaining_zh": remaining_zh,
            "remaining_en": remaining_en,
            "open_queue_rows": open_queue_rows,
            "queue_files": queues,
            "next_actions_zh": next_actions_zh,
            "next_actions_en": next_actions_en,
            "proof_files": proof_files,
            "supporting_metrics": supporting_metrics,
        }

    ghg_issue = issue("ghg_protocol_fine_series")
    standard_issue = issue("standard_company_relationships")
    ghg_effective_review_rows = queue_row_count(
        ghg_issue,
        "world500_ghg_contextual_series_review_queue.csv",
    )
    ranking_issue = issue("emissions_ranking")
    graph_issue = issue("standard_full_graph_runtime")
    scope_issue = issue("scope_language_policy")
    tech_issue = issue("technology_path_axis")
    source_issue = issue("primary_secondary_bubble")
    static_issue = issue("static_png_sync")
    technology_paths = reporting.get("technology_paths", {})
    technology_project_summary = technology_paths.get("project_evidence_summary", {})
    technology_project_count = technology_project_summary.get("project_evidence_count", 0)
    technology_project_company_count = technology_project_summary.get("project_company_count", 0)
    technology_project_cost_count = technology_project_summary.get("project_cost_evidence_count", 0)
    technology_project_abatement_count = technology_project_summary.get("project_abatement_evidence_count", 0)
    technology_path_audit_rows = csv_row_count(WORKBENCH / "world500_technology_path_audit.csv")
    technology_project_upgrade = load_json(WORKBENCH / "world500_technology_project_upgrade_queue.json", {})
    technology_project_upgrade_rows = technology_project_upgrade.get("row_count", 0)
    technology_project_upgrade_priorities = technology_project_upgrade.get("queue_priority_counts", {})

    matrix = [
        row(
            "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
            "GHG Protocol 具体系列/标准/指南/项目、原则，以及整个标准和企业的关联情况。",
            "GHG Protocol concrete series, standards, guidance, programs, principles, and overall standard-company relationships.",
            ["ghg_protocol_fine_series", "standard_company_relationships"],
            "partial",
            f"GHG Protocol 已拆为 {ghg_series_count} 个细分系列；标准角色图已有 {standard_count} 个标准节点、{standard_company_count} 家企业、{standard_link_count} 条标准-企业关系。",
            f"GHG Protocol is split into {ghg_series_count} fine-series nodes; the standard role graph has {standard_count} standard nodes, {standard_company_count} companies, and {standard_link_count} standard-company relationships.",
            f"GHG 显式细分证据仍不足，{ghg_explicit_company_count}/{ghg_company_count} 家企业显式命中具体系列；当前只有 {ghg_accepted_rows} 条 accepted 细分边。12 类白名单核心 GHG review export 保留 {ghg_review_rows} 条追溯行，其中 {ghg_effective_review_rows} 条仍为 effective review 待处理；另有 {ghg_out_of_whitelist_rows} 条白名单外 GHG 衍生/泛化引用已隔离，不得混入 12 类核心标准统计。标准-企业边也仍需继续提升页码和 snippet 质量。",
            f"Explicit GHG fine-series evidence remains insufficient: {ghg_explicit_company_count}/{ghg_company_count} GHG-related companies explicitly cite concrete series; only {ghg_accepted_rows} fine-series edges are accepted. The 12-item core-whitelist GHG review export retains {ghg_review_rows} traceability rows, of which {ghg_effective_review_rows} remain effective review rows. Another {ghg_out_of_whitelist_rows} out-of-whitelist GHG-derived/generic references are isolated and must not be mixed into the 12-item core standard statistics. Standard-company edges still need stronger page and snippet quality.",
            [
                "assets/data/world500/workbench/reporting_views.json",
                "assets/data/world500/workbench/world500_ghg_series_mapping_audit.csv",
                "assets/data/world500/workbench/world500_standard_role_link_audit.csv",
            ] + export_files(
                exports_summary,
                "ghg_accepted_series_mapping",
                "ghg_review_series_mapping",
            ),
            {
                "ghg_defined_series": ghg_series_count,
                "ghg_company_count": ghg_company_count,
                "ghg_explicit_series_company_count": ghg_explicit_company_count,
                "authoritative_export_rows": export_counts(
                    exports_summary,
                    "ghg_accepted_series_mapping",
                    "ghg_review_series_mapping",
                    "ghg_out_of_whitelist_series_review",
                ),
                "standard_count": standard_count,
                "standard_company_count": standard_company_count,
                "standard_link_count": standard_link_count,
                "source_status": {
                    "ghg": ghg_issue.get("status_key"),
                    "standard_relationships": standard_issue.get("status_key"),
                },
            },
        ),
        row(
            "R2_TOTAL_EMISSIONS_RANKING_DESC",
            "企业总碳排放量从高到低排序，并做知识图谱展示。",
            "Rank company total emissions high to low and show the ranking as a knowledge graph.",
            ["emissions_ranking"],
            ranking_issue.get("status_key", "partial"),
            f"已生成完整强证据排行图和静态 PNG；当前 {available_emissions_count} 家有可用总量，{complete_emissions_count} 家进入完整 Scope 1/2/3 强证据排行。",
            f"A complete strong-evidence ranking graph and static PNG exist; {available_emissions_count} companies have available totals and {complete_emissions_count} qualify for complete Scope 1/2/3 strong-evidence ranking with finance Scope 3 boundary treatment where applicable.",
            f"完整可比排行覆盖率仍低，不能把 {partial_emissions_count} 家 partial 总量混入主排行。",
            f"Complete comparable ranking coverage remains low; the {partial_emissions_count} partial totals must not be mixed into the main ranking.",
            [
                "assets/data/world500/workbench/reporting_views.json",
                "assets/data/world500/workbench/world500_emissions_ranking_audit.csv",
                "assets/data/world500/workbench/world500_emissions_gap_candidate_records_from_expanded_evidence.csv",
                "assets/data/world500/workbench/world500_emissions_gap_candidate_records_from_expanded_evidence.json",
                "assets/data/world500/workbench/world500_emissions_gap_candidate_records_from_expanded_evidence_summary.json",
                "assets/data/world500/workbench/world500_emissions_p0_gap_review_packet.csv",
                "assets/data/world500/workbench/world500_emissions_p0_gap_review_packet.json",
                "assets/data/world500/workbench/world500_emissions_p0_gap_review_packet_summary.json",
                "assets/figures/zh/world500_emissions_ranking_graph.png",
                "assets/figures/en/world500_emissions_ranking_graph.png",
            ] + export_files(
                exports_summary,
                "emissions_complete_comparable_ranking",
                "emissions_partial_ranking_review",
            ),
            {
                "available_emissions_ranking_company_count": summary.get("available_emissions_ranking_company_count"),
                "complete_emissions_ranking_company_count": summary.get("complete_emissions_ranking_company_count"),
                "authoritative_export_rows": export_counts(
                    exports_summary,
                    "emissions_complete_comparable_ranking",
                    "emissions_partial_ranking_review",
                ),
                "expanded_evidence_gap_candidate_records": emissions_gap_candidates.get("candidate_record_count", 0),
                "expanded_evidence_gap_candidate_companies": emissions_gap_candidates.get("companies_with_candidate_records", 0),
                "expanded_evidence_gap_candidate_repair_priorities": emissions_gap_candidates.get("repair_priority_counts", {}),
                "p0_gap_review_packet_rows": emissions_p0_review_packet.get("row_count", 0),
                "p0_gap_review_packet_buckets": emissions_p0_review_packet.get("review_bucket_counts", {}),
                "p0_gap_review_packet_auto_promote_allowed": False,
                "source_status": ranking_issue.get("status_key"),
            },
        ),
        row(
            "R3_STANDARD_ROLE_FULL_GRAPH_AND_SCOPE_LANGUAGE",
            "标准角色族全屏实体级知识图谱：标准居中、企业外围、标准和行业用不同颜色；只有 GHG Protocol 使用 Scope 1/2/3。",
            "Standard role-family full-screen entity graph: centered standards, outer companies, distinct standard and industry colors; Scope 1/2/3 only under GHG Protocol.",
            ["standard_full_graph_runtime", "scope_language_policy"],
            "implemented_with_review_queue",
            "50 个 full-graph HTML 均为内嵌 JSON；标准节点和企业节点按标准/行业着色；非 GHG 标准自身 Scope 术语误用为 0。",
            "All 50 full-graph HTML pages use embedded JSON; standard and company nodes are colored by standard/industry; non-GHG standard own-term Scope misuse is zero.",
            "仍有 74 条非 GHG 源文引用含 Scope 词，需要确认只作为引用语境展示。",
            "Seventy-four non-GHG source quotations still contain Scope wording and need review to confirm they remain source quotation context only.",
            [
                "zh/role-family-standard-full-graph.html",
                "en/role-family-standard-full-graph.html",
                "assets/js/standard_cluster_full_graph.js",
                "assets/data/world500/workbench/world500_standard_role_link_audit.csv",
                "assets/data/world500/workbench/world500_non_ghg_scope_wording_review_queue.csv",
            ],
            {
                "full_graph_pages": 50,
                "standard_count": summary.get("standard_count"),
                "standard_company_count": summary.get("standard_company_count"),
                "standard_link_count": summary.get("standard_link_count"),
                "non_ghg_scope_wording_review_queue_rows": 74,
                "source_status": {
                    "runtime": graph_issue.get("status_key"),
                    "scope_language_policy": scope_issue.get("status_key"),
                },
            },
        ),
        row(
            "R4_TECHNOLOGY_PATH_AXIS",
            "图6 技术路径主轴：同类减碳技术企业聚类、流程图、标准对齐、细分技术、时间趋势和成本。",
            "Figure 6 technology path axis: decarbonization technology clusters, flow, standards alignment, subtypes, timeline trends, and cost.",
            ["technology_path_axis"],
            tech_issue.get("status_key", "partial"),
            "图6 已有 9 类技术路径、流程轴、标准对齐、细分方向、时间信号和成本信号，并有中英文静态 PNG。",
            f"Figure 6 shows 9 technology paths with a flow axis, standards alignment, subtypes, timeline signals, cost signals, and bilingual static PNGs. The separate page-level project-evidence layer now has {technology_project_count} valid project/measure records across {technology_project_company_count} companies. A project-upgrade queue covers {technology_project_upgrade_rows} disclosure-signal edges with priority counts {technology_project_upgrade_priorities}.",
            f"{technology_path_audit_rows} 条技术-企业关系仍全部是披露关键词信号，不是已核证项目成本或减排量。",
            f"The separate project-evidence layer can be used as strong project/measure evidence, but the legacy {technology_path_audit_rows:,} technology-company rows remain disclosure keyword signals, not verified project cost, implementation progress, or abatement values. The project-upgrade queue is diagnostic only and keeps auto-promotion disabled.",
            [
                "assets/data/world500/workbench/reporting_views.json",
                "assets/data/world500/workbench/world500_technology_path_audit.csv",
                "assets/data/world500/workbench/world500_technology_project_upgrade_queue.csv",
                "assets/data/world500/workbench/world500_technology_project_upgrade_queue.json",
                "assets/data/world500/workbench/world500_technology_project_evidence_audit.csv",
                "assets/data/world500/workbench/world500_technology_project_evidence_invalid_queue.csv",
                "assets/figures/zh/world500_technology_cluster_overview.png",
                "assets/figures/en/world500_technology_cluster_overview.png",
            ] + export_files(
                exports_summary,
                "technology_path_disclosure_signal_review",
            ),
            {
                "technology_cluster_count": summary.get("technology_cluster_count"),
                "technology_company_count": summary.get("technology_company_count"),
                "technology_path_audit_rows": technology_path_audit_rows,
                "technology_project_evidence_rows": technology_project_count,
                "technology_project_company_count": technology_project_company_count,
                "technology_project_cost_evidence_count": technology_project_cost_count,
                "technology_project_abatement_evidence_count": technology_project_abatement_count,
                "technology_project_upgrade_queue_rows": technology_project_upgrade_rows,
                "technology_project_upgrade_queue_priority_counts": technology_project_upgrade_priorities,
                "authoritative_export_rows": export_counts(
                    exports_summary,
                    "technology_path_disclosure_signal_review",
                ),
                "source_status": tech_issue.get("status_key"),
            },
        ),
        row(
            "R5_PRIMARY_SECONDARY_BUBBLE",
            "初级/次级数据可视化：按每家企业使用初级数据计算的比例作气泡图。",
            "Primary/secondary data visualization: bubble chart by each company's primary-data calculation ratio.",
            ["primary_secondary_bubble"],
            source_issue.get("status_key", "partial"),
            "初级/次级气泡图已生成；306 家企业进入来源结构数据，161 家有可显示比例。",
            "The primary/secondary bubble chart exists; 306 companies enter source-mix data and 161 have displayable ratios.",
            "只有 13 家使用原文明示 primary data 百分比，多数比例仍是 method_rows 来源结构推断，不等同审定计算权重。",
            "Only 13 companies use explicitly reported primary-data percentages; most ratios are method_rows source-mix inference and are not audited calculation weights.",
            [
                "assets/data/world500/workbench/reporting_views.json",
                "assets/data/world500/workbench/world500_primary_secondary_source_mix_audit.csv",
                "assets/figures/zh/world500_primary_secondary_source_mix.png",
                "assets/figures/en/world500_primary_secondary_source_mix.png",
            ] + export_files(
                exports_summary,
                "primary_secondary_explicit_primary_ratio",
                "primary_secondary_source_mix_inference_review",
            ),
            {
                "source_mix_company_count": summary.get("source_mix_company_count"),
                "source_mix_known_company_count": summary.get("source_mix_known_company_count"),
                "source_mix_explicit_reported_primary_ratio_company_count": summary.get("source_mix_explicit_reported_primary_ratio_company_count"),
                "authoritative_export_rows": export_counts(
                    exports_summary,
                    "primary_secondary_explicit_primary_ratio",
                    "primary_secondary_source_mix_inference_review",
                ),
                "source_status": source_issue.get("status_key"),
            },
        ),
        row(
            "R6_STATIC_PNG_SYNC_SUPPORTING_GATE",
            "图2、图6、企业排行和气泡图静态 PNG 与 GitHub 页面保持同源。",
            "Keep static PNGs for Figure 2, Figure 6, emissions ranking, and bubble chart synchronized with GitHub pages.",
            ["static_png_sync"],
            static_issue.get("status_key", "implemented"),
            "8 张中英文 PNG 均存在，manifest 记录 reporting_views 源 hash 和每张 PNG hash。",
            "All 8 bilingual PNGs exist, and the manifest records the reporting_views source hash plus each PNG hash.",
            "只要 reporting_views.json 更新，就必须重跑静态图同步脚本。",
            "Whenever reporting_views.json changes, the static figure sync script must be rerun.",
            [
                "assets/figures/reporting_static_figures_manifest.json",
                "tools/sync_reporting_static_figures.py",
            ],
            {
                "figure_count": len(figures.get("figures", [])),
                "source_status": static_issue.get("status_key"),
            },
        ),
    ]

    overall_complete = all(item["can_claim_complete"] for item in matrix)
    return {
        "schema_version": "world500-requirement-completion-matrix-v1",
        "generated_at": gap_summary.get("generated_at") or completion.get("generated_at"),
        "overall_status_key": "complete" if overall_complete else "partial",
        "can_claim_overall_complete": overall_complete,
        "source_files": [
            "assets/data/world500/workbench/reporting_views.json",
            "assets/data/world500/workbench/reporting_gap_status_summary.json",
            "assets/data/world500/workbench/reporting_completion_audit.json",
            "assets/data/world500/workbench/world500_reporting_unresolved_issue_register.json",
        ],
        "requirements": matrix,
    }


def update_gap_summary_links():
    summary = load_json(GAP_SUMMARY, {})
    summary["requirement_completion_matrix"] = {
        "json": "assets/data/world500/workbench/world500_requirement_completion_matrix.json",
        "csv": "assets/data/world500/workbench/world500_requirement_completion_matrix.csv",
        "purpose_zh": "把原始五大需求逐条映射为完成状态、证据文件、未闭环队列和是否可声明完成。",
        "purpose_en": "Maps the original requirements to completion status, proof files, unresolved queues, and whether completion can be claimed.",
    }
    GAP_SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def write_outputs(matrix):
    OUTPUT_JSON.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    fields = [
        "requirement_id",
        "status_key",
        "status_bucket",
        "can_claim_complete",
        "display_status_zh",
        "display_status_en",
        "completion_boundary_zh",
        "completion_boundary_en",
        "evidence_summary_zh",
        "evidence_summary_en",
        "primary_blocker_zh",
        "primary_blocker_en",
        "primary_next_action_zh",
        "primary_next_action_en",
        "requirement_zh",
        "requirement_en",
        "implemented_zh",
        "implemented_en",
        "remaining_zh",
        "remaining_en",
        "open_queue_rows",
        "queue_files",
        "proof_files",
        "next_actions_zh",
        "next_actions_en",
        "supporting_metrics",
    ]
    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for item in matrix["requirements"]:
            row = dict(item)
            for key in ["queue_files", "proof_files", "next_actions_zh", "next_actions_en"]:
                row[key] = "; ".join(row.get(key) or [])
            row["supporting_metrics"] = json.dumps(row.get("supporting_metrics") or {}, ensure_ascii=False, sort_keys=True)
            writer.writerow({key: row.get(key, "") for key in fields})


def main():
    matrix = build_matrix()
    write_outputs(matrix)
    update_gap_summary_links()
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")
    print(f"Updated {GAP_SUMMARY.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
