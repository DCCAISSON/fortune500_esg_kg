import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORTING_FILE = ROOT / "assets" / "data" / "world500" / "workbench" / "reporting_views.json"


TARGETS = [
    (
        ROOT / "index.html",
        "zh",
        "./assets/figures/zh/world500_standard_chain_overview.png",
        "./assets/figures/zh/world500_standard_role_entity_graph.png",
    ),
    (
        ROOT / "zh" / "index.html",
        "zh",
        "../assets/figures/zh/world500_standard_chain_overview.png",
        "../assets/figures/zh/world500_standard_role_entity_graph.png",
    ),
    (
        ROOT / "en" / "index.html",
        "en",
        "../assets/figures/en/world500_standard_chain_overview.png",
        "../assets/figures/en/world500_standard_role_entity_graph.png",
    ),
]


def h(value):
    return html.escape(str(value or ""), quote=True)


def local(item, lang, zh_key, en_key, default=""):
    if lang == "zh":
        return item.get(zh_key) or item.get(en_key) or default
    return item.get(en_key) or item.get(zh_key) or default


def figure2_rows(payload, lang):
    rows = []
    for item in payload["ghg_standard_series"]["series_summary"]:
        accepted = item.get("accepted_company_count", item.get("explicit_company_count", 0))
        if item.get("series_id") == "ghg_generic_reference" or not accepted:
            continue
        rows.append({
            "system": "GHG核算体系" if lang == "zh" else "GHG accounting systems",
            "name": local(item, lang, "name_zh", "name_en"),
            "role": local(item, lang, "category_zh", "category_en"),
            "principle": local(item, lang, "principle_zh", "principle_en"),
            "evidence": item.get("evidence_count", 0),
            "companies": accepted,
            "review": item.get("review_company_count", item.get("contextual_company_count", 0)),
        })

    standards = {item["id"]: item for item in payload["standard_role_graph"]["standards"]}
    wanted = [
        ("pcaf", "PCAF" if lang == "en" else "PCAF"),
        ("iso_14064", "ISO systems" if lang == "en" else "ISO体系"),
        ("iso_14064_3", "ISO systems" if lang == "en" else "ISO体系"),
        ("iso_14067", "ISO systems" if lang == "en" else "ISO体系"),
        ("iso_14040_14044", "ISO systems" if lang == "en" else "ISO体系"),
        ("gb_t_36001_2015", "GB national standards" if lang == "en" else "GB/国标体系"),
        ("gb_t_2589_2020", "GB national standards" if lang == "en" else "GB/国标体系"),
        ("gb_t_32150_2015", "GB national standards" if lang == "en" else "GB/国标体系"),
        ("gb_t_24067_2024", "GB national standards" if lang == "en" else "GB/国标体系"),
    ]
    for standard_id, system in wanted:
        item = standards.get(standard_id)
        if not item:
            continue
        rows.append({
            "system": system,
            "name": local(item, lang, "name_zh", "name_en"),
            "role": " | ".join(item.get("roles_zh" if lang == "zh" else "roles_en") or []),
            "principle": " | ".join(item.get("principles_zh" if lang == "zh" else "principles_en") or []),
            "evidence": item.get("evidence_count", 0),
            "companies": item.get("company_count", 0),
            "review": item.get("review_company_count", 0),
        })
    return rows


def figure2_entity_graph_card(lang, entity_graph_path):
    if lang == "zh":
        title = "\u56fe2B \u6807\u51c6-\u4f01\u4e1a accepted \u5b9e\u4f53\u7ea7\u77e5\u8bc6\u56fe\u8c31"
        note = "\u53e3\u5f84\uff1a\u6807\u51c6\u8282\u70b9\u5728\u4e2d\u5fc3\uff0c\u4f01\u4e1a\u8282\u70b9\u6309 accepted \u8fb9\u5728\u5916\u56f4\u5c55\u793a\uff1b\u4f01\u4e1a\u70b9\u989c\u8272\u8868\u793a\u884c\u4e1a\u3002\u6cdb\u5316 GHG \u548c review \u8fb9\u4e0d\u8fdb\u5165\u7ed8\u5236\u56fe\u3002"
        alt = title
        button = "\u70b9\u51fb\u653e\u5927\u67e5\u770b"
    else:
        title = "Figure 2B Accepted Standard-Company Entity Knowledge Graph"
        note = "Scope: standards are shown at cluster centers and accepted companies around them; company dot color indicates industry. Generic GHG and review edges are not drawn."
        alt = title
        button = "View Large"
    return (
        '<div class="table-card report-entity-figure-card">'
        '<div class="report-figure-head">'
        f'<div class="report-figure-title"><div class="tag">2B</div><h3>{h(title)}</h3></div>'
        f'<button class="zoom-btn" type="button" data-lightbox-src="{h(entity_graph_path)}" data-lightbox-title="{h(title)}">{h(button)}</button>'
        '</div>'
        f'<img class="visual-figure" src="{h(entity_graph_path)}" alt="{h(alt)}" data-lightbox-src="{h(entity_graph_path)}" data-lightbox-title="{h(title)}" tabindex="0">'
        f'<p class="table-lead">{h(note)}</p>'
        '</div>'
    )


def figure2_card(payload, lang, entity_graph_path):
    rows = figure2_rows(payload, lang)
    if lang == "zh":
        title = "图2对应结构化结果：GHG / ISO / GB 到具体标准、角色与核算原则"
        headers = ["标准体系", "具体标准/指南/项目", "角色", "原则/口径样例", "证据数", "强证据企业", "待复核企业"]
    else:
        title = "Figure 2 Structured Result: From GHG / ISO / GB to Standards, Roles, and Principles"
        headers = ["System", "Standard / guidance / program", "Role", "Principle / wording policy", "Evidence", "Strong companies", "Review companies"]
    body = "".join(
        "<tr>"
        f"<td>{h(row['system'])}</td>"
        f"<td>{h(row['name'])}</td>"
        f"<td>{h(row['role'])}</td>"
        f"<td>{h(row['principle'])}</td>"
        f"<td>{h(row['evidence'])}</td>"
        f"<td>{h(row['companies'])}</td>"
        f"<td>{h(row['review'])}</td>"
        "</tr>"
        for row in rows
    )
    header = "".join(f"<th>{h(item)}</th>" for item in headers)
    return (
        '<div class="visual-support">'
        f"{figure2_entity_graph_card(lang, entity_graph_path)}"
        '<div class="table-card">'
        f"<h3>{h(title)}</h3>"
        f'<div class="table-wrap"><table><tr>{header}</tr>{body}</table></div>'
        "</div></div>"
    )


def company_name(item, lang):
    return local(item, lang, "company_name_zh", "company_name_en")


def cluster_names(items, lang, limit=6):
    names = [company_name(item, lang) for item in (items or [])[:limit]]
    return "、".join(names) if lang == "zh" else ", ".join(names)


def subtype_labels(items, lang, limit=4):
    key = "label_zh" if lang == "zh" else "label_en"
    labels = [item.get(key) or item.get("label_en") or item.get("label_zh") for item in (items or [])[:limit]]
    return " | ".join(filter(None, labels))


def standards_labels(item, lang):
    standards = item.get("standards_zh" if lang == "zh" else "standards_en") or []
    return " | ".join(standards[:3])


def homepage_audit_badges(payload, lang):
    summary = payload.get("summary", {})
    ghg_badge = f"{summary.get('ghg_explicit_series_company_count', 0)}/{summary.get('ghg_protocol_company_count', 0)}"
    emissions_badge = f"{summary.get('complete_emissions_ranking_company_count', 0)}/{summary.get('available_emissions_ranking_company_count', 0)}"
    if lang == "zh":
        items = [
            ("4/8", "审计项已实现"),
            ("4", "仍为部分实现"),
            (ghg_badge, "GHG/PCAF 企业显式命中细分标准"),
            (emissions_badge, "完整强证据排放排行"),
        ]
    else:
        items = [
            ("4/8", "audit checks implemented"),
            ("4", "still partial"),
            (ghg_badge, "GHG/PCAF companies with explicit fine-standard hits"),
            (emissions_badge, "complete strong-evidence emissions ranking"),
        ]
    spans = "".join(f"<span><strong>{h(value)}</strong>{h(label)}</span>" for value, label in items)
    return f'<div class="homepage-audit-badges">{spans}</div>'


def technology_entity_card_body(payload, lang):
    summary = payload.get("summary", {})
    clusters = payload.get("technology_paths", {}).get("clusters", [])
    technology_edge_count = sum(int(item.get("company_count") or 0) for item in clusters)
    technology_signal_count = sum(int(item.get("evidence_count") or 0) for item in clusters)
    if lang == "zh":
        paragraph = (
            "这一页由 reporting_views.technology_paths 同步生成，把企业报告中可复现的减碳技术披露信号拉成实体网络；"
            "当前技术边仍是披露信号，项目级强证据另行在审计层标注。"
        )
        metrics = [
            (summary.get("technology_company_count", 0), "涉及企业"),
            (summary.get("technology_cluster_count", 0), "技术路径"),
            (technology_edge_count, "披露边"),
            (technology_signal_count, "证据命中"),
        ]
    else:
        paragraph = (
            "This page is synchronized from reporting_views.technology_paths and turns reproducible technology-topic "
            "disclosures into an entity network. Technology edges remain disclosure signals; project-level strong evidence is tracked separately."
        )
        metrics = [
            (summary.get("technology_company_count", 0), "companies"),
            (summary.get("technology_cluster_count", 0), "technology paths"),
            (technology_edge_count, "disclosure edges"),
            (technology_signal_count, "evidence hits"),
        ]
    p = f'<p style="margin:0;color:var(--muted);line-height:1.7;">{h(paragraph)}</p>'
    spans = "".join(f"<span><strong>{h(value):}</strong>{h(label)}</span>" for value, label in metrics)
    return p, f'<div class="entity-overview-metrics">{spans}</div>'


def replace_technology_entity_card(page_text, payload, lang):
    pattern = r'(<article class="entity-overview-card">(?:(?!</article>).)*?technology-cluster-full-graph\.html(?:(?!</article>).)*?</article>)'
    match = re.search(pattern, page_text, flags=re.S)
    if not match:
        raise RuntimeError("Could not find technology entity overview card")
    card = match.group(1)
    paragraph, metrics = technology_entity_card_body(payload, lang)
    card_updated, p_count = re.subn(r'<p style="margin:0;color:var\(--muted\);line-height:1\.7;">.*?</p>', paragraph, card, count=1, flags=re.S)
    card_updated, metric_count = re.subn(r'<div class="entity-overview-metrics">.*?</div>', metrics, card_updated, count=1, flags=re.S)
    if p_count != 1 or metric_count != 1:
        raise RuntimeError("Could not replace technology entity overview card content")
    return page_text[:match.start()] + card_updated + page_text[match.end():]


def replace_homepage_audit_badges(page_text, payload, lang):
    pattern = r'<div class="homepage-audit-badges">.*?</div>'
    updated, count = re.subn(pattern, homepage_audit_badges(payload, lang), page_text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("Could not replace homepage audit badges")
    return updated


def timeline_label(counts, lang):
    counts = counts or {}
    if lang == "zh":
        return f"近期 {counts.get('near', 0)} | 中期 {counts.get('mid', 0)} | 长期 {counts.get('long', 0)}"
    return f"Near {counts.get('near', 0)} | Mid {counts.get('mid', 0)} | Long {counts.get('long', 0)}"


def figure6_rows(payload, lang):
    rows = []
    for item in payload["technology_paths"]["clusters"]:
        rows.append({
            "name": local(item, lang, "name_zh", "name_en"),
            "standards": standards_labels(item, lang),
            "companies": item.get("company_count", 0),
            "evidence": item.get("evidence_count", 0),
            "subtypes": subtype_labels(item.get("subtypes"), lang),
            "timeline": timeline_label(item.get("timeline_counts"), lang),
            "cost": item.get("cost_signal_count", 0),
            "samples": cluster_names(item.get("company_examples"), lang),
        })
    return rows


def figure6_card(payload, lang):
    rows = figure6_rows(payload, lang)
    if lang == "zh":
        title = "图6对应结构化结果：技术路径聚类、标准对齐、时间与成本信号"
        note = "审计边界：覆盖企业数和证据命中数表示企业报告中出现相关技术主题披露；时间和成本字段仍是关键词信号，不等同于已核证项目实施、减排量或项目经济性结论。"
        headers = ["技术聚类", "标准对齐", "披露企业数", "披露信号数", "细分方向", "时间关键词信号", "成本关键词信号", "样例企业"]
    else:
        title = "Figure 6 Structured Result: Technology-path Clusters, Standards, Timeline, and Cost Signals"
        note = "Audit boundary: company and evidence counts indicate technology-topic disclosures in company reports. Timeline and cost fields remain keyword signals, not verified project implementation, abatement, or economics."
        headers = ["Technology path", "Standards alignment", "Disclosure companies", "Disclosure signal hits", "Subtypes", "Timeline keyword signals", "Cost keyword signals", "Sample companies"]
    body = "".join(
        "<tr>"
        f"<td>{h(row['name'])}</td>"
        f"<td>{h(row['standards'])}</td>"
        f"<td>{h(row['companies'])}</td>"
        f"<td>{h(row['evidence'])}</td>"
        f"<td>{h(row['subtypes'])}</td>"
        f"<td>{h(row['timeline'])}</td>"
        f"<td>{h(row['cost'])}</td>"
        f"<td>{h(row['samples'])}</td>"
        "</tr>"
        for row in rows
    )
    header = "".join(f"<th>{h(item)}</th>" for item in headers)
    return (
        '<div class="visual-support"><div class="table-card">'
        f"<h3>{h(title)}</h3>"
        f'<p class="table-lead">{h(note)}</p>'
        f'<div class="table-wrap"><table><tr>{header}</tr>{body}</table></div>'
        "</div></div>"
    )


def replace_figure2_block(page_text, payload, lang, entity_graph_path):
    page_text = re.sub(
        r'\s*<div class="table-card report-entity-figure-card">.*?<p class="table-lead">.*?</p></div>\s*',
        "",
        page_text,
        flags=re.S,
    )
    card = figure2_card(payload, lang, entity_graph_path)
    if lang == "zh":
        pattern = (
            r'<div class="visual-support"><div class="table-card"><h3>图2对应结构化结果：'
            r'GHG / ISO / GB 到具体标准、角色与核算原则</h3>.*?</table></div></div></div>'
        )
        replacement = card
        caption_old = "口径：仅统计 GHG、ISO、GB/国标三类体系。内容：从体系节点下钻到具体标准，再连接角色与核算原则。用途：回答“标准链条如何逐层展开”。"
        caption_new = "口径：仅统计 GHG、ISO、GB/国标三类体系；GHG 企业数默认只计原文明示引用的强证据企业，上下文映射单列为待复核。用途：回答“标准链条如何逐层展开”。"
    else:
        pattern = (
            r'<div class="visual-support"><div class="table-card"><h3>Figure 2 Structured Result: '
            r'From GHG / ISO / GB to Standards, Roles, and Principles</h3>.*?</table></div></div></div>'
        )
        replacement = card
        caption_old = "Scope: GHG, ISO, and GB systems only. Layout: the figure drills down from system nodes to specific standards and then to roles and principles. Use: answers how the standards chain unfolds step by step."
        caption_new = "Scope: GHG, ISO, and GB systems only. GHG company counts default to explicit strong-evidence companies, while contextual mappings are listed separately as review. Use: answers how the standards chain unfolds step by step."
    updated, count = re.subn(pattern, replacement, page_text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("Could not replace Figure 2 support table")
    return updated.replace(caption_old, caption_new, 1)


def replace_figure6_block(page_text, payload, lang):
    card = figure6_card(payload, lang)
    if lang == "zh":
        pattern = (
            r'<div class="visual-support"><div class="table-card"><h3>图6对应结构化结果：'
            r'(?:技术路径聚类与样例企业|技术路径聚类、标准对齐、时间与成本信号)</h3>.*?</table></div></div></div>'
        )
        insight_old = (
            "这一页把“同类技术企业用同一背景色放在一起展示”正式提升为技术路径主轴，"
            "可直接看到不同企业在同类减碳技术上的"
            "聚集关系。"
        )
        insight_new = "这一页把企业报告中出现的同类减碳技术主题聚合到同一技术路径下；当前展示的是披露信号聚类，不等同于已核证项目实施或成本结论。"
        caption_old = (
            "口径：基于 world500 技术主题证据的聚类归纳结果。内容：同一技术类型使用同一背景色展示样例企业与覆盖范围。"
            "用途：回答“哪些企业采用了相近"
            "减碳技术路径”。"
        )
        caption_new = "口径：基于 world500 技术主题披露信号的聚类归纳结果。内容：同一技术类型使用同一背景色展示样例企业与覆盖范围；时间和成本仍为关键词信号。用途：回答“哪些企业报告中出现了相近减碳技术主题”，不作为项目级核证结论。"
    else:
        pattern = (
            r'<div class="visual-support"><div class="table-card"><h3>Figure 6 Structured Result: '
            r'(?:Technology-path Clusters|Technology-path Clusters, Standards, Timeline, and Cost Signals)</h3>.*?</table></div></div></div>'
        )
        insight_old = (
            "This figure turns the technology-cluster requirement into a formal technology-path axis, "
            "grouping companies that use similar decarbonization "
            "technologies under the same background color."
        )
        insight_new = "This figure groups similar decarbonization technology topics disclosed in company reports under the same path. It is a disclosure-signal cluster, not verified project implementation or cost evidence."
        caption_old = (
            "Scope: clustered technology-theme evidence from the world500 corpus. Layout: each technology type is rendered as a same-color block with representative companies. "
            "Use: answers which companies share similar decarbonization "
            "technology paths."
        )
        caption_new = "Scope: clustered technology-theme disclosure signals from the world500 corpus. Layout: each technology type is rendered as a same-color block with representative companies; timeline and cost remain keyword signals. Use: answers which companies disclose similar decarbonization technology topics, not verified project-level conclusions."
    updated, count = re.subn(pattern, card, page_text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("Could not replace Figure 6 support table")
    return updated.replace(insight_old, insight_new, 1).replace(caption_old, caption_new, 1)


def main():
    payload = json.loads(REPORTING_FILE.read_text(encoding="utf-8"))
    for target, lang, _figure_path, entity_graph_path in TARGETS:
        text = target.read_text(encoding="utf-8")
        updated = replace_figure2_block(text, payload, lang, entity_graph_path)
        updated = replace_figure6_block(updated, payload, lang)
        updated = replace_homepage_audit_badges(updated, payload, lang)
        updated = replace_technology_entity_card(updated, payload, lang)
        target.write_text(updated, encoding="utf-8", newline="\n")
        print(f"Wrote {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
