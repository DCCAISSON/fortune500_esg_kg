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
    scope_review: 10,
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
    globalAudit: document.getElementById("company-workbench-global-audit"),
    metrics: document.getElementById("company-workbench-metrics"),
    decision: document.getElementById("company-workbench-decision"),
    reportMatch: document.getElementById("company-workbench-report-match"),
    readiness: document.getElementById("company-workbench-readiness"),
    standards: document.getElementById("company-workbench-standards"),
    methods: document.getElementById("company-workbench-methods"),
    scope: document.getElementById("company-workbench-scope"),
    scope3: document.getElementById("company-workbench-scope3"),
    status: document.getElementById("company-workbench-status"),
  };

  const state = {
    index: [],
    overview: null,
    readinessSummary: null,
    upgradePlan: null,
    expandedScopeEvidenceCache: new Map(),
    detailCache: new Map(),
    optionMap: new Map(),
    selectedCompanyId: "",
    currentDetail: null,
    sectionDisplay: {},
    evidenceDrawerItems: new Map(),
    evidenceDrawerSeq: 0,
  };

  const SECTION_SOURCES = {
    standards: (detail) => detail.standards || [],
    methods: (detail) => detail.method_rows || [],
    scope_authoritative: (detail) => strongDirectScopeRows(detail),
    scope_review: (detail) => reviewDirectScopeRows(detail),
    scope_candidates: (detail) => detail.scope_candidates || [],
    scope3_matrix: (detail) => buildScope3MatrixRows(detail),
    scope3: (detail) => detail.scope3_candidates || [],
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

  async function fetchOptionalJson(path) {
    try {
      return await fetchJson(path);
    } catch (error) {
      console.warn(error);
      return null;
    }
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

  function formatCountPair(value, total) {
    const safeValue = value === null || value === undefined || value === "" ? "-" : formatInt(value);
    const safeTotal = total === null || total === undefined || total === "" ? "-" : formatInt(total);
    return `${safeValue}/${safeTotal}`;
  }

  function renderGlobalAudit() {
    if (!elements.globalAudit) return;
    const overview = state.overview || {};
    const readiness = state.readinessSummary || {};
    const upgrade = state.upgradePlan || {};
    const companySummary = overview.company_summary || {};
    const evidenceSummary = overview.carbon_evidence_summary || {};
    const upgradeCounts = upgrade.counts || {};
    const totalCompanies = readiness.company_count || companySummary.company_count || evidenceSummary.company_count || state.index.length || 500;
    const fullReady = readiness.full_accounting_ready_company_count ?? 0;
    const partialReady = readiness.candidate_or_partial_company_count ?? companySummary.companies_with_authoritative_scope_rows ?? 0;
    const evidenceOnly = readiness.evidence_graph_only_company_count ?? 0;
    const sourceGaps = readiness.source_gap_company_count ?? companySummary.unmatched_report_company_count ?? upgradeCounts.P0_report_source_closure ?? 0;
    const authoritativeScopeRows = evidenceSummary.direct_accounting_use_rows ?? 0;
    const matchedReports = companySummary.matched_report_company_count ?? companySummary.published_company_count ?? 0;
    const directScopeGap = readiness.missing_requirement_counts?.has_direct_scope_1_2_3;
    const scope2DualGap = readiness.missing_requirement_counts?.has_scope2_dual_method;
    const scope3Gap = readiness.missing_requirement_counts?.has_scope3_15_category_layer;
    const factorGap = readiness.missing_requirement_counts?.has_emission_factor_application;
    const targetGap = readiness.missing_requirement_counts?.has_target_progress_chain;
    const cards = [
      {
        tone: "risk",
        label: text("global_metric_full_ready", "Full accounting ready", "Full accounting ready"),
        value: formatCountPair(fullReady, totalCompanies),
        note: text("global_metric_full_ready_note", "Strict full-guidance status; do not present as 500 complete.", "Strict full-guidance status; do not present as 500 complete."),
      },
      {
        tone: "ok",
        label: text("global_metric_traceable", "Matched source reports", "Matched source reports"),
        value: formatCountPair(matchedReports, totalCompanies),
        note: text("global_metric_traceable_note", "Companies with parent-report source closure for traceable evidence.", "Companies with parent-report source closure for traceable evidence."),
      },
      {
        tone: "ok",
        label: text("global_metric_direct_rows", "Direct-use Scope values", "Direct-use Scope values"),
        value: formatInt(authoritativeScopeRows),
        note: text("global_metric_direct_rows_note", "Rows accepted as structured accounting values, not all companies.", "Rows accepted as structured accounting values, not all companies."),
      },
      {
        tone: "warn",
        label: text("global_metric_partial", "Partial / candidate", "Partial / candidate"),
        value: formatInt(partialReady),
        note: text("global_metric_partial_note", "Useful for review, but not full accounting guidance.", "Useful for review, but not full accounting guidance."),
      },
      {
        tone: "warn",
        label: text("global_metric_evidence_only", "Evidence-only layer", "Evidence-only layer"),
        value: formatInt(evidenceOnly),
        note: text("global_metric_evidence_only_note", "Traceable facts exist, but direct accounting values are incomplete.", "Traceable facts exist, but direct accounting values are incomplete."),
      },
      {
        tone: "risk",
        label: text("global_metric_source_gap", "Source gaps", "Source gaps"),
        value: formatInt(sourceGaps),
        note: text("global_metric_source_gap_note", "Parent-company reports still need source closure before safe extraction.", "Parent-company reports still need source closure before safe extraction."),
      },
    ];
    const blockers = [
      directScopeGap !== undefined ? formatTemplate(text("global_blocker_direct_scope", "{count} companies still miss complete direct Scope 1/2/3 values.", "{count} companies still miss complete direct Scope 1/2/3 values."), { count: formatInt(directScopeGap) }) : "",
      scope2DualGap !== undefined ? formatTemplate(text("global_blocker_scope2", "{count} companies still miss Scope 2 market/location dual method.", "{count} companies still miss Scope 2 market/location dual method."), { count: formatInt(scope2DualGap) }) : "",
      scope3Gap !== undefined ? formatTemplate(text("global_blocker_scope3", "{count} companies still miss complete Scope 3 fifteen-category status.", "{count} companies still miss complete Scope 3 fifteen-category status."), { count: formatInt(scope3Gap) }) : "",
      factorGap !== undefined ? formatTemplate(text("global_blocker_factor", "{count} companies still miss emission-factor application.", "{count} companies still miss emission-factor application."), { count: formatInt(factorGap) }) : "",
      targetGap !== undefined ? formatTemplate(text("global_blocker_target", "{count} companies still miss target-progress chains.", "{count} companies still miss target-progress chains."), { count: formatInt(targetGap) }) : "",
    ].filter(Boolean);
    const queueItems = [
      ["P0", upgradeCounts.P0_report_source_closure, text("global_queue_p0", "Report source closure", "Report source closure")],
      ["P0", upgradeCounts.P0_standard_evidence_backfill, text("global_queue_p0_standard", "Weak standard evidence backfill", "Weak standard evidence backfill")],
      ["P1", upgradeCounts.P1_direct_scope_manual_validation, text("global_queue_p1", "Direct Scope PDF validation", "Direct Scope PDF validation")],
      ["P1", upgradeCounts.P1_scope2_dual_method_completion, text("global_queue_p1_scope2", "Scope 2 dual-method completion", "Scope 2 dual-method completion")],
      ["P2", upgradeCounts.P2_scope3_focus_category_reconciliation, text("global_queue_p2", "Scope 3 focus-category reconciliation", "Scope 3 focus-category reconciliation")],
      ["P3", upgradeCounts.P3_recalculable_accounting_chain, text("global_queue_p3", "Recalculable accounting chain", "Recalculable accounting chain")],
    ].filter((item) => item[1] !== undefined && item[1] !== null);
    elements.globalAudit.innerHTML = `
      <div class="workbench-global-audit">
        <div class="workbench-global-head">
          <div>
            <div class="table-kicker">${escapeHtml(text("global_audit_kicker", "Demand-side acceptance status", "Demand-side acceptance status"))}</div>
            <h2>${escapeHtml(text("global_audit_title", "Auditable workbench, not full 500-company accounting completion", "Auditable workbench, not full 500-company accounting completion"))}</h2>
            <p>${escapeHtml(text("global_audit_lead", "This page separates direct-use results, review candidates, evidence-only facts, and source gaps so the demo does not overstate accounting readiness.", "This page separates direct-use results, review candidates, evidence-only facts, and source gaps so the demo does not overstate accounting readiness."))}</p>
          </div>
          <div class="workbench-global-badge">${escapeHtml(text("global_audit_badge", "Strict disclosure mode", "Strict disclosure mode"))}</div>
        </div>
        <div class="workbench-global-grid">
          ${cards
            .map(
              (card) => `
              <article class="workbench-global-card is-${escapeHtml(card.tone)}">
                <span>${escapeHtml(card.label)}</span>
                <strong>${escapeHtml(card.value)}</strong>
                <p>${escapeHtml(card.note)}</p>
              </article>
            `,
            )
            .join("")}
        </div>
        <div class="workbench-claim-grid">
          <div class="workbench-claim-card is-ok">
            <strong>${escapeHtml(text("global_can_say_title", "Safe to say", "Safe to say"))}</strong>
            <p>${escapeHtml(text("global_can_say_text", "The project has a strict ESG/carbon disclosure KG, source traceability, company workbench, direct-use value layer, and executable P0-P3 audit queues.", "The project has a strict ESG/carbon disclosure KG, source traceability, company workbench, direct-use value layer, and executable P0-P3 audit queues."))}</p>
          </div>
          <div class="workbench-claim-card is-risk">
            <strong>${escapeHtml(text("global_do_not_say_title", "Do not claim", "Do not claim"))}</strong>
            <p>${escapeHtml(text("global_do_not_say_text", "Do not claim all 500 companies have complete Scope 1/2/3, Scope 2 dual methods, complete Scope 3 fifteen-category coverage, or a fully recalculable factor-GWP-energy-target chain.", "Do not claim all 500 companies have complete Scope 1/2/3, Scope 2 dual methods, complete Scope 3 fifteen-category coverage, or a fully recalculable factor-GWP-energy-target chain."))}</p>
          </div>
        </div>
        ${blockers.length ? `<div class="workbench-blocker-list">${blockers.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
        ${
          queueItems.length
            ? `<div class="workbench-queue-strip">${queueItems
                .map((item) => `<span><strong>${escapeHtml(item[0])}</strong> ${escapeHtml(formatInt(item[1]))} ${escapeHtml(item[2])}</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
    `;
  }

  function findDirectScopeRow(detail, scopeName) {
    const normalized = String(scopeName || "").toLowerCase().replace(/\s+/g, "");
    return (detail.authoritative_scope_rows || []).find((row) => String(row.scope_en || "").toLowerCase().replace(/\s+/g, "") === normalized);
  }

  function countScopeCandidates(detail, scopeName) {
    const normalized = String(scopeName || "").toLowerCase().replace(/\s+/g, "");
    return (detail.scope_candidates || []).filter((row) => String(row.scope_en || "").toLowerCase().replace(/\s+/g, "") === normalized).length;
  }

  function buildWorkbenchStatusMatrix(detail) {
    const directRows = detail.authoritative_scope_rows || [];
    const scope3Rows = buildScope3MatrixRows(detail);
    const hasReport = Boolean(detail.has_matched_report);
    const directScopes = ["Scope 1", "Scope 2", "Scope 3"].filter((scopeName) => findDirectScopeRow(detail, scopeName)).length;
    const candidateRows = detail.scope_candidate_count || (detail.scope_candidates || []).length;
    const scope3CandidateCategories = scope3Rows.filter((row) => row.statusKey === "reported_value_candidate").length;
    const scope3MethodOnlyCategories = scope3Rows.filter((row) => row.statusKey === "method_evidence_only").length;
    const evidenceRows = detail.carbon_evidence_count || (detail.carbon_evidence_rows || []).length;
    const directEvidenceRows = detail.direct_accounting_use_evidence_count || 0;
    const items = [
      {
        key: "report",
        status: hasReport ? "ready" : "gap",
        label: text("matrix_report_label", "报告闭环", "Report closure"),
        value: hasReport ? text("matrix_report_ready", "已匹配源报告", "Source report matched") : text("matrix_report_gap", "未匹配母公司报告", "Parent report missing"),
      },
      {
        key: "direct",
        status: directScopes === 3 ? "ready" : directScopes ? "partial" : "gap",
        label: text("matrix_direct_label", "结果层", "Result layer"),
        value: formatTemplate(text("matrix_direct_value", "{count}/3 个 Scope 可直接采信", "{count}/3 Scopes direct-use"), { count: directScopes }),
      },
      {
        key: "candidate",
        status: candidateRows ? "review" : "gap",
        label: text("matrix_candidate_label", "候选层", "Candidate layer"),
        value: candidateRows ? formatTemplate(text("matrix_candidate_value", "{count} 条 Scope 候选待验", "{count} Scope candidates pending review"), { count: candidateRows }) : text("matrix_candidate_empty", "无 Scope 候选", "No Scope candidates"),
      },
      {
        key: "scope3",
        status: scope3CandidateCategories ? "review" : scope3MethodOnlyCategories ? "partial" : "gap",
        label: text("matrix_scope3_label", "Scope 3 十五类", "Scope 3 categories"),
        value: formatTemplate(text("matrix_scope3_value", "{value} 类有数值候选，{method} 类仅方法证据", "{value} value-candidate categories, {method} method-only categories"), { value: scope3CandidateCategories, method: scope3MethodOnlyCategories }),
      },
      {
        key: "audit",
        status: evidenceRows ? "partial" : "gap",
        label: text("matrix_audit_label", "审计层", "Audit layer"),
        value: formatTemplate(text("matrix_audit_value", "{count} 条碳证据，{direct} 条可直接核算", "{count} carbon evidence rows, {direct} direct-use"), { count: evidenceRows, direct: directEvidenceRows }),
      },
    ];
    return `
      <div class="workbench-status-matrix" aria-label="${escapeHtml(text("matrix_title", "企业核算状态矩阵", "Company accounting status matrix"))}">
        ${items
          .map(
            (item) => `
            <div class="workbench-status-cell is-${escapeHtml(item.status)}">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.value)}</span>
            </div>
          `,
          )
          .join("")}
      </div>
    `;
  }

  function buildAccountingConclusionCard(detail) {
    const directRows = detail.authoritative_scope_rows || [];
    const scopeNames = ["Scope 1", "Scope 2", "Scope 3"];
    const missingDirect = scopeNames.filter((scopeName) => !findDirectScopeRow(detail, scopeName));
    const scope3Rows = buildScope3MatrixRows(detail);
    const scope3ValueCandidateCount = scope3Rows.filter((row) => row.statusKey === "reported_value_candidate").length;
    const candidateCount = detail.scope_candidate_count || (detail.scope_candidates || []).length;
    const hasInputChain = Boolean(
      (detail.gwp_version_fact_count || 0) &&
      (detail.energy_consumption_fact_count || 0) &&
      (detail.accounting_input_fact_count || 0),
    );
    const directItems = directRows.length
      ? directRows.map((row) => {
          const method = pickText(row, lang, "scope2_reporting_method_zh", "scope2_reporting_method", "") || pickText(row, lang, "basis_zh", "basis_en", "");
          const meta = [row.inventory_year, method, row.evidence_page ? `${text("trace_page", "页码", "Page")} ${row.evidence_page}` : ""].filter(Boolean).join(" | ");
          return `${pickText(row, lang, "scope_zh", "scope_en", "")}: ${formatMaybeNumber(row.value_mtco2e, 6)} MtCO2e${meta ? ` (${meta})` : ""}`;
        })
      : [text("conclusion_direct_empty", "暂无可直接采信的 Scope 结果。", "No direct-use Scope result is available.")];
    const missingItems = [
      !detail.has_matched_report ? text("conclusion_missing_report", "母公司主报告未闭环匹配。", "Parent-company source report is not closed.") : "",
      missingDirect.length ? formatTemplate(text("conclusion_missing_scope", "缺少直接采信值：{scopes}。", "Missing direct-use values: {scopes}."), { scopes: missingDirect.join(" / ") }) : "",
      findDirectScopeRow(detail, "Scope 2") ? text("conclusion_missing_scope2_dual", "Scope 2 仍需确认市场法/位置法双口径是否齐全。", "Scope 2 still needs market-based/location-based dual-method completeness check.") : "",
      scope3ValueCandidateCount < 15 ? formatTemplate(text("conclusion_missing_scope3", "Scope 3 十五类尚未形成完整直接采信矩阵：当前 {count}/15 类有数值候选。", "Scope 3 does not yet have a complete direct-use 15-category matrix: {count}/15 categories have value candidates."), { count: scope3ValueCandidateCount }) : "",
      !hasInputChain ? text("conclusion_missing_input_chain", "排放因子、GWP、能耗输入链尚未闭环。", "Emission-factor, GWP, and energy-input chains are not closed.") : "",
    ].filter(Boolean);
    const cannotItems = [
      text("conclusion_cannot_full_ready", "不能声称该企业已完成完整碳核算指导。", "Do not claim this company has complete carbon-accounting guidance."),
      candidateCount ? formatTemplate(text("conclusion_cannot_candidates", "不能把 {count} 条 Scope 候选值当作采信结果。", "Do not treat {count} Scope candidates as accepted results."), { count: candidateCount }) : "",
      scope3ValueCandidateCount ? text("conclusion_cannot_scope3", "不能把 Scope 3 类别候选或方法证据直接写成十五类完整披露。", "Do not present Scope 3 category candidates or method evidence as complete fifteen-category disclosure.") : "",
      !hasInputChain ? text("conclusion_cannot_recalculate", "不能声称已具备可复算的因子-GWP-活动数据链条。", "Do not claim a reproducible factor-GWP-activity-data chain.") : "",
    ].filter(Boolean);
    const renderList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `
      <div class="accounting-conclusion-card">
        <div>
          <strong>${escapeHtml(text("conclusion_direct_title", "可直接使用", "Directly usable"))}</strong>
          <ul>${renderList(directItems)}</ul>
        </div>
        <div>
          <strong>${escapeHtml(text("conclusion_missing_title", "仍缺什么", "Still missing"))}</strong>
          <ul>${renderList(missingItems.length ? missingItems : [text("conclusion_missing_none", "当前未发现主要结果层缺口，但仍需审计层复核。", "No major result-layer gap is visible, but audit-layer review is still required.")])}</ul>
        </div>
        <div>
          <strong>${escapeHtml(text("conclusion_cannot_title", "不能声称", "Do not claim"))}</strong>
          <ul>${renderList(cannotItems)}</ul>
        </div>
      </div>
    `;
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
    ${buildWorkbenchStatusMatrix(detail)}
    ${buildAccountingConclusionCard(detail)}
    <h4 class="subtable-title">${escapeHtml(text("decision_method_summary", "报告中已识别的核算方法", "Calculation methods identified in the report"))}</h4>
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
    if (hasEvidenceTrace(item)) {
      lines.push(`<div class="cell-action">${renderEvidenceDrawerButton(item)}</div>`);
    }
    return `<div class="cell-block">${lines.length ? lines.join("") : `<div>${escapeHtml(text("trace_missing", "暂无源文件定位", "No source trace"))}</div>`}</div>`;
  }

  function hasEvidenceTrace(item) {
    if (!item) return false;
    return Boolean(
      item.source_file ||
      item.source_path ||
      item.evidence_page ||
      item.page ||
      pickText(item, lang, "snippet_zh", "snippet_en", "") ||
      pickText(item, lang, "recognition_basis_zh", "recognition_basis_en", ""),
    );
  }

  function renderEvidenceDrawerButton(item, label) {
    if (!hasEvidenceTrace(item)) return "";
    const id = registerEvidenceDrawerItem(item);
    return `<button class="evidence-drawer-btn" type="button" data-evidence-drawer-id="${escapeHtml(id)}">${escapeHtml(label || text("evidence_drawer_open", "查看证据", "View evidence"))}</button>`;
  }

  function registerEvidenceDrawerItem(item) {
    const id = `ev-${state.evidenceDrawerSeq += 1}`;
    state.evidenceDrawerItems.set(id, item);
    return id;
  }

  function evidenceValue(item, zhKey, enKey, fallback = "") {
    return pickText(item || {}, lang, zhKey, enKey, fallback);
  }

  function scopeEvidenceNumber(value) {
    const numeric = Number(String(value ?? "").replace(/,/g, ""));
    if (!Number.isFinite(numeric)) return String(value ?? "").trim();
    return String(Math.round(numeric * 1e9) / 1e9);
  }

  function scopeEvidenceKeyPart(value) {
    return normalizeEvidenceText(value) || "_";
  }

  function scopeEvidenceKey(item) {
    return [
      item?.company_id,
      item?.scope_en,
      item?.scope2_reporting_method || item?.basis_en || "",
      item?.inventory_year || "",
      item?.evidence_page || item?.page || "",
      scopeEvidenceNumber(item?.value_mtco2e),
      item?.source_file || "",
    ]
      .map(scopeEvidenceKeyPart)
      .join("__");
  }

  function numbersEquivalent(left, right) {
    const leftNumber = Number(String(left ?? "").replace(/,/g, ""));
    const rightNumber = Number(String(right ?? "").replace(/,/g, ""));
    if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return String(left ?? "") === String(right ?? "");
    return Math.abs(leftNumber - rightNumber) <= Math.max(Math.abs(leftNumber) * 0.000001, 0.000001);
  }

  function expandedScopeEvidenceMatches(item, expanded) {
    if (!item || !expanded) return false;
    const sameCompany = String(item.company_id || "") === String(expanded.company_id || "");
    const sameScope = normalizeEvidenceText(item.scope_en || item.scope_zh) === normalizeEvidenceText(expanded.scope_en || expanded.scope_zh);
    const samePage = String(item.evidence_page || item.page || "") === String(expanded.evidence_page || expanded.page || "");
    const sameValue = numbersEquivalent(item.value_mtco2e, expanded.value_mtco2e);
    const itemMethod = normalizeEvidenceText(item.scope2_reporting_method || item.basis_en || "");
    const expandedMethod = normalizeEvidenceText(expanded.scope2_reporting_method || expanded.basis_en || "");
    const sameMethod = !itemMethod || !expandedMethod || itemMethod === expandedMethod;
    const itemSource = String(item.source_file || "").trim();
    const expandedSource = String(expanded.source_file || "").trim();
    const sameSource = !itemSource || !expandedSource || itemSource === expandedSource;
    return sameCompany && sameScope && samePage && sameValue && sameMethod && sameSource;
  }

  function findExpandedScopeEvidence(item) {
    if (item?.expanded_evidence) return item.expanded_evidence;
    const evidence = state.expandedScopeEvidenceCache.get(item?.company_id) || {};
    const byKey = evidence.by_key || {};
    const keyed = byKey[scopeEvidenceKey(item)];
    if (keyed && expandedScopeEvidenceMatches(item, keyed)) return keyed;
    const companyRows = evidence.records || (evidence.by_company || {})[item?.company_id] || [];
    return companyRows.find((candidate) => expandedScopeEvidenceMatches(item, candidate)) || null;
  }

  function hydrateExpandedScopeEvidence(detail) {
    if (!detail) return detail;
    (detail.authoritative_scope_rows || []).forEach((row) => {
      const expanded = findExpandedScopeEvidence(row);
      if (expanded) row.expanded_evidence = expanded;
    });
    return detail;
  }

  function evidenceDisplaySnippet(item) {
    const expanded = findExpandedScopeEvidence(item);
    return evidenceValue(expanded || {}, "snippet_zh", "snippet_en", "") ||
      evidenceValue(item, "snippet_zh", "snippet_en", "");
  }

  function renderEvidenceDrawerField(label, value) {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return "";
    return `
      <div class="evidence-drawer-field">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(cleanValue)}</span>
      </div>
    `;
  }

  function normalizeEvidenceText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\s\-_\/:：()（）\[\]【】.,，。;；'’"“”]+/g, "");
  }

  function evidenceSnippetText(item) {
    const expanded = findExpandedScopeEvidence(item);
    return [
      expanded?.snippet_en,
      expanded?.snippet_zh,
      item?.snippet_en,
      item?.snippet_zh,
    ].filter(Boolean).join(" ");
  }

  function evidenceContextText(item) {
    const expanded = findExpandedScopeEvidence(item);
    return [
      expanded?.snippet_en,
      expanded?.snippet_zh,
      expanded?.recognition_basis_en,
      expanded?.recognition_basis_zh,
      item?.snippet_en,
      item?.snippet_zh,
      item?.recognition_basis_en,
      item?.recognition_basis_zh,
      item?.extraction_rule_en,
      item?.extraction_rule_zh,
      item?.basis_note_en,
      item?.basis_note_zh,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function containsEvidenceToken(haystack, token) {
    const normalizedHaystack = normalizeEvidenceText(haystack);
    const normalizedToken = normalizeEvidenceText(token);
    return Boolean(normalizedHaystack && normalizedToken && normalizedHaystack.includes(normalizedToken));
  }

  function numericTokenVariants(value) {
    const raw = String(value ?? "").trim();
    if (!raw || raw.toLowerCase() === "nan") return [];
    const variants = new Set([raw, raw.replace(/,/g, "")]);
    const numeric = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      variants.add(String(numeric));
      variants.add(numeric.toLocaleString("en-US"));
      if (Math.abs(numeric) >= 0.000001) {
        variants.add(numeric.toFixed(6).replace(/0+$/, "").replace(/\.$/, ""));
        variants.add(numeric.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""));
        variants.add(numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));
      }
    }
    return [...variants].filter(Boolean);
  }

  function valueEvidenceTokens(item) {
    return uniqueValues(
      [
        ...numericTokenVariants(item?.value_text),
        ...numericTokenVariants(item?.value_mtco2e),
        ...numericTokenVariants(item?.value_numeric),
        ...numericTokenVariants(item?.reported_value_mtco2e),
      ],
      12,
    );
  }

  function unitEvidenceTokens(item) {
    const expanded = findExpandedScopeEvidence(item);
    const rawTokens = [
      item?.unit_raw,
      item?.unit_context,
      item?.unit,
      item?.basis_note_en,
      item?.basis_note_zh,
    ].filter(Boolean);
    const combined = [...rawTokens, expanded?.snippet_en, expanded?.snippet_zh].filter(Boolean).join(" ");
    const tokens = [...rawTokens];
    if (item?.value_mtco2e !== undefined) {
      tokens.push("CO2e", "CO₂e", "tCO2e", "tCO₂e", "metric tons CO2e", "tonnes CO2e", "MtCO2e", "MMT CO2e", "MMT CO₂e", "million metric tons CO2e");
    }
    if (/co2|co₂|carbon|emission|排放|二氧化碳/i.test(combined)) {
      tokens.push("CO2e", "CO₂e", "tCO2e", "metric tons CO2e", "tonnes CO2e", "MtCO2e", "MMT CO2e", "million metric tons CO2e", "二氧化碳当量");
    }
    if (/gj|giga joules|gigajoules|吉焦/i.test(combined)) {
      tokens.push("GJ", "Giga Joules", "Gigajoules", "吉焦");
    }
    return uniqueValues(tokens, 12);
  }

  function scopeEvidenceTokens(item) {
    const scope = pickText(item || {}, lang, "scope_zh", "scope_en", "") || item?.scope_en || item?.scope_zh || "";
    const tokens = [scope];
    if (/scope\s*1|范围\s*1|範圍\s*1/i.test(scope)) tokens.push("Scope 1", "scope1", "范围 1", "范围1", "direct emissions");
    if (/scope\s*2|范围\s*2|範圍\s*2/i.test(scope)) tokens.push("Scope 2", "scope2", "范围 2", "范围2", "indirect emissions");
    if (/scope\s*3|范围\s*3|範圍\s*3/i.test(scope)) tokens.push("Scope 3", "scope3", "范围 3", "范围3");
    return uniqueValues(tokens, 10);
  }

  function hasNumericEvidenceShape(item) {
    return Boolean(
      item?.value_text ||
      item?.value_mtco2e !== undefined ||
      item?.value_numeric !== undefined ||
      item?.reported_value_mtco2e !== undefined ||
      item?.scope_en ||
      item?.scope_zh,
    );
  }

  function standardAliases(item) {
    const standardName = pickText(item, lang, "standard_name_zh", "standard_name_en", "");
    const systemLabel = pickText(item, lang, "system_label_zh", "system_label_en", "");
    const basis = pickText(item, lang, "recognition_basis_zh", "recognition_basis_en", "");
    const combined = `${standardName} ${systemLabel} ${basis}`;
    const aliases = [standardName];
    if (/ghg|温室气体核算体系|greenhouse gas protocol/i.test(combined)) {
      aliases.push("GHG Protocol", "Greenhouse Gas Protocol", "WBCSD/WRI", "温室气体核算体系");
    }
    if (/iso\s*14064/i.test(combined)) {
      aliases.push("ISO 14064", "ISO14064", "ISO 14064-1", "ISO14064-1", "ISO 14064-3", "ISO14064-3");
    }
    if (/gb\/?t|gb\s*t|国标|国家标准/i.test(combined)) {
      const gbMatches = combined.match(/GB\s*\/?\s*T\s*\d+(?:-\d+)?/gi) || [];
      aliases.push("GB/T", "GBT", "国家标准", ...gbMatches);
    }
    return uniqueValues(aliases.filter(Boolean), 12);
  }

  function directStandardAliases(item) {
    const standardNames = [item?.standard_name_en, item?.standard_name_zh].filter(Boolean);
    const systemLabels = [item?.system_label_en, item?.system_label_zh].filter(Boolean);
    const basisValues = [item?.recognition_basis_en, item?.recognition_basis_zh].filter(Boolean);
    const combined = [...standardNames, ...systemLabels, ...basisValues].join(" ");
    const aliases = [...standardNames];
    if (/ghg|greenhouse gas protocol|温室气体核算体系/i.test(combined)) {
      aliases.push("GHG Protocol", "Greenhouse Gas Protocol", "Corporate Standard", "Corporate Accounting and Reporting Standard", "WBCSD/WRI", "温室气体核算体系");
    }
    if (/iso\s*14064/i.test(combined)) {
      aliases.push("ISO 14064", "ISO14064", "ISO 14064-1", "ISO14064-1", "ISO 14064-2", "ISO14064-2", "ISO 14064-3", "ISO14064-3");
    }
    if (/iso\s*14067/i.test(combined)) {
      aliases.push("ISO 14067", "ISO14067");
    }
    const gbMatches = combined.match(/GB\s*\/?\s*T\s*\d+(?:-\d+)?/gi) || [];
    aliases.push(...gbMatches);
    return uniqueValues(aliases.filter(Boolean), 14);
  }

  function hasDirectStandardMention(item) {
    const snippet = evidenceSnippetText(item);
    const normalizedSnippet = normalizeEvidenceText(snippet);
    if (!normalizedSnippet) return false;
    return directStandardAliases(item).some((alias) => {
      const normalizedAlias = normalizeEvidenceText(alias);
      return normalizedAlias && normalizedSnippet.includes(normalizedAlias);
    });
  }

  function standardEvidenceBadge(item) {
    const direct = hasDirectStandardMention(item);
    const label = direct
      ? text("standard_evidence_direct", "原文直接命中标准名", "Standard name appears in source text")
      : text("standard_evidence_structured", "结构化标签命中，片段未直接出现标准名，需回源复核", "Structured tag only; standard name is not visible in this snippet");
    return `<span class="standard-evidence-badge ${direct ? "is-direct" : "is-review"}">${escapeHtml(label)}</span>`;
  }

  function evidencePartLabel(part) {
    const labels = {
      page_text: text("evidence_part_page_text", "页级原文", "page text"),
      scope: text("evidence_part_scope", "Scope / 口径", "scope / boundary label"),
      value: text("evidence_part_value", "数值", "value"),
      unit: text("evidence_part_unit", "单位", "unit"),
      year: text("evidence_part_year", "年份", "year"),
      scope2_method: text("evidence_part_scope2", "Scope 2 方法", "Scope 2 method"),
    };
    return labels[part] || String(part || "").replace(/_/g, " ");
  }

  function evidencePartList(parts) {
    return (parts || []).map(evidencePartLabel).filter(Boolean).join(" / ");
  }

  function expandedScopeEvidenceStatus(item) {
    const expanded = findExpandedScopeEvidence(item);
    if (!expanded) return null;
    const missingParts = (expanded.missing_parts || []).filter(Boolean);
    const conflictParts = (expanded.conflict_parts || []).filter(Boolean);
    const strong = expanded.is_complete === true && missingParts.length === 0 && conflictParts.length === 0;
    if (strong) {
      return {
        strong: true,
        className: "is-direct",
        label: text("evidence_gate_expanded_direct", "强证据：扩展片段命中 Scope、数值、年份和单位", "Strong evidence: expanded snippet contains scope, value, year, and unit"),
        reason: text("evidence_gate_expanded_direct_reason", "扩展片段来自页级原文，并已命中直接采信数值的关键证据要素。", "The expanded snippet comes from page-level source text and matches the key evidence parts for this direct-use value."),
      };
    }
    if (conflictParts.length) {
      return {
        strong: false,
        className: "is-review",
        label: text("evidence_gate_expanded_conflict", "需复核：证据口径存在冲突", "Review required: evidence boundary/method conflict"),
        reason: formatTemplate(
          text("evidence_gate_expanded_conflict_reason", "发现冲突要素：{parts}。该行保留原账本状态，但不能在前端作为强证据展示。", "Conflicting parts detected: {parts}. The row keeps its ledger status, but the frontend cannot show it as strong evidence."),
          { parts: evidencePartList(conflictParts) || text("evidence_gate_part_unknown", "待确认", "to be checked") },
        ),
      };
    }
    return {
      strong: false,
      className: "is-review",
      label: text("evidence_gate_expanded_review", "需复核：扩展片段缺少关键要素", "Review required: expanded snippet is missing key parts"),
      reason: formatTemplate(
        text("evidence_gate_expanded_review_reason", "缺少可见要素：{parts}。该行保留原账本状态，但证据片段需回源核对。", "Missing visible parts: {parts}. The row keeps its ledger status, but the evidence snippet needs source review."),
        { parts: evidencePartList(missingParts) || text("evidence_gate_part_unknown", "待确认", "to be checked") },
      ),
    };
  }

  function evidenceRelevanceStatus(item) {
    const snippet = evidenceSnippetText(item);
    const normalizedSnippet = normalizeEvidenceText(snippet);
    if (!normalizedSnippet || normalizedSnippet === "nan") {
      return {
        strong: false,
        className: "is-review",
        label: text("evidence_gate_missing", "需复核：缺少可读原文片段", "Review required: source snippet is missing"),
        reason: text("evidence_gate_missing_reason", "当前证据只有结构化字段或片段为空，不能默认作为强证据展示。", "This evidence only has structured fields or an empty snippet, so it is not shown as strong evidence by default."),
      };
    }
    if (item?.standard_name_en || item?.standard_name_zh || item?.system_key) {
      const direct = hasDirectStandardMention(item);
      return {
        strong: direct,
        className: direct ? "is-direct" : "is-review",
        label: direct
          ? text("evidence_gate_standard_direct", "强证据：原文直接命中标准名", "Strong evidence: standard name appears in source text")
          : text("evidence_gate_standard_review", "需复核：原文片段未直接命中标准名", "Review required: standard name is not visible in source text"),
        reason: direct
          ? text("evidence_gate_standard_direct_reason", "该标准事实可在原文片段中直接看到标准名或明确别名。", "The standard fact has a visible standard name or explicit alias in the source snippet.")
          : text("evidence_gate_standard_review_reason", "该行只能说明结构化标签命中，暂不能证明报告原文直接声明该标准。", "This row only proves a structured tag hit and does not yet prove that the report text directly states the standard."),
      };
    }
    if (hasNumericEvidenceShape(item)) {
      const expandedStatus = expandedScopeEvidenceStatus(item);
      if (expandedStatus) return expandedStatus;
      const valueTokens = valueEvidenceTokens(item);
      const unitTokens = unitEvidenceTokens(item);
      const scopeTokens = scopeEvidenceTokens(item);
      const year = item?.inventory_year || item?.report_year || item?.target_year || "";
      const valueMatched = !valueTokens.length || valueTokens.some((token) => containsEvidenceToken(snippet, token));
      const unitMatched = !unitTokens.length || unitTokens.some((token) => containsEvidenceToken(snippet, token));
      const scopeMatched = !scopeTokens.length || scopeTokens.some((token) => containsEvidenceToken(snippet, token));
      const yearMatched = !year || containsEvidenceToken(snippet, year);
      const strong = valueMatched && unitMatched && scopeMatched && yearMatched;
      const missing = [
        !valueMatched ? text("evidence_gate_part_value", "数值", "value") : "",
        !unitMatched ? text("evidence_gate_part_unit", "单位", "unit") : "",
        !scopeMatched ? "Scope" : "",
        !yearMatched ? text("evidence_gate_part_year", "年份", "year") : "",
      ].filter(Boolean);
      return {
        strong,
        className: strong ? "is-direct" : "is-review",
        label: strong
          ? text("evidence_gate_numeric_direct", "强证据：片段命中 Scope、数值、年份和单位", "Strong evidence: snippet contains scope, value, year, and unit")
          : text("evidence_gate_numeric_review", "需复核：片段未完整命中数值证据要素", "Review required: snippet does not contain all numeric evidence parts"),
        reason: strong
          ? text("evidence_gate_numeric_direct_reason", "该片段可直接支撑数值证据，不依赖后台字段推断。", "The snippet directly supports the numeric evidence without relying only on backend fields.")
          : formatTemplate(
              text("evidence_gate_numeric_review_reason", "缺少可见要素：{parts}。该值保留采信/候选状态，但证据片段需回源核对。", "Missing visible parts: {parts}. The value keeps its acceptance/candidate status, but the evidence snippet needs source review."),
              { parts: missing.join(" / ") || text("evidence_gate_part_unknown", "待确认", "to be checked") },
            ),
      };
    }
    return {
      strong: true,
      className: "is-direct",
      label: text("evidence_gate_context", "证据片段可读", "Readable evidence snippet"),
      reason: text("evidence_gate_context_reason", "该证据不是标准名或数值事实，默认保留原文片段供审计查看。", "This evidence is not a standard-name or numeric fact, so its snippet remains available for audit review."),
    };
  }

  function isStrongDirectScopeRow(row) {
    return evidenceRelevanceStatus(row).strong === true;
  }

  function strongDirectScopeRows(detail) {
    return (detail?.authoritative_scope_rows || []).filter((row) => isStrongDirectScopeRow(row));
  }

  function reviewDirectScopeRows(detail) {
    return (detail?.authoritative_scope_rows || []).filter((row) => !isStrongDirectScopeRow(row));
  }

  function evidenceRelevanceBadge(item) {
    const status = evidenceRelevanceStatus(item);
    return `<span class="standard-evidence-badge ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>`;
  }

  function renderEvidenceReviewNotice(item) {
    const status = evidenceRelevanceStatus(item);
    if (status.strong) return "";
    return `<p class="evidence-review-note">${escapeHtml(status.reason)}</p>`;
  }

  function renderExpandedEvidenceParts(item) {
    const expanded = findExpandedScopeEvidence(item);
    const parts = expanded?.matched_parts || null;
    if (!parts) return "";
    const conflictParts = new Set(expanded?.conflict_parts || []);
    const labels = {
      scope: evidencePartLabel("scope"),
      value: evidencePartLabel("value"),
      unit: evidencePartLabel("unit"),
      year: evidencePartLabel("year"),
      scope2_method: evidencePartLabel("scope2_method"),
    };
    if (!/scope\s*2|范围\s*2/i.test(`${item?.scope_en || ""} ${item?.scope_zh || ""}`)) {
      delete labels.scope2_method;
    }
    const chips = Object.entries(labels)
      .map(([key, label]) => {
        const matched = Boolean(parts[key]);
        const conflict = conflictParts.has(key);
        const stateLabel = conflict
          ? text("evidence_part_conflict", "冲突", "conflict")
          : matched
            ? text("evidence_part_hit", "已命中", "hit")
            : text("evidence_part_miss", "缺失", "missing");
        const className = conflict ? "is-conflict" : matched ? "is-hit" : "is-miss";
        return `<span class="evidence-match-chip ${className}">${escapeHtml(label)} · ${escapeHtml(stateLabel)}</span>`;
      })
      .join("");
    return `
      <div class="evidence-match-panel">
        <strong>${escapeHtml(text("evidence_parts_title", "证据要素命中", "Evidence element checks"))}</strong>
        <div class="evidence-match-list">${chips}</div>
      </div>
    `;
  }

  function ensureEvidenceDrawer() {
    let shell = document.getElementById("workbench-evidence-drawer");
    if (shell) return shell;
    shell = document.createElement("div");
    shell.id = "workbench-evidence-drawer";
    shell.className = "evidence-drawer-shell";
    shell.innerHTML = `
      <div class="evidence-drawer-backdrop" data-evidence-drawer-close="1"></div>
      <aside class="evidence-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="evidence-drawer-title">
        <button class="evidence-drawer-close" type="button" data-evidence-drawer-close="1">×</button>
        <div class="evidence-drawer-content"></div>
      </aside>
    `;
    document.body.appendChild(shell);
    return shell;
  }

  function openEvidenceDrawer(id) {
    const item = state.evidenceDrawerItems.get(id);
    if (!item) return;
    const shell = ensureEvidenceDrawer();
    const content = shell.querySelector(".evidence-drawer-content");
    const title = evidenceValue(item, "label_zh", "label_en", "") ||
      evidenceValue(item, "standard_name_zh", "standard_name_en", "") ||
      evidenceValue(item, "scope_zh", "scope_en", "") ||
      evidenceValue(item, "fact_type_zh", "fact_type_en", text("evidence_drawer_title_fallback", "证据回链", "Evidence trace"));
    const snippet = evidenceDisplaySnippet(item);
    const expanded = findExpandedScopeEvidence(item);
    const relevance = evidenceRelevanceStatus(item);
    content.innerHTML = `
      <div class="table-kicker">${escapeHtml(text("evidence_drawer_kicker", "穿透溯源层", "Traceability layer"))}</div>
      <h3 id="evidence-drawer-title">${escapeHtml(title)}</h3>
      ${evidenceRelevanceBadge(item)}
      <p class="evidence-review-note ${relevance.strong ? "is-direct" : "is-review"}">${escapeHtml(relevance.reason)}</p>
      <p class="table-lead">${escapeHtml(text("evidence_drawer_lead", "这里展示该事实的源报告、页码、判定依据和原文片段。它用于审计与复核，不会自动把候选值升级为核算结果。", "This drawer shows the source report, page, recognition basis, and source text for the fact. It is for audit and review; it does not automatically promote candidates into accounting results."))}</p>
      <div class="evidence-drawer-grid">
        ${renderEvidenceDrawerField(text("trace_report", "报告", "Report"), evidenceValue(item, "report_title_zh", "report_title_en", item.report_title || ""))}
        ${renderEvidenceDrawerField(text("trace_file", "文件", "File"), item.source_file || "")}
        ${renderEvidenceDrawerField(text("trace_page", "页码", "Page"), item.evidence_page || item.page || "")}
        ${renderEvidenceDrawerField(text("recognition_label", "判定依据", "Recognition basis"), evidenceValue(item, "recognition_basis_zh", "recognition_basis_en", "") || evidenceValue(item, "extraction_rule_zh", "extraction_rule_en", ""))}
        ${renderEvidenceDrawerField(text("evidence_acceptance", "采信", "Acceptance"), evidenceValue(item, "acceptance_tier_zh", "acceptance_tier_en", "") || evidenceValue(item, "acceptance_status_zh", "acceptance_status_en", ""))}
        ${renderEvidenceDrawerField(text("evidence_confidence", "置信度", "Confidence"), item.confidence_level || "")}
        ${renderEvidenceDrawerField(text("evidence_review", "校核状态", "Review"), item.review_status || item.verification_status || "")}
        ${renderEvidenceDrawerField(text("evidence_page_text_source", "页级文本", "Page-text source"), expanded?.page_text_file || "")}
        ${renderEvidenceDrawerField(text("evidence_extract_quality", "抽取质量", "Extraction quality"), [expanded?.extraction_method, expanded?.quality_flag, expanded?.ocr_used ? "OCR" : ""].filter(Boolean).join(" / "))}
        ${renderEvidenceDrawerField(text("evidence_conflict_context", "冲突窗口", "Conflict window"), expanded?.conflict_context || "")}
        ${renderEvidenceDrawerField(text("trace_path", "路径", "Path"), item.source_path || "")}
      </div>
      ${renderExpandedEvidenceParts(item)}
      ${snippet ? `<div class="evidence-drawer-snippet"><strong>${escapeHtml(text("source_text_label", "原文片段", "Source text"))}</strong><p>${escapeHtml(snippet)}</p></div>` : ""}
    `;
    shell.classList.add("is-open");
  }

  function closeEvidenceDrawer() {
    const shell = document.getElementById("workbench-evidence-drawer");
    if (shell) shell.classList.remove("is-open");
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
    const snippet = evidenceDisplaySnippet(item);
    const relevance = evidenceRelevanceStatus(item);
    if (snippet) {
      blocks.push(evidenceRelevanceBadge(item));
    }
    if (snippet && relevance.strong) {
      blocks.push(`<div class="cell-snippet"><strong>${escapeHtml(text("source_text_label", "原文片段", "Source text"))}</strong> ${escapeHtml(snippet)}</div>`);
    } else if (snippet) {
      blocks.push(renderEvidenceReviewNotice(item));
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
      .sort((a, b) => Number(!evidenceRelevanceStatus(a).strong) - Number(!evidenceRelevanceStatus(b).strong))
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
              const relevance = evidenceRelevanceStatus(item);
              return `
                <article class="panel standard-trace-card">
                  <h4>${escapeHtml(standardName)}</h4>
                  ${evidenceRelevanceBadge(item)}
                  <p><strong>${escapeHtml(text("standards_trace_system", "挂接体系", "Linked system"))}</strong> ${escapeHtml(systemLabel)}</p>
                  <p><strong>${escapeHtml(text("standards_trace_role", "标准角色", "Standard role"))}</strong> ${escapeHtml(role)}</p>
                  <p><strong>${escapeHtml(text("standards_trace_source", "证据回链", "Evidence trace"))}</strong> ${escapeHtml([source, page ? `${text("trace_page", "页码", "Page")} ${page}` : ""].filter(Boolean).join(" | ") || t.no_data)}</p>
                  ${recognition ? `<p><strong>${escapeHtml(text("recognition_label", "判定依据", "Recognition basis"))}</strong> ${escapeHtml(recognition)}</p>` : ""}
                  ${relevance.strong && snippet ? `<p class="cell-snippet">${escapeHtml(snippet)}</p>` : renderEvidenceReviewNotice(item)}
                  ${renderEvidenceDrawerButton(item)}
                </article>
              `;
            })
            .join("")}
        </div>
      `
      : `<div class="entity-empty">${escapeHtml(text("standards_trace_empty", "暂无可展示的标准证据回链。", "No standard evidence trace is available."))}</div>`;
    elements.standards.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.standards_kicker)}</div>
        <h3>${escapeHtml(t.standards_title)}</h3>
        <p class="table-lead">${escapeHtml(text("standards_lead_upgraded", "这里只保留能说明企业如何挂接到 GHG Protocol、ISO、披露准则等体系的关键证据。完整标准清单不再平铺展示，避免重复。", "This section keeps only the key evidence that explains how the company is linked to frameworks such as GHG Protocol, ISO, and disclosure rules. The full standards list is not repeated here."))}</p>
        <div class="standard-linkage-note">
          <strong>${escapeHtml(text("standards_trace_title", "标准挂接如何被证明", "How framework linkage is proven"))}</strong>
          <span>${escapeHtml(standardTraceNote)}</span>
        </div>
        ${standardEvidenceCards}
      </div>
    `;
  }

  function renderMethods(detail) {
    const view = sliceSection("methods", detail.method_rows || []);
    const headers = [
      text("methods_h_scope", "Scope / 类别", "Scope / category"),
      text("methods_h_method", "方法", "Method"),
      text("methods_h_data", "数据来源与质量", "Data source and quality"),
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
        ]),
        buildKeyValueCell([
          { label: text("data_source_class_label", "来源分类", "Source class"), value: pickText(item, lang, "data_source_class_zh", "data_source_class_en", "") || text("data_source_unclassified", "未明确披露/待人工确认", "Unclassified / review required") },
          { label: text("data_quality_label", "数据质量", "Data quality"), value: pickText(item, lang, "data_quality_flag_zh", "data_quality_flag_en", "") },
          { label: text("boundary_label", "边界", "Boundary"), value: pickText(item, lang, "boundary_type_zh", "boundary_type_en", "") },
          { label: text("assurance_label", "核查环节", "Assurance"), value: pickText(item, lang, "assurance_stage_zh", "assurance_stage_en", "") },
        ]),
        buildTraceCell(item),
        buildRecognitionCell(item, { showEstimateBasis: true }),
      ];
    });
    elements.methods.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.methods_kicker)}</div>
        <h3>${escapeHtml(t.methods_title)}</h3>
        <p class="table-lead">${escapeHtml(text("methods_lead_upgraded", "这里只保留核算判断必须看的方法、来源质量、边界、核查和原文回链；活动标签和关键词不再作为主内容展示。", "This table keeps only the method, source quality, boundary, assurance, and source trace needed for accounting judgment; activity tags and keyword cues are not shown as main content."))}</p>
        ${renderSectionToolbar("methods", view.total, view.visible, view.pageSize)}
        ${createTable(headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderScope(detail) {
    const strongRows = strongDirectScopeRows(detail);
    const reviewRows = reviewDirectScopeRows(detail);
    const authoritativeView = sliceSection("scope_authoritative", strongRows);
    const reviewView = sliceSection("scope_review", reviewRows);
    const directScopeLabels = uniqueValues(strongRows.map((row) => pickText(row, lang, "scope_zh", "scope_en", "")));
    const resultCards = strongRows.length
      ? strongRows
          .map((row) => {
            const share = row.share_percent === null || row.share_percent === undefined ? "" : `${formatMaybeNumber(row.share_percent, 2)}%`;
            return `
              <article class="scope-result-card">
                <div>
                  <span>${escapeHtml(pickText(row, lang, "scope_zh", "scope_en", ""))}</span>
                  <strong>${escapeHtml(formatMaybeNumber(row.value_mtco2e, 6))} MtCO2e</strong>
                </div>
                <p>${escapeHtml([share, row.inventory_year, pickText(row, lang, "scope2_reporting_method_zh", "scope2_reporting_method", "")].filter(Boolean).join(" | ") || t.no_data)}</p>
                ${evidenceRelevanceBadge(row)}
                ${renderEvidenceDrawerButton(row)}
              </article>
            `;
          })
          .join("")
      : `<div class="entity-empty">${escapeHtml(text("scope_result_empty_strong", "当前企业暂无通过页级证据闸门的直接采信 Scope 结果。", "This company has no direct-use Scope result that passes the page-text evidence gate yet."))}</div>`;
    const authoritativeHeaders = [
      text("scope_auth_h_scope", "Scope", "Scope"),
      text("scope_auth_h_value", "绝对量 MtCO2e", "Absolute MtCO2e"),
      text("scope_auth_h_share", "占比 %", "Share %"),
      text("scope_auth_h_entity", "年份/主体/口径", "Year / entity / method"),
      text("scope_auth_h_acceptance", "采信层级", "Acceptance"),
      text("scope_auth_h_trace", "原文定位", "Trace"),
      text("scope_auth_h_basis", "依据说明", "Basis note"),
    ];
    const scopeEvidenceTableRow = (item) => [
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
        { label: text("evidence_gate_label", "证据闸门", "Evidence gate"), value: evidenceRelevanceStatus(item).label },
        { label: text("verification_label", "验真", "Verification"), value: pickText(item, lang, "verification_reason_zh", "verification_reason_en", item.verification_status || "") },
      ]),
      buildTraceCell(item),
      buildKeyValueCell([
        { label: text("basis_note_label", "依据", "Basis"), value: pickText(item, lang, "basis_note_zh", "basis_note_en", "") },
      ]),
    ];
    const authoritativeRows = authoritativeView.items.map(scopeEvidenceTableRow);
    const reviewTableRows = reviewView.items.map(scopeEvidenceTableRow);

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

    const candidateBlock = candidateView.total
      ? `<p class="entity-note">${escapeHtml(formatTemplate(text("scope_candidate_hidden_note", "另有 {count} 条 Scope 候选值已从主页面隐藏；它们不是直接采信结果，需要在后台审计队列复核。", "{count} Scope candidate rows are hidden from the main page; they are not direct-use results and require backend review."), { count: candidateView.total }))}</p>`
      : "";

    elements.scope.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope_kicker)}</div>
        <h3>${escapeHtml(t.scope_title)}</h3>
        <p class="table-lead">${escapeHtml(text("scope_layered_lead", "结果层只展示已进入 authoritative_scope_rows 的直接采信值；候选值不进入主表，避免把待验线索误当成核算结论。", "The result layer only shows direct-use values from authoritative_scope_rows. Candidate values stay out of the main table so review leads are not mistaken for accounting conclusions."))}</p>
        <div class="scope-layer-strip">
          <div class="scope-layer-summary">
            <strong>${escapeHtml(text("scope_result_total_label_strong", "强证据直接采信覆盖", "Strong-evidence direct-use coverage"))}</strong>
            <span>${escapeHtml(strongRows.length ? formatTemplate(text("scope_result_rows_value", "{count} 行", "{count} rows"), { count: strongRows.length }) : t.no_data)}</span>
            <small>${escapeHtml(directScopeLabels.length ? directScopeLabels.join(" / ") : text("scope_result_total_note_strong", "仅展示通过页码、年份、单位、数值和口径闸门的结果。", "Only rows that pass page, year, unit, value, and boundary gates are shown here."))}</small>
            ${reviewRows.length ? `<small>${escapeHtml(formatTemplate(text("scope_result_review_count", "另有 {count} 条原账本采信行因证据不完整或口径冲突转入复核区。", "{count} original ledger accepted rows are moved to review because the evidence is incomplete or conflicting."), { count: reviewRows.length }))}</small>` : ""}
          </div>
          <div class="scope-result-grid">${resultCards}</div>
        </div>
        <h4 class="subtable-title">${escapeHtml(text("scope_authoritative_strong_title", "通过证据闸门的直接采信值", "Direct-use values that pass the evidence gate"))}</h4>
        ${renderSectionToolbar("scope_authoritative", authoritativeView.total, authoritativeView.visible, authoritativeView.pageSize)}
        ${createTable(authoritativeHeaders, authoritativeRows, t.empty_table)}
        ${reviewView.total ? `
          <h4 class="subtable-title">${escapeHtml(text("scope_review_title", "原账本采信但需复核", "Ledger accepted but evidence review required"))}</h4>
          <p class="entity-note">${escapeHtml(text("scope_review_note", "这些行不进入上方强证据结果层；需要回源确认年份、单位、数值或 Scope 2 口径后，才能作为汇报值使用。", "These rows are excluded from the strong-evidence result layer. They need source review for year, unit, value, or Scope 2 method before being used in reporting."))}</p>
          ${renderSectionToolbar("scope_review", reviewView.total, reviewView.visible, reviewView.pageSize)}
          ${createTable(authoritativeHeaders, reviewTableRows, t.empty_table)}
        ` : ""}
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

  function renderScope3Heatmap(rows) {
    const legend = [
      ["reported_value_candidate", text("scope3_heat_value", "数值候选", "Value candidate")],
      ["method_evidence_only", text("scope3_heat_method", "方法证据", "Method evidence")],
      ["not_assessed", text("scope3_heat_gap", "未评估/未披露", "Not assessed/disclosed")],
    ];
    return `
      <div class="scope3-heatmap-shell">
        <div class="scope3-heatmap-legend">
          ${legend.map(([key, label]) => `<span><i class="scope3-heat-dot is-${escapeHtml(key)}"></i>${escapeHtml(label)}</span>`).join("")}
        </div>
        <div class="scope3-heatmap-grid">
          ${(rows || [])
            .map((item) => {
              const value = item.bestValue || {};
              const converted = value.value_mtco2e === null || value.value_mtco2e === undefined || value.value_mtco2e === "" ? "" : `${formatMaybeNumber(value.value_mtco2e, 6)} MtCO2e`;
              const title = `${item.categoryCode} ${pickText(item, lang, "label_zh", "label_en")}`;
              return `
                <button class="scope3-heat-cell is-${escapeHtml(item.statusKey)}" type="button" ${hasEvidenceTrace(value) ? `data-evidence-drawer-id="${escapeHtml(registerEvidenceDrawerItem(value))}"` : ""}>
                  <strong>${escapeHtml(item.categoryCode)}</strong>
                  <span>${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</span>
                  <small>${escapeHtml(converted || pickText(item, lang, "status_zh", "status_en"))}</small>
                  <em>${escapeHtml(title)}</em>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderScope3(detail) {
    const matrixRowsAll = buildScope3MatrixRows(detail);
    const matrixView = sliceSection("scope3_matrix", matrixRowsAll);
    const heatmap = renderScope3Heatmap(matrixRowsAll);
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
    const candidateBlock = view.total
      ? `<p class="entity-note">${escapeHtml(formatTemplate(text("scope3_candidate_hidden_note", "另有 {count} 条 Scope 3 类别候选值已从主页面隐藏；主页面只保留十五类状态矩阵和可点击证据。", "{count} Scope 3 category candidate rows are hidden from the main page; this page keeps only the fifteen-category status matrix and clickable evidence."), { count: view.total }))}</p>`
      : "";

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
        ${heatmap}
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
    hydrateExpandedScopeEvidence(detail);
    const preserveSectionState = Boolean(options.preserveSectionState) && state.currentDetail && state.currentDetail.company_id === detail.company_id;
    if (!preserveSectionState) {
      resetSectionDisplay();
    }
    state.currentDetail = detail;
    state.evidenceDrawerItems.clear();
    state.evidenceDrawerSeq = 0;
    elements.input.value = displayCompany(detail);
    elements.metrics.innerHTML = metricCards([
      { label: t.metric_company_tier, value: pickText(detail, lang, "enterprise_use_tier_zh", "enterprise_use_tier_en") || "-" },
      { label: t.metric_authoritative_scope, value: formatCountPair(strongDirectScopeRows(detail).length, detail.authoritative_scope_count || (detail.authoritative_scope_rows || []).length) },
      { label: t.metric_standards, value: formatInt(detail.standards_count || 0) },
      { label: t.metric_methods, value: formatInt(detail.method_rows_count || 0) },
    ]);
    renderDecisionPanel(detail);
    renderReportMatch(detail);
    renderReadiness(detail);
    renderStandards(detail);
    renderMethods(detail);
    renderScope(detail);
    renderScope3(detail);
    renderStatus(`${displayCompany(detail)} | ${t.loaded_ok}`);
  }

  async function ensureExpandedScopeEvidence(companyId) {
    const targetId = String(companyId || "").trim();
    if (!targetId || state.expandedScopeEvidenceCache.has(targetId)) return;
    state.expandedScopeEvidenceCache.set(
      targetId,
      await fetchOptionalJson(`${assetBase}/expanded_evidence/${encodeURIComponent(targetId)}.json`),
    );
  }

  async function loadCompany(companyId) {
    const targetId = String(companyId || "").trim();
    if (!targetId) return;
    state.selectedCompanyId = targetId;
    updateQueryParam("company", targetId);
    if (state.detailCache.has(targetId)) {
      await ensureExpandedScopeEvidence(targetId);
      renderDetail(state.detailCache.get(targetId));
      return;
    }
    renderStatus(t.loading);
    const detail = await fetchJson(`${assetBase}/companies/${encodeURIComponent(targetId)}.json`);
    await ensureExpandedScopeEvidence(targetId);
    state.detailCache.set(targetId, detail);
    renderDetail(detail);
  }

  async function init() {
    renderStatus(t.loading);
    const [index, overview, readinessSummary, upgradePlan] = await Promise.all([
      fetchJson(`${assetBase}/company_workbench.json`),
      fetchOptionalJson(`${assetBase}/overview.json`),
      fetchOptionalJson(`${assetBase}/full_accounting_readiness_summary.json`),
      fetchOptionalJson(`${assetBase}/world500_accounting_upgrade_workplan_summary.json`),
    ]);
    state.index = index.companies || [];
    state.overview = overview;
    state.readinessSummary = readinessSummary;
    state.upgradePlan = upgradePlan;
    renderGlobalAudit();
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
    const closeTrigger = event.target.closest("[data-evidence-drawer-close]");
    if (closeTrigger) {
      closeEvidenceDrawer();
      return;
    }
    const evidenceTrigger = event.target.closest("[data-evidence-drawer-id]");
    if (evidenceTrigger) {
      openEvidenceDrawer(String(evidenceTrigger.getAttribute("data-evidence-drawer-id") || ""));
      return;
    }
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
