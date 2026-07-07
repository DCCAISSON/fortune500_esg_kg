(() => {
  const scriptUrl = new URL(document.currentScript?.src || "assets/js/industry_outputs_widgets.js", window.location.href);
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const isEmissionLedger = Boolean(document.getElementById("emission-ledger-status"));
  const shell = document.querySelector(".shell");
  if (!shell) return;

  const text = {
    zh: {
      sankeyTitle: "标准体系 × GB/T 4754-2017 行业门类桑基图",
      sankeyLead: "行业节点采用 GB/T 4754-2017 门类口径；流量表示 accepted 企业-标准关联数。同一企业可能关联多个标准，因此流量总和不等于去重企业总数。12 个展示标准以 registry 为准，暂无 accepted flow 的指定标准保留在下载清单中作为待补证据节点。",
      primaryTitle: "初级/次级数据证据链导出",
      primaryLead: "强证据层只包含企业报告原文明示 primary-data 百分比；method-row 来源结构推断不等同于审计级计算权重，缺披露不等于 0。",
      emissionsTitle: "完整可比总排放主榜与行业门类排行",
      emissionsLead: "主榜只包含 Scope 1 + selected Scope 2 + Scope 3、年份、单位、边界和页码闭环企业。partial total 和缺失 Scope 的企业不混入主排序。",
      large: "点击放大查看",
      downloadLinks: "下载桑基图明细",
      downloadRegistry: "下载标准展示节点",
      downloadEvidence: "下载证据链明细",
      downloadBubble: "下载气泡公司汇总",
      downloadRanking: "下载行业排行",
      downloadCoverage: "下载覆盖率汇总",
      downloadMissing: "下载缺失企业清单",
      tableStandard: "标准",
      tableIndustry: "行业门类",
      tableCount: "accepted 关联数",
      tableCompanies: "企业数",
      tableCompany: "企业",
      tableTotal: "总排放 MtCO2e",
      tableComplete: "完整主榜",
      tablePublished: "正式图谱企业",
      tableMissing: "未入完整主榜",
    },
    en: {
      sankeyTitle: "Standard Systems × GB/T 4754-2017 Industry Sections Sankey",
      sankeyLead: "Industry nodes use GB/T 4754-2017 section-level classes. Flow means accepted company-standard association count; one company may cite multiple standards. The 12 display standards follow the registry; requested standards without accepted flow are kept in the downloadable registry as evidence-pending nodes.",
      primaryTitle: "Primary / Secondary Evidence Chain Exports",
      primaryLead: "Only explicitly reported primary-data percentages are strong evidence. Method-row source-mix inference is not an audit-grade calculation weight; missing disclosure is not zero.",
      emissionsTitle: "Complete Comparable Emissions Ranking and Industry Sections",
      emissionsLead: "The main ranking only includes companies with Scope 1 + selected Scope 2 + Scope 3, year, unit, boundary, and page evidence closed. Partial totals stay out of the main ordering.",
      large: "View Large",
      downloadLinks: "Download Sankey links",
      downloadRegistry: "Download display nodes",
      downloadEvidence: "Download evidence chain",
      downloadBubble: "Download bubble summary",
      downloadRanking: "Download industry ranking",
      downloadCoverage: "Download coverage summary",
      downloadMissing: "Download missing companies",
      tableStandard: "Standard",
      tableIndustry: "Industry section",
      tableCount: "Accepted links",
      tableCompanies: "Companies",
      tableCompany: "Company",
      tableTotal: "Total MtCO2e",
      tableComplete: "Complete ranking",
      tablePublished: "Published graph companies",
      tableMissing: "Not in complete ranking",
    },
  }[lang];

  function dataUrl(name) {
    return new URL(`../data/world500/workbench/${name}`, scriptUrl).href;
  }

  function figureUrl(name) {
    return new URL(`../figures/${lang}/${name}`, scriptUrl).href;
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

  function table(headers, rows) {
    return `<div class="table-wrap"><table><tr>${headers.map((item) => `<th>${esc(item)}</th>`).join("")}</tr>${rows
      .map((row) => `<tr>${row.map((item) => `<td>${item}</td>`).join("")}</tr>`)
      .join("")}</table></div>`;
  }

  function button(label, href) {
    return `<a class="zoom-btn" href="${esc(href)}" download>${esc(label)}</a>`;
  }

  function imageCard(title, lead, filename, buttons, rows) {
    const src = figureUrl(filename);
    return `
      <section class="section industry-output-widget">
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

  function bindLightbox(root) {
    let lightbox = document.getElementById("lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "lightbox";
      lightbox.className = "lightbox";
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.innerHTML = `<div class="lightbox-dialog"><button class="lightbox-close" type="button">Close</button><div class="lightbox-frame"><img class="lightbox-image" id="lightbox-image" alt=""><div class="lightbox-caption" id="lightbox-caption"></div></div></div>`;
      document.body.appendChild(lightbox);
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
    lightbox.querySelector(".lightbox-close")?.addEventListener("click", () => lightbox.classList.remove("open"));
  }

  async function renderSankeyAndSourceMix() {
    const links = (await json("world500_standard_industry_section_sankey_links.json")).rows || [];
    const topLinks = [...links].sort((a, b) => Number(b.accepted_link_count) - Number(a.accepted_link_count)).slice(0, 8);
    const rows = table(
      [text.tableStandard, text.tableIndustry, text.tableCount, text.tableCompanies],
      topLinks.map((row) => [
        esc(row[lang === "zh" ? "display_standard_name_zh" : "display_standard_name_en"]),
        esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
        esc(row.accepted_link_count),
        esc(row.distinct_company_count),
      ]),
    );
    const sankey = imageCard(text.sankeyTitle, text.sankeyLead, "world500_standard_industry_section_sankey.png", [
      button(text.downloadLinks, dataUrl("world500_standard_industry_section_sankey_links.csv")),
      button(text.downloadRegistry, dataUrl("standard_industry_sankey_registry.csv")),
    ], rows);
    const primary = `
      <section class="section industry-output-widget">
        <div class="card">
          <div class="section-head"><h2>${esc(text.primaryTitle)}</h2><p>${esc(text.primaryLead)}</p></div>
          <div class="actions">${button(text.downloadEvidence, dataUrl("world500_primary_secondary_evidence_chain_export.csv"))}${button(text.downloadBubble, dataUrl("world500_primary_secondary_bubble_company_summary.csv"))}</div>
        </div>
      </section>`;
    shell.insertAdjacentHTML("beforeend", sankey + primary);
    bindLightbox(shell);
  }

  async function renderEmissionOutputs() {
    const ranking = (await json("world500_emissions_industry_section_ranking.json")).rows || [];
    const coverage = (await json("world500_emissions_industry_section_coverage_summary.json")).rows || [];
    const topCompanies = [...ranking].sort((a, b) => Number(b.total_emissions) - Number(a.total_emissions)).slice(0, 10);
    const activeCoverage = coverage.filter((row) => Number(row.published_company_count) > 0);
    const rows = `
      ${table([text.tableCompany, text.tableIndustry, text.tableTotal], topCompanies.map((row) => [
        esc(`#${row.world500_rank} ${row.company_name}`),
        esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
        esc(Number(row.total_emissions).toLocaleString("en-US", { maximumFractionDigits: 2 })),
      ]))}
      ${table([text.tableIndustry, text.tableComplete, text.tablePublished, text.tableMissing], activeCoverage.map((row) => [
        esc(`${row.industry_section_code} ${row[lang === "zh" ? "industry_section_name_zh" : "industry_section_name_en"]}`),
        esc(row.complete_comparable_count),
        esc(row.published_company_count),
        esc(row.missing_total_emissions_count),
      ]))}`;
    const html = imageCard(text.emissionsTitle, text.emissionsLead, "world500_emissions_industry_section_ranking.png", [
      button(text.downloadRanking, dataUrl("world500_emissions_industry_section_ranking.csv")),
      button(text.downloadCoverage, dataUrl("world500_emissions_industry_section_coverage_summary.csv")),
      button(text.downloadMissing, dataUrl("world500_emissions_missing_company_list.csv")),
    ], rows);
    (document.getElementById("emission-ledger-status") || shell).insertAdjacentHTML("beforebegin", html);
    bindLightbox(shell);
  }

  (isEmissionLedger ? renderEmissionOutputs() : renderSankeyAndSourceMix()).catch((error) => console.error(error));
})();
