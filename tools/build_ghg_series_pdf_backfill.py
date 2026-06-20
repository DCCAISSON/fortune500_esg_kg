import json
import re
from datetime import datetime, timezone
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
WORKBENCH_DIR = ROOT / "assets" / "data" / "world500" / "workbench"
COMPANIES_DIR = WORKBENCH_DIR / "companies"
REPORTING_FILE = WORKBENCH_DIR / "reporting_views.json"
OUTPUT_FILE = WORKBENCH_DIR / "ghg_series_pdf_page_backfill.json"

PAGE_WINDOW_CACHE = {}
DOCUMENT_HIT_CACHE = {}


SERIES = {
    "ghg_policy_action_standard": {
        "name_en": "GHG Protocol Policy and Action Standard",
        "name_zh": "GHG Protocol 政策与行动标准",
    },
    "ghg_mitigation_goal_standard": {
        "name_en": "GHG Protocol Mitigation Goal Standard",
        "name_zh": "GHG Protocol 减缓目标标准",
    },
    "ghg_land_sector_removals_standard": {
        "name_en": "GHG Protocol Land Sector and Removals Standard",
        "name_zh": "GHG Protocol 土地部门与碳移除标准",
    },
    "ghg_grid_connected_electricity_projects": {
        "name_en": "GHG Protocol Guidelines for Grid-Connected Electricity Projects",
        "name_zh": "GHG Protocol 并网电力项目指南",
    },
    "ghg_cities_gpc": {
        "name_en": "Global Protocol for Community-Scale Greenhouse Gas Emission Inventories",
        "name_zh": "社区规模温室气体排放清单全球协议（GPC）",
    },
    "ghg_corporate_standard": {
        "name_en": "GHG Protocol Corporate Accounting and Reporting Standard",
        "name_zh": "GHG Protocol 企业核算与报告标准",
    },
    "ghg_scope2_guidance": {
        "name_en": "GHG Protocol Scope 2 Guidance",
        "name_zh": "GHG Protocol Scope 2 指南",
    },
    "ghg_scope3_standard": {
        "name_en": "GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard",
        "name_zh": "GHG Protocol 企业价值链（Scope 3）核算与报告标准",
    },
    "ghg_scope3_calculation_guidance": {
        "name_en": "GHG Protocol Scope 3 Calculation Guidance",
        "name_zh": "GHG Protocol Scope 3 计算指南",
    },
    "ghg_product_standard": {
        "name_en": "GHG Protocol Product Life Cycle Accounting and Reporting Standard",
        "name_zh": "GHG Protocol 产品生命周期核算与报告标准",
    },
    "ghg_project_protocol": {
        "name_en": "GHG Protocol Project Protocol",
        "name_zh": "GHG Protocol 项目减排核算协议",
    },
    "ghg_avoided_emissions_guidance": {
        "name_en": "GHG Protocol Estimating and Reporting Avoided Emissions",
        "name_zh": "GHG Protocol 避免排放估算与报告指南",
    },
    "ghg_land_sector_removals_standard": {
        "name_en": "GHG Protocol Land Sector and Removals Standard",
        "name_zh": "GHG Protocol 土地部门与碳移除标准",
    },
    "ghg_financial_industry_standard": {
        "name_en": "Global GHG Accounting and Reporting Standard for the Financial Industry",
        "name_zh": "金融行业全球温室气体核算与报告标准",
    },
    "ghg_brazilian_program": {
        "name_en": "Brazilian GHG Protocol Program",
        "name_zh": "巴西 GHG Protocol 项目/计划",
    },
}


EXPLICIT_PATTERNS = {
    "ghg_policy_action_standard": [
        re.compile(r"ghg protocol policy and action standard", re.I),
        re.compile(r"policy and action standard", re.I),
    ],
    "ghg_mitigation_goal_standard": [
        re.compile(r"ghg protocol mitigation goal standard", re.I),
        re.compile(r"mitigation goal standard", re.I),
    ],
    "ghg_land_sector_removals_standard": [
        re.compile(r"ghg protocol land sector and removals standard", re.I),
        re.compile(r"land sector and removals standard", re.I),
        re.compile(r"land-sector-and-removals-standard", re.I),
    ],
    "ghg_grid_connected_electricity_projects": [
        re.compile(r"ghg protocol guidelines for grid-connected electricity projects", re.I),
        re.compile(r"guidelines for grid-connected electricity projects", re.I),
        re.compile(r"grid-connected electricity projects", re.I),
        re.compile(r"grid connected electricity projects", re.I),
    ],
    "ghg_cities_gpc": [
        re.compile(r"global protocol for community-scale greenhouse gas emission inventories", re.I),
        re.compile(r"global protocol for community-scale greenhouse gas inventories", re.I),
        re.compile(r"\bgpc\b.{0,120}community-scale greenhouse gas", re.I),
    ],
    "ghg_corporate_standard": [
        re.compile(r"corporate accounting and reporting standard", re.I),
        re.compile(
            r"(?:ghg protocol|greenhouse gas protocol|wri|world resources institute|world business council).{0,160}corporate standard",
            re.I,
        ),
        re.compile(
            r"(?:ghg protocol|greenhouse gas protocol|wri|world resources institute|world business council).{0,160}corporate accounting standard",
            re.I,
        ),
    ],
    "ghg_scope2_guidance": [
        re.compile(r"scope 2 guidance", re.I),
    ],
    "ghg_scope3_standard": [
        re.compile(r"corporate value chain\s*\(scope 3\)", re.I),
        re.compile(r"corporate value chain.*scope 3", re.I),
        re.compile(r"scope 3.*accounting and reporting standard", re.I),
    ],
    "ghg_scope3_calculation_guidance": [
        re.compile(r"scope 3 calculation guidance", re.I),
        re.compile(r"technical guidance for calculating scope 3 emissions", re.I),
    ],
    "ghg_financial_industry_standard": [
        re.compile(r"global ghg accounting and reporting standard for the financial industry", re.I),
        re.compile(r"the global ghg accounting and reporting standard for the financial industry", re.I),
        re.compile(r"partnership for carbon accounting financials", re.I),
        re.compile(r"\bpcaf\b", re.I),
    ],
    "ghg_product_standard": [
        re.compile(r"product life cycle accounting and reporting standard", re.I),
        re.compile(r"ghg protocol product standard", re.I),
        re.compile(r"greenhouse gas protocol product standard", re.I),
    ],
    "ghg_project_protocol": [
        re.compile(r"project protocol", re.I),
        re.compile(r"the ghg protocol for project accounting", re.I),
        re.compile(r"ghg protocol for project accounting", re.I),
        re.compile(r"project accounting protocol", re.I),
    ],
    "ghg_avoided_emissions_guidance": [
        re.compile(r"estimating and reporting avoided emissions", re.I),
    ],
    "ghg_brazilian_program": [
        re.compile(r"programa brasileiro ghg protocol", re.I),
        re.compile(r"brazilian ghg protocol program", re.I),
        re.compile(r"registro p[úu]blico de emiss[õo]es do programa brasileiro ghg protocol", re.I),
        re.compile(r"selo ouro no programa ghg protocol", re.I),
        re.compile(r"ghg protocol\s*-\s*fgv", re.I),
    ],
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def is_financed_emissions_method_context(text):
    return bool(
        re.search(
            r"pcaf|partnership for carbon accounting financials|financed emissions|portfolio emissions|loans and investments|category\s*15",
            clean(text),
            re.I,
        )
    )


def has_acceptance_context(text):
    source = clean(text)
    if not source:
        return False
    return bool(
        re.search(
            r"in accordance with|in line with|align(?:ed|ment)? (?:with|to)|adher(?:e|es|ed|ing) to|according to|under (?:the )?|basis set out (?:within|in)|participated in the pilot|pilot of the standard|since[\s\S]{0,80}published|calculated(?:\s+\w+){0,8}\s+(?:per|using|under|according to|in accordance with|based on|consistent with)|prepared(?:\s+\w+){0,8}\s+(?:using|under|according to|in accordance with|based on|consistent with)|using|uses|used|following|followed|based on|criteria|methodolog|accounted|guided|pursuant to|consistent with|conform(?:s|ed|ing)? to|reference to|draws on|defined by|defined in|classif(?:y|ies|ied)|standard(?:s)? used|standards? including|recommended by|as recommended by|assessment.*in line|we follow|we use|we also use|we apply|apply|applies|applied|verification conducted|assurance.*against|report(?:ed|ing)?(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)|disclos(?:e|ed|ing)(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)|按照|依据|根据|参照|采用|使用|遵循|符合|依據|根據|參照|採用|遵循",
            source,
            re.I,
        )
    )


def context_window(text, pattern, radius=360):
    source = clean(text)
    if not source or not pattern:
        return source
    match = pattern.search(source)
    if not match:
        return source
    start = max(0, match.start() - radius)
    end = min(len(source), match.end() + radius)
    return clean(source[start:end])


def has_series_acceptance_context(series_id, text):
    source = clean(text)
    if not source or not has_acceptance_context(source):
        return False
    if series_id != "ghg_financial_industry_standard":
        return True
    has_named_pcaf_standard = bool(
        re.search(
            r"global ghg accounting and reporting standard for the financial industry|pcaf standard|partnership for carbon accounting financials|\bpcaf\b",
            source,
            re.I,
        )
    )
    has_finance_boundary = bool(
        re.search(
            r"financed(?: and facilitated)? emissions|facilitated emissions|portfolio emissions|insurance[-\s]+associated emissions|insured emissions|loans? and investments?|investment emissions|investments? emission|category\s*15|asset classes?|data quality score|pcaf score|listed equity|corporate bonds?|business loans?|project finance|commercial real estate|mortgages?|sovereign debt|lending\/capital markets|green bonds?|renewable energy power plants",
            source,
            re.I,
        )
    )
    has_method_use = bool(
        re.search(
            r"in accordance with|in line with|align(?:ed|ment)? (?:with|to)|adher(?:e|es|ed|ing) to|according to|under (?:the )?|basis set out (?:within|in)|calculated|calculation|methodolog|using|used|based on|consistent with|standards? including|standards? used|we use|we follow|we apply|apply|applies|applied|measured|accounted|refer(?:s|red|ring)? to|referencing|report(?:ed|ing)?(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)",
            source,
            re.I,
        )
    )
    membership_only = bool(
        re.search(
            r"member of pcaf|joined pcaf|pcaf signatory|pcaf member|partnership for carbon accounting financials is a global partnership",
            source,
            re.I,
        )
        and not re.search(
            r"calculated|calculation|methodolog|using|used|based on|consistent with|standards? including|standards? used|in accordance with|in line with|we apply|apply|applies|applied|financed emissions|portfolio emissions",
            source,
            re.I,
        )
    )
    negative_use = bool(
        re.search(
            r"(?:do|does|did)\s+not\s+(?:use|apply|follow)|not\s+(?:used|applied|followed)|pcaf[\s\S]{0,160}not\s+suitable|pcaf methodology[\s\S]{0,160}nonsensical|determined[\s\S]{0,160}pcaf[\s\S]{0,160}not\s+suitable|pcaf[\s\S]{0,80}lacks guidance|pcaf-like",
            source,
            re.I,
        )
    )
    return has_named_pcaf_standard and has_method_use and has_finance_boundary and not membership_only and not negative_use


def explicit_series_ids(text):
    return {
        series_id
        for series_id, patterns in EXPLICIT_PATTERNS.items()
        if any(pattern.search(text) for pattern in patterns)
    }


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, payload):
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def compact(value, limit=620):
    text = clean(value)
    return text if len(text) <= limit else f"{text[: limit - 1]}…"


def source_text(row):
    # Structured standard tags are model outputs, not PDF evidence. They can
    # identify rows worth checking, but must not prove an explicit series cite.
    return clean(
        " ".join(
            str(row.get(key, ""))
            for key in (
                "recognition_basis_en",
                "snippet_en",
                "estimate_basis_en",
                "calculation_method_en",
                "source_file",
            )
        )
    )


def company_files_by_id():
    result = {}
    for path in sorted(COMPANIES_DIR.glob("*.json")):
        payload = read_json(path)
        company_id = clean(payload.get("company_id"))
        if company_id:
            result[company_id] = (path, payload)
    return result


def ghg_rows(company):
    rows = []
    rows.extend(company.get("standards") or [])
    rows.extend(
        row
        for row in (company.get("evidence_ledger") or [])
        if re.search(r"standard", clean(row.get("fact_type_en")), re.I)
    )
    return [
        row
        for row in rows
        if re.search(r"ghg protocol|greenhouse gas protocol", source_text(row), re.I)
    ]


def report_sources(company):
    sources = {}

    def add_source(source_path, source_file="", page=""):
        path_text = clean(source_path)
        if not path_text or not Path(path_text).exists():
            return
        key = path_text.lower()
        if key not in sources:
            sources[key] = {
                "source_path": path_text,
                "source_file": clean(source_file) or Path(path_text).name,
                "page": clean(page),
            }

    source_paths = company.get("source_paths") or []
    source_files = company.get("source_files") or []
    if isinstance(source_paths, list):
        for index, source_path in enumerate(source_paths):
            source_file = source_files[index] if isinstance(source_files, list) and index < len(source_files) else ""
            add_source(source_path, source_file)

    for value in company.values():
        if not isinstance(value, list):
            continue
        for row in value:
            if not isinstance(row, dict):
                continue
            add_source(
                row.get("source_path"),
                row.get("source_file"),
                row.get("evidence_page") or row.get("page"),
            )
    return list(sources.values())


def extract_page_window(pdf_path, page_value):
    if not pdf_path or not Path(pdf_path).exists():
        return "", []
    match = re.search(r"\d+", str(page_value or ""))
    if not match:
        return "", []
    cache_key = (str(pdf_path), match.group(0))
    if cache_key in PAGE_WINDOW_CACHE:
        return PAGE_WINDOW_CACHE[cache_key]
    page_number = int(match.group(0))
    chunks = []
    pages = []
    try:
        with fitz.open(pdf_path) as doc:
            for index in (page_number - 2, page_number - 1, page_number):
                if 0 <= index < doc.page_count:
                    pages.append(index + 1)
                    chunks.append(doc.load_page(index).get_text("text"))
    except Exception:
        PAGE_WINDOW_CACHE[cache_key] = ("", [])
        return PAGE_WINDOW_CACHE[cache_key]
    PAGE_WINDOW_CACHE[cache_key] = (clean(" ".join(chunks)), pages)
    return PAGE_WINDOW_CACHE[cache_key]


def extract_document_hits(pdf_path, patterns, max_hits=3):
    if not pdf_path or not Path(pdf_path).exists():
        return "", []
    cache_key = (str(pdf_path), tuple(pattern.pattern for pattern in patterns), max_hits)
    if cache_key in DOCUMENT_HIT_CACHE:
        return DOCUMENT_HIT_CACHE[cache_key]
    chunks = []
    pages = []
    try:
        with fitz.open(pdf_path) as doc:
            for index in range(doc.page_count):
                text = clean(doc.load_page(index).get_text("text"))
                if not text:
                    continue
                if any(pattern.search(text) for pattern in patterns):
                    pages.append(index + 1)
                    chunks.append(text)
                    if len(chunks) >= max_hits:
                        break
    except Exception:
        DOCUMENT_HIT_CACHE[cache_key] = ("", [])
        return DOCUMENT_HIT_CACHE[cache_key]
    DOCUMENT_HIT_CACHE[cache_key] = (clean(" ".join(chunks)), pages)
    return DOCUMENT_HIT_CACHE[cache_key]


def extract_document_series_hits(pdf_path, max_hits_per_series=3):
    if not pdf_path or not Path(pdf_path).exists():
        return {}
    cache_key = (str(pdf_path), max_hits_per_series)
    if cache_key in DOCUMENT_HIT_CACHE:
        return DOCUMENT_HIT_CACHE[cache_key]
    hits = {series_id: [] for series_id in EXPLICIT_PATTERNS}
    try:
        with fitz.open(pdf_path) as doc:
            for index in range(doc.page_count):
                text = clean(doc.load_page(index).get_text("text"))
                if not text:
                    continue
                for series_id, patterns in EXPLICIT_PATTERNS.items():
                    if len(hits[series_id]) >= max_hits_per_series:
                        continue
                    matched_pattern = next((pattern for pattern in patterns if pattern.search(text)), None)
                    if matched_pattern and has_series_acceptance_context(series_id, context_window(text, matched_pattern)):
                        hits[series_id].append({
                            "page": index + 1,
                            "text": text,
                        })
    except Exception:
        DOCUMENT_HIT_CACHE[cache_key] = {}
        return DOCUMENT_HIT_CACHE[cache_key]
    DOCUMENT_HIT_CACHE[cache_key] = {series_id: rows for series_id, rows in hits.items() if rows}
    return DOCUMENT_HIT_CACHE[cache_key]


def explicit_pattern_list():
    patterns = []
    for series_patterns in EXPLICIT_PATTERNS.values():
        patterns.extend(series_patterns)
    return patterns


def explicit_statuses(matches):
    return {series_id for series_id, status in matches if status == "pdf_explicit_series_citation"}


def excerpt(text, series_id=None, status=""):
    match = None
    if status == "pdf_explicit_series_citation" and series_id in EXPLICIT_PATTERNS:
        for pattern in EXPLICIT_PATTERNS[series_id]:
            match = pattern.search(text)
            if match:
                break
    if not match:
        match = re.search(
            r"corporate accounting|corporate standard|scope\s*2 guidance|scope\s*3 calculation guidance|technical guidance for calculating scope\s*3 emissions|corporate value chain\s*\(scope\s*3\)|scope\s*3|ghg protocol|greenhouse gas protocol|market-based|location-based|product life cycle|land sector and removals|avoided emissions|project protocol|programa brasileiro|温室气体核算体系|溫室氣體核算體系|碳盘查|碳盤查|范围|範疇",
            text,
            re.I,
        )
    if not match:
        return compact(text)
    start = max(0, match.start() - 260)
    end = min(len(text), match.end() + 360)
    return compact(text[start:end])


def infer_series(combined_text):
    ids = set()
    text = clean(combined_text)
    lower = text.lower()
    explicit_ids = explicit_series_ids(text)

    if is_financed_emissions_method_context(text) and not explicit_ids:
        return []

    for series_id, patterns in EXPLICIT_PATTERNS.items():
        matched_pattern = next((pattern for pattern in patterns if pattern.search(text)), None)
        if matched_pattern and has_series_acceptance_context(series_id, context_window(text, matched_pattern)):
            ids.add((series_id, "pdf_explicit_series_citation"))

    if is_financed_emissions_method_context(text):
        return sorted(
            (series_id, status)
            for series_id, status in ids
            if status == "pdf_explicit_series_citation"
        )

    has_scope1 = bool(re.search(r"\bscope\s*1\b|direct ghg emissions|direct emissions|范围一|範疇一|直接排放|escopo\s*1", text, re.I))
    has_scope2 = bool(re.search(r"\bscope\s*2\b|market-based|location-based|purchased electricity|energy indirect|范围二|範疇二|能源间接|能源間接|外购电|外購電|escopo\s*2", text, re.I))
    has_scope3 = bool(re.search(r"\bscope\s*3\b|value chain|upstream|downstream|supplier|supply chain|category\s*(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15)|范围三|範疇三|价值链|價值鏈|供应商|供應商|上游|下游|商务差旅|商務差旅|纸张|紙張|escopo\s*3", text, re.I))
    has_inventory = bool(re.search(r"inventory|footprint|emissions by scope|ghg emissions|greenhouse gas emissions|co2 emissions|carbon emissions|operational control|equity share|organizational boundary|annual scope|碳盘查|碳盤查|温室气体盘查|溫室氣體盤查|温室气体清单|温室氣體清單|组织边界|組織邊界|运营控制|營運控制|运行控制|invent[aá]rio|emiss[õo]es de gee|emiss[õo]es", text, re.I))

    if (has_scope1 or has_scope2 or has_inventory) and re.search(r"emission|inventory|footprint|scope", lower):
        ids.add(("ghg_corporate_standard", "pdf_contextual_scope_inventory_mapping"))
    if (has_scope1 or has_scope2 or has_inventory) and re.search(r"温室气体|溫室氣體|碳盘查|碳盤查|范围|範疇", text):
        ids.add(("ghg_corporate_standard", "pdf_contextual_scope_inventory_mapping"))
    if has_scope2 and re.search(r"market-based|location-based|purchased electricity|renewable electricity|electricity purchases|energy indirect", text, re.I):
        ids.add(("ghg_scope2_guidance", "pdf_contextual_scope_inventory_mapping"))
    if has_scope2 and re.search(r"范围二|範疇二|外购电|外購電|市场法|市場法|位置法|escopo\s*2", text, re.I):
        ids.add(("ghg_scope2_guidance", "pdf_contextual_scope_inventory_mapping"))
    if has_scope3 and re.search(r"scope\s*3.*categor|category\s*(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15)|value chain|purchased goods|capital goods|fuel- and energy|upstream|downstream|business travel|employee commuting|leased assets|use of sold products|end-of-life|investments|范围三|範疇三|价值链|價值鏈|供应商|供應商|商务差旅|商務差旅|纸张|紙張|escopo\s*3", text, re.I):
        ids.add(("ghg_scope3_standard", "pdf_contextual_scope_inventory_mapping"))
    if has_scope3 and re.search(r"calculation|methodolog|emission factor|supplier-specific|spend-based|activity data", text, re.I):
        ids.add(("ghg_scope3_calculation_guidance", "pdf_contextual_scope_inventory_mapping"))
    if re.search(r"product life cycle|product carbon footprint|life-cycle assessment|\blca\b", text, re.I):
        ids.add(("ghg_product_standard", "pdf_contextual_scope_inventory_mapping"))
    if re.search(r"project accounting|project-level|emission reduction project", text, re.I):
        ids.add(("ghg_project_protocol", "pdf_contextual_scope_inventory_mapping"))
    if re.search(r"avoided emissions", text, re.I):
        ids.add(("ghg_avoided_emissions_guidance", "pdf_contextual_scope_inventory_mapping"))
    if re.search(r"land sector|carbon removals|co2 removals|land-use change|lulucf", text, re.I):
        ids.add(("ghg_land_sector_removals_standard", "pdf_contextual_scope_inventory_mapping"))
    if re.search(r"programa brasileiro ghg protocol|registro p[úu]blico de emiss[õo]es do programa brasileiro ghg protocol|selo ouro no programa ghg protocol|ghg protocol\s*-\s*fgv", text, re.I):
        ids.add(("ghg_brazilian_program", "pdf_explicit_series_citation"))

    explicit = {series_id for series_id, status in ids if status == "pdf_explicit_series_citation"}
    return sorted((series_id, status) for series_id, status in ids if series_id not in explicit or status == "pdf_explicit_series_citation")


def main():
    companies = company_files_by_id()
    candidate_ids = sorted(
        company_id
        for company_id, (_, company) in companies.items()
        if ghg_rows(company) or report_sources(company)
    )

    records = []
    for company_id in candidate_ids:
        company_pair = companies.get(company_id)
        if not company_pair:
            continue
        _, company = company_pair
        for ghg_row in ghg_rows(company):
            page_text, page_window = extract_page_window(ghg_row.get("source_path"), ghg_row.get("evidence_page") or ghg_row.get("page"))
            document_text = ""
            document_pages = []
            source_page_text = clean(f"{source_text(ghg_row)} {page_text}")
            source_page_matches = infer_series(source_page_text)
            if not explicit_statuses(source_page_matches) and not is_financed_emissions_method_context(source_page_text):
                document_text, document_pages = extract_document_hits(
                    ghg_row.get("source_path"),
                    explicit_pattern_list(),
                )
            combined = clean(f"{source_text(ghg_row)} {page_text} {document_text}")
            series_matches = infer_series(combined)
            for series_id, status in series_matches:
                series = SERIES[series_id]
                records.append(
                    {
                        "company_id": company_id,
                        "company_name_en": clean(company.get("company_name_en")),
                        "company_name_zh": clean(company.get("company_name_zh")),
                        "world500_rank": company.get("world500_rank"),
                        "series_id": series_id,
                        "name_en": series["name_en"],
                        "name_zh": series["name_zh"],
                        "match_status": status,
                        "source_file": clean(ghg_row.get("source_file")),
                        "source_path": clean(ghg_row.get("source_path")),
                        "page": clean(ghg_row.get("evidence_page") or ghg_row.get("page")),
                        "page_window": page_window,
                        "document_match_pages": document_pages,
                        "snippet_en": excerpt(combined, series_id, status),
                        "recognition_basis_en": "PDF page backfill: mapped from the cited GHG Protocol evidence page plus adjacent page text; not promoted to direct-use emissions value.",
                        "recognition_basis_zh": "PDF 页级回查：基于已引用的 GHG Protocol 证据页及相邻页文本映射；不提升为直接采信排放值。",
                    }
                )

        for report in report_sources(company):
            series_hits = extract_document_series_hits(report["source_path"])
            for series_id, hits in series_hits.items():
                if series_id not in SERIES:
                    continue
                series = SERIES[series_id]
                for hit in hits:
                    records.append(
                        {
                            "company_id": company_id,
                            "company_name_en": clean(company.get("company_name_en")),
                            "company_name_zh": clean(company.get("company_name_zh")),
                            "world500_rank": company.get("world500_rank"),
                            "series_id": series_id,
                            "name_en": series["name_en"],
                            "name_zh": series["name_zh"],
                            "match_status": "pdf_explicit_series_citation",
                            "source_file": report["source_file"],
                            "source_path": report["source_path"],
                            "page": str(hit["page"]),
                            "page_window": [hit["page"]],
                            "document_match_pages": [hit["page"]],
                            "snippet_en": excerpt(hit["text"], series_id, "pdf_explicit_series_citation"),
                            "recognition_basis_en": "PDF full-document exact-series scan: the report page names a controlled GHG Protocol/PCAF fine standard in an accounting, reporting, methodology, or assurance context; this does not promote emissions values.",
                            "recognition_basis_zh": "PDF 全文精确系列扫描：报告页在核算、报告、方法或鉴证语境中命名受控 GHG Protocol/PCAF 细分标准；该记录不提升排放数值。",
                        }
                    )

    deduped = {}
    for record in records:
        key = (record["company_id"], record["series_id"], record["source_file"], record["page"])
        if key not in deduped or record["match_status"] == "pdf_explicit_series_citation":
            deduped[key] = record

    payload = {
        "schema_version": "ghg-series-pdf-page-backfill-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy_en": "This file only resolves GHG Protocol fine-class display from cited PDF pages. It does not promote candidates or change authoritative emissions values.",
        "policy_zh": "该文件仅用于从已引用 PDF 页解析 GHG Protocol 细分类展示，不提升候选值，也不改变权威排放值。",
        "source_candidate_company_count": len(candidate_ids),
        "resolved_company_count": len({record["company_id"] for record in deduped.values()}),
        "records": sorted(deduped.values(), key=lambda item: (int(item.get("world500_rank") or 9999), item["company_id"], item["series_id"])),
    }
    write_json(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")
    print(json.dumps({k: payload[k] for k in ("source_candidate_company_count", "resolved_company_count")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
