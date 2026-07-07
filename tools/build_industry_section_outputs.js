const fs = require("fs");
const path = require("path");

const root = process.cwd();
const wb = path.join(root, "assets/data/world500/workbench");

const sections = [
  ["A", "农、林、牧、渔业", "Agriculture, Forestry, Animal Husbandry and Fishery"],
  ["B", "采矿业", "Mining"],
  ["C", "制造业", "Manufacturing"],
  ["D", "电力、热力、燃气及水生产和供应业", "Electricity, Heat, Gas and Water Production and Supply"],
  ["E", "建筑业", "Construction"],
  ["F", "批发和零售业", "Wholesale and Retail Trade"],
  ["G", "交通运输、仓储和邮政业", "Transport, Storage and Post"],
  ["H", "住宿和餐饮业", "Accommodation and Catering"],
  ["I", "信息传输、软件和信息技术服务业", "Information Transmission, Software and Information Technology Services"],
  ["J", "金融业", "Finance"],
  ["K", "房地产业", "Real Estate"],
  ["L", "租赁和商务服务业", "Leasing and Business Services"],
  ["M", "科学研究和技术服务业", "Scientific Research and Technical Services"],
  ["N", "水利、环境和公共设施管理业", "Water, Environment and Public Facilities Management"],
  ["O", "居民服务、修理和其他服务业", "Resident Services, Repairs and Other Services"],
  ["P", "教育", "Education"],
  ["Q", "卫生和社会工作", "Health and Social Work"],
  ["R", "文化、体育和娱乐业", "Culture, Sports and Entertainment"],
  ["S", "公共管理、社会保障和社会组织", "Public Administration, Social Security and Social Organizations"],
  ["T", "国际组织", "International Organizations"],
];

const displayStandards = [
  ["GHG Protocol", "GHG Protocol 企业核算与报告标准", "GHG Protocol Corporate Accounting and Reporting Standard", "ghg_corporate_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol 企业价值链（Scope 3）核算与报告标准", "GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard", "ghg_scope3_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "金融行业全球温室气体核算与报告标准", "Global GHG Accounting and Reporting Standard for the Financial Industry", "ghg_financial_industry_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol Scope 2 指南", "GHG Protocol Scope 2 Guidance", "ghg_scope2_guidance", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol 项目减排核算协议", "GHG Protocol Project Protocol", "ghg_project_protocol", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol 产品生命周期核算与报告标准", "GHG Protocol Product Life Cycle Accounting and Reporting Standard", "ghg_product_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol Scope 3 计算指南", "GHG Protocol Scope 3 Calculation Guidance", "ghg_scope3_calculation_guidance", "GHG Protocol", "true", "false", "true", "需求方文档写 GHGP 7 类但正文只列明 6 个名称；第 7 项暂按现有标准注册表映射为 Scope 3 Calculation Guidance，后续可按需求方确认调整。"],
  ["ISO", "ISO 14064", "ISO 14064", "iso_14064", "ISO system", "true", "true", "false", ""],
  ["ISO", "ISO 14067", "ISO 14067", "iso_14067", "ISO system", "true", "true", "false", ""],
  ["ISO", "ISO 14040/14044", "ISO 14040/14044", "iso_14040_14044", "ISO system", "true", "true", "false", "需求方指定展示节点；当前无 accepted 企业-标准边时保留为 0-flow / 待补证据，不用其他 ISO 标准替代。"],
  ["GB/T", "GB/T 24067-2024", "GB/T 24067-2024", "gb_t_24067_2024", "Chinese national standard system", "true", "true", "false", ""],
  ["GB/T", "GB/T 32150-2015", "GB/T 32150-2015", "gb_t_32150_2015", "Chinese national standard system", "true", "true", "false", "需求方指定展示节点；当前无 accepted 企业-标准边时保留为 0-flow / 待补证据，不用其他 GB/T 标准替代。"],
];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(wb, name), "utf8"));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\"" && quoted && text[i + 1] === "\"") {
      cell += "\"";
      i += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(header.map((key, index) => [key.replace(/^\uFEFF/, ""), values[index] || ""])));
}

function writeRows(name, rows, extra = {}) {
  const keys = Object.keys(rows[0] || {});
  const csv = [
    keys.join(","),
    ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")),
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(wb, `${name}.csv`), csv, "utf8");
  fs.writeFileSync(
    path.join(wb, `${name}.json`),
    JSON.stringify({ schema_version: `${name}-v1`, row_count: rows.length, ...extra, rows }, null, 2) + "\n",
    "utf8",
  );
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function sectionName(code, lang) {
  const item = sections.find((row) => row[0] === code);
  return item ? item[lang === "zh" ? 1 : 2] : "";
}

function splitList(value) {
  return String(value || "").split(/\s+\|\s+/).map((item) => item.trim()).filter(Boolean);
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceLayer(row, snippet) {
  const text = `${snippet} ${row.ratio_basis_key || ""}`.toLowerCase();
  if (row.ratio_basis_key === "explicit_reported_primary_percentage" || row.reported_primary_percent) return "explicit_reported_primary_data_percentage";
  if (text.includes("supplier-specific")) return "supplier_specific_data";
  if (text.includes("spend-based") || text.includes("spend based")) return "spend_based_data";
  if (text.includes("average-data") || text.includes("average data")) return "average_data";
  if ((num(row.primary_count) || num(row.secondary_count) || num(row.mixed_count)) && !row.reported_primary_percent) return "explicit_primary_secondary_mention_without_ratio";
  if (row.ratio_basis_key === "method_row_source_mix") return "method_row_source_mix_inference";
  return "unknown";
}

function sourceType(layer) {
  if (["explicit_reported_primary_data_percentage", "supplier_specific_data"].includes(layer)) return "primary";
  if (["spend_based_data", "average_data"].includes(layer)) return "secondary";
  if (layer === "unknown") return "unknown";
  return "primary_secondary_mixed";
}

function build() {
  const companies = readJson("company_workbench.json").companies;
  const views = readJson("reporting_views.json");
  const companyMap = new Map(companies.map((item) => [item.company_id, item]));
  const published = companies.filter((item) => item.is_published_company);
  const complete = readJson("world500_emissions_complete_comparable_ranking.json").rows;
  const completeIds = new Set(complete.map((item) => item.company_id));
  const available = views.emissions_ranking.available || [];
  const availableMap = new Map(available.map((item) => [item.company_id, item]));
  const standardRows = parseCsv(fs.readFileSync(path.join(wb, "world500_standard_role_link_audit.csv"), "utf8"));
  const displayMap = new Map(displayStandards.map((item) => [item[3], item]));
  const acceptedRows = standardRows.filter((row) => row.decision_bucket === "accepted" && displayMap.has(row.standard_id));

  const sankeyGroups = new Map();
  for (const row of acceptedRows) {
    const display = displayMap.get(row.standard_id);
    const code = row.industry_section_code || companyMap.get(row.company_id)?.industry_section_code || "";
    if (!code) continue;
    const key = `${row.standard_id}::${code}`;
    const group = sankeyGroups.get(key) || { display, code, links: 0, companies: new Map() };
    group.links += 1;
    group.companies.set(row.company_id, row.company_name_en || companyMap.get(row.company_id)?.company_name_en || row.company_id);
    sankeyGroups.set(key, group);
  }

  const sankeyRows = [...sankeyGroups.values()].map((group) => ({
    standard_system: group.display[0],
    display_standard_name_zh: group.display[1],
    display_standard_name_en: group.display[2],
    internal_standard_id: group.display[3],
    industry_section_code: group.code,
    industry_section_name_zh: sectionName(group.code, "zh"),
    industry_section_name_en: sectionName(group.code, "en"),
    accepted_company_count: group.companies.size,
    accepted_link_count: group.links,
    distinct_company_count: group.companies.size,
    company_ids: [...group.companies.keys()].sort(),
    company_names: [...group.companies.values()].sort(),
  })).sort((a, b) => `${a.standard_system}${a.internal_standard_id}${a.industry_section_code}`.localeCompare(`${b.standard_system}${b.internal_standard_id}${b.industry_section_code}`));

  const bySection = new Map(sections.map((row) => [row[0], { code: row[0] }]));
  for (const company of published) bySection.get(company.industry_section_code).published = (bySection.get(company.industry_section_code).published || 0) + 1;
  for (const row of acceptedRows) {
    const code = row.industry_section_code || companyMap.get(row.company_id)?.industry_section_code;
    if (bySection.has(code)) bySection.get(code).acceptedCompanies = (bySection.get(code).acceptedCompanies || new Set()).add(row.company_id);
  }
  for (const row of complete) bySection.get(row.industry_section_code).complete = (bySection.get(row.industry_section_code).complete || 0) + 1;
  for (const row of available) bySection.get(row.industry_section_code).available = (bySection.get(row.industry_section_code).available || 0) + 1;

  const registryRows = sections.map(([code, zh, en]) => {
    const item = bySection.get(code) || {};
    const publishedCount = item.published || 0;
    return {
      industry_section_code: code,
      industry_section_name_zh: zh,
      industry_section_name_en: en,
      gb_standard: "GB/T 4754-2017",
      level: "section",
      appears_in_published_graph: publishedCount > 0 ? "true" : "false",
      published_company_count: publishedCount,
      accepted_standard_company_count: item.acceptedCompanies ? item.acceptedCompanies.size : 0,
      complete_emissions_company_count: item.complete || 0,
      available_emissions_company_count: item.available || 0,
      missing_emissions_company_count: Math.max(0, publishedCount - (item.complete || 0)),
    };
  });

  const displayRows = displayStandards.map((item) => ({
    display_system: item[0],
    display_standard_name_zh: item[1],
    display_standard_name_en: item[2],
    internal_standard_id: item[3],
    source_standard_family: item[4],
    is_requested_display_node: item[5],
    is_confirmed: item[6],
    needs_confirmation: item[7],
    note: item[8],
  }));

  const explicitRows = readJson("world500_primary_secondary_explicit_primary_ratio.json").rows;
  const inferenceRows = readJson("world500_primary_secondary_source_mix_inference_review.json").rows;
  const sourceRows = parseCsv(fs.readFileSync(path.join(wb, "world500_primary_secondary_source_mix_audit.csv"), "utf8"));
  const auditByCompany = new Map(sourceRows.map((row) => [row.company_id, row]));
  const evidenceRows = [];
  for (const row of [...explicitRows, ...sourceRows]) {
    const auditRow = auditByCompany.get(row.company_id) || {};
    const snippets = splitList(row.sample_snippets_en || row.sample_snippet_en || row.reported_primary_basis_en);
    const pages = splitList(row.sample_pages || auditRow.sample_pages || "");
    const files = splitList(row.sample_source_files || auditRow.sample_source_files || "");
    const samples = snippets.length ? snippets : [row.reported_primary_basis_en || ""];
    samples.forEach((snippet, index) => {
      const layer = evidenceLayer(row, snippet);
      evidenceRows.push({
        company_id: row.company_id,
        company_name: row.company_name_en,
        world500_rank: row.world500_rank,
        industry_section_code: row.industry_section_code,
        industry_section_name_zh: sectionName(row.industry_section_code, "zh"),
        industry_section_name_en: sectionName(row.industry_section_code, "en"),
        source_type_primary_or_secondary: sourceType(layer),
        evidence_layer: layer,
        reported_ratio: row.reported_primary_percent || "",
        source_file: files[index] || row.source_file || "",
        page: pages[index] || "",
        snippet,
        matched_keyword: layer.replace(/_/g, " "),
        calculation_method_context: row.ratio_basis_en || row.quality_note_en || "",
        is_explicit_reported_ratio: layer === "explicit_reported_primary_data_percentage" ? "true" : "false",
        is_supplier_specific_data: layer === "supplier_specific_data" ? "true" : "false",
        is_spend_based: layer === "spend_based_data" ? "true" : "false",
        is_average_data: layer === "average_data" ? "true" : "false",
        is_source_mix_inference: layer === "method_row_source_mix_inference" ? "true" : "false",
        confidence: row.sample_confidence || "",
        review_status: row.sample_review_status || row.sample_review_statuses || "",
      });
    });
  }

  const summaryRows = [...explicitRows, ...inferenceRows].map((row) => {
    const explicit = row.ratio_basis_key === "explicit_reported_primary_percentage";
    const primary = explicit ? num(row.reported_primary_percent) / 100 : row.primary_ratio_known;
    const secondary = explicit && row.reported_primary_percent !== "" ? 1 - num(row.reported_primary_percent) / 100 : row.secondary_ratio_known;
    return {
      company_id: row.company_id,
      company_name: row.company_name_en,
      world500_rank: row.world500_rank,
      industry_section_code: row.industry_section_code,
      industry_section_name_zh: sectionName(row.industry_section_code, "zh"),
      industry_section_name_en: sectionName(row.industry_section_code, "en"),
      primary_ratio_for_bubble: primary ?? "",
      secondary_ratio_for_bubble: secondary ?? "",
      unknown_ratio_for_bubble: row.unknown_ratio ?? "",
      bubble_evidence_type: explicit ? "explicit_reported_primary_data_percentage" : "method_row_source_mix_inference",
      fact_count: row.method_evidence_count || 0,
      explicit_ratio_evidence_count: explicit ? 1 : 0,
      inference_evidence_count: explicit ? 0 : row.method_evidence_count || 0,
      included_in_bubble: primary === null || primary === undefined || primary === "" ? "false" : "true",
      bubble_size_metric: row.method_evidence_count || 0,
      bubble_color_bucket: row.industry_section_code || "",
    };
  });

  const industryRanking = complete.flatMap((row) => [{ ...row }])
    .sort((a, b) => String(a.industry_section_code).localeCompare(String(b.industry_section_code)) || num(b.total_mtco2e) - num(a.total_mtco2e));
  const rankByIndustry = {};
  const rankingRows = industryRanking.map((row) => {
    rankByIndustry[row.industry_section_code] = (rankByIndustry[row.industry_section_code] || 0) + 1;
    return {
      industry_section_code: row.industry_section_code,
      industry_section_name_zh: sectionName(row.industry_section_code, "zh"),
      industry_section_name_en: sectionName(row.industry_section_code, "en"),
      gb_standard: "GB/T 4754-2017",
      rank_within_industry_section: rankByIndustry[row.industry_section_code],
      company_id: row.company_id,
      company_name: row.company_name_en,
      world500_rank: row.world500_rank,
      scope1: row.scope1_mtco2e,
      scope2_selected: row.scope2_mtco2e,
      scope3: row.scope3_mtco2e,
      total_emissions: row.total_mtco2e,
      year: row.inventory_years,
      unit: "MtCO2e",
      source_file: row.selected_source_files,
      page: row.selected_evidence_pages,
      evidence_status: "complete_comparable_scope123_strong_evidence",
    };
  });

  const missingRows = published.filter((company) => !completeIds.has(company.company_id)).map((company) => {
    const partial = availableMap.get(company.company_id);
    const missingScopes = new Set(partial?.missing_scopes || ["Scope 1", "Scope 2", "Scope 3"]);
    return {
      company_id: company.company_id,
      company_name: company.company_name_en,
      world500_rank: company.world500_rank,
      industry_section_code: company.industry_section_code,
      industry_section_name_zh: sectionName(company.industry_section_code, "zh"),
      industry_section_name_en: sectionName(company.industry_section_code, "en"),
      missing_reason: partial ? "partial_strong_evidence_total_excluded_from_complete_scope123_ranking" : "no_complete_scope123_total_in_current_published_graph",
      missing_scope1: missingScopes.has("Scope 1") ? "true" : "false",
      missing_scope2: missingScopes.has("Scope 2") ? "true" : "false",
      missing_scope3: missingScopes.has("Scope 3") ? "true" : "false",
      missing_year: partial?.inventory_years?.length ? "false" : "true",
      missing_unit: partial?.total_mtco2e ? "false" : "true",
      missing_boundary: partial?.scope3_boundary_class_en ? "false" : "true",
      next_action: partial ? "补齐缺失 Scope 或 Scope 2 方法后再入完整主榜" : "回到企业报告核证页或排放表逐项核验 Scope 1、selected Scope 2、Scope 3、年份、单位和边界",
    };
  });

  const coverageRows = registryRows.map((section) => {
    const sectionMissing = missingRows.filter((row) => row.industry_section_code === section.industry_section_code);
    const partialCount = available.filter((row) => row.industry_section_code === section.industry_section_code && row.completeness_key !== "complete_scope123_strong_evidence_total").length;
    return {
      industry_section_code: section.industry_section_code,
      industry_section_name_zh: section.industry_section_name_zh,
      industry_section_name_en: section.industry_section_name_en,
      published_company_count: section.published_company_count,
      complete_comparable_count: section.complete_emissions_company_count,
      available_emissions_count: section.available_emissions_company_count,
      partial_emissions_count: partialCount,
      missing_total_emissions_count: sectionMissing.length,
      missing_scope1_count: sectionMissing.filter((row) => row.missing_scope1 === "true").length,
      missing_scope2_count: sectionMissing.filter((row) => row.missing_scope2 === "true").length,
      missing_scope3_count: sectionMissing.filter((row) => row.missing_scope3 === "true").length,
      missing_unit_or_year_count: sectionMissing.filter((row) => row.missing_unit === "true" || row.missing_year === "true").length,
      complete_coverage_rate: section.published_company_count ? +(section.complete_emissions_company_count / section.published_company_count).toFixed(4) : 0,
    };
  });

  writeRows("national_industry_section_registry", registryRows);
  writeRows("standard_industry_sankey_registry", displayRows);
  writeRows("world500_standard_industry_section_sankey_links", sankeyRows, { flow_definition: "accepted company-standard association count only" });
  writeRows("world500_primary_secondary_evidence_chain_export", evidenceRows);
  writeRows("world500_primary_secondary_bubble_company_summary", summaryRows);
  writeRows("world500_emissions_industry_section_ranking", rankingRows);
  writeRows("world500_emissions_industry_section_coverage_summary", coverageRows, { denominator_company_count: 351 });
  writeRows("world500_emissions_missing_company_list", missingRows, { denominator_company_count: 351 });
  console.log("Industry-section reporting outputs built.");
}

build();
