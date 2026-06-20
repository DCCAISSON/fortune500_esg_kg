from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
ACCEPTED_CSV = WORKBENCH / "world500_ghg_accepted_series_mapping.csv"
REVIEW_CSV = WORKBENCH / "world500_ghg_review_series_mapping.csv"
OVERMAPPED_DECISIONS_JSON = WORKBENCH / "world500_ghg_overmapped_demote_decisions.json"
REGISTRY_JSON = WORKBENCH / "world500_ghg_pcaf_standard_registry.json"
OUTPUT_JSON = WORKBENCH / "world500_ghg_series_acceptance_ledger.json"
OUTPUT_CSV = WORKBENCH / "world500_ghg_series_acceptance_ledger.csv"
GENERIC_GHG_ID = "ghg_generic_reference"


FIELDS = [
    "decision_id",
    "decision_status",
    "decision_bucket",
    "evidence_gate",
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
    "core_whitelist",
    "whitelist_gate",
    "category_en",
    "category_zh",
    "role_en",
    "role_zh",
    "principle_en",
    "principle_zh",
    "language_policy_en",
    "language_policy_zh",
    "match_status",
    "matched_aliases",
    "evidence_count",
    "pages",
    "source_files",
    "sample_review_status",
    "sample_confidence",
    "sample_snippet_en",
    "sample_snippet_zh",
    "safe_use_en",
    "safe_use_zh",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def row_key(row: dict) -> tuple[str, str]:
    return (str(row.get("company_id") or "").strip(), str(row.get("series_id") or "").strip())


def copied_fields(row: dict, whitelist_ids: set[str]) -> dict:
    output = {field: row.get(field, "") for field in FIELDS if field not in {
        "decision_id",
        "decision_status",
        "decision_bucket",
        "evidence_gate",
        "safe_use_en",
        "safe_use_zh",
    }}
    series_id = str(row.get("series_id") or "").strip()
    output["core_whitelist"] = "yes" if series_id in whitelist_ids else "no"
    output["whitelist_gate"] = (
        "eligible_for_acceptance_if_pdf_explicitly_names_this_whitelisted_series"
        if series_id in whitelist_ids
        else "not_in_12_core_ghg_pcaf_whitelist_keep_review_only_unless_registry_is_expanded"
    )
    return output


def accepted_decision(row: dict, index: int, whitelist_ids: set[str]) -> dict:
    item = copied_fields(row, whitelist_ids)
    item.update({
        "decision_id": f"GHG-SERIES-ACCEPTED-{index:04d}",
        "decision_status": "accepted_explicit_named_series_edge",
        "decision_bucket": "accepted",
        "evidence_gate": "source_text_explicitly_names_this_ghg_protocol_series",
        "safe_use_en": (
            "May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only "
            "inside this GHG Protocol evidence context."
        ),
        "safe_use_zh": (
            "可作为已采信的企业-GHG 细分系列关系。Scope 术语只允许在该 GHG Protocol 证据语境下使用。"
        ),
    })
    return item


def review_decision(row: dict, index: int, whitelist_ids: set[str]) -> dict:
    status = row.get("match_status")
    overmapped = status == "contextual_overmapped_review"
    in_whitelist = str(row.get("series_id") or "").strip() in whitelist_ids
    item = copied_fields(row, whitelist_ids)
    item.update({
        "decision_id": f"GHG-SERIES-REVIEW-{index:04d}",
        "decision_status": (
            "demoted_overmapped_edge_not_accepted"
            if overmapped
            else "review_required_contextual_inventory_mapping"
        ),
        "decision_bucket": "demoted" if overmapped else "review",
        "evidence_gate": (
            "sample_names_other_series_or_no_current_series_name"
            if overmapped
            else "scope_inventory_context_without_explicit_fine_series_name"
        ),
        "safe_use_en": (
            "Outside the controlled 12-item GHG/PCAF whitelist. Keep review-only unless the whitelist registry is explicitly expanded and page-level PDF text names the specific series."
            if not in_whitelist
            else
            "Do not draw or accept this current edge. It can only be used as a demotion/search lead until "
            "page-level PDF text explicitly names the current GHG Protocol series."
            if overmapped
            else "Keep as review-only context. Do not count it as an accepted company-series relationship "
            "until page-level PDF text explicitly names this GHG Protocol series."
        ),
        "safe_use_zh": (
            "不得绘制或采信当前边。页级 PDF 文本明确命名当前 GHG Protocol 系列前，只能作为降级/检索线索。"
            if overmapped
            else "保留为待复核上下文。页级 PDF 文本明确命名该 GHG Protocol 系列前，不得计入已采信企业-系列关系。"
        ),
    })
    return item


def load_overmapped_decision_keys() -> set[tuple[str, str]]:
    payload = json.loads(OVERMAPPED_DECISIONS_JSON.read_text(encoding="utf-8"))
    return {
        (str(row.get("company_id") or "").strip(), str(row.get("current_series_id") or "").strip())
        for row in payload.get("decisions", [])
        if row.get("decision_status") == "demote_current_edge_reassign_only_after_page_review"
    }


def load_whitelist_ids() -> set[str]:
    payload = json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))
    return {
        str(row.get("id") or "").strip()
        for row in payload.get("standards", [])
        if row.get("id")
    }


def build_ledger() -> tuple[list[dict], dict]:
    accepted_rows = read_csv(ACCEPTED_CSV)
    review_rows = read_csv(REVIEW_CSV)
    overmapped_decision_keys = load_overmapped_decision_keys()
    whitelist_ids = load_whitelist_ids()

    accepted_keys = set()
    ledger: list[dict] = []
    for index, row in enumerate(accepted_rows, start=1):
        key = row_key(row)
        if not all(key):
            raise ValueError(f"Accepted GHG series row is missing company_id or series_id: {row}")
        if key in accepted_keys:
            raise ValueError(f"Duplicate accepted GHG series edge: {key}")
        if key[1] == GENERIC_GHG_ID:
            raise ValueError(f"Generic GHG reference cannot be accepted: {key}")
        if key[1] not in whitelist_ids:
            raise ValueError(f"Accepted GHG series edge is outside the controlled 12-item whitelist: {key}")
        accepted_keys.add(key)
        ledger.append(accepted_decision(row, index, whitelist_ids))

    review_keys = set()
    demoted_keys = set()
    for index, row in enumerate(review_rows, start=1):
        key = row_key(row)
        if not all(key):
            raise ValueError(f"Review GHG series row is missing company_id or series_id: {row}")
        if key[1] == GENERIC_GHG_ID:
            raise ValueError(f"Generic GHG reference cannot enter the fine-series review ledger: {key}")
        if key in accepted_keys:
            raise ValueError(f"Accepted GHG series edge also appears in review mapping: {key}")
        if key in review_keys:
            raise ValueError(f"Duplicate review GHG series edge: {key}")
        review_keys.add(key)
        if row.get("match_status") == "contextual_overmapped_review":
            demoted_keys.add(key)
        ledger.append(review_decision(row, index, whitelist_ids))

    missing_demotions = demoted_keys - overmapped_decision_keys
    if missing_demotions:
        sample = ", ".join(f"{company}:{series}" for company, series in sorted(missing_demotions)[:8])
        raise ValueError(f"Overmapped review edges are missing demotion decisions: {sample}")

    status_counts = Counter(row["decision_status"] for row in ledger)
    bucket_counts = Counter(row["decision_bucket"] for row in ledger)
    series_counts = Counter(row["series_id"] for row in ledger)
    payload = {
        "schema_version": "world500-ghg-series-acceptance-ledger-v1",
        "generated_at": now_iso(),
        "policy_en": (
            "Unified GHG fine-series edge decision ledger. Only rows whose source text explicitly names the "
            "specific GHG Protocol series are accepted. Contextual inventory mappings remain review-only. "
            "Overmapped contextual edges are demoted and must not be drawn or treated as accepted."
        ),
        "policy_zh": (
            "GHG 细分系列关系统一决策账本。只有源文明示命名具体 GHG Protocol 系列的边可采信；"
            "上下文清单映射保留为待复核；疑似过映射上下文边降级，不得绘制或作为已采信关系。"
        ),
        "source_files": [
            str(ACCEPTED_CSV.relative_to(ROOT)).replace("\\", "/"),
            str(REVIEW_CSV.relative_to(ROOT)).replace("\\", "/"),
            str(OVERMAPPED_DECISIONS_JSON.relative_to(ROOT)).replace("\\", "/"),
            str(REGISTRY_JSON.relative_to(ROOT)).replace("\\", "/"),
        ],
        "core_whitelist_standard_count": len(whitelist_ids),
        "row_count": len(ledger),
        "accepted_edge_count": bucket_counts.get("accepted", 0),
        "review_edge_count": bucket_counts.get("review", 0),
        "demoted_edge_count": bucket_counts.get("demoted", 0),
        "company_count": len({row["company_id"] for row in ledger if row["company_id"]}),
        "accepted_company_count": len({row["company_id"] for row in ledger if row["decision_bucket"] == "accepted"}),
        "review_company_count": len({row["company_id"] for row in ledger if row["decision_bucket"] == "review"}),
        "demoted_company_count": len({row["company_id"] for row in ledger if row["decision_bucket"] == "demoted"}),
        "generic_reference_accepted_count": sum(1 for row in ledger if row["series_id"] == GENERIC_GHG_ID and row["decision_bucket"] == "accepted"),
        "accepted_outside_whitelist_count": sum(1 for row in ledger if row["decision_bucket"] == "accepted" and row["core_whitelist"] != "yes"),
        "review_outside_whitelist_count": sum(1 for row in ledger if row["decision_bucket"] != "accepted" and row["core_whitelist"] != "yes"),
        "decision_status_counts": dict(sorted(status_counts.items())),
        "decision_bucket_counts": dict(sorted(bucket_counts.items())),
        "series_counts": dict(sorted(series_counts.items())),
        "rows": ledger,
    }
    return ledger, payload


def main() -> None:
    ledger, payload = build_ledger()
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    write_csv(OUTPUT_CSV, ledger)
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")
    print(json.dumps({
        "row_count": payload["row_count"],
        "accepted_edge_count": payload["accepted_edge_count"],
        "review_edge_count": payload["review_edge_count"],
        "demoted_edge_count": payload["demoted_edge_count"],
        "accepted_company_count": payload["accepted_company_count"],
        "generic_reference_accepted_count": payload["generic_reference_accepted_count"],
        "accepted_outside_whitelist_count": payload["accepted_outside_whitelist_count"],
        "review_outside_whitelist_count": payload["review_outside_whitelist_count"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
