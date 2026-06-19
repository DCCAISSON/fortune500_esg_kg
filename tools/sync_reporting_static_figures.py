import json
import hashlib
import math
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REPORTING_FILE = ROOT / "assets" / "data" / "world500" / "workbench" / "reporting_views.json"
FIGURE_DIR = ROOT / "assets" / "figures"
MANIFEST_FILE = FIGURE_DIR / "reporting_static_figures_manifest.json"
REQUIRED_SYNCED_REPORT_FIGURES = {
    "world500_emissions_ranking_graph.png": {
        "figure_no": "emissions_ranking",
        "title_en": "Comparable total-emissions ranking graph",
        "title_zh": "企业总排放可比排行图",
        "data_keys": ["emissions_ranking"],
        "page_sections": ["reporting_views.emissions"],
    },
    "world500_standard_chain_overview.png": {
        "figure_no": "figure_2",
        "title_en": "Standards-chain briefing graphic",
        "title_zh": "标准链静态汇报图",
        "data_keys": ["ghg_standard_series", "accepted_standard_role_graph"],
        "page_sections": ["reporting_views.ghg", "index.figure_2"],
    },
    "world500_standard_role_entity_graph.png": {
        "figure_no": "figure_2_entity_graph",
        "title_en": "Accepted standard-company entity graph",
        "title_zh": "Standard-company accepted entity graph",
        "data_keys": ["accepted_standard_role_graph"],
        "page_sections": ["role-family-standard-full-graph", "index.figure_2"],
    },
    "world500_technology_cluster_overview.png": {
        "figure_no": "figure_6",
        "title_en": "Technology-path briefing graphic",
        "title_zh": "技术路径静态汇报图",
        "data_keys": ["technology_paths"],
        "page_sections": ["reporting_views.technology", "index.figure_6"],
    },
    "world500_primary_secondary_source_mix.png": {
        "figure_no": "primary_secondary_bubble",
        "title_en": "Primary/secondary source-mix bubble chart",
        "title_zh": "初级/次级数据气泡图",
        "data_keys": ["primary_secondary_data"],
        "page_sections": ["reporting_views.source_mix", "index.primary_secondary_bubble"],
    },
}

FIGURE_CLAIM_METADATA = {
    "world500_standard_role_entity_graph.png": {
        "requirement_id": "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
        "claim_status": "partial_review_edges_remain",
        "can_claim_requirement_complete": False,
        "static_sync_can_claim_complete": True,
        "audit_boundary_en": "The entity graph renders accepted standard-company edges only. Generic GHG references and contextual mappings remain excluded from the drawn graph.",
        "audit_boundary_zh": "Entity graph renders accepted standard-company edges only; generic GHG references and contextual mappings are excluded.",
    },
    "world500_emissions_ranking_graph.png": {
        "requirement_id": "R2_TOTAL_EMISSIONS_RANKING_DESC",
        "claim_status": "partial_complete_comparable_only",
        "can_claim_requirement_complete": False,
        "static_sync_can_claim_complete": True,
        "audit_boundary_en": "Only companies with complete Scope 1, selected Scope 2, and Scope 3 strong evidence enter the comparable ranking graph. Partial totals are excluded.",
        "audit_boundary_zh": "只有 Scope 1、选定 Scope 2 和 Scope 3 均具备强证据的企业进入可比排行图；partial 总量被排除。",
    },
    "world500_standard_chain_overview.png": {
        "requirement_id": "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
        "claim_status": "partial_review_edges_remain",
        "can_claim_requirement_complete": False,
        "static_sync_can_claim_complete": True,
        "audit_boundary_en": "GHG fine-series company counts default to explicit accepted evidence; contextual and overmapped references remain review-only.",
        "audit_boundary_zh": "GHG 细分系列企业数默认只按显式采信证据统计；上下文映射和疑似过度映射仍为复核数据。",
    },
    "world500_technology_cluster_overview.png": {
        "requirement_id": "R4_TECHNOLOGY_PATH_AXIS",
        "claim_status": "partial_disclosure_signal_only",
        "can_claim_requirement_complete": False,
        "static_sync_can_claim_complete": True,
        "audit_boundary_en": "Technology clusters are disclosure-topic signals. A separate page-level project-evidence layer is shown when source file, page, snippet, and project or measure name are all present.",
        "audit_boundary_zh": "技术聚类是企业报告中的披露主题信号，不等于已核证项目实施、减排量或项目经济性。",
    },
    "world500_primary_secondary_source_mix.png": {
        "requirement_id": "R5_PRIMARY_SECONDARY_BUBBLE",
        "claim_status": "partial_source_mix_inference",
        "can_claim_requirement_complete": False,
        "static_sync_can_claim_complete": True,
        "audit_boundary_en": "Except for explicitly reported primary-data percentages, plotted ratios are source-mix inference and not audited calculation weights.",
        "audit_boundary_zh": "除原文明示 primary-data 百分比外，图中比例是来源结构推断，不是审定计算权重。",
    },
}

PALETTE = {
    "bg": "#f3ecdf",
    "paper": "#fffdf8",
    "ink": "#17313e",
    "muted": "#667782",
    "line": "#d8ccba",
    "ghg": "#2f6f63",
    "iso": "#315f8c",
    "gb": "#c76b2d",
    "pcaf": "#7a4f82",
    "warn": "#9b3b2f",
}


def load_payload():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def require_object(mapping, key):
    value = mapping.get(key) if isinstance(mapping, dict) else None
    if not isinstance(value, dict):
        raise ValueError(f"Missing required reporting object for static figure sync: {key}")
    return value


def require_nonempty_list(mapping, key):
    value = mapping.get(key) if isinstance(mapping, dict) else None
    if not isinstance(value, list):
        raise ValueError(f"Missing required reporting list for static figure sync: {key}")
    if not value:
        raise ValueError(f"Required reporting list is empty for static figure sync: {key}")
    return value


def validate_payload(payload):
    require_object(payload, "summary")
    ghg = require_object(payload, "ghg_standard_series")
    require_nonempty_list(ghg, "series_summary")
    require_nonempty_list(ghg, "definitions")
    role_graph = require_object(payload, "standard_role_graph")
    require_nonempty_list(role_graph, "standards")
    require_nonempty_list(role_graph, "companies")
    require_nonempty_list(role_graph, "links")
    accepted_role_graph = require_object(payload, "accepted_standard_role_graph")
    require_nonempty_list(accepted_role_graph, "standards")
    require_nonempty_list(accepted_role_graph, "companies")
    accepted_links = require_nonempty_list(accepted_role_graph, "links")
    leaked_links = [
        item for item in accepted_links
        if item.get("standard_id") == "ghg_generic_reference" or item.get("decision_bucket") != "accepted"
    ]
    if leaked_links:
        raise ValueError("accepted_standard_role_graph contains generic or non-accepted links.")
    emissions = require_object(payload, "emissions_ranking")
    require_nonempty_list(emissions, "complete")
    require_nonempty_list(emissions, "available")
    technology = require_object(payload, "technology_paths")
    require_nonempty_list(technology, "clusters")
    require_nonempty_list(technology, "project_clusters")
    require_nonempty_list(technology, "disclosure_signal_clusters")
    project_clusters = technology.get("project_clusters", [])
    if not any(item.get("project_evidence_count", 0) for item in project_clusters):
        raise ValueError("Technology Figure 6 has no project-evidence clusters to render.")
    require_nonempty_list(technology, "flow")
    source_mix = require_object(payload, "primary_secondary_data")
    require_nonempty_list(source_mix, "bubbles")
    strong_bubbles = require_nonempty_list(source_mix, "strong_bubbles")
    inference_bubbles = source_mix.get("inference_bubbles")
    if not isinstance(inference_bubbles, list):
        raise ValueError("Missing required reporting list for static figure sync: primary_secondary_data.inference_bubbles")
    leaked_strong = [
        item for item in strong_bubbles
        if item.get("ratio_basis_key") != "explicit_reported_primary_percentage"
    ]
    if leaked_strong:
        raise ValueError("primary_secondary_data.strong_bubbles contains non-explicit source-mix rows.")


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@lru_cache(maxsize=None)
def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def local(item, lang, zh_key, en_key, default=""):
    if lang == "zh":
        return item.get(zh_key) or item.get(en_key) or default
    return item.get(en_key) or item.get(zh_key) or default


def hex_to_rgb(color):
    color = str(color or "#98a1a8").strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
        color = "#98a1a8"
    return tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))


def blend(color, bg="#fffdf8", alpha=0.15):
    r, g, b = hex_to_rgb(color)
    br, bgc, bb = hex_to_rgb(bg)
    return (
        int(r * alpha + br * (1 - alpha)),
        int(g * alpha + bgc * (1 - alpha)),
        int(b * alpha + bb * (1 - alpha)),
    )


def wrap(draw, value, fnt, max_width, max_lines=None):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text:
        return []
    lines = []
    if re.search(r"[\u4e00-\u9fff]", text):
        current = ""
        for char in text:
            probe = current + char
            if draw.textbbox((0, 0), probe, font=fnt)[2] <= max_width:
                current = probe
            else:
                if current:
                    lines.append(current)
                current = char
        if current:
            lines.append(current)
    else:
        current = ""
        for word in text.split():
            probe = f"{current} {word}".strip()
            if draw.textbbox((0, 0), probe, font=fnt)[2] <= max_width:
                current = probe
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .,;") + "..."
    return lines


def draw_wrapped(draw, xy, text, fnt, fill, max_width, line_gap=7, max_lines=None):
    x, y = xy
    for index, line in enumerate(wrap(draw, text, fnt, max_width, max_lines)):
        draw.text((x, y + index * (fnt.size + line_gap)), line, font=fnt, fill=fill)


def rounded(draw, box, fill, outline=PALETTE["line"], width=2, radius=24):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def metric(draw, x, y, label, value, color):
    rounded(draw, (x, y, x + 232, y + 82), blend(color, PALETTE["paper"], 0.08), PALETTE["line"], 2, 22)
    draw.text((x + 20, y + 12), str(value), font=font(32, True), fill=color)
    draw_wrapped(draw, (x + 20, y + 50), label, font(17), PALETTE["muted"], 190, max_lines=1)


def standard_rows(payload, lang):
    rows = []
    for item in payload["ghg_standard_series"]["series_summary"]:
        accepted = item.get("accepted_company_count", item.get("explicit_company_count", 0))
        if item.get("series_id") == "ghg_generic_reference":
            continue
        review = item.get("review_company_count", item.get("contextual_company_count", 0))
        rows.append({
            "family": "ghg",
            "name": local(item, lang, "name_zh", "name_en"),
            "role": local(item, lang, "category_zh", "category_en"),
            "principle": local(item, lang, "principle_zh", "principle_en"),
            "companies": accepted,
            "review_companies": review,
            "total_companies": item.get("company_count", 0),
            "evidence": item.get("evidence_count", 0),
            "evidence_mode": "strong" if accepted else "review_only",
        })
    accepted_role_graph = payload.get("accepted_standard_role_graph") or payload["standard_role_graph"]
    lookup = {item["id"]: item for item in accepted_role_graph["standards"]}
    wanted = [
        ("pcaf", "pcaf"),
        ("iso_14064", "iso"),
        ("iso_14064_3", "iso"),
        ("iso_14067", "iso"),
        ("iso_14040_14044", "iso"),
        ("gb_t_36001_2015", "gb"),
        ("gb_t_2589_2020", "gb"),
        ("gb_t_32150_2015", "gb"),
        ("gb_t_24067_2024", "gb"),
    ]
    for standard_id, family in wanted:
        item = lookup.get(standard_id)
        if not item:
            continue
        rows.append({
            "family": family,
            "name": local(item, lang, "name_zh", "name_en"),
            "role": " | ".join(item.get("roles_zh" if lang == "zh" else "roles_en") or []),
            "principle": " | ".join(item.get("principles_zh" if lang == "zh" else "principles_en") or []),
            "companies": item.get("accepted_company_count", item.get("company_count", 0)),
            "review_companies": item.get("review_company_count", 0),
            "total_companies": item.get("total_mapped_company_count", item.get("company_count", 0)),
            "evidence": item.get("evidence_count", 0),
            "evidence_mode": "accepted",
        })
    return rows


def draw_standard_card(draw, x, y, w, h, row, color, lang):
    rounded(draw, (x, y, x + w, y + h), PALETTE["paper"], PALETTE["line"], 2, 22)
    draw.rounded_rectangle((x, y, x + 12, y + h), radius=6, fill=color)
    draw_wrapped(draw, (x + 28, y + 16), row["name"], font(22 if lang == "zh" else 20, True), PALETTE["ink"], w - 150, max_lines=2)
    draw_wrapped(draw, (x + 28, y + h - 50), row["role"], font(17), PALETTE["muted"], w - 52, max_lines=1)
    draw.text((x + w - 112, y + 18), str(row["companies"]), font=font(26, True), fill=color)
    count_label = "strong" if row.get("evidence_mode") == "strong" and lang == "en" else ("强证据" if row.get("evidence_mode") == "strong" else ("companies" if lang == "en" else "企业"))
    draw.text((x + w - 112, y + 52), count_label, font=font(15), fill=PALETTE["muted"])
    if row.get("review_companies"):
        review_text = f"+{row['review_companies']} review" if lang == "en" else f"+{row['review_companies']} 复核"
        draw.text((x + w - 112, y + 76), review_text, font=font(13), fill=PALETTE["warn"])


def render_figure2(lang, payload):
    image = Image.new("RGB", (2400, 1520), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2366, 1486), PALETTE["paper"], "#dfd2bd", 3, 42)
    title = "图2 标准与准则主轴：GHG Protocol 细分系列、PCAF、ISO 与 GB 标准链" if lang == "zh" else "Figure 2 Standards Axis: GHG Protocol Fine Series, PCAF, ISO, and GB Chains"
    subtitle = "GHG 不作为一个大类展示；12 个 GHGP/PCAF 细分标准全部列出，卡片数字为强证据企业数，review 单列为待复核候选。" if lang == "zh" else "GHG is not shown as one coarse class; all 12 GHGP/PCAF fine standards are listed, with card counts for strong-evidence companies and review counts separated."
    draw.text((88, 72), title, font=font(42, True), fill=PALETTE["ink"])
    draw_wrapped(draw, (90, 130), subtitle, font(24), PALETTE["muted"], 1740, max_lines=2)
    summary = payload["summary"]
    metric(draw, 1648, 76, "GHG strong" if lang == "en" else "GHG 强证据", summary["ghg_explicit_series_company_count"], PALETTE["ghg"])
    metric(draw, 1888, 76, "Context review" if lang == "en" else "上下文复核", summary["ghg_contextual_series_company_count"], PALETTE["warn"])
    rows = standard_rows(payload, lang)
    if not rows:
        raise ValueError("Figure 2 sync has no standard rows to render.")
    groups = {
        "ghg": [row for row in rows if row["family"] == "ghg"],
        "pcaf": [row for row in rows if row["family"] == "pcaf"],
        "iso": [row for row in rows if row["family"] == "iso"],
        "gb": [row for row in rows if row["family"] == "gb"],
    }
    headers = [
        ("GHG Protocol", "Scope wording only in GHG evidence context.", "ghg", 90, 220, 1080),
        ("PCAF", "Financed-emissions sector accounting.", "pcaf", 1210, 220, 310),
        ("ISO", "Organization, product, and verification.", "iso", 1560, 220, 330),
        ("GB / GB/T", "National measurement and guidance.", "gb", 1930, 220, 370),
    ]
    for label, note, key, x, y, w in headers:
        color = PALETTE[key]
        rounded(draw, (x, y, x + w, y + 84), color, color, 0, 26)
        draw.text((x + 24, y + 14), label, font=font(30, True), fill=PALETTE["paper"])
        draw_wrapped(draw, (x + 24, y + 50), note if lang == "en" else note, font(17), PALETTE["paper"], w - 48, max_lines=1)
    for index, row in enumerate(groups["ghg"]):
        draw_standard_card(draw, 90 + (index % 2) * 545, 332 + (index // 2) * 150, 515, 126, row, PALETTE["ghg"], lang)
    for key, x, w, h, gap in [("pcaf", 1210, 310, 126, 145), ("iso", 1560, 330, 126, 145), ("gb", 1930, 370, 108, 126)]:
        for index, row in enumerate(groups[key]):
            draw_standard_card(draw, x, 332 + index * gap, w, h, row, PALETTE[key], lang)
    note = "口径：基于 reporting_views.json 同步生成；GHG 上下文映射不作为强证据企业关系，只保留为复核队列。" if lang == "zh" else "Scope: generated from reporting_views.json; GHG contextual mappings are not accepted strong-evidence company links and remain in review queues."
    draw_wrapped(draw, (100, 1400), note, font(22), PALETTE["muted"], 2160, max_lines=2)
    out = FIGURE_DIR / lang / "world500_standard_chain_overview.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def render_standard_entity_graph(lang, payload):
    graph = require_object(payload, "accepted_standard_role_graph")
    companies = {
        (item.get("id") or item.get("company_id")): item
        for item in require_nonempty_list(graph, "companies")
        if item.get("id") or item.get("company_id")
    }
    links = [
        item for item in require_nonempty_list(graph, "links")
        if item.get("decision_bucket") == "accepted" and item.get("standard_id") != "ghg_generic_reference"
    ]
    links_by_standard = {}
    for link in links:
        standard_id = link.get("standard_id")
        company_id = link.get("company_id")
        if standard_id and company_id:
            links_by_standard.setdefault(standard_id, set()).add(company_id)

    standards = {item.get("id"): dict(item) for item in require_nonempty_list(graph, "standards") if item.get("id")}
    ghg_summary = {}
    for item in require_nonempty_list(require_object(payload, "ghg_standard_series"), "series_summary"):
        series_id = item.get("series_id")
        if series_id and item.get("core_whitelist"):
            ghg_summary[series_id] = item
            standards.setdefault(series_id, {
                "id": series_id,
                "name_en": item.get("name_en"),
                "name_zh": item.get("name_zh"),
                "family_en": "GHG Protocol",
                "family_zh": "GHG Protocol",
                "roles_en": [item.get("category_en") or "GHG/PCAF controlled standard"],
                "roles_zh": [item.get("category_zh") or "GHG/PCAF controlled standard"],
                "color": PALETTE["ghg"],
                "accepted_company_count": 0,
                "review_company_count": item.get("review_company_count", 0),
                "core_whitelist": True,
            })

    ghg_order = [
        "ghg_corporate_standard",
        "ghg_scope3_standard",
        "ghg_scope2_guidance",
        "ghg_scope3_calculation_guidance",
        "ghg_financial_industry_standard",
        "ghg_project_protocol",
        "ghg_land_sector_removals_standard",
        "ghg_product_standard",
        "ghg_cities_gpc",
        "ghg_mitigation_goal_standard",
        "ghg_policy_action_standard",
        "ghg_grid_connected_electricity_projects",
    ]
    ghg_rank = {value: index for index, value in enumerate(ghg_order)}

    def family_rank(item):
        standard_id = item.get("id")
        family = f"{item.get('family_en') or ''} {item.get('family_zh') or ''}".lower()
        if standard_id in ghg_rank or "ghg protocol" in family:
            return (0, ghg_rank.get(standard_id, 999))
        if "pcaf" in standard_id or "pcaf" in family or standard_id == "ghg_financial_industry_standard":
            return (1, 0)
        if standard_id.startswith("iso") or "iso" in family:
            return (2, 0)
        if standard_id.startswith("gb") or "gb" in family:
            return (3, 0)
        return (4, 0)

    standards_list = sorted(
        standards.values(),
        key=lambda item: (
            family_rank(item),
            -len(links_by_standard.get(item.get("id"), set())),
            local(item, lang, "name_zh", "name_en"),
        ),
    )

    width, height = 3600, 3200
    image = Image.new("RGB", (width, height), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (36, 36, width - 36, height - 36), PALETTE["paper"], "#dfd2bd", 3, 42)
    title = (
        "\u56fe2B \u6807\u51c6-\u4f01\u4e1a accepted \u5b9e\u4f53\u7ea7\u77e5\u8bc6\u56fe\u8c31"
        if lang == "zh"
        else "Figure 2B Accepted Standard-Company Entity Knowledge Graph"
    )
    subtitle = (
        "\u6807\u51c6\u8282\u70b9\u4f4d\u4e8e\u6bcf\u4e2a\u805a\u7c7b\u4e2d\u5fc3\uff0c\u4f01\u4e1a\u8282\u70b9\u6309 accepted \u8fb9\u5206\u5e03\u5728\u5916\u56f4\uff1b\u4f01\u4e1a\u70b9\u989c\u8272\u4ee3\u8868\u884c\u4e1a\uff0c\u6cdb\u5316 GHG \u548c review \u8fb9\u4e0d\u7ed8\u5236\u3002"
        if lang == "zh"
        else "Each cluster puts the standard at the center and accepted companies around it; company dot color shows industry. Generic GHG and review edges are not drawn."
    )
    draw.text((96, 76), title, font=font(46, True), fill=PALETTE["ink"])
    draw_wrapped(draw, (98, 142), subtitle, font(25), PALETTE["muted"], 2350, max_lines=2)
    summary = payload["summary"]
    metric(draw, 2500, 80, "accepted companies" if lang == "en" else "accepted companies", summary.get("accepted_standard_company_count", 0), PALETTE["ghg"])
    metric(draw, 2748, 80, "accepted edges" if lang == "en" else "accepted edges", len(links), PALETTE["iso"])
    metric(draw, 2996, 80, "GHGP/PCAF nodes" if lang == "en" else "GHGP/PCAF nodes", summary.get("ghg_pcaf_core_whitelist_standard_count", 0), PALETTE["pcaf"])

    industry_colors = {}
    for item in companies.values():
        label = local(item, lang, "industry_section_zh", "industry_section_en", "Unknown")
        industry_colors.setdefault(label, item.get("industry_color") or "#98a1a8")

    card_w, card_h = 530, 390
    start_x, start_y = 76, 330
    gap_x, gap_y = 42, 36
    cols = 6
    for index, standard in enumerate(standards_list[:36]):
        col = index % cols
        row = index // cols
        x = start_x + col * (card_w + gap_x)
        y = start_y + row * (card_h + gap_y)
        standard_id = standard.get("id")
        color = standard.get("color") or PALETTE["ghg"]
        company_ids = sorted(links_by_standard.get(standard_id, set()))
        summary_item = ghg_summary.get(standard_id, {})
        review_count = standard.get("review_company_count", summary_item.get("review_company_count", 0)) or 0
        rounded(draw, (x, y, x + card_w, y + card_h), blend(color, PALETTE["paper"], 0.08), color, 2, 28)

        name = local(standard, lang, "name_zh", "name_en", standard_id)
        role_values = standard.get("roles_zh" if lang == "zh" else "roles_en") or []
        role = " / ".join(str(value) for value in role_values[:2] if value)
        draw_wrapped(draw, (x + 22, y + 20), name, font(19, True), PALETTE["ink"], card_w - 44, max_lines=2)
        draw_wrapped(draw, (x + 22, y + 70), role, font(14), PALETTE["muted"], card_w - 44, max_lines=1)

        cx, cy = x + card_w / 2, y + 202
        draw.ellipse((cx - 46, cy - 46, cx + 46, cy + 46), fill=color, outline=PALETTE["paper"], width=3)
        center_label = "STD" if lang == "en" else "\u6807\u51c6"
        draw.text((cx - 24, cy - 12), center_label, font=font(20, True), fill=PALETTE["paper"])

        n = len(company_ids)
        rings = [(76, 18), (105, 28), (133, 44), (158, 64)]
        placed = 0
        for radius, capacity in rings:
            if placed >= n:
                break
            take = min(capacity, n - placed)
            for offset in range(take):
                company_id = company_ids[placed + offset]
                company = companies.get(company_id, {})
                angle = -math.pi / 2 + 2 * math.pi * offset / max(1, take) + (placed * 0.11)
                px = cx + math.cos(angle) * radius
                py = cy + math.sin(angle) * radius
                dot_color = company.get("industry_color") or "#98a1a8"
                dot_r = 4 if n < 70 else 3
                draw.line((cx, cy, px, py), fill=blend(color, PALETTE["paper"], 0.38), width=1)
                draw.ellipse((px - dot_r, py - dot_r, px + dot_r, py + dot_r), fill=dot_color, outline=PALETTE["ink"])
            placed += take
        if placed < n:
            draw.text((x + card_w - 94, y + card_h - 58), f"+{n - placed}", font=font(16, True), fill=color)

        count_text = f"{n} accepted"
        if review_count:
            count_text += f" / {review_count} review"
        draw_wrapped(draw, (x + 22, y + card_h - 54), count_text, font(16, True), PALETTE["ink"], card_w - 44, max_lines=1)

    legend_x, legend_y = 78, height - 242
    draw.text((legend_x, legend_y), "Industry colors" if lang == "en" else "\u884c\u4e1a\u989c\u8272", font=font(23, True), fill=PALETTE["ink"])
    for index, (label, color) in enumerate(list(industry_colors.items())[:14]):
        x = legend_x + 220 * (index % 7)
        y = legend_y + 42 + 58 * (index // 7)
        draw.ellipse((x, y, x + 24, y + 24), fill=color, outline=PALETTE["ink"])
        draw_wrapped(draw, (x + 34, y - 5), label, font(15), PALETTE["muted"], 170, max_lines=2)
    note = (
        "Scope: generated from accepted_standard_role_graph plus zero-accepted GHGP/PCAF controlled nodes. Review-only edges remain in queues."
        if lang == "en"
        else "\u53e3\u5f84\uff1a\u57fa\u4e8e accepted_standard_role_graph \u751f\u6210\uff0c\u5e76\u8865\u663a 0 accepted \u7684 GHGP/PCAF \u53d7\u63a7\u8282\u70b9\uff1breview-only \u8fb9\u4ecd\u4fdd\u7559\u5728\u961f\u5217\u3002"
    )
    draw_wrapped(draw, (legend_x, height - 84), note, font(21), PALETTE["muted"], width - 180, max_lines=2)
    out = FIGURE_DIR / lang / "world500_standard_role_entity_graph.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def timeline_bar(draw, x, y, w, counts):
    counts = counts or {}
    parts = [("near", counts.get("near", 0), "#2f6f63"), ("mid", counts.get("mid", 0), "#d89b3d"), ("long", counts.get("long", 0), "#7a4f82")]
    total = max(1, sum(value for _, value, _ in parts))
    cursor = x
    for _, value, color in parts:
        width = max(3, w * value / total)
        draw.rounded_rectangle((cursor, y, cursor + width, y + 13), radius=6, fill=color)
        cursor += width


def render_figure6(lang, payload):
    image = Image.new("RGB", (2400, 1520), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2366, 1486), PALETTE["paper"], "#dfd2bd", 3, 42)
    title = "图6 技术路径主轴：同类减碳技术企业聚类与标准对齐" if lang == "zh" else "Figure 6 Technology Path Axis: Company Clusters and Standards Alignment"
    subtitle = "9 类技术路径同步展示细分方向、时间趋势与成本信号；成本/时间仍为披露关键词证据，不作为项目经济性审定结论。" if lang == "zh" else "Nine technology paths show subtypes, timeline signals, and cost mentions; cost/timeline remain disclosure signals, not audited project economics."
    subtitle = "主图只按页级项目/措施证据聚类；关键词披露信号保留为复核背景，不作为项目证据。" if lang == "zh" else "The main chart clusters page-level project/measure evidence only. Keyword disclosures remain review-only context, not project evidence."
    project_summary = payload["technology_paths"].get("project_evidence_summary", {})
    project_line = f"Page-level project evidence: {project_summary.get('project_evidence_count', 0)} records / {project_summary.get('project_company_count', 0)} companies / {project_summary.get('project_cost_evidence_count', 0)} cost-investment / {project_summary.get('project_abatement_evidence_count', 0)} abatement-effect."
    draw.text((88, 72), title, font=font(42, True), fill=PALETTE["ink"])
    draw_wrapped(draw, (90, 130), subtitle, font(24), PALETTE["muted"], 1860, max_lines=2)
    draw_wrapped(draw, (90, 176), project_line, font(21, True), PALETTE["warn"], 1860, max_lines=1)
    flow = require_nonempty_list(payload["technology_paths"], "flow")
    for index, step in enumerate(flow[:5]):
        x = 90 + index * 445
        rounded(draw, (x, 210, x + 390, 306), blend("#315f8c", PALETTE["paper"], 0.08), PALETTE["line"], 2, 22)
        draw.ellipse((x + 18, 232, x + 58, 272), fill=PALETTE["iso"])
        draw.text((x + 31, 238), str(index + 1), font=font(22, True), fill=PALETTE["paper"])
        label = f"{local(step, lang, 'from_zh', 'from_en')} -> {local(step, lang, 'to_zh', 'to_en')}"
        draw_wrapped(draw, (x + 72, 224), label, font(18, True), PALETTE["ink"], 285, max_lines=2)
    clusters = [
        item for item in require_nonempty_list(payload["technology_paths"], "project_clusters")
        if item.get("project_evidence_count", 0) > 0
    ]
    for index, cluster in enumerate(clusters[:9]):
        col = index % 3
        row = index // 3
        x = 90 + col * 760
        y = 360 + row * 320
        color = cluster.get("color") or PALETTE["ghg"]
        rounded(draw, (x, y, x + 700, y + 278), blend(color, PALETTE["paper"], 0.10), color, 3, 28)
        draw.text((x + 28, y + 22), local(cluster, lang, "name_zh", "name_en"), font=font(25, True), fill=PALETTE["ink"])
        draw.text((x + 28, y + 62), f"{cluster.get('company_count', 0)} {'企业' if lang == 'zh' else 'companies'} / {cluster.get('evidence_count', 0)} evidence", font=font(18), fill=PALETTE["muted"])
        card_bg = blend(color, PALETTE["paper"], 0.10)
        draw.rectangle((x + 24, y + 58, x + 650, y + 88), fill=card_bg)
        draw.text((x + 28, y + 62), f"{cluster.get('project_company_count', 0)} {'企业' if lang == 'zh' else 'companies'} / {cluster.get('project_evidence_count', 0)} project evidence", font=font(18), fill=PALETTE["muted"])
        subtype_text = " | ".join(f"{local(item, lang, 'label_zh', 'label_en')}: {item.get('evidence_count', 0)}" for item in (cluster.get("subtypes") or [])[:3])
        draw_wrapped(draw, (x + 28, y + 98), subtype_text, font(17), PALETTE["ink"], 640, max_lines=2)
        timeline_bar(draw, x + 28, y + 165, 300, cluster.get("timeline_counts"))
        draw.text((x + 350, y + 156), f"{cluster.get('cost_signal_count', 0)} {'成本信号' if lang == 'zh' else 'cost signals'}", font=font(18, True), fill=color)
        draw.rectangle((x + 346, y + 152, x + 668, y + 184), fill=card_bg)
        draw.text((x + 350, y + 156), f"{cluster.get('project_cost_evidence_count', 0)} {'成本/投资证据' if lang == 'zh' else 'cost evidence'}", font=font(18, True), fill=color)
        standards = cluster.get("standards_zh" if lang == "zh" else "standards_en") or []
        disclosure_text = f"{'披露信号复核' if lang == 'zh' else 'Disclosure signals in review'}: {cluster.get('disclosure_signal_company_count', 0)} / {cluster.get('disclosure_signal_evidence_count', 0)}"
        draw_wrapped(draw, (x + 28, y + 198), f"{' / '.join(standards)} | {disclosure_text}", font(16), PALETTE["muted"], 630, max_lines=2)
    note = "口径：基于 technology_paths；技术聚类是减碳路径披露证据，不等于已审定减排量。" if lang == "zh" else "Scope: based on technology_paths; clusters are decarbonization-path disclosures, not audited abatement values."
    note = "口径：图6主卡片只展示 project_clusters 页级项目证据；disclosure_signal_clusters 保留为复核背景，不能当作项目实施结论。" if lang == "zh" else "Scope: Figure 6 cards use project_clusters page-level project evidence only; disclosure_signal_clusters remain review context and are not implementation conclusions."
    draw_wrapped(draw, (100, 1398), note, font(22), PALETTE["muted"], 2160, max_lines=2)
    out = FIGURE_DIR / lang / "world500_technology_cluster_overview.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def render_emissions_ranking(lang, payload):
    image = Image.new("RGB", (2400, 1520), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2366, 1486), PALETTE["paper"], "#dfd2bd", 3, 42)
    title = "企业总碳排放强证据排行知识图谱" if lang == "zh" else "Company Total Emissions Strong-Evidence Ranking Graph"
    subtitle = (
        "只展示 Scope 1 + 选定 Scope 2 + Scope 3 都通过强证据门禁的企业；partial 总量不进入可比较主排行。"
        if lang == "zh"
        else "Only companies passing the Scope 1 + selected Scope 2 + Scope 3 strong-evidence gate are shown; partial totals are excluded from the comparable ranking."
    )
    draw.text((88, 72), title, font=font(42, True), fill=PALETTE["ink"])
    draw_wrapped(draw, (90, 130), subtitle, font(24), PALETTE["muted"], 1840, max_lines=2)

    ranking = payload["emissions_ranking"]
    companies = ranking.get("complete", [])
    available_count = len(ranking.get("available", []))
    metric(draw, 1600, 76, "complete ranking" if lang == "en" else "完整强证据排行", len(companies), PALETTE["ghg"])
    metric(draw, 1840, 76, "partial excluded" if lang == "en" else "partial 未混排", max(0, available_count - len(companies)), PALETTE["warn"])

    graph_box = (96, 238, 2296, 1328)
    rounded(draw, graph_box, "#fbf7ef", PALETTE["line"], 2, 32)
    left, top, right, bottom = graph_box
    center = (250, 785)
    scope_x = 2060
    scope_positions = {
        "scope1": (scope_x, 535),
        "scope2": (scope_x, 785),
        "scope3": (scope_x, 1035),
    }
    center_color = PALETTE["ghg"]
    draw.ellipse((center[0] - 88, center[1] - 88, center[0] + 88, center[1] + 88), fill=center_color)
    draw.text((center[0] - 54, center[1] - 22), "Total" if lang == "en" else "总排放", font=font(28, True), fill=PALETTE["paper"])
    draw.text((center[0] - 18, center[1] + 15), str(len(companies)), font=font(30, True), fill=PALETTE["paper"])

    scope_labels = {
        "scope1": ("Scope 1", "direct"),
        "scope2": ("Scope 2", "selected"),
        "scope3": ("Scope 3", "value chain"),
    }
    for key, (label, role) in scope_labels.items():
        x, y = scope_positions[key]
        color = {"scope1": "#9b3b2f", "scope2": "#315f8c", "scope3": "#7a4f82"}[key]
        draw.ellipse((x - 62, y - 62, x + 62, y + 62), fill=color)
        draw.text((x - 44, y - 18), label, font=font(24, True), fill=PALETTE["paper"])
        draw.text((x - 44, y + 12), role, font=font(17), fill=PALETTE["paper"])

    max_total = max(1, max((float(item.get("total_mtco2e") or 0) for item in companies), default=1))
    row_gap = 64
    start_y = 340
    node_x = 820
    for index, item in enumerate(companies[:15]):
        y = start_y + index * row_gap
        color = item.get("industry_color") or "#98a1a8"
        total = float(item.get("total_mtco2e") or 0)
        radius = 12 + math.sqrt(total / max_total) * 34
        draw.line((center[0] + 88, center[1], node_x - radius, y), fill=blend(color, "#17313e", 0.55), width=2)
        draw.ellipse((node_x - radius, y - radius, node_x + radius, y + radius), fill=blend(color, PALETTE["paper"], 0.68), outline=color, width=3)
        rank = item.get("complete_rank") or index + 1
        name = local(item, lang, "company_name_zh", "company_name_en")
        years = ", ".join(str(year) for year in item.get("inventory_years", []) if year)
        draw.text((node_x + radius + 18, y - 20), f"#{rank} {name[:32]}", font=font(22, True), fill=PALETTE["ink"])
        draw.text((node_x + radius + 18, y + 8), f"{total:,.2f} MtCO2e · {years}", font=font(17), fill=PALETTE["muted"])
        values = {
            "scope1": item.get("scope1_mtco2e"),
            "scope2": item.get("scope2_mtco2e"),
            "scope3": item.get("scope3_mtco2e"),
        }
        for scope_id, value in values.items():
            if value in (None, ""):
                continue
            sx, sy = scope_positions[scope_id]
            width = 1 + math.sqrt(float(value or 0) / max_total) * 6
            draw.line((node_x + radius, y, sx - 62, sy), fill="#c8bba8", width=max(1, int(width)))

    legend_y = 1364
    note = (
        "口径：完整强证据排行来自 reporting_views.emissions_ranking.complete；候选值和 partial 总量只进入审计队列。"
        if lang == "zh"
        else "Scope: complete strong-evidence ranking from reporting_views.emissions_ranking.complete; candidates and partial totals stay in audit queues."
    )
    draw_wrapped(draw, (100, legend_y), note, font(22), PALETTE["muted"], 2160, max_lines=2)
    out = FIGURE_DIR / lang / "world500_emissions_ranking_graph.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def render_source_mix(lang, payload):
    image = Image.new("RGB", (2400, 1520), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2366, 1486), PALETTE["paper"], "#dfd2bd", 3, 42)
    title = "初级/次级数据来源结构气泡图" if lang == "zh" else "Primary / Secondary Source-Mix Bubble Chart"
    subtitle = "横轴优先使用原文明示初级数据百分比；否则退回已分类来源证据中的初级数据占比。纵轴为已分类来源证据行数。" if lang == "zh" else "X prefers explicitly reported primary-data percentages; otherwise it falls back to primary share among classified source evidence. Y is classified source-evidence rows."
    draw.text((88, 72), title, font=font(42, True), fill=PALETTE["ink"])
    draw_wrapped(draw, (90, 130), subtitle, font(24), PALETTE["muted"], 1880, max_lines=2)
    source_mix_payload = payload["primary_secondary_data"]
    rows = [
        item for item in source_mix_payload.get("strong_bubbles", [])
        if item.get("primary_ratio_known") is not None and (
            item.get("known_source_evidence_count", 0) > 0
            or item.get("ratio_basis_key") == "explicit_reported_primary_percentage"
        )
    ]
    if not rows:
        raise ValueError("Primary/secondary source-mix sync has no strong explicit-ratio rows to render.")
    rows.sort(key=lambda item: item.get("known_source_evidence_count", 0), reverse=True)
    explicit_rows = [
        item for item in rows
        if item.get("ratio_basis_key") == "explicit_reported_primary_percentage"
    ]
    inference_count = len(source_mix_payload.get("inference_bubbles", []))
    plot = (190, 270, 2050, 1240)
    left, top, right, bottom = plot
    rounded(draw, (left - 50, top - 42, right + 44, bottom + 92), "#fbf7ef", PALETTE["line"], 2, 28)
    for tick in [0, 0.25, 0.5, 0.75, 1.0]:
        x = left + (right - left) * tick
        draw.line((x, top, x, bottom), fill="#e3d7c5", width=2)
        draw.text((x - 18, bottom + 18), f"{int(tick * 100)}%", font=font(18), fill=PALETTE["muted"])
    max_y = max(1, max(item.get("known_source_evidence_count", 0) for item in rows))
    max_size = max(1, max(item.get("method_evidence_count", 0) for item in rows))
    for tick in range(0, 5):
        value = max_y * tick / 4
        y = bottom - (bottom - top) * tick / 4
        draw.line((left, y, right, y), fill="#eadfce", width=1)
        draw.text((96, y - 10), str(int(value)), font=font(17), fill=PALETTE["muted"])
    top_rows = rows[:180]
    seen_render_keys = {
        (item.get("company_id"), item.get("ratio_basis_key"))
        for item in top_rows
    }
    render_rows = top_rows + [
        item for item in explicit_rows
        if (item.get("company_id"), item.get("ratio_basis_key")) not in seen_render_keys
    ]
    render_rows.sort(key=lambda item: item.get("ratio_basis_key") == "explicit_reported_primary_percentage")
    for item in render_rows:
        x = left + (right - left) * float(item.get("primary_ratio_known") or 0)
        y = bottom - (bottom - top) * item.get("known_source_evidence_count", 0) / max_y
        radius = 6 + math.sqrt(item.get("method_evidence_count", 0) / max_size) * 34
        color = item.get("industry_color") or "#98a1a8"
        is_explicit = item.get("ratio_basis_key") == "explicit_reported_primary_percentage"
        if is_explicit:
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=blend(color, PALETTE["paper"], 0.78), outline=PALETTE["ink"], width=4)
            inner = max(3, radius * 0.22)
            draw.ellipse((x - inner, y - inner, x + inner, y + inner), fill=PALETTE["ink"])
        else:
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=blend(color, PALETTE["paper"], 0.22), outline=blend(color, PALETTE["paper"], 0.66), width=2)
    for item in rows[:12]:
        x = left + (right - left) * float(item.get("primary_ratio_known") or 0)
        y = bottom - (bottom - top) * item.get("known_source_evidence_count", 0) / max_y
        label = local(item, lang, "company_name_zh", "company_name_en")
        draw_wrapped(draw, (x + 14, y - 10), label, font(16, True), PALETTE["ink"], 210, max_lines=1)
    draw.line((left, bottom, right, bottom), fill=PALETTE["ink"], width=3)
    draw.line((left, top, left, bottom), fill=PALETTE["ink"], width=3)
    x_label = "初级数据占比（明示百分比优先）" if lang == "zh" else "Primary-data share, explicit percentage first"
    y_label = "已分类来源证据行数" if lang == "zh" else "Classified source-evidence rows"
    draw.text((760, 1320), x_label, font=font(24, True), fill=PALETTE["ink"])
    draw.text((72, 220), y_label, font=font(23, True), fill=PALETTE["ink"])
    industries = {}
    for item in rows:
        key = local(item, lang, "industry_section_zh", "industry_section_en", "Other")
        industries.setdefault(key, item.get("industry_color") or "#98a1a8")
    legend_x = 2085
    legend_y = 360
    draw.text((legend_x, 172), "Evidence basis" if lang != "zh" else "Evidence basis", font=font(22, True), fill=PALETTE["ink"])
    draw.ellipse((legend_x, 216, legend_x + 26, 242), fill=blend("#2f6f63", PALETTE["paper"], 0.78), outline=PALETTE["ink"], width=4)
    draw_wrapped(
        draw,
        (legend_x + 38, 210),
        f"Strong: explicit reported ratio {len(explicit_rows)}",
        font(16),
        PALETTE["ink"],
        230,
        max_lines=2,
    )
    draw.ellipse((legend_x, 254, legend_x + 26, 280), fill=blend("#98a1a8", PALETTE["paper"], 0.22), outline="#b8aa99", width=2)
    draw_wrapped(
        draw,
        (legend_x + 38, 248),
        f"Review-only inference rows {inference_count}",
        font(16),
        PALETTE["muted"],
        230,
        max_lines=2,
    )
    draw.text((legend_x, legend_y - 44), "行业颜色" if lang == "zh" else "Industry colors", font=font(22, True), fill=PALETTE["ink"])
    for index, (label, color) in enumerate(list(industries.items())[:12]):
        y = legend_y + index * 54
        draw.ellipse((legend_x, y, legend_x + 24, y + 24), fill=color)
        draw_wrapped(draw, (legend_x + 34, y - 4), label, font(16), PALETTE["muted"], 230, max_lines=2)
    note = "口径：优先使用原文明示 primary data 百分比；否则使用 method_rows 来源结构比例。两者均未直接等同审定计算权重。" if lang == "zh" else "Scope: explicit primary-data percentages are preferred; otherwise ratios are inferred from method_rows source mix. Neither is automatically an audited calculation weight."
    note = "口径：强证据气泡必须来自企业报告明确披露的 primary data 百分比；method_rows 来源结构比例保留为 inference 复核数据。" if lang == "zh" else "Scope: strong bubbles require explicitly reported primary-data percentages. method_rows source-mix ratios remain inference review data."
    draw_wrapped(draw, (100, 1402), note, font(22), PALETTE["muted"], 2160, max_lines=2)
    out = FIGURE_DIR / lang / "world500_primary_secondary_source_mix.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def main():
    payload = load_payload()
    validate_payload(payload)
    outputs = []
    for lang in ("zh", "en"):
        outputs.append(render_emissions_ranking(lang, payload))
        outputs.append(render_figure2(lang, payload))
        outputs.append(render_standard_entity_graph(lang, payload))
        outputs.append(render_figure6(lang, payload))
        outputs.append(render_source_mix(lang, payload))
    manifest = {
        "schema_version": "reporting-static-figures-manifest-v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": str(REPORTING_FILE.relative_to(ROOT)).replace("\\", "/"),
        "source_sha256": sha256_file(REPORTING_FILE),
        "generator": str(Path(__file__).relative_to(ROOT)).replace("\\", "/"),
        "sync_policy": "Figure 2, Figure 6, and the primary/secondary bubble PNGs are regenerated from the same reporting_views.json snapshot referenced by the GitHub pages.",
        "required_synced_report_figures": REQUIRED_SYNCED_REPORT_FIGURES,
        "figures": [
            {
                "file": str(output.relative_to(ROOT)).replace("\\", "/"),
                "lang": output.parent.name,
                **REQUIRED_SYNCED_REPORT_FIGURES.get(output.name, {
                    "figure_no": "emissions_ranking_graph",
                    "title_en": "Company total-emissions ranking graph",
                    "title_zh": "企业总排放排行图谱",
                    "data_keys": ["emissions_ranking"],
                    "page_sections": ["reporting_views.ranking"],
                }),
                **FIGURE_CLAIM_METADATA[output.name],
                "bytes": output.stat().st_size,
                "sha256": sha256_file(output),
            }
            for output in outputs
        ],
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    for output in outputs:
        print(f"Wrote {output.relative_to(ROOT)}")
    print(f"Wrote {MANIFEST_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
