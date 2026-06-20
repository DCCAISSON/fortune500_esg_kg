import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_FILE = WORKBENCH / "reporting_views.json"
OUTPUT_FILE = WORKBENCH / "world500_technology_path_audit.csv"
VALIDATION_QUEUE_FILE = WORKBENCH / "world500_technology_path_validation_queue.csv"
COMPANY_EVIDENCE_QUEUE_FILE = WORKBENCH / "world500_technology_company_evidence_backfill_queue.csv"
TIMELINE_QUEUE_FILE = WORKBENCH / "world500_technology_timeline_validation_queue.csv"
COST_QUEUE_FILE = WORKBENCH / "world500_technology_cost_validation_queue.csv"
PROJECT_EVIDENCE_AUDIT_FILE = WORKBENCH / "world500_technology_project_evidence_audit.csv"
PROJECT_EVIDENCE_INVALID_QUEUE_FILE = WORKBENCH / "world500_technology_project_evidence_invalid_queue.csv"
PROJECT_UPGRADE_QUEUE_FILE = WORKBENCH / "world500_technology_project_upgrade_queue.csv"
PROJECT_UPGRADE_QUEUE_JSON = WORKBENCH / "world500_technology_project_upgrade_queue.json"
PROJECT_CANDIDATE_DECISIONS_FILE = WORKBENCH / "world500_technology_project_candidate_decisions.json"


FIELDS = [
    "review_priority",
    "evidence_boundary",
    "technology_id",
    "technology_name_en",
    "technology_name_zh",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "company_count_in_cluster",
    "cluster_evidence_count",
    "cluster_cost_signal_count",
    "timeline_near_count",
    "timeline_mid_count",
    "timeline_long_count",
    "subtypes_en",
    "subtypes_zh",
    "standards_en",
    "standards_zh",
    "sample_pages",
    "sample_source_files",
    "company_evidence_count",
    "company_sample_snippet_en",
    "company_timeline_years",
    "company_cost_signal_present",
    "company_specific_evidence_status",
    "sample_snippets_en",
]

QUEUE_FIELDS = [
    "queue_type",
    "queue_priority",
    "recommended_action_en",
    "recommended_action_zh",
    *FIELDS,
]

PROJECT_FIELDS = [
    "validation_status",
    "missing_fields",
    "evidence_boundary",
    "technology_id",
    "technology_name_en",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "industry_section_code",
    "industry_section_en",
    "subtype_id",
    "subtype_en",
    "project_name_en",
    "measure_name_en",
    "implementation_stage",
    "timeline_years",
    "cost_or_investment_en",
    "cost_or_investment_review_note_en",
    "cost_evidence_status",
    "abatement_effect_en",
    "evidence_page",
    "source_file",
    "report_title_en",
    "snippet_en",
]

PROJECT_UPGRADE_FIELDS = [
    "review_priority",
    "queue_priority",
    "auto_promote_allowed",
    "recommended_action_en",
    "recommended_action_zh",
    "technology_id",
    "technology_name_en",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "industry_section_code",
    "industry_section_en",
    "current_signal_status",
    "validated_project_evidence_count",
    "validated_project_names_en",
    "validated_project_pages",
    "validated_project_source_files",
    "missing_to_project_gate",
    "company_timeline_years",
    "company_cost_signal_present",
    "company_evidence_count",
    "candidate_decision_bucket",
    "candidate_decision_status",
    "candidate_decision_rationale_en",
    "candidate_decision_rationale_zh",
    "evidence_boundary",
    "sample_pages",
    "sample_source_files",
    "company_sample_snippet_en",
]


def load_payload():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def load_candidate_decisions():
    if not PROJECT_CANDIDATE_DECISIONS_FILE.exists():
        return {}
    payload = json.loads(PROJECT_CANDIDATE_DECISIONS_FILE.read_text(encoding="utf-8"))
    decisions = {}
    for row in payload.get("decisions", []):
        company_id = clean(row.get("company_id"))
        technology_id = clean(row.get("technology_id"))
        if company_id and technology_id:
            decisions[(company_id, technology_id)] = row
    return decisions


def join(values):
    if not isinstance(values, list):
        return ""
    return " | ".join(str(value) for value in values if value not in (None, ""))


def company_lookup(payload):
    lookup = {}
    sources = [
        payload.get("standard_role_graph", {}).get("companies", []),
        payload.get("primary_secondary_data", {}).get("bubbles", []),
        payload.get("emissions_ranking", {}).get("available", []),
    ]
    for rows in sources:
        for item in rows:
            company_id = item.get("company_id")
            if not company_id:
                continue
            existing = lookup.get(company_id, {})
            existing.update({k: v for k, v in item.items() if v not in (None, "", [])})
            lookup[company_id] = existing
    return lookup


def subtype_text(cluster, lang):
    key = "label_zh" if lang == "zh" else "label_en"
    return " | ".join(
        f"{item.get(key) or item.get('label_en') or item.get('id')}: {item.get('evidence_count', 0)}"
        for item in cluster.get("subtypes", [])
    )


def sample_values(cluster, key):
    values = []
    for sample in cluster.get("evidence_samples", [])[:5]:
        value = sample.get(key)
        if value not in (None, ""):
            values.append(value)
    return join(values)


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def timeline_years(text):
    return sorted(set(re.findall(r"\b20[2-5]\d\b", clean(text))))


def has_cost_signal(text):
    return bool(re.search(
        r"cost|capex|investment|invest|spend|budget|\$|usd|eur|rmb|cny|million|billion|trillion|成本|投资|资本开支|预算|亿元|百万",
        clean(text),
        re.I,
    ))


def company_examples_by_id(cluster):
    return {
        item.get("company_id"): item
        for item in cluster.get("company_examples", [])
        if item.get("company_id")
    }


def company_specific_status(company_example):
    if not company_example:
        return "missing_company_specific_snippet"
    if not clean(company_example.get("sample_snippet_en") or company_example.get("sample_snippet_zh")):
        return "missing_company_specific_snippet"
    return "company_specific_disclosure_snippet"


def review_priority(cluster, company_example):
    status = company_specific_status(company_example)
    if status == "missing_company_specific_snippet":
        return "P0_backfill_company_specific_technology_evidence"
    snippet = clean(company_example.get("sample_snippet_en") or company_example.get("sample_snippet_zh"))
    years = timeline_years(snippet)
    cost_signal = has_cost_signal(snippet)
    if not years and not cost_signal:
        return "P1_validate_timeline_and_cost_signals"
    if not cost_signal:
        return "P1_validate_project_cost_signal"
    if not years:
        return "P1_validate_project_timeline_signal"
    return "P2_verify_company_disclosure_signal"


def queue_recommendation(priority):
    if priority == "P0_backfill_company_specific_technology_evidence":
        return {
            "queue_type": "company_specific_technology_evidence_backfill",
            "queue_priority": "P0",
            "recommended_action_en": "Find a company-specific PDF snippet for this technology path before treating the company-path edge as evidence-backed.",
            "recommended_action_zh": "先补回该企业对应该技术路径的 PDF 片段，再把企业-技术路径边视为有证据支撑。",
        }
    if priority == "P1_validate_timeline_and_cost_signals":
        return {
            "queue_type": "timeline_and_cost_signal_validation",
            "queue_priority": "P1",
            "recommended_action_en": "Review the company-specific snippet and backfill project-stage years and cost/investment signals if available.",
            "recommended_action_zh": "复核公司级片段，若原文可得则补回项目阶段年份和成本/投资信号。",
        }
    if priority == "P1_validate_project_cost_signal":
        return {
            "queue_type": "project_cost_signal_validation",
            "queue_priority": "P1",
            "recommended_action_en": "Backfill project-level cost, capex, investment, or budget evidence where the report discloses it.",
            "recommended_action_zh": "若报告披露项目级成本、资本开支、投资或预算，补回对应证据。",
        }
    if priority == "P1_validate_project_timeline_signal":
        return {
            "queue_type": "project_timeline_signal_validation",
            "queue_priority": "P1",
            "recommended_action_en": "Backfill project-stage years, target years, deployment periods, or implementation milestones where disclosed.",
            "recommended_action_zh": "若原文披露项目阶段年份、目标年份、部署周期或实施里程碑，补回对应证据。",
        }
    return {
        "queue_type": "company_disclosure_signal_verification",
        "queue_priority": "P2",
        "recommended_action_en": "Verify that the company-specific snippet truly supports this technology path and keep quantified reductions separate unless audited.",
        "recommended_action_zh": "核验公司级片段确实支撑该技术路径；除非审定，不把它提升为量化减排结论。",
    }


def project_missing_fields(row):
    missing = []
    for field in ["company_id", "technology_id", "evidence_page", "source_file", "snippet_en"]:
        if not clean(row.get(field)):
            missing.append(field)
    if not clean(row.get("project_name_en")) and not clean(row.get("measure_name_en")):
        missing.append("project_or_measure_name")
    return missing


def technology_name_lookup(payload):
    lookup = {}
    for cluster in payload.get("technology_paths", {}).get("clusters", []):
        lookup[cluster.get("id", "")] = cluster.get("name_en", "")
    return lookup


def project_evidence_rows(payload):
    names = technology_name_lookup(payload)
    rows = []
    invalid_rows = []
    for item in payload.get("technology_paths", {}).get("project_evidence", []):
        missing = project_missing_fields(item)
        row = {
            "validation_status": "valid_project_evidence" if not missing else "invalid_project_evidence_missing_required_fields",
            "missing_fields": join(missing),
            "evidence_boundary": item.get("evidence_boundary", "page_level_project_or_measure_evidence"),
            "technology_id": item.get("technology_id", ""),
            "technology_name_en": names.get(item.get("technology_id", ""), ""),
            "company_id": item.get("company_id", ""),
            "company_name_en": item.get("company_name_en", ""),
            "company_name_zh": item.get("company_name_zh", ""),
            "world500_rank": item.get("world500_rank", ""),
            "industry_section_code": item.get("industry_section_code", ""),
            "industry_section_en": item.get("industry_section_en", ""),
            "subtype_id": item.get("subtype_id", ""),
            "subtype_en": item.get("subtype_en", ""),
            "project_name_en": item.get("project_name_en", ""),
            "measure_name_en": item.get("measure_name_en", ""),
            "implementation_stage": item.get("implementation_stage", ""),
            "timeline_years": join(item.get("timeline_years", [])),
            "cost_or_investment_en": item.get("cost_or_investment_en", ""),
            "cost_or_investment_review_note_en": item.get("cost_or_investment_review_note_en", ""),
            "cost_evidence_status": item.get("cost_evidence_status", ""),
            "abatement_effect_en": item.get("abatement_effect_en", ""),
            "evidence_page": item.get("evidence_page", item.get("page", "")),
            "source_file": item.get("source_file", ""),
            "report_title_en": item.get("report_title_en", ""),
            "snippet_en": item.get("snippet_en", ""),
        }
        rows.append(row)
        if missing:
            invalid_rows.append(row)
    return rows, invalid_rows


def unique_join(values, limit=8):
    output = []
    seen = set()
    for value in values:
        text = clean(value)
        if not text or text in seen:
            continue
        output.append(text)
        seen.add(text)
        if len(output) >= limit:
            break
    return " | ".join(output)


def project_rows_by_edge(project_rows):
    grouped = {}
    for row in project_rows:
        if row.get("validation_status") != "valid_project_evidence":
            continue
        key = (row.get("company_id", ""), row.get("technology_id", ""))
        grouped.setdefault(key, []).append(row)
    return grouped


def project_upgrade_priority(row, valid_projects, candidate_decision=None):
    if valid_projects:
        return "P2_verify_existing_project_evidence_alignment"
    if candidate_decision and candidate_decision.get("decision_bucket") in {"review_only", "demoted"}:
        return "P2_keep_review_only_or_demoted_disclosure_signal"
    if row.get("company_specific_evidence_status") == "missing_company_specific_snippet":
        return "P0_backfill_company_specific_technology_evidence"
    has_year = bool(clean(row.get("company_timeline_years")))
    has_cost = row.get("company_cost_signal_present") == "yes"
    if has_year and has_cost:
        return "P1_extract_project_measure_and_abatement"
    if has_year:
        return "P1_backfill_project_cost_and_abatement"
    if has_cost:
        return "P1_backfill_project_timeline_and_abatement"
    return "P1_backfill_project_name_timeline_cost_abatement"


def project_upgrade_action(priority):
    actions = {
        "P2_verify_existing_project_evidence_alignment": (
            "A valid page-level project/measure record already exists for this company-technology edge. Verify alignment and keep the project layer separate from broader disclosure signals.",
            "该企业-技术边已有有效页级项目/措施记录。复核对齐关系，并保持项目证据层与更宽泛披露信号分离。",
            "P2",
        ),
        "P0_backfill_company_specific_technology_evidence": (
            "Find a company-specific PDF snippet first; without it this edge remains a cluster-level disclosure signal and cannot become project evidence.",
            "先补公司级 PDF 片段；没有公司级片段时，该边只能保留为聚类披露信号，不能升级为项目证据。",
            "P0",
        ),
        "P1_extract_project_measure_and_abatement": (
            "The snippet has timeline and cost/investment signals. Extract the project or measure name, page/source binding, and any abatement effect before project-level use.",
            "片段已有时间和成本/投资信号。项目级使用前，需要抽取项目/措施名称、页码/来源绑定，以及可能的减排效果。",
            "P1",
        ),
        "P1_backfill_project_cost_and_abatement": (
            "The snippet has timeline signals. Backfill cost/investment and abatement-effect evidence if disclosed, otherwise keep those fields explicitly blank.",
            "片段已有时间信号。若原文披露成本/投资和减排效果则补齐；未披露时字段必须明确留空。",
            "P1",
        ),
        "P1_backfill_project_timeline_and_abatement": (
            "The snippet has a cost/investment signal. Backfill implementation timeline and abatement-effect evidence if disclosed.",
            "片段已有成本/投资信号。若原文披露实施时间线和减排效果则补齐。",
            "P1",
        ),
    }
    if priority == "P2_keep_review_only_or_demoted_disclosure_signal":
        return (
            "This company-technology edge has been reviewed and is not eligible for project evidence without new page-level evidence. Keep it out of the strong project graph.",
            "该企业-技术边已复核；没有新的页级项目/措施证据前，不得进入强项目证据图。",
            "P2",
        )
    return actions.get(priority, (
        "Backfill project or measure name, page/source binding, implementation stage, timeline, cost/investment, and abatement effect before treating this as project evidence.",
        "补齐项目/措施名称、页码/来源绑定、实施阶段、时间线、成本/投资和减排效果后，才可作为项目证据。",
        "P1",
    ))


def missing_project_gate_fields(row, valid_projects, candidate_decision=None):
    if valid_projects:
        return ""
    if candidate_decision and candidate_decision.get("decision_bucket") in {"review_only", "demoted"}:
        return clean(candidate_decision.get("missing_to_project_gate")) or "new_page_level_project_or_measure_evidence"
    missing = ["project_or_measure_name", "page_source_binding", "implementation_stage"]
    if not clean(row.get("company_timeline_years")):
        missing.append("timeline_years")
    if row.get("company_cost_signal_present") != "yes":
        missing.append("cost_or_investment")
    missing.append("abatement_effect")
    if row.get("company_specific_evidence_status") == "missing_company_specific_snippet":
        missing.insert(0, "company_specific_pdf_snippet")
    return " | ".join(missing)


def build_project_upgrade_rows(audit_rows, project_rows, candidate_decisions):
    by_edge = project_rows_by_edge(project_rows)
    rows = []
    for row in audit_rows:
        edge_key = (row.get("company_id", ""), row.get("technology_id", ""))
        valid_projects = by_edge.get(edge_key, [])
        candidate_decision = candidate_decisions.get(edge_key, {})
        priority = project_upgrade_priority(row, valid_projects, candidate_decision)
        action_en, action_zh, queue_priority = project_upgrade_action(priority)
        has_company_snippet = row.get("company_specific_evidence_status") != "missing_company_specific_snippet"
        rows.append({
            "review_priority": priority,
            "queue_priority": queue_priority,
            "auto_promote_allowed": "false",
            "recommended_action_en": action_en,
            "recommended_action_zh": action_zh,
            "technology_id": row.get("technology_id", ""),
            "technology_name_en": row.get("technology_name_en", ""),
            "company_id": row.get("company_id", ""),
            "company_name_en": row.get("company_name_en", ""),
            "company_name_zh": row.get("company_name_zh", ""),
            "world500_rank": row.get("world500_rank", ""),
            "industry_section_code": row.get("industry_section_code", ""),
            "industry_section_en": row.get("industry_section_en", ""),
            "current_signal_status": row.get("company_specific_evidence_status", ""),
            "validated_project_evidence_count": len(valid_projects),
            "validated_project_names_en": unique_join([
                project.get("project_name_en") or project.get("measure_name_en")
                for project in valid_projects
            ]),
            "validated_project_pages": unique_join([project.get("evidence_page") for project in valid_projects]),
            "validated_project_source_files": unique_join([project.get("source_file") for project in valid_projects], limit=4),
            "missing_to_project_gate": missing_project_gate_fields(row, valid_projects, candidate_decision),
            "company_timeline_years": row.get("company_timeline_years", ""),
            "company_cost_signal_present": row.get("company_cost_signal_present", ""),
            "company_evidence_count": row.get("company_evidence_count", ""),
            "candidate_decision_bucket": candidate_decision.get("decision_bucket", ""),
            "candidate_decision_status": candidate_decision.get("decision_status", ""),
            "candidate_decision_rationale_en": candidate_decision.get("decision_rationale_en", ""),
            "candidate_decision_rationale_zh": candidate_decision.get("decision_rationale_zh", ""),
            "evidence_boundary": "upgrade_queue_only_disclosure_signal_until_project_gate_passes",
            "sample_pages": row.get("sample_pages", "") if has_company_snippet else "",
            "sample_source_files": row.get("sample_source_files", "") if has_company_snippet else "",
            "company_sample_snippet_en": row.get("company_sample_snippet_en", "")[:1800],
        })
    order = {"P0": 0, "P1": 1, "P2": 2}
    rows.sort(key=lambda item: (
        order.get(item["queue_priority"], 9),
        item["review_priority"],
        item["technology_id"],
        int(item["world500_rank"] or 9999),
        item["company_id"],
    ))
    return rows


def main():
    payload = load_payload()
    candidate_decisions = load_candidate_decisions()
    lookup = company_lookup(payload)
    rows = []
    queue_rows = []
    company_evidence_queue_rows = []
    timeline_queue_rows = []
    cost_queue_rows = []
    for cluster in payload.get("technology_paths", {}).get("clusters", []):
        timeline = cluster.get("timeline_counts") or {}
        examples = company_examples_by_id(cluster)
        for company_id in cluster.get("company_ids", []):
            company = lookup.get(company_id, {})
            company_example = examples.get(company_id, {})
            company_snippet = clean(company_example.get("sample_snippet_en") or company_example.get("sample_snippet_zh"))
            years = timeline_years(company_snippet)
            priority = review_priority(cluster, company_example)
            row = {
                "review_priority": priority,
                "evidence_boundary": "disclosure_keyword_signal_not_project_cost_or_verified_abatement",
                "technology_id": cluster.get("id", ""),
                "technology_name_en": cluster.get("name_en", ""),
                "technology_name_zh": cluster.get("name_zh", ""),
                "company_id": company_id,
                "company_name_en": company.get("company_name_en", ""),
                "company_name_zh": company.get("company_name_zh", ""),
                "world500_rank": company.get("world500_rank", ""),
                "industry_section_code": company.get("industry_section_code", ""),
                "industry_section_en": company.get("industry_section_en", ""),
                "industry_section_zh": company.get("industry_section_zh", ""),
                "company_count_in_cluster": cluster.get("company_count", 0),
                "cluster_evidence_count": cluster.get("evidence_count", 0),
                "cluster_cost_signal_count": cluster.get("cost_signal_count", 0),
                "timeline_near_count": timeline.get("near", 0),
                "timeline_mid_count": timeline.get("mid", 0),
                "timeline_long_count": timeline.get("long", 0),
                "subtypes_en": subtype_text(cluster, "en"),
                "subtypes_zh": subtype_text(cluster, "zh"),
                "standards_en": join(cluster.get("standards_en", [])),
                "standards_zh": join(cluster.get("standards_zh", [])),
                "sample_pages": sample_values(cluster, "page"),
                "sample_source_files": sample_values(cluster, "source_file"),
                "company_evidence_count": company_example.get("evidence_count", 0),
                "company_sample_snippet_en": company_snippet,
                "company_timeline_years": join(years),
                "company_cost_signal_present": "yes" if has_cost_signal(company_snippet) else "no",
                "company_specific_evidence_status": company_specific_status(company_example),
                "sample_snippets_en": sample_values(cluster, "snippet_en"),
            }
            rows.append(row)
            recommendation = queue_recommendation(priority)
            queue_rows.append({
                **recommendation,
                **row,
            })
            queued_row = {
                **recommendation,
                **row,
            }
            if priority == "P0_backfill_company_specific_technology_evidence":
                company_evidence_queue_rows.append(queued_row)
            if priority in {"P1_validate_timeline_and_cost_signals", "P1_validate_project_timeline_signal"}:
                timeline_queue_rows.append(queued_row)
            if priority in {"P1_validate_timeline_and_cost_signals", "P1_validate_project_cost_signal"}:
                cost_queue_rows.append(queued_row)

    rows.sort(key=lambda row: (
        {
            "P0_backfill_company_specific_technology_evidence": 0,
            "P1_validate_timeline_and_cost_signals": 1,
            "P1_validate_project_cost_signal": 2,
            "P1_validate_project_timeline_signal": 3,
            "P2_verify_company_disclosure_signal": 4,
        }.get(row["review_priority"], 9),
        row["technology_id"],
        int(row["world500_rank"] or 9999),
        row["company_id"],
    ))
    with OUTPUT_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    queue_rows.sort(key=lambda row: (
        {"P0": 0, "P1": 1, "P2": 2}.get(row["queue_priority"], 9),
        row["technology_id"],
        int(row["world500_rank"] or 9999),
        row["company_id"],
    ))
    with VALIDATION_QUEUE_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=QUEUE_FIELDS)
        writer.writeheader()
        writer.writerows(queue_rows)
    for path, split_rows in [
        (COMPANY_EVIDENCE_QUEUE_FILE, company_evidence_queue_rows),
        (TIMELINE_QUEUE_FILE, timeline_queue_rows),
        (COST_QUEUE_FILE, cost_queue_rows),
    ]:
        split_rows.sort(key=lambda row: (
            row["technology_id"],
            int(row["world500_rank"] or 9999),
            row["company_id"],
        ))
        with path.open("w", encoding="utf-8-sig", newline="") as output:
            writer = csv.DictWriter(output, fieldnames=QUEUE_FIELDS)
            writer.writeheader()
            writer.writerows(split_rows)
    project_rows, invalid_project_rows = project_evidence_rows(payload)
    project_upgrade_rows = build_project_upgrade_rows(rows, project_rows, candidate_decisions)
    project_rows.sort(key=lambda row: (
        row["validation_status"],
        row["technology_id"],
        int(row["world500_rank"] or 9999),
        row["company_id"],
    ))
    with PROJECT_EVIDENCE_AUDIT_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=PROJECT_FIELDS)
        writer.writeheader()
        writer.writerows(project_rows)
    with PROJECT_EVIDENCE_INVALID_QUEUE_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=PROJECT_FIELDS)
        writer.writeheader()
        writer.writerows(invalid_project_rows)
    with PROJECT_UPGRADE_QUEUE_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=PROJECT_UPGRADE_FIELDS)
        writer.writeheader()
        writer.writerows(project_upgrade_rows)
    PROJECT_UPGRADE_QUEUE_JSON.write_text(json.dumps({
        "schema_version": "world500-technology-project-upgrade-queue-v1",
        "policy": "Diagnostic queue only. Disclosure signals are not promoted to project evidence until project/measure name, page/source binding, implementation stage, timeline, cost/investment, and abatement-effect fields are reviewed.",
        "auto_promote_allowed": False,
        "row_count": len(project_upgrade_rows),
        "review_priority_counts": {
            key: sum(1 for row in project_upgrade_rows if row["review_priority"] == key)
            for key in sorted({row["review_priority"] for row in project_upgrade_rows})
        },
        "queue_priority_counts": {
            key: sum(1 for row in project_upgrade_rows if row["queue_priority"] == key)
            for key in sorted({row["queue_priority"] for row in project_upgrade_rows})
        },
        "rows": project_upgrade_rows,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")
    print(f"Wrote {VALIDATION_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {COMPANY_EVIDENCE_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {TIMELINE_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {COST_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {PROJECT_EVIDENCE_AUDIT_FILE.relative_to(ROOT)}")
    print(f"Wrote {PROJECT_EVIDENCE_INVALID_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {PROJECT_UPGRADE_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {PROJECT_UPGRADE_QUEUE_JSON.relative_to(ROOT)}")
    print(json.dumps({
        "row_count": len(rows),
        "technology_cluster_count": len(payload.get("technology_paths", {}).get("clusters", [])),
        "unique_company_count": len({row["company_id"] for row in rows}),
        "project_evidence_rows": len(project_rows),
        "valid_project_evidence_rows": sum(1 for row in project_rows if row["validation_status"] == "valid_project_evidence"),
        "invalid_project_evidence_rows": len(invalid_project_rows),
        "p0_company_specific_backfill_rows": sum(1 for row in rows if row["review_priority"] == "P0_backfill_company_specific_technology_evidence"),
        "p1_timeline_cost_validation_rows": sum(1 for row in rows if row["review_priority"].startswith("P1_")),
        "company_evidence_queue_rows": len(company_evidence_queue_rows),
        "timeline_validation_queue_rows": len(timeline_queue_rows),
        "cost_validation_queue_rows": len(cost_queue_rows),
        "project_upgrade_queue_rows": len(project_upgrade_rows),
        "project_upgrade_p0_rows": sum(1 for row in project_upgrade_rows if row["queue_priority"] == "P0"),
        "project_upgrade_p1_rows": sum(1 for row in project_upgrade_rows if row["queue_priority"] == "P1"),
        "project_upgrade_p2_rows": sum(1 for row in project_upgrade_rows if row["queue_priority"] == "P2"),
        "p2_company_disclosure_verification_rows": sum(1 for row in rows if row["review_priority"] == "P2_verify_company_disclosure_signal"),
        "keyword_boundary": "cost/timeline are disclosure signals, not verified project economics",
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
