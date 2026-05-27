(() => {
  const shared = window.World500WorkbenchShared;
  const config = window.REPORTING_VIEWS_CONFIG || {};
  if (!shared) return;

  const {
    createTable,
    escapeHtml,
    fetchJson,
    formatInt,
    formatMaybeNumber,
    joinList,
    metricCards,
    pickText,
  } = shared;

  const lang = config.lang || "zh";
  const assetBase = config.assetBase || "../assets/data/world500/workbench";
  const state = {
    payload: null,
    selectedStandardId: "",
  };

  const L = {
    zh: {
      loading: "正在加载报告视图数据...",
      loadError: "报告视图数据加载失败。",
      loaded: "报告视图已加载",
      noData: "暂无可显示记录",
      openWorkbench: "打开企业工作台",
      evidencePolicy: "审计口径",
      ghgTitle: "一、GHG Protocol 标准、指南与协议映射",
      ghgLead: "GHG Protocol 进一步拆分为标准、指南、项目协议、行业指南、政策/目标标准等角色族；只有原文明确写出具体名称时才归入对应细类，泛化 GHG Protocol 引用保留为待复核。",
      ghgTaxonomyTitle: "GHG Protocol 角色族细分",
      ghgSeriesHeaders: ["GHG 细类", "类型", "角色", "企业数", "显式企业数", "证据数", "原则/口径"],
      ghgCompanyHeaders: ["排名", "企业", "显式系列数", "泛化引用数", "系列/状态", "证据页"],
      rankingTitle: "二、企业总碳排放量排序",
      rankingLead: "主排行只比较 Scope 1 + 选定 Scope 2 + Scope 3 都具备 P0 强证据门禁的企业；部分强证据企业单独列示，不与完整企业混排。",
      rankingGraphTitle: "企业总排放强证据知识图谱",
      rankingGraphLead: "中心节点为强证据总排放排行；外围企业按总量从高到低排列，右侧 Scope 节点只用于 GHG Protocol 语境下的 Scope 1/2/3 分解，不套用于其他标准。",
      completeRanking: "完整 Scope 1/2/3 强证据排行",
      partialRanking: "部分强证据总量清单",
      rankingHeaders: ["强证据排行", "世界500强", "企业", "行业", "总量 MtCO2e", "Scope 1", "Scope 2", "Scope 2 口径", "Scope 3", "年份", "覆盖状态"],
      partialHeaders: ["部分排行", "企业", "总量 MtCO2e", "已覆盖", "缺口", "冲突排除行", "证据页"],
      standardGraphTitle: "三、标准角色族全屏实体级知识图谱增强",
      standardGraphLead: "标准节点位于中心并按标准上色；企业节点位于外围，外围光环按行业门类着色。当前边线只展开选中标准，避免把多标准边线堆叠成不可读网团。",
      selectedStandard: "选中标准",
      standardFullscreen: "全屏查看图谱",
      standardFullscreenUnavailable: "当前浏览器不支持全屏图谱。",
      standardFullscreenFailed: "全屏图谱打开失败，请在浏览器中重试。",
      industryLegend: "行业背景色",
      companiesShown: "当前显示企业",
      technologyTitle: "四、技术路径主轴：同类减碳技术企业聚类",
      technologyLead: "技术路径从现有技术全屏图谱抽取 9 类技术族，并补充细分方向、时间趋势和成本信号。这里的成本/时间仍是关键词证据，不等于已核证项目经济性。",
      techHeaders: ["技术族", "企业数", "证据数", "细分方向", "时间趋势", "成本信号", "标准对齐"],
      sourceMixTitle: "五、初级/次级数据气泡图",
      sourceMixLead: "气泡图基于 method_rows 中可识别的数据来源类别，横轴为已分类证据中的初级数据占比，纵轴为已分类来源证据行数，气泡大小为方法证据行数。",
      sourceMixHeaders: ["企业", "行业", "初级占比", "次级占比", "已分类来源行", "未分类行", "方法证据行", "说明"],
      near: "近端",
      mid: "中期",
      long: "长期",
      costSignals: "成本信号",
      sourceMixAxisX: "初级数据占比（已分类证据）",
      sourceMixAxisY: "已分类来源证据行数",
    },
    en: {
      loading: "Loading reporting views...",
      loadError: "Failed to load reporting views.",
      loaded: "Reporting views loaded",
      noData: "No records to display",
      openWorkbench: "Open workbench",
      evidencePolicy: "Audit policy",
      ghgTitle: "I. GHG Protocol Standards, Guidance, and Protocol Mapping",
      ghgLead: "GHG Protocol is split into standards, guidance, project protocols, sector guidance, and policy/goal standards. A company is assigned to a fine class only when the source text names it; generic GHG mentions remain review-required.",
      ghgTaxonomyTitle: "GHG Protocol role-family taxonomy",
      ghgSeriesHeaders: ["GHG fine class", "Type", "Role", "Companies", "Explicit companies", "Evidence rows", "Principle / wording policy"],
      ghgCompanyHeaders: ["Rank", "Company", "Explicit series", "Generic mentions", "Series / status", "Evidence pages"],
      rankingTitle: "II. Company Total Emissions Ranking",
      rankingLead: "The main ranking compares only companies with P0 strong evidence for Scope 1, selected Scope 2, and Scope 3. Partial strong-evidence totals are shown separately and are not mixed into the comparable ranking.",
      rankingGraphTitle: "Total-emissions strong-evidence knowledge graph",
      rankingGraphLead: "The center node is the strong-evidence total-emissions ranking. Company nodes are ordered high to low; Scope nodes on the right are used only for GHG Protocol Scope 1/2/3 decomposition, not for non-GHG standards.",
      completeRanking: "Complete Scope 1/2/3 strong-evidence ranking",
      partialRanking: "Partial strong-evidence totals",
      rankingHeaders: ["Evidence rank", "World500", "Company", "Industry", "Total MtCO2e", "Scope 1", "Scope 2", "Scope 2 method", "Scope 3", "Years", "Coverage"],
      partialHeaders: ["Partial rank", "Company", "Total MtCO2e", "Covered", "Missing", "Conflict-excluded rows", "Evidence pages"],
      standardGraphTitle: "III. Standard Role-Family Full-Screen Entity Graph",
      standardGraphLead: "Standard nodes are centered and colored by standard. Company nodes sit on the outer ring, with industry-colored halos. Only the selected standard's links are expanded so the graph remains readable.",
      selectedStandard: "Selected standard",
      standardFullscreen: "Open graph full screen",
      standardFullscreenUnavailable: "This browser does not support full-screen graph mode.",
      standardFullscreenFailed: "Failed to open the graph full screen. Please retry in the browser.",
      industryLegend: "Industry background color",
      companiesShown: "Companies shown",
      technologyTitle: "IV. Technology Path Axis: Company Clusters By Decarbonization Technology",
      technologyLead: "The path view extracts the existing nine technology families from the full-screen technology graph and adds subtypes, time-horizon signals, and cost-signal counts. Cost and timeline remain keyword evidence, not verified project economics.",
      techHeaders: ["Technology family", "Companies", "Evidence", "Subtypes", "Timeline", "Cost signals", "Standards alignment"],
      sourceMixTitle: "V. Primary / Secondary Data Bubble Chart",
      sourceMixLead: "The bubble chart uses recognizable source-origin classes in method_rows. X is the primary-data share among classified evidence rows, Y is classified source-evidence rows, and bubble size is methodology evidence count.",
      sourceMixHeaders: ["Company", "Industry", "Primary share", "Secondary share", "Classified rows", "Unclassified rows", "Method rows", "Note"],
      near: "Near",
      mid: "Mid",
      long: "Long",
      costSignals: "Cost signals",
      sourceMixAxisX: "Primary-data share among classified evidence",
      sourceMixAxisY: "Classified source-evidence rows",
    },
  }[lang];

  const elements = {
    metrics: document.getElementById("reporting-views-metrics"),
    policy: document.getElementById("reporting-views-policy"),
    ghg: document.getElementById("reporting-views-ghg"),
    ranking: document.getElementById("reporting-views-ranking"),
    standardGraph: document.getElementById("reporting-views-standard-graph"),
    technology: document.getElementById("reporting-views-technology"),
    sourceMix: document.getElementById("reporting-views-source-mix"),
    status: document.getElementById("reporting-views-status"),
  };

  function renderStatus(message) {
    if (elements.status) elements.status.innerHTML = `<div class="entity-empty">${escapeHtml(message)}</div>`;
  }

  function text(item, zhKey, enKey, fallback = "-") {
    return pickText(item, lang, zhKey, enKey, fallback);
  }

  function percent(value) {
    if (value === null || value === undefined || value === "") return "-";
    return `${formatMaybeNumber(Number(value) * 100, 1)}%`;
  }

  function localizedArray(item, zhKey, enKey) {
    const values = lang === "zh" ? item?.[zhKey] : item?.[enKey];
    return Array.isArray(values) ? values.filter(Boolean) : [];
  }

  function workbenchLink(companyId, label) {
    return `<a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(companyId || "")}">${escapeHtml(label || companyId || "-")}</a>`;
  }

  function groupedBy(values, keyFn) {
    const groups = new Map();
    (values || []).forEach((value) => {
      const key = keyFn(value);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(value);
    });
    return groups;
  }

  function renderMetrics() {
    const summary = state.payload.summary || {};
    elements.metrics.innerHTML = metricCards([
      { label: lang === "zh" ? "GHG 企业" : "GHG companies", value: formatInt(summary.ghg_protocol_company_count) },
      { label: lang === "zh" ? "显式系列企业" : "Explicit series companies", value: formatInt(summary.ghg_explicit_series_company_count) },
      { label: lang === "zh" ? "完整强证据排行" : "Complete strong-evidence ranking", value: formatInt(summary.complete_emissions_ranking_company_count) },
      { label: lang === "zh" ? "标准节点" : "Standard nodes", value: formatInt(summary.standard_count) },
      { label: lang === "zh" ? "技术聚类企业" : "Technology-cluster companies", value: formatInt(summary.technology_company_count) },
      { label: lang === "zh" ? "来源结构企业" : "Source-mix companies", value: formatInt(summary.source_mix_known_company_count) },
    ]);
  }

  function renderPolicy() {
    const policy = state.payload.policy || {};
    elements.policy.innerHTML = `
      <div class="table-card report-table-card reporting-policy-card">
        <div class="table-kicker">${escapeHtml(L.evidencePolicy)}</div>
        <h3>${escapeHtml(lang === "zh" ? "准确性边界" : "Accuracy Boundary")}</h3>
        <div class="reporting-policy-grid">
          ${["evidence", "ranking", "standard", "source_mix"].map((key) => `
            <article class="panel">
              <h4>${escapeHtml(key.replace("_", " ").toUpperCase())}</h4>
              <p>${escapeHtml(text(policy, `${key}_zh`, `${key}_en`, ""))}</p>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderGhg() {
    const payload = state.payload.ghg_standard_series || {};
    const seriesRows = (payload.series_summary || []).map((item) => [
      escapeHtml(text(item, "name_zh", "name_en")),
      escapeHtml(text(item, "category_zh", "category_en")),
      escapeHtml(text(item, "role_zh", "role_en")),
      escapeHtml(formatInt(item.company_count || 0)),
      escapeHtml(formatInt(item.explicit_company_count || 0)),
      escapeHtml(formatInt(item.evidence_count || 0)),
      escapeHtml(text(item, "principle_zh", "principle_en")),
    ]);

    const companies = (payload.company_mappings || [])
      .slice()
      .sort((a, b) => (b.explicit_series_count - a.explicit_series_count) || ((a.world500_rank || 9999) - (b.world500_rank || 9999)))
      .slice(0, 60);
    const companyRows = companies.map((item) => [
      escapeHtml(`#${item.world500_rank || "-"}`),
      workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
      escapeHtml(formatInt(item.explicit_series_count || 0)),
      escapeHtml(formatInt(item.generic_reference_count || 0)),
      escapeHtml((item.series || []).map((series) => `${text(series, "name_zh", "name_en")} (${series.match_status})`).join(" / ")),
      escapeHtml(joinList(unique((item.series || []).flatMap((series) => series.pages || [])))),
    ]);

    const taxonomyCards = [...groupedBy(payload.series_summary || [], (item) => item.category_key || "other").values()].map((items) => {
      const first = items[0] || {};
      return `
        <article class="reporting-ghg-family-card">
          <strong>${escapeHtml(text(first, "category_zh", "category_en"))}</strong>
          <div class="reporting-chip-list">
            ${items.map((item) => `<span>${escapeHtml(text(item, "name_zh", "name_en"))} · ${escapeHtml(formatInt(item.company_count || 0))}</span>`).join("")}
          </div>
        </article>
      `;
    }).join("");

    elements.ghg.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.ghgTitle)}</h2>
        <p>${escapeHtml(L.ghgLead)}</p>
      </div>
      <div class="reporting-ghg-family-grid">${taxonomyCards}</div>
      <div class="grid-2">
        <div class="table-card report-table-card">
          <div class="table-kicker">GHG Protocol</div>
          <h3>${escapeHtml(L.ghgTaxonomyTitle)}</h3>
          ${createTable(L.ghgSeriesHeaders, seriesRows, L.noData)}
        </div>
        <div class="table-card report-table-card">
          <div class="table-kicker">${escapeHtml(lang === "zh" ? "企业关联" : "Company Mapping")}</div>
          <h3>${escapeHtml(lang === "zh" ? "企业-系列证据映射 Top 60" : "Company-Series Evidence Mapping Top 60")}</h3>
          ${createTable(L.ghgCompanyHeaders, companyRows, L.noData)}
        </div>
      </div>
    `;
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function drawEmissionRankingGraph() {
    const graph = state.payload.emissions_ranking?.ranking_graph || {};
    const companies = graph.companies || [];
    if (!companies.length) return `<div class="entity-empty">${escapeHtml(L.noData)}</div>`;

    const width = 1180;
    const rowGap = 54;
    const height = Math.max(620, 130 + companies.length * rowGap);
    const center = { x: 150, y: height / 2 };
    const companyX = 500;
    const scopeX = 1010;
    const scopeNodes = graph.scope_nodes || [];
    const scopePositions = new Map(scopeNodes.map((scope, index) => [
      scope.id,
      { x: scopeX, y: center.y + (index - 1) * 135 },
    ]));
    const maxTotal = Math.max(1, ...companies.map((item) => Number(item.total_mtco2e || 0)));
    const companyPositions = new Map(companies.map((item, index) => [
      item.company_id,
      { x: companyX, y: 76 + index * rowGap },
    ]));

    const centerEdges = companies.map((item) => {
      const pos = companyPositions.get(item.company_id);
      return `<line class="reporting-ranking-edge" x1="${center.x}" y1="${center.y}" x2="${pos.x}" y2="${pos.y}" stroke="${escapeHtml(item.industry_color || "#98a1a8")}"></line>`;
    }).join("");

    const scopeEdges = companies.flatMap((item) => {
      const pos = companyPositions.get(item.company_id);
      return [
        ["scope1", item.scope1_mtco2e],
        ["scope2", item.scope2_mtco2e],
        ["scope3", item.scope3_mtco2e],
      ].filter(([, value]) => value !== null && value !== undefined && Number(value) > 0).map(([scopeId, value]) => {
        const scopePos = scopePositions.get(scopeId);
        const widthValue = 0.7 + Math.sqrt(Number(value || 0) / maxTotal) * 5;
        return `<line class="reporting-scope-edge" x1="${pos.x + 14}" y1="${pos.y}" x2="${scopePos.x - 42}" y2="${scopePos.y}" stroke-width="${widthValue}"></line>`;
      });
    }).join("");

    const companyNodes = companies.map((item) => {
      const pos = companyPositions.get(item.company_id);
      const radius = 7 + Math.sqrt(Number(item.total_mtco2e || 0) / maxTotal) * 24;
      const label = text(item, "company_name_zh", "company_name_en");
      const years = joinList(item.inventory_years || []);
      return `
        <g class="reporting-ranking-company">
          <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${escapeHtml(item.industry_color || "#98a1a8")}"></circle>
          <title>${escapeHtml(`#${item.evidence_rank} ${label} · ${formatMaybeNumber(item.total_mtco2e, 2)} MtCO2e · ${years}`)}</title>
          <text x="${pos.x + radius + 10}" y="${pos.y - 5}">#${escapeHtml(item.evidence_rank || "-")} ${escapeHtml(label.slice(0, 28))}</text>
          <text x="${pos.x + radius + 10}" y="${pos.y + 13}" class="reporting-ranking-value">${escapeHtml(formatMaybeNumber(item.total_mtco2e, 2))} MtCO2e</text>
        </g>
      `;
    }).join("");

    const scopeNodeHtml = scopeNodes.map((scope) => {
      const pos = scopePositions.get(scope.id);
      return `
        <g class="reporting-scope-node">
          <circle cx="${pos.x}" cy="${pos.y}" r="38" fill="${escapeHtml(scope.color || "#315f8c")}"></circle>
          <text x="${pos.x}" y="${pos.y - 5}" text-anchor="middle">${escapeHtml(text(scope, "label_zh", "label_en"))}</text>
          <text x="${pos.x}" y="${pos.y + 13}" text-anchor="middle">${escapeHtml(text(scope, "role_zh", "role_en").slice(0, 16))}</text>
        </g>
      `;
    }).join("");

    return `
      <svg class="reporting-ranking-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(L.rankingGraphTitle)}">
        <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="28" class="reporting-graph-bg"></rect>
        ${centerEdges}
        ${scopeEdges}
        <g class="reporting-ranking-center">
          <circle cx="${center.x}" cy="${center.y}" r="58"></circle>
          <text x="${center.x}" y="${center.y - 5}" text-anchor="middle">${escapeHtml(lang === "zh" ? "总排放" : "Total")}</text>
          <text x="${center.x}" y="${center.y + 15}" text-anchor="middle">${escapeHtml(formatInt(companies.length))}</text>
        </g>
        ${companyNodes}
        ${scopeNodeHtml}
      </svg>
    `;
  }

  function renderRanking() {
    const ranking = state.payload.emissions_ranking || {};
    const completeRows = (ranking.complete || []).map((item) => [
      escapeHtml(`#${item.complete_rank || item.available_rank || "-"}`),
      escapeHtml(`#${item.world500_rank || "-"}`),
      workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
      escapeHtml(text(item, "industry_section_zh", "industry_section_en")),
      escapeHtml(formatMaybeNumber(item.total_mtco2e, 2)),
      escapeHtml(formatMaybeNumber(item.scope1_mtco2e, 2)),
      escapeHtml(formatMaybeNumber(item.scope2_mtco2e, 2)),
      escapeHtml(item.scope2_method_en || "-"),
      escapeHtml(formatMaybeNumber(item.scope3_mtco2e, 2)),
      escapeHtml(joinList(item.inventory_years)),
      escapeHtml(text(item, "completeness_zh", "completeness_en")),
    ]);

    const partialRows = (ranking.available || [])
      .filter((item) => item.completeness_key !== "complete_scope123_strong_evidence_total")
      .slice(0, 40)
      .map((item) => [
        escapeHtml(`#${item.available_rank || "-"}`),
        workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
        escapeHtml(formatMaybeNumber(item.total_mtco2e, 2)),
        escapeHtml((item.selected_rows || []).map((row) => row.scope_en).join(" / ")),
        escapeHtml(joinList(item.missing_scopes)),
        escapeHtml(formatInt(item.conflict_excluded_row_count || 0)),
        escapeHtml(joinList(item.selected_evidence_pages)),
      ]);

    elements.ranking.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.rankingTitle)}</h2>
        <p>${escapeHtml(L.rankingLead)}</p>
      </div>
      <div class="table-card report-table-card">
        <div class="table-kicker">P1 KG</div>
        <h3>${escapeHtml(L.rankingGraphTitle)}</h3>
        <p class="table-lead">${escapeHtml(L.rankingGraphLead)}</p>
        <div class="reporting-ranking-graph-wrap">${drawEmissionRankingGraph()}</div>
        <p class="table-lead">${escapeHtml(text(ranking.ranking_graph || {}, "policy_zh", "policy_en", ""))}</p>
      </div>
      <div class="table-card report-table-card">
        <div class="table-kicker">P1</div>
        <h3>${escapeHtml(L.completeRanking)}</h3>
        ${createTable(L.rankingHeaders, completeRows, L.noData)}
      </div>
      <div class="table-card report-table-card" style="margin-top:18px">
        <div class="table-kicker">${escapeHtml(lang === "zh" ? "不混排" : "Not Mixed Into Main Ranking")}</div>
        <h3>${escapeHtml(L.partialRanking)}</h3>
        ${createTable(L.partialHeaders, partialRows, L.noData)}
      </div>
    `;
  }

  function polarPoint(cx, cy, rx, ry, angle) {
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  }

  function drawStandardGraph() {
    const graph = state.payload.standard_role_graph || {};
    const standards = graph.standards || [];
    const companies = graph.companies || [];
    const companyById = new Map(companies.map((item) => [item.company_id, item]));
    const selected = standards.find((item) => item.id === state.selectedStandardId) || standards[0];
    if (!selected) return "";
    state.selectedStandardId = selected.id;

    const width = 1160;
    const height = 720;
    const cx = 580;
    const cy = 350;
    const standardRadius = 145;
    const companyRx = 480;
    const companyRy = 265;
    const selectedCompanies = (selected.company_ids || []).map((id) => companyById.get(id)).filter(Boolean);
    const standardPositions = new Map();
    const companyPositions = new Map();
    standards.forEach((standard, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(standards.length, 1);
      standardPositions.set(standard.id, polarPoint(cx, cy, standardRadius, standardRadius * 0.72, angle));
    });
    selectedCompanies.forEach((company, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(selectedCompanies.length, 1);
      companyPositions.set(company.company_id, polarPoint(cx, cy, companyRx, companyRy, angle));
    });
    const selectedPos = standardPositions.get(selected.id);

    const edges = selectedCompanies.map((company) => {
      const pos = companyPositions.get(company.company_id);
      return `<line class="reporting-graph-edge" x1="${selectedPos.x}" y1="${selectedPos.y}" x2="${pos.x}" y2="${pos.y}" stroke="${escapeHtml(selected.color)}"></line>`;
    }).join("");

    const standardNodes = standards.map((standard) => {
      const pos = standardPositions.get(standard.id);
      const active = standard.id === selected.id ? " is-active" : "";
      const nodeTitle = [
        text(standard, "name_zh", "name_en"),
        text(standard, "family_zh", "family_en", ""),
        joinList(localizedArray(standard, "roles_zh", "roles_en")),
        joinList(localizedArray(standard, "principles_zh", "principles_en")),
        formatInt(standard.company_count),
      ].filter(Boolean).join(" · ");
      return `
        <g class="reporting-standard-node${active}" data-standard-id="${escapeHtml(standard.id)}" role="button" tabindex="0" aria-label="${escapeHtml(nodeTitle)}">
          <circle cx="${pos.x}" cy="${pos.y}" r="${standard.id === selected.id ? 24 : 18}" fill="${escapeHtml(standard.color)}"></circle>
          <title>${escapeHtml(nodeTitle)}</title>
          <text x="${pos.x}" y="${pos.y + 40}" text-anchor="middle">${escapeHtml(text(standard, "name_zh", "name_en").slice(0, 18))}</text>
        </g>
      `;
    }).join("");

    const companyNodes = selectedCompanies.map((company) => {
      const pos = companyPositions.get(company.company_id);
      const fill = company.industry_color || "#98a1a8";
      return `
        <g class="reporting-company-node">
          <circle cx="${pos.x}" cy="${pos.y}" r="12" fill="${escapeHtml(fill)}" opacity="0.28"></circle>
          <circle cx="${pos.x}" cy="${pos.y}" r="6.5" fill="#fffdfa" stroke="${escapeHtml(selected.color)}" stroke-width="2"></circle>
          <title>#${escapeHtml(company.world500_rank || "-")} ${escapeHtml(text(company, "company_name_zh", "company_name_en"))} · ${escapeHtml(text(company, "industry_section_zh", "industry_section_en"))}</title>
        </g>
      `;
    }).join("");

    return `
      <svg class="reporting-standard-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(L.standardGraphTitle)}">
        <rect x="22" y="22" width="${width - 44}" height="${height - 44}" rx="28" class="reporting-graph-bg"></rect>
        <ellipse cx="${cx}" cy="${cy}" rx="${companyRx}" ry="${companyRy}" class="reporting-graph-ring"></ellipse>
        <ellipse cx="${cx}" cy="${cy}" rx="${standardRadius + 70}" ry="${(standardRadius + 70) * 0.72}" class="reporting-graph-ring"></ellipse>
        ${edges}
        <g class="reporting-center-node">
          <circle cx="${cx}" cy="${cy}" r="58" fill="${escapeHtml(selected.color)}"></circle>
          <text x="${cx}" y="${cy - 4}" text-anchor="middle">${escapeHtml(lang === "zh" ? "标准族" : "Standard")}</text>
          <text x="${cx}" y="${cy + 18}" text-anchor="middle">${escapeHtml(formatInt(selected.company_count))}</text>
        </g>
        ${standardNodes}
        ${companyNodes}
      </svg>
    `;
  }

  function renderIndustryLegend() {
    const industries = (state.payload.standard_role_graph?.industries || []).slice(0, 12);
    return industries.map((item) => `
      <span class="reporting-legend-pill">
        <i style="background:${escapeHtml(item.color)}"></i>
        ${escapeHtml(`${item.code} ${text(item, "label_zh", "label_en")}`)}
      </span>
    `).join("");
  }

  function renderStandardGraph() {
    const graph = state.payload.standard_role_graph || {};
    const standards = graph.standards || [];
    if (!state.selectedStandardId && standards[0]) state.selectedStandardId = standards[0].id;
    const selected = standards.find((item) => item.id === state.selectedStandardId) || standards[0] || {};
    const options = standards.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === selected.id ? " selected" : ""}>${escapeHtml(text(item, "name_zh", "name_en"))} (${formatInt(item.company_count)})</option>`).join("");
    const metaLabels = lang === "zh"
      ? { family: "标准族", roles: "角色", principles: "原则", evidence: "关联事实/企业", hint: "提示：可点击图中的标准节点切换中心标准。" }
      : { family: "Family", roles: "Roles", principles: "Principles", evidence: "Evidence / Companies", hint: "Tip: click a standard node in the graph to switch the center standard." };
    elements.standardGraph.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.standardGraphTitle)}</h2>
        <p>${escapeHtml(L.standardGraphLead)}</p>
      </div>
      <div class="table-card report-table-card">
        <div class="reporting-graph-toolbar">
          <label class="entity-search workbench-search">
            <span>${escapeHtml(L.selectedStandard)}</span>
            <select id="reporting-standard-select">${options}</select>
          </label>
          <div class="reporting-mini-stat"><strong>${escapeHtml(L.companiesShown)}</strong><span>${escapeHtml(formatInt((selected.company_ids || []).length))}</span></div>
          <button class="btn alt reporting-fullscreen-btn" id="reporting-standard-fullscreen" type="button">${escapeHtml(L.standardFullscreen)}</button>
        </div>
        <div class="reporting-standard-meta">
          <article>
            <strong>${escapeHtml(metaLabels.family)}</strong>
            <span>${escapeHtml(text(selected, "family_zh", "family_en", "-"))}</span>
          </article>
          <article>
            <strong>${escapeHtml(metaLabels.roles)}</strong>
            <span>${escapeHtml(joinList(localizedArray(selected, "roles_zh", "roles_en")) || "-")}</span>
          </article>
          <article>
            <strong>${escapeHtml(metaLabels.principles)}</strong>
            <span>${escapeHtml(joinList(localizedArray(selected, "principles_zh", "principles_en")) || "-")}</span>
          </article>
          <article>
            <strong>${escapeHtml(metaLabels.evidence)}</strong>
            <span>${escapeHtml(`${formatInt(selected.fact_count || 0)} / ${formatInt((selected.company_ids || []).length)}`)}</span>
          </article>
        </div>
        <p class="reporting-graph-hint">${escapeHtml(metaLabels.hint)}</p>
        <div class="reporting-standard-graph-wrap">${drawStandardGraph()}</div>
        <div class="reporting-legend"><strong>${escapeHtml(L.industryLegend)}</strong>${renderIndustryLegend()}</div>
      </div>
    `;
    const select = document.getElementById("reporting-standard-select");
    if (select) {
      select.addEventListener("change", () => {
        state.selectedStandardId = select.value;
        renderStandardGraph();
      });
    }
    const fullscreenButton = document.getElementById("reporting-standard-fullscreen");
    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", async () => {
        const graphWrap = elements.standardGraph.querySelector(".reporting-standard-graph-wrap");
        if (!graphWrap || !graphWrap.requestFullscreen) {
          renderStatus(L.standardFullscreenUnavailable);
          return;
        }
        try {
          await graphWrap.requestFullscreen();
        } catch (error) {
          console.warn(error);
          renderStatus(L.standardFullscreenFailed);
        }
      });
    }
    elements.standardGraph.querySelectorAll(".reporting-standard-node").forEach((node) => {
      const activate = () => {
        const standardId = node.getAttribute("data-standard-id");
        if (!standardId || standardId === state.selectedStandardId) return;
        state.selectedStandardId = standardId;
        renderStandardGraph();
      };
      node.addEventListener("click", activate);
      node.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate();
      });
    });
  }

  function timelineHtml(counts) {
    const near = counts?.near || 0;
    const mid = counts?.mid || 0;
    const long = counts?.long || 0;
    const total = Math.max(near + mid + long, 1);
    return `
      <div class="reporting-timeline">
        <span style="width:${(near / total) * 100}%">${escapeHtml(L.near)}</span>
        <span style="width:${(mid / total) * 100}%">${escapeHtml(L.mid)}</span>
        <span style="width:${(long / total) * 100}%">${escapeHtml(L.long)}</span>
      </div>
    `;
  }

  function renderTechnology() {
    const payload = state.payload.technology_paths || {};
    const rows = (payload.clusters || []).map((item) => [
      `<strong style="color:${escapeHtml(item.color)}">${escapeHtml(text(item, "name_zh", "name_en"))}</strong>`,
      escapeHtml(formatInt(item.company_count || 0)),
      escapeHtml(formatInt(item.evidence_count || 0)),
      `<div class="reporting-chip-list">${(item.subtypes || []).map((subtype) => `<span>${escapeHtml(text(subtype, "label_zh", "label_en"))}: ${escapeHtml(formatInt(subtype.evidence_count || 0))}</span>`).join("")}</div>`,
      timelineHtml(item.timeline_counts),
      escapeHtml(`${formatInt(item.cost_signal_count || 0)} ${L.costSignals}`),
      escapeHtml(joinList(lang === "zh" ? item.standards_zh : item.standards_en)),
    ]);

    elements.technology.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.technologyTitle)}</h2>
        <p>${escapeHtml(L.technologyLead)}</p>
      </div>
      <div class="reporting-flow">
        ${(payload.flow || []).map((step, index) => `
          <article class="reporting-flow-step">
            <span>${index + 1}</span>
            <strong>${escapeHtml(text(step, "from_zh", "from_en"))} -> ${escapeHtml(text(step, "to_zh", "to_en"))}</strong>
            <p>${escapeHtml(text(step, "note_zh", "note_en"))}</p>
          </article>
        `).join("")}
      </div>
      <div class="table-card report-table-card" style="margin-top:18px">
        <div class="table-kicker">P2</div>
        <h3>${escapeHtml(lang === "zh" ? "技术族、细分方向、时间与成本信号" : "Technology Families, Subtypes, Time And Cost Signals")}</h3>
        ${createTable(L.techHeaders, rows, L.noData)}
      </div>
    `;
  }

  function renderBubbleChart() {
    const rows = (state.payload.primary_secondary_data?.bubbles || [])
      .filter((item) => item.known_source_evidence_count > 0 && item.primary_ratio_known !== null)
      .slice()
      .sort((a, b) => b.known_source_evidence_count - a.known_source_evidence_count);
    const width = 1120;
    const height = 540;
    const margin = { left: 70, right: 34, top: 40, bottom: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxY = Math.max(1, ...rows.map((item) => item.known_source_evidence_count || 0));
    const maxSize = Math.max(1, ...rows.map((item) => item.method_evidence_count || 0));
    const circles = rows.map((item) => {
      const x = margin.left + (item.primary_ratio_known || 0) * plotWidth;
      const y = margin.top + plotHeight - ((item.known_source_evidence_count || 0) / maxY) * plotHeight;
      const r = 4 + Math.sqrt((item.method_evidence_count || 0) / maxSize) * 20;
      return `
        <circle cx="${x}" cy="${y}" r="${r}" fill="${escapeHtml(item.industry_color || "#98a1a8")}" opacity="0.62" stroke="#17313e" stroke-opacity="0.22">
          <title>${escapeHtml(text(item, "company_name_zh", "company_name_en"))} · ${percent(item.primary_ratio_known)} · ${formatInt(item.known_source_evidence_count)} rows</title>
        </circle>
      `;
    }).join("");
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((tick) => {
      const x = margin.left + tick * plotWidth;
      return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotHeight}" class="reporting-axis-grid"></line><text x="${x}" y="${height - 42}" text-anchor="middle">${Math.round(tick * 100)}%</text>`;
    }).join("");
    return `
      <svg class="reporting-bubble-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(L.sourceMixTitle)}">
        <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="24" class="reporting-graph-bg"></rect>
        ${ticks}
        <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" class="reporting-axis"></line>
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="reporting-axis"></line>
        ${circles}
        <text x="${margin.left + plotWidth / 2}" y="${height - 16}" text-anchor="middle" class="reporting-axis-label">${escapeHtml(L.sourceMixAxisX)}</text>
        <text transform="translate(22 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" class="reporting-axis-label">${escapeHtml(L.sourceMixAxisY)}</text>
      </svg>
    `;
  }

  function renderSourceMix() {
    const payload = state.payload.primary_secondary_data || {};
    const rows = (payload.bubbles || [])
      .filter((item) => item.known_source_evidence_count > 0)
      .slice(0, 40)
      .map((item) => [
        workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
        escapeHtml(text(item, "industry_section_zh", "industry_section_en")),
        escapeHtml(percent(item.primary_ratio_known)),
        escapeHtml(percent(item.secondary_ratio_known)),
        escapeHtml(formatInt(item.known_source_evidence_count || 0)),
        escapeHtml(formatInt(item.unknown_count || 0)),
        escapeHtml(formatInt(item.method_evidence_count || 0)),
        escapeHtml(text(item, "quality_note_zh", "quality_note_en")),
      ]);
    elements.sourceMix.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.sourceMixTitle)}</h2>
        <p>${escapeHtml(L.sourceMixLead)}</p>
      </div>
      <div class="table-card report-table-card">
        <div class="table-kicker">P2</div>
        <h3>${escapeHtml(lang === "zh" ? "初级/次级数据来源结构气泡图" : "Primary / Secondary Source-Mix Bubble Chart")}</h3>
        <p class="table-lead">${escapeHtml(text(payload, "policy_zh", "policy_en"))}</p>
        <div class="reporting-bubble-wrap">${renderBubbleChart()}</div>
        ${createTable(L.sourceMixHeaders, rows, L.noData)}
      </div>
    `;
  }

  function render() {
    renderMetrics();
    renderPolicy();
    renderGhg();
    renderRanking();
    renderStandardGraph();
    renderTechnology();
    renderSourceMix();
    renderStatus(L.loaded);
  }

  async function init() {
    try {
      renderStatus(L.loading);
      state.payload = await fetchJson(`${assetBase}/reporting_views.json`);
      render();
    } catch (error) {
      console.error(error);
      renderStatus(L.loadError);
    }
  }

  init();
})();
