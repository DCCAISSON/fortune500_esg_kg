from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_FILE = WORKBENCH / "reporting_views.json"
OUTPUT_JSON = WORKBENCH / "world500_ghg_zero_accepted_standard_audit.json"
OUTPUT_CSV = WORKBENCH / "world500_ghg_zero_accepted_standard_audit.csv"
CLOSURE_OUTPUT_JSON = WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.json"
CLOSURE_OUTPUT_CSV = WORKBENCH / "world500_ghg_zero_accepted_review_closure_queue.csv"

FIELDS = [
    "series_id",
    "series_name_en",
    "series_name_zh",
    "accepted_company_count",
    "review_company_count",
    "evidence_count",
    "current_status",
    "audit_decision_en",
    "audit_decision_zh",
    "review_basis_en",
    "review_basis_zh",
    "candidate_company_ids",
    "candidate_pages",
    "candidate_source_files",
    "sample_snippet_en",
]

CLOSURE_FIELDS = [
    "closure_id",
    "series_id",
    "series_name_en",
    "series_name_zh",
    "zero_accepted_status",
    "promotion_allowed",
    "company_id",
    "company_name_en",
    "world500_rank",
    "match_status",
    "evidence_gate",
    "pages",
    "source_files",
    "not_acceptance_reason_code",
    "not_acceptance_reason_en",
    "not_acceptance_reason_zh",
    "required_next_evidence_en",
    "safe_decision_en",
    "sample_snippet_en",
]

ZERO_EVIDENCE_REASON_EN = (
    "No page-level source text in the current workbench names this controlled GHGP standard. "
    "Keep zero accepted; do not create company-standard edges without new PDF evidence."
)
ZERO_EVIDENCE_REASON_ZH = (
    "当前 workbench 中没有页级原文命名该 GHGP 受控标准。保持 0 accepted；没有新增 PDF 证据前不得生成企业-标准边。"
)
REVIEW_ONLY_REASON_EN = (
    "Current rows are contextual or possible overmapping review leads. They do not explicitly show adoption/use of this exact standard, "
    "so they remain outside the accepted graph."
)
REVIEW_ONLY_REASON_ZH = (
    "当前行只是上下文或疑似过度映射复核线索，未明确证明企业采用/使用该具体标准，因此不进入 accepted 图谱。"
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def clean(value) -> str:
    return " ".join(str(value or "").split())


def load_reporting() -> dict:
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def join(values: list[str], limit: int = 8) -> str:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = clean(value)
        if not text or text in seen:
            continue
        output.append(text)
        seen.add(text)
        if len(output) >= limit:
            break
    return " | ".join(output)


def rows_for_series(reporting: dict, series_id: str) -> list[dict]:
    rows = []
    for company in reporting.get("ghg_standard_series", {}).get("company_mappings", []):
        for series in company.get("series", []):
            if series.get("series_id") != series_id:
                continue
            sample = (series.get("evidence_samples") or [{}])[0]
            rows.append({
                "company_id": clean(company.get("company_id")),
                "company_name_en": clean(company.get("company_name_en")),
                "company_name_zh": clean(company.get("company_name_zh")),
                "world500_rank": clean(company.get("world500_rank")),
                "match_status": clean(series.get("match_status")),
                "evidence_gate": clean(series.get("evidence_gate")),
                "evidence_count": int(series.get("evidence_count") or 0),
                "pages": series.get("pages") or [],
                "source_files": series.get("source_files") or [],
                "sample_snippet_en": clean(sample.get("snippet_en")),
            })
    return rows


def audit_row(summary: dict, candidates: list[dict]) -> dict:
    accepted = int(summary.get("accepted_company_count") or 0)
    review = int(summary.get("review_company_count") or 0)
    evidence = int(summary.get("evidence_count") or 0)
    if accepted:
        status = "has_accepted_edges"
        decision_en = "Not a zero-accepted standard. Accepted edges remain governed by the fine-series acceptance ledger."
        decision_zh = "不是 0 accepted 标准；已采信边继续受细分标准采信台账约束。"
        basis_en = "accepted_count_positive"
        basis_zh = "accepted 数量大于 0"
    elif review or evidence or candidates:
        status = "zero_accepted_review_only"
        decision_en = REVIEW_ONLY_REASON_EN
        decision_zh = REVIEW_ONLY_REASON_ZH
        basis_en = "review_or_contextual_rows_exist_but_no_explicit_accepted_use"
        basis_zh = "存在复核/上下文行，但没有可采信的明确使用证据"
    else:
        status = "zero_accepted_no_current_evidence"
        decision_en = ZERO_EVIDENCE_REASON_EN
        decision_zh = ZERO_EVIDENCE_REASON_ZH
        basis_en = "no_current_workbench_rows"
        basis_zh = "当前工作台没有命中行"
    return {
        "series_id": summary.get("series_id", ""),
        "series_name_en": summary.get("name_en", ""),
        "series_name_zh": summary.get("name_zh", ""),
        "accepted_company_count": accepted,
        "review_company_count": review,
        "evidence_count": evidence,
        "current_status": status,
        "audit_decision_en": decision_en,
        "audit_decision_zh": decision_zh,
        "review_basis_en": basis_en,
        "review_basis_zh": basis_zh,
        "candidate_company_ids": join([row["company_id"] for row in candidates]),
        "candidate_pages": join([page for row in candidates for page in row.get("pages", [])]),
        "candidate_source_files": join([source for row in candidates for source in row.get("source_files", [])], limit=5),
        "sample_snippet_en": join([row.get("sample_snippet_en", "") for row in candidates], limit=2),
    }


def closure_reason(row: dict | None, status: str) -> tuple[str, str, str]:
    snippet = clean((row or {}).get("sample_snippet_en"))
    match_status = clean((row or {}).get("match_status"))
    if status == "zero_accepted_no_current_evidence":
        return (
            "no_current_page_level_source_text",
            "No current workbench row names this controlled GHGP standard at page level; no company-standard edge can be drawn.",
            "当前工作台没有页级原文命名该 GHGP 受控标准，不能生成企业-标准边。",
        )
    if "await" in snippet.lower() and "final" in snippet.lower():
        return (
            "monitoring_awaiting_finalization_not_adoption",
            "The snippet references monitoring or awaiting finalization of related GHGP land/removals guidance; it does not show adoption, use, calculation, or reporting under the standard.",
            "片段只是监测/等待相关土地与移除指南定稿，不证明企业已采用、使用、计算或按该标准报告。",
        )
    if "contextual_overmapped" in match_status:
        return (
            "overmapped_context_without_current_series_use",
            "The row is an overmapping review lead. The page context does not explicitly name and use the currently linked GHGP standard.",
            "该行属于过度映射复核线索；页级上下文没有明确命名并使用当前链接的 GHGP 标准。",
        )
    return (
        "contextual_or_generic_ghg_without_exact_standard_use",
        "The row is contextual or generic GHG evidence. It does not explicitly name this exact GHGP standard with use/adoption/calculation/reporting context.",
        "该行为上下文或泛化 GHG 证据，没有明确命名该具体 GHGP 标准并体现使用、采纳、计算或报告语境。",
    )


def build_closure_rows(audit_rows: list[dict], reporting: dict) -> list[dict]:
    closure_rows: list[dict] = []
    for audit in audit_rows:
        if int(audit.get("accepted_company_count") or 0) != 0:
            continue
        series_id = clean(audit.get("series_id"))
        status = clean(audit.get("current_status"))
        candidates = rows_for_series(reporting, series_id)
        if not candidates:
            code, reason_en, reason_zh = closure_reason(None, status)
            candidates = [{
                "company_id": "",
                "company_name_en": "",
                "company_name_zh": "",
                "world500_rank": "",
                "match_status": "",
                "evidence_gate": "",
                "pages": [],
                "source_files": [],
                "sample_snippet_en": "",
                "_reason": (code, reason_en, reason_zh),
            }]
        for candidate in candidates:
            code, reason_en, reason_zh = candidate.get("_reason") or closure_reason(candidate, status)
            closure_rows.append({
                "closure_id": f"GHGP-ZERO-{len(closure_rows) + 1:04d}",
                "series_id": series_id,
                "series_name_en": clean(audit.get("series_name_en")),
                "series_name_zh": clean(audit.get("series_name_zh")),
                "zero_accepted_status": status,
                "promotion_allowed": "false",
                "company_id": clean(candidate.get("company_id")),
                "company_name_en": clean(candidate.get("company_name_en")),
                "world500_rank": clean(candidate.get("world500_rank")),
                "match_status": clean(candidate.get("match_status")),
                "evidence_gate": clean(candidate.get("evidence_gate")),
                "pages": join([str(page) for page in candidate.get("pages", [])], limit=12),
                "source_files": join([str(source) for source in candidate.get("source_files", [])], limit=8),
                "not_acceptance_reason_code": code,
                "not_acceptance_reason_en": reason_en,
                "not_acceptance_reason_zh": reason_zh,
                "required_next_evidence_en": "Only page-level PDF text that explicitly names this controlled GHGP standard and shows adoption, use, calculation, reporting, or assurance context may create an accepted edge.",
                "safe_decision_en": "Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate.",
                "sample_snippet_en": clean(candidate.get("sample_snippet_en")),
            })
    return closure_rows


def main() -> None:
    reporting = load_reporting()
    summaries = [
        row for row in reporting.get("ghg_standard_series", {}).get("series_summary", [])
        if row.get("core_whitelist")
    ]
    rows = [audit_row(summary, rows_for_series(reporting, summary.get("series_id", ""))) for summary in summaries]
    zero_rows = [row for row in rows if int(row["accepted_company_count"] or 0) == 0]
    payload = {
        "schema_version": "world500-ghg-zero-accepted-standard-audit-v1",
        "generated_at": now_iso(),
        "source": "assets/data/world500/workbench/reporting_views.json",
        "policy_en": "Zero accepted does not mean missing taxonomy work. It means current page-level evidence does not explicitly name and use the controlled GHGP standard enough to draw an accepted company-standard edge.",
        "policy_zh": "0 accepted 不代表分类工作缺失，而是当前页级证据不足以明确命名并使用该 GHGP 受控标准，不能画成已采信企业-标准边。",
        "core_standard_count": len(rows),
        "zero_accepted_standard_count": len(zero_rows),
        "zero_accepted_series_ids": [row["series_id"] for row in zero_rows],
        "rows": rows,
    }
    closure_rows = build_closure_rows(rows, reporting)
    closure_payload = {
        "schema_version": "world500-ghgp-zero-accepted-review-closure-queue-v1",
        "generated_at": payload["generated_at"],
        "source": "assets/data/world500/workbench/world500_ghg_zero_accepted_standard_audit.json",
        "policy_en": "This queue closes current zero-accepted GHGP standards as review-only unless new page-level PDF evidence explicitly names and uses the controlled standard.",
        "policy_zh": "该队列将当前 0 accepted 的 GHGP 标准闭环为复核/不采信状态；只有新增页级 PDF 原文明确命名并使用受控标准，才能升为 accepted。",
        "row_count": len(closure_rows),
        "zero_accepted_standard_count": len(zero_rows),
        "promotion_allowed_count": 0,
        "rows": closure_rows,
    }
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    CLOSURE_OUTPUT_JSON.write_text(json.dumps(closure_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    with CLOSURE_OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CLOSURE_FIELDS)
        writer.writeheader()
        writer.writerows(closure_rows)
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_CSV.relative_to(ROOT)}")
    print(f"Wrote {CLOSURE_OUTPUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {CLOSURE_OUTPUT_CSV.relative_to(ROOT)}")
    print(json.dumps({
        "core_standard_count": payload["core_standard_count"],
        "zero_accepted_standard_count": payload["zero_accepted_standard_count"],
        "zero_accepted_series_ids": payload["zero_accepted_series_ids"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
