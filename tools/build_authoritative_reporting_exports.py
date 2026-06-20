import csv
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_VIEWS = WORKBENCH / "reporting_views.json"

GHG_ACCEPTED_CSV = WORKBENCH / "world500_ghg_accepted_series_mapping.csv"
GHG_ACCEPTED_JSON = WORKBENCH / "world500_ghg_accepted_series_mapping.json"
GHG_REVIEW_CSV = WORKBENCH / "world500_ghg_review_series_mapping.csv"
GHG_REVIEW_JSON = WORKBENCH / "world500_ghg_review_series_mapping.json"
GHG_OUT_OF_WHITELIST_CSV = WORKBENCH / "world500_ghg_out_of_whitelist_series_review.csv"
GHG_OUT_OF_WHITELIST_JSON = WORKBENCH / "world500_ghg_out_of_whitelist_series_review.json"
EMISSIONS_COMPLETE_CSV = WORKBENCH / "world500_emissions_complete_comparable_ranking.csv"
EMISSIONS_COMPLETE_JSON = WORKBENCH / "world500_emissions_complete_comparable_ranking.json"
EMISSIONS_PARTIAL_CSV = WORKBENCH / "world500_emissions_partial_ranking_review.csv"
EMISSIONS_PARTIAL_JSON = WORKBENCH / "world500_emissions_partial_ranking_review.json"
TECHNOLOGY_REVIEW_CSV = WORKBENCH / "world500_technology_path_disclosure_signal_review.csv"
TECHNOLOGY_REVIEW_JSON = WORKBENCH / "world500_technology_path_disclosure_signal_review.json"
SOURCE_EXPLICIT_CSV = WORKBENCH / "world500_primary_secondary_explicit_primary_ratio.csv"
SOURCE_EXPLICIT_JSON = WORKBENCH / "world500_primary_secondary_explicit_primary_ratio.json"
SOURCE_INFERRED_CSV = WORKBENCH / "world500_primary_secondary_source_mix_inference_review.csv"
SOURCE_INFERRED_JSON = WORKBENCH / "world500_primary_secondary_source_mix_inference_review.json"
SUMMARY_JSON = WORKBENCH / "world500_authoritative_reporting_exports_summary.json"


GHG_FIELDS = [
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "series_id",
    "series_name_en",
    "series_name_zh",
    "category_en",
    "category_zh",
    "role_en",
    "role_zh",
    "principle_en",
    "principle_zh",
    "language_policy_en",
    "language_policy_zh",
    "match_status",
    "evidence_gate",
    "matched_aliases",
    "evidence_count",
    "pages",
    "source_files",
    "sample_review_status",
    "sample_confidence",
    "sample_snippet_en",
    "sample_snippet_zh",
    "recommended_use_en",
    "recommended_use_zh",
]

EMISSIONS_FIELDS = [
    "ranking_type",
    "rank",
    "available_rank",
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "total_mtco2e",
    "scope1_mtco2e",
    "scope2_mtco2e",
    "scope2_method_en",
    "scope3_mtco2e",
    "scope3_boundary_class_en",
    "scope3_boundary_basis_en",
    "selected_evidence_missing_elements",
    "inventory_years",
    "completeness_key",
    "completeness_en",
    "completeness_zh",
    "missing_scopes",
    "strong_row_count",
    "review_required_row_count",
    "conflict_excluded_row_count",
    "duplicate_scope_candidate_count",
    "selected_evidence_pages",
    "selected_source_files",
    "selected_scope_rows",
    "recommended_use_en",
    "recommended_use_zh",
]

TECHNOLOGY_FIELDS = [
    "cluster_id",
    "cluster_name_en",
    "cluster_name_zh",
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "standards_en",
    "standards_zh",
    "subtypes_en",
    "subtypes_zh",
    "timeline_near_signal_count",
    "timeline_mid_signal_count",
    "timeline_long_signal_count",
    "cost_signal_count",
    "cluster_evidence_count",
    "company_example_evidence_count",
    "sample_snippet_en",
    "sample_snippet_zh",
    "recommended_use_en",
    "recommended_use_zh",
]

SOURCE_MIX_FIELDS = [
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "ratio_basis_key",
    "ratio_basis_en",
    "ratio_basis_zh",
    "reported_primary_percent",
    "reported_primary_scope_en",
    "reported_primary_scope_zh",
    "reported_primary_basis_en",
    "reported_primary_basis_zh",
    "primary_ratio_known",
    "secondary_ratio_known",
    "primary_ratio_all",
    "source_mix_primary_ratio_known",
    "source_mix_secondary_ratio_known",
    "primary_count",
    "secondary_count",
    "mixed_count",
    "unknown_count",
    "method_evidence_count",
    "known_source_evidence_count",
    "unknown_ratio",
    "total_mtco2e",
    "strong_scope_row_count",
    "sample_review_status",
    "sample_confidence",
    "sample_snippet_en",
    "sample_snippet_zh",
    "recommended_use_en",
    "recommended_use_zh",
]


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path, rows, fields):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def join_values(values):
    if not isinstance(values, list):
        values = [values]
    cleaned = []
    seen = set()
    for value in values:
        text = clean(value)
        if text and text not in seen:
            cleaned.append(text)
            seen.add(text)
    return " | ".join(cleaned)


def first_sample(series):
    samples = series.get("evidence_samples")
    return samples[0] if isinstance(samples, list) and samples else {}


def series_definition_map(reporting):
    definitions = reporting.get("ghg_standard_series", {}).get("definitions", [])
    return {item.get("id"): item for item in definitions}


def ghg_row(company, series, definitions, accepted):
    definition = definitions.get(series.get("series_id"), {})
    sample = first_sample(series)
    if accepted:
        recommended_use_en = "Accepted standard-company edge: source evidence explicitly names this GHG Protocol fine series."
        recommended_use_zh = "可采信标准-企业关系：原文证据明确命名该 GHG Protocol 细分系列。"
    else:
        recommended_use_en = "Review only: keep out of accepted standard-company conclusions until page-level evidence explicitly names the series."
        recommended_use_zh = "仅供复核：页级证据明确命名具体系列前，不进入已采信标准-企业结论。"
    return {
        "company_id": company.get("company_id", ""),
        "world500_rank": company.get("world500_rank", ""),
        "company_name_en": company.get("company_name_en", ""),
        "company_name_zh": company.get("company_name_zh", ""),
        "industry_section_code": company.get("industry_section_code", ""),
        "industry_section_en": company.get("industry_section_en", ""),
        "industry_section_zh": company.get("industry_section_zh", ""),
        "series_id": series.get("series_id", ""),
        "series_name_en": series.get("name_en", ""),
        "series_name_zh": series.get("name_zh", ""),
        "category_en": series.get("category_en", ""),
        "category_zh": series.get("category_zh", ""),
        "role_en": definition.get("role_en", ""),
        "role_zh": definition.get("role_zh", ""),
        "principle_en": definition.get("principle_en", ""),
        "principle_zh": definition.get("principle_zh", ""),
        "language_policy_en": definition.get("language_policy_en", ""),
        "language_policy_zh": definition.get("language_policy_zh", ""),
        "match_status": series.get("match_status", ""),
        "evidence_gate": series.get("evidence_gate", ""),
        "matched_aliases": join_values(series.get("matched_aliases", [])),
        "evidence_count": series.get("evidence_count", 0),
        "pages": join_values(series.get("pages", [])),
        "source_files": join_values(series.get("source_files", [])),
        "sample_review_status": sample.get("review_status", ""),
        "sample_confidence": sample.get("confidence", ""),
        "sample_snippet_en": sample.get("snippet_en", ""),
        "sample_snippet_zh": sample.get("snippet_zh", ""),
        "recommended_use_en": recommended_use_en,
        "recommended_use_zh": recommended_use_zh,
    }


def build_ghg_exports(reporting):
    definitions = series_definition_map(reporting)
    core_series_ids = set(definitions)
    accepted = []
    review = []
    out_of_whitelist = []
    for company in reporting.get("ghg_standard_series", {}).get("company_mappings", []):
        for series in company.get("series", []):
            series_id = series.get("series_id")
            if series_id not in core_series_ids:
                out_of_whitelist.append(ghg_row(company, series, definitions, False))
            elif series_id == "ghg_generic_reference":
                out_of_whitelist.append(ghg_row(company, series, definitions, False))
            elif series.get("match_status") == "explicit_series_citation":
                accepted.append(ghg_row(company, series, definitions, True))
            else:
                review.append(ghg_row(company, series, definitions, False))

    accepted.sort(key=lambda row: (int(row["world500_rank"] or 999999), row["company_id"], row["series_id"]))
    review.sort(key=lambda row: (int(row["world500_rank"] or 999999), row["company_id"], row["series_id"]))
    out_of_whitelist.sort(key=lambda row: (int(row["world500_rank"] or 999999), row["company_id"], row["series_id"]))
    return accepted, review, out_of_whitelist


def selected_scope_rows(row):
    rows = []
    for item in row.get("selected_rows", []):
        scope = item.get("scope_en", "")
        value = item.get("value_mtco2e", "")
        year = item.get("inventory_year", "")
        method = item.get("scope2_reporting_method", "")
        scope3_boundary = item.get("scope3_boundary_class_en", "")
        unit = item.get("unit_evidence_en") or item.get("unit_en", "")
        boundary = item.get("boundary_class_en") or item.get("boundary_en", "")
        evidence_status = item.get("evidence_element_status", "")
        page = item.get("evidence_page", "")
        source = item.get("source_file", "")
        boundary_part = f"; scope3_boundary={scope3_boundary}" if scope3_boundary else ""
        unit_part = f"; unit={unit}" if unit else ""
        row_boundary_part = f"; boundary={boundary}" if boundary else ""
        status_part = f"; evidence_status={evidence_status}" if evidence_status else ""
        rows.append(f"{scope}:{value} MtCO2e; year={year}; method={method}{unit_part}{row_boundary_part}{boundary_part}{status_part}; page={page}; source={source}")
    return " || ".join(rows)


def emissions_row(row, ranking_type, rank):
    complete = ranking_type == "complete_comparable"
    if complete:
        recommended_use_en = "Accepted comparable ranking row: complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence total."
        recommended_use_zh = "可采信可比排行行：Scope 1 + 选定 Scope 2 + Scope 3 均通过强证据门禁。"
    else:
        recommended_use_en = "Review only: partial total must not be mixed into the complete comparable ranking."
        recommended_use_zh = "仅供复核：部分总量不得混入完整可比排行。"
    return {
        "ranking_type": ranking_type,
        "rank": rank,
        "available_rank": row.get("available_rank", ""),
        "company_id": row.get("company_id", ""),
        "world500_rank": row.get("world500_rank", ""),
        "company_name_en": row.get("company_name_en", ""),
        "company_name_zh": row.get("company_name_zh", ""),
        "industry_section_code": row.get("industry_section_code", ""),
        "industry_section_en": row.get("industry_section_en", ""),
        "industry_section_zh": row.get("industry_section_zh", ""),
        "total_mtco2e": row.get("total_mtco2e", ""),
        "scope1_mtco2e": row.get("scope1_mtco2e", ""),
        "scope2_mtco2e": row.get("scope2_mtco2e", ""),
        "scope2_method_en": row.get("scope2_method_en", ""),
        "scope3_mtco2e": row.get("scope3_mtco2e", ""),
        "scope3_boundary_class_en": row.get("scope3_boundary_class_en", ""),
        "scope3_boundary_basis_en": row.get("scope3_boundary_basis_en", ""),
        "selected_evidence_missing_elements": join_values(row.get("selected_evidence_missing_elements", [])),
        "inventory_years": join_values(row.get("inventory_years", [])),
        "completeness_key": row.get("completeness_key", ""),
        "completeness_en": row.get("completeness_en", ""),
        "completeness_zh": row.get("completeness_zh", ""),
        "missing_scopes": join_values(row.get("missing_scopes", [])),
        "strong_row_count": row.get("strong_row_count", 0),
        "review_required_row_count": row.get("review_required_row_count", 0),
        "conflict_excluded_row_count": row.get("conflict_excluded_row_count", 0),
        "duplicate_scope_candidate_count": row.get("duplicate_scope_candidate_count", 0),
        "selected_evidence_pages": join_values(row.get("selected_evidence_pages", [])),
        "selected_source_files": join_values(row.get("selected_source_files", [])),
        "selected_scope_rows": selected_scope_rows(row),
        "recommended_use_en": recommended_use_en,
        "recommended_use_zh": recommended_use_zh,
    }


def build_emissions_exports(reporting):
    ranking = reporting.get("emissions_ranking", {})
    complete_rows = [
        emissions_row(row, "complete_comparable", row.get("complete_rank") or index)
        for index, row in enumerate(ranking.get("complete", []), start=1)
    ]
    complete_ids = {row["company_id"] for row in complete_rows}
    partial_rows = [
        emissions_row(row, "partial_review", row.get("available_rank") or index)
        for index, row in enumerate(ranking.get("available", []), start=1)
        if row.get("company_id") not in complete_ids
    ]
    complete_rows.sort(key=lambda row: int(row["rank"] or 999999))
    partial_rows.sort(key=lambda row: int(row["rank"] or 999999))
    return complete_rows, partial_rows


def collect_company_index(reporting):
    companies = {}

    def add(company):
        company_id = clean(company.get("company_id", ""))
        if not company_id:
            return
        current = companies.get(company_id, {})
        merged = dict(current)
        for key, value in company.items():
            if clean(value) and not clean(merged.get(key, "")):
                merged[key] = value
        companies[company_id] = merged

    for company in reporting.get("standard_role_graph", {}).get("companies", []):
        add(company)
    for company in reporting.get("ghg_standard_series", {}).get("company_mappings", []):
        add(company)
    for row in reporting.get("emissions_ranking", {}).get("available", []):
        add(row)
    for row in reporting.get("primary_secondary_data", {}).get("bubbles", []):
        add(row)
    return companies


def subtype_labels(cluster, key):
    labels = []
    for item in cluster.get("subtypes", []):
        label = item.get(key, "")
        count = item.get("evidence_count", "")
        labels.append(f"{label}:{count}" if label else "")
    return join_values(labels)


def build_technology_exports(reporting):
    company_index = collect_company_index(reporting)
    rows = []
    for cluster in reporting.get("technology_paths", {}).get("clusters", []):
        example_index = {
            item.get("company_id"): item
            for item in cluster.get("company_examples", [])
            if item.get("company_id")
        }
        timeline = cluster.get("timeline_counts", {}) or {}
        for company_id in cluster.get("company_ids", []):
            company = company_index.get(company_id, {"company_id": company_id})
            example = example_index.get(company_id, {})
            rows.append({
                "cluster_id": cluster.get("id", ""),
                "cluster_name_en": cluster.get("name_en", ""),
                "cluster_name_zh": cluster.get("name_zh", ""),
                "company_id": company_id,
                "world500_rank": company.get("world500_rank", ""),
                "company_name_en": company.get("company_name_en", ""),
                "company_name_zh": company.get("company_name_zh", ""),
                "industry_section_code": company.get("industry_section_code", ""),
                "industry_section_en": company.get("industry_section_en", ""),
                "industry_section_zh": company.get("industry_section_zh", ""),
                "standards_en": join_values(cluster.get("standards_en", [])),
                "standards_zh": join_values(cluster.get("standards_zh", [])),
                "subtypes_en": subtype_labels(cluster, "label_en"),
                "subtypes_zh": subtype_labels(cluster, "label_zh"),
                "timeline_near_signal_count": timeline.get("near", 0),
                "timeline_mid_signal_count": timeline.get("mid", 0),
                "timeline_long_signal_count": timeline.get("long", 0),
                "cost_signal_count": cluster.get("cost_signal_count", 0),
                "cluster_evidence_count": cluster.get("evidence_count", 0),
                "company_example_evidence_count": example.get("evidence_count", ""),
                "sample_snippet_en": example.get("sample_snippet_en", ""),
                "sample_snippet_zh": example.get("sample_snippet_zh", ""),
                "recommended_use_en": "Review-only disclosure signal: do not treat as verified technology adoption, abatement, timeline, or cost evidence without company-level validation.",
                "recommended_use_zh": "仅供复核的披露信号：未经公司级验证前，不得作为已核实技术应用、减排量、时间线或成本证据。",
            })
    rows.sort(key=lambda row: (row["cluster_id"], int(row["world500_rank"] or 999999), row["company_id"]))
    return rows


def source_sample(row):
    samples = row.get("evidence_samples")
    return samples[0] if isinstance(samples, list) and samples else {}


def source_mix_row(row, accepted):
    sample = source_sample(row)
    if accepted:
        recommended_use_en = "Accepted source-ratio display row: company explicitly reports a primary-data percentage, still requiring calculation-weight validation before audit-grade use."
        recommended_use_zh = "可作为来源比例展示行：企业原文明示 primary data 百分比；用于审计级计算权重前仍需验证。"
    else:
        recommended_use_en = "Review only: ratio is inferred from method-row source mix or lacks explicit percentage; do not treat as audited calculation weight."
        recommended_use_zh = "仅供复核：比例来自方法行来源结构推断或缺少明示百分比，不得当作已审定计算权重。"
    return {
        "company_id": row.get("company_id", ""),
        "world500_rank": row.get("world500_rank", ""),
        "company_name_en": row.get("company_name_en", ""),
        "company_name_zh": row.get("company_name_zh", ""),
        "industry_section_code": row.get("industry_section_code", ""),
        "industry_section_en": row.get("industry_section_en", ""),
        "industry_section_zh": row.get("industry_section_zh", ""),
        "ratio_basis_key": row.get("ratio_basis_key", ""),
        "ratio_basis_en": row.get("ratio_basis_en", ""),
        "ratio_basis_zh": row.get("ratio_basis_zh", ""),
        "reported_primary_percent": row.get("reported_primary_percent", ""),
        "reported_primary_scope_en": row.get("reported_primary_scope_en", ""),
        "reported_primary_scope_zh": row.get("reported_primary_scope_zh", ""),
        "reported_primary_basis_en": row.get("reported_primary_basis_en", ""),
        "reported_primary_basis_zh": row.get("reported_primary_basis_zh", ""),
        "primary_ratio_known": row.get("primary_ratio_known", ""),
        "secondary_ratio_known": row.get("secondary_ratio_known", ""),
        "primary_ratio_all": row.get("primary_ratio_all", ""),
        "source_mix_primary_ratio_known": row.get("source_mix_primary_ratio_known", ""),
        "source_mix_secondary_ratio_known": row.get("source_mix_secondary_ratio_known", ""),
        "primary_count": row.get("primary_count", 0),
        "secondary_count": row.get("secondary_count", 0),
        "mixed_count": row.get("mixed_count", 0),
        "unknown_count": row.get("unknown_count", 0),
        "method_evidence_count": row.get("method_evidence_count", 0),
        "known_source_evidence_count": row.get("known_source_evidence_count", 0),
        "unknown_ratio": row.get("unknown_ratio", ""),
        "total_mtco2e": row.get("total_mtco2e", ""),
        "strong_scope_row_count": row.get("strong_scope_row_count", 0),
        "sample_review_status": sample.get("review_status", ""),
        "sample_confidence": sample.get("confidence", ""),
        "sample_snippet_en": sample.get("snippet_en", ""),
        "sample_snippet_zh": sample.get("snippet_zh", ""),
        "recommended_use_en": recommended_use_en,
        "recommended_use_zh": recommended_use_zh,
    }


def build_source_mix_exports(reporting):
    explicit = []
    inferred = []
    for row in reporting.get("primary_secondary_data", {}).get("bubbles", []):
        if row.get("ratio_basis_key") == "explicit_reported_primary_percentage":
            explicit.append(source_mix_row(row, True))
        else:
            inferred.append(source_mix_row(row, False))
    explicit.sort(key=lambda row: (int(row["world500_rank"] or 999999), row["company_id"]))
    inferred.sort(key=lambda row: (int(row["world500_rank"] or 999999), row["company_id"]))
    return explicit, inferred


def output_ref(path):
    return f"assets/data/world500/workbench/{path.name}"


def main():
    reporting = read_json(REPORTING_VIEWS)
    accepted_ghg, review_ghg, out_of_whitelist_ghg = build_ghg_exports(reporting)
    complete_emissions, partial_emissions = build_emissions_exports(reporting)
    technology_review = build_technology_exports(reporting)
    source_explicit, source_inferred = build_source_mix_exports(reporting)

    write_csv(GHG_ACCEPTED_CSV, accepted_ghg, GHG_FIELDS)
    write_json(GHG_ACCEPTED_JSON, {
        "schema_version": "world500-ghg-accepted-series-mapping-v1",
        "generated_at": now_iso(),
        "policy_en": "Only explicit_series_citation rows are accepted standard-company GHG Protocol fine-series relationships.",
        "policy_zh": "仅 explicit_series_citation 行可作为已采信的企业-GHG Protocol 细分标准关系。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(accepted_ghg),
        "rows": accepted_ghg,
    })

    write_csv(GHG_REVIEW_CSV, review_ghg, GHG_FIELDS)
    write_json(GHG_REVIEW_JSON, {
        "schema_version": "world500-ghg-review-series-mapping-v1",
        "generated_at": now_iso(),
        "policy_en": "Contextual and overmapped mappings for the controlled 12-item GHG/PCAF whitelist remain review-only and must not be used as accepted relationships.",
        "policy_zh": "12 项 GHG/PCAF 受控白名单内的上下文和疑似过度映射关系仅供复核，不得作为已采信关系使用。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(review_ghg),
        "rows": review_ghg,
    })

    write_csv(GHG_OUT_OF_WHITELIST_CSV, out_of_whitelist_ghg, GHG_FIELDS)
    write_json(GHG_OUT_OF_WHITELIST_JSON, {
        "schema_version": "world500-ghg-out-of-whitelist-series-review-v1",
        "generated_at": now_iso(),
        "policy_en": "Rows mention GHG Protocol-derived, programmatic, sector, or generic references outside the controlled 12-item GHG/PCAF whitelist. They are isolated from core fine-series accepted/review exports and must not be promoted unless the whitelist is explicitly expanded.",
        "policy_zh": "这些行涉及 12 项 GHG/PCAF 受控白名单之外的 GHG Protocol 衍生、项目化、行业或泛化引用。它们已与核心细分系列可采信/复核导出隔离；除非明确扩展白名单，不得提升为核心细分标准关系。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(out_of_whitelist_ghg),
        "rows": out_of_whitelist_ghg,
    })

    write_csv(EMISSIONS_COMPLETE_CSV, complete_emissions, EMISSIONS_FIELDS)
    write_json(EMISSIONS_COMPLETE_JSON, {
        "schema_version": "world500-emissions-complete-comparable-ranking-v1",
        "generated_at": now_iso(),
        "policy_en": "Only complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence rows are included.",
        "policy_zh": "仅包含 Scope 1 + 选定 Scope 2 + Scope 3 均通过强证据门禁的完整可比排行行。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(complete_emissions),
        "rows": complete_emissions,
    })

    write_csv(EMISSIONS_PARTIAL_CSV, partial_emissions, EMISSIONS_FIELDS)
    write_json(EMISSIONS_PARTIAL_JSON, {
        "schema_version": "world500-emissions-partial-ranking-review-v1",
        "generated_at": now_iso(),
        "policy_en": "Partial totals are exported for review only and are excluded from the complete comparable ranking.",
        "policy_zh": "部分总量仅供复核，已从完整可比排行中排除。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(partial_emissions),
        "rows": partial_emissions,
    })

    write_csv(TECHNOLOGY_REVIEW_CSV, technology_review, TECHNOLOGY_FIELDS)
    write_json(TECHNOLOGY_REVIEW_JSON, {
        "schema_version": "world500-technology-path-disclosure-signal-review-v1",
        "generated_at": now_iso(),
        "policy_en": "Technology-path rows are disclosure signals only and are not verified project adoption, abatement, timeline, or cost evidence.",
        "policy_zh": "技术路径行仅为披露信号，不是已核实的项目采用、减排量、时间线或成本证据。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(technology_review),
        "rows": technology_review,
    })

    write_csv(SOURCE_EXPLICIT_CSV, source_explicit, SOURCE_MIX_FIELDS)
    write_json(SOURCE_EXPLICIT_JSON, {
        "schema_version": "world500-primary-secondary-explicit-primary-ratio-v1",
        "generated_at": now_iso(),
        "policy_en": "Rows use an explicitly reported primary-data percentage; calculation-weight validation is still required before audit-grade use.",
        "policy_zh": "这些行使用原文明示 primary data 百分比；用于审计级计算权重前仍需验证。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(source_explicit),
        "rows": source_explicit,
    })

    write_csv(SOURCE_INFERRED_CSV, source_inferred, SOURCE_MIX_FIELDS)
    write_json(SOURCE_INFERRED_JSON, {
        "schema_version": "world500-primary-secondary-source-mix-inference-review-v1",
        "generated_at": now_iso(),
        "policy_en": "Rows are source-mix inference or non-explicit ratios and must not be treated as audited primary-data calculation weights.",
        "policy_zh": "这些行为来源结构推断或非明示比例，不得当作已审定 primary data 计算权重。",
        "source": output_ref(REPORTING_VIEWS),
        "row_count": len(source_inferred),
        "rows": source_inferred,
    })

    summary = {
        "schema_version": "world500-authoritative-reporting-exports-summary-v1",
        "generated_at": now_iso(),
        "source": output_ref(REPORTING_VIEWS),
        "policy_en": "Accepted exports are separated from review-only exports to prevent contextual evidence from being misread as conclusions.",
        "policy_zh": "将可采信导出与仅复核导出分离，避免把上下文证据误读为结论。",
        "exports": {
            "ghg_accepted_series_mapping": {
                "csv": output_ref(GHG_ACCEPTED_CSV),
                "json": output_ref(GHG_ACCEPTED_JSON),
                "row_count": len(accepted_ghg),
            },
            "ghg_review_series_mapping": {
                "csv": output_ref(GHG_REVIEW_CSV),
                "json": output_ref(GHG_REVIEW_JSON),
                "row_count": len(review_ghg),
            },
            "ghg_out_of_whitelist_series_review": {
                "csv": output_ref(GHG_OUT_OF_WHITELIST_CSV),
                "json": output_ref(GHG_OUT_OF_WHITELIST_JSON),
                "row_count": len(out_of_whitelist_ghg),
            },
            "emissions_complete_comparable_ranking": {
                "csv": output_ref(EMISSIONS_COMPLETE_CSV),
                "json": output_ref(EMISSIONS_COMPLETE_JSON),
                "row_count": len(complete_emissions),
            },
            "emissions_partial_ranking_review": {
                "csv": output_ref(EMISSIONS_PARTIAL_CSV),
                "json": output_ref(EMISSIONS_PARTIAL_JSON),
                "row_count": len(partial_emissions),
            },
            "technology_path_disclosure_signal_review": {
                "csv": output_ref(TECHNOLOGY_REVIEW_CSV),
                "json": output_ref(TECHNOLOGY_REVIEW_JSON),
                "row_count": len(technology_review),
            },
            "primary_secondary_explicit_primary_ratio": {
                "csv": output_ref(SOURCE_EXPLICIT_CSV),
                "json": output_ref(SOURCE_EXPLICIT_JSON),
                "row_count": len(source_explicit),
            },
            "primary_secondary_source_mix_inference_review": {
                "csv": output_ref(SOURCE_INFERRED_CSV),
                "json": output_ref(SOURCE_INFERRED_JSON),
                "row_count": len(source_inferred),
            },
        },
    }
    write_json(SUMMARY_JSON, summary)

    print(f"Wrote {output_ref(GHG_ACCEPTED_CSV)}")
    print(f"Wrote {output_ref(GHG_REVIEW_CSV)}")
    print(f"Wrote {output_ref(GHG_OUT_OF_WHITELIST_CSV)}")
    print(f"Wrote {output_ref(EMISSIONS_COMPLETE_CSV)}")
    print(f"Wrote {output_ref(EMISSIONS_PARTIAL_CSV)}")
    print(f"Wrote {output_ref(TECHNOLOGY_REVIEW_CSV)}")
    print(f"Wrote {output_ref(SOURCE_EXPLICIT_CSV)}")
    print(f"Wrote {output_ref(SOURCE_INFERRED_CSV)}")
    print(f"Wrote {output_ref(SUMMARY_JSON)}")
    print(json.dumps({
        "accepted_ghg_rows": len(accepted_ghg),
        "review_ghg_rows": len(review_ghg),
        "out_of_whitelist_ghg_rows": len(out_of_whitelist_ghg),
        "complete_emissions_rows": len(complete_emissions),
        "partial_emissions_rows": len(partial_emissions),
        "technology_review_rows": len(technology_review),
        "source_explicit_rows": len(source_explicit),
        "source_inferred_rows": len(source_inferred),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
