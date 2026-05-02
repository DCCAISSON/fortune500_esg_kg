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
    metricCards,
    pickText,
  } = shared;

  const lang = config.lang || "zh";
  const t = config.text || {};
  const assetBase = config.assetBase;

  const state = {
    payload: null,
    filters: {
      industry: "",
      scope: "",
    },
  };

  const elements = {
    metrics: document.getElementById("emission-ledger-metrics"),
    industry: document.getElementById("emission-ledger-industry"),
    scope: document.getElementById("emission-ledger-scope"),
    authoritative: document.getElementById("emission-ledger-authoritative"),
    candidate: document.getElementById("emission-ledger-candidate"),
    industrySummary: document.getElementById("emission-ledger-industry-summary"),
    scope3: document.getElementById("emission-ledger-scope3"),
    scope3Summary: document.getElementById("emission-ledger-scope3-summary"),
    status: document.getElementById("emission-ledger-status"),
  };

  function renderStatus(message) {
    elements.status.innerHTML = `<div class="entity-empty">${escapeHtml(message)}</div>`;
  }

  function uniqueOptions(rows, zhKey, enKey) {
    const seen = new Set();
    const items = [];
    rows.forEach((row) => {
      const label = pickText(row, lang, zhKey, enKey, "");
      if (!label || seen.has(label)) return;
      seen.add(label);
      items.push(label);
    });
    return items.sort((a, b) => a.localeCompare(b, lang === "zh" ? "zh-CN" : "en"));
  }

  function applyFilters(rows) {
    return rows.filter((row) => {
      const industryLabel = pickText(row, lang, "industry_section_zh", "industry_section_en", "");
      const scopeLabel = pickText(row, lang, "scope_zh", "scope_en", "");
      const industryOk = !state.filters.industry || industryLabel === state.filters.industry;
      const scopeOk = !state.filters.scope || scopeLabel === state.filters.scope;
      return industryOk && scopeOk;
    });
  }

  function renderSelectors() {
    const sourceRows = state.payload?.best_scope_candidates || [];
    const industries = uniqueOptions(sourceRows, "industry_section_zh", "industry_section_en");
    const scopes = uniqueOptions(sourceRows, "scope_zh", "scope_en");
    elements.industry.innerHTML = `<option value="">${escapeHtml(t.filter_all)}</option>${industries
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("")}`;
    elements.scope.innerHTML = `<option value="">${escapeHtml(t.filter_all)}</option>${scopes
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("")}`;
    elements.industry.value = state.filters.industry;
    elements.scope.value = state.filters.scope;
  }

  function renderAuthoritative() {
    const rows = applyFilters(state.payload?.authoritative_scope_rows || []);
    const tableRows = rows.map((item) => [
      escapeHtml(`#${item.world500_rank || "-"}`),
      `<a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(item.company_id || "")}">${escapeHtml(pickText(item, lang, "company_name_zh", "company_name_en"))}</a>`,
      escapeHtml(pickText(item, lang, "industry_section_zh", "industry_section_en")),
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(item.share_percent === null || item.share_percent === undefined ? "-" : formatMaybeNumber(item.share_percent, 2)),
      escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") || "-"),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      escapeHtml(pickText(item, lang, "basis_note_zh", "basis_note_en")),
    ]);
    elements.authoritative.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.authoritative_kicker)}</div>
        <h3>${escapeHtml(t.authoritative_title)}</h3>
        <p class="table-lead">${escapeHtml(t.authoritative_lead)}</p>
        ${createTable(t.authoritative_headers, tableRows, t.empty_table)}
      </div>
    `;
  }

  function renderCandidate() {
    const rows = applyFilters(state.payload?.best_scope_candidates || []);
    const tableRows = rows.map((item) => [
      escapeHtml(`#${item.world500_rank || "-"}`),
      `<a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(item.company_id || "")}">${escapeHtml(pickText(item, lang, "company_name_zh", "company_name_en"))}</a>`,
      escapeHtml(pickText(item, lang, "industry_section_zh", "industry_section_en")),
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "basis_zh", "basis_en")),
      escapeHtml(item.value_text || "-"),
      escapeHtml(item.unit_raw || "-"),
      escapeHtml(item.value_mtco2e === null || item.value_mtco2e === undefined ? "-" : formatMaybeNumber(item.value_mtco2e, 6)),
      escapeHtml(pickText(item, lang, "acceptance_tier_zh", "acceptance_tier_en") || "-"),
      escapeHtml(pickText(item, lang, "evidence_locator_zh", "evidence_locator_en") || item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "extraction_rule_zh", "extraction_rule_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.candidate.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.candidate_kicker)}</div>
        <h3>${escapeHtml(t.candidate_title)}</h3>
        <p class="table-lead">${escapeHtml(t.candidate_lead)}</p>
        ${createTable(t.candidate_headers, tableRows, t.empty_table)}
      </div>
    `;
  }

  function renderIndustrySummary() {
    const rows = (state.payload?.scope_industry_summary || []).filter((row) => {
      const industryLabel = pickText(row, lang, "industry_section_zh", "industry_section_en", "");
      const scopeLabel = pickText(row, lang, "scope_zh", "scope_en", "");
      const industryOk = !state.filters.industry || industryLabel === state.filters.industry;
      const scopeOk = !state.filters.scope || scopeLabel === state.filters.scope;
      return industryOk && scopeOk;
    });
    const tableRows = rows.map((item) => [
      escapeHtml(`${item.industry_section_code || "-"} ${pickText(item, lang, "industry_section_zh", "industry_section_en")}`),
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "basis_zh", "basis_en")),
      escapeHtml(formatInt(item.company_count || 0)),
      escapeHtml(formatMaybeNumber(item.total_mtco2e, 6)),
    ]);
    elements.industrySummary.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.industry_kicker)}</div>
        <h3>${escapeHtml(t.industry_title)}</h3>
        <p class="table-lead">${escapeHtml(t.industry_lead)}</p>
        ${createTable(t.industry_headers, tableRows, t.empty_table)}
      </div>
    `;
  }

  function renderScope3() {
    const rows = (state.payload?.best_scope3_candidates || []).filter((row) => {
      const industryLabel = pickText(row, lang, "industry_section_zh", "industry_section_en", "");
      return !state.filters.industry || industryLabel === state.filters.industry;
    });
    const tableRows = rows.map((item) => [
      escapeHtml(`#${item.world500_rank || "-"}`),
      `<a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(item.company_id || "")}">${escapeHtml(pickText(item, lang, "company_name_zh", "company_name_en"))}</a>`,
      escapeHtml(pickText(item, lang, "industry_section_zh", "industry_section_en")),
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
        ${createTable(t.scope3_headers, tableRows, t.empty_table)}
      </div>
    `;
  }

  function renderScope3Summary() {
    const rows = (state.payload?.scope3_industry_summary || []).filter((row) => {
      const industryLabel = pickText(row, lang, "industry_section_zh", "industry_section_en", "");
      return !state.filters.industry || industryLabel === state.filters.industry;
    });
    const tableRows = rows.map((item) => [
      escapeHtml(`${item.industry_section_code || "-"} ${pickText(item, lang, "industry_section_zh", "industry_section_en")}`),
      escapeHtml(`${item.scope3_category_code || "-"} ${pickText(item, lang, "scope3_category_zh", "scope3_category_en")}`),
      escapeHtml(formatInt(item.company_count || 0)),
      escapeHtml(formatMaybeNumber(item.total_mtco2e, 6)),
    ]);
    elements.scope3Summary.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.scope3_summary_kicker)}</div>
        <h3>${escapeHtml(t.scope3_summary_title)}</h3>
        <p class="table-lead">${escapeHtml(t.scope3_summary_lead)}</p>
        ${createTable(t.scope3_summary_headers, tableRows, t.empty_table)}
      </div>
    `;
  }

  function render() {
    const summary = state.payload?.summary || {};
    elements.metrics.innerHTML = metricCards([
      { label: t.metric_tier_a, value: formatInt(summary.tier_a_company_count || 0) },
      { label: t.metric_tier_b, value: formatInt(summary.tier_b_company_count || 0) },
      { label: t.metric_tier_c, value: formatInt(summary.tier_c_company_count || 0) },
      { label: t.metric_tier_d, value: formatInt(summary.tier_d_company_count || 0) },
      { label: t.metric_scope_rows, value: formatInt(summary.scope_candidate_rows || 0) },
      { label: t.metric_scope3_rows, value: formatInt(summary.scope3_candidate_rows || 0) },
      { label: t.metric_total_companies, value: formatInt(summary.company_count || 0) },
    ]);
    renderSelectors();
    renderAuthoritative();
    renderCandidate();
    renderIndustrySummary();
    renderScope3();
    renderScope3Summary();
    renderStatus(t.loaded_ok);
  }

  async function init() {
    renderStatus(t.loading);
    state.payload = await fetchJson(`${assetBase}/emission_ledger.json`);
    render();
  }

  elements.industry.addEventListener("change", () => {
    state.filters.industry = elements.industry.value || "";
    render();
  });
  elements.scope.addEventListener("change", () => {
    state.filters.scope = elements.scope.value || "";
    render();
  });

  init().catch((error) => {
    console.error(error);
    renderStatus(t.load_error);
  });
})();
