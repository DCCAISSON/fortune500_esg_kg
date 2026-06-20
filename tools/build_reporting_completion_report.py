from __future__ import annotations

import json
import html
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
FIGURES = ROOT / "assets" / "figures"
OUTPUT = ROOT / "REPORTING_COMPLETION_AUDIT_ZH.md"
OUTPUT_HTML = ROOT / "reporting-completion-audit.html"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def yes_no(value: bool) -> str:
    return "可" if value else "不可"


def status_label(status: str) -> str:
    labels = {
        "implemented": "已实现",
        "partial": "部分完成",
        "implemented_with_review_queue": "已实现但仍有复核队列",
        "implemented_with_evidence_quality_risk": "结构已实现但证据质量有风险",
    }
    return labels.get(status, status or "-")


def compact(text: str | None) -> str:
    return (text or "-").replace("\n", " ").strip()


def table(headers: list[str], rows: list[list[str]]) -> list[str]:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        safe = [str(cell).replace("|", "/") for cell in row]
        lines.append("| " + " | ".join(safe) + " |")
    return lines


def markdown_to_html(markdown: str) -> str:
    html_lines: list[str] = []
    lines = markdown.splitlines()
    index = 0
    in_list = False

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            html_lines.append("</ul>")
            in_list = False

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            close_list()
            index += 1
            continue
        if stripped.startswith("| "):
            close_list()
            table_rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith("| "):
                row_line = lines[index].strip()
                cells = [cell.strip() for cell in row_line.strip("|").split("|")]
                if not all(set(cell) <= {"-", " "} for cell in cells):
                    table_rows.append(cells)
                index += 1
            if table_rows:
                headers = table_rows[0]
                body = table_rows[1:]
                html_lines.append('<div class="table-wrap"><table>')
                html_lines.append("<tr>" + "".join(f"<th>{html.escape(cell)}</th>" for cell in headers) + "</tr>")
                for row in body:
                    html_lines.append("<tr>" + "".join(f"<td>{html.escape(cell)}</td>" for cell in row) + "</tr>")
                html_lines.append("</table></div>")
            continue
        if stripped.startswith("### "):
            close_list()
            html_lines.append(f"<h3>{html.escape(stripped[4:])}</h3>")
        elif stripped.startswith("## "):
            close_list()
            html_lines.append(f"<h2>{html.escape(stripped[3:])}</h2>")
        elif stripped.startswith("# "):
            close_list()
            html_lines.append(f"<h1>{html.escape(stripped[2:])}</h1>")
        elif stripped.startswith("- "):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            html_lines.append(f"<li>{html.escape(stripped[2:])}</li>")
        else:
            close_list()
            html_lines.append(f"<p>{html.escape(stripped)}</p>")
        index += 1
    close_list()
    return "\n".join(html_lines)


def build_html(markdown: str) -> str:
    body = markdown_to_html(markdown)
    return f"""<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>世界500强 ESG 知识图谱完成度审计</title>
  <link rel="stylesheet" href="./assets/css/site.css">
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div class="brand">世界500强 ESG 知识图谱</div>
      <div class="nav">
        <a class="pill" href="./index.html">Home</a>
        <a class="pill" href="./zh/reporting-views.html">审计视图</a>
        <a class="pill" href="./REPORTING_COMPLETION_AUDIT_ZH.md">Markdown</a>
      </div>
    </div>
    <section class="hero reporting-audit-card">
      <div class="eyebrow">Completion Audit</div>
      {body}
    </section>
  </div>
</body>
</html>
"""


def build_report() -> str:
    matrix = read_json(WORKBENCH / "world500_requirement_completion_matrix.json")
    issues = read_json(WORKBENCH / "world500_reporting_unresolved_issue_register.json")
    views = read_json(WORKBENCH / "reporting_views.json")
    gap_summary = read_json(WORKBENCH / "reporting_gap_status_summary.json")
    manifest = read_json(FIGURES / "reporting_static_figures_manifest.json")
    audit = read_json(WORKBENCH / "reporting_completion_audit.json")
    workplan = read_json(WORKBENCH / "world500_reporting_completion_workplan.json")
    closure_dashboard_path = WORKBENCH / "world500_reporting_closure_dashboard.json"
    closure_dashboard = read_json(closure_dashboard_path) if closure_dashboard_path.exists() else {}
    ghg_series_acceptance_ledger_path = WORKBENCH / "world500_ghg_series_acceptance_ledger.json"
    ghg_series_acceptance_ledger = read_json(ghg_series_acceptance_ledger_path) if ghg_series_acceptance_ledger_path.exists() else {}
    ghg_zero_accepted_audit_path = WORKBENCH / "world500_ghg_zero_accepted_standard_audit.json"
    ghg_zero_accepted_audit = read_json(ghg_zero_accepted_audit_path) if ghg_zero_accepted_audit_path.exists() else {}
    ghg_zero_accepted_closure_path = WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.json"
    ghg_zero_accepted_closure = read_json(ghg_zero_accepted_closure_path) if ghg_zero_accepted_closure_path.exists() else {}
    overmapped_decisions_path = WORKBENCH / "world500_ghg_overmapped_demote_decisions.json"
    overmapped_decisions = read_json(overmapped_decisions_path) if overmapped_decisions_path.exists() else {}
    p0_overmapped_decisions_path = WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.json"
    p0_overmapped_decisions = read_json(p0_overmapped_decisions_path) if p0_overmapped_decisions_path.exists() else {}
    emissions_partial_exclusions_path = WORKBENCH / "world500_emissions_partial_exclusion_decisions.json"
    emissions_partial_exclusions = read_json(emissions_partial_exclusions_path) if emissions_partial_exclusions_path.exists() else {}
    emissions_ranking_ledger_path = WORKBENCH / "world500_emissions_ranking_evidence_ledger.json"
    emissions_ranking_ledger = read_json(emissions_ranking_ledger_path) if emissions_ranking_ledger_path.exists() else {}
    emissions_year_demotions_path = WORKBENCH / "world500_emissions_year_alignment_demotions.json"
    emissions_year_demotions = read_json(emissions_year_demotions_path) if emissions_year_demotions_path.exists() else {}

    summary = views.get("summary", {})
    issue_by_id = {item.get("issue_id"): item for item in issues.get("issues", [])}
    technology_project_summary = views.get("technology_paths", {}).get("project_evidence_summary", {})
    technology_project_count = technology_project_summary.get("project_evidence_count", 0)
    technology_project_company_count = technology_project_summary.get("project_company_count", 0)
    technology_project_cost_count = technology_project_summary.get("project_cost_evidence_count", 0)
    technology_project_cost_review_count = technology_project_summary.get("project_cost_review_note_count", 0)
    technology_project_abatement_count = technology_project_summary.get("project_abatement_evidence_count", 0)

    generated_at = audit.get("generated_at") or manifest.get("generated_at") or matrix.get("generated_at", "-")
    lines: list[str] = [
        "# 世界500强 ESG 知识图谱完成度审计",
        "",
        f"- 生成时间：{generated_at}",
        f"- 审计矩阵日期：{matrix.get('generated_at', '-')}",
        f"- PNG manifest 生成时间：{manifest.get('generated_at', '-')}",
        f"- 总体状态：{matrix.get('overall_status_key', '-')}",
        f"- 是否可以声明全部完成：{yes_no(bool(matrix.get('can_claim_overall_complete')))}",
        "",
        "## 结论",
        "",
        compact(gap_summary.get("overall_status_zh")),
        "",
        "当前可以声明的是：展示层、全屏图运行层和静态 PNG 同步门槛已经基本完成；不能声明的是：GHG 细分系列证据、企业总排放完整强证据排行、技术路径项目级证据、初级/次级数据真实计算权重仍未闭环。",
        "",
        "## 核心指标",
        "",
    ]

    metric_rows = [
        ["企业总数", summary.get("company_count", "-")],
        ["GHG Protocol 相关企业", summary.get("ghg_protocol_company_count", "-")],
        ["显式命中 GHG 具体系列企业", summary.get("ghg_explicit_series_company_count", "-")],
        ["标准角色图标准节点", summary.get("standard_count", "-")],
        ["标准角色图企业", summary.get("standard_company_count", "-")],
        ["标准-企业关系", summary.get("standard_link_count", "-")],
        ["有可用总排放量企业", summary.get("available_emissions_ranking_company_count", "-")],
        ["完整强证据可比排行企业", summary.get("complete_emissions_ranking_company_count", "-")],
        ["技术路径企业", summary.get("technology_company_count", "-")],
        ["技术路径类别", summary.get("technology_cluster_count", "-")],
        ["项目级技术证据记录", technology_project_count],
        ["项目级技术证据企业", technology_project_company_count],
        ["项目级技术成本/投资强证据", technology_project_cost_count],
        ["项目级技术成本/投资复核说明", technology_project_cost_review_count],
        ["项目级技术减排效果证据", technology_project_abatement_count],
        ["进入初级/次级来源结构企业", summary.get("source_mix_company_count", "-")],
        ["有可显示来源比例企业", summary.get("source_mix_known_company_count", "-")],
        ["原文明示 primary-data 百分比企业", summary.get("source_mix_explicit_reported_primary_ratio_company_count", "-")],
    ]
    lines.extend(table(["指标", "当前值"], [[a, str(b)] for a, b in metric_rows]))
    lines.extend(["", "## 需求逐项完成度", ""])

    req_rows = []
    for item in matrix.get("requirements", []):
        req_rows.append(
            [
                item.get("requirement_id", "-"),
                status_label(item.get("status_key", "")),
                yes_no(bool(item.get("can_claim_complete"))),
                str(item.get("open_queue_rows", "-")),
                compact(item.get("implemented_zh")),
                compact(item.get("remaining_zh")),
            ]
        )
    lines.extend(table(["需求", "状态", "可声明完成", "开放队列行数", "已实现", "未完成/风险"], req_rows))
    lines.extend(["", "## 未解决问题和优先级", ""])

    issue_rows = []
    for issue in issues.get("issues", []):
        issue_rows.append(
            [
                str(issue.get("issue_no", "-")),
                issue.get("priority", "-"),
                issue.get("issue_id", "-"),
                status_label(issue.get("status_key", "")),
                str(issue.get("open_queue_rows", "-")),
                compact(issue.get("next_action_zh")),
                compact(issue.get("blocking_risk_zh")),
            ]
        )
    lines.extend(table(["序号", "优先级", "问题", "状态", "开放队列行数", "下一步", "风险"], issue_rows))
    lines.extend(["", "## 五项需求的当前判断", ""])

    judgement = [
        (
            "一、GHG Protocol 具体系列、原则、清单匹配和企业关系",
            "已拆成细分系列/标准/指南/项目节点，泛化引用不再直接作为强证据；但显式证据覆盖不足，仍要逐条回 PDF 页级证据升/降级。",
            "ghg_protocol_fine_series",
        ),
        (
            "二、企业总碳排放量从高到低排序",
            "已有可用排行和静态图；但完整强证据可比排行只有少数企业，partial 总量不能混入主排行。",
            "emissions_ranking",
        ),
        (
            "三、标准角色族全屏实体级知识图谱",
            "全屏图运行层已实现，标准/行业颜色已实现；仍需复核非 GHG 源文 Scope 词只作为引用语境。",
            "scope_language_policy",
        ),
        (
            "四、图6 技术路径主轴",
            f"已有 9 类技术路径、子类、流程轴、标准对齐、时间和成本信号，并新增 {technology_project_count} 条项目/措施级页级证据，覆盖 {technology_project_company_count} 家企业；但更大的技术-企业边集合仍主要是关键词披露信号，不能整体当作项目级核证证据。",
            "technology_path_axis",
        ),
        (
            "五、初级/次级数据气泡图",
            "气泡图已生成；但只有少量企业来自原文明示 primary-data 百分比，多数仍是来源结构推断，不可当作真实计算权重。",
            "primary_secondary_bubble",
        ),
    ]
    for title, conclusion, issue_id in judgement:
        issue = issue_by_id.get(issue_id, {})
        lines.extend(
            [
                f"### {title}",
                "",
                f"- 当前判断：{conclusion}",
                f"- 开放队列行数：{issue.get('open_queue_rows', '-')}",
                f"- 下一步：{compact(issue.get('next_action_zh'))}",
                "",
            ]
        )

    lines.extend(
        [
            "## 静态图和全屏图同步门槛",
            "",
            f"- PNG manifest：`assets/figures/reporting_static_figures_manifest.json`",
            f"- PNG 数量：{len(manifest.get('figures', []))}",
            f"- PNG 源数据：`{manifest.get('source', '-')}`",
            f"- 源数据 SHA256：`{manifest.get('source_sha256', '-')}`",
            "- 全屏图校验要求：50 个 `zh/en/*full-graph.html` 必须内嵌 JSON，且不能出现 `fetch(` 或 `<img>` fallback。",
            "",
            "## 关键源文件",
            "",
            "- `assets/data/world500/workbench/world500_requirement_completion_matrix.json`",
            "- `assets/data/world500/workbench/reporting_gap_status_summary.json`",
            "- `assets/data/world500/workbench/world500_reporting_unresolved_issue_register.json`",
            "- `assets/data/world500/workbench/world500_reporting_completion_workplan.json`",
            "- `assets/data/world500/workbench/world500_reporting_completion_workplan.csv`",
            "- `assets/data/world500/workbench/reporting_completion_audit.json`",
            "- `assets/data/world500/workbench/reporting_views.json`",
            "- `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json`",
            "- `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.csv`",
            "- `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json`",
            "- `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.csv`",
            "- `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.json`",
            "- `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.csv`",
            "- `assets/data/world500/workbench/world500_technology_project_evidence.json`",
            "- `assets/data/world500/workbench/world500_technology_project_evidence_audit.csv`",
            "- `assets/data/world500/workbench/world500_technology_project_evidence_invalid_queue.csv`",
            "- `assets/figures/reporting_static_figures_manifest.json`",
            "- `tools/verify_reporting_completion_gate.py`",
            "",
        ]
    )
    figure_claim_rows = []
    for figure in manifest.get("figures", []):
        figure_claim_rows.append(
            [
                figure.get("file", "-"),
                figure.get("requirement_id", "-"),
                figure.get("claim_status", "-"),
                yes_no(bool(figure.get("can_claim_requirement_complete"))),
                compact(figure.get("audit_boundary_zh")),
            ]
        )
    lines.extend(["## 静态 PNG 业务完成边界", ""])
    lines.extend(table(["静态图", "对应需求", "业务完成状态", "可声明业务完成", "审计边界"], figure_claim_rows))
    lines.extend([""])
    workplan_rows = [[priority, str(total)] for priority, total in workplan.get("priority_queue_totals", {}).items()]
    lines.extend(
        [
            "## Completion Workplan",
            "",
            "This section summarizes the executable evidence-closure workplan generated from the unresolved issue register.",
            "",
        ]
    )
    lines.extend(table(["Priority", "Open queue rows"], workplan_rows))
    lines.extend(
        [
            "",
            "- JSON: `assets/data/world500/workbench/world500_reporting_completion_workplan.json`",
            "- CSV: `assets/data/world500/workbench/world500_reporting_completion_workplan.csv`",
            "- Verification: `python tools/verify_reporting_completion_gate.py`",
            "",
        ]
    )
    if closure_dashboard:
        dashboard_rows = []
        for row in (closure_dashboard.get("top_p0_batches") or [])[:12]:
            dashboard_rows.append([
                row.get("priority", "-"),
                row.get("requirement_id", "-"),
                row.get("issue_id", "-"),
                row.get("company_name_en") or row.get("company_id") or "-",
                str(row.get("open_queue_rows", "-")),
                compact(row.get("safe_next_action_en")),
            ])
        lines.extend(
            [
                "## Evidence Closure Dashboard",
                "",
                "This dashboard groups unresolved queues by priority, requirement, issue, and company. It is a review-planning artifact only and does not promote evidence or mark requirements complete.",
                "",
                f"- JSON: `assets/data/world500/workbench/world500_reporting_closure_dashboard.json`",
                f"- CSV: `assets/data/world500/workbench/world500_reporting_closure_dashboard.csv`",
                f"- Batch count: {closure_dashboard.get('batch_count', '-')}",
                f"- Open queue rows covered: {closure_dashboard.get('open_queue_rows', '-')}",
                "",
            ]
        )
        lines.extend(table(["Priority", "Requirement", "Issue", "Company", "Rows", "Safe action"], dashboard_rows))
        lines.extend([""])
    if ghg_series_acceptance_ledger:
        ledger_rows = []
        for row in (ghg_series_acceptance_ledger.get("rows") or [])[:12]:
            ledger_rows.append([
                row.get("decision_bucket", "-"),
                row.get("decision_status", "-"),
                row.get("company_name_en") or row.get("company_id") or "-",
                row.get("series_name_en") or row.get("series_id") or "-",
                row.get("match_status", "-"),
                compact(row.get("safe_use_en")),
            ])
        lines.extend(
            [
                "## GHG Fine-Series Acceptance Ledger",
                "",
                "This ledger unifies accepted, review-only, and demoted GHG Protocol fine-series company edges. It is the current safe boundary for whether a company-standard edge can be treated as accepted.",
                "",
                f"- JSON: `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json`",
                f"- CSV: `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.csv`",
                f"- Row count: {ghg_series_acceptance_ledger.get('row_count', '-')}",
                f"- Accepted explicit edges: {ghg_series_acceptance_ledger.get('accepted_edge_count', '-')}",
                f"- Review-only contextual edges: {ghg_series_acceptance_ledger.get('review_edge_count', '-')}",
                f"- Demoted overmapped edges: {ghg_series_acceptance_ledger.get('demoted_edge_count', '-')}",
                f"- Generic GHG accepted count: {ghg_series_acceptance_ledger.get('generic_reference_accepted_count', '-')}",
                f"- Accepted outside 12-item whitelist: {ghg_series_acceptance_ledger.get('accepted_outside_whitelist_count', '-')}",
                f"- Review/demoted outside 12-item whitelist: {ghg_series_acceptance_ledger.get('review_outside_whitelist_count', '-')}",
                "",
            ]
        )
        lines.extend(table(["Bucket", "Decision", "Company", "GHG fine series", "Match status", "Safe use"], ledger_rows))
        lines.extend([""])
    if ghg_zero_accepted_audit:
        zero_rows = [row for row in (ghg_zero_accepted_audit.get("rows") or []) if int(row.get("accepted_company_count") or 0) == 0]
        display_rows = []
        for row in zero_rows:
            display_rows.append([
                row.get("series_name_en") or row.get("series_id") or "-",
                str(row.get("accepted_company_count", 0)),
                str(row.get("review_company_count", 0)),
                str(row.get("evidence_count", 0)),
                row.get("current_status", "-"),
                compact(row.get("audit_decision_en")),
            ])
        lines.extend(
            [
                "## GHGP Zero-Accepted Standard Audit",
                "",
                "This audit records controlled GHGP/PCAF standards with zero accepted company edges. Zero accepted is treated as a guarded evidence conclusion, not permission to infer adoption from generic GHG mentions.",
                "",
                "- JSON: `assets/data/world500/workbench/world500_ghg_zero_accepted_standard_audit.json`",
                "- CSV: `assets/data/world500/workbench/world500_ghg_zero_accepted_standard_audit.csv`",
                f"- Zero accepted standards: {ghg_zero_accepted_audit.get('zero_accepted_standard_count', '-')}",
                f"- Policy: {compact(ghg_zero_accepted_audit.get('policy_en'))}",
                "",
            ]
        )
        lines.extend(table(["GHGP standard", "Accepted", "Review", "Evidence", "Status", "Decision"], display_rows))
        lines.extend([""])
    if ghg_zero_accepted_closure:
        reason_counts = {}
        for row in ghg_zero_accepted_closure.get("rows", []):
            code = row.get("not_acceptance_reason_code") or "unknown"
            reason_counts[code] = reason_counts.get(code, 0) + 1
        reason_rows = [[code, str(count)] for code, count in sorted(reason_counts.items())]
        closure_sample_rows = []
        for row in (ghg_zero_accepted_closure.get("rows") or [])[:12]:
            closure_sample_rows.append([
                row.get("series_name_en") or row.get("series_id") or "-",
                row.get("company_name_en") or row.get("company_id") or "aggregate/no current row",
                row.get("not_acceptance_reason_code", "-"),
                row.get("promotion_allowed", "-"),
                compact(row.get("safe_decision_en")),
            ])
        lines.extend(
            [
                "## GHGP Zero-Accepted Review Closure Queue",
                "",
                "This queue makes the zero-accepted decision machine-readable at company/standard level. It is intentionally review-only and forbids automatic promotion.",
                "",
                "- JSON: `assets/data/world500/workbench/world500_ghg_zero_accepted_review_closure_queue.json`",
                "- CSV: `assets/data/world500/workbench/world500_ghg_zero_accepted_review_closure_queue.csv`",
                f"- Closure rows: {ghg_zero_accepted_closure.get('row_count', '-')}",
                f"- Promotion allowed rows: {ghg_zero_accepted_closure.get('promotion_allowed_count', '-')}",
                "",
            ]
        )
        lines.extend(table(["Not-acceptance reason", "Rows"], reason_rows))
        lines.extend([""])
        lines.extend(table(["GHGP standard", "Company", "Reason", "Promote", "Safe decision"], closure_sample_rows))
        lines.extend([""])
    if technology_project_summary:
        lines.extend(
            [
                "## Figure 6 Strict Project Evidence Gate",
                "",
                "Figure 6 separates project-level evidence from broader disclosure signals. Cost/investment evidence is counted only when the normalized project record has `cost_evidence_status = accepted_project_cost_or_investment_evidence`; capacity, procurement volume, sales revenue, cost-advantage wording, and no-cost-disclosed notes are not counted as cost evidence.",
                "",
                f"- Project evidence rows: {technology_project_count}",
                f"- Project companies: {technology_project_company_count}",
                f"- Strict cost/investment evidence rows: {technology_project_cost_count}",
                f"- Cost review-note rows excluded from strict cost evidence: {technology_project_cost_review_count}",
                f"- Abatement-effect evidence rows: {technology_project_abatement_count}",
                "- Source JSON: `assets/data/world500/workbench/world500_technology_project_evidence.json`",
                "- Audit CSV: `assets/data/world500/workbench/world500_technology_project_evidence_audit.csv`",
                "",
            ]
        )
    if overmapped_decisions:
        decision_rows = []
        for row in (overmapped_decisions.get("decisions") or [])[:12]:
            decision_rows.append([
                row.get("company_name_en") or row.get("company_id") or "-",
                row.get("current_series_id", "-"),
                row.get("named_series_ids_in_sample", "-"),
                row.get("decision_status", "-"),
                compact(row.get("safe_action_en")),
            ])
        lines.extend(
            [
                "## GHG Overmapping Demotion Decisions",
                "",
                "These decisions identify contextual GHG edges whose evidence does not support the currently linked series strongly enough. They are demotion/reassignment review records only and do not promote evidence.",
                "",
                f"- JSON: `assets/data/world500/workbench/world500_ghg_overmapped_demote_decisions.json`",
                f"- CSV: `assets/data/world500/workbench/world500_ghg_overmapped_demote_decisions.csv`",
                f"- Decision count: {overmapped_decisions.get('decision_count', '-')}",
                f"- Company count: {overmapped_decisions.get('company_count', '-')}",
                f"- P0 subset JSON: `assets/data/world500/workbench/world500_ghg_p0_overmapped_demote_decisions.json`",
                f"- P0 subset CSV: `assets/data/world500/workbench/world500_ghg_p0_overmapped_demote_decisions.csv`",
                f"- P0 decision count: {p0_overmapped_decisions.get('decision_count', '-')}",
                "",
            ]
        )
        lines.extend(table(["Company", "Current series", "Named series in sample", "Decision", "Safe action"], decision_rows))
        lines.extend([""])
    if emissions_partial_exclusions:
        exclusion_rows = []
        for row in (emissions_partial_exclusions.get("decisions") or [])[:12]:
            exclusion_rows.append([
                str(row.get("available_rank", "-")),
                row.get("company_name_en") or row.get("company_id") or "-",
                str(row.get("total_mtco2e", "-")),
                row.get("missing_scopes", "-"),
                compact(row.get("safe_action_en")),
            ])
        lines.extend(
            [
                "## Emissions Partial-Total Exclusion Decisions",
                "",
                "These decisions record companies whose available total emissions remain sorted for review but are excluded from the complete comparable emissions ranking graph until Scope 1, selected Scope 2, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate.",
                "",
                f"- JSON: `assets/data/world500/workbench/world500_emissions_partial_exclusion_decisions.json`",
                f"- CSV: `assets/data/world500/workbench/world500_emissions_partial_exclusion_decisions.csv`",
                f"- Decision count: {emissions_partial_exclusions.get('decision_count', '-')}",
                f"- Company count: {emissions_partial_exclusions.get('company_count', '-')}",
                f"- Missing Scope counts: {json.dumps(emissions_partial_exclusions.get('missing_scope_counts', {}), ensure_ascii=False, sort_keys=True)}",
                "",
            ]
        )
        lines.extend(table(["Available rank", "Company", "Partial total MtCO2e", "Missing scopes", "Safe action"], exclusion_rows))
        lines.extend([""])
    if emissions_ranking_ledger:
        ledger_rows = []
        for row in (emissions_ranking_ledger.get("rows") or [])[:14]:
            ledger_rows.append([
                row.get("record_type", "-"),
                row.get("decision_bucket", "-"),
                row.get("company_name_en") or row.get("company_id") or "-",
                row.get("missing_scopes", "-"),
                row.get("candidate_scope", "-"),
                row.get("p0_review_bucket", "-"),
                compact(row.get("safe_use_en")),
            ])
        lines.extend(
            [
                "## Emissions Ranking Evidence Ledger",
                "",
                "This ledger unifies complete ranking rows, partial exclusions, and gap candidates. It is the current safe boundary for whether a company can enter the complete comparable total-emissions ranking.",
                "",
                f"- JSON: `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json`",
                f"- CSV: `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.csv`",
                f"- Complete accepted rows: {emissions_ranking_ledger.get('complete_accepted_count', '-')}",
                f"- Partial excluded rows: {emissions_ranking_ledger.get('partial_excluded_count', '-')}",
                f"- Gap candidate rows: {emissions_ranking_ledger.get('gap_candidate_count', '-')}",
                f"- P0 gap candidates: {emissions_ranking_ledger.get('p0_gap_candidate_count', '-')}",
                f"- Auto-promote allowed count: {emissions_ranking_ledger.get('auto_promote_allowed_count', '-')}",
                f"- P0 review buckets: {json.dumps(emissions_ranking_ledger.get('p0_review_bucket_counts', {}), ensure_ascii=False, sort_keys=True)}",
                "",
            ]
        )
        lines.extend(table(["Record type", "Bucket", "Company", "Missing scopes", "Candidate scope", "P0 bucket", "Safe use"], ledger_rows))
        lines.extend([""])
    if emissions_year_demotions:
        demotion_rows = []
        for row in (emissions_year_demotions.get("decisions") or [])[:12]:
            demotion_rows.append([
                row.get("company_name_en") or row.get("company_id") or "-",
                row.get("scope_en", "-"),
                row.get("value_mtco2e", "-"),
                row.get("inventory_year", "-"),
                compact(row.get("demotion_reason")),
            ])
        lines.extend(
            [
                "## Emissions Year-Alignment Demotion Ledger",
                "",
                "This ledger records direct Scope candidates whose value token maps to a different year column than inventory_year. These rows are excluded from the strong-evidence gate until source evidence is corrected and reporting_views is rebuilt.",
                "",
                f"- JSON: `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.json`",
                f"- CSV: `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.csv`",
                f"- Decision count: {emissions_year_demotions.get('decision_count', '-')}",
                f"- Company count: {emissions_year_demotions.get('company_count', '-')}",
                f"- Scope counts: {json.dumps(emissions_year_demotions.get('scope_counts', {}), ensure_ascii=False, sort_keys=True)}",
                "",
            ]
        )
        lines.extend(table(["Company", "Scope", "Candidate MtCO2e", "Inventory year", "Demotion reason"], demotion_rows))
        lines.extend([""])
    return "\n".join(lines)


def main() -> None:
    report = build_report()
    OUTPUT.write_text(report, encoding="utf-8", newline="\n")
    OUTPUT_HTML.write_text(build_html(report), encoding="utf-8", newline="\n")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_HTML.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
