import html
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORTING_FILE = ROOT / "assets" / "data" / "world500" / "workbench" / "reporting_views.json"
GENERIC_GHG_ID = "ghg_generic_reference"
CORE_GHG_PCAF_STANDARD_IDS = {
    "ghg_policy_action_standard",
    "ghg_mitigation_goal_standard",
    "ghg_land_sector_removals_standard",
    "ghg_grid_connected_electricity_projects",
    "ghg_cities_gpc",
    "ghg_scope3_standard",
    "ghg_financial_industry_standard",
    "ghg_scope2_guidance",
    "ghg_scope3_calculation_guidance",
    "ghg_corporate_standard",
    "ghg_project_protocol",
    "ghg_product_standard",
}
DRAWABLE_GHG_MATCH_STATUSES = {
    "explicit_series_citation",
    "pdf_explicit_series_citation",
}
OVERMAPPED_GHG_MATCH_STATUSES = {"contextual_overmapped_review"}
EMBEDDED_PAYLOAD_VERSION = "reporting_views_embedded_v6_explicit_ghg_only"


TEXT = {
    "zh": {
        "brand": "世界500强 ESG 知识图谱",
        "home": "Home",
        "back": "返回中文详细页",
        "other": "English",
        "search": "企业检索",
        "search_placeholder": "输入企业名称或世界500强排名",
        "clear": "清空检索",
        "fit": "回到全图",
        "reset": "重置视图",
        "legend": "图谱图例",
        "system_node": "体系/角色族节点",
        "standard_node": "具体标准/指南节点",
        "company_node": "企业节点",
        "strong_edge": "实线：原文明示引用",
        "review_edge": "虚线：上下文待复核，仅保留在复核队列，不进入本图",
        "evidence_mode": "证据关系模式",
        "strong_only": "默认强证据：仅原文明示引用",
        "include_review": "复核队列：上下文边不在本图绘制",
        "details": "当前节点详情",
        "details_hint": "点击左侧体系节点、标准节点或企业节点，这里会展示对象属性与证据回链。",
        "interaction": "交互说明：拖拽平移，滚轮缩放；点击标准或企业节点可在右侧查看详情与证据回链。",
        "note": "NOTE",
        "ghg_eyebrow": "GHG Protocol",
        "ghg_title": "GHG Protocol 细分系列全屏实体级知识图谱",
        "ghg_intro_1": "本页不再使用旧静态快照；HTML 内嵌来自 reporting_views.json 的同源图谱子集，将 GHG Protocol 拆分到企业核算标准、Scope 2/3 指南、行业/项目/本地化项目等具体节点。",
        "ghg_intro_2": "默认视图只突出原文明示采信的 GHG 细分系列；上下文映射和未解析泛化 GHG 提及保留为复核数据，不画成已采信图谱关系。",
        "standard_eyebrow": "标准角色族",
        "standard_title": "标准（Standard）角色族全屏实体级知识图谱",
        "standard_intro_1": "本页 HTML 内嵌来自 reporting_views.json 的 accepted_standard_role_graph 子集；GHG Protocol 已拆成细分系列，不再保留一个粗粒度大节点。",
        "standard_intro_2": "标准节点按标准上色，企业节点按行业上色；非 GHG Protocol 证据默认使用直接/间接口径，只有 GHG 语境下才使用 Scope 1/2/3 类别。",
        "ghg_companies": "GHG 待展示企业",
        "accepted_companies": "明示采信企业",
        "review_companies": "复核企业",
        "ghg_series": "GHGP/PCAF 受控节点",
        "explicit_series": "显式命中细分系列",
        "context_review": "上下文待复核",
        "overmapped_review": "疑似过度映射",
        "generic_review": "泛化引用待复核",
        "companies": "企业节点",
        "standards": "具体标准/指南",
        "links": "标准-企业关系",
        "ghg_fine": "GHGP/PCAF 受控节点",
    },
    "en": {
        "brand": "World500 ESG Knowledge Graph",
        "home": "Home",
        "back": "Back to English detail page",
        "other": "中文",
        "search": "Company search",
        "search_placeholder": "Search by company name or World500 rank",
        "clear": "Clear search",
        "fit": "Fit graph",
        "reset": "Reset view",
        "legend": "Legend",
        "system_node": "System / role-family node",
        "standard_node": "Specific standard / guidance node",
        "company_node": "Company node",
        "strong_edge": "Solid line: explicit source citation",
        "review_edge": "Dashed line: contextual review, retained in queues and not drawn here",
        "evidence_mode": "Evidence-link mode",
        "strong_only": "Default strong evidence: explicit citations only",
        "include_review": "Review queues: contextual edges are not drawn here",
        "details": "Current node details",
        "details_hint": "Click a system, standard, or company node to inspect attributes and evidence back-links.",
        "interaction": "Interaction: drag to pan, use the mouse wheel to zoom, and click standards or company nodes to inspect details and evidence back-links.",
        "note": "NOTE",
        "ghg_eyebrow": "GHG Protocol",
        "ghg_title": "GHG Protocol Fine-Series Full-Screen Entity Knowledge Graph",
        "ghg_intro_1": "This standalone page embeds a same-source graph subset from reporting_views.json and splits GHG Protocol into corporate standards, Scope 2/3 guidance, sector/project/program nodes.",
        "ghg_intro_2": "The default view foregrounds only explicitly accepted GHG fine-series citations. Contextual mappings and unresolved generic GHG mentions remain review data and are not drawn as accepted graph links.",
        "standard_eyebrow": "Standard Role Family",
        "standard_title": "Standard Role-Family Full-Screen Entity Knowledge Graph",
        "standard_intro_1": "This page embeds the accepted_standard_role_graph subset from reporting_views.json directly in the HTML; GHG Protocol is expanded into fine-series nodes instead of one coarse node.",
        "standard_intro_2": "Standard nodes are colored by standard and company nodes by industry. Non-GHG evidence uses direct/indirect emissions wording unless the source explicitly cites GHG Protocol scopes.",
        "ghg_companies": "GHG display candidates",
        "accepted_companies": "Explicitly accepted companies",
        "review_companies": "Review companies",
        "ghg_series": "GHGP/PCAF controlled nodes",
        "explicit_series": "Explicit series hits",
        "context_review": "Contextual review",
        "overmapped_review": "Possible overmapping",
        "generic_review": "Generic review",
        "companies": "Company nodes",
        "standards": "Specific standards/guides",
        "links": "Standard-company links",
        "ghg_fine": "GHGP/PCAF controlled nodes",
    },
}


def load_reporting():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def payload_hash(value):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def h(value):
    return html.escape(str(value), quote=True)


def require_object(mapping, key):
    value = mapping.get(key) if isinstance(mapping, dict) else None
    if not isinstance(value, dict):
        raise ValueError(f"Missing required object: {key}")
    return value


def require_list(mapping, key):
    value = mapping.get(key) if isinstance(mapping, dict) else None
    if not isinstance(value, list):
        raise ValueError(f"Missing required list: {key}")
    return value


def require_nonempty_list(mapping, key):
    value = require_list(mapping, key)
    if not value:
        raise ValueError(f"Required embedded full-graph list is empty: {key}")
    return value


def is_drawable_ghg_series(item):
    if item.get("series_id") == GENERIC_GHG_ID:
        return False
    if item.get("series_id") not in CORE_GHG_PCAF_STANDARD_IDS:
        return False
    return item.get("match_status") in DRAWABLE_GHG_MATCH_STATUSES


def ghg_graph_exclusion_summary(series_graph):
    rows = require_nonempty_list(series_graph, "company_mappings")
    generic_edges = 0
    overmapped_edges = 0
    unknown_edges = 0
    generic_companies = set()
    overmapped_companies = set()
    unknown_companies = set()
    for row in rows:
        company_id = row.get("company_id")
        for item in require_list(row, "series"):
            series_id = item.get("series_id")
            match_status = item.get("match_status")
            if series_id == GENERIC_GHG_ID:
                generic_edges += 1
                if company_id:
                    generic_companies.add(company_id)
            elif match_status in OVERMAPPED_GHG_MATCH_STATUSES:
                overmapped_edges += 1
                if company_id:
                    overmapped_companies.add(company_id)
            elif match_status not in DRAWABLE_GHG_MATCH_STATUSES:
                unknown_edges += 1
                if company_id:
                    unknown_companies.add(company_id)
    return {
        "generic_reference_edges_excluded": generic_edges,
        "generic_reference_companies_excluded": len(generic_companies),
        "overmapped_review_edges_excluded": overmapped_edges,
        "overmapped_review_companies_excluded": len(overmapped_companies),
        "unknown_status_edges_excluded": unknown_edges,
        "unknown_status_companies_excluded": len(unknown_companies),
        "excluded_match_statuses": sorted(OVERMAPPED_GHG_MATCH_STATUSES),
    }


def summarize_filtered_ghg_series(company_mappings):
    stats = {}
    for row in company_mappings:
        company_id = row.get("company_id")
        for item in row.get("series", []):
            series_id = item.get("series_id")
            if not series_id:
                continue
            match_status = item.get("match_status")
            bucket = stats.setdefault(series_id, {
                "companies": set(),
                "explicit_companies": set(),
                "contextual_companies": set(),
                "evidence_count": 0,
                "pages": set(),
                "source_files": set(),
            })
            if company_id:
                bucket["companies"].add(company_id)
                if match_status in {"explicit_series_citation", "pdf_explicit_series_citation"}:
                    bucket["explicit_companies"].add(company_id)
                elif match_status in {"contextual_scope_inventory_mapping", "pdf_contextual_scope_inventory_mapping"}:
                    bucket["contextual_companies"].add(company_id)
            bucket["evidence_count"] += int(item.get("evidence_count") or 0)
            for page in item.get("pages") or []:
                if page:
                    bucket["pages"].add(str(page))
            for source_file in item.get("source_files") or []:
                if source_file:
                    bucket["source_files"].add(str(source_file))
    return stats


def recalc_ghg_company_counts(row, series):
    explicit_count = len([
        item for item in series
        if item.get("match_status") in {"explicit_series_citation", "pdf_explicit_series_citation"}
    ])
    contextual_count = len([
        item for item in series
        if item.get("match_status") in {"contextual_scope_inventory_mapping", "pdf_contextual_scope_inventory_mapping"}
    ])
    next_row = dict(row)
    next_row["series"] = series
    next_row["explicit_series_count"] = explicit_count
    next_row["accepted_series_count"] = explicit_count
    next_row["resolved_series_count"] = explicit_count
    next_row["contextual_series_count"] = contextual_count
    next_row["overmapped_review_series_count"] = 0
    next_row["review_series_count"] = contextual_count
    next_row["non_generic_series_count"] = len(series)
    next_row["generic_reference_count"] = 0
    return next_row


def filter_ghg_series_graph(series_graph):
    if not isinstance(series_graph, dict):
        raise ValueError("Missing required object: ghg_standard_series")
    source = series_graph
    filtered = dict(source)
    filtered["definitions"] = [
        item for item in require_nonempty_list(source, "definitions")
        if item.get("id") in CORE_GHG_PCAF_STANDARD_IDS
    ]
    filtered["series_summary"] = [
        item for item in require_nonempty_list(source, "series_summary")
        if item.get("series_id") in CORE_GHG_PCAF_STANDARD_IDS
    ]
    if not filtered["definitions"] or not filtered["series_summary"]:
        raise ValueError("GHG full graph would be empty after excluding generic/review-only references.")
    company_mappings = []
    for row in require_nonempty_list(source, "company_mappings"):
        series = [
            item for item in require_list(row, "series")
            if is_drawable_ghg_series(item)
        ]
        if not series:
            continue
        company_mappings.append(recalc_ghg_company_counts(row, series))
    if not company_mappings:
        raise ValueError("GHG full graph would have no company mappings after excluding generic/review-only references.")
    filtered["company_mappings"] = company_mappings
    series_stats = summarize_filtered_ghg_series(company_mappings)
    filtered["series_summary"] = [
        {
            **item,
            "company_count": len(series_stats.get(item.get("series_id"), {}).get("companies", set())),
            "explicit_company_count": len(series_stats.get(item.get("series_id"), {}).get("explicit_companies", set())),
            "accepted_company_count": len(series_stats.get(item.get("series_id"), {}).get("explicit_companies", set())),
            "contextual_company_count": len(series_stats.get(item.get("series_id"), {}).get("contextual_companies", set())),
            "review_company_count": len(series_stats.get(item.get("series_id"), {}).get("contextual_companies", set())),
            "overmapped_review_company_count": 0,
            "evidence_count": series_stats.get(item.get("series_id"), {}).get("evidence_count", 0),
            "pages": sorted(series_stats.get(item.get("series_id"), {}).get("pages", set()))[:8],
            "source_files": sorted(series_stats.get(item.get("series_id"), {}).get("source_files", set()))[:4],
        }
        for item in filtered["series_summary"]
    ]
    filtered["graph_exclusion_summary"] = ghg_graph_exclusion_summary(source)
    return filtered


def filter_standard_role_graph(role_graph):
    if not isinstance(role_graph, dict):
        raise ValueError("Missing required object: standard_role_graph")
    source = role_graph
    filtered = dict(source)
    source_links = [
        item for item in require_nonempty_list(source, "links")
        if item.get("standard_id") != GENERIC_GHG_ID
    ]
    links = [
        item for item in source_links
        if item.get("decision_bucket") == "accepted"
    ]
    accepted_company_ids_by_standard = {}
    accepted_samples_by_standard = {}
    accepted_evidence_count_by_standard = {}
    for link in links:
        standard_id = link.get("standard_id")
        accepted_company_ids_by_standard.setdefault(standard_id, set()).add(link.get("company_id"))
        accepted_evidence_count_by_standard[standard_id] = (
            accepted_evidence_count_by_standard.get(standard_id, 0) + int(link.get("evidence_count") or 0)
        )
        accepted_samples_by_standard.setdefault(standard_id, [])
        for sample in link.get("evidence_samples") or []:
            if len(accepted_samples_by_standard[standard_id]) < 8:
                accepted_samples_by_standard[standard_id].append(sample)
    standards = []
    for item in require_nonempty_list(source, "standards"):
        standard_id = item.get("id")
        if standard_id == GENERIC_GHG_ID or standard_id not in accepted_company_ids_by_standard:
            continue
        next_item = dict(item)
        next_item["company_ids"] = sorted(accepted_company_ids_by_standard.get(standard_id, set()))
        next_item["company_count"] = len(next_item["company_ids"])
        next_item["accepted_company_count"] = len(next_item["company_ids"])
        next_item["evidence_count"] = accepted_evidence_count_by_standard.get(standard_id, 0)
        next_item["evidence_samples"] = accepted_samples_by_standard.get(standard_id, [])
        standards.append(next_item)
    if not standards or not links:
        raise ValueError("Standard role full graph would be empty after excluding generic/review-only references.")
    allowed = {item.get("id") for item in standards}
    accepted_standard_ids_by_company = {}
    for link in links:
        accepted_standard_ids_by_company.setdefault(link.get("company_id"), set()).add(link.get("standard_id"))
    companies = []
    for row in require_nonempty_list(source, "companies"):
        standard_ids = [
            standard_id for standard_id in accepted_standard_ids_by_company.get(row.get("company_id"), set())
            if standard_id in allowed
        ]
        if not standard_ids:
            continue
        next_row = dict(row)
        next_row["standard_ids"] = sorted(standard_ids)
        companies.append(next_row)
    if not companies:
        raise ValueError("Standard role full graph would have no companies after excluding generic/review-only references.")
    filtered["standards"] = standards
    filtered["links"] = links
    filtered["companies"] = companies
    filtered["graph_exclusion_summary"] = {
        "generic_reference_excluded": True,
        "review_edges_excluded": len(source_links) - len(links),
        "review_companies_excluded": len({
            link.get("company_id")
            for link in source_links
            if link.get("decision_bucket") != "accepted" and link.get("company_id")
        }),
        "drawn_decision_bucket": "accepted",
    }
    return filtered


def full_standard_role_graph(role_graph):
    if not isinstance(role_graph, dict):
        raise ValueError("Missing required object: standard_role_graph")
    source = role_graph
    filtered = dict(source)
    source_links = [
        item for item in require_nonempty_list(source, "links")
        if item.get("standard_id") != GENERIC_GHG_ID
    ]
    if not source_links:
        raise ValueError("Standard role full graph would have no non-generic standard links.")

    company_ids_by_standard = {}
    samples_by_standard = {}
    evidence_count_by_standard = {}
    for link in source_links:
        standard_id = link.get("standard_id")
        company_id = link.get("company_id")
        if not standard_id or not company_id:
            continue
        company_ids_by_standard.setdefault(standard_id, set()).add(company_id)
        evidence_count_by_standard[standard_id] = (
            evidence_count_by_standard.get(standard_id, 0) + int(link.get("evidence_count") or 0)
        )
        samples_by_standard.setdefault(standard_id, [])
        for sample in link.get("evidence_samples") or []:
            if len(samples_by_standard[standard_id]) < 8:
                samples_by_standard[standard_id].append(sample)

    standards = []
    for item in require_nonempty_list(source, "standards"):
        standard_id = item.get("id")
        if standard_id == GENERIC_GHG_ID:
            continue
        keep_empty_core_ghg = standard_id in CORE_GHG_PCAF_STANDARD_IDS
        if standard_id not in company_ids_by_standard and not keep_empty_core_ghg:
            continue
        next_item = dict(item)
        next_item["company_ids"] = sorted(company_ids_by_standard.get(standard_id, set()))
        next_item["company_count"] = len(next_item["company_ids"])
        next_item["evidence_count"] = evidence_count_by_standard.get(standard_id, 0)
        next_item["evidence_samples"] = samples_by_standard.get(standard_id, [])
        standards.append(next_item)
    if not standards:
        raise ValueError("Standard role full graph would be empty after excluding generic references.")

    allowed = {item.get("id") for item in standards}
    standard_ids_by_company = {}
    for link in source_links:
        standard_id = link.get("standard_id")
        company_id = link.get("company_id")
        if standard_id in allowed and company_id:
            standard_ids_by_company.setdefault(company_id, set()).add(standard_id)

    companies = []
    for row in require_nonempty_list(source, "companies"):
        standard_ids = [
            standard_id for standard_id in standard_ids_by_company.get(row.get("company_id"), set())
            if standard_id in allowed
        ]
        if not standard_ids:
            continue
        next_row = dict(row)
        next_row["standard_ids"] = sorted(standard_ids)
        companies.append(next_row)
    if not companies:
        raise ValueError("Standard role full graph would have no companies after excluding generic references.")

    review_links = [
        item for item in source_links
        if item.get("decision_bucket") != "accepted"
    ]
    filtered["standards"] = standards
    filtered["links"] = source_links
    filtered["companies"] = companies
    filtered["graph_exclusion_summary"] = {
        "generic_reference_excluded": True,
        "review_edges_included_for_audit": len(review_links),
        "review_companies_included_for_audit": len({
            link.get("company_id")
            for link in review_links
            if link.get("company_id")
        }),
        "drawn_decision_bucket": "accepted_and_review",
    }
    return filtered


def accepted_standard_role_graph(reporting):
    graph_data = reporting.get("accepted_standard_role_graph")
    if isinstance(graph_data, dict):
        require_nonempty_list(graph_data, "standards")
        require_nonempty_list(graph_data, "companies")
        links = require_nonempty_list(graph_data, "links")
        leaked = [
            item for item in links
            if item.get("standard_id") == GENERIC_GHG_ID or item.get("decision_bucket") != "accepted"
        ]
        if leaked:
            raise ValueError("accepted_standard_role_graph contains generic or non-accepted links.")
        return graph_data
    return filter_standard_role_graph(require_object(reporting, "standard_role_graph"))


def graph_summary(kind, reporting, graph_data):
    summary = dict(require_object(reporting, "summary"))
    if kind == "ghg":
        mappings = require_list(graph_data, "company_mappings")
        drawn_company_count = len(mappings)
        summary["ghg_drawn_accepted_company_count"] = drawn_company_count
        summary["ghg_accepted_series_company_count"] = len([
            item for item in mappings
            if item.get("accepted_series_count", item.get("explicit_series_count", 0)) > 0
        ])
        summary["ghg_resolved_series_company_count"] = summary["ghg_accepted_series_company_count"]
        summary["ghg_drawn_non_generic_series_company_count"] = len([
            item for item in mappings
            if item.get("non_generic_series_count", 0) > 0
        ])
        summary["ghg_graph_series_count"] = len([
            item for item in require_list(graph_data, "series_summary")
            if item.get("company_count", 0) > 0
        ])
        summary["ghg_generic_reference_excluded_from_graph"] = True
        exclusion = graph_data.get("graph_exclusion_summary", {})
        summary["ghg_overmapped_review_excluded_from_graph"] = True
        summary["ghg_overmapped_review_edge_count_excluded_from_graph"] = int(exclusion.get("overmapped_review_edges_excluded", 0))
        summary["ghg_overmapped_review_company_count_excluded_from_graph"] = int(exclusion.get("overmapped_review_companies_excluded", 0))
    else:
        summary["standard_company_count"] = len(require_list(graph_data, "companies"))
        summary["standard_count"] = len(require_list(graph_data, "standards"))
        summary["standard_link_count"] = len(require_list(graph_data, "links"))
        summary["ghg_generic_reference_excluded_from_graph"] = True
        exclusion = graph_data.get("graph_exclusion_summary", {})
        summary["standard_review_edges_excluded_from_graph"] = int(exclusion.get("review_edges_excluded", 0))
        summary["standard_review_companies_excluded_from_graph"] = int(exclusion.get("review_companies_excluded", 0))
        summary["standard_review_edges_included_for_audit"] = int(exclusion.get("review_edges_included_for_audit", 0))
        summary["standard_review_companies_included_for_audit"] = int(exclusion.get("review_companies_included_for_audit", 0))
    return summary


def embedded_reporting(kind, reporting):
    if kind == "ghg":
        graph_data = filter_ghg_series_graph(require_object(reporting, "ghg_standard_series"))
    else:
        graph_data = accepted_standard_role_graph(reporting)
    base = {
        "schema_version": reporting["schema_version"],
        "generated_at": reporting["generated_at"],
        "policy": require_object(reporting, "policy"),
        "summary": graph_summary(kind, reporting, graph_data),
        "embed_policy": {
            "runtime": "inline_json_no_fetch",
            "generic_ghg_reference": "excluded_from_drawn_graph",
            "contextual_overmapped_review": "excluded_from_drawn_graph_retained_in_reporting_review_queues",
            "contextual_scope_inventory_mapping": "excluded_from_drawn_graph_retained_in_reporting_review_queues",
            "standard_role_graph": "accepted_standard_company_edges_only",
            "drawable_ghg_match_statuses": sorted(DRAWABLE_GHG_MATCH_STATUSES),
            "audit_source": "reporting_views.json retains review queues and generic-reference counts",
        },
    }
    if kind == "ghg":
        base["ghg_standard_series"] = graph_data
    else:
        base["standard_role_graph"] = graph_data
    return base


def graph_payload(kind, lang, reporting):
    payload = {
        "version": EMBEDDED_PAYLOAD_VERSION,
        "source": "assets/data/world500/workbench/reporting_views.json",
        "source_sha256": sha256_file(REPORTING_FILE),
        "system": {"key": "ghg" if kind == "ghg" else "standard"},
        "labels": {"lang": lang},
        "reporting": embedded_reporting(kind, reporting),
    }
    payload["payload_sha256"] = payload_hash(payload)
    return payload


def json_script_payload(value):
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return payload.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def metric_cards(items):
    return "".join(
        f'<div class="metric"><h3>{h(label)}</h3><strong>{h(value)}</strong></div>'
        for label, value in items
    )


def page(lang, kind, reporting):
    t = TEXT[lang]
    embedded = embedded_reporting(kind, reporting)
    summary = embedded["summary"]
    is_ghg = kind == "ghg"
    other_lang = "en" if lang == "zh" else "zh"
    other_href = "../en/ghg-protocol-full-graph.html" if (lang == "zh" and is_ghg) else (
        "../zh/ghg-protocol-full-graph.html" if is_ghg else (
            "../en/role-family-standard-full-graph.html" if lang == "zh" else "../zh/role-family-standard-full-graph.html"
        )
    )
    back_href = "./index.html"
    script_id = "world500-ghg-full-graph-data" if is_ghg else "world500-generic-full-graph-data"
    svg_id = "ghg-full-graph-svg" if is_ghg else "generic-full-graph-svg"
    prefix = "ghg-full-graph" if is_ghg else "generic-full-graph"
    title = t["ghg_title"] if is_ghg else t["standard_title"]
    eyebrow = t["ghg_eyebrow"] if is_ghg else t["standard_eyebrow"]
    intro_1 = t["ghg_intro_1"] if is_ghg else t["standard_intro_1"]
    intro_2 = t["ghg_intro_2"] if is_ghg else t["standard_intro_2"]
    if is_ghg:
        metrics = [
            (t["ghg_companies"], summary["ghg_protocol_company_count"]),
            (t["accepted_companies"], summary["ghg_accepted_series_company_count"]),
            (t["review_companies"], summary["ghg_review_series_company_count"]),
            (t["ghg_series"], summary["ghg_pcaf_core_whitelist_standard_count"] or len([
                item for item in embedded["ghg_standard_series"]["series_summary"]
                if item.get("core_whitelist")
            ])),
        ]
    else:
        metrics = [
            (t["companies"], summary["standard_company_count"]),
            (t["standards"], summary["standard_count"]),
            (t["links"], summary["standard_link_count"]),
            (t["ghg_fine"], summary["ghg_pcaf_core_whitelist_standard_count"] or len([
                item for item in embedded["standard_role_graph"]["standards"]
                if item.get("is_ghg_series") and item.get("core_whitelist")
            ])),
        ]
    payload = json_script_payload(graph_payload(kind, lang, reporting))
    evidence_mode_control = ""
    if is_ghg:
        evidence_mode_control = f"""
              <label class="entity-search graph-evidence-mode">
                <span>{h(t["evidence_mode"])}</span>
                <select id="{h(prefix)}-evidence-mode">
                  <option value="explicit" selected>{h(t["strong_only"])}</option>
                  <option value="all">{h(t["include_review"])}</option>
                </select>
              </label>"""
    legend_extra = ""
    if is_ghg:
        legend_extra = f"""
              <div class="graph-legend-item"><span class="graph-legend-line is-strong"></span><span>{h(t["strong_edge"])}</span></div>
              <div class="graph-legend-item"><span class="graph-legend-line is-review"></span><span>{h(t["review_edge"])}</span></div>"""
    report_grid = f"""
            <section class="section">
              <div class="graph-brief-grid">
                <div class="table-card report-table-card" id="{h(prefix)}-report-table"></div>
                <div class="table-card report-table-card" id="{h(prefix)}-evidence-summary"></div>
              </div>
            </section>"""
    return f"""<!DOCTYPE html>
<html lang="{h(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{h(title)}</title>
  <link rel="stylesheet" href="../assets/css/site.css">
</head>
<body>
  <div class="shell graph-page-shell">
    <div class="topbar">
      <div class="brand">{h(t["brand"])}</div>
      <div class="nav">
        <a class="pill" href="../index.html">{h(t["home"])}</a>
        <a class="pill" href="{h(back_href)}">{h(t["back"])}</a>
        <a class="pill" href="{h(other_href)}">{h(t["other"])}</a>
      </div>
    </div>
    <section class="hero">
      <div class="eyebrow">{h(eyebrow)}</div>
      <h1>{h(title)}</h1>
      <p>{h(intro_1)}</p>
      <p>{h(intro_2)}</p>
      <div class="metric-grid">{metric_cards(metrics)}</div>
    </section>
    <section class="section">
      <div class="graph-page-layout">
        <div class="card graph-canvas-card">
          <div class="graph-toolbar">
            <label class="entity-search graph-search">
              <span>{h(t["search"])}</span>
              <input id="{h(prefix)}-search" type="search" placeholder="{h(t["search_placeholder"])}">
            </label>{evidence_mode_control}
            <div class="graph-toolbar-actions">
              <button class="pill" id="{h(prefix)}-clear" type="button">{h(t["clear"])}</button>
              <button class="pill" id="{h(prefix)}-fit" type="button">{h(t["fit"])}</button>
              <button class="btn alt" id="{h(prefix)}-reset" type="button">{h(t["reset"])}</button>
            </div>
          </div>
          <div class="graph-canvas-wrap">
            <svg id="{h(svg_id)}" class="ghg-full-graph-svg" aria-label="{h(title)}"></svg>
          </div>
          <div class="report-figure-caption"><strong>{h(t["note"])}</strong> {h(t["interaction"])}</div>
        </div>
        <aside class="graph-side-panel">
          <div class="card graph-side-card">
            <h3>{h(t["legend"])}</h3>
            <div class="graph-legend-list">
              <div class="graph-legend-item"><span class="graph-legend-swatch is-system"></span><span>{h(t["system_node"])}</span></div>
              <div class="graph-legend-item"><span class="graph-legend-swatch is-standard"></span><span>{h(t["standard_node"])}</span></div>
              <div class="graph-legend-item"><span class="graph-legend-swatch is-company"></span><span>{h(t["company_node"])}</span></div>{legend_extra}
            </div>
          </div>
          <div class="card graph-side-card" id="{h(prefix)}-selection">
            <h3>{h(t["details"])}</h3>
            <p>{h(t["details_hint"])}</p>
          </div>
          <div class="card graph-side-card" id="{h(prefix)}-results"></div>
        </aside>
      </div>
    </section>{report_grid}
  </div>
  <script type="application/json" id="{h(script_id)}">{payload}</script>
  <script src="../assets/js/standard_cluster_full_graph.js"></script>
</body>
</html>
"""


def main():
    reporting = load_reporting()
    targets = [
        ("zh", "ghg", ROOT / "zh" / "ghg-protocol-full-graph.html"),
        ("en", "ghg", ROOT / "en" / "ghg-protocol-full-graph.html"),
        ("zh", "standard", ROOT / "zh" / "role-family-standard-full-graph.html"),
        ("en", "standard", ROOT / "en" / "role-family-standard-full-graph.html"),
    ]
    for lang, kind, path in targets:
        path.write_text(page(lang, kind, reporting), encoding="utf-8", newline="\n")
        print(f"Wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
