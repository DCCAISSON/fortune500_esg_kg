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
  const figureBase = config.figureBase || `../assets/figures/${lang}`;
  const state = {
    payload: null,
    audit: null,
    gapSummary: null,
    requirementMatrix: null,
    workplan: null,
    selectedStandardId: "",
  };

  const L = {
    zh: {
      loading: "正在加载报告视图数据...",
      loadError: "报告视图数据加载失败。",
      loaded: "报告视图已加载",
      noData: "暂无可显示记录",
      openWorkbench: "打开企业工作台",
      auditTitle: "任务完成度与知识图谱风险审计",
      auditLead: "该审计结果由 reporting_completion_audit.json 自动生成，用于区分已实现展示、部分实现、以及仍需复核的证据强度问题。",
      auditGenerated: "生成日期",
      auditHeaders: ["状态", "关注点", "当前证据", "剩余工作"],
      auditKnownIssues: "已知同步风险",
      auditNoData: "暂无审计结果，请先运行 tools/audit_reporting_completion.py。",
      auditBacklogTitle: "证据补强队列摘要",
      auditBacklogLead: "下表把仍为 partial 的核心缺口转成可执行队列。只有这些队列被补强并通过复核后，知识图谱才可以从“展示完成”推进到“证据闭环”。",
      auditBacklogHeaders: ["缺口", "当前口径", "待处理数量", "下一步", "队列文件"],
      gapSummaryTitle: "未完成内容与知识图谱问题总览",
      gapSummaryLead: "该总览来自 reporting_gap_status_summary.json，用于直接回答“哪些完成、哪些没有完成、为什么还不能算证据闭环”。",
      gapSummaryHeaders: ["任务", "状态", "已实现", "仍需完善"],
      requirementMatrixTitle: "证据边界矩阵",
      requirementMatrixLead: "该矩阵把核心关注点映射到当前证据、未闭环队列和公开结论边界，用于说明哪些内容可以作为采信结论，哪些仍需复核。",
      requirementMatrixHeaders: ["关注点", "状态", "可作为结论", "未闭环队列", "仍需完善", "证据文件"],
      closureBatchTitle: "P0 证据闭环批处理入口",
      closureBatchLead: "这些批处理文件把未闭环队列按公司、报告和页码分组，方便继续回到 PDF 页级证据；它们不是自动采信或自动升级结果。",
      closureBatchHeaders: ["批次", "行数", "用途边界", "文件"],
      authoritativeExportTitle: "可采信导出与复核导出",
      authoritativeExportLead: "这里把可直接用于结论的表和只能用于复核的表分开，避免把待复核证据误当成知识图谱结论。",
      authoritativeExportHeaders: ["导出表", "行数", "用途边界", "文件"],
      nextPriorityTitle: "下一步优先级",
      evidencePolicy: "审计口径",
      ghgTitle: "一、GHG Protocol 标准、指南与协议映射",
      ghgLead: "GHG Protocol 进一步拆分为标准、指南、项目协议、行业指南、政策/目标标准等角色族；只有原文明确写出具体名称时才归入对应细类，泛化 GHG Protocol 引用保留为待复核。",
      ghgTaxonomyTitle: "GHG Protocol 角色族细分",
      ghgSeriesHeaders: ["GHG 细类", "类型", "角色", "强证据企业数", "上下文待复核", "强证据率", "证据数", "原则/口径"],
      ghgCompanyHeaders: ["排名", "企业", "采信细分数", "待复核线索", "已采信系列", "证据页"],
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
      technologyLead: "技术路径从现有技术全屏图谱抽取 9 类技术族，并补充细分方向、时间趋势和成本信号。这里展示的是企业报告中的披露信号聚类；成本/时间仍是关键词证据。下方单独列出已通过页码、来源文件、片段和项目/措施名称门禁的项目级证据。",
      techHeaders: ["技术族", "企业数", "披露证据", "项目证据", "细分方向", "时间趋势", "成本信号", "标准对齐"],
      projectEvidenceTitle: "页级项目证据层",
      projectEvidenceLead: "只有同时具备 source_file、page、snippet、项目或措施名称的企业-技术关系才进入本表；其余技术关系继续作为披露信号或复核队列。",
      projectHeaders: ["企业", "技术族", "项目/措施", "阶段", "年份", "成本/投资", "减排效果", "页码", "来源", "证据片段"],
      sourceMixTitle: "五、初级/次级数据气泡图",
      sourceMixLead: "主气泡图只展示企业原文明示的初级数据百分比；method_rows 来源结构比例保留为推断复核数据，不作为强证据气泡。",
      sourceMixHeaders: ["企业", "行业", "初级占比", "比例依据", "明示百分比", "已分类来源行", "未分类行", "方法证据行", "说明"],
      near: "近端",
      mid: "中期",
      long: "长期",
      costSignals: "成本信号",
      sourceMixAxisX: "初级数据占比（原文明示优先，否则来源结构推断）",
      sourceMixAxisY: "已分类来源证据行数",
    },
    en: {
      loading: "Loading reporting views...",
      loadError: "Failed to load reporting views.",
      loaded: "Reporting views loaded",
      noData: "No records to display",
      openWorkbench: "Open workbench",
      auditTitle: "Task Completion And Knowledge-Graph Risk Audit",
      auditLead: "This audit is generated from reporting_completion_audit.json to separate implemented presentation work from partial evidence-strength coverage.",
      auditGenerated: "Generated",
      auditHeaders: ["Status", "Focus area", "Current evidence", "Remaining work"],
      auditKnownIssues: "Known Sync Risks",
      auditNoData: "No audit result is available. Run tools/audit_reporting_completion.py first.",
      auditBacklogTitle: "Evidence-strengthening backlog",
      auditBacklogLead: "The table converts the remaining partial gaps into executable review queues. The graph should be treated as evidence-closed only after these queues are strengthened and reviewed.",
      auditBacklogHeaders: ["Gap", "Current basis", "Open volume", "Next step", "Queue files"],
      gapSummaryTitle: "Remaining Gaps And Knowledge-Graph Issues",
      gapSummaryLead: "This overview is generated from reporting_gap_status_summary.json and directly separates completed presentation work from unresolved evidence-closure gaps.",
      gapSummaryHeaders: ["Task", "Status", "Implemented", "Still needed"],
      requirementMatrixTitle: "Evidence Boundary Matrix",
      requirementMatrixLead: "This matrix maps core focus areas to current evidence, unresolved queues, and whether the evidence boundary is closed enough to support a public conclusion.",
      requirementMatrixHeaders: ["Focus area", "Status", "Can claim complete", "Open queues", "Still needed", "Proof files"],
      closureBatchTitle: "P0 Evidence Review Queue Entry Points",
      closureBatchLead: "These batch files group unresolved queues by company, report, and page so review can return to PDF-level evidence. They are not automatic promotions or authoritative upgrades.",
      closureBatchHeaders: ["Batch", "Rows", "Boundary", "Files"],
      authoritativeExportTitle: "Accepted Data Exports And Review-Only Data",
      authoritativeExportLead: "Accepted conclusion tables are separated from review-only tables so contextual evidence is not misread as knowledge-graph conclusions.",
      authoritativeExportHeaders: ["Export", "Rows", "Boundary", "Files"],
      nextPriorityTitle: "Next priority order",
      evidencePolicy: "Audit policy",
      ghgTitle: "I. GHG Protocol Standards, Guidance, and Protocol Mapping",
      ghgLead: "GHG Protocol is split into standards, guidance, project protocols, sector guidance, and policy/goal standards. A company is assigned to a fine class only when the source text names it; generic GHG mentions remain review-required.",
      ghgTaxonomyTitle: "GHG Protocol role-family taxonomy",
      ghgSeriesHeaders: ["GHG fine class", "Type", "Role", "Strong-evidence companies", "Contextual review", "Strong-evidence rate", "Evidence rows", "Principle / wording policy"],
      ghgCompanyHeaders: ["Rank", "Company", "Accepted fine series", "Review leads", "Accepted series", "Evidence pages"],
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
      technologyLead: "The path view extracts the existing nine technology families from the full-screen technology graph and adds subtypes, time-horizon signals, and cost-signal counts. Disclosure clusters remain keyword evidence. A separate table lists only page-level project evidence that has source_file, page, snippet, and project or measure name.",
      techHeaders: ["Technology family", "Companies", "Disclosure evidence", "Project evidence", "Subtypes", "Timeline", "Cost signals", "Standards alignment"],
      projectEvidenceTitle: "Page-level project evidence layer",
      projectEvidenceLead: "Only company-technology relationships with source_file, page, snippet, and project or measure name enter this table. All other technology relationships remain disclosure signals or review queues.",
      projectHeaders: ["Company", "Technology family", "Project / measure", "Stage", "Years", "Cost / investment", "Abatement effect", "Page", "Source", "Evidence snippet"],
      sourceMixTitle: "V. Primary / Secondary Data Bubble Chart",
      sourceMixLead: "The main bubble chart shows only explicitly reported primary-data percentages. method_rows source-mix ratios are retained as inference review data, not strong-evidence bubbles.",
      sourceMixHeaders: ["Company", "Industry", "Primary share", "Ratio basis", "Reported %", "Classified rows", "Unclassified rows", "Method rows", "Note"],
      near: "Near",
      mid: "Mid",
      long: "Long",
      costSignals: "Cost signals",
      sourceMixAxisX: "Primary-data share (explicit reported first, otherwise source-mix inference)",
      sourceMixAxisY: "Classified source-evidence rows",
    },
  }[lang];

  const GAP_SUMMARY_EN_FALLBACK = {
    ghg_protocol_fine_series: {
      status_en: "Partially complete",
      implemented_en: "GHG Protocol has been split into fine-series standard, guidance, project-protocol, and program nodes and is shown in Figure 2, the GHG full-screen graph, and the standard role-family graph.",
      remaining_en: "Explicit evidence remains insufficient for every GHG-related company-series edge. Contextual mappings must remain review-only and must not be treated as strong evidence.",
    },
    standard_company_relationships: {
      status_en: "Structure complete; evidence quality still needs improvement",
      implemented_en: "The standard role graph contains standard nodes, company nodes, and standard-company relationships; the full-screen graph colors standards and industries distinctly.",
      remaining_en: "The relationship structure exists, but each edge still needs stronger page-level traceability, snippet completeness, and evidence-strength review.",
    },
    emissions_ranking: {
      status_en: "Partially complete",
      implemented_en: "A strong-evidence total-emissions ranking and static PNG have been generated from the current reporting data snapshot.",
      remaining_en: "Only companies that meet the complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence comparable-ranking gate can enter the comparable ranking. Partial totals must not be mixed into the complete ranking.",
    },
    standard_full_graph_runtime: {
      status_en: "Implemented",
      implemented_en: "All full-graph HTML pages now use embedded JSON. The GHG/Standard role-family pages embed same-source reporting_views graph subsets, while the generic pages use strict versioned JSON plus shared generic_full_graph.js. Static fallback and old inline runtime have been removed.",
      remaining_en: "Two legacy principle role-family pages have no drawable nodes and now enter a visible empty-data state. This is a data gap, not a runtime fallback.",
    },
    scope_language_policy: {
      status_en: "Policy implemented; source quotations still need review",
      implemented_en: "Pages and graphs now state that Scope 1/2/3 terminology applies only under GHG Protocol context; non-GHG standards default to direct/indirect emissions wording. Non-GHG standard name/role/principle Scope-term misuse is currently zero.",
      remaining_en: "Some source quotations still contain Scope wording and need review to confirm that they are quoted source context only, not non-GHG standard terminology.",
    },
    technology_path_axis: {
      status_en: "Presentation complete; evidence validation incomplete",
      implemented_en: "Figure 6 now shows technology paths with flow, standards alignment, subtypes, timeline signals, cost signals, and bilingual static PNGs.",
      remaining_en: "Technology-company relationships remain disclosure keyword signals until project, cost, or abatement evidence is validated. Company-level evidence, timeline validation, and cost/investment validation queues remain open.",
    },
    primary_secondary_bubble: {
      status_en: "Presentation complete; calculation-weight evidence incomplete",
      implemented_en: "The primary/secondary bubble chart exists and is generated from the current source-mix data snapshot.",
      remaining_en: "Only explicitly reported primary-data percentages should be treated as reported calculation weights. Remaining ratios are source-mix inference until audited.",
    },
    static_png_sync: {
      status_en: "Implemented",
      implemented_en: "The emissions ranking, Figure 2, Figure 6, and primary/secondary bubble chart all have bilingual static PNGs. The manifest records the reporting_views source hash and each PNG hash.",
      remaining_en: "Whenever reporting_views.json changes, sync_reporting_static_figures.py must be rerun.",
    },
  };

  const GAP_NEXT_PRIORITY_EN = [
    "P0: Return GHG contextual/review edges to page-level PDF evidence; upgrade only explicitly named fine-series citations, and demote or remove weak contextual edges.",
    "P0: Close emissions-ranking gaps for Scope 1, Scope 2 method/value, and Scope 3 so partial totals are not treated as complete comparable rankings.",
    "P1: Upgrade technology paths from keyword signals to company-level project evidence, timeline milestones, and cost/investment evidence.",
    "P1: Upgrade primary/secondary data ratios from source-mix inference to true calculation-weight evidence or explicitly reported primary-data percentages.",
    "P2: Continue reviewing Scope wording in non-GHG standard source quotations so it remains source context and is not promoted into non-GHG standard terminology.",
  ];

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

  function queueLink(file, label) {
    if (!file) return "";
    const href = file.startsWith("assets/data/world500/workbench/")
      ? `${assetBase}/${file.split("/").pop()}`
      : `${assetBase}/${file}`;
    return `<a class="graph-table-button" href="${escapeHtml(href)}">${escapeHtml(label || file.split("/").pop())}</a>`;
  }

  function assetLink(file, label) {
    if (!file) return "";
    if (file.startsWith("assets/data/world500/workbench/")) return queueLink(file, label);
    const href = file.startsWith("assets/") || file.startsWith("zh/") || file.startsWith("en/") || file.startsWith("tools/")
      ? `../${file}`
      : file;
    return `<a class="graph-table-button" href="${escapeHtml(href)}">${escapeHtml(label || file.split("/").pop())}</a>`;
  }

  function linkList(files, limit = 4) {
    const items = Array.isArray(files) ? files.filter(Boolean) : [];
    const links = items.slice(0, limit).map((file) => assetLink(file, file.split("/").pop()));
    if (items.length > limit) {
      links.push(`<span class="tag">+${escapeHtml(formatInt(items.length - limit))}</span>`);
    }
    return links.join(" ");
  }

  function gapSummaryText(item, field, zhField, fallback = "-") {
    if (lang === "zh") return item?.[zhField] || item?.[field] || fallback;
    const englishFallback = GAP_SUMMARY_EN_FALLBACK[item?.id || ""] || {};
    return item?.[field] || englishFallback[field] || item?.[zhField] || fallback;
  }

  function renderRequirementMatrix() {
    const matrix = state.requirementMatrix;
    if (!matrix || !Array.isArray(matrix.requirements)) return "";
    const rows = matrix.requirements.map((item) => {
      const status = item.status_key || "partial";
      const canClaim = Boolean(item.can_claim_complete);
      return [
        escapeHtml(lang === "zh" ? (item.requirement_zh || item.requirement_id) : (item.requirement_en || item.requirement_id)),
        `<span class="reporting-audit-status is-${escapeHtml(status)}">${escapeHtml(status)}</span>`,
        `<strong class="${canClaim ? "is-complete" : "is-partial"}">${escapeHtml(lang === "zh" ? (canClaim ? "是" : "否") : (canClaim ? "Yes" : "No"))}</strong>`,
        escapeHtml(formatInt(item.open_queue_rows || 0)),
        escapeHtml(lang === "zh" ? (item.remaining_zh || "-") : (item.remaining_en || "-")),
        linkList(item.proof_files || [], 4),
      ];
    });
    const completeCount = matrix.requirements.filter((item) => item.can_claim_complete).length;
    return `
      <div class="reporting-backlog-panel">
        <h3>${escapeHtml(L.requirementMatrixTitle)}</h3>
        <p>${escapeHtml(L.requirementMatrixLead)}</p>
        <div class="metric-grid reporting-audit-metrics">
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "闭环门禁" : "Evidence boundaries")}</h3><strong>${escapeHtml(formatInt(matrix.requirements.length))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "可作为结论" : "Can claim complete")}</h3><strong>${escapeHtml(formatInt(completeCount))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "总体状态" : "Overall status")}</h3><strong>${escapeHtml(matrix.overall_status_key || "partial")}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "完成声明" : "Completion claim")}</h3><strong>${escapeHtml(lang === "zh" ? (matrix.can_claim_overall_complete ? "可" : "不可") : (matrix.can_claim_overall_complete ? "Allowed" : "Not allowed"))}</strong></div>
        </div>
        ${createTable(L.requirementMatrixHeaders, rows, L.noData)}
      </div>
    `;
  }

  function renderCompletionWorkplan() {
    const workplan = state.workplan;
    if (!workplan || !Array.isArray(workplan.rows)) return "";
    const totals = workplan.priority_queue_totals || {};
    const priorityOrder = ["P0", "P1", "P2", "Monitor"];
    const priorityCards = priorityOrder
      .filter((priority) => Object.prototype.hasOwnProperty.call(totals, priority))
      .map((priority) => `
        <div class="metric">
          <h3>${escapeHtml(priority)}</h3>
          <strong>${escapeHtml(formatInt(totals[priority] || 0))}</strong>
        </div>
      `)
      .join("");
    const visibleRows = workplan.rows
      .filter((row) => row.queue_file || Number(row.queue_rows || 0) > 0)
      .slice(0, 12)
      .map((row) => [
        escapeHtml(row.priority || "-"),
        escapeHtml(row.requirement_id || "-"),
        escapeHtml(row.issue_id || "-"),
        escapeHtml(formatInt(row.queue_rows || 0)),
        row.queue_file ? queueLink(row.queue_file, row.queue_file.split("/").pop()) : "",
        escapeHtml(lang === "zh" ? (row.next_action_zh || "-") : (row.acceptance_gate_en || row.next_action_zh || "-")),
      ]);
    const workplanLinks = [
      queueLink("assets/data/world500/workbench/world500_reporting_completion_workplan.csv", lang === "zh" ? "下载 completion workplan CSV" : "Download completion workplan CSV"),
      queueLink("assets/data/world500/workbench/world500_reporting_completion_workplan.json", lang === "zh" ? "打开 completion workplan JSON" : "Open completion workplan JSON"),
    ].join(" ");
    return `
      <div class="reporting-backlog-panel">
        <h3>${escapeHtml(lang === "zh" ? "可执行补证 Workplan" : "Executable Evidence-Closure Workplan")}</h3>
        <p>${escapeHtml(lang === "zh"
          ? "该清单把未完成项拆到具体队列文件、开放行数、下一步动作和证据门禁；它不是已完成声明，而是后续补证路线图。"
          : "This workplan maps unresolved evidence focus areas to concrete queue files, open row counts, next actions, and evidence gates. It is a review roadmap, not a completion claim.")}</p>
        <div class="downloads">${workplanLinks}</div>
        <div class="metric-grid reporting-audit-metrics">${priorityCards}</div>
        ${createTable(
          lang === "zh"
            ? ["优先级", "关注点", "问题", "队列行数", "队列文件", "下一步/证据门禁"]
            : ["Priority", "Focus area", "Issue", "Queue rows", "Queue file", "Next action / evidence gate"],
          visibleRows,
          L.noData
        )}
      </div>
    `;
  }

  function renderClosureBatches(summary) {
    const batches = Array.isArray(summary?.p0_closure_batches) ? summary.p0_closure_batches : [];
    if (!batches.length) return "";
    const rows = batches.map((batch) => {
      const files = Array.isArray(batch.files) ? batch.files : [];
      const links = files
        .filter((item) => item && item.file)
        .map((item) => queueLink(item.file, item.file.split("/").pop()))
        .filter(Boolean)
        .join(" ");
      return [
        escapeHtml(lang === "zh" ? (batch.title_zh || batch.issue_id || "-") : (batch.title_en || batch.issue_id || "-")),
        escapeHtml(formatInt(batch.batch_row_count || 0)),
        escapeHtml(lang === "zh" ? (batch.purpose_zh || "-") : (batch.purpose_en || "-")),
        links,
      ];
    });
    return `
      <div class="reporting-backlog-panel">
        <h3>${escapeHtml(L.closureBatchTitle)}</h3>
        <p>${escapeHtml(L.closureBatchLead)}</p>
        ${createTable(L.closureBatchHeaders, rows, L.noData)}
      </div>
    `;
  }

  function renderAuthoritativeExports(summary) {
    const exports = Array.isArray(summary?.authoritative_exports) ? summary.authoritative_exports : [];
    if (!exports.length) return "";
    const rows = exports.map((item) => {
      const links = [
        item.csv ? queueLink(item.csv, item.csv.split("/").pop()) : "",
        item.json ? queueLink(item.json, item.json.split("/").pop()) : "",
      ].filter(Boolean).join(" ");
      return [
        escapeHtml(lang === "zh" ? (item.title_zh || item.export_id || "-") : (item.title_en || item.export_id || "-")),
        escapeHtml(formatInt(item.row_count || 0)),
        escapeHtml(lang === "zh" ? (item.purpose_zh || "-") : (item.purpose_en || "-")),
        links,
      ];
    });
    return `
      <div class="reporting-backlog-panel">
        <h3>${escapeHtml(L.authoritativeExportTitle)}</h3>
        <p>${escapeHtml(L.authoritativeExportLead)}</p>
        ${createTable(L.authoritativeExportHeaders, rows, L.noData)}
      </div>
    `;
  }

  function backlogRows(checks) {
    const byId = new Map((checks || []).map((item) => [item.id, item]));
    const ghg = byId.get("ghg_protocol_fine_series")?.metrics || {};
    const ghgAudit = ghg.mapping_audit || {};
    const ghgQueues = ghgAudit.split_queues || {};
    const rankingAudit = byId.get("emissions_ranking")?.metrics?.ranking_audit || {};
    const rankingQueues = rankingAudit.queues || {};
    const techAudit = byId.get("technology_path_axis")?.metrics?.technology_path_audit || {};
    const techQueues = techAudit.split_queues || {};
    const sourceAudit = byId.get("primary_secondary_bubble")?.metrics?.source_mix_audit || {};
    const sourceQueues = sourceAudit.split_queues || {};
    const scopeAudit = byId.get("scope_language_policy")?.metrics?.standard_role_link_audit || {};

    return [
      {
        gapZh: "GHG Protocol 细分系列显式证据升级",
        gapEn: "Upgrade explicit evidence for GHG Protocol fine series",
        basisZh: `${formatInt(ghg.explicit_company_count || 0)}/${formatInt(ghg.ghg_company_count || 0)} 家企业显式命中具体系列`,
        basisEn: `${formatInt(ghg.explicit_company_count || 0)}/${formatInt(ghg.ghg_company_count || 0)} companies have explicit fine-series hits`,
        volumeZh: `${formatInt(ghgAudit.contextual_review_queue_rows || 0)} 条上下文待复核；${formatInt(ghgAudit.explicit_candidate_queue_rows || 0)} 条显式系列候选；${formatInt(ghgQueues.p0_overmapped_contextual_edge_queue?.row_count || ghgAudit.p0_possible_overmapped_contextual_edges || 0)} 条 P0 可能过度映射`,
        volumeEn: `${formatInt(ghgAudit.contextual_review_queue_rows || 0)} contextual edges; ${formatInt(ghgAudit.explicit_candidate_queue_rows || 0)} explicit-series candidates; ${formatInt(ghgQueues.p0_overmapped_contextual_edge_queue?.row_count || ghgAudit.p0_possible_overmapped_contextual_edges || 0)} P0 possible overmappings`,
        nextZh: "回到 PDF 页级原文，确认是否明确写出 Corporate Standard、Scope 2 Guidance、Scope 3 Standard 等具体名称。",
        nextEn: "Return to page-level PDF text and confirm whether it explicitly names Corporate Standard, Scope 2 Guidance, Scope 3 Standard, or another concrete series.",
        files: [
          [ghgAudit.contextual_review_queue_file, lang === "zh" ? "上下文复核队列" : "Contextual review queue"],
          [ghgAudit.explicit_candidate_queue_file, lang === "zh" ? "显式系列候选队列" : "Explicit-series candidate queue"],
          [ghgQueues.p0_overmapped_contextual_edge_queue?.file || ghgAudit.overmapping_review_queue_file, lang === "zh" ? "P0 错挂风险队列" : "P0 overmapping queue"],
          [ghgQueues.p1_named_series_missing_queue?.file, lang === "zh" ? "P1 命名缺失队列" : "P1 named-series missing queue"],
          [ghgQueues.p2_low_evidence_contextual_edge_queue?.file, lang === "zh" ? "P2 低证据队列" : "P2 low-evidence queue"],
        ],
      },
      {
        gapZh: "企业总排放排行 Scope 1/2/3 完整强证据",
        gapEn: "Complete Scope 1/2/3 strong evidence for emissions ranking",
        basisZh: `${formatInt(rankingAudit.complete_scope123_strong_evidence_rows || 0)}/${formatInt(rankingAudit.row_count || 0)} 家可用总量满足完整强证据排行`,
        basisEn: `${formatInt(rankingAudit.complete_scope123_strong_evidence_rows || 0)}/${formatInt(rankingAudit.row_count || 0)} available totals qualify for complete strong-evidence ranking`,
        volumeZh: `完整排行 P2 复核 ${formatInt(rankingQueues.complete_verification_queue?.row_count || 0)}；Scope 3 缺口 ${formatInt(rankingQueues.scope3_backfill_queue?.row_count || 0)}；Scope 2 数值缺口 ${formatInt(rankingQueues.scope2_value_backfill_queue?.row_count || 0)}；Scope 2 口径复核 ${formatInt(rankingQueues.scope2_method_review_queue?.row_count || 0)}；Scope 1 缺口 ${formatInt(rankingQueues.scope1_backfill_queue?.row_count || 0)}`,
        volumeEn: `Complete-ranking P2 checks ${formatInt(rankingQueues.complete_verification_queue?.row_count || 0)}; Scope 3 gaps ${formatInt(rankingQueues.scope3_backfill_queue?.row_count || 0)}; Scope 2 value gaps ${formatInt(rankingQueues.scope2_value_backfill_queue?.row_count || 0)}; Scope 2 method reviews ${formatInt(rankingQueues.scope2_method_review_queue?.row_count || 0)}; Scope 1 gaps ${formatInt(rankingQueues.scope1_backfill_queue?.row_count || 0)}`,
        nextZh: "逐家公司补 Scope 缺口、年份、单位和 Scope 2 location/market 口径，未闭环前只进入 partial 表。",
        nextEn: "Backfill missing scope values, years, units, and Scope 2 location/market method; keep companies in the partial table until closed.",
        files: [
          [rankingQueues.complete_verification_queue?.file, lang === "zh" ? "完整排行 P2 复核" : "Complete ranking P2"],
          [rankingQueues.scope3_backfill_queue?.file, "Scope 3"],
          [rankingQueues.scope2_value_backfill_queue?.file || rankingQueues.scope2_method_backfill_queue?.file, lang === "zh" ? "Scope 2 数值" : "Scope 2 value"],
          [rankingQueues.scope2_method_review_queue?.file, lang === "zh" ? "Scope 2 口径" : "Scope 2 method"],
          [rankingQueues.scope1_backfill_queue?.file, "Scope 1"],
        ],
      },
      {
        gapZh: "技术路径公司级证据、时间与成本复核",
        gapEn: "Company-level evidence, timeline, and cost review for technology paths",
        basisZh: `${formatInt(techAudit.technology_cluster_count || 0)} 类技术路径覆盖 ${formatInt(techAudit.unique_company_count || 0)} 家企业`,
        basisEn: `${formatInt(techAudit.technology_cluster_count || 0)} technology paths cover ${formatInt(techAudit.unique_company_count || 0)} companies`,
        volumeZh: `${formatInt(techQueues.company_evidence_backfill_queue?.row_count || techAudit.p0_company_specific_backfill_rows || 0)} 条公司级证据待补；${formatInt(techQueues.timeline_validation_queue?.row_count || 0)} 条时间趋势待核验；${formatInt(techQueues.cost_validation_queue?.row_count || 0)} 条成本/投资信号待核验`,
        volumeEn: `${formatInt(techQueues.company_evidence_backfill_queue?.row_count || techAudit.p0_company_specific_backfill_rows || 0)} company-evidence backfills; ${formatInt(techQueues.timeline_validation_queue?.row_count || 0)} timeline validations; ${formatInt(techQueues.cost_validation_queue?.row_count || 0)} cost/investment validations`,
        nextZh: "把关键词命中升级为公司级技术证据；成本和时间只能在核验后作为实施进度或经济性证据。",
        nextEn: "Upgrade keyword hits to company-specific technology evidence; timeline and cost can support implementation/economics only after validation.",
        files: [
          [techAudit.validation_queue_file, lang === "zh" ? "技术路径总复核队列" : "Technology validation queue"],
          [techQueues.company_evidence_backfill_queue?.file, lang === "zh" ? "公司级证据补回队列" : "Company evidence queue"],
          [techQueues.timeline_validation_queue?.file, lang === "zh" ? "时间趋势核验队列" : "Timeline validation queue"],
          [techQueues.cost_validation_queue?.file, lang === "zh" ? "成本/投资核验队列" : "Cost validation queue"],
        ],
      },
      {
        gapZh: "初级/次级来源比例分类覆盖",
        gapEn: "Primary/secondary source-ratio classification coverage",
        basisZh: `${formatInt(sourceAudit.included_bubble_rows || 0)}/${formatInt(sourceAudit.row_count || 0)} 家企业有可识别比例；其中 ${formatInt(sourceAudit.explicit_reported_primary_ratio_rows || 0)} 家使用原文明示 primary data 百分比`,
        basisEn: `${formatInt(sourceAudit.included_bubble_rows || 0)}/${formatInt(sourceAudit.row_count || 0)} companies have recognizable ratios; ${formatInt(sourceAudit.explicit_reported_primary_ratio_rows || 0)} use explicitly reported primary-data percentages`,
        volumeZh: `${formatInt(sourceQueues.source_origin_backfill_queue?.row_count || sourceAudit.p0_classify_source_origin_rows || 0)} 条来源类别待补；${formatInt(sourceQueues.unknown_share_review_queue?.row_count || sourceAudit.p1_reduce_unknown_source_share_rows || 0)} 条 unknown 占比待复核；${formatInt(sourceQueues.calculation_weight_validation_queue?.row_count || 0)} 条计算权重待核验`,
        volumeEn: `${formatInt(sourceQueues.source_origin_backfill_queue?.row_count || sourceAudit.p0_classify_source_origin_rows || 0)} source-origin backfills; ${formatInt(sourceQueues.unknown_share_review_queue?.row_count || sourceAudit.p1_reduce_unknown_source_share_rows || 0)} unknown-share reviews; ${formatInt(sourceQueues.calculation_weight_validation_queue?.row_count || 0)} calculation-weight validations`,
        nextZh: "优先核验原文明示百分比是否等同实际计算权重；没有明示百分比的企业继续补 method_rows 来源类别。",
        nextEn: "First validate whether explicit percentages equal actual calculation weights; keep backfilling method_rows source classes for companies without explicit percentages.",
        files: [
          [sourceAudit.classification_queue_file, lang === "zh" ? "来源分类总队列" : "Source classification queue"],
          [sourceQueues.source_origin_backfill_queue?.file, lang === "zh" ? "来源类别补回队列" : "Source-origin backfill queue"],
          [sourceQueues.unknown_share_review_queue?.file, lang === "zh" ? "unknown 占比复核队列" : "Unknown-share review queue"],
          [sourceQueues.calculation_weight_validation_queue?.file, lang === "zh" ? "计算权重核验队列" : "Calculation-weight validation queue"],
        ],
      },
      {
        gapZh: "非 GHG 标准源文 Scope 词汇复核",
        gapEn: "Review Scope wording in non-GHG source quotes",
        basisZh: "非 GHG 标准自身术语不使用 Scope 1/2/3；Scope 只保留为原文引用上下文。",
        basisEn: "Non-GHG standards do not use Scope 1/2/3 as their own terminology; Scope wording is retained only as source-quote context.",
        volumeZh: `${formatInt(scopeAudit.non_ghg_scope_review_queue_rows || 0)} 条源文引用待 P2 复核`,
        volumeEn: `${formatInt(scopeAudit.non_ghg_scope_review_queue_rows || 0)} source quotes require P2 review`,
        nextZh: "确认这些 Scope 词只作为原文证据展示，不提升为 ISO/GB/PCAF 等非 GHG 标准自身口径。",
        nextEn: "Confirm that Scope wording is only source evidence display and is not promoted into ISO/GB/PCAF standard wording.",
        files: [[scopeAudit.non_ghg_scope_review_queue_file, lang === "zh" ? "非 GHG Scope 复核队列" : "Non-GHG Scope review queue"]],
      },
    ].map((item) => [
      escapeHtml(lang === "zh" ? item.gapZh : item.gapEn),
      escapeHtml(lang === "zh" ? item.basisZh : item.basisEn),
      escapeHtml(lang === "zh" ? item.volumeZh : item.volumeEn),
      escapeHtml(lang === "zh" ? item.nextZh : item.nextEn),
      item.files.map(([file, label]) => queueLink(file, label)).filter(Boolean).join(" "),
    ]);
  }

  function renderCompletionAudit() {
    if (!elements.status) return;
    const audit = state.audit;
    if (!audit) {
      renderStatus(L.auditNoData);
      return;
    }
    const checks = audit.checks || [];
    const partialCount = checks.filter((item) => item.status_key !== "implemented").length;
    const highRiskCount = checks.filter((item) => item.severity === "high" && item.status_key !== "implemented").length;
    const overallStatusKey = audit.overall_status_key || "partial";
    const overallStatus = lang === "zh"
      ? (audit.overall_status_zh || "部分完成，仍需证据复核。")
      : (audit.overall_status_en || "Partially complete; evidence review is still required.");
    const rows = checks.map((item) => [
      `<span class="reporting-audit-status is-${escapeHtml(item.status_key)}">${escapeHtml(text(item, "status_zh", "status_en"))}</span>`,
      escapeHtml(text(item, "requirement_zh", "requirement_en")),
      escapeHtml(text(item, "evidence_zh", "evidence_en")),
      escapeHtml(text(item, "remaining_work_zh", "remaining_work_en")),
    ]);
    const knownIssues = (audit.known_issues || []).map((item) => `
      <article class="panel reporting-audit-issue">
        <strong>${escapeHtml(text(item, "issue_zh", "issue_en"))}</strong>
        <p>${escapeHtml(text(item, "recommended_next_step_zh", "recommended_next_step_en"))}</p>
        <span>${escapeHtml((item.files || []).join(" / "))}</span>
      </article>
    `).join("");
    const backlog = backlogRows(checks);
    const gapSummary = renderGapSummary();

    elements.status.innerHTML = `
      ${gapSummary}
      <div class="table-card report-table-card reporting-audit-card">
        <div class="table-kicker">Completion Audit</div>
        <h2>${escapeHtml(L.auditTitle)}</h2>
        <p class="table-lead">${escapeHtml(L.auditLead)}</p>
        <div class="reporting-audit-overall is-${escapeHtml(overallStatusKey)}">
          <strong>${escapeHtml(lang === "zh" ? "总体状态" : "Overall status")}</strong>
          <span>${escapeHtml(overallStatus)}</span>
        </div>
        <div class="metric-grid reporting-audit-metrics">
          <div class="metric"><h3>${escapeHtml(L.auditGenerated)}</h3><strong>${escapeHtml(audit.generated_at || "-")}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "审计项" : "Checks")}</h3><strong>${escapeHtml(formatInt(checks.length))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "部分/需复核" : "Partial / review")}</h3><strong>${escapeHtml(formatInt(partialCount))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "高优先缺口" : "High-priority gaps")}</h3><strong>${escapeHtml(formatInt(highRiskCount))}</strong></div>
        </div>
        ${createTable(L.auditHeaders, rows, L.noData)}
        <div class="reporting-backlog-panel">
          <h3>${escapeHtml(L.auditBacklogTitle)}</h3>
          <p>${escapeHtml(L.auditBacklogLead)}</p>
          ${createTable(L.auditBacklogHeaders, backlog, L.noData)}
        </div>
        ${knownIssues ? `<div class="reporting-audit-issues"><h3>${escapeHtml(L.auditKnownIssues)}</h3>${knownIssues}</div>` : ""}
      </div>
    `;
  }

  function renderGapSummary() {
    const summary = state.gapSummary;
    if (!summary) return "";
    const items = Array.isArray(summary.items) ? summary.items : [];
    const partialCount = items.filter((item) => String(item.status_key || "").includes("partial")).length;
    const implementedCount = items.filter((item) => String(item.status_key || "").startsWith("implemented")).length;
    const overall = lang === "zh"
      ? (summary.overall_status_zh || "部分完成")
      : (summary.overall_status_en || "Partially complete");
    const rows = items.map((item) => [
      escapeHtml(item.id || "-"),
      `<span class="reporting-audit-status is-${escapeHtml(item.status_key || "partial")}">${escapeHtml(gapSummaryText(item, "status_en", "status_zh", item.status_key || "-"))}</span>`,
      escapeHtml(gapSummaryText(item, "implemented_en", "implemented_zh")),
      escapeHtml(gapSummaryText(item, "remaining_en", "remaining_zh")),
    ]);
    const priorityItems = lang === "zh"
      ? (summary.next_priority_order || [])
      : (summary.next_priority_order_en || GAP_NEXT_PRIORITY_EN);
    const priorities = priorityItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const authoritativeExports = renderAuthoritativeExports(summary);
    const closureBatches = renderClosureBatches(summary);
    const requirementMatrix = renderRequirementMatrix();
    const completionWorkplan = renderCompletionWorkplan();
    const register = summary.issue_register || {};
    const registerLinks = [
      register.csv ? queueLink(register.csv, lang === "zh" ? "下载未完成问题 CSV" : "Download unresolved issue CSV") : "",
      register.json ? queueLink(register.json, lang === "zh" ? "查看未完成问题 JSON" : "Open unresolved issue JSON") : "",
    ].filter(Boolean).join(" ");
    const matrix = summary.requirement_completion_matrix || {};
    const matrixLinks = [
      matrix.csv ? queueLink(matrix.csv, lang === "zh" ? "下载证据边界矩阵 CSV" : "Download evidence boundary matrix CSV") : "",
      matrix.json ? queueLink(matrix.json, lang === "zh" ? "查看证据边界矩阵 JSON" : "Open evidence boundary matrix JSON") : "",
    ].filter(Boolean).join(" ");
    const registerPurpose = lang === "zh"
      ? (register.purpose_zh || "")
      : (register.purpose_en || register.purpose_zh || "");
    const matrixPurpose = lang === "zh"
      ? (matrix.purpose_zh || "")
      : (matrix.purpose_en || matrix.purpose_zh || "");
    return `
      <div class="table-card report-table-card reporting-audit-card">
        <div class="table-kicker">Gap Status</div>
        <h2>${escapeHtml(L.gapSummaryTitle)}</h2>
        <p class="table-lead">${escapeHtml(L.gapSummaryLead)}</p>
        ${registerLinks || matrixLinks ? `<div class="downloads">${registerLinks} ${matrixLinks}</div>` : ""}
        ${registerPurpose ? `<p class="report-figure-caption">${escapeHtml(registerPurpose)}</p>` : ""}
        ${matrixPurpose ? `<p class="report-figure-caption">${escapeHtml(matrixPurpose)}</p>` : ""}
        <div class="reporting-audit-overall is-${escapeHtml(summary.overall_status_key || "partial")}">
          <strong>${escapeHtml(lang === "zh" ? "总体结论" : "Overall conclusion")}</strong>
          <span>${escapeHtml(overall)}</span>
        </div>
        <div class="metric-grid reporting-audit-metrics">
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "总任务项" : "Total items")}</h3><strong>${escapeHtml(formatInt(items.length))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "已实现/有风险" : "Implemented / risk")}</h3><strong>${escapeHtml(formatInt(implementedCount))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "部分完成" : "Partial")}</h3><strong>${escapeHtml(formatInt(partialCount))}</strong></div>
          <div class="metric"><h3>${escapeHtml(lang === "zh" ? "状态日期" : "Status date")}</h3><strong>${escapeHtml(summary.generated_at || "-")}</strong></div>
        </div>
        ${createTable(L.gapSummaryHeaders, rows, L.noData)}
        ${authoritativeExports}
        ${closureBatches}
        ${requirementMatrix}
        ${completionWorkplan}
        ${priorities ? `<div class="reporting-backlog-panel"><h3>${escapeHtml(L.nextPriorityTitle)}</h3><ol>${priorities}</ol></div>` : ""}
      </div>
    `;
  }

  function colorWithAlpha(color, alpha) {
    const normalized = String(color || "").trim();
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return `rgba(152,161,168,${alpha})`;
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function localizedArray(item, zhKey, enKey) {
    const values = lang === "zh" ? item?.[zhKey] : item?.[enKey];
    return Array.isArray(values) ? values.filter(Boolean) : [];
  }

  function workbenchLink(companyId, label) {
    return `<a class="graph-table-button" href="./company-accounting-workbench.html?company=${encodeURIComponent(companyId || "")}">${escapeHtml(label || companyId || "-")}</a>`;
  }

  function staticFigureBoundary(filename) {
    const boundaries = {
      "world500_standard_chain_overview.png": {
        statusZh: "业务状态：partial",
        statusEn: "Claim status: partial",
        boundaryZh: "GHG 上下文映射和疑似过度映射仍为复核数据，不作为已采信企业-系列关系。",
        boundaryEn: "GHG contextual and overmapped references remain review-only, not accepted company-series links.",
      },
      "world500_emissions_ranking_graph.png": {
        statusZh: "业务状态：partial",
        statusEn: "Claim status: partial",
        boundaryZh: "只展示完整 Scope 1、选定 Scope 2 和 Scope 3 强证据企业；partial 总量不进入可比排行。",
        boundaryEn: "Only complete Scope 1, selected Scope 2, and Scope 3 strong-evidence companies are ranked; partial totals are excluded.",
      },
      "world500_technology_cluster_overview.png": {
        statusZh: "业务状态：partial / 披露信号",
        statusEn: "Claim status: partial / disclosure signal",
        boundaryZh: "技术聚类是企业报告中的披露主题信号，不等于已核证项目实施、减排量或项目经济性。",
        boundaryEn: "Technology clusters are disclosure-topic signals, not verified project implementation, abatement, or economics.",
      },
      "world500_primary_secondary_source_mix.png": {
        statusZh: "业务状态：partial / 来源结构推断",
        statusEn: "Claim status: partial / source-mix inference",
        boundaryZh: "除原文明示 primary-data 百分比外，图中比例不是审定计算权重。",
        boundaryEn: "Except for explicitly reported primary-data percentages, plotted ratios are not audited calculation weights.",
      },
    };
    return boundaries[filename] || null;
  }

  function staticFigure(filename, title, note = "") {
    const src = `${figureBase}/${filename}`;
    const boundary = staticFigureBoundary(filename);
    return `
      <figure class="reporting-static-figure">
        <img class="visual-figure" src="${escapeHtml(src)}" alt="${escapeHtml(title)}" data-lightbox-src="${escapeHtml(src)}" data-lightbox-title="${escapeHtml(title)}" tabindex="0">
        ${boundary ? `
          <div class="reporting-figure-claim">
            <span>${escapeHtml(lang === "zh" ? boundary.statusZh : boundary.statusEn)}</span>
            <strong>${escapeHtml(lang === "zh" ? "静态同步完成" : "Static sync complete")}</strong>
            <p>${escapeHtml(lang === "zh" ? boundary.boundaryZh : boundary.boundaryEn)}</p>
          </div>
        ` : ""}
        ${note ? `<figcaption>${escapeHtml(note)}</figcaption>` : ""}
      </figure>
    `;
  }

  function ensureReportingLightbox() {
    let lightbox = document.getElementById("lightbox");
    if (lightbox) return lightbox;
    lightbox = document.createElement("div");
    lightbox.id = "lightbox";
    lightbox.className = "lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="Figure preview">
        <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
        <div class="lightbox-frame">
          <img id="lightbox-image" class="lightbox-image" alt="">
          <div id="lightbox-caption" class="lightbox-caption"></div>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);
    return lightbox;
  }

  function closeReportingLightbox() {
    const lightbox = document.getElementById("lightbox");
    const image = document.getElementById("lightbox-image");
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    if (image) image.removeAttribute("src");
    document.body.style.overflow = "";
  }

  function openReportingLightbox(trigger) {
    const lightbox = ensureReportingLightbox();
    const image = document.getElementById("lightbox-image");
    const caption = document.getElementById("lightbox-caption");
    if (!image || !caption) return;
    const title = trigger.getAttribute("data-lightbox-title") || trigger.getAttribute("alt") || "";
    image.setAttribute("src", trigger.getAttribute("data-lightbox-src") || "");
    image.setAttribute("alt", title);
    caption.textContent = title;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function bindStaticFigureLightbox() {
    const triggers = document.querySelectorAll("[data-lightbox-src]");
    if (!triggers.length) return;
    const lightbox = ensureReportingLightbox();
    triggers.forEach((trigger) => {
      if (trigger.dataset.lightboxBound === "true") return;
      trigger.dataset.lightboxBound = "true";
      trigger.addEventListener("click", () => openReportingLightbox(trigger));
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openReportingLightbox(trigger);
        }
      });
    });
    if (lightbox.dataset.closeBound === "true") return;
    lightbox.dataset.closeBound = "true";
    lightbox.querySelector(".lightbox-close")?.addEventListener("click", closeReportingLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeReportingLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("open")) {
        closeReportingLightbox();
      }
    });
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
      { label: lang === "zh" ? "GHG 强证据企业" : "GHG strong-evidence companies", value: formatInt(summary.ghg_explicit_series_company_count) },
      { label: lang === "zh" ? "GHG 上下文待复核" : "GHG contextual review", value: formatInt(summary.ghg_contextual_series_company_count) },
      { label: lang === "zh" ? "完整强证据排行" : "Complete strong-evidence ranking", value: formatInt(summary.complete_emissions_ranking_company_count) },
      { label: lang === "zh" ? "标准节点" : "Standard nodes", value: formatInt(summary.standard_count) },
      { label: lang === "zh" ? "技术聚类企业" : "Technology-cluster companies", value: formatInt(summary.technology_company_count) },
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
    const acceptedGhgStatuses = new Set(["explicit_series_citation", "pdf_explicit_series_citation"]);
    const acceptedCompanyCount = (item) => Number(item.accepted_company_count ?? item.explicit_company_count ?? item.display_company_count ?? 0);
    const reviewCompanyCount = (item) => Number(item.review_company_count ?? item.contextual_company_count ?? 0);
    const visibleSeries = (payload.series_summary || [])
      .filter((item) => item.series_id !== "ghg_generic_reference" && acceptedCompanyCount(item) > 0);
    const seriesRows = visibleSeries.map((item) => [
      escapeHtml(text(item, "name_zh", "name_en")),
      escapeHtml(text(item, "category_zh", "category_en")),
      escapeHtml(text(item, "role_zh", "role_en")),
      escapeHtml(formatInt(acceptedCompanyCount(item))),
      escapeHtml(formatInt(reviewCompanyCount(item))),
      escapeHtml(percent((item.company_count || 0) ? (acceptedCompanyCount(item) / item.company_count) : null)),
      escapeHtml(formatInt(item.evidence_count || 0)),
      escapeHtml(text(item, "principle_zh", "principle_en")),
    ]);

    const companies = (payload.company_mappings || [])
      .filter((item) => Number(item.explicit_series_count || item.accepted_series_count || 0) > 0)
      .slice()
      .sort((a, b) => (b.explicit_series_count - a.explicit_series_count) || ((a.world500_rank || 9999) - (b.world500_rank || 9999)))
      .slice(0, 60);
    const companyRows = companies.map((item) => {
      const acceptedSeries = (item.series || []).filter((series) => acceptedGhgStatuses.has(series.match_status));
      const reviewLeadCount = (item.series || []).filter((series) => !acceptedGhgStatuses.has(series.match_status) && series.series_id !== "ghg_generic_reference").length + Number(item.generic_reference_count || 0);
      return [
        escapeHtml(`#${item.world500_rank || "-"}`),
        workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
        escapeHtml(formatInt(acceptedSeries.length)),
        escapeHtml(formatInt(reviewLeadCount)),
        escapeHtml(acceptedSeries.map((series) => text(series, "name_zh", "name_en")).join(" / ")),
        escapeHtml(joinList(unique(acceptedSeries.flatMap((series) => series.pages || [])))),
      ];
    });

    const taxonomyCards = [...groupedBy(visibleSeries, (item) => item.category_key || "other").values()].map((items) => {
      const first = items[0] || {};
      return `
        <article class="reporting-ghg-family-card">
          <strong>${escapeHtml(text(first, "category_zh", "category_en"))}</strong>
          <div class="reporting-chip-list">
            ${items.map((item) => `<span>${escapeHtml(text(item, "name_zh", "name_en"))} · ${escapeHtml(formatInt(acceptedCompanyCount(item)))} ${escapeHtml(lang === "zh" ? "强证据" : "strong")} / ${escapeHtml(formatInt(reviewCompanyCount(item)))} ${escapeHtml(lang === "zh" ? "复核" : "review")}</span>`).join("")}
          </div>
        </article>
      `;
    }).join("");

    elements.ghg.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.ghgTitle)}</h2>
        <p>${escapeHtml(L.ghgLead)}</p>
        <div class="downloads">
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_ghg_series_mapping_audit.csv">${escapeHtml(lang === "zh" ? "下载 GHG 系列映射审计 CSV" : "Download GHG series mapping audit CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_ghg_contextual_series_review_queue.csv">${escapeHtml(lang === "zh" ? "下载 GHG 显式证据补强队列" : "Download GHG explicit-evidence upgrade queue")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_ghg_explicit_series_candidate_queue.csv">${escapeHtml(lang === "zh" ? "下载 GHG 显式系列候选队列" : "Download GHG explicit-series candidate queue")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_ghg_contextual_overmapping_review_queue.csv">${escapeHtml(lang === "zh" ? "下载 GHG 上下文过度映射复核队列" : "Download GHG contextual overmapping queue")}</a>
        </div>
      </div>
      ${staticFigure(
        "world500_standard_chain_overview.png",
        lang === "zh" ? "图2 标准链静态汇报图" : "Figure 2 static standards-chain briefing graphic",
        lang === "zh" ? "该 PNG 与本页 GHG/ISO/GB 结构化数据同源生成。" : "This PNG is generated from the same GHG/ISO/GB structured data used on this page."
      )}
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

    const companyNodes = companies.map((item, index) => {
      const pos = companyPositions.get(item.company_id);
      const radius = 7 + Math.sqrt(Number(item.total_mtco2e || 0) / maxTotal) * 24;
      const label = text(item, "company_name_zh", "company_name_en");
      const years = joinList(item.inventory_years || []);
      const rank = item.evidence_rank || item.complete_rank || item.available_rank || index + 1;
      return `
        <g class="reporting-ranking-company">
          <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${escapeHtml(item.industry_color || "#98a1a8")}"></circle>
          <title>${escapeHtml(`#${rank} ${label} · ${formatMaybeNumber(item.total_mtco2e, 2)} MtCO2e · ${years}`)}</title>
          <text x="${pos.x + radius + 10}" y="${pos.y - 5}">#${escapeHtml(rank)} ${escapeHtml(label.slice(0, 28))}</text>
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
    const gate = ranking.gate || {};
    const highestExcluded = lang === "zh"
      ? gate.highest_partial_excluded_company_zh
      : gate.highest_partial_excluded_company_en;
    const gateNote = gate.sort_key ? `
      <div class="reporting-gate-note">
        <strong>${escapeHtml(lang === "zh" ? "排序与纳入门禁" : "Sort and inclusion gate")}</strong>
        <span>${escapeHtml(lang === "zh" ? gate.complete_gate_zh : gate.complete_gate_en)}</span>
        <span>${escapeHtml(lang === "zh" ? gate.partial_policy_zh : gate.partial_policy_en)}</span>
        <span>${escapeHtml(`${lang === "zh" ? "排序键" : "Sort key"}: ${gate.sort_key}; complete sorted desc: ${Boolean(gate.complete_sorted_desc)}; available sorted desc: ${Boolean(gate.available_sorted_desc)}`)}</span>
        ${highestExcluded ? `<span>${escapeHtml(lang === "zh" ? `最高 partial 排除项：${highestExcluded} (${formatMaybeNumber(gate.highest_partial_excluded_total_mtco2e, 2)} MtCO2e)` : `Highest excluded partial total: ${highestExcluded} (${formatMaybeNumber(gate.highest_partial_excluded_total_mtco2e, 2)} MtCO2e)`)}</span>` : ""}
      </div>
    ` : "";
    const completeRows = (ranking.complete || []).map((item, index) => [
      escapeHtml(`#${item.complete_rank || item.available_rank || index + 1}`),
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
      .map((item, index) => [
        escapeHtml(`#${item.available_rank || index + 1}`),
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
        <div class="downloads">
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_emissions_ranking_audit.csv">${escapeHtml(lang === "zh" ? "下载企业总排放排行审计 CSV" : "Download emissions ranking audit CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_emissions_scope3_backfill_queue.csv">${escapeHtml(lang === "zh" ? "下载 Scope 3 缺口队列 CSV" : "Download Scope 3 gap queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_emissions_scope2_method_backfill_queue.csv">${escapeHtml(lang === "zh" ? "下载 Scope 2/方法缺口队列 CSV" : "Download Scope 2/method gap queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_emissions_scope1_backfill_queue.csv">${escapeHtml(lang === "zh" ? "下载 Scope 1 缺口队列 CSV" : "Download Scope 1 gap queue CSV")}</a>
        </div>
      </div>
      <div class="table-card report-table-card">
        <div class="table-kicker">P1 KG</div>
        <h3>${escapeHtml(L.rankingGraphTitle)}</h3>
        <p class="table-lead">${escapeHtml(L.rankingGraphLead)}</p>
        ${gateNote}
        ${staticFigure(
          "world500_emissions_ranking_graph.png",
          L.rankingGraphTitle,
          lang === "zh"
            ? "该 PNG 与下方 SVG 图谱同源，只使用完整 Scope 1 + 选定 Scope 2 + Scope 3 强证据企业。"
            : "This PNG is generated from the same source as the SVG graph below and uses only complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence companies."
        )}
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
    const selectedCompanies = (selected.company_ids || [])
      .map((id) => companyById.get(id))
      .filter(Boolean)
      .sort((a, b) => String(a.industry_section_code || "unknown").localeCompare(String(b.industry_section_code || "unknown"))
        || ((a.world500_rank || 9999) - (b.world500_rank || 9999)));
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
    const industryGroups = [...groupedBy(selectedCompanies, (company) => company.industry_section_code || "unknown").entries()]
      .map(([code, items]) => ({ code, items, first: items[0] || {} }))
      .sort((a, b) => b.items.length - a.items.length);
    let sectorCursor = -Math.PI / 2;
    const sectors = industryGroups.map((group) => {
      const span = (Math.PI * 2 * group.items.length) / Math.max(selectedCompanies.length, 1);
      const start = sectorCursor;
      const end = sectorCursor + span;
      sectorCursor = end;
      const mid = (start + end) / 2;
      return {
        ...group,
        start,
        end,
        mid,
        labelX: cx + Math.cos(mid) * (companyRx + 24),
        labelY: cy + Math.sin(mid) * (companyRy + 24),
      };
    });

    const industryBackgrounds = sectors.map((sector) => {
      const start = polarPoint(cx, cy, companyRx + 36, companyRy + 36, sector.start);
      const end = polarPoint(cx, cy, companyRx + 36, companyRy + 36, sector.end);
      const largeArc = sector.end - sector.start > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${companyRx + 36} ${companyRy + 36} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
      return `
        <path d="${path}" fill="${escapeHtml(sector.first.industry_color || "#98a1a8")}" opacity="0.08"></path>
        ${sector.items.length >= 4 ? `<text x="${sector.labelX}" y="${sector.labelY}" text-anchor="middle" class="reporting-sector-label">${escapeHtml(sector.code)} ${escapeHtml(text(sector.first, "industry_section_zh", "industry_section_en", ""))}</text>` : ""}
      `;
    }).join("");

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
        <ellipse cx="${cx}" cy="${cy}" rx="${companyRx + 42}" ry="${companyRy + 42}" fill="${escapeHtml(colorWithAlpha(selected.color, 0.07))}"></ellipse>
        ${industryBackgrounds}
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
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_standard_role_link_audit.csv">${escapeHtml(lang === "zh" ? "下载标准-企业关系审计 CSV" : "Download standard-company link audit CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_non_ghg_scope_wording_review_queue.csv">${escapeHtml(lang === "zh" ? "下载非 GHG 源文 Scope 引用复核队列" : "Download non-GHG source-quote Scope review queue")}</a>
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
            <span>${escapeHtml(`${formatInt(selected.evidence_count || 0)} / ${formatInt((selected.company_ids || []).length)}`)}</span>
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
    const projectClusters = payload.project_clusters || payload.clusters || [];
    const clusterNameById = new Map((projectClusters || []).map((item) => [item.id, text(item, "name_zh", "name_en")]));
    const projectSummary = payload.project_evidence_summary || {};
    const projectRows = (payload.project_evidence || []).slice(0, 60).map((item) => [
      workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
      escapeHtml(clusterNameById.get(item.technology_id) || item.technology_id || "-"),
      escapeHtml(item.project_name_en || item.measure_name_en || "-"),
      escapeHtml(item.implementation_stage || "-"),
      escapeHtml(joinList(item.timeline_years || [])),
      escapeHtml(item.cost_or_investment_en || "-"),
      escapeHtml(item.abatement_effect_en || "-"),
      escapeHtml(item.evidence_page || item.page || "-"),
      escapeHtml(item.source_file || "-"),
      escapeHtml(item.snippet_en || "-"),
    ]);
    const rows = (projectClusters || []).filter((item) => (item.project_evidence_count || 0) > 0).map((item) => [
      `<strong style="color:${escapeHtml(item.color)}">${escapeHtml(text(item, "name_zh", "name_en"))}</strong>`,
      escapeHtml(formatInt(item.project_company_count || item.company_count || 0)),
      escapeHtml(formatInt(item.project_evidence_count || item.evidence_count || 0)),
      escapeHtml(`${formatInt(item.project_evidence_count || 0)} / ${formatInt(item.project_company_count || 0)} ${lang === "zh" ? "企业" : "companies"}`),
      `<div class="reporting-chip-list">${(item.subtypes || []).map((subtype) => `<span>${escapeHtml(text(subtype, "label_zh", "label_en"))}: ${escapeHtml(formatInt(subtype.evidence_count || 0))}</span>`).join("")}</div>`,
      timelineHtml(item.timeline_counts),
      escapeHtml(`${formatInt(item.project_cost_evidence_count || 0)} ${lang === "zh" ? "成本/投资证据" : "cost evidence"}`),
      escapeHtml(joinList(lang === "zh" ? item.standards_zh : item.standards_en)),
    ]);

    elements.technology.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.technologyTitle)}</h2>
        <p>${escapeHtml(L.technologyLead)}</p>
        <div class="downloads">
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_path_audit.csv">${escapeHtml(lang === "zh" ? "下载技术路径审计 CSV" : "Download technology path audit CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_path_validation_queue.csv">${escapeHtml(lang === "zh" ? "下载技术路径成本/时间/公司证据复核队列 CSV" : "Download technology path validation queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_company_evidence_backfill_queue.csv">${escapeHtml(lang === "zh" ? "下载公司级技术证据补回队列 CSV" : "Download company evidence queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_timeline_validation_queue.csv">${escapeHtml(lang === "zh" ? "下载技术时间趋势核验队列 CSV" : "Download timeline validation queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_cost_validation_queue.csv">${escapeHtml(lang === "zh" ? "下载技术成本/投资核验队列 CSV" : "Download cost validation queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_project_evidence_audit.csv">${escapeHtml(lang === "zh" ? "下载项目证据审计 CSV" : "Download project evidence audit CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_technology_project_evidence_invalid_queue.csv">${escapeHtml(lang === "zh" ? "下载无效项目证据队列 CSV" : "Download invalid project evidence queue CSV")}</a>
        </div>
      </div>
      ${staticFigure(
        "world500_technology_cluster_overview.png",
        lang === "zh" ? "图6 技术路径静态汇报图" : "Figure 6 static technology-path briefing graphic",
        lang === "zh" ? "该 PNG 与下方技术路径表使用同一份 technology_paths 数据。" : "This PNG uses the same technology_paths data as the table below."
      )}
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
        <div class="table-kicker">P1</div>
        <h3>${escapeHtml(L.projectEvidenceTitle)}</h3>
        <p>${escapeHtml(L.projectEvidenceLead)} ${escapeHtml(lang === "zh" ? "当前页级项目证据：" : "Current page-level project evidence:")} ${escapeHtml(formatInt(projectSummary.project_evidence_count || projectRows.length))}; ${escapeHtml(lang === "zh" ? "涉及企业：" : "companies:")} ${escapeHtml(formatInt(projectSummary.project_company_count || 0))}; ${escapeHtml(lang === "zh" ? "含成本/投资：" : "with cost/investment:")} ${escapeHtml(formatInt(projectSummary.project_cost_evidence_count || 0))}; ${escapeHtml(lang === "zh" ? "含减排效果：" : "with abatement effect:")} ${escapeHtml(formatInt(projectSummary.project_abatement_evidence_count || 0))}.</p>
        ${createTable(L.projectHeaders, projectRows, L.noData)}
      </div>
      <div class="table-card report-table-card" style="margin-top:18px">
        <div class="table-kicker">P2</div>
        <h3>${escapeHtml(lang === "zh" ? "技术族、细分方向、时间与成本信号" : "Technology Families, Subtypes, Time And Cost Signals")}</h3>
        ${createTable(L.techHeaders, rows, L.noData)}
      </div>
    `;
  }

  function renderBubbleChart() {
    const sourcePayload = state.payload.primary_secondary_data || {};
    const rows = (sourcePayload.strong_bubbles || sourcePayload.bubbles || [])
      .filter((item) => item.primary_ratio_known !== null && (
        item.known_source_evidence_count > 0
        || item.ratio_basis_key === "explicit_reported_primary_percentage"
      ))
      .slice()
      .sort((a, b) => b.known_source_evidence_count - a.known_source_evidence_count);
    const width = 1120;
    const height = 540;
    const margin = { left: 70, right: 34, top: 40, bottom: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxY = Math.max(1, ...rows.map((item) => item.known_source_evidence_count || 0));
    const maxSize = Math.max(1, ...rows.map((item) => item.method_evidence_count || 0));
    const explicitCount = rows.filter((item) => item.ratio_basis_key === "explicit_reported_primary_percentage").length;
    const inferenceCount = (sourcePayload.inference_bubbles || [])
      .filter((item) => item.primary_ratio_known !== null && item.known_source_evidence_count > 0)
      .length;
    const circles = rows.slice().sort((a, b) => {
      const explicitA = a.ratio_basis_key === "explicit_reported_primary_percentage";
      const explicitB = b.ratio_basis_key === "explicit_reported_primary_percentage";
      return Number(explicitA) - Number(explicitB);
    }).map((item) => {
      const x = margin.left + (item.primary_ratio_known || 0) * plotWidth;
      const y = margin.top + plotHeight - ((item.known_source_evidence_count || 0) / maxY) * plotHeight;
      const r = 4 + Math.sqrt((item.method_evidence_count || 0) / maxSize) * 20;
      const isExplicit = item.ratio_basis_key === "explicit_reported_primary_percentage";
      const basis = isExplicit
        ? (lang === "zh" ? "原文明示 primary-data 百分比" : "Explicitly reported primary-data percentage")
        : (lang === "zh" ? "method_rows 来源结构推断" : "method_rows source-mix inference");
      return `
        <circle cx="${x}" cy="${y}" r="${r}" fill="${escapeHtml(item.industry_color || "#98a1a8")}" opacity="${isExplicit ? "0.9" : "0.28"}" stroke="${isExplicit ? "#17313e" : escapeHtml(item.industry_color || "#98a1a8")}" stroke-width="${isExplicit ? "2.8" : "1.4"}" ${isExplicit ? "" : "stroke-dasharray=\"5 5\""}>
          <title>${escapeHtml(text(item, "company_name_zh", "company_name_en"))} | ${percent(item.primary_ratio_known)} | ${escapeHtml(basis)} | ${formatInt(item.known_source_evidence_count)} rows</title>
        </circle>
      `;
    }).join("");
    const legend = `
      <g class="reporting-basis-legend" transform="translate(${margin.left + 12} ${margin.top + 8})">
        <circle cx="0" cy="0" r="8" fill="#2f6f63" opacity="0.9" stroke="#17313e" stroke-width="2.8"></circle>
        <text x="16" y="4">${escapeHtml(lang === "zh" ? `强证据：原文明示比例 ${explicitCount}` : `Strong: explicit reported ratio ${explicitCount}`)}</text>
        <circle cx="${lang === "zh" ? 210 : 250}" cy="0" r="8" fill="#98a1a8" opacity="0.28" stroke="#98a1a8" stroke-width="1.4" stroke-dasharray="5 5"></circle>
        <text x="${lang === "zh" ? 226 : 266}" y="4">${escapeHtml(lang === "zh" ? `推断复核：来源结构比例 ${inferenceCount}` : `Review-only inference rows ${inferenceCount}`)}</text>
      </g>
    `;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((tick) => {
      const x = margin.left + tick * plotWidth;
      return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotHeight}" class="reporting-axis-grid"></line><text x="${x}" y="${height - 42}" text-anchor="middle">${Math.round(tick * 100)}%</text>`;
    }).join("");
    return `
      <svg class="reporting-bubble-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(L.sourceMixTitle)}">
        <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="24" class="reporting-graph-bg"></rect>
        ${ticks}
        ${legend}
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
    const rows = (payload.strong_bubbles || payload.bubbles || [])
      .filter((item) => item.primary_ratio_known !== null && (
        item.known_source_evidence_count > 0
        || item.ratio_basis_key === "explicit_reported_primary_percentage"
      ))
      .slice(0, 40)
      .map((item) => [
        workbenchLink(item.company_id, text(item, "company_name_zh", "company_name_en")),
        escapeHtml(text(item, "industry_section_zh", "industry_section_en")),
        escapeHtml(percent(item.primary_ratio_known)),
        escapeHtml(text(item, "ratio_basis_zh", "ratio_basis_en")),
        escapeHtml(item.reported_primary_percent === null || item.reported_primary_percent === undefined || item.reported_primary_percent === ""
          ? "-"
          : `${formatMaybeNumber(Number(item.reported_primary_percent), 2)}%`),
        escapeHtml(formatInt(item.known_source_evidence_count || 0)),
        escapeHtml(formatInt(item.unknown_count || 0)),
        escapeHtml(formatInt(item.method_evidence_count || 0)),
        escapeHtml(text(item, "quality_note_zh", "quality_note_en")),
      ]);
    elements.sourceMix.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(L.sourceMixTitle)}</h2>
        <p>${escapeHtml(L.sourceMixLead)}</p>
        <div class="downloads">
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_primary_secondary_source_mix_audit.csv">${escapeHtml(lang === "zh" ? "下载初级/次级来源审计 CSV" : "Download source-mix audit CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_primary_secondary_source_classification_queue.csv">${escapeHtml(lang === "zh" ? "下载来源分类缺口队列 CSV" : "Download source-classification gap queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_primary_secondary_source_origin_backfill_queue.csv">${escapeHtml(lang === "zh" ? "下载来源类别补回队列 CSV" : "Download source-origin backfill queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_primary_secondary_unknown_share_review_queue.csv">${escapeHtml(lang === "zh" ? "下载 unknown 占比复核队列 CSV" : "Download unknown-share review queue CSV")}</a>
          <a class="btn alt" href="${escapeHtml(assetBase)}/world500_primary_secondary_calculation_weight_validation_queue.csv">${escapeHtml(lang === "zh" ? "下载计算权重核验队列 CSV" : "Download calculation-weight validation queue CSV")}</a>
        </div>
      </div>
      <div class="table-card report-table-card">
        <div class="table-kicker">P2</div>
        <h3>${escapeHtml(lang === "zh" ? "初级/次级数据来源结构气泡图" : "Primary / Secondary Source-Mix Bubble Chart")}</h3>
        <p class="table-lead">${escapeHtml(text(payload, "policy_zh", "policy_en"))}</p>
        ${staticFigure(
          "world500_primary_secondary_source_mix.png",
          lang === "zh" ? "初级/次级数据气泡图静态汇报图" : "Static primary/secondary source-mix bubble chart",
          lang === "zh" ? "静态 PNG 与下方交互气泡图使用同一份 primary_secondary_data.strong_bubbles 数据；推断型保留为复核计数。" : "The static PNG and interactive chart use the same primary_secondary_data.strong_bubbles payload; inference rows remain review-only counts."
        )}
        <div class="reporting-bubble-wrap">${renderBubbleChart()}</div>
        ${createTable(L.sourceMixHeaders, rows, L.noData)}
      </div>
    `;
  }

  function render() {
    renderMetrics();
    renderCompletionAudit();
    renderPolicy();
    renderGhg();
    renderRanking();
    renderStandardGraph();
    renderTechnology();
    renderSourceMix();
    bindStaticFigureLightbox();
  }

  async function init() {
    try {
      renderStatus(L.loading);
      const [payload, audit, gapSummary, requirementMatrix, workplan] = await Promise.all([
        fetchJson(`${assetBase}/reporting_views.json`),
        fetchJson(`${assetBase}/reporting_completion_audit.json`).catch(() => null),
        fetchJson(`${assetBase}/reporting_gap_status_summary.json`).catch(() => null),
        fetchJson(`${assetBase}/world500_requirement_completion_matrix.json`).catch(() => null),
        fetchJson(`${assetBase}/world500_reporting_completion_workplan.json`).catch(() => null),
      ]);
      state.payload = payload;
      state.audit = audit;
      state.gapSummary = gapSummary;
      state.requirementMatrix = requirementMatrix;
      state.workplan = workplan;
      render();
    } catch (error) {
      console.error(error);
      renderStatus(L.loadError);
    }
  }

  init();
})();
