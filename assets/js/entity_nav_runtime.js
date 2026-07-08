(function () {
  const SYSTEMS = {
    ghg: {
      color: "#2f6f63",
      shortLabel: "GHG",
      figure: "world500_standard_chain_overview.png",
      page: "ghg-protocol-full-graph.html",
      filter: (standard) => Boolean(standard.is_ghg_series),
    },
    iso: {
      color: "#315f8c",
      shortLabel: "ISO",
      figure: "world500_iso_entity_knowledge_graph.png",
      page: "iso-system-full-graph.html",
      filter: (standard) => /^iso_/i.test(String(standard.id || "")) || /^ISO\b/i.test(String(standard.name_en || standard.name_zh || "")),
    },
    gb: {
      color: "#c76b2d",
      shortLabel: "GB",
      figure: "world500_gb_entity_knowledge_graph.png",
      page: "gb-system-full-graph.html",
      filter: (standard) => /^gb_t_/i.test(String(standard.id || "")) || /GB\s*\/?\s*T/i.test(String(standard.name_en || standard.name_zh || "")),
    },
  };

  const TEXT = {
    zh: {
      ghgLabel: "GHG Protocol 细分体系",
      isoLabel: "ISO 体系",
      gbLabel: "GB/国标体系",
      ghgTitle: "GHG Protocol 细分标准链",
      isoTitle: "ISO 实体级知识图谱",
      gbTitle: "GB/国标实体级知识图谱",
      overviewButton: "切换到该体系导航",
      overviewCta: "全屏交互图谱",
      overviewCompanies: "涉及企业",
      overviewStandards: "具体标准",
      overviewFacts: "标准事实",
      tabCaption: "点击切换体系",
      searchLabel: "企业筛选",
      searchPlaceholder: "输入企业名称或世界500强排名",
      resetLabel: "重置筛选",
      systemLane: "标准体系",
      standardLane: "具体标准",
      companyLane: "企业节点",
      metricsSystemCompanies: "当前体系涉及企业",
      metricsSystemStandards: "当前体系具体标准",
      metricsSystemFacts: "当前体系标准引用事实",
      metricsFilteredCompanies: "当前标准筛出企业",
      metricsRoleCount: "角色/原则库",
      selectionTitle: "当前导航焦点",
      selectionSystem: "标准体系",
      selectionStandard: "具体标准",
      selectionRoles: "标准角色",
      selectionPrinciples: "核算原则",
      selectionFactCount: "引用事实",
      selectionCompanyCount: "关联企业",
      companyTitle: "企业画像",
      companyEmpty: "点击右侧企业节点后，这里会展示该企业在当前体系下关联的标准与角色。",
      companyRank: "世界500强排名",
      companyRoles: "企业覆盖角色",
      companyPrinciples: "企业覆盖原则",
      knowledgeTitle: "知识库摘要",
      knowledgeStandard: "标准本体库",
      knowledgeCompany: "企业引用库",
      knowledgeRule: "角色与原则库",
      knowledgeStandardNote: "当前体系下的具体标准节点和高频标准。",
      knowledgeCompanyNote: "当前标准对应的企业节点，可直接点选查看画像。",
      knowledgeRuleNote: "按 standard / guideline / principle 等角色组织的规则层。",
      resultsTitle: "企业筛选结果表",
      resultsLead: "表内保留当前选中标准下的关键企业列，方便直接截图进汇报材料。",
      resultsCompany: "企业",
      resultsRank: "世界500强排名",
      resultsStandard: "当前标准",
      resultsStandardFacts: "该标准事实数",
      resultsLinkedStandards: "同体系关联标准数",
      resultsScope: "角色/口径",
      resultsNoData: "当前筛选条件下没有匹配企业。",
      resultsTruncated: "为保证可读性，图中企业节点默认仅展示前 {shown} 家，当前标准实际匹配 {total} 家；点击“显示全部 {total} 家企业”可展开全部企业节点。",
      resultsExpanded: "当前已展开全部 {total} 家企业节点，可点击“收起企业节点”恢复简洁视图。",
      stageNote: "点击中间的具体标准或右侧企业节点，可在同一视图内完成“体系 -> 标准 -> 企业”的逐层导航。",
      noRoles: "未标注",
      noPrinciples: "未标注",
      noRank: "未披露",
      companiesUnit: "家企业",
      standardsUnit: "项标准",
      factsUnit: "条事实",
      showAllCompanies: "显示全部 {total} 家企业",
      collapseCompanies: "收起企业节点",
      previewNote: "这里保留当前体系的全量实体图；左侧工作台用于可读性更强的逐层导航与企业筛选。",
      evidenceTitle: "证据回链",
      evidenceReport: "报告",
      evidencePage: "页码",
      evidenceConfidence: "置信度",
      evidenceReview: "校核状态",
      evidenceEmpty: "当前没有挂接证据。",
      sourceQuoteScopeNotice: "源文含 Scope 词，但当前节点不是 GHG Protocol 细分标准；展示为原文证据引用，不作为该标准自身口径。",
      loadFailed: "标准体系导航运行时数据加载失败，请检查 reporting_views.json。",
    },
    en: {
      ghgLabel: "GHG Protocol fine-series system",
      isoLabel: "ISO system",
      gbLabel: "GB / national standards system",
      ghgTitle: "GHG Protocol fine-series standards chain",
      isoTitle: "ISO entity knowledge graph",
      gbTitle: "GB / national standards entity knowledge graph",
      overviewButton: "Open this system in navigator",
      overviewCta: "Full-screen graph",
      overviewCompanies: "companies",
      overviewStandards: "specific standards",
      overviewFacts: "standard facts",
      tabCaption: "Switch system",
      searchLabel: "Company filter",
      searchPlaceholder: "Search company name or World500 rank",
      resetLabel: "Reset filter",
      systemLane: "Standard system",
      standardLane: "Specific standard",
      companyLane: "Company nodes",
      metricsSystemCompanies: "System companies",
      metricsSystemStandards: "System standards",
      metricsSystemFacts: "System standard facts",
      metricsFilteredCompanies: "Companies in selected standard",
      metricsRoleCount: "Roles / principles",
      selectionTitle: "Current navigation focus",
      selectionSystem: "Standard system",
      selectionStandard: "Specific standard",
      selectionRoles: "Standard roles",
      selectionPrinciples: "Accounting principles",
      selectionFactCount: "Evidence facts",
      selectionCompanyCount: "Linked companies",
      companyTitle: "Company profile",
      companyEmpty: "Click a company node to inspect its standards and roles in the current system.",
      companyRank: "World500 rank",
      companyRoles: "Company roles",
      companyPrinciples: "Company principles",
      knowledgeTitle: "Knowledge summary",
      knowledgeStandard: "Standards ontology",
      knowledgeCompany: "Company citation base",
      knowledgeRule: "Roles and principles",
      knowledgeStandardNote: "Specific standards and high-frequency standards in the current system.",
      knowledgeCompanyNote: "Companies linked to the selected standard.",
      knowledgeRuleNote: "Rules organized by standard, guidance, principle, and related roles.",
      resultsTitle: "Company filter results",
      resultsLead: "The table keeps key companies under the selected standard for briefing screenshots.",
      resultsCompany: "Company",
      resultsRank: "World500 rank",
      resultsStandard: "Selected standard",
      resultsStandardFacts: "Standard facts",
      resultsLinkedStandards: "Same-system standards",
      resultsScope: "Role / wording",
      resultsNoData: "No companies match the current filter.",
      resultsTruncated: "For readability, only the first {shown} companies are shown; the selected standard matches {total}. Click “show all {total} companies” to expand.",
      resultsExpanded: "All {total} company nodes are expanded. Click “collapse company nodes” to return to the compact view.",
      stageNote: "Click a standard or company node to navigate system -> standard -> company in one view.",
      noRoles: "Not tagged",
      noPrinciples: "Not tagged",
      noRank: "Not disclosed",
      companiesUnit: " companies",
      standardsUnit: " standards",
      factsUnit: " facts",
      showAllCompanies: "Show all {total} companies",
      collapseCompanies: "Collapse company nodes",
      previewNote: "The full-system entity graph is kept here; the left workbench supports readable drill-down and filtering.",
      evidenceTitle: "Evidence back-links",
      evidenceReport: "Report",
      evidencePage: "Page",
      evidenceConfidence: "Confidence",
      evidenceReview: "Review",
      evidenceEmpty: "No linked evidence.",
      sourceQuoteScopeNotice: "The source quote contains Scope wording, but this node is not a GHG Protocol fine-series standard. It is shown as source evidence, not as this standard's own terminology.",
      loadFailed: "Failed to load runtime standards navigation data. Check reporting_views.json.",
    },
  };

  const SCOPE_TERM_RE = /\bscope\s*(?:1|2|3|one|two|three|i|ii|iii)\b|范围\s*(?:1|2|3|一|二|三)|范畴\s*(?:1|2|3|一|二|三)/i;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function compact(value, limit = 260) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
  }

  function unique(values) {
    return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function formatInt(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString("en-US") : String(value ?? "");
  }

  function normalize(value) {
    return String(value ?? "").toLowerCase().trim();
  }

  function langFromConfig(config) {
    const configured = config?.labels?.lang;
    if (configured === "zh" || configured === "en") return configured;
    return document.documentElement.lang === "en" ? "en" : "zh";
  }

  function pathPrefix() {
    const pathname = window.location.pathname || "";
    return pathname.includes("/zh/") || pathname.includes("/en/") ? ".." : ".";
  }

  function pageHref(page) {
    const pathname = window.location.pathname || "";
    if (pathname.includes("/zh/") || pathname.includes("/en/")) return `./${page}`;
    const lang = document.documentElement.lang === "en" ? "en" : "zh";
    return `./${lang}/${page}`;
  }

  function localized(item, lang, zhKey, enKey, fallback = "") {
    if (!item) return fallback;
    return lang === "zh"
      ? (item[zhKey] || item[enKey] || fallback)
      : (item[enKey] || item[zhKey] || fallback);
  }

  function localizedArray(item, lang, zhKey, enKey) {
    const values = lang === "zh" ? item?.[zhKey] : item?.[enKey];
    const fallback = lang === "zh" ? item?.[enKey] : item?.[zhKey];
    return unique(Array.isArray(values) && values.length ? values : fallback);
  }

  function evidenceFromSample(sample, lang, context = {}) {
    const snippet = compact(localized(sample, lang, "snippet_zh", "snippet_en", sample?.snippet || ""));
    return {
      report: sample?.report || sample?.source_file || "",
      page: sample?.page || "",
      snippet,
      confidence: sample?.confidence || "",
      review_status: sample?.review_status || "",
      standard_id: context.standardId || "",
      standard_name: context.standardName || "",
      is_ghg_series: Boolean(context.isGhgSeries),
      non_ghg_scope_source_quote: !context.isGhgSeries && SCOPE_TERM_RE.test(snippet),
    };
  }

  function buildSystem(reporting, key, lang) {
    const graph = reporting.standard_role_graph || {};
    const definition = SYSTEMS[key];
    const standards = (graph.standards || []).filter((standard) => definition.filter(standard) && Number(standard.company_count || 0) > 0);
    const companiesById = new Map((graph.companies || []).map((company) => [company.company_id, company]));
    const linksByStandard = new Map();
    (graph.links || []).forEach((link) => {
      if (!linksByStandard.has(link.standard_id)) linksByStandard.set(link.standard_id, []);
      linksByStandard.get(link.standard_id).push(link);
    });

    const companyAgg = new Map();
    const standardRows = standards.map((standard) => {
      const links = linksByStandard.get(standard.id) || [];
      const roles = localizedArray(standard, lang, "roles_zh", "roles_en");
      const principles = localizedArray(standard, lang, "principles_zh", "principles_en");
      const name = localized(standard, lang, "name_zh", "name_en", standard.id);
      const evidenceContext = { standardId: standard.id, standardName: name, isGhgSeries: Boolean(standard.is_ghg_series) };
      const evidence = links
        .flatMap((link) => link.evidence_samples || [])
        .slice(0, 6)
        .map((sample) => evidenceFromSample(sample, lang, evidenceContext));
      const companyRows = links.map((link) => {
        const company = companiesById.get(link.company_id) || {};
        const companyName = localized(company, lang, "company_name_zh", "company_name_en", link.company_id);
        const samples = (link.evidence_samples || []).map((sample) => evidenceFromSample(sample, lang, evidenceContext));
        const row = {
          id: link.company_id,
          name: companyName,
          companyNameZh: company.company_name_zh || "",
          companyNameEn: company.company_name_en || "",
          rank: company.world500_rank,
          standardFactCount: link.evidence_count || 0,
          roles,
          principles,
          evidence: samples,
        };
        if (!companyAgg.has(link.company_id)) {
          companyAgg.set(link.company_id, {
            id: link.company_id,
            name: companyName,
            companyNameZh: company.company_name_zh || "",
            companyNameEn: company.company_name_en || "",
            rank: company.world500_rank,
            standards: [],
            roles: [],
            principles: [],
            evidenceByCategory: {},
          });
        }
        const aggregate = companyAgg.get(link.company_id);
        aggregate.standards.push(name);
        aggregate.roles.push(...roles);
        aggregate.principles.push(...principles);
        aggregate.evidenceByCategory[name] = samples;
        return row;
      }).sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
      return {
        id: standard.id,
        name,
        factCount: standard.evidence_count || links.reduce((sum, link) => sum + Number(link.evidence_count || 0), 0),
        companyCount: standard.company_count || companyRows.length,
        roles,
        principles,
        evidence,
        companies: companyRows,
      };
    }).sort((a, b) => Number(b.companyCount || 0) - Number(a.companyCount || 0));

    const companies = [...companyAgg.values()].map((company) => ({
      ...company,
      standards: unique(company.standards),
      roles: unique(company.roles),
      principles: unique(company.principles),
    })).sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));

    const labels = TEXT[lang];
    const systemLabels = {
      ghg: labels.ghgLabel,
      iso: labels.isoLabel,
      gb: labels.gbLabel,
    };
    const figureTitles = {
      ghg: labels.ghgTitle,
      iso: labels.isoTitle,
      gb: labels.gbTitle,
    };

    return {
      key,
      label: systemLabels[key],
      shortLabel: definition.shortLabel,
      color: definition.color,
      companyCount: companies.length,
      standardCount: standardRows.length,
      factCount: standardRows.reduce((sum, standard) => sum + Number(standard.factCount || 0), 0),
      roleCount: unique(standardRows.flatMap((standard) => standard.roles)).length,
      principleCount: unique(standardRows.flatMap((standard) => standard.principles)).length,
      figureSrc: `${pathPrefix()}/assets/figures/${lang}/${definition.figure}`,
      figureTitle: figureTitles[key],
      fullGraphHref: pageHref(definition.page),
      standards: standardRows,
      companies,
    };
  }

  function buildNavData(reporting, config, lang) {
    return {
      labels: TEXT[lang],
      systems: ["ghg", "iso", "gb"].map((key) => buildSystem(reporting, key, lang)).filter((system) => system.standards.length),
      defaultSystem: config.defaultSystem || "ghg",
      displayCompanyLimit: Number(config.displayCompanyLimit || 24),
    };
  }

  function rankLabel(rank, labels) {
    return rank === null || rank === undefined || rank === "" ? labels.noRank : `#${rank}`;
  }

  function openLightbox(trigger) {
    const lightbox = $("lightbox");
    const image = $("lightbox-image");
    const caption = $("lightbox-caption");
    if (!lightbox || !image || !caption) return;
    image.setAttribute("src", trigger.getAttribute("data-lightbox-src") || "");
    image.setAttribute("alt", trigger.getAttribute("data-lightbox-title") || "");
    caption.textContent = trigger.getAttribute("data-lightbox-title") || "";
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  async function fetchReporting(config) {
    const url = `${pathPrefix()}/assets/data/world500/workbench/reporting_views.json`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
    return response.json();
  }

  async function initEntityNavigator() {
    const root = $("world500-entity-nav");
    const dataNode = $("world500-entity-nav-data");
    if (!root || !dataNode) return;

    let config = {};
    try {
      config = JSON.parse(dataNode.textContent || "{}");
    } catch (error) {
      console.error("Failed to parse entity navigation runtime config.", error);
      return;
    }

    const lang = langFromConfig(config);
    const labels = TEXT[lang];
    let data;
    try {
      data = buildNavData(await fetchReporting(config), config, lang);
    } catch (error) {
      console.error(error);
      root.insertAdjacentHTML("afterbegin", `<div class="entity-empty">${escapeHtml(labels.loadFailed)}</div>`);
      return;
    }

    const systems = data.systems;
    const displayLimit = data.displayCompanyLimit;
    if (!systems.length) return;

    const elements = {
      tabs: $("entity-system-tabs"),
      search: $("entity-company-search"),
      reset: $("entity-reset-btn"),
      metrics: $("entity-live-metrics"),
      stage: $("entity-graph-stage"),
      stageLines: $("entity-stage-lines"),
      stageNote: $("entity-stage-note"),
      systemNode: $("entity-system-node"),
      standardList: $("entity-standard-list"),
      companyList: $("entity-company-list"),
      kbGrid: $("entity-kb-grid"),
      results: $("entity-results"),
      selection: $("entity-selection-card"),
      company: $("entity-company-card"),
      previewImage: $("entity-preview-image"),
      previewZoom: $("entity-preview-zoom"),
      previewNote: $("entity-preview-note"),
      overviewGrid: root.querySelector(".entity-overview-grid"),
      navCaption: root.querySelector(".entity-nav-caption"),
      searchLabel: root.querySelector(".entity-search span"),
      systemLane: root.querySelector(".entity-lane-system .entity-lane-title"),
      standardLane: root.querySelector(".entity-lane-standard .entity-lane-title"),
      companyLane: root.querySelector(".entity-lane-company .entity-lane-title"),
    };

    if (elements.navCaption) elements.navCaption.textContent = labels.tabCaption;
    if (elements.searchLabel) elements.searchLabel.textContent = labels.searchLabel;
    if (elements.search) elements.search.placeholder = labels.searchPlaceholder;
    if (elements.reset) elements.reset.textContent = labels.resetLabel;
    if (elements.systemLane) elements.systemLane.textContent = labels.systemLane;
    if (elements.standardLane) elements.standardLane.textContent = labels.standardLane;
    if (elements.companyLane) elements.companyLane.textContent = labels.companyLane;

    const state = {
      systemKey: data.defaultSystem || systems[0].key,
      standardName: "",
      query: "",
      selectedCompanyId: "",
      showAllCompanies: false,
    };

    function getSystem() {
      return systems.find((item) => item.key === state.systemKey) || systems[0];
    }

    function getStandard(system) {
      return (system.standards || []).find((item) => item.name === state.standardName) || (system.standards || [])[0] || null;
    }

    function getCompany(system, companyId) {
      return (system.companies || []).find((item) => item.id === companyId) || null;
    }

    function matchesCompanyQuery(item, query) {
      return [item.id, item.name, item.companyNameZh, item.companyNameEn, item.rank]
        .some((value) => normalize(value).includes(query));
    }

    function getVisibleCompanies(system, standard) {
      const query = normalize(state.query);
      if (!query) {
        return standard ? [...(standard.companies || [])] : [];
      }
      const seen = new Set();
      const matches = [];
      (system.standards || []).forEach((item) => {
        (item.companies || []).forEach((company) => {
          if (seen.has(company.id) || !matchesCompanyQuery(company, query)) return;
          seen.add(company.id);
          matches.push({ ...company, standardName: item.name });
        });
      });
      return matches;
    }

    function ensureState() {
      const system = getSystem();
      const standards = system.standards || [];
      if (!standards.some((item) => item.name === state.standardName)) {
        state.standardName = standards[0]?.name || "";
      }
      const standard = getStandard(system);
      const visible = getVisibleCompanies(system, standard);
      if (state.selectedCompanyId && !visible.some((item) => item.id === state.selectedCompanyId)) {
        state.selectedCompanyId = "";
      }
    }

    function renderOverviewCards() {
      if (!elements.overviewGrid) return;
      elements.overviewGrid.innerHTML = systems.map((system) => `
        <article class="entity-overview-card">
          <div class="entity-overview-head">
            <div>
              <div class="entity-overview-kicker">${escapeHtml(system.shortLabel)}</div>
              <h3>${escapeHtml(system.label)}</h3>
            </div>
            <div class="entity-overview-actions-inline">
              <button class="pill entity-overview-jump" type="button" data-entity-jump-system="${escapeHtml(system.key)}">${escapeHtml(labels.overviewButton)}</button>
              <a class="pill entity-overview-cta" href="${escapeHtml(system.fullGraphHref)}">${escapeHtml(labels.overviewCta)}</a>
            </div>
          </div>
          <img class="entity-overview-image visual-figure" src="${escapeHtml(system.figureSrc)}" alt="${escapeHtml(system.figureTitle)}" data-lightbox-src="${escapeHtml(system.figureSrc)}" data-lightbox-title="${escapeHtml(system.figureTitle)}" tabindex="0">
          <div class="entity-overview-metrics">
            <span><strong>${escapeHtml(formatInt(system.companyCount))}</strong>${escapeHtml(labels.overviewCompanies)}</span>
            <span><strong>${escapeHtml(formatInt(system.standardCount))}</strong>${escapeHtml(labels.overviewStandards)}</span>
            <span><strong>${escapeHtml(formatInt(system.factCount))}</strong>${escapeHtml(labels.overviewFacts)}</span>
          </div>
        </article>
      `).join("");
      elements.overviewGrid.querySelectorAll("[data-entity-jump-system]").forEach((button) => {
        button.addEventListener("click", () => {
          state.systemKey = button.getAttribute("data-entity-jump-system") || state.systemKey;
          state.standardName = "";
          state.selectedCompanyId = "";
          state.showAllCompanies = false;
          render();
        });
      });
      elements.overviewGrid.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
        trigger.addEventListener("click", () => openLightbox(trigger));
        trigger.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(trigger);
          }
        });
      });
    }

    function renderTabs(system) {
      elements.tabs.innerHTML = systems.map((item) => `
        <button class="entity-system-tab${item.key === system.key ? " is-active" : ""}" type="button" data-system-key="${escapeHtml(item.key)}">
          <span>${escapeHtml(item.shortLabel)}</span>
          <strong>${escapeHtml(item.label)}</strong>
          <em>${escapeHtml(formatInt(item.companyCount))}${escapeHtml(labels.companiesUnit)}</em>
        </button>
      `).join("");
      elements.tabs.querySelectorAll("[data-system-key]").forEach((button) => {
        button.addEventListener("click", () => {
          state.systemKey = button.getAttribute("data-system-key") || state.systemKey;
          state.standardName = "";
          state.selectedCompanyId = "";
          state.showAllCompanies = false;
          render();
        });
      });
    }

    function renderMetrics(system, standard, visibleCompanies) {
      const items = [
        [labels.metricsSystemCompanies, system.companyCount],
        [labels.metricsSystemStandards, system.standardCount],
        [labels.metricsSystemFacts, system.factCount],
        [labels.metricsFilteredCompanies, visibleCompanies.length],
        [labels.metricsRoleCount, system.roleCount + system.principleCount],
      ];
      elements.metrics.innerHTML = items.map(([label, value]) => `
        <div class="metric"><h3>${escapeHtml(label)}</h3><strong>${escapeHtml(formatInt(value))}</strong></div>
      `).join("");
    }

    function renderSystemNode(system) {
      elements.systemNode.innerHTML = `
        <button class="entity-system-node-card" type="button" style="--entity-node-color:${escapeHtml(system.color)}">
          <span>${escapeHtml(system.shortLabel)}</span>
          <strong>${escapeHtml(system.label)}</strong>
          <em>${escapeHtml(formatInt(system.standardCount))}${escapeHtml(labels.standardsUnit)} · ${escapeHtml(formatInt(system.companyCount))}${escapeHtml(labels.companiesUnit)}</em>
        </button>
      `;
    }

    function renderStandards(system, selectedCompany) {
      const linkedStandards = selectedCompany ? new Set(selectedCompany.standards || []) : new Set();
      elements.standardList.innerHTML = (system.standards || []).map((item) => {
        const active = item.name === state.standardName;
        const linked = linkedStandards.has(item.name);
        const roleText = item.roles?.length ? item.roles.join(" | ") : labels.noRoles;
        const principleText = item.principles?.length ? item.principles.join(" | ") : labels.noPrinciples;
        return `
          <div class="entity-standard-node${active ? " is-active" : ""}${linked ? " is-linked-company" : ""}">
            <button class="entity-standard-node-btn" type="button" data-standard-name="${escapeHtml(item.name)}">
              <span class="entity-node-name">${escapeHtml(item.name)}</span>
              <span class="entity-node-meta">${escapeHtml(formatInt(item.companyCount))}${escapeHtml(labels.companiesUnit)} · ${escapeHtml(formatInt(item.factCount))}${escapeHtml(labels.factsUnit)}</span>
              <span class="entity-node-mini">${escapeHtml(roleText)} · ${escapeHtml(principleText)}</span>
            </button>
          </div>
        `;
      }).join("");
      elements.standardList.querySelectorAll("[data-standard-name]").forEach((button) => {
        button.addEventListener("click", () => {
          state.standardName = button.getAttribute("data-standard-name") || "";
          state.selectedCompanyId = "";
          state.showAllCompanies = false;
          render();
        });
      });
    }

    function renderCompanies(system, standard, visibleCompanies) {
      const total = visibleCompanies.length;
      const showAll = state.showAllCompanies || total <= displayLimit;
      const shown = showAll ? visibleCompanies : visibleCompanies.slice(0, displayLimit);
      if (!shown.length) {
        elements.companyList.innerHTML = `<div class="entity-empty">${escapeHtml(labels.resultsNoData)}</div>`;
        return shown;
      }
      const rows = shown.map((item) => {
        const linkedCompany = getCompany(system, item.id);
        const linkedCount = linkedCompany ? (linkedCompany.standards || []).length : 0;
        const standardName = item.standardName || standard.name;
        return `
          <div class="entity-company-node${item.id === state.selectedCompanyId ? " is-active" : ""}">
            <button class="entity-company-node-btn" type="button" data-company-id="${escapeHtml(item.id)}" data-standard-name="${escapeHtml(standardName)}">
              <span class="entity-company-rank">${escapeHtml(rankLabel(item.rank, labels))}</span>
              <span class="entity-node-name">${escapeHtml(item.name)}</span>
              <span class="entity-node-meta">${escapeHtml(standardName)} · ${escapeHtml(formatInt(item.standardFactCount))}${escapeHtml(labels.factsUnit)} · ${escapeHtml(formatInt(linkedCount))}${escapeHtml(labels.standardsUnit)}</span>
            </button>
          </div>
        `;
      }).join("");
      const toggle = total > displayLimit ? `
        <div class="entity-company-toggle">
          <button class="pill entity-company-toggle-btn" type="button" data-company-toggle="true">
            ${escapeHtml((showAll ? labels.collapseCompanies : labels.showAllCompanies).replace("{total}", String(total)))}
          </button>
        </div>
      ` : "";
      elements.companyList.innerHTML = rows + toggle;
      elements.companyList.querySelectorAll("[data-company-id]").forEach((button) => {
        button.addEventListener("click", () => {
          state.standardName = button.getAttribute("data-standard-name") || state.standardName;
          state.selectedCompanyId = button.getAttribute("data-company-id") || "";
          render();
        });
      });
      const toggleButton = elements.companyList.querySelector("[data-company-toggle]");
      if (toggleButton) {
        toggleButton.addEventListener("click", () => {
          state.showAllCompanies = !showAll;
          render();
        });
      }
      return shown;
    }

    function renderStageNote(standard, shownCount, totalCount) {
      let note = labels.stageNote;
      if (totalCount > displayLimit && shownCount >= totalCount) {
        note += ` ${labels.resultsExpanded.replace("{total}", String(totalCount))}`;
      } else if (totalCount > shownCount) {
        note += ` ${labels.resultsTruncated.replace("{shown}", String(shownCount)).replace("{total}", String(totalCount))}`;
      }
      note += standard ? ` ${standard.name}` : "";
      elements.stageNote.textContent = note.trim();
    }

    function renderKnowledge(system, standard, visibleCompanies) {
      const standardSummary = (system.standards || []).slice(0, 3).map((item) => item.name).join(" | ");
      const companySummary = visibleCompanies.slice(0, 3).map((item) => item.name).join(" | ");
      const ruleSummary = [...(standard?.roles || []), ...(standard?.principles || [])].slice(0, 4).join(" | ");
      elements.kbGrid.innerHTML = `
        <div class="entity-kb-card"><strong>${escapeHtml(labels.knowledgeTitle)}</strong><h4>${escapeHtml(labels.knowledgeStandard)}</h4><p>${escapeHtml(labels.knowledgeStandardNote)}</p><p>${escapeHtml(standardSummary || labels.noRoles)}</p></div>
        <div class="entity-kb-card"><strong>${escapeHtml(labels.knowledgeTitle)}</strong><h4>${escapeHtml(labels.knowledgeCompany)}</h4><p>${escapeHtml(labels.knowledgeCompanyNote)}</p><p>${escapeHtml(companySummary || labels.resultsNoData)}</p></div>
        <div class="entity-kb-card"><strong>${escapeHtml(labels.knowledgeTitle)}</strong><h4>${escapeHtml(labels.knowledgeRule)}</h4><p>${escapeHtml(labels.knowledgeRuleNote)}</p><p>${escapeHtml(ruleSummary || labels.noPrinciples)}</p></div>
      `;
    }

    function renderResults(system, standard, visibleCompanies) {
      const rows = visibleCompanies.slice(0, 12).map((item) => {
        const linkedCompany = getCompany(system, item.id);
        const linkedCount = linkedCompany ? (linkedCompany.standards || []).length : 0;
        const roleText = item.roles?.length ? item.roles.join(" | ") : labels.noRoles;
        return `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(rankLabel(item.rank, labels))}</td><td>${escapeHtml(item.standardName || standard.name)}</td><td>${escapeHtml(formatInt(item.standardFactCount))}</td><td>${escapeHtml(formatInt(linkedCount))}</td><td>${escapeHtml(roleText)}</td></tr>`;
      }).join("");
      elements.results.innerHTML = `
        <div class="table-card">
          <h3>${escapeHtml(labels.resultsTitle)}</h3>
          <p class="table-lead">${escapeHtml(labels.resultsLead)}</p>
          <div class="table-wrap">
            <table>
              <tr><th>${escapeHtml(labels.resultsCompany)}</th><th>${escapeHtml(labels.resultsRank)}</th><th>${escapeHtml(labels.resultsStandard)}</th><th>${escapeHtml(labels.resultsStandardFacts)}</th><th>${escapeHtml(labels.resultsLinkedStandards)}</th><th>${escapeHtml(labels.resultsScope)}</th></tr>
              ${rows || `<tr><td colspan="6">${escapeHtml(labels.resultsNoData)}</td></tr>`}
            </table>
          </div>
        </div>
      `;
    }

    function renderEvidenceList(items) {
      if (!Array.isArray(items) || !items.length) {
        return `<div class="entity-evidence-block"><h4>${escapeHtml(labels.evidenceTitle)}</h4><p>${escapeHtml(labels.evidenceEmpty)}</p></div>`;
      }
      const rows = items.slice(0, 5).map((item) => `
        <article class="entity-evidence-item">
          ${item.non_ghg_scope_source_quote ? `<div class="entity-evidence-notice">${escapeHtml(labels.sourceQuoteScopeNotice)}</div>` : ""}
          <div class="entity-evidence-head"><strong>${escapeHtml(item.report || "")}</strong><span>${escapeHtml(labels.evidencePage)} ${escapeHtml(item.page || "-")}</span></div>
          <p>${escapeHtml(item.snippet || "")}</p>
          <div class="entity-evidence-meta">
            <span>${escapeHtml(labels.evidenceReport)}: ${escapeHtml(item.report || "-")}</span>
            <span>${escapeHtml(labels.evidenceConfidence)}: ${escapeHtml(item.confidence || "-")}</span>
            <span>${escapeHtml(labels.evidenceReview)}: ${escapeHtml(item.review_status || "-")}</span>
          </div>
        </article>
      `).join("");
      return `<div class="entity-evidence-block"><h4>${escapeHtml(labels.evidenceTitle)}</h4>${rows}</div>`;
    }

    function renderSelection(system, standard, selectedCompany) {
      const roleText = standard?.roles?.length ? standard.roles.join(" | ") : labels.noRoles;
      const principleText = standard?.principles?.length ? standard.principles.join(" | ") : labels.noPrinciples;
      elements.selection.innerHTML = `
        <h3>${escapeHtml(labels.selectionTitle)}</h3>
        <div class="entity-inspector-grid">
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.selectionSystem)}</strong><span>${escapeHtml(system.label)}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.selectionStandard)}</strong><span>${escapeHtml(standard ? standard.name : "")}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.selectionRoles)}</strong><span>${escapeHtml(roleText)}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.selectionPrinciples)}</strong><span>${escapeHtml(principleText)}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.selectionFactCount)}</strong><span>${escapeHtml(formatInt(standard ? standard.factCount : 0))}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.selectionCompanyCount)}</strong><span>${escapeHtml(formatInt(standard ? standard.companyCount : 0))}</span></div>
        </div>
        ${selectedCompany ? `<p style="margin-top:12px;">${escapeHtml(selectedCompany.name)}</p>` : ""}
        ${renderEvidenceList(standard?.evidence || [])}
      `;
    }

    function renderCompanyCard(system, standard, selectedCompany, standardCompany) {
      if (!selectedCompany) {
        elements.company.innerHTML = `<h3>${escapeHtml(labels.companyTitle)}</h3><p>${escapeHtml(labels.companyEmpty)}</p>`;
        return;
      }
      const linkedStandards = (selectedCompany.standards || []).map((item) => `<span class="entity-linked-pill">${escapeHtml(item)}</span>`).join("");
      const roleText = selectedCompany.roles?.length ? selectedCompany.roles.join(" | ") : labels.noRoles;
      const principleText = selectedCompany.principles?.length ? selectedCompany.principles.join(" | ") : labels.noPrinciples;
      const evidenceRows = standardCompany?.evidence?.length
        ? standardCompany.evidence
        : ((selectedCompany.evidenceByCategory && standard) ? (selectedCompany.evidenceByCategory[standard.name] || []) : []);
      elements.company.innerHTML = `
        <h3>${escapeHtml(labels.companyTitle)}</h3>
        <div class="entity-inspector-grid">
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.resultsCompany)}</strong><span>${escapeHtml(selectedCompany.name)}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.companyRank)}</strong><span>${escapeHtml(rankLabel(selectedCompany.rank, labels))}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.companyRoles)}</strong><span>${escapeHtml(roleText)}</span></div>
          <div class="entity-inspector-item"><strong>${escapeHtml(labels.companyPrinciples)}</strong><span>${escapeHtml(principleText)}</span></div>
        </div>
        <div class="entity-linked-list">${linkedStandards || `<span class="entity-linked-pill">${escapeHtml(labels.noRoles)}</span>`}</div>
        ${renderEvidenceList(evidenceRows)}
      `;
    }

    function updatePreview(system) {
      const note = `${labels.previewNote} ${system.label}`;
      elements.previewImage.setAttribute("src", system.figureSrc);
      elements.previewImage.setAttribute("alt", system.figureTitle);
      elements.previewImage.setAttribute("data-lightbox-src", system.figureSrc);
      elements.previewImage.setAttribute("data-lightbox-title", system.figureTitle);
      elements.previewZoom.setAttribute("data-lightbox-src", system.figureSrc);
      elements.previewZoom.setAttribute("data-lightbox-title", system.figureTitle);
      elements.previewZoom.textContent = labels.overviewCta;
      elements.previewNote.textContent = note;
    }

    function drawCurve(svg, x1, y1, x2, y2, className) {
      const midX = x1 + (x2 - x1) * 0.52;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
      path.setAttribute("class", className);
      svg.appendChild(path);
    }

    function drawLines() {
      const stageRect = elements.stage.getBoundingClientRect();
      if (!stageRect.width || !stageRect.height) return;
      const svg = elements.stageLines;
      svg.innerHTML = "";
      svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
      const systemCard = elements.systemNode.querySelector(".entity-system-node-card");
      if (!systemCard) return;
      const systemRect = systemCard.getBoundingClientRect();
      const systemX = systemRect.right - stageRect.left;
      const systemY = systemRect.top - stageRect.top + systemRect.height / 2;
      elements.standardList.querySelectorAll(".entity-standard-node-btn").forEach((button) => {
        const rect = button.getBoundingClientRect();
        const className = button.parentElement.classList.contains("is-active") ? "entity-line-path is-primary" : "entity-line-path";
        drawCurve(svg, systemX, systemY, rect.left - stageRect.left, rect.top - stageRect.top + rect.height / 2, className);
      });
      const activeStandard = elements.standardList.querySelector(".entity-standard-node.is-active .entity-standard-node-btn");
      if (!activeStandard) return;
      const activeRect = activeStandard.getBoundingClientRect();
      const activeX = activeRect.right - stageRect.left;
      const activeY = activeRect.top - stageRect.top + activeRect.height / 2;
      elements.companyList.querySelectorAll(".entity-company-node-btn").forEach((button) => {
        const rect = button.getBoundingClientRect();
        const className = button.parentElement.classList.contains("is-active") ? "entity-line-path is-primary" : "entity-line-path is-faded";
        drawCurve(svg, activeX, activeY, rect.left - stageRect.left, rect.top - stageRect.top + rect.height / 2, className);
      });
    }

    function render() {
      const system = getSystem();
      if (!system) return;
      root.style.setProperty("--entity-tone", system.color || "#4c8f74");
      ensureState();
      const currentSystem = getSystem();
      const standard = getStandard(currentSystem);
      const visibleCompanies = getVisibleCompanies(currentSystem, standard);
      const selectedCompany = getCompany(currentSystem, state.selectedCompanyId);
      const selectedStandardCompany = (standard?.companies || []).find((item) => item.id === state.selectedCompanyId) || null;
      const shownCompanies = renderCompanies(currentSystem, standard, visibleCompanies);
      renderTabs(currentSystem);
      renderMetrics(currentSystem, standard, visibleCompanies);
      renderSystemNode(currentSystem);
      renderStandards(currentSystem, selectedCompany);
      renderKnowledge(currentSystem, standard, visibleCompanies);
      renderResults(currentSystem, standard, visibleCompanies);
      renderSelection(currentSystem, standard, selectedStandardCompany || selectedCompany);
      renderCompanyCard(currentSystem, standard, selectedCompany, selectedStandardCompany);
      updatePreview(currentSystem);
      renderStageNote(standard, shownCompanies.length, visibleCompanies.length);
      window.requestAnimationFrame(drawLines);
    }

    renderOverviewCards();

    if (elements.search) {
      elements.search.addEventListener("input", (event) => {
        state.query = event.target.value || "";
        state.selectedCompanyId = "";
        state.showAllCompanies = false;
        render();
      });
    }

    if (elements.reset) {
      elements.reset.addEventListener("click", () => {
        state.systemKey = data.defaultSystem || systems[0].key;
        state.standardName = "";
        state.query = "";
        state.selectedCompanyId = "";
        state.showAllCompanies = false;
        if (elements.search) elements.search.value = "";
        render();
      });
    }

    window.addEventListener("resize", () => window.requestAnimationFrame(drawLines));
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEntityNavigator);
  } else {
    initEntityNavigator();
  }
})();
