import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_FILE = WORKBENCH / "reporting_views.json"
OUTPUT_FILE = WORKBENCH / "world500_primary_secondary_source_mix_audit.csv"
CLASSIFICATION_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_source_classification_queue.csv"
SOURCE_ORIGIN_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_source_origin_backfill_queue.csv"
UNKNOWN_SHARE_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_unknown_share_review_queue.csv"
CALCULATION_WEIGHT_QUEUE_FILE = WORKBENCH / "world500_primary_secondary_calculation_weight_validation_queue.csv"


FIELDS = [
    "review_priority",
    "bubble_chart_status",
    "evidence_boundary",
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "primary_count",
    "secondary_count",
    "mixed_count",
    "unknown_count",
    "method_evidence_count",
    "known_source_evidence_count",
    "ratio_basis_key",
    "ratio_basis_en",
    "ratio_basis_zh",
    "reported_primary_percent",
    "reported_primary_scope_en",
    "reported_primary_scope_zh",
    "reported_primary_candidate_count",
    "primary_ratio_known",
    "secondary_ratio_known",
    "source_mix_primary_ratio_known",
    "source_mix_secondary_ratio_known",
    "primary_ratio_all",
    "unknown_ratio",
    "total_mtco2e",
    "strong_scope_row_count",
    "quality_note_en",
    "quality_note_zh",
    "sample_pages",
    "sample_source_files",
    "sample_review_statuses",
    "sample_snippets_en",
]

QUEUE_FIELDS = [
    "queue_type",
    "queue_priority",
    "recommended_action_en",
    "recommended_action_zh",
    *FIELDS,
]


def load_payload():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def join(values):
    return " | ".join(str(value) for value in values if value not in (None, ""))


def sample_values(item, key):
    values = []
    for sample in item.get("evidence_samples", [])[:5]:
        value = sample.get(key)
        if value not in (None, ""):
            values.append(value)
    return join(values)


def bubble_status(item):
    if item.get("known_source_evidence_count", 0) > 0 and item.get("primary_ratio_known") is not None:
        return "included"
    return "excluded_no_classified_source_ratio"


def review_priority(item):
    if bubble_status(item) != "included":
        return "P0_classify_source_origin"
    if float(item.get("unknown_ratio") or 0) >= 0.5:
        return "P1_reduce_unknown_source_share"
    return "P2_verify_source_mix_snippets"


def queue_recommendation(row):
    if row["review_priority"] == "P0_classify_source_origin":
        return {
            "queue_type": "missing_primary_secondary_classification",
            "queue_priority": "P0",
            "recommended_action_en": "Classify the sampled methodology evidence as primary, secondary, mixed, or not-a-source-method before including the company in the bubble chart.",
            "recommended_action_zh": "先把样本方法学证据分类为初级、次级、混合或非来源方法，再决定是否纳入气泡图。",
        }
    return {
        "queue_type": "high_unknown_source_share",
        "queue_priority": "P1",
        "recommended_action_en": "Reduce the unknown source share by reviewing additional methodology rows; keep the current bubble as a disclosure-ratio signal, not an audited calculation weight.",
        "recommended_action_zh": "复核更多方法学行以降低未知来源占比；当前气泡仅作为披露比例信号，不作为审定计算权重。",
    }


def calculation_weight_recommendation(row):
    if row.get("ratio_basis_key") == "explicit_reported_primary_percentage":
        action_en = "Validate whether the explicitly reported primary-data percentage is the actual calculation weight for the relevant emissions boundary."
        action_zh = "核验原文明示初级数据百分比是否就是对应排放边界的实际计算权重。"
    else:
        action_en = "Verify whether the report discloses actual calculation weights for primary/secondary data. If not, keep the bubble ratio labeled as disclosure-evidence mix only."
        action_zh = "核验报告是否披露初级/次级数据的实际计算权重；若未披露，气泡比例必须继续标注为披露证据结构比例。"
    return {
        "queue_type": "calculation_weight_validation",
        "queue_priority": "P2",
        "recommended_action_en": action_en,
        "recommended_action_zh": action_zh,
        **row,
    }


def main():
    payload = load_payload()
    rows = []
    for item in payload.get("primary_secondary_data", {}).get("bubbles", []):
        ratio_basis_key = item.get("ratio_basis_key") or "method_row_source_mix"
        rows.append({
            "review_priority": review_priority(item),
            "bubble_chart_status": bubble_status(item),
            "evidence_boundary": "explicit_reported_primary_percentage_pending_weight_validation"
            if ratio_basis_key == "explicit_reported_primary_percentage"
            else "source_mix_ratio_from_method_rows_not_audited_calculation_weight",
            "company_id": item.get("company_id", ""),
            "world500_rank": item.get("world500_rank", ""),
            "company_name_en": item.get("company_name_en", ""),
            "company_name_zh": item.get("company_name_zh", ""),
            "industry_section_code": item.get("industry_section_code", ""),
            "industry_section_en": item.get("industry_section_en", ""),
            "industry_section_zh": item.get("industry_section_zh", ""),
            "primary_count": item.get("primary_count", 0),
            "secondary_count": item.get("secondary_count", 0),
            "mixed_count": item.get("mixed_count", 0),
            "unknown_count": item.get("unknown_count", 0),
            "method_evidence_count": item.get("method_evidence_count", 0),
            "known_source_evidence_count": item.get("known_source_evidence_count", 0),
            "ratio_basis_key": ratio_basis_key,
            "ratio_basis_en": item.get("ratio_basis_en", ""),
            "ratio_basis_zh": item.get("ratio_basis_zh", ""),
            "reported_primary_percent": item.get("reported_primary_percent", ""),
            "reported_primary_scope_en": item.get("reported_primary_scope_en", ""),
            "reported_primary_scope_zh": item.get("reported_primary_scope_zh", ""),
            "reported_primary_candidate_count": item.get("reported_primary_candidate_count", 0),
            "primary_ratio_known": item.get("primary_ratio_known", ""),
            "secondary_ratio_known": item.get("secondary_ratio_known", ""),
            "source_mix_primary_ratio_known": item.get("source_mix_primary_ratio_known", ""),
            "source_mix_secondary_ratio_known": item.get("source_mix_secondary_ratio_known", ""),
            "primary_ratio_all": item.get("primary_ratio_all", ""),
            "unknown_ratio": item.get("unknown_ratio", ""),
            "total_mtco2e": item.get("total_mtco2e", ""),
            "strong_scope_row_count": item.get("strong_scope_row_count", 0),
            "quality_note_en": item.get("quality_note_en", ""),
            "quality_note_zh": item.get("quality_note_zh", ""),
            "sample_pages": sample_values(item, "page"),
            "sample_source_files": sample_values(item, "source_file"),
            "sample_review_statuses": sample_values(item, "review_status"),
            "sample_snippets_en": sample_values(item, "snippet_en"),
        })

    rows.sort(key=lambda row: (
        0 if row["bubble_chart_status"] == "included" else 1,
        -int(row["known_source_evidence_count"] or 0),
        int(row["world500_rank"] or 9999),
    ))
    with OUTPUT_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    queue_rows = []
    source_origin_queue_rows = []
    unknown_share_queue_rows = []
    calculation_weight_queue_rows = []
    for row in rows:
        if row["review_priority"] in {"P0_classify_source_origin", "P1_reduce_unknown_source_share"}:
            queued_row = {
                **queue_recommendation(row),
                **row,
            }
            queue_rows.append(queued_row)
            if row["review_priority"] == "P0_classify_source_origin":
                source_origin_queue_rows.append(queued_row)
            if row["review_priority"] == "P1_reduce_unknown_source_share":
                unknown_share_queue_rows.append(queued_row)
        if row["bubble_chart_status"] == "included":
            calculation_weight_queue_rows.append(calculation_weight_recommendation(row))
    with CLASSIFICATION_QUEUE_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=QUEUE_FIELDS)
        writer.writeheader()
        writer.writerows(queue_rows)
    for path, split_rows in [
        (SOURCE_ORIGIN_QUEUE_FILE, source_origin_queue_rows),
        (UNKNOWN_SHARE_QUEUE_FILE, unknown_share_queue_rows),
        (CALCULATION_WEIGHT_QUEUE_FILE, calculation_weight_queue_rows),
    ]:
        split_rows.sort(key=lambda row: (
            {"P0": 0, "P1": 1, "P2": 2}.get(row["queue_priority"], 9),
            int(row["world500_rank"] or 9999),
            row["company_id"],
        ))
        with path.open("w", encoding="utf-8-sig", newline="") as output:
            writer = csv.DictWriter(output, fieldnames=QUEUE_FIELDS)
            writer.writeheader()
            writer.writerows(split_rows)
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")
    print(f"Wrote {CLASSIFICATION_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {SOURCE_ORIGIN_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {UNKNOWN_SHARE_QUEUE_FILE.relative_to(ROOT)}")
    print(f"Wrote {CALCULATION_WEIGHT_QUEUE_FILE.relative_to(ROOT)}")
    print(json.dumps({
        "row_count": len(rows),
        "included_bubble_rows": sum(1 for row in rows if row["bubble_chart_status"] == "included"),
        "excluded_no_classified_source_ratio_rows": sum(1 for row in rows if row["bubble_chart_status"] != "included"),
        "p0_classify_source_origin_rows": sum(1 for row in rows if row["review_priority"] == "P0_classify_source_origin"),
        "p1_reduce_unknown_source_share_rows": sum(1 for row in rows if row["review_priority"] == "P1_reduce_unknown_source_share"),
        "classification_queue_rows": len(queue_rows),
        "source_origin_backfill_queue_rows": len(source_origin_queue_rows),
        "unknown_share_review_queue_rows": len(unknown_share_queue_rows),
        "calculation_weight_validation_queue_rows": len(calculation_weight_queue_rows),
        "explicit_reported_primary_ratio_rows": sum(1 for row in rows if row["ratio_basis_key"] == "explicit_reported_primary_percentage"),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
