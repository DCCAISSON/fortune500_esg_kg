import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_FILE = WORKBENCH / "reporting_views.json"
OUTPUT_FILE = WORKBENCH / "world500_standard_role_link_audit.csv"
NON_GHG_SCOPE_REVIEW_FILE = WORKBENCH / "world500_non_ghg_scope_wording_review_queue.csv"


SCOPE_RE = re.compile(
    r"\bscope\s*(?:1|2|3|one|two|three|i|ii|iii)\b|范围\s*(?:1|2|3|一|二|三)|范畴\s*(?:1|2|3|一|二|三)",
    re.I,
)


FIELDS = [
    "review_priority",
    "language_policy",
    "match_status",
    "evidence_mode",
    "decision_bucket",
    "evidence_gate",
    "matched_aliases",
    "standard_id",
    "standard_name_en",
    "standard_name_zh",
    "standard_family_en",
    "standard_family_zh",
    "standard_color",
    "is_ghg_series",
    "roles_en",
    "roles_zh",
    "principles_en",
    "principles_zh",
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "industry_section_code",
    "industry_section_en",
    "industry_section_zh",
    "industry_color",
    "evidence_count",
    "pages",
    "source_files",
    "sample_confidence",
    "sample_review_status",
    "sample_snippet_en",
    "sample_snippet_zh",
]

NON_GHG_REVIEW_FIELDS = [
    "review_priority",
    "recommended_action",
    "standard_id",
    "standard_name_en",
    "standard_name_zh",
    "standard_family_en",
    "standard_family_zh",
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "source_files",
    "pages",
    "sample_review_status",
    "sample_confidence",
    "sample_snippet_en",
    "sample_snippet_zh",
    "language_policy",
]


def load_payload():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def join_values(values):
    if not values:
        return ""
    return " | ".join(str(value) for value in values if value is not None and str(value).strip())


def unique_join(values):
    seen = []
    for value in values or []:
        text = str(value or "").strip()
        if text and text not in seen:
            seen.append(text)
    return " | ".join(seen)


def evidence_samples(link):
    return [item for item in link.get("evidence_samples") or [] if isinstance(item, dict)]


def sample_text(samples):
    return " ".join(
        str(sample.get(key) or "")
        for sample in samples
        for key in ("snippet_en", "snippet_zh", "snippet")
    )


def standard_term_text(standard):
    parts = []
    for key in ("name_en", "name_zh", "family_en", "family_zh"):
        parts.append(str(standard.get(key) or ""))
    for key in ("roles_en", "roles_zh", "principles_en", "principles_zh"):
        parts.extend(str(value or "") for value in standard.get(key) or [])
    return " ".join(parts)


def review_priority(standard, link, samples):
    has_evidence = bool(link.get("evidence_count")) and bool(samples)
    has_trace = bool(link.get("pages")) and bool(link.get("source_files"))
    has_snippet = any(sample.get("snippet_en") or sample.get("snippet_zh") or sample.get("snippet") for sample in samples)
    is_ghg = bool(standard.get("is_ghg_series"))
    if not is_ghg and SCOPE_RE.search(standard_term_text(standard)):
        return "P0_non_ghg_standard_scope_term_misuse"
    if not is_ghg and SCOPE_RE.search(sample_text(samples)):
        return "P2_verify_non_ghg_source_quote_scope"
    if not has_evidence or not has_trace or not has_snippet:
        return "P1_backfill_standard_evidence"
    if is_ghg:
        return "P2_verify_scope_language_and_evidence"
    return "P2_verify_standard_link"


def language_policy(standard):
    if standard.get("is_ghg_series"):
        return "GHG Protocol series: Scope 1/2/3 wording is allowed when the linked evidence explicitly supports it."
    return "Non-GHG standard: use direct/indirect emissions wording in UI; preserve Scope wording only inside source quotations that require review."


def build_rows(payload):
    graph = payload.get("standard_role_graph") or {}
    standards = {item.get("id"): item for item in graph.get("standards") or []}
    companies = {item.get("company_id"): item for item in graph.get("companies") or []}

    rows = []
    for link in graph.get("links") or []:
        standard = standards.get(link.get("standard_id"), {})
        company = companies.get(link.get("company_id"), {})
        samples = evidence_samples(link)
        first_sample = samples[0] if samples else {}
        rows.append({
            "review_priority": review_priority(standard, link, samples),
            "language_policy": language_policy(standard),
            "match_status": link.get("match_status", ""),
            "evidence_mode": link.get("evidence_mode", ""),
            "decision_bucket": link.get("decision_bucket", ""),
            "evidence_gate": link.get("evidence_gate", ""),
            "matched_aliases": unique_join(link.get("matched_aliases")),
            "standard_id": link.get("standard_id", ""),
            "standard_name_en": standard.get("name_en", ""),
            "standard_name_zh": standard.get("name_zh", ""),
            "standard_family_en": standard.get("family_en", ""),
            "standard_family_zh": standard.get("family_zh", ""),
            "standard_color": standard.get("color", ""),
            "is_ghg_series": "yes" if standard.get("is_ghg_series") else "no",
            "roles_en": join_values(standard.get("roles_en")),
            "roles_zh": join_values(standard.get("roles_zh")),
            "principles_en": join_values(standard.get("principles_en")),
            "principles_zh": join_values(standard.get("principles_zh")),
            "company_id": link.get("company_id", ""),
            "world500_rank": company.get("world500_rank", ""),
            "company_name_en": company.get("company_name_en", ""),
            "company_name_zh": company.get("company_name_zh", ""),
            "industry_section_code": company.get("industry_section_code") or link.get("industry_section_code", ""),
            "industry_section_en": company.get("industry_section_en", ""),
            "industry_section_zh": company.get("industry_section_zh", ""),
            "industry_color": company.get("industry_color", ""),
            "evidence_count": link.get("evidence_count", 0),
            "pages": unique_join(link.get("pages")),
            "source_files": unique_join(link.get("source_files")),
            "sample_confidence": unique_join(sample.get("confidence") for sample in samples),
            "sample_review_status": unique_join(sample.get("review_status") for sample in samples),
            "sample_snippet_en": first_sample.get("snippet_en") or first_sample.get("snippet") or "",
            "sample_snippet_zh": first_sample.get("snippet_zh") or first_sample.get("snippet") or "",
        })
    return rows


def main():
    rows = build_rows(load_payload())
    with OUTPUT_FILE.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    review_rows = []
    for row in rows:
        if row.get("review_priority") not in {"P0_non_ghg_standard_scope_term_misuse", "P2_verify_non_ghg_source_quote_scope"}:
            continue
        review_row = {field: row.get(field, "") for field in NON_GHG_REVIEW_FIELDS if field != "recommended_action"}
        if row.get("review_priority") == "P0_non_ghg_standard_scope_term_misuse":
            review_row["recommended_action"] = (
                "Remove Scope wording from the non-GHG standard's own role/principle labels, or link the "
                "standard explicitly to a GHG Protocol series before using Scope terminology."
            )
        else:
            review_row["recommended_action"] = (
                "Keep Scope wording only as a source quotation. In UI labels and graph terminology for this "
                "non-GHG standard, use direct/indirect emissions or disclosure/assurance wording."
            )
        review_rows.append(review_row)
    with NON_GHG_SCOPE_REVIEW_FILE.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=NON_GHG_REVIEW_FIELDS)
        writer.writeheader()
        writer.writerows(review_rows)
    counts = {}
    for row in rows:
        key = row["review_priority"]
        counts[key] = counts.get(key, 0) + 1
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")
    print(f"Rows: {len(rows)}")
    print(f"Wrote {NON_GHG_SCOPE_REVIEW_FILE.relative_to(ROOT)}")
    print(f"Non-GHG Scope review rows: {len(review_rows)}")
    for key in sorted(counts):
        print(f"{key}: {counts[key]}")


if __name__ == "__main__":
    main()
