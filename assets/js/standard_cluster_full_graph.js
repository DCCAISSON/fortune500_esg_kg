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
  const INDUSTRY_DEFAULT = "#6b7c85";
  const GENERIC_GHG_ID = "ghg_generic_reference";
  const EMBEDDED_PAYLOAD_VERSION = "reporting_views_embedded_v6_explicit_ghg_only";
  const SCOPE_TERM_RE = /\bscope\s*(?:1|2|3|one|two|three|i|ii|iii)\b|范围\s*(?:1|2|3|一|二|三)|范畴\s*(?:1|2|3|一|二|三)/i;

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

  function strictJsonPayload(node, label) {
    if (!node) throw new Error(`Missing embedded full-graph JSON script: ${label}`);
    const raw = String(node.textContent || "").trim();
    if (!raw) throw new Error(`Embedded full-graph JSON script is empty: ${label}`);
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Failed to parse embedded full-graph JSON script: ${label}. ${error.message}`);
    }
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
      evidenceMode: ids.evidenceMode ? cloneById(ids.evidenceMode) : null,
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
      const hasNonGhgScopeQuote = item.non_ghg_scope_source_quote || (!item.is_ghg_series && SCOPE_TERM_RE.test(snippet));
      const isContextualGhg = item.evidence_strength === "contextual_review_required" || item.match_status === "contextual_scope_inventory_mapping";
      return `
        <article class="cluster-evidence-card">
          ${hasNonGhgScopeQuote ? `<div class="cluster-evidence-notice">${escapeHtml(text("The source quote contains Scope wording, but this node is not a GHG Protocol fine-series standard. It is shown as source evidence, not as this standard's own terminology.", "源文含 Scope 词，但当前节点不是 GHG Protocol 细分标准；展示为原文证据引用，不作为该标准自身口径。"))}</div>` : ""}
          ${isContextualGhg ? `<div class="cluster-evidence-notice is-contextual">${escapeHtml(text("Contextual GHG series mapping: keep as review-required until the PDF text explicitly names this series.", "上下文 GHG 细分映射：PDF 原文明确写出该系列前保留为待复核。"))}</div>` : ""}
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
        "This page now splits GHG Protocol into specific standards, guidance documents, sector guidance, project protocols, and program nodes instead of showing one large undifferentiated GHG class.",
        "该页已将 GHG Protocol 拆分为具体标准、指南、行业指南、项目协议和项目体系节点，不再显示为单一的大类 GHG Protocol。"
      );
      paragraphs[1].textContent = text(
        "The default view foregrounds only explicitly accepted GHG fine-series citations. Contextual mappings and unresolved generic GHG mentions remain review data and are not drawn as accepted graph links.",
        "默认视图只突出原文明示采信的 GHG 细分系列；上下文映射和未解析泛化 GHG 提及保留为复核数据，不画成已采信图谱关系。"
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
      const values = [
        [text("Explicitly accepted companies", "明示采信企业"), summary.ghg_accepted_series_company_count || summary.ghg_explicit_series_company_count || 0],
        [text("Accepted fine-series edges", "已采信细分边"), summary.ghg_accepted_series_edge_count || summary.ghg_accepted_series_company_count || 0],
        [text("Review companies", "复核企业"), summary.ghg_review_series_company_count || summary.ghg_contextual_series_company_count || 0],
        [text("Demoted edges", "已降级边"), summary.ghg_demoted_series_edge_count || summary.ghg_overmapped_review_edge_count_excluded_from_graph || 0],
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
    const ghgSeries = strictObject(reporting.ghg_standard_series, "ghg_standard_series");
    const seriesSummary = new Map(nonEmptyArray(ghgSeries.series_summary, "ghg_standard_series.series_summary").map((item) => [item.series_id, item]));
    const definitions = nonEmptyArray(ghgSeries.definitions, "ghg_standard_series.definitions").filter((definition) => definition.id !== GENERIC_GHG_ID);
    if (!definitions.length) {
      throw new Error("GHG full graph has no fine-series definitions after excluding generic references.");
    }
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
        sortScore: Number(summary.accepted_company_count ?? summary.explicit_company_count ?? summary.company_count ?? 0),
      };
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

  function pickLocalized(item, zhKey, enKey, defaultValue = "") {
    if (!item) return defaultValue;
    return lang() === "zh"
      ? (item[zhKey] || item[enKey] || defaultValue)
      : (item[enKey] || item[zhKey] || defaultValue);
  }

  function pickLocalizedList(item, zhKey, enKey) {
    const values = lang() === "zh" ? item?.[zhKey] : item?.[enKey];
    const alternateValues = lang() === "zh" ? item?.[enKey] : item?.[zhKey];
    return Array.isArray(values) && values.length ? values : (Array.isArray(alternateValues) ? alternateValues : []);
  }

  function uniqueList(values) {
    if (!Array.isArray(values)) {
      throw new Error("Expected an array while building embedded full-graph links.");
    }
    return Array.from(new Set(values.filter(Boolean)));
  }

  function strictArray(value, label) {
    if (!Array.isArray(value)) {
      throw new Error(`Missing embedded full-graph array: ${label}`);
    }
    return value;
  }

  function strictObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Missing embedded full-graph object: ${label}`);
    }
    return value;
  }

  function nonEmptyArray(value, label) {
    const rows = strictArray(value, label);
    if (!rows.length) {
      throw new Error(`Embedded full-graph array is empty: ${label}`);
    }
    return rows;
  }

  function isExplicitSeriesMatch(matchStatus) {
    return matchStatus === "explicit_series_citation" || matchStatus === "pdf_explicit_series_citation";
  }

  function isOvermappedSeriesMatch(matchStatus) {
    return matchStatus === "contextual_overmapped_review";
  }

  function evidenceStrengthLabel(meta) {
    if (meta?.isExplicit) {
      return text("Explicit source citation", "原文明示引用");
    }
    if (meta?.isOvermapped) {
      return text("Possible overmapping - reassign/demote review", "疑似过度映射 - 需重分配/降级复核");
    }
    return text("Contextual mapping - review required", "上下文映射 - 待复核");
  }

  function buildGhgGraphFromReporting(reporting) {
    strictObject(reporting.ghg_standard_series, "ghg_standard_series");
    const standardNodes = makeGhgNodes(reporting);
    const standardById = new Map(standardNodes.map((node) => [node.id, node]));
    const mappingRows = nonEmptyArray(reporting.ghg_standard_series.company_mappings, "ghg_standard_series.company_mappings");
    const companyNodes = mappingRows.map((row) => {
      const evidenceByItem = {};
      const linkMetaByItem = {};
      const linkedItems = uniqueList(strictArray(row.series, `series for ${row.company_id || "unknown company"}`).map((item) => {
        if (!standardById.has(item.series_id)) return "";
        const samples = Array.isArray(item.evidence_samples) ? item.evidence_samples : [];
        const matchStatus = item.match_status || "";
        const isExplicit = isExplicitSeriesMatch(matchStatus);
        const isOvermapped = isOvermappedSeriesMatch(matchStatus);
        const meta = {
          matchStatus,
          evidenceStrength: isExplicit ? "strong_explicit" : (isOvermapped ? "overmapped_review_required" : "contextual_review_required"),
          isExplicit,
          isOvermapped,
          evidenceCount: Number(item.evidence_count || samples.length || 0),
        };
        linkMetaByItem[item.series_id] = meta;
        evidenceByItem[item.series_id] = samples.map((sample) => ({
          ...sample,
          match_status: matchStatus,
          evidence_strength: meta.evidenceStrength,
          evidence_strength_label: evidenceStrengthLabel(meta),
        }));
        standardById.get(item.series_id).evidence.push(...evidenceByItem[item.series_id].slice(0, 3));
        return item.series_id;
      }));
      if (!linkedItems.length) return null;
      return {
        id: row.company_id,
        name: pickLocalized(row, "company_name_zh", "company_name_en", row.company_id),
        rank: row.world500_rank,
        industry: pickLocalized(row, "industry_section_zh", "industry_section_en", row.industry_label_zh || ""),
        industryLabel: row.industry_label_zh || row.industry_section_en || "",
        industryColor: row.industry_color || INDUSTRY_DEFAULT,
        linkedItems,
        linkMetaByItem,
        evidenceByItem,
        evidence: [],
        roles: [],
        principles: [],
        explicitSeriesCount: row.explicit_series_count || 0,
        contextualSeriesCount: row.contextual_series_count || linkedItems.filter((id) => !linkMetaByItem[id]?.isExplicit).length,
        overmappedReviewSeriesCount: row.overmapped_review_series_count || linkedItems.filter((id) => linkMetaByItem[id]?.isOvermapped).length,
        genericReferenceCount: row.generic_reference_count || 0,
      };
    }).filter(Boolean).sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));

    companyNodes.forEach((company) => {
      company.linkedItems.forEach((id) => {
        const node = standardById.get(id);
        if (!node) return;
        if (!node.companyIds.includes(company.id)) node.companyIds.push(company.id);
        const meta = company.linkMetaByItem?.[id] || {};
        const explicitIds = node.explicitCompanyIds || (node.explicitCompanyIds = []);
        const contextualIds = node.contextualCompanyIds || (node.contextualCompanyIds = []);
        const overmappedIds = node.overmappedReviewCompanyIds || (node.overmappedReviewCompanyIds = []);
        if (meta.isExplicit) {
          if (!explicitIds.includes(company.id)) explicitIds.push(company.id);
        } else if (meta.isOvermapped) {
          if (!overmappedIds.includes(company.id)) overmappedIds.push(company.id);
        } else if (!contextualIds.includes(company.id)) {
          contextualIds.push(company.id);
        }
      });
    });
    standardNodes.forEach((node) => {
      node.companyCount = node.companyIds.length;
      node.explicitCompanyCount = (node.explicitCompanyIds || []).length;
      node.contextualCompanyCount = (node.contextualCompanyIds || []).length;
      node.overmappedReviewCompanyCount = (node.overmappedReviewCompanyIds || []).length;
      node.factCount = Math.max(node.companyIds.length, node.evidence.length);
      if (node.isGenericGhg) node.sortScore = node.companyCount;
    });

    const visibleStandards = standardNodes
      .filter((node) => node.companyCount > 0 || (node.isGhgFineClass && !node.isGenericGhg))
      .sort((a, b) => {
        if (a.isGenericGhg) return 1;
        if (b.isGenericGhg) return -1;
        return Number(b.sortScore || 0) - Number(a.sortScore || 0);
      });

    return {
      mode: "ghg",
      system: {
        id: "ghg_protocol",
        name: text("GHG Protocol fine-series system", "GHG Protocol 细分体系"),
        color: "#2f6f63",
      },
      standardNodes: visibleStandards,
      companyNodes,
      linkCount: companyNodes.reduce((total, company) => total + company.linkedItems.length, 0),
      ghgFineCount: visibleStandards.filter((node) => node.isGhgFineClass && !node.isGenericGhg).length,
    };
  }

  function buildStandardRoleGraphFromReporting(reporting) {
    const roleGraph = strictObject(reporting.standard_role_graph, "standard_role_graph");
    const sourceStandards = nonEmptyArray(roleGraph.standards, "standard_role_graph.standards").filter((item) => item.id !== GENERIC_GHG_ID);
    const sourceCompanies = nonEmptyArray(roleGraph.companies, "standard_role_graph.companies");
    const sourceLinks = nonEmptyArray(roleGraph.links, "standard_role_graph.links").filter((link) => link.standard_id !== GENERIC_GHG_ID);
    const linkByPair = new Map(sourceLinks.map((link) => [`${link.standard_id}::${link.company_id}`, link]));
    const annotateEvidence = (sample, standard) => {
      const snippet = sample?.snippet_zh || sample?.snippet_en || sample?.snippet || "";
      const isGhgSeries = Boolean(standard?.is_ghg_series || standard?.isGhgFineClass);
      return {
        ...sample,
        standard_id: standard?.id || "",
        standard_name: standard?.name || standard?.name_en || standard?.name_zh || "",
        is_ghg_series: isGhgSeries,
        non_ghg_scope_source_quote: !isGhgSeries && SCOPE_TERM_RE.test(snippet),
      };
    };
    const standardNodes = sourceStandards.map((item, index) => ({
      id: item.id,
      name: pickLocalized(item, "name_zh", "name_en", item.id),
      shortName: pickLocalized(item, "name_zh", "name_en", item.id),
      category: pickLocalized(item, "family_zh", "family_en", ""),
      role: pickLocalizedList(item, "roles_zh", "roles_en").join(" | "),
      principle: pickLocalizedList(item, "principles_zh", "principles_en").join(" | "),
      policy: item.is_ghg_series
        ? text("Scope wording is valid only inside GHG Protocol evidence context.", "Scope 术语只在 GHG Protocol 证据语境下使用。")
        : text("Use direct/indirect emissions wording unless the source explicitly cites GHG Protocol scope categories.", "非 GHG Protocol 证据默认使用直接/间接口径，只有原文显式引用时才使用 Scope 类别。"),
      companyIds: Array.isArray(item.company_ids) ? item.company_ids.slice() : [],
      evidence: Array.isArray(item.evidence_samples) ? item.evidence_samples.slice(0, 8).map((sample) => annotateEvidence(sample, item)) : [],
      color: item.color || STANDARD_COLORS[index % STANDARD_COLORS.length],
      sortScore: Number(item.company_count || item.company_ids?.length || 0),
      factCount: Number(item.evidence_count || 0),
      isGhgFineClass: Boolean(item.is_ghg_series),
      isGenericGhg: item.id === GENERIC_GHG_ID,
      family: pickLocalized(item, "family_zh", "family_en", ""),
      acceptedCompanyCount: Number(item.accepted_company_count || 0),
      reviewCompanyCount: Number(item.review_company_count || 0),
      totalMappedCompanyCount: Number(item.total_mapped_company_count || item.company_count || 0),
    }));
    const standardById = new Map(standardNodes.map((node) => [node.id, node]));
    const companyNodes = sourceCompanies.map((company) => {
      const linkedItems = uniqueList(strictArray(company.standard_ids, `standard_ids for ${company.company_id || "unknown company"}`).filter((id) => standardById.has(id)));
      const evidenceByItem = {};
      const linkMetaByItem = {};
      linkedItems.forEach((standardId) => {
        const link = linkByPair.get(`${standardId}::${company.company_id}`);
        const decisionBucket = link?.decision_bucket || "";
        const matchStatus = link?.match_status || "";
        const isAccepted = decisionBucket === "accepted";
        const isOvermapped = matchStatus === "contextual_overmapped_review";
        linkMetaByItem[standardId] = {
          matchStatus,
          decisionBucket,
          evidenceStrength: isAccepted ? "strong_explicit" : (isOvermapped ? "overmapped_review_required" : "contextual_review_required"),
          isExplicit: isAccepted,
          isOvermapped,
          isReview: !isAccepted,
          evidenceCount: Number(link?.evidence_count || 0),
        };
        evidenceByItem[standardId] = Array.isArray(link?.evidence_samples)
          ? link.evidence_samples.map((sample) => ({
            ...annotateEvidence(sample, standardById.get(standardId)),
            match_status: matchStatus,
            decision_bucket: decisionBucket,
            evidence_strength: linkMetaByItem[standardId].evidenceStrength,
            evidence_strength_label: evidenceStrengthLabel(linkMetaByItem[standardId]),
          }))
          : [];
      });
      return {
        id: company.company_id,
        name: pickLocalized(company, "company_name_zh", "company_name_en", company.company_id),
        rank: company.world500_rank,
      linkedItems,
      evidenceByItem,
      evidence: [],
      industry: pickLocalized(company, "industry_section_zh", "industry_section_en", company.industry_label_zh || ""),
      industryLabel: company.industry_label_zh || "",
      industryColor: company.industry_color || INDUSTRY_DEFAULT,
      linkMetaByItem,
    };
    }).filter((company) => company.linkedItems.length)
      .sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));

    standardNodes.forEach((node) => {
      node.companyIds = [];
      node.evidence = Array.isArray(node.evidence) ? node.evidence : [];
    });
    companyNodes.forEach((company) => {
      company.linkedItems.forEach((standardId) => {
        const node = standardById.get(standardId);
        if (!node) return;
        if (!node.companyIds.includes(company.id)) node.companyIds.push(company.id);
        const samples = company.evidenceByItem?.[standardId] || [];
        if (node.evidence.length < 8) node.evidence.push(...samples.slice(0, 2));
      });
    });

    const visibleStandards = standardNodes
      .filter((node) => node.companyIds.length || (node.isGhgFineClass && !node.isGenericGhg))
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

  function buildGhgGraph(reporting) {
    return buildGhgGraphFromReporting(reporting);
  }

  function buildStandardRoleGraph(reporting) {
    return buildStandardRoleGraphFromReporting(reporting);
  }

  function embeddedReporting(runtimeConfig, expectedSystem) {
    const config = strictObject(runtimeConfig, "runtimeConfig");
    if (config.version !== EMBEDDED_PAYLOAD_VERSION) {
      throw new Error(`Unexpected embedded full-graph payload version: ${config.version || "missing"}`);
    }
    if (config.system?.key !== expectedSystem) {
      throw new Error(`Embedded full-graph system mismatch: expected ${expectedSystem}, got ${config.system?.key || "missing"}`);
    }
    const reporting = strictObject(config.reporting, "runtimeConfig.reporting");
    if (expectedSystem === "ghg") strictObject(reporting.ghg_standard_series, "reporting.ghg_standard_series");
    if (expectedSystem === "standard") strictObject(reporting.standard_role_graph, "reporting.standard_role_graph");
    return reporting;
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
      const explicit = graph.mode === "ghg"
        ? links.filter((id) => company.linkMetaByItem?.[id]?.isExplicit)
        : links.filter((id) => id !== GENERIC_GHG_ID);
      const nonGeneric = links.filter((id) => id !== GENERIC_GHG_ID);
      const selected = graph.mode === "ghg"
        ? (explicit[0] || nonGeneric[0] || links[0])
        : (links.slice().sort((a, b) => {
          const aCount = standardById.get(a)?.companyIds.length || 999999;
          const bCount = standardById.get(b)?.companyIds.length || 999999;
          return aCount - bCount;
        })[0] || explicit[0] || links[0]);
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
      if (!items.length) return;
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
      evidenceMode: graph.mode === "ghg" ? "explicit" : "all",
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
      label.textContent = graph.mode === "ghg"
        ? `${node.shortName || node.name} · ${formatInt(node.explicitCompanyCount || 0)} ${text("strong", "强证据")} / ${formatInt(node.contextualCompanyCount || 0)} ${text("review", "复核")} / ${formatInt(node.overmappedReviewCompanyCount || 0)} ${text("overmapped", "疑似过度映射")}`
        : `${node.shortName || node.name} · ${formatInt(node.clusterCompanies.length)}`;
      layers.bg.appendChild(label);
      const meta = createSvgEl("text", {
        x: node.cluster.x + 28,
        y: node.cluster.y + 72,
        class: "cluster-standard-bg-meta",
      });
      meta.textContent = node.category || node.role || "";
      layers.bg.appendChild(meta);
      const hasExplicitCompanies = graph.mode !== "ghg" || Number(node.explicitCompanyCount || 0) > 0;
      rect.classList.toggle("is-contextual-only", !hasExplicitCompanies);
      label.classList.toggle("is-contextual-only", !hasExplicitCompanies);
      meta.classList.toggle("is-contextual-only", !hasExplicitCompanies);
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
        const meta = company.linkMetaByItem?.[standardId] || {};
        const isStrongEdge = meta.isExplicit || (graph.mode !== "ghg" && !meta.isReview);
        const edge = createSvgEl("path", {
          d: `M ${standard.x + 132} ${standard.y} C ${(standard.x + company.x) / 2} ${standard.y}, ${(standard.x + company.x) / 2} ${company.y}, ${company.x} ${company.y}`,
          class: `cluster-graph-edge is-company-edge ${isStrongEdge ? "is-explicit-evidence" : (meta.isOvermapped ? "is-overmapped-review" : "is-contextual-evidence")}`,
          stroke: standard.color,
          "stroke-dasharray": !isStrongEdge ? "9 10" : null,
        });
        const title = createSvgEl("title", {});
        title.textContent = graph.mode === "ghg" ? evidenceStrengthLabel(meta) : text("Standard-company evidence link", "标准-企业证据关系");
        edge.appendChild(title);
        layers.edges.appendChild(edge);
        edgeElements.push({
          edge,
          type: "company",
          standardId,
          companyId: company.id,
          isContextual: !isStrongEdge,
          evidenceStrength: meta.evidenceStrength || "standard_link",
        });
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
      appendTextLines(group, [
        graph.mode === "ghg"
          ? `${formatInt(node.explicitCompanyCount || 0)} ${text("strong", "强证据")} / ${formatInt(node.contextualCompanyCount || 0)} ${text("review", "复核")} / ${formatInt(node.overmappedReviewCompanyCount || 0)} ${text("overmapped", "疑似过度映射")}`
          : `${formatInt(node.companyIds.length)} ${text("companies", "企业")}`,
      ], node.x, node.y + 34, "cluster-standard-meta", 20);
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
      const hasExplicitGhgLink = graph.mode !== "ghg" || (company.linkedItems || []).some((id) => company.linkMetaByItem?.[id]?.isExplicit);
      const group = createSvgEl("g", {
        class: `cluster-company-node${hasExplicitGhgLink ? "" : " is-contextual-only"}`,
        tabindex: "0",
        role: "button",
        "data-company-id": company.id,
      });
      group.appendChild(createSvgEl("circle", {
        cx: company.x,
        cy: company.y,
        r: radius + 4,
        fill: colorWithAlpha(company.industryColor || INDUSTRY_DEFAULT, 0.18),
        stroke: colorWithAlpha(company.industryColor || INDUSTRY_DEFAULT, 0.52),
        class: "cluster-company-halo",
      }));
      group.appendChild(createSvgEl("circle", {
        cx: company.x,
        cy: company.y,
        r: radius,
        fill: company.industryColor || INDUSTRY_DEFAULT,
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

    function linkIsVisible(company, standardId) {
      if (graph.mode !== "ghg" || state.evidenceMode === "all") return true;
      return Boolean(company?.linkMetaByItem?.[standardId]?.isExplicit);
    }

    function companyHasVisibleLink(company) {
      if (graph.mode !== "ghg" || state.evidenceMode === "all") return true;
      return (company.linkedItems || []).some((standardId) => linkIsVisible(company, standardId));
    }

    function standardVisibleCompanyCount(standardId) {
      if (graph.mode !== "ghg" || state.evidenceMode === "all") {
        return standardById.get(standardId)?.companyIds.length || 0;
      }
      return graph.layout.companies.filter((company) => (company.linkedItems || []).includes(standardId) && linkIsVisible(company, standardId)).length;
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
        const visibleLinkIds = graph.mode === "ghg" && state.evidenceMode === "explicit"
          ? (company.linkedItems || []).filter((id) => linkIsVisible(company, id))
          : (company.linkedItems || []);
        const linkedNames = (company.linkedItems || []).map((id) => {
          const standard = standardById.get(id);
          const meta = company.linkMetaByItem?.[id];
          const suffix = graph.mode === "ghg" ? ` [${evidenceStrengthLabel(meta)}]` : "";
          return `${standard?.shortName || standard?.name || id}${suffix}`;
        });
        const explicitCount = graph.mode === "ghg"
          ? (company.linkedItems || []).filter((id) => company.linkMetaByItem?.[id]?.isExplicit).length
          : 0;
        const contextualCount = graph.mode === "ghg"
          ? (company.linkedItems || []).filter((id) => !company.linkMetaByItem?.[id]?.isExplicit && !company.linkMetaByItem?.[id]?.isOvermapped).length
          : 0;
        const overmappedCount = graph.mode === "ghg"
          ? (company.linkedItems || []).filter((id) => company.linkMetaByItem?.[id]?.isOvermapped).length
          : 0;
        const evidence = []
          .concat(...visibleLinkIds.map((id) => company.evidenceByItem?.[id] || []))
          .concat(company.evidence || []);
        refs.selection.innerHTML = `
          <h3>${escapeHtml(text("Company node", "企业节点"))}</h3>
          <dl class="graph-detail-list">
            <div><dt>${escapeHtml(text("Company", "企业"))}</dt><dd>${escapeHtml(company.name || company.id)}</dd></div>
            <div><dt>${escapeHtml(text("World500 rank", "世界500强排名"))}</dt><dd>${company.rank ? `#${escapeHtml(company.rank)}` : "-"}</dd></div>
            <div><dt>${escapeHtml(text("Industry background", "行业背景色"))}</dt><dd>${escapeHtml(company.industry || company.industryLabel || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Linked standards", "关联标准/指南"))}</dt><dd>${escapeHtml(linkedNames.join(" | ") || "-")}</dd></div>
            ${graph.mode === "ghg" ? `<div><dt>${escapeHtml(text("GHG evidence strength", "GHG 证据强度"))}</dt><dd>${escapeHtml(text(`${explicitCount} explicit / ${contextualCount} contextual review / ${overmappedCount} possible overmapping`, `${explicitCount} 条明示 / ${contextualCount} 条上下文待复核 / ${overmappedCount} 条疑似过度映射`))}</dd></div>` : ""}
            ${graph.mode === "ghg" ? `<div><dt>${escapeHtml(text("Current evidence mode", "当前证据模式"))}</dt><dd>${escapeHtml(state.evidenceMode === "all" ? text("Audit mode: strong + contextual review", "审核模式：强证据 + 上下文待复核") : text("Strong mode: explicit citations only", "强证据模式：仅原文明示引用"))}</dd></div>` : ""}
          </dl>
          ${graph.mode === "ghg" && state.evidenceMode === "explicit" && contextualCount ? `<div class="cluster-evidence-notice is-contextual">${escapeHtml(text("Contextual review evidence is hidden in the default graph mode. Switch to audit mode to inspect dashed review links.", "默认强证据模式已隐藏上下文待复核证据；切换到审核模式可查看虚线复核关系。"))}</div>` : ""}
          ${workbenchUrl(company.id) ? `<a class="btn alt" href="${escapeHtml(workbenchUrl(company.id))}">${escapeHtml(text("Open workbench", "打开企业工作台"))}</a>` : ""}
          <h4>${escapeHtml(text("Evidence back-links", "证据回链"))}</h4>
          ${evidenceHtml(evidence, 5)}
        `;
        return;
      }
      if (state.selectedKind === "standard") {
        const standard = standardById.get(state.selectedId);
        if (!standard) return;
        const explicitCount = standard.explicitCompanyCount || 0;
        const contextualCount = standard.contextualCompanyCount || 0;
        const overmappedCount = standard.overmappedReviewCompanyCount || 0;
        const displayedCount = standardVisibleCompanyCount(standard.id);
        refs.selection.innerHTML = `
          <h3>${escapeHtml(standard.shortName || standard.name)}</h3>
          <dl class="graph-detail-list">
            <div><dt>${escapeHtml(text("Full name", "完整名称"))}</dt><dd>${escapeHtml(standard.name)}</dd></div>
            <div><dt>${escapeHtml(text("Category / role", "类别/角色"))}</dt><dd>${escapeHtml(standard.category || standard.role || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Principle", "原则/口径"))}</dt><dd>${escapeHtml(standard.principle || "-")}</dd></div>
            <div><dt>${escapeHtml(text("Language policy", "口径提醒"))}</dt><dd>${escapeHtml(standard.policy || "-")}</dd></div>
          <div><dt>${escapeHtml(text("Linked companies", "关联企业"))}</dt><dd>${graph.mode === "ghg" ? `${formatInt(displayedCount)} ${escapeHtml(text("strong displayed", "强证据显示"))} / ${formatInt(standard.companyIds.length)} ${escapeHtml(text("mapped incl. review", "总映射含复核"))}` : formatInt(standard.companyIds.length)}</dd></div>
            ${graph.mode === "ghg" ? `<div><dt>${escapeHtml(text("Evidence split", "证据拆分"))}</dt><dd>${escapeHtml(text(`${explicitCount} explicit / ${contextualCount} contextual review / ${overmappedCount} possible overmapping`, `${explicitCount} 条明示 / ${contextualCount} 条上下文待复核 / ${overmappedCount} 条疑似过度映射`))}</dd></div>` : ""}
          </dl>
          ${graph.mode === "ghg" && (contextualCount || overmappedCount) ? `<div class="cluster-evidence-notice">${escapeHtml(text("Dashed company links are contextual mappings under review; possible-overmapping links must be reassigned or demoted before being treated as a company-series relationship.", "虚线企业边是待复核上下文映射；疑似过度映射边必须重分配或降级后，才能作为企业-系列关系。"))}</div>` : ""}
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
          ${graph.mode === "ghg" ? `<div><dt>${escapeHtml(text("Evidence mode", "证据模式"))}</dt><dd>${escapeHtml(state.evidenceMode === "all" ? text("Audit mode includes dashed contextual review links.", "审核模式包含虚线上下文待复核关系。") : text("Default strong mode displays explicit source citations only.", "默认强证据模式仅显示原文明示引用关系。"))}</dd></div>` : ""}
          ${graph.mode === "ghg" ? `<div><dt>${escapeHtml(text("Line style", "连线样式"))}</dt><dd>${escapeHtml(text("Solid = explicit source citation; dashed = contextual review; dashed overmapping links require reassign/demote review.", "实线=原文明示引用；虚线=上下文待复核；疑似过度映射虚线需重分配/降级复核。"))}</dd></div>` : ""}
          <div><dt>${escapeHtml(text("Display rule", "展示规则"))}</dt><dd>${escapeHtml(text("Companies are positioned by their primary standard cluster; dot color is industry.", "企业按主要归属标准聚类，企业点颜色表示行业。"))}</dd></div>
        </dl>
      `;
    }

    function renderResults() {
      const selected = selectedStandardId();
      const rows = graph.layout.companies
        .filter((company) => matchesQuery(company))
        .filter((company) => companyHasVisibleLink(company))
        .filter((company) => !selected || ((company.linkedItems || []).includes(selected) && linkIsVisible(company, selected)))
        .slice(0, 18);
      const total = graph.layout.companies
        .filter((company) => matchesQuery(company))
        .filter((company) => companyHasVisibleLink(company))
        .filter((company) => !selected || ((company.linkedItems || []).includes(selected) && linkIsVisible(company, selected))).length;
      refs.results.innerHTML = `
        <h3>${escapeHtml(text("Search / cluster results", "检索/聚类结果"))}</h3>
        <p>${escapeHtml(text(`${formatInt(total)} matching companies in the current evidence mode. Click a row to locate it.`, `当前证据模式下 ${formatInt(total)} 家匹配企业，点击可定位。`))}</p>
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
        .filter((node) => graph.mode === "ghg" ? (node.isGhgFineClass && !node.isGenericGhg) : node.companyIds.length)
        .sort((a, b) => standardVisibleCompanyCount(b.id) - standardVisibleCompanyCount(a.id))
        .slice(0, graph.mode === "ghg" ? 12 : 16);
      const zeroAcceptedStandards = graph.mode === "ghg" ? topStandards.filter((node) => !standardVisibleCompanyCount(node.id)) : [];
      refs.reportTable.innerHTML = `
        <div class="table-kicker">${escapeHtml(text("Cluster summary", "聚类摘要"))}</div>
        <h3>${escapeHtml(text("Companies Clustered by Specific Standards", "企业按具体标准/指南聚类"))}</h3>
        <p class="table-lead">${escapeHtml(text("GHG Protocol is expanded into standards, guidance, project protocols, and program nodes; unresolved generic mentions are excluded from accepted graph links.", "GHG Protocol 已展开为标准、指南、项目协议和项目体系节点；未解析的泛化提及不进入已采信图谱关系。"))}</p>
        <div class="table-wrap"><table>
          <tr><th>${escapeHtml(text("Standard / guidance", "标准/指南"))}</th><th>${escapeHtml(text("Category", "类别"))}</th><th>${escapeHtml(text("Displayed companies", "当前显示企业"))}</th>${graph.mode === "ghg" ? `<th>${escapeHtml(text("Explicit", "明示"))}</th><th>${escapeHtml(text("Contextual review", "上下文待复核"))}</th><th>${escapeHtml(text("Possible overmapping", "疑似过度映射"))}</th>` : ""}</tr>
          ${topStandards.map((node) => `<tr><td>${escapeHtml(node.shortName || node.name)}</td><td>${escapeHtml(node.category || node.role || "")}</td><td>${formatInt(standardVisibleCompanyCount(node.id))}</td>${graph.mode === "ghg" ? `<td>${formatInt(node.explicitCompanyCount || 0)}</td><td>${formatInt(node.contextualCompanyCount || 0)}</td><td>${formatInt(node.overmappedReviewCompanyCount || 0)}</td>` : ""}</tr>`).join("")}
        </table></div>
        ${zeroAcceptedStandards.length ? `<p class="table-lead"><strong>${escapeHtml(text("Review-only standards", "待复核标准"))}:</strong> ${escapeHtml(zeroAcceptedStandards.map((node) => node.shortName || node.name).join(" | "))}. ${escapeHtml(text("No accepted company edge is drawn until page-level source text explicitly names the standard.", "未发现页级原文明示命名前，不绘制企业采信边。"))}</p>` : ""}
      `;
    }

    function renderEvidenceSummary() {
      if (!refs.evidenceSummary) return;
      const ghgNodes = graph.standardNodes.filter((node) => node.isGhgFineClass).slice(0, 12);
      refs.evidenceSummary.innerHTML = `
        <div class="table-kicker">${escapeHtml(text("GHG split", "GHG 细分"))}</div>
        <h3>${escapeHtml(text("GHG Protocol Series Now Split Like ISO", "GHG Protocol 已按 ISO 式细分"))}</h3>
        <p class="table-lead">${escapeHtml(text("Only explicit source-text series citations or readable PDF-page evidence can map a company to a fine class; generic GHG mentions remain review data, not accepted edges.", "只有原文明确写出具体系列或 PDF 页证据可读时，企业才归入细分类；泛化 GHG 提及保留为复核数据，不作为已采信边。"))}</p>
        <div class="graph-chip-list">
          ${ghgNodes.map((node) => `<span class="graph-chip" style="border-color:${escapeHtml(node.color)};background:${escapeHtml(colorWithAlpha(node.color, 0.12))}">${escapeHtml(node.shortName || node.name)} · ${formatInt(node.explicitCompanyCount || 0)} explicit / ${formatInt(node.contextualCompanyCount || 0)} review / ${formatInt(node.overmappedReviewCompanyCount || 0)} overmapped</span>`).join("")}
        </div>
      `;
    }

    function update() {
      if (graph.mode === "ghg" && state.evidenceMode === "explicit" && state.selectedKind === "company") {
        const selectedCompany = companyById.get(state.selectedId);
        if (selectedCompany && !companyHasVisibleLink(selectedCompany)) {
          state.selectedKind = "system";
          state.selectedId = graph.system.id;
        }
      }
      const selectedStandard = selectedStandardId();
      const matched = new Set(graph.layout.companies.filter(matchesQuery).filter(companyHasVisibleLink).map((company) => company.id));
      standardElements.forEach((entry, id) => {
        const isActive = state.selectedKind === "standard" && state.selectedId === id;
        const isLinked = state.selectedKind === "company" && (companyById.get(state.selectedId)?.linkedItems || []).includes(id);
        const hiddenByEvidence = graph.mode === "ghg" && state.evidenceMode === "explicit" && !standardVisibleCompanyCount(id) && !entry.data.isGhgFineClass;
        const dim = hiddenByEvidence || (selectedStandard && selectedStandard !== id && !isLinked);
        entry.group.classList.toggle("is-active", isActive || isLinked);
        entry.group.classList.toggle("is-dimmed", Boolean(dim));
        entry.group.classList.toggle("is-hidden-by-evidence", hiddenByEvidence);
      });
      companyElements.forEach((entry, id) => {
        const company = entry.data;
        const isActive = state.selectedKind === "company" && state.selectedId === id;
        const visibleByEvidence = companyHasVisibleLink(company);
        const linkedToSelected = !selectedStandard || ((company.linkedItems || []).includes(selectedStandard) && linkIsVisible(company, selectedStandard));
        const isMatched = matched.has(id);
        const dim = !visibleByEvidence || !linkedToSelected || !isMatched;
        entry.group.classList.toggle("is-active", isActive);
        entry.group.classList.toggle("is-dimmed", dim);
        entry.group.classList.toggle("is-hidden-by-evidence", !visibleByEvidence);
        entry.group.classList.toggle("is-match", Boolean(state.query && isMatched));
        entry.label.classList.toggle("is-visible", visibleByEvidence && (isActive || (state.query && isMatched && matched.size <= 30)));
      });
      edgeElements.forEach((entry) => {
        const visibleByEvidence = !entry.isContextual || state.evidenceMode === "all";
        const companySelected = state.selectedKind === "company" && entry.companyId === state.selectedId;
        const standardSelected = state.selectedKind === "standard" && entry.standardId === state.selectedId;
        const linkedToSelectedCompany = state.selectedKind === "company" && (companyById.get(state.selectedId)?.linkedItems || []).includes(entry.standardId);
        const companyMatches = !entry.companyId || matched.has(entry.companyId);
        const standardMatches = !selectedStandard || entry.standardId === selectedStandard || linkedToSelectedCompany;
        entry.edge.classList.toggle("is-hidden-by-evidence", !visibleByEvidence);
        entry.edge.classList.toggle("is-active", visibleByEvidence && (companySelected || standardSelected || linkedToSelectedCompany));
        entry.edge.classList.toggle("is-dimmed", !visibleByEvidence || !(companyMatches && standardMatches));
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
    if (refs.evidenceMode) {
      refs.evidenceMode.value = state.evidenceMode;
      refs.evidenceMode.addEventListener("change", () => {
        state.evidenceMode = refs.evidenceMode.value === "all" ? "all" : "explicit";
        if (state.selectedKind === "company" && !companyHasVisibleLink(companyById.get(state.selectedId))) {
          state.selectedKind = "system";
          state.selectedId = graph.system.id;
        }
        update();
      });
    }
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

  function initGhgPage() {
    const dataNode = $("world500-ghg-full-graph-data");
    if (!dataNode || !$("ghg-full-graph-svg")) return;
    const runtimeConfig = strictJsonPayload(dataNode, "world500-ghg-full-graph-data");
    const reporting = embeddedReporting(runtimeConfig, "ghg");
    if (!reporting) throw new Error("Missing embedded GHG graph reporting payload.");
    const graph = buildGhgGraph(reporting);
    renderClusteredGraph({
      svg: "ghg-full-graph-svg",
      search: "ghg-full-graph-search",
      clear: "ghg-full-graph-clear",
      reset: "ghg-full-graph-reset",
      fit: "ghg-full-graph-fit",
      evidenceMode: "ghg-full-graph-evidence-mode",
      selection: "ghg-full-graph-selection",
      results: "ghg-full-graph-results",
      reportTable: "ghg-full-graph-report-table",
      evidenceSummary: "ghg-full-graph-evidence-summary",
    }, graph, reporting);
  }

  function initStandardRolePage() {
    const dataNode = $("world500-generic-full-graph-data");
    if (!dataNode || !$("generic-full-graph-svg")) return;
    const runtimeConfig = strictJsonPayload(dataNode, "world500-generic-full-graph-data");
    const reporting = embeddedReporting(runtimeConfig, "standard");
    if (!reporting) throw new Error("Missing embedded standard-role graph reporting payload.");
    const graph = buildStandardRoleGraph(reporting);
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

  function init() {
    try {
      initGhgPage();
      initStandardRolePage();
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
