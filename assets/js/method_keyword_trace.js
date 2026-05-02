(async () => {
  const shared = window.World500WorkbenchShared;
  const config = window.WORKBENCH_CONFIG;
  if (!shared || !config) return;

  const {
    createTable,
    escapeHtml,
    fetchJson,
    formatInt,
    joinList,
    metricCards,
    parseQueryParam,
    pickText,
    updateQueryParam,
  } = shared;

  const lang = config.lang || "zh";
  const t = config.text || {};
  const assetBase = config.assetBase;
  const state = {
    payload: null,
    selectedKey: "",
    query: "",
  };

  const elements = {
    tabs: document.getElementById("method-keyword-tabs"),
    search: document.getElementById("method-keyword-search"),
    metrics: document.getElementById("method-keyword-metrics"),
    guide: document.getElementById("method-keyword-guide"),
    results: document.getElementById("method-keyword-results"),
    evidence: document.getElementById("method-keyword-evidence"),
    status: document.getElementById("method-keyword-status"),
  };

  function renderStatus(message) {
    elements.status.innerHTML = `<div class="entity-empty">${escapeHtml(message)}</div>`;
  }

  function getKeywords() {
    return state.payload?.keywords || [];
  }

  function activeKeyword() {
    return getKeywords().find((item) => item.key === state.selectedKey) || getKeywords()[0] || null;
  }

  function renderTabs() {
    const html = getKeywords()
      .map((item) => {
        const active = item.key === state.selectedKey ? " is-active" : "";
        return `<button class="entity-system-tab${active}" type="button" data-key="${escapeHtml(item.key)}">${escapeHtml(pickText(item, lang, "label_zh", "label_en"))}</button>`;
      })
      .join("");
    elements.tabs.innerHTML = html;
    [...elements.tabs.querySelectorAll("[data-key]")].forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedKey = button.getAttribute("data-key") || "";
        updateQueryParam("keyword", state.selectedKey);
        render();
      });
    });
  }

  function filteredRows(rows) {
    const query = state.query.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const blob = [
        row.company_id,
        row.company_name_en,
        row.company_name_zh,
        row.scope_en,
        row.scope_zh,
        row.calculation_method_en,
        row.calculation_method_zh,
        row.data_source_type_en,
        row.data_source_type_zh,
        row.source_file,
        row.snippet_en,
        row.snippet_zh,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }

  function renderGuide(keyword) {
    if (!keyword) {
      elements.guide.innerHTML = `<div class="entity-empty">${escapeHtml(t.no_data)}</div>`;
      return;
    }
    elements.metrics.innerHTML = metricCards([
      { label: t.metric_keywords, value: 1 },
      { label: t.metric_companies, value: formatInt(keyword.company_count || 0) },
      { label: t.metric_hits, value: formatInt(keyword.hit_count || 0) },
      { label: t.metric_examples, value: formatInt((keyword.evidence_rows || []).length) },
    ]);
    elements.guide.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.guide_kicker)}</div>
        <h3>${escapeHtml(pickText(keyword, lang, "label_zh", "label_en"))}</h3>
        <p class="table-lead">${escapeHtml(pickText(keyword, lang, "guide_zh", "guide_en"))}</p>
        <div class="panel-grid workbench-panel-grid">
          <div class="panel">
            <h4>${escapeHtml(t.guide_formula)}</h4>
            <p>${escapeHtml(pickText(keyword, lang, "formula_zh", "formula_en"))}</p>
          </div>
          <div class="panel">
            <h4>${escapeHtml(t.guide_scenarios)}</h4>
            <p>${escapeHtml(pickText(keyword, lang, "scenarios_zh", "scenarios_en"))}</p>
          </div>
          <div class="panel">
            <h4>${escapeHtml(t.guide_sample_companies)}</h4>
            <p>${escapeHtml(joinList(lang === "zh" ? keyword.sample_companies_zh : keyword.sample_companies_en))}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderResults(keyword) {
    if (!keyword) {
      elements.results.innerHTML = `<div class="entity-empty">${escapeHtml(t.no_data)}</div>`;
      return;
    }
    const rows = filteredRows(keyword.evidence_rows || []);
    const tableRows = rows.map((item) => [
      escapeHtml(`#${item.world500_rank || "-"}`),
      `<a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(item.company_id || "")}">${escapeHtml(pickText(item, lang, "company_name_zh", "company_name_en"))}</a>`,
      escapeHtml(pickText(item, lang, "industry_section_zh", "industry_section_en")),
      escapeHtml(pickText(item, lang, "scope_zh", "scope_en")),
      escapeHtml(pickText(item, lang, "calculation_method_zh", "calculation_method_en")),
      escapeHtml(pickText(item, lang, "data_source_type_zh", "data_source_type_en")),
      escapeHtml(item.evidence_page || "-"),
      `<div class="cell-block"><div>${escapeHtml(pickText(item, lang, "recognition_basis_zh", "recognition_basis_en"))}</div><div class="cell-snippet">${escapeHtml(pickText(item, lang, "snippet_zh", "snippet_en"))}</div></div>`,
    ]);
    elements.results.innerHTML = `
      <div class="table-card report-table-card">
        <div class="table-kicker">${escapeHtml(t.results_kicker)}</div>
        <h3>${escapeHtml(t.results_title)}</h3>
        <p class="table-lead">${escapeHtml(t.results_lead)}</p>
        ${createTable(t.results_headers, tableRows, t.empty_table)}
      </div>
    `;
  }

  function renderEvidence(keyword) {
    if (!keyword) {
      elements.evidence.innerHTML = `<div class="entity-empty">${escapeHtml(t.no_data)}</div>`;
      return;
    }
    const rows = filteredRows(keyword.evidence_rows || []).slice(0, 40);
    const cards = rows.length
      ? rows
          .map(
            (item) => `
            <article class="entity-evidence-item">
              <div class="entity-evidence-head">
                <strong><a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(item.company_id || "")}">${escapeHtml(pickText(item, lang, "company_name_zh", "company_name_en"))}</a></strong>
                <span>${escapeHtml(t.evidence_page)} ${escapeHtml(item.evidence_page || "-")}</span>
              </div>
              <div class="entity-evidence-meta">
                <span>${escapeHtml(pickText(item, lang, "scope_zh", "scope_en"))}</span>
                <span>${escapeHtml(pickText(item, lang, "calculation_method_zh", "calculation_method_en")) || "-"}</span>
                <span>${escapeHtml(item.source_file || "-")}</span>
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
        <div class="graph-summary-list">${cards}</div>
      </div>
    `;
  }

  function render() {
    const keyword = activeKeyword();
    renderTabs();
    renderGuide(keyword);
    renderResults(keyword);
    renderEvidence(keyword);
    renderStatus(keyword ? `${pickText(keyword, lang, "label_zh", "label_en")} · ${escapeHtml(t.loaded_ok)}` : t.no_data);
  }

  async function init() {
    renderStatus(t.loading);
    state.payload = await fetchJson(`${assetBase}/method_keyword_trace.json`);
    const fromQuery = parseQueryParam("keyword");
    state.selectedKey = getKeywords().some((item) => item.key === fromQuery) ? fromQuery : (getKeywords()[0]?.key || "");
    render();
  }

  elements.search.addEventListener("input", () => {
    state.query = elements.search.value || "";
    render();
  });

  init().catch((error) => {
    console.error(error);
    renderStatus(t.load_error);
  });
})();
