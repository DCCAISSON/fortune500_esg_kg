(async () => {
  const shared = window.World500WorkbenchShared;
  const config = window.WORKBENCH_CONFIG;
  if (!shared || !config) return;

  const {
    createTable,
    escapeHtml,
    fetchJson,
    formatInt,
    formatMaybeNumber,
    joinList,
    metricCards,
    parseQueryParam,
    pickText,
    updateQueryParam,
  } = shared;

  const lang = config.lang || "zh";
  const t = config.text || {};
  const assetBase = config.assetBase;
  const text = (key, zh, en) => t[key] || (lang === "zh" ? zh : en);

  const SCOPE3_CATEGORY_META = [
    ["1", "Category 1 Purchased goods and services", "类别1 购买的商品和服务"],
    ["2", "Category 2 Capital goods", "类别2 资本货物"],
    ["3", "Category 3 Fuel- and energy-related activities", "类别3 燃料和能源相关活动"],
    ["4", "Category 4 Upstream transportation and distribution", "类别4 上游运输与配送"],
    ["5", "Category 5 Waste generated in operations", "类别5 运营产生的废弃物"],
    ["6", "Category 6 Business travel", "类别6 商务差旅"],
    ["7", "Category 7 Employee commuting", "类别7 员工通勤"],
    ["8", "Category 8 Upstream leased assets", "类别8 上游租赁资产"],
    ["9", "Category 9 Downstream transportation and distribution", "类别9 下游运输与配送"],
    ["10", "Category 10 Processing of sold products", "类别10 已售产品加工"],
    ["11", "Category 11 Use of sold products", "类别11 已售产品使用"],
    ["12", "Category 12 End-of-life treatment of sold products", "类别12 已售产品报废处理"],
    ["13", "Category 13 Downstream leased assets", "类别13 下游租赁资产"],
    ["14", "Category 14 Franchises", "类别14 特许经营"],
    ["15", "Category 15 Investments", "类别15 投资"],
  ];

  const SECTION_PAGE_SIZES = {
    standards: 12,
    methods: 12,
    scope_authoritative: 10,
    scope_candidates: 12,
    scope3_matrix: 15,
    scope3: 12,
    accounting_inputs: 8,
    carbon_evidence: 12,
    method_query: 10,
    playbook: 6,
    industry_scope: 12,
    industry_scope3: 12,
    keywords: 8,
    evidence: 12,
  };

  const elements = {
    input: document.getElementById("company-workbench-search"),
    datalist: document.getElementById("company-workbench-options"),
    button: document.getElementById("company-workbench-open"),
    metrics: document.getElementById("company-workbench-metrics"),
    decision: document.getElementById("company-workbench-decision"),
    reportMatch: document.getElementById("company-workbench-report-match"),
    profile: document.getElementById("company-workbench-profile"),
    guidance: document.getElementById("company-workbench-guidance"),
    readiness: document.getElementById("company-workbench-readiness"),
    standards: document.getElementById("company-workbench-standards"),
    methods: document.getElementById("company-workbench-methods"),
    scope: document.getElementById("company-workbench-scope"),
    scope3: document.getElementById("company-workbench-scope3"),
    accountingInputs: document.getElementById("company-workbench-accounting-inputs"),
    carbonEvidence: document.getElementById("company-workbench-carbon-evidence"),
    playbook: document.getElementById("company-workbench-playbook"),
    industry: document.getElementById("company-workbench-industry"),
    keywords: document.getElementById("company-workbench-keywords"),
    evidence: document.getElementById("company-workbench-evidence"),
    status: document.getElementById("company-workbench-status"),
  };

  const state = {
    index: [],
    detailCache: new Map(),
    optionMap: new Map(),
    selectedCompanyId: "",
    currentDetail: null,
    sectionDisplay: {},
    keywordCatalog: [],
    keywordMap: new Map(),
    emissionLedger: {},
  };

  const SECTION_SOURCES = {
    standards: (detail) => detail.standards || [],
    methods: (detail) => detail.method_rows || [],
    scope_authoritative: (detail) => detail.authoritative_scope_rows || [],
    scope_candidates: (detail) => detail.scope_candidates || [],
    scope3_matrix: (detail) => buildScope3MatrixRows(detail),
    scope3: (detail) => detail.scope3_candidates || [],
    accounting_inputs: (detail) => detail.accounting_input_fact_rows || [],
    carbon_evidence: (detail) => detail.carbon_evidence_rows || [],
    method_query: (detail) => buildPlaybookRows(detail),
    playbook: (detail) => buildPlaybookRows(detail),
    industry_scope: (detail) => buildIndustryScopeRows(detail),
    industry_scope3: (detail) => buildIndustryScope3Rows(detail),
    keywords: (detail) => detail.keyword_summary || [],
    evidence: (detail) => detail.evidence_ledger || [],
  };

  function displayCompany(item) {
    const name = pickText(item, lang, "company_name_zh", "company_name_en", item.company_id || "-");
    const rank = item.world500_rank ? `#${item.world500_rank}` : "-";
    return `${name} (${rank})`;
  }

  function formatTemplate(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }

  function uniqueValues(values, limit = Infinity) {
    const results = [];
    const seen = new Set();
    for (const value of values || []) {
      const textValue = String(value || "").trim();
      if (!textValue || textValue.toLowerCase() === "nan" || seen.has(textValue)) continue;
      seen.add(textValue);
      results.push(textValue);
      if (results.length >= limit) break;
    }
    return results;
  }

  function renderStatus(message) {
    elements.status.innerHTML = `<div class="entity-empty">${escapeHtml(String(message || ""))}</div>`;
  }

  function buildOptions(companies) {
    state.optionMap.clear();
    const optionsHtml = companies
      .map((item) => {
        const label = displayCompany(item);
        state.optionMap.set(label.toLowerCase(), item.company_id);
        state.optionMap.set(String(item.company_id).toLowerCase(), item.company_id);
        return `<option value="${escapeHtml(label)}"></option>`;
      })
      .join("");
    elements.datalist.innerHTML = optionsHtml;
  }

  function getTargetCompanyId() {
    const raw = (elements.input.value || "").trim().toLowerCase();
    if (!raw) return "";
    return state.optionMap.get(raw) || raw;
  }

  function resetSectionDisplay() {
    state.sectionDisplay = {};
  }

  function ensureSectionWindow(sectionKey, total) {
    const pageSize = SECTION_PAGE_SIZES[sectionKey] || total || 0;
    const current = state.sectionDisplay[sectionKey];
    if (!current || current.companyId !== state.selectedCompanyId) {
      state.sectionDisplay[sectionKey] = {
        companyId: state.selectedCompanyId,
        visible: Math.min(pageSize, total),
      };
    } else if (current.visible > total) {
      current.visible = total;
    } else if (current.visible === 0 && total > 0) {
      current.visible = Math.min(pageSize, total);
    }
    return state.sectionDisplay[sectionKey];
  }

  function sliceSection(sectionKey, sourceItems) {
    const items = Array.isArray(sourceItems) ? sourceItems : [];
    const total = items.length;
    if (!total) {
      return { total: 0, visible: 0, items: [], pageSize: SECTION_PAGE_SIZES[sectionKey] || 0 };
    }
    const pageSize = SECTION_PAGE_SIZES[sectionKey] || total;
    const windowState = ensureSectionWindow(sectionKey, total);
    const visible = Math.min(windowState.visible, total);
    return {
      total,
      visible,
      items: items.slice(0, visible),
      pageSize,
    };
  }

  function renderSectionToolbar(sectionKey, total, visible, pageSize) {
    if (!total) return "";
    const actions = [];
    if (visible < total) {
      actions.push(
        `<button class="btn alt table-display-btn" type="button" data-section-action="more" data-section-key="${escapeHtml(sectionKey)}">${escapeHtml(t.action_more)}</button>`,
      );
    }
    if (visible > Math.min(pageSize, total)) {
      actions.push(
        `<button class="btn alt table-display-btn" type="button" data-section-action="reset" data-section-key="${escapeHtml(sectionKey)}">${escapeHtml(t.action_reset)}</button>`,
      );
    }
    return `
      <div class="table-display-toolbar">
        <div class="table-display-count">${escapeHtml(formatTemplate(t.display_status, { shown: visible, total }))}</div>
        ${actions.length ? `<div class="table-display-actions">${actions.join("")}</div>` : ""}
      </div>
    `;
  }

  function renderAuditDetails(summary, body, options = {}) {
    const note = options.note ? `<p class="entity-note">${escapeHtml(options.note)}</p>` : "";
    const openAttr = options.open ? " open" : "";
    return `
      <details class="workbench-audit-detail"${openAttr}>
        <summary>
          <span>${escapeHtml(summary)}</span>
          <small>${escapeHtml(text("audit_fold_hint", "点击展开审计明细", "Click to expand audit details"))}</small>
        </summary>
        ${note}
        ${body}
      </details>
    `;
  }

  function buildChipList(values) {
    const items = uniqueValues(values || [], 12);
    if (!items.length) return `<span class="entity-chip">${escapeHtml(t.no_data)}</span>`;
    return items.map((value) => `<span class="entity-chip">${escapeHtml(value)}</span>`).join("");
  }

  function findDirectScopeRow(detail, scopeName) {
    const normalized = String(scopeName || "").toLowerCase().replace(/\s+/g, "");
    return (detail.authoritative_scope_rows || []).find((row) => String(row.scope_en || "").toLowerCase().replace(/\s+/g, "") === normalized);
  }

  function countScopeCandidates(detail, scopeName) {
    const normalized = String(scopeName || "").toLowerCase().replace(/\s+/g, "");
    return (detail.scope_candidates || []).filter((row) => String(row.scope_en || "").toLowerCase().replace(/\s+/g, "") === normalized).length;
  }

  function renderDecisionPanel(detail) {
    if (!elements.decision) return;
    const scopeNames = ["Scope 1", "Scope 2", "Scope 3"];
    const directRows = detail.authoritative_scope_rows || [];
    const directCount = directRows.length;
    const candidateCount = detail.scope_candidate_count || (detail.scope_candidates || []).length;
    const missingDirect = scopeNames.filter((scopeName) => !findDirectScopeRow(detail, scopeName));
    const hasReport = Boolean(detail.has_matched_report);
    const hasCompleteDirectScopes = missingDirect.length === 0;
    const statusClass = !hasReport ? "is-gap" : hasCompleteDirectScopes ? "is-direct" : directCount || candidateCount ? "is-candidate" : "is-gap";
    const reportStatus = pickText(detail, lang, "report_match_label_zh", "report_match_label_en") || "-";
    const useTier = pickText(detail, lang, "enterprise_use_tier_zh", "enterprise_use_tier_en") || "-";
    const useTierDetail = pickText(detail, lang, "enterprise_use_tier_detail_zh", "enterprise_use_tier_detail_en") || t.no_data;
    const blocker = !hasReport
      ? text("decision_blocker_report", "母公司报告尚未匹配，不能进入源文件闭环。", "Parent-company report is not matched, so source traceability is not closed.")
      : missingDirect.length
        ? formatTemplate(
            text("decision_blocker_scope", "缺少直接采信值：{scopes}。", "Missing direct-use values: {scopes}."),
            { scopes: missingDirect.join(" / ") },
          )
        : text("decision_blocker_ready", "Scope 1/2/3 已有直接采信值；仍需查看 Scope 3 类别、因子、GWP 和能耗输入。", "Scope 1/2/3 have direct-use values; still check Scope 3 categories, factors, GWP, and energy inputs.");
    const methodChips = uniqueValues(lang === "zh" ? detail.calculation_methods_zh || [] : detail.calculation_methods_en || [], 8);
    const scopeCards = scopeNames
      .map((scopeName) => {
        const row = findDirectScopeRow(detail, scopeName);
        const scopeCandidateCount = countScopeCandidates(detail, scopeName);
        const cardClass = row ? "is-direct" : scopeCandidateCount ? "is-candidate" : "is-gap";
        const value = row
          ? `${formatMaybeNumber(row.value_mtco2e, 6)} MtCO2e`
          : scopeCandidateCount
            ? formatTemplate(text("decision_candidate_count", "{count} 条候选待验真", "{count} candidate rows pending review"), { count: scopeCandidateCount })
            : text("decision_no_direct_value", "无直接采信值", "No direct-use value");
        const meta = row
          ? [
              row.inventory_year ? `${text("inventory_year_label", "清单年份", "Inventory year")} ${row.inventory_year}` : "",
              pickText(row, lang, "scope2_reporting_method_zh", "scope2_reporting_method", "") || pickText(row, lang, "basis_zh", "basis_en", ""),
              row.evidence_page ? `${text("trace_page", "页码", "Page")} ${row.evidence_page}` : "",
            ]
              .filter(Boolean)
              .join(" | ")
          : text("decision_candidate_or_gap_note", "请查看下方候选值或缺口说明。", "Check candidate rows or gap notes below.");
        return `
          <div class="workbench-scope-card ${cardClass}">
            <span>${escapeHtml(scopeName)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(meta)}</small>
          </div>
        `;
      })
      .join("");

    elements.decision.innerHTML = `
      <div class="table-card report-table-card workbench-decision ${statusClass}">
        <div class="table-kicker">${escapeHtml(text("decision_kicker", "第一屏核算结论", "First-screen accounting decision"))}</div>
        <h3>${escapeHtml(text("decision_title", "这家公司当前能直接用于什么核算？", "What can this company be used for now?"))}</h3>
        <p class="table-lead">${escapeHtml(text("decision_lead", "这里把可直接采信值、候选值和缺口分开，不把证据命中误写成完整核算。", "This panel separates direct-use values, candidates, and gaps so evidence hits are not mistaken for complete accounting."))}</p>
        <div class="workbench-decision-grid">
          <div class="workbench-decision-main">
            <div class="decision-status-row">
              <span>${escapeHtml(text("decision_report_status", "报告状态", "Report status"))}</span>
              <strong>${escapeHtml(reportStatus)}</strong>
            </div>
            <div class="decision-status-row">
              <span>${escapeHtml(text("decision_use_tier", "企业可用层级", "Company usability tier"))}</span>
              <strong>${escapeHtml(useTier)}</strong>
            </div>
            <div class="decision-status-row">
              <span>${escapeHtml(text("decision_direct_count", "直接采信 Scope 行", "Direct-use Scope rows"))}</span>
              <strong>${escapeHtml(formatInt(directCount))}</strong>
            </div>
            <div class="decision-status-row">
              <span>${escapeHtml(text("decision_candidate_count_label", "待验真候选", "Candidates pending review"))}</span>
              <strong>${escapeHtml(formatInt(candidateCount))}</strong>
            </div>
            <p class="entity-note">${escapeHtml(useTierDetail)}</p>
            <p class="entity-note">${escapeHtml(blocker)}</p>
          </div>
          <div class="decision-scope-grid">${scopeCards}</div>
        </div>
        <h4 class="subtable-title">${escapeHtml(text("decision_method_summary", "报告中已识别的核算方法关键词", "Calculation methods identified in the report"))}</h4>
        <div class="chip-list">${buildChipList(methodChips)}</div>
      </div>
    `;
  }

  function splitListText(value) {
    return String(value || "")
      .split(/[|；;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function buildTraceCell(item) {
    const reportTitle = pickText(item, lang, "report_title_zh", "report_title_en", item.report_title || "");
    const page = item.evidence_page || item.page || "";
    const lines = [];
    if (reportTitle) {
      lines.push(`<div><strong>${escapeHtml(text("trace_report", "报告", "Report"))}</strong> ${escapeHtml(reportTitle)}</div>`);
    }
    if (item.source_file) {
      lines.push(`<div><strong>${escapeHtml(text("trace_file", "文件", "File"))}</strong> ${escapeHtml(item.source_file)}</div>`);
    }
    if (page) {
      lines.push(`<div><strong>${escapeHtml(text("trace_page", "页码", "Page"))}</strong> ${escapeHtml(String(page))}</div>`);
    }
    if (item.source_path) {
      lines.push(`<div class="cell-path"><strong>${escapeHtml(text("trace_path", "路径", "Path"))}</strong> ${escapeHtml(item.source_path)}</div>`);
    }
    return `<div class="cell-block">${lines.length ? lines.join("") : `<div>${escapeHtml(text("trace_missing", "暂无源文件定位", "No source trace"))}</div>`}</div>`;
  }

  function buildKeyValueCell(entries) {
    const lines = (entries || [])
      .filter((entry) => String(entry?.value || "").trim())
      .map(
        (entry) =>
          `<div><strong>${escapeHtml(entry.label)}</strong> ${escapeHtml(String(entry.value))}</div>`,
      );
    return `<div class="cell-block">${lines.length ? lines.join("") : `<div>${escapeHtml(t.no_data)}</div>`}</div>`;
  }

  function buildRecognitionCell(item, options = {}) {
    const blocks = [];
    if (options.showRecognition !== false) {
      const recognition = pickText(item, lang, "recognition_basis_zh", "recognition_basis_en", "");
      if (recognition) {
        blocks.push(`<div><strong>${escapeHtml(text("recognition_label", "判定依据", "Recognition basis"))}</strong> ${escapeHtml(recognition)}</div>`);
      }
    }
    if (options.showEstimateBasis) {
      const estimateBasis = pickText(item, lang, "estimate_basis_zh", "estimate_basis_en", "");
      if (estimateBasis) {
        blocks.push(`<div><strong>${escapeHtml(text("estimate_basis_label", "估算说明", "Estimate basis"))}</strong> ${escapeHtml(estimateBasis)}</div>`);
      }
    }
    const snippet = pickText(item, lang, "snippet_zh", "snippet_en", "");
    if (snippet) {
      blocks.push(`<div class="cell-snippet"><strong>${escapeHtml(text("source_text_label", "原文片段", "Source text"))}</strong> ${escapeHtml(snippet)}</div>`);
    }
    return `<div class="cell-block">${blocks.length ? blocks.join("") : `<div>${escapeHtml(t.no_data)}</div>`}</div>`;
  }

  function buildKeywordSummaryCell(item) {
    const chips = []
      .concat((item.keyword_labels_zh || []).map((value) => ({ value, key: value })))
      .slice(0, 6)
      .map((entry) => `<span class="entity-chip">${escapeHtml(entry.value)}</span>`)
      .join("");
    return chips ? `<div class="chip-list">${chips}</div>` : `<div>${escapeHtml(t.no_data)}</div>`;
  }

  function buildScopeOverview(detail) {
    const authoritativeLabels = uniqueValues((detail.authoritative_scope_rows || []).map((item) => pickText(item, lang, "scope_zh", "scope_en")));
    const candidateLabels = uniqueValues((detail.scope_candidates || []).map((item) => pickText(item, lang, "scope_zh", "scope_en")));
    const scope3Labels = uniqueValues((detail.scope3_candidates || []).map((item) => `${item.scope3_category_code || ""} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en")}`.trim()), 8);
    return [
      {
        label: text("guidance_scope_authoritative", "结构化 Scope", "Structured scope"),
        value: authoritativeLabels.length ? authoritativeLabels.join(" / ") : t.no_data,
      },
      {
        label: text("guidance_scope_candidates", "待复核 Scope", "Scope candidates"),
        value: candidateLabels.length ? candidateLabels.join(" / ") : t.no_data,
      },
      {
        label: text("guidance_scope3_candidates", "Scope 3 类别值", "Scope 3 category values"),
        value: scope3Labels.length ? scope3Labels.join(" / ") : t.no_data,
      },
      {
        label: text("guidance_accounting_inputs", "核算输入事实", "Accounting input facts"),
        value: formatInt(detail.accounting_input_fact_count || 0),
      },
    ];
  }

  function buildProfileCards(detail) {
    const useTier = pickText(detail, lang, "enterprise_use_tier_zh", "enterprise_use_tier_en") || "-";
    const useTierDetail = pickText(detail, lang, "enterprise_use_tier_detail_zh", "enterprise_use_tier_detail_en") || t.no_data;
    const items = [
      { label: t.profile_rank, value: detail.world500_rank ? `#${detail.world500_rank}` : "-" },
      { label: t.profile_industry, value: pickText(detail, lang, "industry_section_zh", "industry_section_en") || "-" },
      { label: t.profile_use_tier, value: useTier },
      { label: t.profile_reports, value: formatInt(detail.report_count || 0) },
      { label: t.profile_standards, value: formatInt(detail.standards_count || 0) },
      { label: t.profile_methods, value: formatInt(detail.method_rows_count || 0) },
      { label: t.profile_scope_candidates, value: formatInt(detail.scope_candidate_count || 0) },
    ];
    const chipGroups = [
      { title: t.group_standard_systems, values: lang === "zh" ? detail.standard_systems_zh : detail.standard_systems_en },
      { title: t.group_methods, values: lang === "zh" ? detail.calculation_methods_zh : detail.calculation_methods_en },
      { title: t.group_data_sources, values: lang === "zh" ? detail.data_source_types_zh : detail.data_source_types_en },
      { title: text("group_data_quality", "数据质量标记", "Data-quality flags"), values: lang === "zh" ? detail.data_quality_flags_zh : detail.data_quality_flags_en },
      { title: t.group_assurance, values: lang === "zh" ? detail.assurance_stages_zh : detail.assurance_stages_en },
      { title: text("group_boundary", "边界类型", "Boundary types"), values: lang === "zh" ? detail.boundary_types_zh : detail.boundary_types_en },
      { title: text("group_classification", "分类阶段", "Classification stages"), values: lang === "zh" ? detail.classification_stages_zh : detail.classification_stages_en },
      { title: t.group_activity, values: lang === "zh" ? detail.activity_categories_zh : detail.activity_categories_en },
    ];
    elements.profile.innerHTML = renderAuditDetails(
      text("profile_appendix_summary", "审计附录：企业画像与源文件元数据", "Audit appendix: company profile and source metadata"),
      `
        <div class="table-card report-table-card">
          <div class="table-kicker">${escapeHtml(t.profile_kicker)}</div>
          <h3>${escapeHtml(displayCompany(detail))}</h3>
          <p class="table-lead">${escapeHtml(t.profile_lead)}</p>
          <div class="metric-grid">${metricCards(items)}</div>
          <div class="panel-grid workbench-panel-grid" style="margin-top:16px;">
            <div class="panel">
              <h4>${escapeHtml(t.profile_use_tier)}</h4>
              <p>${escapeHtml(useTier)}</p>
              <p class="entity-note">${escapeHtml(useTierDetail)}</p>
            </div>
            <div class="panel">
              <h4>${escapeHtml(t.profile_report_titles)}</h4>
              <p>${escapeHtml(joinList(detail.report_titles || []))}</p>
            </div>
            <div class="panel">
              <h4>${escapeHtml(t.profile_source_files)}</h4>
              <p>${escapeHtml(joinList(detail.source_files || []))}</p>
            </div>
            <div class="panel">
              <h4>${escapeHtml(text("profile_source_paths", "源文件路径", "Source paths"))}</h4>
              <p>${escapeHtml(joinList(detail.source_paths || []))}</p>
            </div>
            <div class="panel">
              <h4>${escapeHtml(t.profile_mapping_basis)}</h4>
              <p>${escapeHtml(pickText(detail, lang, "industry_mapping_basis_zh", "industry_mapping_basis_en"))}</p>
            </div>
            <div class="panel">
              <h4>${escapeHtml(text("profile_registry_status", "注册表状态", "Registry status"))}</h4>
              <p>${escapeHtml(detail.registry_report_download_status || "-")}</p>
              <p class="entity-note">${escapeHtml(text("profile_registry_note", "P 表示报告待补或待确认，不等于已成功匹配到母公司主报告。", "P means the report workflow is pending and does not imply a validated parent-company report match."))}</p>
            </div>
          </div>
          <div class="panel-grid workbench-panel-grid" style="margin-top:16px;">
            ${chipGroups
              .map(
                (group) => `
                <div class="panel">
                  <h4>${escapeHtml(group.title)}</h4>
                  <div class="chip-list">${buildChipList(group.values || [])}</div>
                </div>
              `,
              )
              .join("")}
          </div>
        </div>
      `,
      {
        note: text(
          "profile_appendix_note",
          "企业画像用于解释数据来源和分类背景，不替代第一屏核算结论。",
          "The profile explains source and classification context; it does not replace the first-screen accounting decision.",
        ),
      },
    );
  }

  function renderReportMatch(detail) {
    const matchClass = String(detail.report_match_class || "unknown").replace(/_/g, "-");
    const panels = [
      {
        title: text("report_match_status_title", "报告匹配状态", "Report match status"),
        value: pickText(detail, lang, "report_match_label_zh", "report_match_label_en") || "-",
        note: pickText(detail, lang, "report_match_note_zh", "report_match_note_en") || t.no_data,
      },
      {
        title: text("report_publish_status_title", "图谱发布状态", "Published graph status"),
        value: detail.is_published_company
          ? text("report_publish_yes", "已纳入当前发布图谱", "Included in current published graph")
          : text("report_publish_no", "未纳入当前发布图谱", "Not included in current published graph"),
        note: detail.is_published_company
          ? text("report_publish_yes_note", "可继续查看该企业的图谱事实与工作台结构化字段。", "Graph facts and workbench fields are available for this company.")
          : text("report_publish_no_note", "本页当前仅能稳定展示注册表信息与匹配诊断，不会伪造缺失报告。", "This page currently exposes registry metadata and match diagnostics only; it does not fabricate a missing report."),
      },
    ];

    if (detail.matched_source_file || detail.matched_source_path) {
      panels.push({
        title: text("report_matched_source_title", "当前采用的源文件", "Matched source file"),
        value: detail.matched_source_file || detail.matched_source_path,
        note: pickText(detail, lang, "matched_source_origin_zh", "matched_source_origin_en") || t.no_data,
      });
    }
    if (detail.diagnosis_category_zh || detail.diagnosis_category_en) {
      panels.push({
        title: text("report_diagnosis_title", "未匹配诊断", "Unmatched diagnosis"),
        value: pickText(detail, lang, "diagnosis_category_zh", "diagnosis_category_en"),
        note: pickText(detail, lang, "diagnosis_note_zh", "diagnosis_note_en"),
      });
    }
    if (detail.review_queue_action_zh || detail.review_queue_action_en) {
      panels.push({
        title: text("report_action_title", "下一步处理", "Next review action"),
        value: pickText(detail, lang, "review_queue_action_zh", "review_queue_action_en"),
        note: `${text("report_queue_status_label", "队列状态", "Queue status")}: ${detail.review_queue_status || "-"}`,
      });
    }
    if (detail.seed_source_file) {
      panels.push({
        title: text("report_seed_title", "原始种子命中", "Original seed hit"),
        value: detail.seed_source_file,
        note: text("report_seed_note", "这是初始抓取命中，不代表已被确认可用。", "This is only the initial retrieval hit and does not mean it was accepted as a valid parent-company report."),
      });
    }

    elements.reportMatch.innerHTML = `
      <div class="table-card report-table-card workbench-status-card match-${escapeHtml(matchClass)}">
        <div class="table-kicker">${escapeHtml(text("report_status_kicker", "报告匹配与回链状态", "Report match and trace status"))}</div>
        <h3>${escapeHtml(text("report_status_main_title", "报告匹配诊断", "Report match diagnostics"))}</h3>
        <p class="table-lead">${escapeHtml(text("report_status_lead", "这一块先判断企业页是否有可安全引用的母公司报告，再决定后续标准、方法和数值能否进入核算指导链条。", "This section determines whether the page is grounded in a safely matched parent-company report before downstream standards, methods, and numeric facts are treated as accounting guidance."))}</p>
        <div class="panel-grid workbench-panel-grid">
          ${panels
            .map(
              (panel) => `
              <div class="panel">
                <h4>${escapeHtml(panel.title)}</h4>
                <p>${escapeHtml(panel.value || "-")}</p>
                <p class="entity-note">${escapeHtml(panel.note || t.no_data)}</p>
              </div>
            `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderGuidance(detail) {
    const scopeOverview = buildScopeOverview(detail);
    const panels = [
      {
        title: text("guidance_methods_title", "核算方法", "Calculation methods"),
        chips: lang === "zh" ? detail.calculation_methods_zh : detail.calculation_methods_en,
      },
      {
        title: text("guidance_standards_title", "标准与准则", "Standards and frameworks"),
        chips: lang === "zh" ? detail.standard_names_zh : detail.standard_names_en,
      },
      {
        title: text("guidance_data_class_title", "数据来源分类（四类）", "Data source classes"),
        chips: uniqueValues(lang === "zh" ? detail.data_source_classes_zh || [] : detail.data_source_classes_en || []),
      },
      {
        title: text("guidance_data_quality_title", "数据质量/处理标记", "Data-quality / processing flags"),
        chips: uniqueValues(lang === "zh" ? detail.data_quality_flags_zh || [] : detail.data_quality_flags_en || []),
      },
      {
        title: text("guidance_boundary_title", "边界、分类与核查", "Boundary, classification, and assurance"),
        chips: uniqueValues([
          ...(lang === "zh" ? detail.boundary_types_zh || [] : detail.boundary_types_en || []),
          ...(lang === "zh" ? detail.classification_stages_zh || [] : detail.classification_stages_en || []),
          ...(lang === "zh" ? detail.assurance_stages_zh || [] : detail.assurance_stages_en || []),
        ]),
      },
    ];

    elements.guidance.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(text("guidance_kicker", "核算指导总览", "Accounting guidance overview"))}</div>
        <h3>${escapeHtml(text("guidance_title", "把企业页从证据展示升级为核算工作台", "Turning the company page into an accounting workbench"))}</h3>
        <p class="table-lead">${escapeHtml(text("guidance_lead", "这里先汇总企业后续核算直接要用到的方法、标准、数据来源、质量标记和 Scope 覆盖情况，再往下看逐条原文追溯。", "This section summarizes the methods, standards, data sources, quality flags, and scope coverage needed for downstream accounting before the page drills into row-level source traceability."))}</p>
        <div class="panel-grid workbench-panel-grid">
          ${panels
            .map(
              (panel) => `
              <div class="panel">
                <h4>${escapeHtml(panel.title)}</h4>
                <div class="chip-list">${buildChipList(panel.chips)}</div>
              </div>
            `,
            )
            .join("")}
          <div class="panel">
            <h4>${escapeHtml(text("guidance_scope_title", "Scope 覆盖情况", "Scope coverage"))}</h4>
            ${scopeOverview
              .map(
                (item) => `
                <p><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.value || t.no_data)}</p>
              `,
              )
              .join("")}
          </div>
          <div class="panel">
            <h4>${escapeHtml(text("guidance_trace_title", "源文件透明度", "Source transparency"))}</h4>
            <p>${escapeHtml(joinList(detail.source_files || []))}</p>
            <p class="entity-note">${escapeHtml(joinList(detail.source_paths || []))}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderReadiness(detail) {
    if (!elements.readiness) return;
    const audit = detail.readiness_audit || {};
    const plan = detail.backfill_plan || {};
    const status = audit.readiness_status || detail.report_match_class || "unknown";
    const statusLabel = pickText(audit, lang, "readiness_status_zh", "readiness_status", status);
    const score = audit.readiness_score_max
      ? `${audit.readiness_score || 0} / ${audit.readiness_score_max}`
      : "-";
    const missingRequirements = splitListText(pickText(audit, lang, "missing_requirement_zh", "missing_requirement_keys", ""));
    const missingWorkstreams = splitListText(pickText(plan, lang, "missing_workstreams_zh", "missing_workstreams", ""));
    const statusClass = `readiness-${String(status || "unknown").replace(/_/g, "-")}`;
    const priorityLabel = pickText(plan, lang, "priority_group_zh", "priority_group", "");
    const primaryWorkstream = pickText(plan, lang, "primary_workstream_zh", "primary_workstream", "");
    const nextAction = pickText(plan, lang, "next_action_zh", "next_action_zh", "");
    const acceptanceNote = pickText(plan, lang, "acceptance_note_zh", "acceptance_note_zh", "");
    const scopeSet = audit.direct_scope_set || "";
    const missingCount = audit.missing_requirement_count ?? "-";

    elements.readiness.innerHTML = `
      <div class="table-card report-table-card readiness-card ${escapeHtml(statusClass)}">
        <div class="table-kicker">${escapeHtml(text("readiness_kicker", "核算就绪审计", "Accounting readiness audit"))}</div>
        <h3>${escapeHtml(text("readiness_title", "核算就绪与补齐计划", "Accounting readiness and backfill plan"))}</h3>
        <p class="table-lead">${escapeHtml(text("readiness_lead", "这里直接显示该企业距离“完整碳核算指导”的严格缺口，避免把候选值、证据图谱或源文件缺口误读成已完成核算。", "This panel shows the strict gaps between the current company record and full accounting guidance, so candidates, evidence-only records, and source gaps are not mistaken for complete accounting readiness."))}</p>
        <div class="panel-grid workbench-panel-grid">
          <div class="panel readiness-status-panel">
            <h4>${escapeHtml(text("readiness_status_title", "当前状态", "Current status"))}</h4>
            <p><strong>${escapeHtml(statusLabel || "-")}</strong></p>
            <p>${escapeHtml(text("readiness_score_label", "就绪分数", "Readiness score"))}: ${escapeHtml(score)}</p>
            <p>${escapeHtml(text("readiness_missing_label", "缺项数", "Missing requirements"))}: ${escapeHtml(String(missingCount))}</p>
            ${priorityLabel ? `<p>${escapeHtml(text("readiness_priority_label", "补齐优先级", "Backfill priority"))}: ${escapeHtml(priorityLabel)}</p>` : ""}
          </div>
          <div class="panel">
            <h4>${escapeHtml(text("readiness_scope_title", "Scope 直接采信覆盖", "Direct-use scope coverage"))}</h4>
            <p>${escapeHtml(scopeSet || t.no_data)}</p>
            <p class="entity-note">${escapeHtml(text("readiness_scope_note", "只有进入直接采信层的 Scope 1/2/3 才可作为后续核算输入；候选层仍需人工核验。", "Only direct-use Scope 1/2/3 values should be used as accounting inputs; candidate rows still require review."))}</p>
          </div>
          <div class="panel">
            <h4>${escapeHtml(text("readiness_workstream_title", "主阻塞工作流", "Primary blocker workstream"))}</h4>
            <p>${escapeHtml(primaryWorkstream || t.no_data)}</p>
            <div class="chip-list">${buildChipList(missingWorkstreams)}</div>
          </div>
          <div class="panel">
            <h4>${escapeHtml(text("readiness_next_title", "下一步动作", "Next action"))}</h4>
            <p>${escapeHtml(nextAction || t.no_data)}</p>
            ${acceptanceNote ? `<p class="entity-note">${escapeHtml(acceptanceNote)}</p>` : ""}
          </div>
        </div>
        <h4 class="subtable-title">${escapeHtml(text("readiness_missing_title", "未满足需求项", "Missing requirements"))}</h4>
        <div class="chip-list">${buildChipList(missingRequirements)}</div>
      </div>
    `;
  }

  function renderStandards(detail) {
    const view = sliceSection("standards", detail.standards || []);
    const companyName = displayCompany(detail);
    const standardEvidenceItems = (detail.standards || [])
      .filter((item) => {
        return (
          pickText(item, lang, "standard_name_zh", "standard_name_en", "") ||
          pickText(item, lang, "system_label_zh", "system_label_en", "") ||
          item.source_file ||
          item.evidence_page ||
          pickText(item, lang, "recognition_basis_zh", "recognition_basis_en", "")
        );
      })
      .slice(0, 4);
    const ghgTrace = (detail.standards || []).find((item) => {
      const standardName = pickText(item, lang, "standard_name_zh", "standard_name_en", "");
      const systemLabel = pickText(item, lang, "system_label_zh", "system_label_en", "");
      return /ghg/i.test(`${standardName} ${systemLabel}`);
    });
    const ghgTraceSource = ghgTrace
      ? [ghgTrace.source_file || ghgTrace.source_path || "", ghgTrace.evidence_page || ghgTrace.page ? `${text("trace_page", "页码", "Page")} ${ghgTrace.evidence_page || ghgTrace.page}` : ""]
          .filter(Boolean)
          .join(" | ")
      : "";
    const standardTraceNote = ghgTrace
      ? formatTemplate(
          text(
            "standards_trace_note_with_ghg",
            "{company} 当前存在 GHG 标准事实：它不是从数值表推断出来的，而是来自 standards 标准事实行，并回链到 {trace}。下方卡片展示该事实的体系、角色、判定依据和原文片段。",
            "{company} currently has a GHG standard fact. It is not inferred from numeric Scope rows; it comes from the standards fact row and traces back to {trace}. The cards below show the system, role, recognition basis, and source text for that fact.",
          ),
          { company: companyName, trace: ghgTraceSource || t.no_data },
        )
      : formatTemplate(
          text(
            "standards_trace_note_generic",
            "{company} 的标准挂接遵循同一规则：企业 -> 标准事实 -> 源报告页码/片段。若本企业没有 GHG 行，页面不会把它强行挂到 GHG 体系。",
            "{company}'s framework linkage follows the same rule: company -> standard fact -> source report page/snippet. If this company has no GHG row, the page does not force-link it to the GHG system.",
          ),
          { company: companyName },
        );
    const standardEvidenceCards = standardEvidenceItems.length
      ? `
        <div class="panel-grid workbench-panel-grid standards-trace-grid">
          ${standardEvidenceItems
            .map((item) => {
              const standardName = pickText(item, lang, "standard_name_zh", "standard_name_en", t.no_data);
              const systemLabel = pickText(item, lang, "system_label_zh", "system_label_en", t.no_data);
              const role = pickText(item, lang, "standard_role_zh", "standard_role_en", t.no_data);
              const page = item.evidence_page || item.page || "";
              const source = item.source_file || item.source_path || "";
              const recognition = pickText(item, lang, "recognition_basis_zh", "recognition_basis_en", "");
              const snippet = pickText(item, lang, "snippet_zh", "snippet_en", "");
              return `
                <article class="panel standard-trace-card">
                  <h4>${escapeHtml(standardName)}</h4>
                  <p><strong>${escapeHtml(text("standards_trace_system", "挂接体系", "Linked system"))}</strong> ${escapeHtml(systemLabel)}</p>
                  <p><strong>${escapeHtml(text("standards_trace_role", "标准角色", "Standard role"))}</strong> ${escapeHtml(role)}</p>
                  <p><strong>${escapeHtml(text("standards_trace_source", "证据回链", "Evidence trace"))}</strong> ${escapeHtml([source, page ? `${text("trace_page", "页码", "Page")} ${page}` : ""].filter(Boolean).join(" | ") || t.no_data)}</p>
                  ${recognition ? `<p><strong>${escapeHtml(text("recognition_label", "判定依据", "Recognition basis"))}</strong> ${escapeHtml(recognition)}</p>` : ""}
                  ${snippet ? `<p class="cell-snippet">${escapeHtml(snippet)}</p>` : ""}
                </article>
              `;
            })
            .join("")}
        </div>
      `
      : `<div class="entity-empty">${escapeHtml(text("standards_trace_empty", "暂无可展示的标准证据回链。", "No standard evidence trace is available."))}</div>`;
    const headers = [
      text("standards_h_system", "体系", "System"),
      text("standards_h_standard", "具体标准", "Specific standard"),
      text("standards_h_role", "角色", "Role"),
      text("standards_h_principle", "原则/准则", "Principle"),
      text("standards_h_trace", "原文定位", "Trace"),
      text("standards_h_basis", "判定依据与原文", "Recognition basis and source text"),
    ];
    const rows = view.items.map((item) => [
      escapeHtml(pickText(item, lang, "system_label_zh", "system_label_en")),
      escapeHtml(pickText(item, lang, "standard_name_zh", "standard_name_en")),
      escapeHtml(pickText(item, lang, "standard_role_zh", "standard_role_en")),
      escapeHtml(pickText(item, lang, "accounting_principle_zh", "accounting_principle_en")),
      buildTraceCell(item),
      buildRecognitionCell(item),
    ]);
    elements.standards.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.standards_kicker)}</div>
        <h3>${escapeHtml(t.standards_title)}</h3>
        <p class="table-lead">${escapeHtml(text("standards_lead_upgraded", "标准表就是企业与 GHG Protocol、ISO、披露准则等体系的连接层：只有当详情 JSON 中存在标准事实，并带有文件、页码、判定依据或原文片段时，页面才显示该标准挂接。证据总账只是同一事实的审计附录，不替代这里的标准判定。", "The standards table is the linkage layer between the company and frameworks such as GHG Protocol, ISO, and disclosure rules. A framework is shown only when the company detail JSON contains a standard fact with file, page, recognition basis, or source text. The evidence ledger is an audit appendix for the same facts, not a replacement for this standard judgment."))}</p>
        <div class="standard-linkage-note">
          <strong>${escapeHtml(text("standards_trace_title", "标准挂接如何被证明", "How framework linkage is proven"))}</strong>
          <span>${escapeHtml(standardTraceNote)}</span>
        </div>
        ${standardEvidenceCards}
        ${renderSectionToolbar("standards", view.total, view.visible, view.pageSize)}
        ${createTable(headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderMethods(detail) {
    const view = sliceSection("methods", detail.method_rows || []);
    const headers = [
      text("methods_h_scope", "Scope / 类别", "Scope / category"),
      text("methods_h_method", "方法", "Method"),
      text("methods_h_data", "数据来源与质量", "Data source and quality"),
      text("methods_h_boundary", "边界与分类", "Boundary and classification"),
      text("methods_h_assurance", "核查与活动", "Assurance and activity"),
      text("methods_h_trace", "原文定位", "Trace"),
      text("methods_h_basis", "判定依据与原文", "Recognition basis and source text"),
    ];
    const rows = view.items.map((item) => {
      const scopeLabel = [
        pickText(item, lang, "scope_zh", "scope_en", ""),
        item.scope3_category_code
          ? `${item.scope3_category_code} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en", "")}`.trim()
          : "",
      ]
        .filter(Boolean)
        .join(" / ");
      return [
        escapeHtml(scopeLabel || "-"),
        buildKeyValueCell([
          { label: text("method_label", "方法", "Method"), value: pickText(item, lang, "calculation_method_zh", "calculation_method_en", "") },
          { label: text("emission_type_label", "排放类型", "Emission type"), value: pickText(item, lang, "emission_type_zh", "emission_type_en", "") },
          { label: text("keyword_label", "关键词", "Keywords"), value: uniqueValues(lang === "zh" ? item.keyword_labels_zh || [] : item.keyword_labels_en || []).join(" / ") },
        ]),
        buildKeyValueCell([
          { label: text("data_source_class_label", "来源分类", "Source class"), value: pickText(item, lang, "data_source_class_zh", "data_source_class_en", "") || text("data_source_unclassified", "未明确披露/待人工确认", "Unclassified / review required") },
          { label: text("data_source_label", "原始来源标签", "Original source tag"), value: pickText(item, lang, "data_source_type_zh", "data_source_type_en", "") },
          { label: text("data_quality_label", "数据质量", "Data quality"), value: pickText(item, lang, "data_quality_flag_zh", "data_quality_flag_en", "") },
          { label: text("data_source_basis_label", "来源判定依据", "Source-class basis"), value: pickText(item, lang, "data_source_class_basis_zh", "data_source_class_basis_en", "") },
        ]),
        buildKeyValueCell([
          { label: text("boundary_label", "边界", "Boundary"), value: pickText(item, lang, "boundary_type_zh", "boundary_type_en", "") },
          { label: text("classification_label", "分类阶段", "Classification"), value: pickText(item, lang, "classification_stage_zh", "classification_stage_en", "") },
        ]),
        buildKeyValueCell([
          { label: text("assurance_label", "核查环节", "Assurance"), value: pickText(item, lang, "assurance_stage_zh", "assurance_stage_en", "") },
          { label: text("activity_label", "活动类别", "Activity"), value: [pickText(item, lang, "activity_standard_category_zh", "activity_standard_category_en", ""), pickText(item, lang, "activity_evidence_mapping_zh", "activity_evidence_mapping_en", "")].filter(Boolean).join(" / ") },
        ]),
        buildTraceCell(item),
        buildRecognitionCell(item, { showEstimateBasis: true }),
      ];
    });
    elements.methods.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.methods_kicker)}</div>
        <h3>${escapeHtml(t.methods_title)}</h3>
        <p class="table-lead">${escapeHtml(text("methods_lead_upgraded", "方法表现在把方法、数据来源、质量标记、边界、分类阶段、核查环节和原文回链放在一张表里，便于直接指导后续核算。", "The methods table now keeps method, data-source type, quality flag, boundary, classification stage, assurance, and source trace in one place for downstream accounting work."))}</p>
        ${renderSectionToolbar("methods", view.total, view.visible, view.pageSize)}
        ${createTable(headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderScope(detail) {
    const authoritativeView = sliceSection("scope_authoritative", detail.authoritative_scope_rows || []);
    const authoritativeHeaders = [
      text("scope_auth_h_scope", "Scope", "Scope"),
      text("scope_auth_h_value", "绝对量 MtCO2e", "Absolute MtCO2e"),
      text("scope_auth_h_share", "占比 %", "Share %"),
      text("scope_auth_h_entity", "年份/主体/口径", "Year / entity / method"),
      text("scope_auth_h_acceptance", "采信层级", "Acceptance"),
      text("scope_auth_h_trace", "原文定位", "Trace"),
      text("scope_auth_h_basis", "依据说明", "Basis note"),
    ];
    const authoritativeRows = authoritativeView.items.map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(item.share_percent === null || item.share_percent === undefined ? "-" : formatMaybeNumber(item.share_percent, 2)),
      buildKeyValueCell([
        { label: text("inventory_year_label", "清单年份", "Inventory year"), value: item.inventory_year || "" },
        { label: text("reporting_entity_label", "报告主体", "Reporting entity"), value: pickText(item, lang, "reporting_entity_zh", "reporting_entity_en", "") },
        { label: text("entity_level_label", "实体层级", "Entity level"), value: pickText(item, lang, "entity_type_zh", "entity_type_en") || item.entity_type || "" },
        { label: text("scope2_method_label", "Scope 2 口径", "Scope 2 method"), value: pickText(item, lang, "scope2_reporting_method_zh", "scope2_reporting_method", "") || pickText(item, lang, "basis_zh", "basis_en", "") },
      ]),
      buildKeyValueCell([
        { label: text("acceptance_label", "采信", "Acceptance"), value: pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en", "") },
        { label: text("verification_label", "验真", "Verification"), value: pickText(item, lang, "verification_reason_zh", "verification_reason_en", item.verification_status || "") },
      ]),
      buildTraceCell(item),
      buildKeyValueCell([
        { label: text("basis_note_label", "依据", "Basis"), value: pickText(item, lang, "basis_note_zh", "basis_note_en", "") },
      ]),
    ]);

    const candidateView = sliceSection("scope_candidates", detail.scope_candidates || []);
    const candidateHeaders = [
      text("scope_candidate_h_scope", "Scope", "Scope"),
      text("scope_candidate_h_basis", "口径/方法", "Basis / method"),
      text("scope_candidate_h_raw", "原文数值", "Raw value"),
      text("scope_candidate_h_converted", "折算 MtCO2e", "Converted MtCO2e"),
      text("scope_candidate_h_acceptance", "采信/优先级", "Acceptance / priority"),
      text("scope_candidate_h_trace", "原文定位", "Trace"),
      text("scope_candidate_h_rule", "提取规则与原文", "Extraction rule and source text"),
    ];
    const candidateRows = candidateView.items.map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      buildKeyValueCell([
        { label: text("scope_basis_label", "方法", "Method"), value: pickText(item, lang, "basis_zh", "basis_en", "") },
        { label: text("scope_boundary_label", "边界", "Boundary"), value: pickText(item, lang, "boundary_zh", "boundary_en", "") },
      ]),
      escapeHtml([item.value_text || "-", item.unit_raw || ""].filter(Boolean).join(" ")),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      buildKeyValueCell([
        { label: text("acceptance_label", "采信", "Acceptance"), value: pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en", "") },
        { label: text("priority_label", "优先级", "Priority"), value: pickText(item, lang, "priority_level_zh", "priority_level_en", "") },
        { label: text("verification_label", "验真", "Verification"), value: pickText(item, lang, "verification_reason_zh", "verification_reason_en", item.verification_status || "") },
      ]),
      buildTraceCell(item),
      buildRecognitionCell(
        {
          ...item,
          recognition_basis_en: item.extraction_rule_en,
          recognition_basis_zh: item.extraction_rule_zh,
        },
        { showEstimateBasis: false },
      ),
    ]);

    const candidateBlock = renderAuditDetails(
      t.scope_candidate_title,
      `
        ${renderSectionToolbar("scope_candidates", candidateView.total, candidateView.visible, candidateView.pageSize)}
        ${createTable(candidateHeaders, candidateRows, t.empty_table)}
      `,
      {
        note: text(
          "scope_candidate_fold_note",
          "这些是可追溯的原文数值候选，不等同于可直接采信的核算值；通过页码、年份、单位和边界复核后才可升级。",
          "These are traceable source-value candidates, not direct-use accounting values. They require review of page, year, unit, and boundary before promotion.",
        ),
      },
    );

    elements.scope.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope_kicker)}</div>
        <h3>${escapeHtml(t.scope_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope_lead)}</p>
        <h4 class="subtable-title">${escapeHtml(t.scope_authoritative_title)}</h4>
        ${renderSectionToolbar("scope_authoritative", authoritativeView.total, authoritativeView.visible, authoritativeView.pageSize)}
        ${createTable(authoritativeHeaders, authoritativeRows, t.empty_table)}
        ${candidateBlock}
      </div>
    `;
  }

  function rowsForScope3Category(rows, categoryCode) {
    return (rows || []).filter((row) => String(row.scope3_category_code || "").trim() === String(categoryCode));
  }

  function buildScope3MatrixRows(detail) {
    return SCOPE3_CATEGORY_META.map(([categoryCode, labelEn, labelZh]) => {
      const valueRows = rowsForScope3Category(detail.scope3_candidates || [], categoryCode);
      const methodRows = rowsForScope3Category(detail.method_rows || [], categoryCode);
      const bestValue = valueRows[0] || {};
      const evidenceRows = valueRows.length ? valueRows : methodRows;
      let statusKey = "not_assessed";
      let statusZh = "当前图谱未评估或未披露";
      let statusEn = "Not assessed or not disclosed in current graph";
      if (valueRows.length) {
        statusKey = "reported_value_candidate";
        statusZh = "有类别数值候选，待复核";
        statusEn = "Reported value candidate; review required";
      } else if (methodRows.length) {
        statusKey = "method_evidence_only";
        statusZh = "有类别/方法证据，暂无可用数值";
        statusEn = "Category or method evidence only; no usable value yet";
      }
      return {
        categoryCode,
        label_en: labelEn,
        label_zh: labelZh,
        statusKey,
        status_zh: statusZh,
        status_en: statusEn,
        valueRows,
        methodRows,
        bestValue,
        pages: uniqueValues(evidenceRows.map((row) => row.evidence_page || row.page), 8),
        sourceFiles: uniqueValues(evidenceRows.map((row) => row.source_file), 5),
        methods: uniqueValues(
          evidenceRows.map((row) =>
            pickText(row, lang, "category_method_zh", "category_method_en", "") ||
            pickText(row, lang, "calculation_method_zh", "calculation_method_en", "") ||
            pickText(row, lang, "activity_standard_category_zh", "activity_standard_category_en", ""),
          ),
          5,
        ),
      };
    });
  }

  function renderScope3(detail) {
    const matrixRowsAll = buildScope3MatrixRows(detail);
    const matrixView = sliceSection("scope3_matrix", matrixRowsAll);
    const statusCounts = matrixRowsAll.reduce((acc, row) => {
      acc[row.statusKey] = (acc[row.statusKey] || 0) + 1;
      return acc;
    }, {});
    const matrixHeaders = [
      text("scope3_matrix_h_category", "15 类类别", "Fifteen categories"),
      text("scope3_matrix_h_status", "当前状态", "Current status"),
      text("scope3_matrix_h_value", "类别值", "Category value"),
      text("scope3_matrix_h_method", "方法/场景", "Method / scenario"),
      text("scope3_matrix_h_trace", "原文定位", "Source trace"),
    ];
    const matrixRows = matrixView.items.map((item) => {
      const value = item.bestValue || {};
      return [
        buildKeyValueCell([
          { label: text("scope3_category_label", "类别", "Category"), value: `${item.categoryCode} ${pickText(item, lang, "label_zh", "label_en")}` },
          { label: text("scope3_matrix_candidate_count", "数值候选", "Value candidates"), value: item.valueRows.length ? String(item.valueRows.length) : "" },
          { label: text("scope3_matrix_method_count", "方法证据", "Method evidence"), value: item.methodRows.length ? String(item.methodRows.length) : "" },
        ]),
        buildKeyValueCell([
          { label: text("scope3_matrix_status_label", "状态", "Status"), value: pickText(item, lang, "status_zh", "status_en") },
          { label: text("scope3_matrix_direct_label", "可直接核算", "Direct accounting use"), value: item.statusKey === "reported_value_candidate" ? text("no_review_required", "否，仍需复核", "No, review required") : text("no_label", "否", "No") },
        ]),
        buildKeyValueCell([
          { label: text("scope3_h_raw", "原文数值", "Raw value"), value: [value.value_text || "", value.unit_context || ""].filter(Boolean).join(" ") },
          { label: text("scope3_h_converted", "折算 MtCO2e", "Converted MtCO2e"), value: value.value_mtco2e === null || value.value_mtco2e === undefined || value.value_mtco2e === "" ? "" : formatMaybeNumber(value.value_mtco2e, 6) },
          { label: text("acceptance_label", "采信", "Acceptance"), value: pickText(value, lang, "acceptance_tier_zh", "acceptance_tier_en", "") },
        ]),
        buildKeyValueCell([
          { label: text("scope3_method_label", "类别方法", "Category method"), value: item.methods.join(" / ") },
          { label: text("scope_boundary_label", "边界", "Boundary"), value: pickText(value, lang, "boundary_zh", "boundary_en", "") },
        ]),
        buildKeyValueCell([
          { label: text("trace_page", "页码", "Page"), value: item.pages.join(" / ") },
          { label: text("trace_file", "文件", "File"), value: item.sourceFiles.join(" / ") },
        ]),
      ];
    });

    const view = sliceSection("scope3", detail.scope3_candidates || []);
    const headers = [
      text("scope3_h_category", "Scope 3 类别", "Scope 3 category"),
      text("scope3_h_raw", "原文数值", "Raw value"),
      text("scope3_h_converted", "折算 MtCO2e", "Converted MtCO2e"),
      text("scope3_h_acceptance", "采信/优先级", "Acceptance / priority"),
      text("scope3_h_comparable", "行业可比样本", "Comparable companies"),
      text("scope3_h_trace", "原文定位", "Trace"),
      text("scope3_h_rule", "提取规则与原文", "Extraction rule and source text"),
    ];
    const rows = view.items.map((item) => [
      buildKeyValueCell([
        { label: text("scope3_category_label", "类别", "Category"), value: `${item.scope3_category_code || "-"} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en")}` },
        { label: text("scope3_method_label", "类别方法", "Category method"), value: pickText(item, lang, "category_method_zh", "category_method_en", "") },
        { label: text("scope_boundary_label", "边界", "Boundary"), value: pickText(item, lang, "boundary_zh", "boundary_en", "") },
      ]),
      escapeHtml([item.value_text || "-", item.unit_context || ""].filter(Boolean).join(" ")),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      buildKeyValueCell([
        { label: text("acceptance_label", "采信", "Acceptance"), value: pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en", "") },
        { label: text("priority_label", "优先级", "Priority"), value: pickText(item, lang, "priority_level_zh", "priority_level_en", "") },
        { label: text("verification_label", "验真", "Verification"), value: pickText(item, lang, "verification_reason_zh", "verification_reason_en", item.verification_status || "") },
      ]),
      escapeHtml(formatInt(item.industry_comparable_company_count || 0)),
      buildTraceCell(item),
      buildRecognitionCell(
        {
          ...item,
          recognition_basis_en: item.extraction_rule_en,
          recognition_basis_zh: item.extraction_rule_zh,
        },
        { showEstimateBasis: false },
      ),
    ]);
    const candidateBlock = renderAuditDetails(
      text("scope3_candidate_title", "Scope 3 类别值候选明细", "Scope 3 category value candidate details"),
      `
        ${renderSectionToolbar("scope3", view.total, view.visible, view.pageSize)}
        ${createTable(headers, rows, t.empty_table)}
      `,
      {
        note: text(
          "scope3_candidate_fold_note",
          "矩阵用于判断十五类状态；候选明细只作为审校入口，不能直接等同于已完成十五类核算。",
          "The matrix indicates fifteen-category status. Candidate details are review inputs and should not be read as completed fifteen-category accounting.",
        ),
      },
    );

    elements.scope3.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope3_kicker)}</div>
        <h3>${escapeHtml(t.scope3_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope3_lead)}</p>
        <div class="graph-summary-strip">
          <div class="graph-summary-chip">
            <strong>${escapeHtml(text("scope3_matrix_chip_value", "有数值候选", "Value candidates"))}</strong>
            <span>${escapeHtml(formatInt(statusCounts.reported_value_candidate || 0))}</span>
          </div>
          <div class="graph-summary-chip">
            <strong>${escapeHtml(text("scope3_matrix_chip_method", "仅方法证据", "Method evidence only"))}</strong>
            <span>${escapeHtml(formatInt(statusCounts.method_evidence_only || 0))}</span>
          </div>
          <div class="graph-summary-chip">
            <strong>${escapeHtml(text("scope3_matrix_chip_missing", "未评估/未披露", "Not assessed/disclosed"))}</strong>
            <span>${escapeHtml(formatInt(statusCounts.not_assessed || 0))}</span>
          </div>
        </div>
        <h4 class="subtable-title">${escapeHtml(text("scope3_matrix_title", "Scope 3 十五类状态矩阵", "Scope 3 fifteen-category status matrix"))}</h4>
        <p class="entity-note">${escapeHtml(text("scope3_matrix_note", "矩阵中的“未评估/未披露”表示当前图谱尚无可溯源事实，不能反向断定企业报告一定没有披露。", "A not-assessed/not-disclosed status means the current graph has no traceable fact for that category; it is not proof that the report contains no disclosure."))}</p>
        ${renderSectionToolbar("scope3_matrix", matrixView.total, matrixView.visible, matrixView.pageSize)}
        ${createTable(matrixHeaders, matrixRows, t.empty_table)}
        ${candidateBlock}
      </div>
    `;
  }

  function renderAccountingInputs(detail) {
    if (!elements.accountingInputs) return;
    const view = sliceSection("accounting_inputs", detail.accounting_input_fact_rows || []);
    const headers = [
      text("input_h_type", "事实类型", "Fact type"),
      text("input_h_label", "核算输入", "Accounting input"),
      text("input_h_scope", "Scope / 年份", "Scope / year"),
      text("input_h_value", "披露值", "Disclosed value"),
      text("input_h_trace", "原文定位", "Trace"),
      text("input_h_basis", "判定依据与原文", "Basis and source text"),
    ];
    const rows = view.items.map((item) => [
      escapeHtml(pickText(item, lang, "fact_type_zh", "fact_type_en")),
      escapeHtml(pickText(item, lang, "label_zh", "label_en")),
      buildKeyValueCell([
        { label: "Scope", value: pickText(item, lang, "scope_zh", "scope_en", "") },
        { label: text("input_inventory_year", "清单年份", "Inventory year"), value: item.inventory_year || "" },
        { label: text("input_target_year", "目标年份", "Target year"), value: item.target_year || "" },
      ]),
      buildKeyValueCell([
        { label: text("input_value_text", "原文值", "Text value"), value: item.value_text || "" },
        { label: text("input_numeric", "数值", "Numeric"), value: item.value_numeric === null || item.value_numeric === undefined ? "" : formatMaybeNumber(item.value_numeric, 4) },
        { label: text("input_unit", "单位", "Unit"), value: [item.unit || "", item.currency || ""].filter(Boolean).join(" ") },
      ]),
      buildTraceCell(item),
      buildRecognitionCell(item, { showEstimateBasis: false }),
    ]);
    const inputCards = metricCards([
      { label: text("input_metric_gwp", "GWP 版本", "GWP version"), value: formatInt(detail.gwp_version_fact_count || 0) },
      { label: text("input_metric_energy", "能耗活动数据", "Energy activity data"), value: formatInt(detail.energy_consumption_fact_count || 0) },
      { label: text("input_metric_economic", "经济工具", "Economic instruments"), value: formatInt(detail.economic_instrument_fact_count || 0) },
      { label: text("input_metric_target", "目标进度链", "Target progress chain"), value: formatInt(detail.target_fact_count || 0) },
    ]);
    elements.accountingInputs.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(text("inputs_kicker", "核算输入补齐状态", "Accounting input gap status"))}</div>
        <h3>${escapeHtml(text("inputs_title", "GWP、能耗、经济工具与目标进度链", "GWP, energy, economic instruments, and target progress chain"))}</h3>
        <p class="table-lead">${escapeHtml(text("inputs_lead", "这一层只展示已通过人工或严格规则采信、且带源文件、页码和依据说明的核算输入事实；为 0 表示当前报告未披露或尚未严格采信，不能自行推断。", "This layer only shows accepted accounting input facts with source file, page, and basis. A zero means the report has not disclosed it or it has not yet been strictly accepted; it must not be inferred."))}</p>
        <div class="metric-grid">${inputCards}</div>
        ${renderSectionToolbar("accounting_inputs", view.total, view.visible, view.pageSize)}
        ${createTable(headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderCarbonEvidence(detail) {
    if (!elements.carbonEvidence) return;
    const summary = detail.carbon_evidence_summary || {};
    const view = sliceSection("carbon_evidence", detail.carbon_evidence_rows || []);
    const headers = [
      text("carbon_evidence_h_category", "证据分层", "Evidence class"),
      text("carbon_evidence_h_acceptance", "采信状态", "Acceptance status"),
      text("carbon_evidence_h_fact", "事实/标签", "Fact / label"),
      text("carbon_evidence_h_trace", "原文定位", "Trace"),
      text("carbon_evidence_h_basis", "判定依据与原文", "Basis and source text"),
    ];
    const rows = view.items.map((item) => [
      buildKeyValueCell([
        { label: text("carbon_evidence_category_label", "类别", "Class"), value: pickText(item, lang, "evidence_category_zh", "evidence_category_en", "") },
        { label: text("carbon_evidence_direct_label", "可直接核算", "Direct use"), value: item.direct_accounting_use ? text("yes_label", "是", "Yes") : text("no_label", "否", "No") },
        { label: text("carbon_evidence_review_label", "需复核", "Review"), value: item.review_required ? text("yes_label", "是", "Yes") : text("no_label", "否", "No") },
      ]),
      buildKeyValueCell([
        { label: text("carbon_evidence_acceptance_label", "状态", "Status"), value: pickText(item, lang, "acceptance_status_zh", "acceptance_status_en", "") },
        { label: text("carbon_evidence_context_label", "碳语境", "Carbon context"), value: item.carbon_context_detected ? text("yes_label", "是", "Yes") : text("no_label", "否", "No") },
      ]),
      buildKeyValueCell([
        { label: text("carbon_evidence_fact_type_label", "事实类型", "Fact type"), value: pickText(item, lang, "fact_type_zh", "fact_type_en", "") },
        { label: text("carbon_evidence_label_label", "标签", "Label"), value: pickText(item, lang, "label_zh", "label_en", "") },
        { label: text("carbon_evidence_value_label", "披露值", "Disclosed value"), value: [item.value_text || "", item.value_numeric || "", item.unit || ""].filter(Boolean).join(" ") },
      ]),
      buildTraceCell(item),
      buildRecognitionCell(item, { showEstimateBasis: false }),
    ]);
    const cards = metricCards([
      { label: text("carbon_evidence_metric_total", "证据行", "Evidence rows"), value: formatInt(summary.carbon_evidence_count || 0) },
      { label: text("carbon_evidence_metric_scope", "Scope 数值证据", "Scope value evidence"), value: formatInt(summary.scope_value_evidence_count || 0) },
      { label: text("carbon_evidence_metric_method", "方法/标准证据", "Method/standard evidence"), value: formatInt(summary.methodology_evidence_count || 0) },
      { label: text("carbon_evidence_metric_context", "碳相关背景", "Carbon context"), value: formatInt(summary.carbon_related_evidence_count || 0) },
      { label: text("carbon_evidence_metric_rejected", "不可采信", "Not accepted"), value: formatInt(summary.not_accepted_evidence_count || 0) },
      { label: text("carbon_evidence_metric_direct", "可直接核算", "Direct-use"), value: formatInt(summary.direct_accounting_use_count || 0) },
    ]);
    elements.carbonEvidence.innerHTML = renderAuditDetails(
      text("carbon_evidence_appendix_summary", "审计附录：碳证据审计层", "Audit appendix: carbon evidence audit layer"),
      `
        <div class="table-card report-table-card">
          <div class="table-kicker">${escapeHtml(text("carbon_evidence_kicker", "碳证据审计层", "Carbon evidence audit layer"))}</div>
          <h3>${escapeHtml(text("carbon_evidence_title", "先分清：碳相关、方法学、Scope 数值、不可采信", "Separate carbon context, methodology, Scope values, and rejected evidence first"))}</h3>
          <p class="table-lead">${escapeHtml(text("carbon_evidence_lead", "这一层不把所有命中混在一起：Scope 数值、方法/标准、普通碳相关背景和不可采信证据分开显示；只有直接采信 Scope 值才能作为核算数值输入。", "This layer prevents mixed evidence: Scope values, method/standard evidence, contextual carbon evidence, and rejected evidence are separated. Only accepted Scope values are direct numeric accounting inputs."))}</p>
          <div class="metric-grid">${cards}</div>
          ${renderSectionToolbar("carbon_evidence", view.total, view.visible, view.pageSize)}
          ${createTable(headers, rows, t.empty_table)}
        </div>
      `,
      {
        note: text(
          "carbon_evidence_appendix_note",
          "这一块用于审计和追溯，不替代上方的 Scope 直接采信数值表。",
          "This appendix is for audit and traceability; it does not replace the direct-use Scope value table above.",
        ),
      },
    );
  }

  function buildPlaybookRows(detail) {
    const localKeys = uniqueValues([
      ...(detail.keyword_summary || []).map((item) => item.key),
      ...(detail.method_rows || []).flatMap((item) => item.keyword_keys || []),
    ]);
    return localKeys
      .map((key) => {
        const globalItem = state.keywordMap.get(key) || {};
        const localItem = (detail.keyword_summary || []).find((item) => item.key === key) || {};
        const companyEvidenceRows = (globalItem.evidence_rows || []).filter((row) => row.company_id === detail.company_id);
        return {
          key,
          family: globalItem.family || localItem.family || "",
          label_zh: globalItem.label_zh || localItem.label_zh || key,
          label_en: globalItem.label_en || localItem.label_en || key,
          guide_zh: globalItem.guide_zh || "",
          guide_en: globalItem.guide_en || "",
          formula_zh: globalItem.formula_zh || "",
          formula_en: globalItem.formula_en || "",
          scenarios_zh: globalItem.scenarios_zh || "",
          scenarios_en: globalItem.scenarios_en || "",
          companyEvidenceRows,
          pages: uniqueValues(companyEvidenceRows.map((row) => row.evidence_page), 8),
          reportTitles: uniqueValues(companyEvidenceRows.map((row) => pickText(row, lang, "report_title_zh", "report_title_en", row.report_title || "")), 5),
          hit_count: companyEvidenceRows.length || localItem.hit_count || 0,
        };
      })
      .sort((a, b) => b.hit_count - a.hit_count || String(a.label_en).localeCompare(String(b.label_en)));
  }

  function renderMethodPlaybook(detail) {
    const playbookRows = buildPlaybookRows(detail);
    const queryView = sliceSection("method_query", playbookRows);
    const view = sliceSection("playbook", playbookRows);
    const queryHeaders = [
      text("method_query_h_method", "方法", "Method"),
      text("method_query_h_recipe", "计算逻辑/场景", "Calculation logic / scenario"),
      text("method_query_h_hits", "出现次数与位置", "Hits and locations"),
      text("method_query_h_reports", "报告与原文样例", "Reports and source examples"),
    ];
    const queryRows = queryView.items.map((item) => {
      const example = (item.companyEvidenceRows || [])[0] || {};
      return [
        buildKeyValueCell([
          { label: text("method_query_method_label", "方法", "Method"), value: pickText(item, lang, "label_zh", "label_en") },
          { label: text("method_query_family_label", "类型", "Family"), value: item.family || "" },
        ]),
        buildKeyValueCell([
          { label: text("playbook_formula", "计算式", "Formula"), value: pickText(item, lang, "formula_zh", "formula_en", "") },
          { label: text("playbook_scenarios", "适用场景", "Scenarios"), value: pickText(item, lang, "scenarios_zh", "scenarios_en", "") },
          { label: text("playbook_guide", "怎么用", "How to use"), value: pickText(item, lang, "guide_zh", "guide_en", "") },
        ]),
        buildKeyValueCell([
          { label: text("playbook_hit_count", "企业命中", "Company hits"), value: String(item.hit_count || 0) },
          { label: text("trace_page", "页码", "Page"), value: (item.pages || []).join(" / ") },
        ]),
        buildKeyValueCell([
          { label: text("playbook_reports", "出现报告", "Reports"), value: joinList(item.reportTitles || []) },
          { label: text("recognition_label", "判定依据", "Recognition basis"), value: pickText(example, lang, "recognition_basis_zh", "recognition_basis_en", "") },
          { label: text("source_text_label", "原文片段", "Source text"), value: pickText(example, lang, "snippet_zh", "snippet_en", "") },
        ]),
      ];
    });
    const cards = view.items.map((item) => {
      const evidenceHtml = item.companyEvidenceRows
        .slice(0, 3)
        .map(
          (row) => `
          <div class="entity-evidence-item">
            <div class="entity-evidence-head">
              <strong>${escapeHtml(pickText(row, lang, "report_title_zh", "report_title_en", row.report_title || "-"))}</strong>
              <span>${escapeHtml(text("trace_page", "页码", "Page"))} ${escapeHtml(row.evidence_page || "-")}</span>
            </div>
            <p>${escapeHtml(pickText(row, lang, "recognition_basis_zh", "recognition_basis_en", ""))}</p>
            <p class="cell-snippet">${escapeHtml(pickText(row, lang, "snippet_zh", "snippet_en", ""))}</p>
            ${row.source_path ? `<p class="entity-note">${escapeHtml(row.source_path)}</p>` : ""}
          </div>
        `,
        )
        .join("");
      return `
        <div class="panel workbench-playbook-card">
          <h4>${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</h4>
          <div class="chip-list">
            <span class="entity-chip">${escapeHtml(text("playbook_hit_count", "企业命中", "Company hits"))} ${escapeHtml(String(item.hit_count || 0))}</span>
            ${(item.pages || []).map((page) => `<span class="entity-chip">${escapeHtml(text("trace_page", "页码", "Page"))} ${escapeHtml(page)}</span>`).join("")}
          </div>
          <p><strong>${escapeHtml(text("playbook_guide", "怎么用", "How to use"))}</strong> ${escapeHtml(pickText(item, lang, "guide_zh", "guide_en", t.no_data))}</p>
          <p><strong>${escapeHtml(text("playbook_formula", "计算式", "Formula"))}</strong> ${escapeHtml(pickText(item, lang, "formula_zh", "formula_en", t.no_data))}</p>
          <p><strong>${escapeHtml(text("playbook_scenarios", "适用场景", "Scenarios"))}</strong> ${escapeHtml(pickText(item, lang, "scenarios_zh", "scenarios_en", t.no_data))}</p>
          <p><strong>${escapeHtml(text("playbook_reports", "出现报告", "Reports"))}</strong> ${escapeHtml(joinList(item.reportTitles || []))}</p>
          <div class="entity-evidence-block">
            <h4>${escapeHtml(text("playbook_examples", "本企业原文命中", "Company evidence hits"))}</h4>
            ${evidenceHtml || `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`}
          </div>
        </div>
      `;
    });
    elements.playbook.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(text("playbook_kicker", "方法词典与原文命中", "Method playbook and source hits"))}</div>
        <h3>${escapeHtml(text("playbook_title", "市场法、支出法、PCAF 等方法如何在这家企业里被识别", "How market-based, spend-based, PCAF, and related methods are identified for this company"))}</h3>
        <p class="table-lead">${escapeHtml(text("playbook_lead", "这里把全局方法词典里的“怎么计算、适用什么场景”与当前企业的原文命中位置合并展示。", "This section merges the global method dictionary with the current company’s report hits so the accounting recipe and its source evidence appear together."))}</p>
        <h4 class="subtable-title">${escapeHtml(text("method_query_title", "方法原文查询摘要", "Method source-query summary"))}</h4>
        <p class="entity-note">${escapeHtml(text("method_query_note", "这里回答“市场法、位置法、支出法、PCAF 等方法在该企业报告中出现几次、在哪些页、原文怎么识别”。", "This table answers how many times market-based, location-based, spend-based, PCAF, and related methods appear, where they appear, and how the source text was recognized."))}</p>
        ${renderSectionToolbar("method_query", queryView.total, queryView.visible, queryView.pageSize)}
        ${createTable(queryHeaders, queryRows, t.empty_table)}
        <h4 class="subtable-title">${escapeHtml(text("method_playbook_cards_title", "方法说明卡片", "Method guidance cards"))}</h4>
        ${renderSectionToolbar("playbook", view.total, view.visible, view.pageSize)}
        <div class="panel-grid workbench-panel-grid">${cards.length ? cards.join("") : `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`}</div>
      </div>
    `;
  }

  function buildIndustryScopeRows(detail) {
    const targetCode = String(detail.industry_section_code || "").trim();
    return (state.emissionLedger.scope_industry_summary || [])
      .filter((item) => String(item.industry_section_code || "").trim() === targetCode)
      .sort((a, b) => Number(b.company_count || 0) - Number(a.company_count || 0) || String(a.scope_en || "").localeCompare(String(b.scope_en || "")));
  }

  function buildIndustryScope3Rows(detail) {
    const targetCode = String(detail.industry_section_code || "").trim();
    return (state.emissionLedger.scope3_industry_summary || [])
      .filter((item) => String(item.industry_section_code || "").trim() === targetCode)
      .sort((a, b) => Number(b.company_count || 0) - Number(a.company_count || 0) || String(a.scope3_category_code || "").localeCompare(String(b.scope3_category_code || "")));
  }

  function renderIndustryLayer(detail) {
    const scopeView = sliceSection("industry_scope", buildIndustryScopeRows(detail));
    const scope3View = sliceSection("industry_scope3", buildIndustryScope3Rows(detail));
    const scopeHeaders = [
      text("industry_scope_h_scope", "Scope", "Scope"),
      text("industry_scope_h_basis", "口径/方法", "Basis / method"),
      text("industry_scope_h_companies", "企业数", "Companies"),
      text("industry_scope_h_total", "合计 MtCO2e", "Total MtCO2e"),
    ];
    const scopeRows = scopeView.items.map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "basis_zh", "basis_en")),
      escapeHtml(formatInt(item.company_count || 0)),
      escapeHtml(formatMaybeNumber(item.total_mtco2e, 6)),
    ]);
    const scope3Headers = [
      text("industry_scope3_h_category", "Scope 3 类别", "Scope 3 category"),
      text("industry_scope3_h_companies", "企业数", "Companies"),
      text("industry_scope3_h_total", "合计 MtCO2e", "Total MtCO2e"),
    ];
    const scope3Rows = scope3View.items.map((item) => [
      escapeHtml(`${item.scope3_category_code || "-"} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en")}`),
      escapeHtml(formatInt(item.company_count || 0)),
      escapeHtml(formatMaybeNumber(item.total_mtco2e, 6)),
    ]);
    elements.industry.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(text("industry_kicker", "行业与类别数值层", "Industry and category numeric layer"))}</div>
        <h3>${escapeHtml(text("industry_title", "行业数值层把图谱浏览变成核算工作台", "Using industry numeric layers to turn graph browsing into an accounting workbench"))}</h3>
        <p class="table-lead">${escapeHtml(text("industry_lead", "以下汇总基于当前已发布的结构化 Scope 和 Scope 3 类别数值层，只统计已经进入当前 workbench 数值层的企业。", "The summaries below are built from the currently published structured scope and Scope 3 category numeric layers, and only count companies that have already entered the present workbench numeric layer."))}</p>
        <div class="graph-summary-strip">
          <div class="graph-summary-chip">
            <strong>${escapeHtml(text("industry_chip_section", "行业门类", "Industry section"))}</strong>
            <span>${escapeHtml(`${detail.industry_section_code || "-"} ${pickText(detail, lang, "industry_section_zh", "industry_section_en", "")}`.trim() || "-")}</span>
          </div>
          <div class="graph-summary-chip">
            <strong>${escapeHtml(text("industry_chip_scope_rows", "Scope 汇总行", "Scope summary rows"))}</strong>
            <span>${escapeHtml(formatInt(scopeView.total || 0))}</span>
          </div>
          <div class="graph-summary-chip">
            <strong>${escapeHtml(text("industry_chip_scope3_rows", "Scope 3 汇总行", "Scope 3 summary rows"))}</strong>
            <span>${escapeHtml(formatInt(scope3View.total || 0))}</span>
          </div>
        </div>
        <h4 class="subtable-title">${escapeHtml(text("industry_scope_title", "行业 Scope 数值汇总", "Industry scope summary"))}</h4>
        ${renderSectionToolbar("industry_scope", scopeView.total, scopeView.visible, scopeView.pageSize)}
        ${createTable(scopeHeaders, scopeRows, t.empty_table)}
        <h4 class="subtable-title">${escapeHtml(text("industry_scope3_title", "行业 Scope 3 类别汇总", "Industry Scope 3 category summary"))}</h4>
        ${renderSectionToolbar("industry_scope3", scope3View.total, scope3View.visible, scope3View.pageSize)}
        ${createTable(scope3Headers, scope3Rows, t.empty_table)}
      </div>
    `;
  }

  function renderKeywords(detail) {
    const view = sliceSection("keywords", detail.keyword_summary || []);
    const cards = view.items.map(
      (item) => `
      <div class="panel">
        <h4>${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</h4>
        <p>${escapeHtml((lang === "zh" ? item.sample_scope_zh : item.sample_scope_en).join(" / ") || t.no_data)}</p>
        <div class="chip-list">
          <span class="entity-chip">${escapeHtml(t.keyword_hit_count)} ${escapeHtml(String(item.hit_count || 0))}</span>
          ${(item.pages || []).map((page) => `<span class="entity-chip">${escapeHtml(t.keyword_page)} ${escapeHtml(page)}</span>`).join("")}
        </div>
      </div>
    `,
    );
    elements.keywords.innerHTML = renderAuditDetails(
      text("keywords_appendix_summary", "审计附录：方法关键词命中", "Audit appendix: method keyword hits"),
      `
        <div class="table-card report-table-card">
          <div class="table-kicker">${escapeHtml(t.keywords_kicker)}</div>
          <h3>${escapeHtml(t.keywords_title)}</h3>
          <p class="table-lead">${escapeHtml(t.keywords_lead)}</p>
          ${renderSectionToolbar("keywords", view.total, view.visible, view.pageSize)}
          <div class="panel-grid workbench-panel-grid">${cards.length ? cards.join("") : `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`}</div>
        </div>
      `,
    );
  }

  function renderEvidence(detail) {
    const view = sliceSection("evidence", detail.evidence_ledger || []);
    const html = view.items.length
      ? view.items
          .map(
            (item) => `
            <article class="entity-evidence-item">
              <div class="entity-evidence-head">
                <strong>${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</strong>
                <span>${escapeHtml(text("trace_page", "页码", "Page"))} ${escapeHtml(item.page || item.evidence_page || "-")}</span>
              </div>
              <div class="entity-evidence-meta">
                <span>${escapeHtml(pickText(item, lang, "fact_type_zh", "fact_type_en"))}</span>
                <span>${escapeHtml(item.source_file || "-")}</span>
                ${item.source_path ? `<span>${escapeHtml(item.source_path)}</span>` : ""}
                ${pickText(item, lang, "data_source_class_zh", "data_source_class_en") ? `<span>${escapeHtml(text("evidence_data_source_class", "来源分类", "Source class"))} ${escapeHtml(pickText(item, lang, "data_source_class_zh", "data_source_class_en"))}</span>` : ""}
                ${pickText(item, lang, "data_quality_flag_zh", "data_quality_flag_en") ? `<span>${escapeHtml(text("evidence_data_quality", "质量标记", "Quality flag"))} ${escapeHtml(pickText(item, lang, "data_quality_flag_zh", "data_quality_flag_en"))}</span>` : ""}
                ${pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") ? `<span>${escapeHtml(t.evidence_acceptance)} ${escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en"))}</span>` : ""}
                <span>${escapeHtml(t.evidence_confidence)} ${escapeHtml(item.confidence_level || "-")}</span>
                <span>${escapeHtml(t.evidence_review)} ${escapeHtml(item.review_status || "-")}</span>
              </div>
              <p>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</p>
              ${pickText(item, lang, "data_source_class_basis_zh", "data_source_class_basis_en") ? `<p>${escapeHtml(pickText(item, lang, "data_source_class_basis_zh", "data_source_class_basis_en"))}</p>` : ""}
              <p class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</p>
            </article>
          `,
          )
          .join("")
      : `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`;
    elements.evidence.innerHTML = renderAuditDetails(
      text("evidence_appendix_summary", "审计附录：完整证据回链总账", "Audit appendix: full evidence ledger"),
      `
        <div class="table-card report-table-card">
          <div class="table-kicker">${escapeHtml(t.evidence_kicker)}</div>
          <h3>${escapeHtml(t.evidence_title)}</h3>
          <p class="table-lead">${escapeHtml(text("evidence_lead_upgraded", "证据总账现在保留文件路径，便于从企业页直接回到本地源文件。", "The evidence ledger now keeps source paths so the page can trace back to the local report files directly."))}</p>
          ${renderSectionToolbar("evidence", view.total, view.visible, view.pageSize)}
          <div class="graph-summary-list">${html}</div>
        </div>
      `,
    );
  }

  function renderDetail(detail, options = {}) {
    const preserveSectionState = Boolean(options.preserveSectionState) && state.currentDetail && state.currentDetail.company_id === detail.company_id;
    if (!preserveSectionState) {
      resetSectionDisplay();
    }
    state.currentDetail = detail;
    elements.input.value = displayCompany(detail);
    elements.metrics.innerHTML = metricCards([
      { label: t.metric_company_tier, value: pickText(detail, lang, "enterprise_use_tier_zh", "enterprise_use_tier_en") || "-" },
      { label: t.metric_authoritative_scope, value: formatInt(detail.authoritative_scope_count || 0) },
      { label: t.metric_standards, value: formatInt(detail.standards_count || 0) },
      { label: t.metric_methods, value: formatInt(detail.method_rows_count || 0) },
      { label: t.metric_keywords, value: formatInt(detail.keyword_summary_count || 0) },
      { label: t.metric_scope_values, value: formatInt(detail.scope_candidate_count || 0) },
      { label: t.metric_scope3_values, value: formatInt(detail.scope3_candidate_count || 0) },
      { label: text("metric_accounting_inputs", "核算输入事实", "Accounting inputs"), value: formatInt(detail.accounting_input_fact_count || 0) },
      { label: text("metric_carbon_evidence", "碳证据审计层", "Carbon evidence audit layer"), value: formatInt(detail.carbon_evidence_count || 0) },
    ]);
    renderDecisionPanel(detail);
    renderReportMatch(detail);
    buildProfileCards(detail);
    renderGuidance(detail);
    renderReadiness(detail);
    renderStandards(detail);
    renderMethods(detail);
    renderScope(detail);
    renderScope3(detail);
    renderAccountingInputs(detail);
    renderCarbonEvidence(detail);
    renderMethodPlaybook(detail);
    renderIndustryLayer(detail);
    renderKeywords(detail);
    renderEvidence(detail);
    renderStatus(`${displayCompany(detail)} | ${t.loaded_ok}`);
  }

  async function loadCompany(companyId) {
    const targetId = String(companyId || "").trim();
    if (!targetId) return;
    state.selectedCompanyId = targetId;
    updateQueryParam("company", targetId);
    if (state.detailCache.has(targetId)) {
      renderDetail(state.detailCache.get(targetId));
      return;
    }
    renderStatus(t.loading);
    const detail = await fetchJson(`${assetBase}/companies/${encodeURIComponent(targetId)}.json`);
    state.detailCache.set(targetId, detail);
    renderDetail(detail);
  }

  async function init() {
    renderStatus(t.loading);
    const [index, keywordPayload, emissionPayload] = await Promise.all([
      fetchJson(`${assetBase}/company_workbench.json`),
      fetchJson(`${assetBase}/method_keyword_trace.json`),
      fetchJson(`${assetBase}/emission_ledger.json`),
    ]);
    state.index = index.companies || [];
    state.keywordCatalog = keywordPayload.keywords || [];
    state.keywordMap = new Map(state.keywordCatalog.map((item) => [item.key, item]));
    state.emissionLedger = emissionPayload || {};
    buildOptions(state.index);
    const fromQuery = parseQueryParam("company");
    const initialCompany = state.index.find((item) => item.company_id === fromQuery) || state.index[0];
    if (!initialCompany) {
      renderStatus(t.no_data);
      return;
    }
    await loadCompany(initialCompany.company_id);
  }

  elements.button.addEventListener("click", async () => {
    const targetId = getTargetCompanyId();
    if (!targetId) {
      renderStatus(t.invalid_company);
      return;
    }
    await loadCompany(targetId);
  });

  elements.input.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const targetId = getTargetCompanyId();
    if (!targetId) {
      renderStatus(t.invalid_company);
      return;
    }
    await loadCompany(targetId);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section-action][data-section-key]");
    if (!button || !state.currentDetail) return;
    const sectionKey = String(button.getAttribute("data-section-key") || "");
    const action = String(button.getAttribute("data-section-action") || "");
    const sourceItems = SECTION_SOURCES[sectionKey] ? SECTION_SOURCES[sectionKey](state.currentDetail) : [];
    const total = Array.isArray(sourceItems) ? sourceItems.length : 0;
    if (!sectionKey || !total) return;
    const pageSize = SECTION_PAGE_SIZES[sectionKey] || total;
    const windowState = ensureSectionWindow(sectionKey, total);
    if (action === "more") {
      windowState.visible = Math.min(total, windowState.visible + pageSize);
    } else if (action === "reset") {
      windowState.visible = Math.min(pageSize, total);
    } else {
      return;
    }
    renderDetail(state.currentDetail, { preserveSectionState: true });
  });

  init().catch((error) => {
    console.error(error);
    renderStatus(t.load_error);
  });
})();
