(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const STANDARD_COLORS = [
    "#2f6f63",
    "#c76b2d",
    "#315f8c",
    "#9b3b2f",
    "#6f5b2f",
    "#7a4f82",
    "#2f6f8f",
    "#8a6d1d",
    "#4f6f2f",
    "#8b4b2f",
    "#3f5678",
    "#7a3f52",
  ];
  const INDUSTRY_FALLBACK = "#6b7c85";

  function $(id) {
    return document.getElementById(id);
  }

  function createSvgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    return node;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatInt(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value ?? "");
  }

  function safeJson(node) {
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || "{}");
    } catch (error) {
      console.error("Failed to parse graph payload.", error);
      return null;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
    return response.json();
  }

  function assetBase() {
    const path = window.location.pathname || "";
    return path.includes("/zh/") || path.includes("/en/")
      ? "../assets/data/world500/workbench"
      : "./assets/data/world500/workbench";
  }

  function scriptBase() {
    const path = window.location.pathname || "";
    return path.includes("/zh/") || path.includes("/en/") ? "../assets/js" : "./assets/js";
  }

  function lang() {
    return document.documentElement.lang === "zh" ? "zh" : "en";
  }

  function text(en, zh) {
    return lang() === "zh" ? zh : en;
  }

  function splitLabel(value, maxChars) {
    const textValue = String(value || "").trim();
    if (!textValue) return [""];
    if (/[\u4e00-\u9fff]/.test(textValue) || !textValue.includes(" ")) {
      const lines = [];
      for (let cursor = 0; cursor < textValue.length; cursor += maxChars) {
        lines.push(textValue.slice(cursor, cursor + maxChars));
      }
      return lines.slice(0, 4);
    }
    const words = textValue.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= maxChars) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 4);
  }

  function appendTextLines(group, lines, x, y, className, lineHeight) {
    lines.forEach((line, index) => {
      const textNode = createSvgEl("text", {
        x,
        y: y + index * lineHeight,
        class: className,
        "text-anchor": "middle",
      });
      textNode.textContent = line;
      group.appendChild(textNode);
    });
  }

  function colorWithAlpha(color, alpha) {
    const normalized = String(color || "").trim();
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return `rgba(107,124,133,${alpha})`;
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function cloneById(id) {
    const node = $(id);
    if (!node) return null;
    const isSvg = node.tagName && node.tagName.toLowerCase() === "svg";
    const clone = node.cloneNode(!isSvg);
    if (isSvg) {
      clone.innerHTML = "";
    }
    node.replaceWith(clone);
    return clone;
  }

  function removeOldListeners(ids) {
    return {
      svg: cloneById(ids.svg),
      search: cloneById(ids.search),
      clear: cloneById(ids.clear),
      reset: cloneById(ids.reset),
      fit: cloneById(ids.fit),
      selection: $(ids.selection),
      results: $(ids.results),
      reportTable: ids.reportTable ? $(ids.reportTable) : null,
      evidenceSummary: ids.evidenceSummary ? $(ids.evidenceSummary) : null,
    };
  }

  function workbenchUrl(companyId) {
    const target = String(companyId || "").trim();
    return target ? `./company-accounting-workbench.html?company=${encodeURIComponent(target)}` : "";
  }

  function evidenceHtml(evidence, limit) {
    const rows = Array.isArray(evidence) ? evidence.filter(Boolean).slice(0, limit || 4) : [];
    if (!rows.length) return `<p>${escapeHtml(text("No linked evidence is available for this node.", "当前节点暂无可展示证据。"))}</p>`;
    return rows.map((item) => {
      const snippet = item.snippet_zh || item.snippet_en || item.snippet || "";
      return `
        <article class="cluster-evidence-card">
          <strong>${escapeHtml(item.report || item.source_file || "-")}</strong>
          <span>${escapeHtml(text("Page", "页码"))}: ${escapeHtml(item.page || "-")}</span>
          <p>${escapeHtml(snippet)}</p>
        </article>
      `;
    }).join("");
  }

  function updateHeroMetrics(mode, payload, graphData) {
    const hero = document.querySelector(".hero");
    const paragraphs = hero ? hero.querySelectorAll("p") : [];
    const metrics = document.querySelectorAll(".hero .metric-grid .metric");
    if (mode === "ghg" && paragraphs.length >= 2) {
      paragraphs[0].textContent = text(
        "This page now splits GHG Protocol into specific standards, guidance documents, sector guidance, project protocols, and review-required generic references instead of showing one large undifferentiated GHG class.",
        "该页已将 GHG Protocol 拆分为具体标准、指南、行业指南、项目协议和待复核泛化引用，不再显示为单一的大类 GHG Protocol。"
      );
      paragraphs[1].textContent = text(
        "Companies are clustered under the matched GHG series; company dot color shows industry, and generic GHG references remain review-required until the source names a specific series.",
        "企业按命中的 GHG 细分系列聚类；企业点颜色表示行业，泛化 GHG 引用在原文未写明具体系列前保持待复核。"
      );
    } else if (mode === "standard" && paragraphs.length >= 2) {
      paragraphs[0].textContent = text(
        "This full-screen graph now clusters companies by their specific standard or guidance node; GHG Protocol is expanded into its underlying series rather than kept as one coarse node.",
        "该全屏图谱已按具体标准/指南节点对企业分组聚类；GHG Protocol 已展开到底层系列，不再保留为一个粗粒度节点。"
      );
      paragraphs[1].textContent = text(
        "Cluster backgrounds indicate the standard family, while company dot color indicates the company industry classification.",
        "聚类背景色表示标准归属，企业点颜色表示企业行业分类。"
      );
    }
    if (!metrics.length) return;
    if (mode === "ghg") {
      const summary = payload.summary || {};
      const generic = graphData.standardNodes.find((node) => node.id === "ghg_generic_reference");
      const values = [
        [text("GHG companies", "GHG 企业"), summary.ghg_protocol_company_count || graphData.companyNodes.length],
        [text("Fine classes", "GHG 细分类"), graphData.standardNodes.length],
        [text("Explicit series", "明确命中细分类"), summary.ghg_explicit_series_company_count || 0],
        [text("Generic review", "泛化引用待复核"), generic ? generic.companyIds.length : 0],
      ];
      metrics.forEach((metric, index) => {
        if (!values[index]) return;
        const title = metric.querySelector("h3");
        const strong = metric.querySelector("strong");
        if (title) title.textContent = values[index][0];
        if (strong) strong.textContent = formatInt(values[index][1]);
      });
    } else {
      const values = [
        [text("Company nodes", "企业节点"), graphData.companyNodes.length],
        [text("Specific standards", "具体标准/指南"), graphData.standardNodes.length],
        [text("Standard links", "标准-企业关系"), graphData.linkCount],
        [text("GHG fine classes", "GHG 细分类"), graphData.ghgFineCount],
      ];
      metrics.forEach((metric, index) => {
        if (!values[index]) return;
        const title = metric.querySelector("h3");
        const strong = metric.querySelector("strong");
        if (title) title.textContent = values[index][0];
        if (strong) strong.textContent = formatInt(values[index][1]);
      });
    }
  }

  function makeGhgNodes(reporting) {
    const seriesSummary = new Map((reporting.ghg_standard_series?.series_summary || []).map((item) => [item.series_id, item]));
    const definitions = reporting.ghg_standard_series?.definitions || [];
    const nodes = definitions.map((definition, index) => {
      const summary = seriesSummary.get(definition.id) || {};
      return {
        id: definition.id,
        name: lang() === "zh" ? definition.name_zh : definition.name_en,
        shortName: shortGhgName(definition, lang()),
        category: lang() === "zh" ? definition.category_zh : definition.category_en,
        role: lang() === "zh" ? definition.role_zh : definition.role_en,
        principle: lang() === "zh" ? definition.principle_zh : definition.principle_en,
        policy: lang() === "zh" ? definition.language_policy_zh : definition.language_policy_en,
        companyIds: [],
        evidence: [],
        color: STANDARD_COLORS[index % STANDARD_COLORS.length],
        isGhgFineClass: true,
        sortScore: Number(summary.company_count || 0),
      };
    });
    nodes.push({
      id: "ghg_generic_reference",
      name: text("GHG Protocol generic reference", "GHG Protocol 泛化引用"),
      shortName: text("Generic GHG reference", "泛化引用"),
      category: text("Review required", "待复核"),
      role: text("Generic mention, not yet mapped to a specific GHG Protocol standard or guidance", "仅泛化提及，尚未映射到具体 GHG Protocol 标准或指南"),
      principle: text("Keep as review-required until the source names a specific series.", "在原文未写明具体系列前保留为待复核。"),
      policy: text("Do not treat generic GHG mentions as direct evidence for Scope-category accounting standards.", "不要把泛化 GHG 引用直接等同于 Scope 类别核算标准。"),
      companyIds: [],
      evidence: [],
      color: "#6b7c85",
      isGhgFineClass: true,
      isGenericGhg: true,
      sortScore: 0,
    });
    return nodes;
  }

  function shortGhgName(definition, currentLang) {
    const id = definition.id;
    const zh = {
      ghg_corporate_standard: "企业核算与报告标准",
      ghg_scope3_standard: "价值链 Scope 3 标准",
      ghg_land_sector_removals_standard: "土地部门与碳移除标准",
      ghg_product_standard: "产品生命周期标准",
      ghg_cities_gpc: "城市/社区清单协议 GPC",
      ghg_scope2_guidance: "Scope 2 指南",
      ghg_scope3_calculation_guidance: "Scope 3 计算指南",
      ghg_agriculture_guidance: "农业指南",
      ghg_project_protocol: "项目核算协议",
      ghg_policy_action_standard: "政策与行动标准",
      ghg_mitigation_goal_standard: "减缓目标标准",
      ghg_market_instrument_guidance: "市场工具指南",
      ghg_financial_sector_guidance: "金融部门指南",
      ghg_oil_gas_guidance: "油气行业指南",
      ghg_ict_sector_guidance: "ICT 行业指南",
      ghg_bioenergy_guidance: "生物能源指南",
      ghg_lulucf_guidance: "LULUCF 指南",
      ghg_uncategorized_guidance: "未细分指南引用",
    };
    const en = {
      ghg_corporate_standard: "Corporate Standard",
      ghg_scope3_standard: "Scope 3 Standard",
      ghg_land_sector_removals_standard: "Land Sector & Removals",
      ghg_product_standard: "Product Life Cycle Standard",
      ghg_cities_gpc: "GPC Cities Protocol",
      ghg_scope2_guidance: "Scope 2 Guidance",
      ghg_scope3_calculation_guidance: "Scope 3 Calculation Guidance",
      ghg_agriculture_guidance: "Agriculture Guidance",
      ghg_project_protocol: "Project Protocol",
      ghg_policy_action_standard: "Policy & Action Standard",
      ghg_mitigation_goal_standard: "Mitigation Goal Standard",
      ghg_market_instrument_guidance: "Market Instrument Guidance",
      ghg_financial_sector_guidance: "Financial Sector Guidance",
      ghg_oil_gas_guidance: "Oil & Gas Guidance",
      ghg_ict_sector_guidance: "ICT Sector Guidance",
      ghg_bioenergy_guidance: "Bioenergy Guidance",
      ghg_lulucf_guidance: "LULUCF Guidance",
      ghg_uncategorized_guidance: "Uncategorized Guidance",
    };
    return (currentLang === "zh" ? zh[id] : en[id]) || (currentLang === "zh" ? definition.name_zh : definition.name_en);
  }

  function buildGhgGraph(oldPayload, reporting) {
    const standardNodes = makeGhgNodes(reporting);
    const standardById = new Map(standardNodes.map((node) => [node.id, node]));
    const oldCompanies = new Map((oldPayload.companies || []).map((company) => [company.id, company]));
    const mappingRows = reporting.ghg_standard_series?.company_mappings || [];
    const companyMap = new Map();

    mappingRows.forEach((row) => {
      const oldCompany = oldCompanies.get(row.company_id) || {};
      const series = Array.isArray(row.series) && row.series.length ? row.series : [];
      const linkedIds = [];
      const evidenceByItem = {};
      series.forEach((item) => {
        const node = standardById.get(item.series_id);
        if (!node) return;
        linkedIds.push(item.series_id);
        const samples = Array.isArray(item.evidence_samples) ? item.evidence_samples : [];
        evidenceByItem[item.series_id] = samples;
        node.evidence.push(...samples.slice(0, 3));
      });
      if (!linkedIds.length) linkedIds.push("ghg_generic_reference");
      const company = {
        id: row.company_id,
        name: lang() === "zh" ? (row.company_name_zh || oldCompany.name) : (row.company_name_en || oldCompany.name),
        rank: row.world500_rank || oldCompany.rank,
        industry: lang() === "zh" ? row.industry_section_zh : row.industry_section_en,
        industryLabel: row.industry_label_zh || row.industry_section_en || "",
        industryColor: row.industry_color || INDUSTRY_FALLBACK,
        linkedItems: Array.from(new Set(linkedIds)),
        evidenceByItem,
        evidence: oldCompany.evidence || [],
        roles: oldCompany.roles || [],
        principles: oldCompany.principles || [],
        explicitSeriesCount: row.explicit_series_count || 0,
        genericReferenceCount: row.generic_reference_count || 0,
      };
      companyMap.set(company.id, company);
    });

    (oldPayload.companies || []).forEach((oldCompany) => {
      if (companyMap.has(oldCompany.id)) return;
      companyMap.set(oldCompany.id, {
        ...oldCompany,
        linkedItems: ["ghg_generic_reference"],
        evidenceByItem: { ghg_generic_reference: oldCompany.evidence || [] },
        industryColor: INDUSTRY_FALLBACK,
      });
    });

    const companyNodes = Array.from(companyMap.values()).sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
    companyNodes.forEach((company) => {
      company.linkedItems.forEach((id) => {
        const node = standardById.get(id);
        if (!node) return;
        if (!node.companyIds.includes(company.id)) node.companyIds.push(company.id);
      });
    });
    standardNodes.forEach((node) => {
      node.companyCount = node.companyIds.length;
      node.factCount = Math.max(node.companyIds.length, node.evidence.length);
      if (node.isGenericGhg) node.sortScore = node.companyCount;
    });

    const visibleStandards = standardNodes
      .filter((node) => node.companyCount > 0 || !node.isGenericGhg)
      .sort((a, b) => {
        if (a.isGenericGhg) return 1;
        if (b.isGenericGhg) return -1;
        return Number(b.sortScore || 0) - Number(a.sortScore || 0);
      });

    return {
      mode: "ghg",
      system: {
        id: "ghg_protocol",
        name: text("GHG Protocol system", "GHG Protocol 体系"),
        color: "#2f6f63",
      },
      standardNodes: visibleStandards,
      companyNodes,
      linkCount: companyNodes.reduce((total, company) => total + company.linkedItems.length, 0),
      ghgFineCount: visibleStandards.filter((node) => node.isGhgFineClass && !node.isGenericGhg).length,
    };
  }

  function buildStandardRoleGraph(oldPayload, reporting) {
    const ghgNodes = makeGhgNodes(reporting);
    const ghgById = new Map(ghgNodes.map((node) => [node.id, node]));
    const ghgMappings = new Map((reporting.ghg_standard_series?.company_mappings || []).map((row) => [row.company_id, row]));
    const oldGhgNames = new Set(["温室气体核算体系（GHG Protocol）", "Greenhouse Gas Protocol (GHG Protocol)", "GHG Protocol"]);
    const oldMiddleNodes = (oldPayload.middleNodes || []).filter((node) => !oldGhgNames.has(node.id) && !String(node.name || "").includes("GHG Protocol") && !String(node.name || "").includes("温室气体核算体系"));
    const standardNodes = oldMiddleNodes.map((node, index) => ({
      id: node.id,
      name: node.name,
      shortName: node.name,
      category: Array.isArray(node.roles) ? node.roles.join(" | ") : "",
      role: Array.isArray(node.roles) ? node.roles.join(" | ") : "",
      principle: Array.isArray(node.principles) ? node.principles.join(" | ") : "",
      companyIds: Array.isArray(node.companyIds) ? node.companyIds.slice() : [],
      evidence: Array.isArray(node.evidence) ? node.evidence.slice(0, 6) : [],
      color: STANDARD_COLORS[index % STANDARD_COLORS.length],
      sortScore: Number(node.companyCount || 0),
    }));
    const baseIndex = standardNodes.length;
    ghgNodes.forEach((node, index) => {
      node.color = STANDARD_COLORS[(baseIndex + index) % STANDARD_COLORS.length];
      standardNodes.push(node);
    });
    const standardById = new Map(standardNodes.map((node) => [node.id, node]));

    const companyMap = new Map();
    (oldPayload.companies || []).forEach((company) => {
      const oldLinks = Array.isArray(company.linkedItems) ? company.linkedItems : [];
      const nonGhgLinks = oldLinks.filter((id) => !oldGhgNames.has(id) && !String(id).includes("GHG Protocol") && !String(id).includes("温室气体核算体系"));
      const evidenceByItem = { ...(company.evidenceByItem || {}) };
      const ghgRow = ghgMappings.get(company.id);
      const ghgLinks = [];
      if (ghgRow && Array.isArray(ghgRow.series)) {
        ghgRow.series.forEach((item) => {
          if (!ghgById.has(item.series_id)) return;
          ghgLinks.push(item.series_id);
          evidenceByItem[item.series_id] = Array.isArray(item.evidence_samples) ? item.evidence_samples : [];
        });
      }
      if (!ghgLinks.length && oldLinks.some((id) => oldGhgNames.has(id) || String(id).includes("GHG Protocol") || String(id).includes("温室气体核算体系"))) {
        ghgLinks.push("ghg_generic_reference");
      }
      companyMap.set(company.id, {
        ...company,
        name: company.name || company.company_name_en || company.company_name_zh,
        linkedItems: Array.from(new Set([...nonGhgLinks, ...ghgLinks])).filter((id) => standardById.has(id)),
        evidenceByItem,
        industry: ghgRow ? (lang() === "zh" ? ghgRow.industry_section_zh : ghgRow.industry_section_en) : "",
        industryLabel: ghgRow?.industry_label_zh || "",
        industryColor: ghgRow?.industry_color || INDUSTRY_FALLBACK,
      });
    });

    (reporting.ghg_standard_series?.company_mappings || []).forEach((row) => {
      if (companyMap.has(row.company_id)) return;
      const links = (row.series || []).map((item) => item.series_id).filter((id) => standardById.has(id));
      const evidenceByItem = {};
      (row.series || []).forEach((item) => {
        evidenceByItem[item.series_id] = Array.isArray(item.evidence_samples) ? item.evidence_samples : [];
      });
      companyMap.set(row.company_id, {
        id: row.company_id,
        name: lang() === "zh" ? row.company_name_zh : row.company_name_en,
        rank: row.world500_rank,
        linkedItems: links.length ? links : ["ghg_generic_reference"],
        evidenceByItem,
        industry: lang() === "zh" ? row.industry_section_zh : row.industry_section_en,
        industryLabel: row.industry_label_zh,
        industryColor: row.industry_color || INDUSTRY_FALLBACK,
      });
    });

    standardNodes.forEach((node) => {
      node.companyIds = [];
      node.evidence = Array.isArray(node.evidence) ? node.evidence : [];
    });
    const companyNodes = Array.from(companyMap.values())
      .filter((company) => company.linkedItems.length)
      .sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
    companyNodes.forEach((company) => {
      company.linkedItems.forEach((id) => {
        const node = standardById.get(id);
        if (!node) return;
        if (!node.companyIds.includes(company.id)) node.companyIds.push(company.id);
        const evidence = company.evidenceByItem?.[id] || [];
        if (node.evidence.length < 8) node.evidence.push(...evidence.slice(0, 2));
      });
    });
    const visibleStandards = standardNodes
      .filter((node) => node.companyIds.length || node.isGhgFineClass)
      .sort((a, b) => Number(b.companyIds.length || 0) - Number(a.companyIds.length || 0));

    return {
      mode: "standard",
      system: {
        id: "standard_role",
        name: text("Standard role family", "标准（Standard）角色族"),
        color: "#c76b2d",
      },
      standardNodes: visibleStandards,
      companyNodes,
      linkCount: companyNodes.reduce((total, company) => total + company.linkedItems.length, 0),
      ghgFineCount: visibleStandards.filter((node) => node.isGhgFineClass && !node.isGenericGhg).length,
    };
  }

  function layoutGraph(graph) {
    const width = graph.mode === "ghg" ? 6200 : 7000;
    const height = graph.mode === "ghg" ? 5200 : 5400;
    const system = { ...graph.system, x: 430, y: height / 2 };
    const standards = graph.standardNodes;
    const companies = graph.companyNodes;

    const standardColumns = graph.mode === "ghg" ? 3 : 4;
    const standardX0 = graph.mode === "ghg" ? 1180 : 1120;
    const standardY0 = 520;
    const standardGapX = 470;
    const standardGapY = graph.mode === "ghg" ? 260 : 230;
    standards.forEach((node, index) => {
      const col = index % standardColumns;
      const row = Math.floor(index / standardColumns);
      node.x = standardX0 + col * standardGapX;
      node.y = standardY0 + row * standardGapY;
      node.clusterCompanies = [];
    });

    const standardById = new Map(standards.map((node) => [node.id, node]));
    const primaryByCompany = new Map();
    companies.forEach((company) => {
      const links = (company.linkedItems || []).filter((id) => standardById.has(id));
      const explicit = links.filter((id) => id !== "ghg_generic_reference");
      const explicitGhg = explicit.filter((id) => standardById.get(id)?.isGhgFineClass);
      const selected = graph.mode === "ghg"
        ? (explicit[0] || links[0])
        : (explicitGhg[0] || links.find((id) => !standardById.get(id)?.isGhgFineClass) || explicit[0] || links[0]);
      const primary = standardById.get(selected) || standards[0];
      if (!primary) return;
      primary.clusterCompanies.push(company);
      primaryByCompany.set(company.id, primary.id);
    });

    const clusterNodes = standards
      .filter((node) => node.clusterCompanies.length)
      .sort((a, b) => b.clusterCompanies.length - a.clusterCompanies.length);
    const clusterAreaX = graph.mode === "ghg" ? 2750 : 2850;
    const clusterAreaY = 380;
    const clusterCols = graph.mode === "ghg" ? 3 : 4;
    const clusterW = graph.mode === "ghg" ? 980 : 900;
    const clusterH = graph.mode === "ghg" ? 540 : 500;
    const clusterGapX = graph.mode === "ghg" ? 140 : 120;
    const clusterGapY = 130;

    clusterNodes.forEach((node, index) => {
      const col = index % clusterCols;
      const row = Math.floor(index / clusterCols);
      const x = clusterAreaX + col * (clusterW + clusterGapX);
      const y = clusterAreaY + row * (clusterH + clusterGapY);
      node.cluster = { x, y, width: clusterW, height: clusterH };
      const items = node.clusterCompanies.sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
      const cols = Math.max(4, Math.min(12, Math.ceil(Math.sqrt(items.length * 1.6))));
      const spacingX = clusterW / (cols + 1);
      const rows = Math.max(1, Math.ceil(items.length / cols));
      const spacingY = Math.min(56, (clusterH - 130) / Math.max(1, rows));
      items.forEach((company, companyIndex) => {
        const companyCol = companyIndex % cols;
        const companyRow = Math.floor(companyIndex / cols);
        company.x = x + spacingX * (companyCol + 1);
        company.y = y + 122 + spacingY * companyRow;
        company.primaryStandardId = node.id;
      });
    });

    graph.layout = { width, height, system, standards, companies, primaryByCompany, clusterNodes };
    return graph;
  }

  function renderClusteredGraph(ids, graph, reporting) {
    const refs = removeOldListeners(ids);
    if (!refs.svg || !refs.search || !refs.clear || !refs.reset || !refs.fit || !refs.selection || !refs.results) return;
    updateHeroMetrics(graph.mode, reporting, graph);
    layoutGraph(graph);

    const svg = refs.svg;
    const viewport = createSvgEl("g", { class: "cluster-full-graph-viewport" });
    const layers = {
      bg: createSvgEl("g", { class: "cluster-bg-layer" }),
      edges: createSvgEl("g", { class: "cluster-edge-layer" }),
      nodes: createSvgEl("g", { class: "cluster-node-layer" }),
      labels: createSvgEl("g", { class: "cluster-label-layer" }),
    };
    viewport.append(layers.bg, layers.edges, layers.nodes, layers.labels);
    svg.appendChild(viewport);
    svg.setAttribute("viewBox", `0 0 ${graph.layout.width} ${graph.layout.height}`);

    const state = {
      query: "",
      selectedKind: "system",
      selectedId: graph.system.id,
      scale: graph.mode === "ghg" ? 0.9 : 0.82,
      tx: 0,
      ty: 0,
      panning: false,
      panPointerId: null,
      panOrigin: null,
    };
    const standardById = new Map(graph.layout.standards.map((node) => [node.id, node]));
    const companyById = new Map(graph.layout.companies.map((node) => [node.id, node]));
    const standardElements = new Map();
    const companyElements = new Map();
    const edgeElements = [];

    graph.layout.clusterNodes.forEach((node) => {
      const rect = createSvgEl("rect", {
        x: node.cluster.x,
        y: node.cluster.y,
        width: node.cluster.width,
        height: node.cluster.height,
        rx: 36,
        ry: 36,
        class: "cluster-standard-bg",
        fill: colorWithAlpha(node.color, 0.12),
        stroke: colorWithAlpha(node.color, 0.5),
      });
      layers.bg.appendChild(rect);
      const label = createSvgEl("text", {
        x: node.cluster.x + 28,
        y: node.cluster.y + 42,
        class: "cluster-standard-bg-title",
      });
      label.textContent = `${node.shortName || node.name} · ${formatInt(node.clusterCompanies.length)}`;
      layers.bg.appendChild(label);
      const meta = createSvgEl("text", {
        x: node.cluster.x + 28,
        y: node.cluster.y + 72,
        class: "cluster-standard-bg-meta",
      });
      meta.textContent = node.category || node.role || "";
      layers.bg.appendChild(meta);
    });

    const systemEdgeTargetX = graph.layout.standards.length ? Math.min(...graph.layout.standards.map((node) => node.x)) - 145 : 980;
    graph.layout.standards.forEach((node) => {
      const edge = createSvgEl("path", {
        d: `M ${graph.layout.system.x + 145} ${graph.layout.system.y} C ${systemEdgeTargetX - 160} ${graph.layout.system.y}, ${systemEdgeTargetX - 140} ${node.y}, ${node.x - 150} ${node.y}`,
        class: "cluster-graph-edge is-system-edge",
        stroke: node.color,
      });
      layers.edges.appendChild(edge);
      edgeElements.push({ edge, type: "system", standardId: node.id });
    });

    graph.layout.companies.forEach((company) => {
      (company.linkedItems || []).forEach((standardId) => {
        const standard = standardById.get(standardId);
        if (!standard || !company.x || !company.y) return;
        const edge = createSvgEl("path", {
          d: `M ${standard.x + 132} ${standard.y} C ${(standard.x + company.x) / 2} ${standard.y}, ${(standard.x + company.x) / 2} ${company.y}, ${company.x} ${company.y}`,
          class: "cluster-graph-edge is-company-edge",
          stroke: standard.color,
        });
        layers.edges.appendChild(edge);
        edgeElements.push({ edge, type: "company", standardId, companyId: company.id });
      });
    });

    const systemNode = createSvgEl("g", { class: "cluster-system-node", tabindex: "0", role: "button" });
    systemNode.appendChild(createSvgEl("rect", {
      x: graph.layout.system.x - 180,
      y: graph.layout.system.y - 82,
      width: 360,
      height: 164,
      rx: 20,
      ry: 20,
    }));
    appendTextLines(systemNode, splitLabel(graph.layout.system.name, 16), graph.layout.system.x, graph.layout.system.y - 18, "cluster-system-title", 28);
    appendTextLines(systemNode, [
      text(`${formatInt(graph.standardNodes.length)} standards/guides`, `${formatInt(graph.standardNodes.length)} 个标准/指南`),
      text(`${formatInt(graph.companyNodes.length)} companies`, `${formatInt(graph.companyNodes.length)} 家企业`),
    ], graph.layout.system.x, graph.layout.system.y + 44, "cluster-system-meta", 24);
    layers.nodes.appendChild(systemNode);
    systemNode.addEventListener("click", () => {
      state.selectedKind = "system";
      state.selectedId = graph.system.id;
      update();
    });

    graph.layout.standards.forEach((node) => {
      const group = createSvgEl("g", {
        class: `cluster-standard-node${node.isGhgFineClass ? " is-ghg-series" : ""}${node.isGenericGhg ? " is-review-node" : ""}`,
        tabindex: "0",
        role: "button",
        "data-standard-id": node.id,
      });
      group.appendChild(createSvgEl("rect", {
        x: node.x - 140,
        y: node.y - 56,
        width: 280,
        height: 112,
        rx: 18,
        ry: 18,
        fill: colorWithAlpha(node.color, 0.13),
        stroke: node.color,
      }));
      appendTextLines(group, splitLabel(node.shortName || node.name, 18), node.x, node.y - 18, "cluster-standard-title", 21);
      appendTextLines(group, [`${formatInt(node.companyIds.length)} ${text("companies", "企业")}`], node.x, node.y + 34, "cluster-standard-meta", 20);
      layers.nodes.appendChild(group);
      standardElements.set(node.id, { group, data: node });
      group.addEventListener("click", () => {
        state.selectedKind = "standard";
        state.selectedId = node.id;
        update();
      });
    });

    graph.layout.companies.forEach((company) => {
      if (!company.x || !company.y) return;
      const radius = company.rank && company.rank <= 50 ? 13 : company.rank && company.rank <= 150 ? 10 : 8;
      const group = createSvgEl("g", {
        class: "cluster-company-node",
        tabindex: "0",
        role: "button",
        "data-company-id": company.id,
      });
      group.appendChild(createSvgEl("circle", {
        cx: company.x,
        cy: company.y,
        r: radius + 4,
        fill: colorWithAlpha(company.industryColor || INDUSTRY_FALLBACK, 0.18),
        stroke: colorWithAlpha(company.industryColor || INDUSTRY_FALLBACK, 0.52),
        class: "cluster-company-halo",
      }));
      group.appendChild(createSvgEl("circle", {
        cx: company.x,
        cy: company.y,
        r: radius,
        fill: company.industryColor || INDUSTRY_FALLBACK,
        class: "cluster-company-dot",
      }));
      const label = createSvgEl("text", {
        x: company.x,
        y: company.y - radius - 9,
        class: "cluster-company-label",
        "text-anchor": "middle",
      });
      label.textContent = company.name || company.id;
      layers.labels.appendChild(label);
      layers.nodes.appendChild(group);
      companyElements.set(company.id, { group, label, data: company });
      group.addEventListener("click", () => {
        state.selectedKind = "company";
        state.selectedId = company.id;
        update();
        focusOn(company.x, company.y, 1.55);
      });
    });

    function selectedStandardId() {
      if (state.selectedKind === "standard") return state.selectedId;
      if (state.selectedKind === "company") {
        const company = companyById.get(state.selectedId);
        return company?.primaryStandardId || "";
      }
      return "";
    }

    function matchesQuery(company) {
      const query = state.query.trim().toLowerCase();
      if (!query) return true;
      const rank = company.rank === undefined || company.rank === null ? "" : String(company.rank);
      return String(company.name || "").toLowerCase().includes(query) || rank.includes(query);
    }

    function renderSelection() {
      if (state.selectedKind === "company") {
        const company = companyById.get(state.selectedId);
        if (!company) return;
        const linkedNames = (company.linkedItems || []).map((id) => standardById.get(id)?.shortName || standardById.get(id)?.name || id);
        const evidence = []
          .concat(...(company.linkedItems || []).map((id) => company.evidenceByItem?.[id] || []))
          .concat(company.evidence || []);
        refs.selection.innerHTML = `
          <h3>${escapeHtml(text("Company node", "企业节点"))}</h3>
          <dl class="graph-detail-list">
            <div><dt>${escapeHtml(text("Company", "企业"))}</dt><dd>${escapeHtml(company.name || company.id)}</dd></div>
            <div><dt>${escapeHtml(text("World500 rank", "世界500强排名"))}</dt><dd>${company.rank ? `#${escapeHtml(company.rank)}` : "-"}</dd></div>
            <div><dt>${escapeHtml(text("Industry background", "行业背景色"))}</dt><dd>${escapeHtml(company.industry || company.industryLabel || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Linked standards", "关联标准/指南"))}</dt><dd>${escapeHtml(linkedNames.join(" | ") || "-")}</dd></div>
          </dl>
          ${workbenchUrl(company.id) ? `<a class="btn alt" href="${escapeHtml(workbenchUrl(company.id))}">${escapeHtml(text("Open workbench", "打开企业工作台"))}</a>` : ""}
          <h4>${escapeHtml(text("Evidence back-links", "证据回链"))}</h4>
          ${evidenceHtml(evidence, 5)}
        `;
        return;
      }
      if (state.selectedKind === "standard") {
        const standard = standardById.get(state.selectedId);
        if (!standard) return;
        refs.selection.innerHTML = `
          <h3>${escapeHtml(standard.shortName || standard.name)}</h3>
          <dl class="graph-detail-list">
            <div><dt>${escapeHtml(text("Full name", "完整名称"))}</dt><dd>${escapeHtml(standard.name)}</dd></div>
            <div><dt>${escapeHtml(text("Category / role", "类别/角色"))}</dt><dd>${escapeHtml(standard.category || standard.role || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Principle", "原则/口径"))}</dt><dd>${escapeHtml(standard.principle || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Language policy", "口径提醒"))}</dt><dd>${escapeHtml(standard.policy || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Linked companies", "关联企业"))}</dt><dd>${formatInt(standard.companyIds.length)}</dd></div>
          </dl>
          <h4>${escapeHtml(text("Evidence back-links", "证据回链"))}</h4>
          ${evidenceHtml(standard.evidence, 4)}
        `;
        return;
      }
      refs.selection.innerHTML = `
        <h3>${escapeHtml(graph.system.name)}</h3>
        <dl class="graph-detail-list">
          <div><dt>${escapeHtml(text("Specific standard/guidance nodes", "具体标准/指南节点"))}</dt><dd>${formatInt(graph.standardNodes.length)}</dd></div>
          <div><dt>${escapeHtml(text("Company nodes", "企业节点"))}</dt><dd>${formatInt(graph.companyNodes.length)}</dd></div>
          <div><dt>${escapeHtml(text("Company-standard links", "企业-标准关系"))}</dt><dd>${formatInt(graph.linkCount)}</dd></div>
          <div><dt>${escapeHtml(text("Display rule", "展示规则"))}</dt><dd>${escapeHtml(text("Companies are positioned by their primary standard cluster; dot color is industry.", "企业按主要归属标准聚类，企业点颜色表示行业。"))}</dd></div>
        </dl>
      `;
    }

    function renderResults() {
      const selected = selectedStandardId();
      const rows = graph.layout.companies
        .filter((company) => matchesQuery(company))
        .filter((company) => !selected || (company.linkedItems || []).includes(selected))
        .slice(0, 18);
      const total = graph.layout.companies
        .filter((company) => matchesQuery(company))
        .filter((company) => !selected || (company.linkedItems || []).includes(selected)).length;
      refs.results.innerHTML = `
        <h3>${escapeHtml(text("Search / cluster results", "检索/聚类结果"))}</h3>
        <p>${escapeHtml(text(`${formatInt(total)} matching companies. Click a row to locate it.`, `当前 ${formatInt(total)} 家匹配企业，点击可定位。`))}</p>
        <div class="graph-result-list">
          ${rows.map((company) => `
            <button class="graph-result-item cluster-result-item" type="button" data-company-id="${escapeHtml(company.id)}">
              <strong>${escapeHtml(company.name || company.id)}</strong>
              <span>#${escapeHtml(company.rank || "-")} · ${escapeHtml(company.industry || company.industryLabel || "")}</span>
            </button>
          `).join("")}
        </div>
      `;
      refs.results.querySelectorAll("[data-company-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const company = companyById.get(button.getAttribute("data-company-id"));
          if (!company) return;
          state.selectedKind = "company";
          state.selectedId = company.id;
          update();
          focusOn(company.x, company.y, 1.55);
        });
      });
    }

    function renderReportTable() {
      if (!refs.reportTable) return;
      const topStandards = graph.standardNodes
        .filter((node) => node.companyIds.length)
        .slice(0, 16);
      refs.reportTable.innerHTML = `
        <div class="table-kicker">${escapeHtml(text("Cluster summary", "聚类摘要"))}</div>
        <h3>${escapeHtml(text("Companies Clustered by Specific Standards", "企业按具体标准/指南聚类"))}</h3>
        <p class="table-lead">${escapeHtml(text("GHG Protocol is expanded into standards, guidance, project protocols and review-required generic references.", "GHG Protocol 已展开为标准、指南、项目协议以及待复核泛化引用。"))}</p>
        <div class="table-wrap"><table>
          <tr><th>${escapeHtml(text("Standard / guidance", "标准/指南"))}</th><th>${escapeHtml(text("Category", "类别"))}</th><th>${escapeHtml(text("Companies", "企业数"))}</th></tr>
          ${topStandards.map((node) => `<tr><td>${escapeHtml(node.shortName || node.name)}</td><td>${escapeHtml(node.category || node.role || "")}</td><td>${formatInt(node.companyIds.length)}</td></tr>`).join("")}
        </table></div>
      `;
    }

    function renderEvidenceSummary() {
      if (!refs.evidenceSummary) return;
      const ghgNodes = graph.standardNodes.filter((node) => node.isGhgFineClass).slice(0, 12);
      refs.evidenceSummary.innerHTML = `
        <div class="table-kicker">${escapeHtml(text("GHG split", "GHG 细分"))}</div>
        <h3>${escapeHtml(text("GHG Protocol Series Now Split Like ISO", "GHG Protocol 已按 ISO 式细分"))}</h3>
        <p class="table-lead">${escapeHtml(text("Only explicit source-text series citations are mapped to a fine class; generic GHG mentions remain review-required.", "只有原文明确写出具体系列才归入细分类；泛化 GHG 提及仍保留为待复核。"))}</p>
        <div class="graph-chip-list">
          ${ghgNodes.map((node) => `<span class="graph-chip" style="border-color:${escapeHtml(node.color)};background:${escapeHtml(colorWithAlpha(node.color, 0.12))}">${escapeHtml(node.shortName || node.name)} · ${formatInt(node.companyIds.length)}</span>`).join("")}
        </div>
      `;
    }

    function update() {
      const selectedStandard = selectedStandardId();
      const matched = new Set(graph.layout.companies.filter(matchesQuery).map((company) => company.id));
      standardElements.forEach((entry, id) => {
        const isActive = state.selectedKind === "standard" && state.selectedId === id;
        const isLinked = state.selectedKind === "company" && (companyById.get(state.selectedId)?.linkedItems || []).includes(id);
        const dim = selectedStandard && selectedStandard !== id && !isLinked;
        entry.group.classList.toggle("is-active", isActive || isLinked);
        entry.group.classList.toggle("is-dimmed", Boolean(dim));
      });
      companyElements.forEach((entry, id) => {
        const company = entry.data;
        const isActive = state.selectedKind === "company" && state.selectedId === id;
        const linkedToSelected = !selectedStandard || (company.linkedItems || []).includes(selectedStandard);
        const isMatched = matched.has(id);
        const dim = !linkedToSelected || !isMatched;
        entry.group.classList.toggle("is-active", isActive);
        entry.group.classList.toggle("is-dimmed", dim);
        entry.group.classList.toggle("is-match", Boolean(state.query && isMatched));
        entry.label.classList.toggle("is-visible", isActive || (state.query && isMatched && matched.size <= 30));
      });
      edgeElements.forEach((entry) => {
        const companySelected = state.selectedKind === "company" && entry.companyId === state.selectedId;
        const standardSelected = state.selectedKind === "standard" && entry.standardId === state.selectedId;
        const linkedToSelectedCompany = state.selectedKind === "company" && (companyById.get(state.selectedId)?.linkedItems || []).includes(entry.standardId);
        const companyMatches = !entry.companyId || matched.has(entry.companyId);
        const standardMatches = !selectedStandard || entry.standardId === selectedStandard || linkedToSelectedCompany;
        entry.edge.classList.toggle("is-active", companySelected || standardSelected || linkedToSelectedCompany);
        entry.edge.classList.toggle("is-dimmed", !(companyMatches && standardMatches));
      });
      systemNode.classList.toggle("is-active", state.selectedKind === "system");
      renderSelection();
      renderResults();
      renderReportTable();
      renderEvidenceSummary();
    }

    function applyTransform() {
      viewport.setAttribute("transform", `translate(${state.tx} ${state.ty}) scale(${state.scale})`);
    }

    function resetView() {
      state.scale = graph.mode === "ghg" ? 0.9 : 0.82;
      state.tx = 0;
      state.ty = 0;
      applyTransform();
    }

    function focusOn(x, y, scale) {
      const box = svg.getBoundingClientRect();
      const viewW = graph.layout.width;
      const viewH = graph.layout.height;
      const targetScale = scale || 1.35;
      state.scale = targetScale;
      state.tx = viewW / 2 - x * targetScale;
      state.ty = viewH / 2 - y * targetScale;
      if (box.width && box.height) {
        state.tx += (viewW - box.width) * 0.02;
        state.ty += (viewH - box.height) * 0.02;
      }
      applyTransform();
    }

    refs.search.addEventListener("input", () => {
      state.query = refs.search.value || "";
      update();
    });
    refs.clear.addEventListener("click", () => {
      refs.search.value = "";
      state.query = "";
      state.selectedKind = "system";
      state.selectedId = graph.system.id;
      update();
    });
    refs.reset.addEventListener("click", resetView);
    refs.fit.addEventListener("click", resetView);
    svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      state.scale = Math.max(0.35, Math.min(2.4, state.scale * factor));
      applyTransform();
    }, { passive: false });
    svg.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".cluster-company-node,.cluster-standard-node,.cluster-system-node")) return;
      state.panning = true;
      state.panPointerId = event.pointerId;
      state.panOrigin = { x: event.clientX, y: event.clientY, tx: state.tx, ty: state.ty };
      svg.setPointerCapture?.(event.pointerId);
      svg.classList.add("is-panning");
    });
    svg.addEventListener("pointermove", (event) => {
      if (!state.panning || !state.panOrigin) return;
      state.tx = state.panOrigin.tx + (event.clientX - state.panOrigin.x);
      state.ty = state.panOrigin.ty + (event.clientY - state.panOrigin.y);
      applyTransform();
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
      svg.addEventListener(eventName, () => {
        state.panning = false;
        state.panPointerId = null;
        state.panOrigin = null;
        svg.classList.remove("is-panning");
      });
    });

    resetView();
    update();
  }

  async function initGhgPage() {
    const dataNode = $("world500-ghg-full-graph-data");
    if (!dataNode || !$("ghg-full-graph-svg")) return;
    const oldPayload = safeJson(dataNode);
    if (!oldPayload) return;
    const reporting = await fetchJson(`${assetBase()}/reporting_views.json`);
    const graph = buildGhgGraph(oldPayload, reporting);
    renderClusteredGraph({
      svg: "ghg-full-graph-svg",
      search: "ghg-full-graph-search",
      clear: "ghg-full-graph-clear",
      reset: "ghg-full-graph-reset",
      fit: "ghg-full-graph-fit",
      selection: "ghg-full-graph-selection",
      results: "ghg-full-graph-results",
    }, graph, reporting);
  }

  async function initStandardRolePage() {
    const dataNode = $("world500-generic-full-graph-data");
    if (!dataNode || !$("generic-full-graph-svg")) return;
    const oldPayload = safeJson(dataNode);
    if (!oldPayload || oldPayload.system?.key !== "standard") return;
    const reporting = await fetchJson(`${assetBase()}/reporting_views.json`);
    const graph = buildStandardRoleGraph(oldPayload, reporting);
    renderClusteredGraph({
      svg: "generic-full-graph-svg",
      search: "generic-full-graph-search",
      clear: "generic-full-graph-clear",
      reset: "generic-full-graph-reset",
      fit: "generic-full-graph-fit",
      selection: "generic-full-graph-selection",
      results: "generic-full-graph-results",
      reportTable: "generic-full-graph-report-table",
      evidenceSummary: "generic-full-graph-evidence-summary",
    }, graph, reporting);
  }

  async function init() {
    try {
      await Promise.all([initGhgPage(), initStandardRolePage()]);
    } catch (error) {
      console.error("Failed to render clustered standards graph.", error);
      const target = $("ghg-full-graph-selection") || $("generic-full-graph-selection");
      if (target) {
        target.insertAdjacentHTML("beforeend", `<p class="error">${escapeHtml(text("Failed to load the refined standards-cluster graph.", "细分标准聚类图加载失败。"))}</p>`);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
