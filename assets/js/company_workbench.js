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
  const SECTION_PAGE_SIZES = {
    standards: 12,
    methods: 15,
    scope_authoritative: 10,
    scope_candidates: 15,
    scope3: 15,
    keywords: 8,
    evidence: 12,
  };

  const elements = {
    input: document.getElementById("company-workbench-search"),
    datalist: document.getElementById("company-workbench-options"),
    button: document.getElementById("company-workbench-open"),
    metrics: document.getElementById("company-workbench-metrics"),
    profile: document.getElementById("company-workbench-profile"),
    standards: document.getElementById("company-workbench-standards"),
    methods: document.getElementById("company-workbench-methods"),
    scope: document.getElementById("company-workbench-scope"),
    scope3: document.getElementById("company-workbench-scope3"),
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
  };

  const SECTION_SOURCES = {
    standards: (detail) => detail.standards || [],
    methods: (detail) => detail.method_rows || [],
    scope_authoritative: (detail) => detail.authoritative_scope_rows || [],
    scope_candidates: (detail) => detail.scope_candidates || [],
    scope3: (detail) => detail.scope3_candidates || [],
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
      { title: t.group_assurance, values: lang === "zh" ? detail.assurance_stages_zh : detail.assurance_stages_en },
      { title: t.group_activity, values: lang === "zh" ? detail.activity_categories_zh : detail.activity_categories_en },
    ];
    elements.profile.innerHTML = `
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
            <h4>${escapeHtml(t.profile_mapping_basis)}</h4>
            <p>${escapeHtml(pickText(detail, lang, "industry_mapping_basis_zh", "industry_mapping_basis_en"))}</p>
          </div>
        </div>
        <div class="panel-grid workbench-panel-grid" style="margin-top:16px;">
          ${chipGroups
            .map(
              (group) => `
              <div class="panel">
                <h4>${escapeHtml(group.title)}</h4>
                <div class="chip-list">${(group.values || []).length ? group.values.map((value) => `<span class="entity-chip">${escapeHtml(value)}</span>`).join("") : `<span class="entity-chip">${escapeHtml(t.no_data)}</span>`}</div>
              </div>
            `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderStandards(detail) {
    const view = sliceSection("standards", detail.standards || []);
    const rows = view.items.map((item) => [
      escapeHtml(pickText(item, lang, "system_label_zh", "system_label_en")),
      escapeHtml(pickText(item, lang, "standard_name_zh", "standard_name_en")),
      escapeHtml(pickText(item, lang, "standard_role_zh", "standard_role_en")),
      escapeHtml(pickText(item, lang, "accounting_principle_zh", "accounting_principle_en")),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      escapeHtml(item.source_file || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.standards.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.standards_kicker)}</div>
        <h3>${escapeHtml(t.standards_title)}</h3>
        <p class="table-lead">${escapeHtml(t.standards_lead)}</p>
        ${renderSectionToolbar("standards", view.total, view.visible, view.pageSize)}
        ${createTable(t.standards_headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderMethods(detail) {
    const view = sliceSection("methods", detail.method_rows || []);
    const rows = view.items.map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "calculation_method_zh", "calculation_method_en")),
      escapeHtml(pickText(item, lang, "data_source_type_zh", "data_source_type_en")),
      escapeHtml(pickText(item, lang, "assurance_stage_zh", "assurance_stage_en")),
      escapeHtml(pickText(item, lang, "activity_standard_category_zh", "activity_standard_category_en")),
      escapeHtml(pickText(item, lang, "activity_evidence_mapping_zh", "activity_evidence_mapping_en")),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.methods.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.methods_kicker)}</div>
        <h3>${escapeHtml(t.methods_title)}</h3>
        <p class="table-lead">${escapeHtml(t.methods_lead)}</p>
        ${renderSectionToolbar("methods", view.total, view.visible, view.pageSize)}
        ${createTable(t.methods_headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderScope(detail) {
    const authoritativeView = sliceSection("scope_authoritative", detail.authoritative_scope_rows || []);
    const authoritativeRows = authoritativeView.items.map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(item.share_percent === null || item.share_percent === undefined ? "-" : formatMaybeNumber(item.share_percent, 2)),
      escapeHtml(pickText(item, lang, "entity_type_zh", "entity_type_en") || item.entity_type || "-"),
      escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") || "-"),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "basis_note_zh", "basis_note_en"))}</div></div>`,
    ]);

    const candidateView = sliceSection("scope_candidates", detail.scope_candidates || []);
    const candidateRows = candidateView.items.map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "basis_zh", "basis_en")),
      escapeHtml(item.value_text || "-"),
      escapeHtml(item.unit_raw || "-"),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") || "-"),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "extraction_rule_zh", "extraction_rule_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);

    elements.scope.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope_kicker)}</div>
        <h3>${escapeHtml(t.scope_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope_lead)}</p>
        <h4 class="subtable-title">${escapeHtml(t.scope_authoritative_title)}</h4>
        ${renderSectionToolbar("scope_authoritative", authoritativeView.total, authoritativeView.visible, authoritativeView.pageSize)}
        ${createTable(t.scope_authoritative_headers, authoritativeRows, t.empty_table)}
        <h4 class="subtable-title">${escapeHtml(t.scope_candidate_title)}</h4>
        ${renderSectionToolbar("scope_candidates", candidateView.total, candidateView.visible, candidateView.pageSize)}
        ${createTable(t.scope_candidate_headers, candidateRows, t.empty_table)}
      </div>
    `;
  }

  function renderScope3(detail) {
    const view = sliceSection("scope3", detail.scope3_candidates || []);
    const rows = view.items.map((item) => [
      escapeHtml(`${item.scope3_category_code || "-"} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en")}`),
      escapeHtml(item.value_text || "-"),
      escapeHtml(item.unit_context || "-"),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") || "-"),
      escapeHtml(pickText(item, lang, "priority_level_zh", "priority_level_en") || "-"),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "extraction_rule_zh", "extraction_rule_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.scope3.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope3_kicker)}</div>
        <h3>${escapeHtml(t.scope3_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope3_lead)}</p>
        ${renderSectionToolbar("scope3", view.total, view.visible, view.pageSize)}
        ${createTable(t.scope3_headers, rows, t.empty_table)}
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
    elements.keywords.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.keywords_kicker)}</div>
        <h3>${escapeHtml(t.keywords_title)}</h3>
        <p class="table-lead">${escapeHtml(t.keywords_lead)}</p>
        ${renderSectionToolbar("keywords", view.total, view.visible, view.pageSize)}
        <div class="panel-grid workbench-panel-grid">${cards.length ? cards.join("") : `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`}</div>
      </div>
    `;
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
                <span>${escapeHtml(t.evidence_page)} ${escapeHtml(item.page || "-")}</span>
              </div>
              <div class="entity-evidence-meta">
                <span>${escapeHtml(pickText(item, lang, "fact_type_zh", "fact_type_en"))}</span>
                <span>${escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.source_file || "-")}</span>
                ${pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") ? `<span>${escapeHtml(t.evidence_acceptance)} ${escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en"))}</span>` : ""}
                <span>${escapeHtml(t.evidence_confidence)} ${escapeHtml(item.confidence_level || "-")}</span>
                <span>${escapeHtml(t.evidence_review)} ${escapeHtml(item.review_status || "-")}</span>
              </div>
              <p>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</p>
              <p class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</p>
            </article>
          `,
          )
          .join("")
      : `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`;
    elements.evidence.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.evidence_kicker)}</div>
        <h3>${escapeHtml(t.evidence_title)}</h3>
        <p class="table-lead">${escapeHtml(t.evidence_lead)}</p>
        ${renderSectionToolbar("evidence", view.total, view.visible, view.pageSize)}
        <div class="graph-summary-list">${html}</div>
      </div>
    `;
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
    ]);
    buildProfileCards(detail);
    renderStandards(detail);
    renderMethods(detail);
    renderScope(detail);
    renderScope3(detail);
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
    const index = await fetchJson(`${assetBase}/company_workbench.json`);
    state.index = index.companies || [];
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
