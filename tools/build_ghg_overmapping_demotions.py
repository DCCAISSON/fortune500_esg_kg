from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
ALL_SOURCE_CSV = WORKBENCH / "world500_ghg_contextual_overmapping_review_queue.csv"
P0_SOURCE_CSV = WORKBENCH / "world500_ghg_p0_overmapped_contextual_edge_queue.csv"
ACCEPTED_SERIES_CSV = WORKBENCH / "world500_ghg_accepted_series_mapping.csv"
REVIEW_SERIES_CSV = WORKBENCH / "world500_ghg_review_series_mapping.csv"
ALL_OUTPUT_JSON = WORKBENCH / "world500_ghg_overmapped_demote_decisions.json"
ALL_OUTPUT_CSV = WORKBENCH / "world500_ghg_overmapped_demote_decisions.csv"
P0_OUTPUT_JSON = WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.json"
P0_OUTPUT_CSV = WORKBENCH / "world500_ghg_p0_overmapped_demote_decisions.csv"


FIELDS = [
    "decision_id",
    "decision_status",
    "decision_policy",
    "review_priority",
    "company_id",
    "company_name_en",
    "company_name_zh",
    "world500_rank",
    "current_series_id",
    "current_series_name_en",
    "named_series_ids_in_sample",
    "named_series_names_in_sample",
    "recommended_reassignment_series_ids",
    "accepted_reassignment_series_ids",
    "missing_reassignment_series_ids",
    "reassignment_status",
    "source_files",
    "pages",
    "evidence_count",
    "overmapping_reason",
    "safe_action_en",
    "safe_action_zh",
    "sample_snippet_en",
    "sample_snippet_zh",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def split_values(value: object) -> list[str]:
    text = str(value or "").strip()
    if not text:
        return []
    return [part.strip() for part in text.split("|") if part.strip()]


def join_values(values: list[object]) -> str:
    seen = set()
    output = []
    for value in values:
        for part in split_values(value):
            if part and part not in seen:
                seen.add(part)
                output.append(part)
    return " | ".join(output)


def load_accepted_keys() -> set[tuple[str, str]]:
    return {
        (str(row.get("company_id") or "").strip(), str(row.get("series_id") or "").strip())
        for row in read_csv(ACCEPTED_SERIES_CSV)
        if row.get("company_id") and row.get("series_id")
    }


def reassignment_status(accepted_reassignment: list[str], missing_reassignment: list[str]) -> str:
    if accepted_reassignment and not missing_reassignment:
        return "current_edge_demoted_reassignment_already_accepted"
    if accepted_reassignment and missing_reassignment:
        return "current_edge_demoted_reassignment_partially_accepted"
    if missing_reassignment:
        return "current_edge_demoted_reassignment_candidate_needs_review"
    return "current_edge_demoted_no_reassignment_named"


def merge_overmapped_source_rows(primary_rows: list[dict], review_rows: list[dict]) -> list[dict]:
    merged: dict[tuple[str, str], dict] = {}
    for row in primary_rows:
        if row.get("match_status") != "contextual_overmapped_review":
            continue
        key = (str(row.get("company_id") or "").strip(), str(row.get("series_id") or "").strip())
        if all(key):
            merged[key] = row
    for row in review_rows:
        if row.get("match_status") != "contextual_overmapped_review":
            continue
        key = (str(row.get("company_id") or "").strip(), str(row.get("series_id") or "").strip())
        if not all(key) or key in merged:
            continue
        fallback = dict(row)
        fallback.setdefault("review_priority", "P1_named_series_missing_from_sample")
        fallback.setdefault(
            "recommended_action",
            "Demote this review-only edge unless page-level PDF text explicitly names the current fine series.",
        )
        fallback.setdefault(
            "overmapping_reason",
            "Review mapping marks this as contextual_overmapped_review; no explicit accepted edge exists for the current fine series.",
        )
        fallback.setdefault("named_series_ids_in_sample", "")
        fallback.setdefault("named_series_names_in_sample", "")
        fallback.setdefault("evidence_strength", "overmapped_review_required")
        merged[key] = fallback
    return [merged[key] for key in sorted(merged)]


def build_decisions(
    source_rows: list[dict],
    decision_prefix: str,
    accepted_keys: set[tuple[str, str]],
    include_all_source_rows: bool = False,
) -> list[dict]:
    decisions = []
    overmapped_rows = source_rows if include_all_source_rows else [
        row for row in source_rows
        if row.get("match_status") == "contextual_overmapped_review"
    ]
    for index, row in enumerate(overmapped_rows, start=1):
        current_series = str(row.get("series_id") or "").strip()
        company_id = str(row.get("company_id") or "").strip()
        named_series = split_values(row.get("named_series_ids_in_sample"))
        reassignment = [series_id for series_id in named_series if series_id != current_series]
        accepted_reassignment = [series_id for series_id in reassignment if (company_id, series_id) in accepted_keys]
        missing_reassignment = [series_id for series_id in reassignment if (company_id, series_id) not in accepted_keys]
        status = reassignment_status(accepted_reassignment, missing_reassignment)
        if status == "current_edge_demoted_reassignment_already_accepted":
            safe_action_en = (
                "Close the current overmapped edge as demoted. The series explicitly named in the sample already "
                "exists as an accepted company-series edge, so no new edge should be promoted from this row."
            )
            safe_action_zh = (
                "将当前过度映射边闭环降级。样本中显式命名的替代系列已经在 accepted mapping 中采信，"
                "不得再从当前错误边重复提升新关系。"
            )
        elif reassignment:
            safe_action_en = (
                "Demote the current edge. If the named series in the sample is relevant to the company boundary, "
                "review that named series as a separate candidate edge; do not promote the current edge."
            )
            safe_action_zh = (
                "降级当前边。如果样本中明示命名的系列与企业边界相关，只能作为另一条候选边重新复核；不得提升当前边。"
            )
        else:
            safe_action_en = (
                "Demote the current edge. No replacement series is named in the sample; keep this only as a search "
                "lead until page-level PDF text explicitly names a concrete GHG series."
            )
            safe_action_zh = (
                "降级当前边。样本没有命名可替换系列；在页级 PDF 文本明确命名具体 GHG 系列前，只能作为检索线索保留。"
            )
        decisions.append({
            "decision_id": f"{decision_prefix}-{index:04d}",
            "decision_status": "demote_current_edge_reassign_only_after_page_review",
            "decision_policy": (
                "This is not an accepted company-series relationship. The current linked series is excluded from "
                "drawn graph payloads and must stay out of accepted mappings unless page-level PDF text explicitly "
                "names the current series."
            ),
            "review_priority": row.get("review_priority", ""),
            "company_id": row.get("company_id", ""),
            "company_name_en": row.get("company_name_en", ""),
            "company_name_zh": row.get("company_name_zh", ""),
            "world500_rank": row.get("world500_rank", ""),
            "current_series_id": current_series,
            "current_series_name_en": row.get("series_name_en", ""),
            "named_series_ids_in_sample": row.get("named_series_ids_in_sample", ""),
            "named_series_names_in_sample": row.get("named_series_names_in_sample", ""),
            "recommended_reassignment_series_ids": join_values(reassignment),
            "accepted_reassignment_series_ids": join_values(accepted_reassignment),
            "missing_reassignment_series_ids": join_values(missing_reassignment),
            "reassignment_status": status,
            "source_files": row.get("source_files", ""),
            "pages": row.get("pages", ""),
            "evidence_count": row.get("evidence_count", ""),
            "overmapping_reason": row.get("overmapping_reason", ""),
            "safe_action_en": safe_action_en,
            "safe_action_zh": safe_action_zh,
            "sample_snippet_en": row.get("sample_snippet_en", ""),
            "sample_snippet_zh": row.get("sample_snippet_zh", ""),
        })
    return decisions


def write_decision_payload(output_json: Path, output_csv: Path, schema_version: str, source_file: str, decisions: list[dict]) -> dict:
    status_counts = Counter(row["decision_status"] for row in decisions)
    reassignment_status_counts = Counter(row["reassignment_status"] for row in decisions)
    current_series_counts = Counter(row["current_series_id"] for row in decisions)
    priority_counts = Counter(row["review_priority"] for row in decisions)
    company_count = len({row["company_id"] for row in decisions if row["company_id"]})
    payload = {
        "schema_version": schema_version,
        "generated_at": now_iso(),
        "policy": (
            "Review and demotion artifact only. It does not promote any GHG series edge and does not modify "
            "authoritative reporting_views.json. It records overmapped edges that must not be treated as accepted or drawn."
        ),
        "source_file": source_file,
        "decision_count": len(decisions),
        "company_count": company_count,
        "decision_status_counts": dict(sorted(status_counts.items())),
        "reassignment_status_counts": dict(sorted(reassignment_status_counts.items())),
        "review_priority_counts": dict(sorted(priority_counts.items())),
        "current_series_counts": dict(sorted(current_series_counts.items())),
        "decisions": decisions,
    }
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    write_csv(output_csv, decisions)
    print(f"Wrote {output_json.relative_to(ROOT)}")
    print(f"Wrote {output_csv.relative_to(ROOT)}")
    return payload


def main() -> None:
    accepted_keys = load_accepted_keys()
    all_source_rows = merge_overmapped_source_rows(read_csv(ALL_SOURCE_CSV), read_csv(REVIEW_SERIES_CSV))
    all_decisions = build_decisions(
        all_source_rows,
        "GHG-OVERMAPPED-DEMOTE",
        accepted_keys,
        include_all_source_rows=True,
    )
    p0_decisions = build_decisions(
        read_csv(P0_SOURCE_CSV),
        "GHG-P0-OVERMAPPED-DEMOTE",
        accepted_keys,
        include_all_source_rows=True,
    )
    all_payload = write_decision_payload(
        ALL_OUTPUT_JSON,
        ALL_OUTPUT_CSV,
        "world500-ghg-overmapped-demote-decisions-v1",
        "assets/data/world500/workbench/world500_ghg_contextual_overmapping_review_queue.csv",
        all_decisions,
    )
    p0_payload = write_decision_payload(
        P0_OUTPUT_JSON,
        P0_OUTPUT_CSV,
        "world500-ghg-p0-overmapped-demote-decisions-v1",
        "assets/data/world500/workbench/world500_ghg_p0_overmapped_contextual_edge_queue.csv",
        p0_decisions,
    )
    print(json.dumps({
        "all_decision_count": all_payload["decision_count"],
        "all_company_count": all_payload["company_count"],
        "p0_decision_count": p0_payload["decision_count"],
        "p0_company_count": p0_payload["company_count"],
        "all_review_priority_counts": all_payload["review_priority_counts"],
        "p0_reassignment_status_counts": p0_payload["reassignment_status_counts"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
