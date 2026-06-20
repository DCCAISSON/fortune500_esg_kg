import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_FILE = ROOT / "assets" / "js" / "generic_full_graph.js"
REPORTING_FILE = ROOT / "assets" / "data" / "world500" / "workbench" / "reporting_views.json"
PAYLOAD_VERSION = "generic_full_graph_embedded_v2_inline_json_strict"
SPECIAL_FULL_GRAPH_PAGES = {
    "ghg-protocol-full-graph.html",
    "role-family-standard-full-graph.html",
}
GENERATED_METADATA_KEYS = {"payload_sha256", "source", "source_sha256"}
TECHNOLOGY_PAGE_CLUSTER_IDS = {
    "technology-advanced-clean-power-full-graph.html": "energy_efficiency",
    "technology-battery-storage-full-graph.html": "battery_storage",
    "technology-carbon-management-full-graph.html": "carbon_management",
    "technology-circularity-full-graph.html": "circular_recycling",
    "technology-electrified-transport-full-graph.html": "electrified_transport",
    "technology-hydrogen-or-methanol-full-graph.html": "hydrogen_methanol",
    "technology-low-carbon-fuels-full-graph.html": "low_carbon_fuels",
    "technology-low-carbon-materials-full-graph.html": "low_carbon_materials",
    "technology-renewable-power-full-graph.html": "renewable_power",
}


def json_script_payload(value):
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return payload.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def payload_hash(value):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def graph_content_hash(value):
    return payload_hash({key: item for key, item in value.items() if key not in GENERATED_METADATA_KEYS})


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def reporting_views():
    return json.loads(REPORTING_FILE.read_text(encoding="utf-8"))


def localized(item, lang, zh_key, en_key):
    if lang == "zh":
        return clean(item.get(zh_key) or item.get(en_key))
    return clean(item.get(en_key) or item.get(zh_key))


def technology_evidence_sample(sample):
    return {
        "report": clean(sample.get("report") or sample.get("source_file")),
        "page": clean(sample.get("page")),
        "snippet": clean(sample.get("snippet_en") or sample.get("snippet_zh")),
        "confidence": clean(sample.get("confidence")),
        "review_status": clean(sample.get("review_status")),
    }


def technology_payload_from_reporting(existing_payload, path):
    lang = "zh" if path.parent.name == "zh" else "en"
    payload = reporting_views()
    technology = payload.get("technology_paths", {})
    all_clusters = technology.get("clusters", [])
    cluster_id = TECHNOLOGY_PAGE_CLUSTER_IDS.get(path.name)
    clusters = [item for item in all_clusters if not cluster_id or item.get("id") == cluster_id]
    labels = existing_payload.get("labels") or {}
    if not clusters:
        raise RuntimeError(f"No reporting_views technology clusters for {path.relative_to(ROOT)}")

    company_map = {}
    for cluster in clusters:
        cluster_name = localized(cluster, lang, "name_zh", "name_en")
        evidence = [technology_evidence_sample(item) for item in (cluster.get("evidence_samples") or [])]
        company_examples = {item.get("company_id"): item for item in (cluster.get("company_examples") or [])}
        for company_id in cluster.get("company_ids") or []:
            example = company_examples.get(company_id, {})
            company = company_map.setdefault(company_id, {
                "id": company_id,
                "name": localized(example, lang, "company_name_zh", "company_name_en") or company_id,
                "rank": example.get("world500_rank") or "",
                "factCount": 0,
                "roles": [],
                "principles": [],
                "linkedItems": [],
                "evidenceByItem": {},
                "extraFields": [],
            })
            count = int(example.get("evidence_count") or 0)
            company["factCount"] += count
            if cluster_name not in company["linkedItems"]:
                company["linkedItems"].append(cluster_name)
            if cluster_name not in company["roles"]:
                company["roles"].append(cluster_name)
            snippet = clean(example.get("sample_snippet_zh") if lang == "zh" else example.get("sample_snippet_en"))
            if not snippet:
                snippet = clean(example.get("sample_snippet_en") or example.get("sample_snippet_zh"))
            company["evidenceByItem"][cluster_name] = [{
                "report": "",
                "page": "",
                "snippet": snippet,
                "confidence": "disclosure_signal",
                "review_status": "requires_project_level_validation",
            }] if snippet else evidence[:3]

    middle_nodes = []
    for cluster in clusters:
        cluster_name = localized(cluster, lang, "name_zh", "name_en")
        subtypes = cluster.get("subtypes") or []
        middle_nodes.append({
            "id": cluster_name,
            "name": cluster_name,
            "companyCount": cluster.get("company_count", 0),
            "factCount": cluster.get("evidence_count", 0),
            "roles": [localized({"name_en": value, "name_zh": value}, lang, "name_zh", "name_en") for value in (cluster.get("standards_zh" if lang == "zh" else "standards_en") or [])[:4]],
            "principles": [localized(item, lang, "label_zh", "label_en") for item in subtypes[:4]],
            "companyIds": cluster.get("company_ids") or [],
            "evidence": [technology_evidence_sample(item) for item in (cluster.get("evidence_samples") or [])],
        })

    title = "技术类型 -> 企业" if lang == "zh" else "Technology Types -> Companies"
    if cluster_id and len(middle_nodes) == 1:
        title = middle_nodes[0]["name"]
    company_count = len(company_map)
    fact_count = sum(int(cluster.get("evidence_count") or 0) for cluster in clusters)
    output = {
        **existing_payload,
        "labels": labels,
        "metricCards": [
            {"label": "企业节点" if lang == "zh" else "Company nodes", "value": company_count},
            {"label": "技术路径" if lang == "zh" else "Technology paths", "value": len(middle_nodes)},
            {"label": "披露信号" if lang == "zh" else "Disclosure signals", "value": fact_count},
        ],
        "system": {
            "key": "technology_clusters",
            "label": title,
            "color": "#2f6f63",
            "companyCount": company_count,
            "itemCount": len(middle_nodes),
            "factCount": fact_count,
        },
        "middleNodes": middle_nodes,
        "companies": sorted(company_map.values(), key=lambda item: int(item.get("rank") or 9999)),
        "source_dataset": "assets/data/world500/workbench/reporting_views.json",
        "evidence_boundary": "technology_clusters_are_disclosure_signals_project_evidence_is_separate",
    }
    return output


def extract_legacy_runtime():
    candidates = [
        ROOT / "zh" / "iso-system-full-graph.html",
        ROOT / "en" / "iso-system-full-graph.html",
        *sorted((ROOT / "zh").glob("*full-graph.html")),
        *sorted((ROOT / "en").glob("*full-graph.html")),
    ]
    for path in candidates:
        if path.name in SPECIAL_FULL_GRAPH_PAGES:
            continue
        text = path.read_text(encoding="utf-8")
        match = re.search(r"<script>\s*(\(function \(\) \{.*?\}\)\(\);)\s*</script>\s*</body>", text, re.S)
        if match and "patchTargetIsoEvidence" in match.group(1):
            return match.group(1)
    raise RuntimeError("Could not find an ISO-compatible legacy generic full-graph runtime to extract.")


def strict_runtime_from_legacy(legacy):
    runtime = legacy
    runtime = runtime.replace(
        "(function () {",
        "(function () {\n"
        f"    const EMBEDDED_PAYLOAD_VERSION = '{PAYLOAD_VERSION}';",
        1,
    )
    runtime = runtime.replace(
        "if (!dataNode || !svg || !viewport || !selectionCard || !resultsCard || !reportTableCard || !evidenceSummaryCard || !searchInput || !clearButton || !resetButton || !fitButton) return;",
        "if (!dataNode || !svg || !viewport || !selectionCard || !resultsCard || !reportTableCard || !evidenceSummaryCard || !searchInput || !clearButton || !resetButton || !fitButton) {\n"
        "      throw new Error('Missing required generic full-graph DOM target.');\n"
        "    }",
    )
    runtime = runtime.replace(
        """let data;
    try {
      data = JSON.parse(dataNode.textContent || '{}');
    } catch (error) {
      console.error('Failed to parse generic full-graph payload.', error);
      return;
    }

    const labels = data.labels || {};
    patchTargetIsoEvidence(data);
    const middleNodes = Array.isArray(data.middleNodes) ? data.middleNodes.slice() : [];
    const companies = Array.isArray(data.companies) ? data.companies.slice() : [];
    const system = data.system || {};""",
        """const rawPayload = String(dataNode.textContent || '').trim();
    if (!rawPayload) {
      throw new Error('Embedded generic full-graph JSON is empty.');
    }
    const data = JSON.parse(rawPayload);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Embedded generic full-graph payload must be an object.');
    }
    if (data.version !== EMBEDDED_PAYLOAD_VERSION) {
      throw new Error(`Unexpected generic full-graph payload version: ${data.version || 'missing'}`);
    }

    const labels = requireObject(data.labels, 'labels');
    patchTargetIsoEvidence(data);
    const middleNodes = requireArray(data.middleNodes, 'middleNodes').slice();
    const companies = requireArray(data.companies, 'companies').slice();
    const system = requireObject(data.system, 'system');
    if (!middleNodes.length || !system.key) {
      renderUnavailableGraph();
      return;
    }""",
    )
    marker = """function formatRank(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric > 0 ? `#${numeric}` : '-';
    }
"""
    helpers = marker + """
    function requireObject(value, label) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Missing embedded generic full-graph object: ${label}`);
      }
      return value;
    }

    function requireArray(value, label) {
      if (!Array.isArray(value)) {
        throw new Error(`Missing embedded generic full-graph array: ${label}`);
      }
      return value;
    }

    function renderUnavailableGraph() {
      const title = labels.selection_title || 'Graph data unavailable';
      const message = labels.selection_default || 'This full-screen graph has no accepted nodes in the embedded payload.';
      const body = `
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="cluster-evidence-notice">${escapeHtml('Embedded JSON loaded successfully, but no drawable graph nodes are available for this view.')}</div>
      `;
      selectionCard.innerHTML = body;
      resultsCard.innerHTML = body;
      reportTableCard.innerHTML = body;
      evidenceSummaryCard.innerHTML = body;
      svg.setAttribute('viewBox', '0 0 1200 420');
      svg.innerHTML = `<text x="600" y="210" text-anchor="middle" class="graph-block-title">${escapeHtml(title)}</text>`;
    }
"""
    if marker not in runtime:
        raise RuntimeError("Could not locate formatRank marker while strictifying legacy runtime.")
    runtime = runtime.replace(marker, helpers, 1)
    return runtime


def write_runtime():
    if RUNTIME_FILE.exists():
        runtime = RUNTIME_FILE.read_text(encoding="utf-8")
        if PAYLOAD_VERSION in runtime and "textContent || '{}'" not in runtime and "renderUnavailableGraph" in runtime:
            return
    runtime = strict_runtime_from_legacy(extract_legacy_runtime())
    RUNTIME_FILE.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_FILE.write_text(runtime + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {RUNTIME_FILE.relative_to(ROOT)}")


def full_graph_pages():
    pages = []
    for lang_dir in (ROOT / "zh", ROOT / "en"):
        pages.extend(path for path in sorted(lang_dir.glob("*full-graph.html")) if path.name not in SPECIAL_FULL_GRAPH_PAGES)
    return pages


def rewrite_page(path):
    text = path.read_text(encoding="utf-8")
    json_match = re.search(
        r'(<script type="application/json" id="world500-generic-full-graph-data">)(.*?)(</script>)',
        text,
        re.S,
    )
    if not json_match:
        raise RuntimeError(f"Missing generic full-graph JSON payload: {path.relative_to(ROOT)}")
    payload = json.loads(json_match.group(2))
    if path.name == "technology-cluster-full-graph.html" or path.name in TECHNOLOGY_PAGE_CLUSTER_IDS:
        payload = technology_payload_from_reporting(payload, path)
    payload["version"] = PAYLOAD_VERSION
    payload["source"] = "inline:world500-generic-full-graph-data"
    payload["embed_policy"] = {
        "runtime": "inline_json_no_fetch",
        "renderer": "assets/js/generic_full_graph.js",
        "missing_required_data": "fail_fast_inline_json_only",
        "empty_graph": "visible_empty_state",
    }
    payload["source_sha256"] = graph_content_hash(payload)
    payload["payload_sha256"] = payload_hash({k: v for k, v in payload.items() if k != "payload_sha256"})
    replacement_json = f'{json_match.group(1)}{json_script_payload(payload)}{json_match.group(3)}'
    text = text[:json_match.start()] + replacement_json + text[json_match.end():]
    text = re.sub(
        r"\s*<script>\s*\(function \(\) \{.*?\}\)\(\);\s*</script>\s*</body>",
        '\n          <script src="../assets/js/generic_full_graph.js"></script>\n        </body>',
        text,
        flags=re.S,
    )
    if "generic_full_graph.js" not in text:
        raise RuntimeError(f"Failed to attach shared generic runtime: {path.relative_to(ROOT)}")
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"Wrote {path.relative_to(ROOT)}")


def main():
    write_runtime()
    pages = full_graph_pages()
    if not pages:
        raise RuntimeError("No generic full-graph pages found.")
    for path in pages:
        rewrite_page(path)


if __name__ == "__main__":
    main()
