(() => {
  const scriptUrl = new URL(document.currentScript?.src || "assets/js/industry_outputs_widgets.js", window.location.href);
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const isEmissionLedger = Boolean(document.getElementById("emission-ledger-status"));
  const shell = document.querySelector(".shell");
  if (!shell) return;

  const text = {
    zh: {
      coreTitle: "需求方新增关注的三项核心输出",
      coreLead: "入口前移到首页首屏后方：先看行业-标准-行业宏观 Sankey，再下载初级/次级证据链，最后进入排放行业账本核查完整主榜和缺失企业。",
      coreSankey: "宏观 Sankey",
      coreSankeyDesc: "行业门类 -> 12 个具体标准 -> 行业门类，流量只计 accepted 企业-标准边。",
      corePrimary: "初级/次级导出",
      corePrimaryDesc: "580 行原始证据链、306 家公司汇总，并标注可绘制比例与强证据边界。",
      coreEmissions: "排放行业账本",
      coreEmissionsDesc: "完整主榜 27 家、可用排放 91 家、未闭合 324 家，并按行业列出缺失 Scope。",
      open: "打开",
      sankeyTitle: "三套标准体系与国民经济行业门类分栏关联图",
      sankeyLead: "Sankey 图采用“行业门类 A-J -> 具体标准 -> 行业门类 K-T”分栏结构。左右两侧共同覆盖 GB/T 4754-2017 的 20 个国民经济行业门类，中间为需求方指定的 12 个具体标准节点；流量口径为 accepted 企业-标准关联数，企业去重数和行业间因果关系另行统计。",
      primaryTitle: "初级/次级数据证据链导出",
      primaryLead: "306 家企业有证据链或来源结构汇总；其中 161 家具备可计算的 primary/secondary/unknown 比例，可绘制气泡。气泡以可计算比例为绘制条件，并区分原文明示比例与来源结构推断。",
      emissionsTitle: "完整可比总排放主榜与行业门类排行",
      emissionsLead: "该图不代表所有企业排放量。主榜仅包含 Scope 1 + selected Scope 2 + Scope 3、年份、单位、边界和页码闭环企业；其余企业按行业计入未闭合数量，并提供缺失企业清单。",
      large: "点击放大查看",
      downloadLinks: "下载桑基图明细",
      downloadRegistry: "下载标准展示节点",
      downloadEvidence: "下载证据链明细",
      downloadBubble: "下载气泡公司汇总",
      downloadRanking: "下载行业排行",
      downloadCoverage: "下载覆盖率汇总",
      downloadScopeSummary: "下载行业 Scope 汇总",
      downloadMissing: "下载缺失企业清单",
      tableStandard: "标准",
      tableIndustry: "行业门类",
      tableCount: "accepted 关联数",
      tableCompanies: "企业数",
      tableCompany: "企业",
      tableTotal: "总排放 MtCO2e",
      tableScope1: "Scope 1",
      tableScope2: "Scope 2",
      tableScope3: "Scope 3",
      tableComplete: "完整主榜",
      tableAvailable: "可用排放",
      tablePublished: "正式图谱企业",
      tableMissing: "未闭合",
      tableMissingScope1: "缺 Scope 1",
      tableMissingScope2: "缺 Scope 2",
      tableMissingScope3: "缺 Scope 3",
      metricEvidenceRows: "原始证据链行数",
      metricEvidenceCompanies: "证据链企业",
      metricBubbleCompanies: "气泡汇总企业",
      metricDrawableCompanies: "可绘制比例企业",
      metricExplicitCompanies: "原文明示比例企业",
      metricComplete: "完整主榜企业",
      metricAvailable: "可用排放企业",
      metricMissing: "未闭合企业",
      metricPublished: "正式图谱企业",
    },
    en: {
      coreTitle: "Three Priority Outputs From the Latest Requirement Update",
      coreLead: "The homepage now surfaces the macro Sankey, primary/secondary evidence exports, and emissions industry ledger immediately after the hero section.",
      coreSankey: "Macro Sankey",
      coreSankeyDesc: "Industry section -> 12 concrete standards -> industry section; flow counts accepted company-standard edges only.",
      corePrimary: "Primary / Secondary Export",
      corePrimaryDesc: "580 evidence rows and 306 company summaries, with drawable-ratio and strong-evidence boundaries separated.",
      coreEmissions: "Emissions Industry Ledger",
      coreEmissionsDesc: "27 complete companies, 91 available companies, and 324 companies missing full Scope closure by industry.",
      open: "Open",
      sankeyTitle: "GHGP, ISO, and GB/T Standards by Split Industry Sections",
      sankeyLead: "This Sankey uses a split three-column structure: industry sections A-J -> concrete standard -> industry sections K-T. The two sides jointly cover the 20 GB/T 4754-2017 industry sections; the middle column contains the 12 requested concrete standards. Flow uses accepted company-standard association count; distinct-company counts and industry causality are tracked separately.",
      primaryTitle: "Primary / Secondary Evidence Chain Exports",
      primaryLead: "306 companies have evidence-chain or source-structure summaries; 161 have computable primary/secondary/unknown ratios and can be plotted. Bubbles are drawn when ratios are computable, with explicit percentages separated from source-structure inference.",
      emissionsTitle: "Complete Comparable Emissions Ranking and Industry Sections",
      emissionsLead: "This figure is not an all-company emissions total. The main ranking includes only companies with Scope 1 + selected Scope 2 + Scope 3, year, unit, boundary, and page evidence closed. All other companies are counted as missing closure by industry.",
      large: "View Large",
      downloadLinks: "Download Sankey links",
      downloadRegistry: "Download display nodes",
      downloadEvidence: "Download evidence chain",
      downloadBubble: "Download bubble summary",
      downloadRanking: "Download industry ranking",
      downloadCoverage: "Download coverage summary",
      downloadScopeSummary: "Download industry Scope summary",
      downloadMissing: "Download missing companies",
      tableStandard: "Standard",
      tableIndustry: "Industry section",
      tableCount: "Accepted links",
      tableCompanies: "Companies",
      tableCompany: "Company",
      tableTotal: "Total MtCO2e",
      tableScope1: "Scope 1",
      tableScope2: "Scope 2",
      tableScope3: "Scope 3",
      tableComplete: "Complete ranking",
      tableAvailable: "Available emissions",
      tablePublished: "Published companies",
      tableMissing: "Missing closure",
      tableMissingScope1: "Missing Scope 1",
      tableMissingScope2: "Missing Scope 2",
      tableMissingScope3: "Missing Scope 3",
      metricEvidenceRows: "Evidence-chain rows",
      metricEvidenceCompanies: "Evidence-chain companies",
      metricBubbleCompanies: "Bubble-summary companies",
      metricDrawableCompanies: "Drawable-ratio companies",
      metricExplicitCompanies: "Explicit-ratio companies",
      metricComplete: "Complete-ranking companies",
      metricAvailable: "Available-emissions companies",
      metricMissing: "Missing-closure companies",
      metricPublished: "Published companies",
    },
  }[lang];

  Object.assign(text, lang === "zh" ? {
    coreSankeyDesc: "\u884c\u4e1a\u95e8\u7c7b A-J / K-T \u5206\u5217\u4e24\u4fa7\uff0c\u4e2d\u95f4\u4e3a 12 \u4e2a\u5177\u4f53\u6807\u51c6\uff1b\u6d41\u91cf\u53e3\u5f84\u4e3a accepted \u4f01\u4e1a-\u6807\u51c6\u5173\u8054\u6570\u3002",
    sankeyTitle: "\u4e09\u5957\u6807\u51c6\u4f53\u7cfb\u4e0e\u56fd\u6c11\u7ecf\u6d4e\u884c\u4e1a\u95e8\u7c7b\u5206\u680f\u5173\u8054\u56fe",
    sankeyLead: "\u8be5 Sankey \u56fe\u6309\u201c\u884c\u4e1a\uff08A-J\uff09-\u5177\u4f53\u6807\u51c6-\u884c\u4e1a\uff08K-T\uff09\u201d\u5206\u680f\u5c55\u793a\uff0c\u5de6\u53f3\u4e24\u4fa7\u5171\u540c\u8986\u76d6 GB/T 4754-2017 \u7684 20 \u4e2a\u56fd\u6c11\u7ecf\u6d4e\u884c\u4e1a\u95e8\u7c7b\u3002\u4e2d\u95f4\u4e3a\u9700\u6c42\u65b9\u6307\u5b9a\u7684 12 \u4e2a\u5177\u4f53\u6807\u51c6\u8282\u70b9\uff1b\u6d41\u91cf\u53e3\u5f84\u4e3a accepted \u4f01\u4e1a-\u6807\u51c6\u5173\u8054\u6570\uff0c\u4f01\u4e1a\u53bb\u91cd\u6570\u548c\u884c\u4e1a\u95f4\u56e0\u679c\u5173\u7cfb\u53e6\u884c\u7edf\u8ba1\u3002\u540c\u4e00\u4f01\u4e1a\u5982 accepted \u591a\u4e2a\u6807\u51c6\uff0c\u4f1a\u4ea7\u751f\u591a\u6761\u4f01\u4e1a-\u6807\u51c6\u5173\u8054\u3002",
    downloadSankeyEvidence: "\u4e0b\u8f7d Sankey \u539f\u59cb\u8bc1\u636e\u8868",
    downloadReviewPack: "\u4e0b\u8f7d\u6807\u51c6-\u884c\u4e1a\u590d\u6838\u5305",
    downloadIndustryPack: "\u4e0b\u8f7d\u4f01\u4e1a\u884c\u4e1a\u590d\u6838\u5305",
    downloadDeliveryReadme: "\u4e0b\u8f7d\u4ea4\u4ed8\u8bf4\u660e README",
  } : {
    coreSankeyDesc: "Industry sections A-J / K-T are split across the two sides; the middle column contains 12 concrete standards, and flow uses accepted company-standard associations.",
    sankeyTitle: "GHGP, ISO, and GB/T Standards by Split Industry Sections",
    sankeyLead: "This Sankey splits the 20 GB/T 4754-2017 industry sections across the two sides: A-J on the left and K-T on the right. The middle column contains the 12 requested concrete standards. Flow uses accepted company-standard association count; distinct-company counts and industry causality are tracked separately. One company accepted under multiple standards produces multiple company-standard associations.",
    downloadSankeyEvidence: "Download Sankey evidence table",
    downloadReviewPack: "Download standard-industry review pack",
    downloadIndustryPack: "Download company-industry review pack",
    downloadDeliveryReadme: "Download delivery README",
  });

  function dataUrl(name) {
    return new URL(`../data/world500/workbench/${name}`, scriptUrl).href;
  }

  function figureUrl(name) {
    return new URL(`../figures/${lang}/${name}`, scriptUrl).href;
  }

  function pageHref(name) {
    return /\/(zh|en)\//.test(window.location.pathname) ? `./${name}` : `./${lang}/${name}`;
  }

  async function json(name) {
    const response = await fetch(dataUrl(name), { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${name}`);
    return response.json();
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function sum(rows, key) {
    return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  }

  function uniqueCount(rows, key) {
    return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
  }

  function table(headers, rows) {
    return `<div class="table-wrap"><table><tr>${headers.map((item) => `<th>${esc(item)}</th>`).join("")}</tr>${rows
      .map((row) => `<tr>${row.map((item) => `<td>${item}</td>`).join("")}</tr>`)
      .join("")}</table></div>`;
  }

  function metric(label, value) {
    return `<div class="metric"><h3>${esc(label)}</h3><strong>${esc(formatNumber(value))}</strong></div>`;
  }

  function button(label, href) {
    return `<a class="zoom-btn" href="${esc(href)}" download>${esc(label)}</a>`;
  }

  function imageCard(id, title, lead, filename, buttons, rows) {
    const src = figureUrl(filename);
    return `
      <section class="section industry-output-widget" id="${esc(id)}">
        <div class="section-head"><h2>${esc(title)}</h2><p>${esc(lead)}</p></div>
        <div class="card">
          <div class="report-figure-head">
            <div class="report-figure-title"><div class="tag">GB/T 4754-2017</div><h3>${esc(title)}</h3></div>
            <div class="report-figure-actions"><button class="zoom-btn" type="button" data-dynamic-lightbox-src="${esc(src)}" data-dynamic-lightbox-title="${esc(title)}">${esc(text.large)}</button>${buttons.join("")}</div>
          </div>
          <img class="visual-figure" src="${esc(src)}" alt="${esc(title)}" data-dynamic-lightbox-src="${esc(src)}" data-dynamic-lightbox-title="${esc(title)}" tabindex="0">
          <div class="report-figure-caption">${esc(lead)}</div>
          <div class="visual-support"><div class="table-card">${rows}</div></div>
        </div>
      </section>`;
  }

  function coreNav() {
    return `
      <section class="section" id="world500-core-output-entry">
        <div class="section-head"><h2>${esc(text.coreTitle)}</h2><p>${esc(text.coreLead)}</p></div>
        <div class="homepage-core-views">
          <a class="homepage-core-card is-standard" href="#standard-industry-sankey"><span class="homepage-core-kicker">Sankey</span><strong>${esc(text.coreSankey)}</strong><span>${esc(text.coreSankeyDesc)}</span><span class="pill">${esc(text.open)}</span></a>
          <a class="homepage-core-card is-ghgp" href="#primary-secondary-export"><span class="homepage-core-kicker">Source mix</span><strong>${esc(text.corePrimary)}</strong><span>${esc(text.corePrimaryDesc)}</span><span class="pill">${esc(text.open)}</span></a>
          <a class="homepage-core-card is-technology" href="${esc(pageHref("emission-ledger.html"))}#emission-industry-ledger"><span class="homepage-core-kicker">Emissions</span><strong>${esc(text.coreEmissions)}</strong><span>${esc(text.coreEmissionsDesc)}</span><span class="pill">${esc(text.open)}</span></a>
        </div>
      </section>`;
  }

  function bindLightbox(root) {
    let lightbox = document.getElementById("lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "lightbox";
      lightbox.className = "lightbox";
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.innerHTML = `<div class="lightbox-dialog"><button class="lightbox-close" type="button">Close</button><div class="lightbox-frame"><img class="lightbox-image" id="lightbox-image" alt=""><div class="lightbox-caption" id="lightbox-caption"></div></div></div>`;
      document.body.appendChild(lightbox);
      lightbox.querySelector(".lightbox-close")?.addEventListener("click", () => lightbox.classList.remove("open"));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") lightbox.classList.remove("open");
      });
    }
    const image = document.getElementById("lightbox-image");
    const caption = document.getElementById("lightbox-caption");
    root.querySelectorAll("[data-dynamic-lightbox-src]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        image?.setAttribute("src", trigger.getAttribute("data-dynamic-lightbox-src") || "");
        image?.setAttribute("alt", trigger.getAttribute("data-dynamic-lightbox-title") || "");
        if (caption) caption.textContent = trigger.getAttribute("data-dynamic-lightbox-title") || "";
        lightbox.classList.add("open");
        lightbox.setAttribute("aria-hidden", "false");
      });
    });
  }

  async function renderSankeyAndSourceMix() {
    const [linksPayload, evidencePayload, bubblePayload] = await Promise.all([
      json("world500_standard_industry_section_sankey_links.json"),
      json("world500_primary_secondary_evidence_chain_export.json"),
      json("world500_primary_secondary_bubble_company_summary.json"),
    ]);
    const links = linksPayload.rows || [];
    const evidenceRows = evidencePayload.rows || [];
    const bubbleRows = bubblePayload.rows || [];
    const drawableRows = bubbleRows.filter((row) => String(row.included_in_bubble).toLowerCase() === "true");
    const explicitRows = bubbleRows.filter((row) => row.bubble_evidence_type === "explicit_reported_primary_data_percentage");
    const topLinks = [...links].sort((a, b) => Number(b.accepted_link_count) - Number(a.accepted_link_count)).slice(0, 8);
    const sankeyRows = table([text.tableStandard, text.tableIndustry, text.tableCount, text.tableCompanies], topLinks.map((row) => [
      esc(row[lang === "zh" ? "display_standard_name_zh" : "display_standard_name_en"]),
      esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
      esc(row.accepted_link_count),
      esc(row.distinct_company_count),
    ]));
    const sankey = imageCard("standard-industry-sankey", text.sankeyTitle, text.sankeyLead, "world500_standard_industry_section_sankey.png", [
      button(text.downloadLinks, dataUrl("world500_standard_industry_section_sankey_links.csv")),
      button(text.downloadRegistry, dataUrl("standard_industry_sankey_registry.csv")),
      button(text.downloadSankeyEvidence, dataUrl("world500_standard_industry_section_sankey_evidence.csv")),
      button(text.downloadReviewPack, dataUrl("world500_standard_industry_evidence_review_pack.csv")),
      button(text.downloadIndustryPack, dataUrl("world500_company_industry_review_pack.csv")),
      button(text.downloadDeliveryReadme, dataUrl("world500_standard_industry_delivery_readme.md")),
    ], sankeyRows);
    const primaryStats = `
      <div class="metric-grid">
        ${metric(text.metricEvidenceRows, evidenceRows.length)}
        ${metric(text.metricEvidenceCompanies, uniqueCount(evidenceRows, "company_id"))}
        ${metric(text.metricBubbleCompanies, uniqueCount(bubbleRows, "company_id"))}
        ${metric(text.metricDrawableCompanies, uniqueCount(drawableRows, "company_id"))}
        ${metric(text.metricExplicitCompanies, uniqueCount(explicitRows, "company_id"))}
      </div>`;
    const primary = `
      <section class="section industry-output-widget" id="primary-secondary-export">
        <div class="card">
          <div class="section-head"><h2>${esc(text.primaryTitle)}</h2><p>${esc(text.primaryLead)}</p></div>
          ${primaryStats}
          <div class="actions">${button(text.downloadEvidence, dataUrl("world500_primary_secondary_evidence_chain_export.csv"))}${button(text.downloadBubble, dataUrl("world500_primary_secondary_bubble_company_summary.csv"))}</div>
        </div>
      </section>`;
    const hero = shell.querySelector(".hero") || shell.firstElementChild || shell;
    const auditCallout = hero.querySelector?.(".homepage-audit-callout");
    if (auditCallout) {
      auditCallout.insertAdjacentHTML("beforebegin", coreNav());
      hero.insertAdjacentHTML("afterend", sankey + primary);
    } else {
      hero.insertAdjacentHTML("afterend", coreNav() + sankey + primary);
    }
    bindLightbox(shell);
  }

  async function renderEmissionOutputs() {
    const [rankingPayload, coveragePayload, scopeSummaryPayload] = await Promise.all([
      json("world500_emissions_industry_section_ranking.json"),
      json("world500_emissions_industry_section_coverage_summary.json"),
      json("world500_emissions_industry_section_scope_summary.json"),
    ]);
    const ranking = rankingPayload.rows || [];
    const coverage = coveragePayload.rows || [];
    const scopeSummary = scopeSummaryPayload.rows || [];
    const topCompanies = [...ranking].sort((a, b) => Number(b.total_emissions) - Number(a.total_emissions)).slice(0, 10);
    const activeCoverage = coverage.filter((row) => Number(row.published_company_count) > 0);
    const activeScopeSummary = scopeSummary.filter((row) => Number(row.published_company_count) > 0)
      .sort((a, b) => Number(b.complete_total_mtco2e) - Number(a.complete_total_mtco2e));
    const summary = `
      <div class="metric-grid">
        ${metric(text.metricPublished, sum(coverage, "published_company_count"))}
        ${metric(text.metricComplete, ranking.length)}
        ${metric(text.metricAvailable, sum(coverage, "available_emissions_count"))}
        ${metric(text.metricMissing, sum(coverage, "missing_total_emissions_count"))}
      </div>`;
    const rows = `
      ${summary}
      ${table([text.tableCompany, text.tableIndustry, text.tableScope1, text.tableScope2, text.tableScope3, text.tableTotal], topCompanies.map((row) => [
        esc(`#${row.world500_rank} ${row.company_name}`),
        esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
        esc(formatNumber(row.scope1)),
        esc(formatNumber(row.scope2_selected)),
        esc(formatNumber(row.scope3)),
        esc(formatNumber(row.total_emissions)),
      ]))}
      ${table([text.tableIndustry, text.tableComplete, text.tableMissing, text.tableScope1, text.tableScope2, text.tableScope3, text.tableTotal], activeScopeSummary.map((row) => [
        esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
        esc(row.complete_comparable_company_count),
        esc(row.missing_total_emissions_company_count),
        esc(formatNumber(row.complete_scope1_mtco2e)),
        esc(formatNumber(row.complete_scope2_selected_mtco2e)),
        esc(formatNumber(row.complete_scope3_mtco2e)),
        esc(formatNumber(row.complete_total_mtco2e)),
      ]))}
      ${table([text.tableIndustry, text.tableComplete, text.tableAvailable, text.tablePublished, text.tableMissing, text.tableMissingScope1, text.tableMissingScope2, text.tableMissingScope3], activeCoverage.map((row) => [
        esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
        esc(row.complete_comparable_count),
        esc(row.available_emissions_count),
        esc(row.published_company_count),
        esc(row.missing_total_emissions_count),
        esc(row.missing_scope1_count),
        esc(row.missing_scope2_count),
        esc(row.missing_scope3_count),
      ]))}`;
    const html = imageCard("emission-industry-ledger", text.emissionsTitle, text.emissionsLead, "world500_emissions_industry_section_ranking.png", [
      button(text.downloadRanking, dataUrl("world500_emissions_industry_section_ranking.csv")),
      button(text.downloadCoverage, dataUrl("world500_emissions_industry_section_coverage_summary.csv")),
      button(text.downloadScopeSummary, dataUrl("world500_emissions_industry_section_scope_summary.csv")),
      button(text.downloadMissing, dataUrl("world500_emissions_missing_company_list.csv")),
    ], rows);
    (document.getElementById("emission-ledger-status") || shell).insertAdjacentHTML("beforebegin", html);
    bindLightbox(shell);
  }

  (isEmissionLedger ? renderEmissionOutputs() : renderSankeyAndSourceMix()).catch((error) => console.error(error));
})();
