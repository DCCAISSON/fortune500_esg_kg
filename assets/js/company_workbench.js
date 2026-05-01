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
  };

  function displayCompany(item) {
    const name = pickText(item, lang, "company_name_zh", "company_name_en", item.company_id || "-");
    const rank = item.world500_rank ? `#${item.world500_rank}` : "-";
    return `${name} (${rank})`;
  }

  function renderStatus(message) {
    elements.status.innerHTML = `<div class="entity-empty">${escapeHtml(message)}</div>`;
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

  function buildProfileCards(detail) {
    const items = [
      { label: t.profile_rank, value: detail.world500_rank ? `#${detail.world500_rank}` : "-" },
      { label: t.profile_industry, value: pickText(detail, lang, "industry_section_zh", "industry_section_en") || "-" },
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
    const rows = (detail.standards || []).map((item) => [
      escapeHtml(pickText(item, lang, "system_label_zh", "system_label_en")),
      escapeHtml(pickText(item, lang, "standard_name_zh", "standard_name_en")),
      escapeHtml(pickText(item, lang, "standard_role_zh", "standard_role_en")),
      escapeHtml(pickText(item, lang, "accounting_principle_zh", "accounting_principle_en")),
      escapeHtml(item.evidence_page || "-"),
      escapeHtml(item.source_file || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.standards.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.standards_kicker)}</div>
        <h3>${escapeHtml(t.standards_title)}</h3>
        <p class="table-lead">${escapeHtml(t.standards_lead)}</p>
        ${createTable(
          t.standards_headers,
          rows,
          t.empty_table,
        )}
      </div>
    `;
  }

  function renderMethods(detail) {
    const rows = (detail.method_rows || []).map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "calculation_method_zh", "calculation_method_en")),
      escapeHtml(pickText(item, lang, "data_source_type_zh", "data_source_type_en")),
      escapeHtml(pickText(item, lang, "assurance_stage_zh", "assurance_stage_en")),
      escapeHtml(pickText(item, lang, "activity_standard_category_zh", "activity_standard_category_en")),
      escapeHtml(pickText(item, lang, "activity_evidence_mapping_zh", "activity_evidence_mapping_en")),
      escapeHtml(item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.methods.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.methods_kicker)}</div>
        <h3>${escapeHtml(t.methods_title)}</h3>
        <p class="table-lead">${escapeHtml(t.methods_lead)}</p>
        ${createTable(t.methods_headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderScope(detail) {
    const authoritativeRows = (detail.authoritative_scope_rows || []).map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(item.share_percent === null || item.share_percent === undefined ? "-" : formatMaybeNumber(item.share_percent, 2)),
      escapeHtml(item.entity_type || "-"),
      escapeHtml(item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "basis_note_zh", "basis_note_en"))}</div></div>`,
    ]);
    const candidateRows = (detail.scope_candidates || []).map((item) => [
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "basis_zh", "basis_en")),
      escapeHtml(item.value_text || "-"),
      escapeHtml(item.unit_raw || "-"),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "extraction_rule_zh", "extraction_rule_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.scope.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope_kicker)}</div>
        <h3>${escapeHtml(t.scope_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope_lead)}</p>
        <h4 class="subtable-title">${escapeHtml(t.scope_authoritative_title)}</h4>
        ${createTable(t.scope_authoritative_headers, authoritativeRows, t.empty_table)}
        <h4 class="subtable-title">${escapeHtml(t.scope_candidate_title)}</h4>
        ${createTable(t.scope_candidate_headers, candidateRows, t.empty_table)}
      </div>
    `;
  }

  function renderScope3(detail) {
    const rows = (detail.scope3_candidates || []).map((item) => [
      escapeHtml(`${item.scope3_category_code || "-"} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en")}`),
      escapeHtml(item.value_text || "-"),
      escapeHtml(item.unit_context || "-"),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "extraction_rule_zh", "extraction_rule_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.scope3.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope3_kicker)}</div>
        <h3>${escapeHtml(t.scope3_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope3_lead)}</p>
        ${createTable(t.scope3_headers, rows, t.empty_table)}
      </div>
    `;
  }

  function renderKeywords(detail) {
    const cards = (detail.keyword_summary || []).map((item) => `
      <div class="panel">
        <h4>${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</h4>
        <p>${escapeHtml((lang === "zh" ? item.sample_scope_zh : item.sample_scope_en).join(" / ") || t.no_data)}</p>
        <div class="chip-list">
          <span class="entity-chip">${escapeHtml(t.keyword_hit_count)} ${escapeHtml(String(item.hit_count || 0))}</span>
          ${(item.pages || []).map((page) => `<span class="entity-chip">${escapeHtml(t.keyword_page)} ${escapeHtml(page)}</span>`).join("")}
        </div>
      </div>
    `);
    elements.keywords.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.keywords_kicker)}</div>
        <h3>${escapeHtml(t.keywords_title)}</h3>
        <p class="table-lead">${escapeHtml(t.keywords_lead)}</p>
        <div class="panel-grid workbench-panel-grid">${cards.length ? cards.join("") : `<div class="entity-empty">${escapeHtml(t.empty_table)}</div>`}</div>
      </div>
    `;
  }

  function renderEvidence(detail) {
    const items = detail.evidence_ledger || [];
    const html = items.length
      ? items
          .map(
            (item) => `
            <article class="entity-evidence-item">
              <div class="entity-evidence-head">
                <strong>${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</strong>
                <span>${escapeHtml(t.evidence_page)} ${escapeHtml(item.page || "-")}</span>
              </div>
              <div class="entity-evidence-meta">
                <span>${escapeHtml(pickText(item, lang, "fact_type_zh", "fact_type_en"))}</span>
                <span>${escapeHtml(item.source_file || "-")}</span>
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
        <div class="graph-summary-list">${html}</div>
      </div>
    `;
  }

  function renderDetail(detail) {
    elements.input.value = displayCompany(detail);
    elements.metrics.innerHTML = metricCards([
      { label: t.metric_companies, value: 1 },
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
    renderStatus(`${displayCompany(detail)} · ${escapeHtml(t.loaded_ok)}`);
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

  init().catch((error) => {
    console.error(error);
    renderStatus(t.load_error);
  });
})();
