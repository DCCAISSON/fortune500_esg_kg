import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ROOT / "assets" / "data" / "world500" / "workbench"
REPORTING_FILE = WORKBENCH / "reporting_views.json"
OUTPUT_FILE = WORKBENCH / "world500_ghg_series_mapping_audit.csv"
CONTEXTUAL_REVIEW_FILE = WORKBENCH / "world500_ghg_contextual_series_review_queue.csv"
OVERMAPPING_REVIEW_FILE = WORKBENCH / "world500_ghg_contextual_overmapping_review_queue.csv"
EXPLICIT_CANDIDATE_FILE = WORKBENCH / "world500_ghg_explicit_series_candidate_queue.csv"
OVERMAPPING_P0_FILE = WORKBENCH / "world500_ghg_p0_overmapped_contextual_edge_queue.csv"
OVERMAPPING_P1_FILE = WORKBENCH / "world500_ghg_p1_named_series_missing_queue.csv"
OVERMAPPING_P2_FILE = WORKBENCH / "world500_ghg_p2_low_evidence_contextual_edge_queue.csv"
OUT_OF_WHITELIST_FILE = WORKBENCH / "world500_ghg_out_of_whitelist_series_review_queue.csv"


FIELDS = [
    "review_priority",
    "evidence_strength",
    "match_status",
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
    "evidence_gate",
    "matched_aliases",
    "evidence_count",
    "pages",
    "source_files",
    "sample_confidence",
    "sample_review_status",
    "sample_snippet_en",
    "sample_snippet_zh",
]

CONTEXTUAL_REVIEW_FIELDS = [
    "review_priority",
    "recommended_action",
    "evidence_strength",
    "match_status",
    "company_id",
    "world500_rank",
    "company_name_en",
    "company_name_zh",
    "series_id",
    "series_name_en",
    "series_name_zh",
    "core_whitelist",
    "whitelist_gate",
    "role_en",
    "role_zh",
    "principle_en",
    "principle_zh",
    "language_policy_en",
    "language_policy_zh",
    "evidence_count",
    "pages",
    "source_files",
    "sample_review_status",
    "sample_confidence",
    "sample_snippet_en",
    "sample_snippet_zh",
]

OVERMAPPING_REVIEW_FIELDS = [
    "review_priority",
    "recommended_action",
    "overmapping_reason",
    "named_series_ids_in_sample",
    "named_series_names_in_sample",
    *CONTEXTUAL_REVIEW_FIELDS[2:],
]

EXPLICIT_CANDIDATE_FIELDS = [
    "review_priority",
    "recommended_action",
    "candidate_type",
    "named_series_ids_in_sample",
    "named_series_names_in_sample",
    "candidate_series_ids_to_check",
    "candidate_series_names_to_check",
    *CONTEXTUAL_REVIEW_FIELDS[2:],
]

OUT_OF_WHITELIST_FIELDS = [
    "review_priority",
    "recommended_action",
    "out_of_whitelist_reason",
    *CONTEXTUAL_REVIEW_FIELDS[2:],
]

EXPLICIT_SERIES_PATTERNS = {
    "ghg_corporate_standard": [
        r"ghg protocol corporate accounting and reporting standard",
        r"greenhouse gas protocol.?s corporate accounting and reporting standard",
        r"greenhouse gas protocol corporate accounting and reporting standard",
        r"corporate accounting and reporting standard",
        # Audit-only truncated PDF snippets: route to review/demotion, never direct acceptance.
        r"(?:ghg protocol|greenhouse gas protocol).{0,80}corporate accounting an\b",
    ],
    "ghg_scope3_standard": [
        r"ghg protocol corporate value chain\s*\(scope 3\)\s*accounting and reporting standard",
        r"corporate value chain\s*\(scope 3\)\s*accounting and reporting standard",
        r"scope 3 accounting and reporting standard",
    ],
    "ghg_land_sector_removals_standard": [
        r"ghg protocol land sector and removals standard",
        r"land sector and removals standard",
        r"land-sector-and-removals-standard",
    ],
    "ghg_product_standard": [
        r"ghg protocol product life cycle accounting and reporting standard",
        r"product life cycle accounting and reporting standard",
        r"\bghgp\b.*product life cycle",
    ],
    "ghg_cities_gpc": [
        r"global protocol for community-scale greenhouse gas emission inventories",
        r"global protocol for community-scale greenhouse gas inventories",
        r"\bgpc\b.*community-scale greenhouse gas emission inventories",
    ],
    "ghg_mitigation_goal_standard": [
        r"ghg protocol mitigation goal standard",
        r"mitigation goal standard",
    ],
    "ghg_policy_action_standard": [
        r"ghg protocol policy and action standard",
        r"policy and action standard",
    ],
    "ghg_actions_market_instruments_standard": [
        r"ghg protocol actions and market instruments standard",
        r"actions and market instruments standard",
    ],
    "ghg_scope2_guidance": [
        r"ghg protocol scope 2 guidance",
        r"scope 2 guidance",
    ],
    "ghg_scope3_calculation_guidance": [
        r"ghg protocol scope 3 calculation guidance",
        r"scope 3 calculation guidance",
        r"technical guidance.*calculat.*scope 3",
    ],
    "ghg_agriculture_guidance": [
        r"ghg protocol agriculture guidance",
        r"agriculture guidance",
    ],
    "ghg_gpc_forests_trees_guidance": [
        r"gpc supplemental guidance for forests and trees",
        r"supplemental guidance for forests and trees",
    ],
    "ghg_avoided_emissions_guidance": [
        r"ghg protocol estimating and reporting avoided emissions",
        r"estimating and reporting avoided emissions",
    ],
    "ghg_public_sector_protocol": [
        r"ghg protocol public sector protocol",
        r"public sector protocol",
    ],
    "ghg_fossil_reserves_guidance": [
        r"ghg protocol potential emissions from fossil fuel reserves",
        r"potential emissions from fossil fuel reserves",
    ],
    "ghg_project_protocol": [
        r"ghg protocol project protocol",
        r"project protocol",
        r"the ghg protocol for project accounting",
        r"ghg protocol for project accounting",
    ],
    "ghg_grid_connected_electricity_projects": [
        r"ghg protocol guidelines for grid-connected electricity projects",
        r"guidelines for grid-connected electricity projects",
        r"grid-connected electricity projects",
        r"grid connected electricity projects",
    ],
    "ghg_financial_industry_standard": [
        r"global ghg accounting and reporting standard for the financial industry",
        r"the global ghg accounting and reporting standard for the financial industry",
        r"partnership for carbon accounting financials",
        r"\bpcaf\b",
    ],
    "ghg_brazilian_program": [
        r"brazilian ghg protocol program",
        r"programa brasileiro ghg protocol",
        r"registro p[úu]blico de emiss[õo]es do programa brasileiro ghg protocol",
        r"selo ouro no programa ghg protocol",
        r"ghg protocol\s*-\s*fgv",
    ],
}

COMPILED_EXPLICIT_PATTERNS = {
    series_id: [re.compile(pattern, re.I) for pattern in patterns]
    for series_id, patterns in EXPLICIT_SERIES_PATTERNS.items()
}


def load_payload():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def join(values):
    if not isinstance(values, list):
        return ""
    return " | ".join(str(value) for value in values if value not in (None, ""))


def evidence_strength(match_status):
    if match_status == "explicit_series_citation":
        return "strong_explicit"
    if match_status == "contextual_scope_inventory_mapping":
        return "contextual_review_required"
    if match_status == "contextual_overmapped_review":
        return "overmapped_review_required"
    return "review_required"


def review_priority(match_status, evidence_count):
    if match_status == "explicit_series_citation":
        return "P2_verify_snippet_quality"
    if match_status == "contextual_overmapped_review":
        return "P0_reassign_or_demote_contextual_overmapping"
    if evidence_count >= 3:
        return "P0_upgrade_contextual_to_explicit"
    return "P1_find_named_series_source"


def named_series_ids(text):
    text = str(text or "")
    return sorted(
        series_id
        for series_id, patterns in COMPILED_EXPLICIT_PATTERNS.items()
        if any(pattern.search(text) for pattern in patterns)
    )


def overmapping_priority(row, named_ids):
    current_series = row.get("series_id")
    if current_series in named_ids:
        return ""
    if named_ids:
        return "P0_possible_overmapped_contextual_edge"
    if int(row.get("evidence_count") or 0) >= 3:
        return "P1_named_series_missing_from_sample"
    return "P2_low_evidence_contextual_edge"


def overmapping_reason(row, named_ids):
    current_series = row.get("series_id")
    if current_series in named_ids:
        return ""
    if named_ids:
        return "Sample snippet explicitly names other GHG Protocol series but does not name this linked series."
    return "Sample snippet does not explicitly name the linked GHG Protocol fine series."


def overmapping_action(priority):
    if priority == "P0_possible_overmapped_contextual_edge":
        return (
            "Do not treat this edge as an accepted company-series relationship until the PDF text "
            "explicitly names the linked series; verify whether the edge should be demoted."
        )
    if priority == "P1_named_series_missing_from_sample":
        return (
            "Find a stronger PDF snippet that names the linked series, or keep the edge as contextual "
            "and visually lower-confidence in graph/table outputs."
        )
    return (
        "Review whether this low-evidence contextual edge should remain in the graph or be retained "
        "only as a search lead."
    )


def explicit_candidate_priority(row, named_ids):
    current_series = row.get("series_id")
    if not named_ids:
        return ""
    if current_series in named_ids:
        return "P0_promote_after_pdf_page_verification"
    return "P0_reassign_or_demote_after_pdf_page_verification"


def explicit_candidate_type(row, named_ids):
    current_series = row.get("series_id")
    if current_series in named_ids:
        return "same_linked_series_named_in_sample"
    return "different_series_named_in_sample"


def explicit_candidate_action(row, named_ids):
    current_series = row.get("series_id")
    if current_series in named_ids:
        return (
            "Verify the cited PDF page and expand the snippet so it contains the named GHG Protocol "
            "series. Only then promote this company-series edge from contextual to explicit."
        )
    return (
        "Do not promote the current linked series. Verify whether the company should instead be "
        "linked to the named series in the sample; demote the current edge if no PDF text names it."
    )


def out_of_whitelist_action(row):
    return (
        "Keep this row outside the core 12-item GHG/PCAF fine-series queue. It may be useful as a "
        "separate GHG-derived program/guidance lead, but it must not be promoted into the core "
        "standard-company graph unless the whitelist registry is explicitly expanded."
    )


def out_of_whitelist_reason(row):
    series_id = row.get("series_id") or "unknown_series"
    return (
        f"{series_id} is not part of the controlled 12-item GHG/PCAF whitelist for accepted "
        "company-standard edges."
    )


def main():
    payload = load_payload()
    definitions = {
        item["id"]: item
        for item in payload.get("ghg_standard_series", {}).get("definitions", [])
    }
    rows = []
    for company in payload.get("ghg_standard_series", {}).get("company_mappings", []):
        for series in company.get("series", []):
            definition = definitions.get(series.get("series_id"), {})
            samples = series.get("evidence_samples") or []
            sample = samples[0] if samples else {}
            match_status = series.get("match_status") or "unknown"
            evidence_count = int(series.get("evidence_count") or 0)
            rows.append({
                "review_priority": review_priority(match_status, evidence_count),
                "evidence_strength": evidence_strength(match_status),
                "match_status": match_status,
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
                "core_whitelist": "yes" if definition.get("core_whitelist") else "no",
                "whitelist_gate": (
                    "eligible_for_acceptance_if_pdf_explicitly_names_this_whitelisted_series"
                    if definition.get("core_whitelist")
                    else "not_in_12_core_ghg_pcaf_whitelist_keep_review_only_unless_registry_is_expanded"
                ),
                "category_en": series.get("category_en", ""),
                "category_zh": series.get("category_zh", ""),
                "role_en": definition.get("role_en", ""),
                "role_zh": definition.get("role_zh", ""),
                "principle_en": definition.get("principle_en", ""),
                "principle_zh": definition.get("principle_zh", ""),
                "language_policy_en": definition.get("language_policy_en", ""),
                "language_policy_zh": definition.get("language_policy_zh", ""),
                "evidence_gate": series.get("evidence_gate", ""),
                "matched_aliases": join(series.get("matched_aliases", [])),
                "evidence_count": evidence_count,
                "pages": join(series.get("pages", [])),
                "source_files": join(series.get("source_files", [])),
                "sample_confidence": sample.get("confidence", ""),
                "sample_review_status": sample.get("review_status", ""),
                "sample_snippet_en": sample.get("snippet_en", ""),
                "sample_snippet_zh": sample.get("snippet_zh", ""),
            })

    rows.sort(key=lambda item: (
        {"P0_upgrade_contextual_to_explicit": 0, "P1_find_named_series_source": 1, "P2_verify_snippet_quality": 2}.get(item["review_priority"], 9),
        int(item["world500_rank"] or 9999),
        item["series_id"],
    ))
    with OUTPUT_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    contextual_rows = []
    overmapping_rows = []
    explicit_candidate_rows = []
    out_of_whitelist_rows = []
    for row in rows:
        review_row = {
            field: row.get(field, "")
            for field in CONTEXTUAL_REVIEW_FIELDS
            if field != "recommended_action"
        }
        if row.get("core_whitelist") != "yes":
            outside_row = {
                field: review_row.get(field, "")
                for field in OUT_OF_WHITELIST_FIELDS
                if field not in {
                    "review_priority",
                    "recommended_action",
                    "out_of_whitelist_reason",
                }
            }
            outside_row.update({
                "review_priority": "P0_isolate_out_of_whitelist_ghg_reference",
                "recommended_action": out_of_whitelist_action(row),
                "out_of_whitelist_reason": out_of_whitelist_reason(row),
            })
            out_of_whitelist_rows.append(outside_row)
            continue
        if row["review_priority"] not in {"P0_upgrade_contextual_to_explicit", "P1_find_named_series_source", "P0_reassign_or_demote_contextual_overmapping"}:
            continue
        if row["review_priority"] == "P0_reassign_or_demote_contextual_overmapping":
            review_row["recommended_action"] = (
                "The current snippet names another GHG Protocol series but not this linked series. "
                "Verify the PDF page, then reassign the edge to the named series or demote it."
            )
        else:
            review_row["recommended_action"] = (
                "Find or extract PDF source text that explicitly names this GHG Protocol series. "
                "Until explicit source text is available, keep this edge as contextual/review-required."
            )
        contextual_rows.append(review_row)
        sample_text = " ".join([row.get("sample_snippet_en", ""), row.get("sample_snippet_zh", "")])
        named_ids = named_series_ids(sample_text)
        if named_ids:
            named_names = [
                definitions.get(series_id, {}).get("name_en", series_id)
                for series_id in named_ids
            ]
            current_series = row.get("series_id")
            candidate_ids = named_ids if current_series not in named_ids else [current_series]
            candidate_names = [
                definitions.get(series_id, {}).get("name_en", series_id)
                for series_id in candidate_ids
            ]
            candidate_row = {
                field: review_row.get(field, "")
                for field in EXPLICIT_CANDIDATE_FIELDS
                if field not in {
                    "review_priority",
                    "recommended_action",
                    "candidate_type",
                    "named_series_ids_in_sample",
                    "named_series_names_in_sample",
                    "candidate_series_ids_to_check",
                    "candidate_series_names_to_check",
                }
            }
            candidate_row.update({
                "review_priority": explicit_candidate_priority(row, named_ids),
                "recommended_action": explicit_candidate_action(row, named_ids),
                "candidate_type": explicit_candidate_type(row, named_ids),
                "named_series_ids_in_sample": join(named_ids),
                "named_series_names_in_sample": join(named_names),
                "candidate_series_ids_to_check": join(candidate_ids),
                "candidate_series_names_to_check": join(candidate_names),
            })
            explicit_candidate_rows.append(candidate_row)
        priority = overmapping_priority(row, named_ids)
        if priority:
            named_names = [
                definitions.get(series_id, {}).get("name_en", series_id)
                for series_id in named_ids
            ]
            overmapping_row = {
                field: review_row.get(field, "")
                for field in OVERMAPPING_REVIEW_FIELDS
                if field not in {
                    "review_priority",
                    "recommended_action",
                    "overmapping_reason",
                    "named_series_ids_in_sample",
                    "named_series_names_in_sample",
                }
            }
            overmapping_row.update({
                "review_priority": priority,
                "recommended_action": overmapping_action(priority),
                "overmapping_reason": overmapping_reason(row, named_ids),
                "named_series_ids_in_sample": join(named_ids),
                "named_series_names_in_sample": join(named_names),
            })
            overmapping_rows.append(overmapping_row)
    with CONTEXTUAL_REVIEW_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=CONTEXTUAL_REVIEW_FIELDS)
        writer.writeheader()
        writer.writerows(contextual_rows)
    overmapping_rows.sort(key=lambda item: (
        {
            "P0_possible_overmapped_contextual_edge": 0,
            "P1_named_series_missing_from_sample": 1,
            "P2_low_evidence_contextual_edge": 2,
        }.get(item["review_priority"], 9),
        int(item["world500_rank"] or 9999),
        item["series_id"],
    ))
    with OVERMAPPING_REVIEW_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=OVERMAPPING_REVIEW_FIELDS)
        writer.writeheader()
        writer.writerows(overmapping_rows)
    split_overmapping_files = [
        (OVERMAPPING_P0_FILE, "P0_possible_overmapped_contextual_edge"),
        (OVERMAPPING_P1_FILE, "P1_named_series_missing_from_sample"),
        (OVERMAPPING_P2_FILE, "P2_low_evidence_contextual_edge"),
    ]
    split_overmapping_counts = {}
    for path, priority in split_overmapping_files:
        split_rows = [row for row in overmapping_rows if row["review_priority"] == priority]
        with path.open("w", encoding="utf-8-sig", newline="") as output:
            writer = csv.DictWriter(output, fieldnames=OVERMAPPING_REVIEW_FIELDS)
            writer.writeheader()
            writer.writerows(split_rows)
        split_overmapping_counts[priority] = len(split_rows)
    explicit_candidate_rows.sort(key=lambda item: (
        {
            "P0_promote_after_pdf_page_verification": 0,
            "P0_reassign_or_demote_after_pdf_page_verification": 1,
        }.get(item["review_priority"], 9),
        int(item["world500_rank"] or 9999),
        item["series_id"],
    ))
    with EXPLICIT_CANDIDATE_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=EXPLICIT_CANDIDATE_FIELDS)
        writer.writeheader()
        writer.writerows(explicit_candidate_rows)
    out_of_whitelist_rows.sort(key=lambda item: (
        int(item["world500_rank"] or 9999),
        item["company_id"],
        item["series_id"],
    ))
    with OUT_OF_WHITELIST_FILE.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=OUT_OF_WHITELIST_FIELDS)
        writer.writeheader()
        writer.writerows(out_of_whitelist_rows)
    core_rows = [row for row in rows if row.get("core_whitelist") == "yes"]
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")
    print(f"Wrote {CONTEXTUAL_REVIEW_FILE.relative_to(ROOT)}")
    print(f"Wrote {OVERMAPPING_REVIEW_FILE.relative_to(ROOT)}")
    print(f"Wrote {OVERMAPPING_P0_FILE.relative_to(ROOT)}")
    print(f"Wrote {OVERMAPPING_P1_FILE.relative_to(ROOT)}")
    print(f"Wrote {OVERMAPPING_P2_FILE.relative_to(ROOT)}")
    print(f"Wrote {EXPLICIT_CANDIDATE_FILE.relative_to(ROOT)}")
    print(f"Wrote {OUT_OF_WHITELIST_FILE.relative_to(ROOT)}")
    print(json.dumps({
        "row_count": len(rows),
        "core_whitelist_row_count": len(core_rows),
        "out_of_whitelist_review_rows": len(out_of_whitelist_rows),
        "p0_contextual_upgrade_rows": sum(1 for row in core_rows if row["review_priority"] == "P0_upgrade_contextual_to_explicit"),
        "p0_reassign_or_demote_contextual_overmapping_rows": sum(1 for row in core_rows if row["review_priority"] == "P0_reassign_or_demote_contextual_overmapping"),
        "p1_find_named_source_rows": sum(1 for row in core_rows if row["review_priority"] == "P1_find_named_series_source"),
        "p2_verify_explicit_rows": sum(1 for row in core_rows if row["review_priority"] == "P2_verify_snippet_quality"),
        "contextual_review_queue_rows": len(contextual_rows),
        "overmapping_review_queue_rows": len(overmapping_rows),
        "p0_possible_overmapped_contextual_edges": sum(1 for row in overmapping_rows if row["review_priority"] == "P0_possible_overmapped_contextual_edge"),
        "p1_named_series_missing_from_sample_rows": split_overmapping_counts["P1_named_series_missing_from_sample"],
        "p2_low_evidence_contextual_edge_rows": split_overmapping_counts["P2_low_evidence_contextual_edge"],
        "explicit_candidate_queue_rows": len(explicit_candidate_rows),
        "p0_promote_after_pdf_page_verification_rows": sum(1 for row in explicit_candidate_rows if row["review_priority"] == "P0_promote_after_pdf_page_verification"),
        "p0_reassign_or_demote_after_pdf_page_verification_rows": sum(1 for row in explicit_candidate_rows if row["review_priority"] == "P0_reassign_or_demote_after_pdf_page_verification"),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
