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

const normalizedSections = [
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

const normalizedDisplayStandards = [
  ["GHG Protocol", "GHG Protocol 企业核算与报告标准", "GHG Protocol Corporate Accounting and Reporting Standard", "ghg_corporate_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol 企业价值链（Scope 3）核算与报告标准", "GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard", "ghg_scope3_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "金融行业全球温室气体核算与报告标准", "Global GHG Accounting and Reporting Standard for the Financial Industry", "ghg_financial_industry_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol Scope 2 指南", "GHG Protocol Scope 2 Guidance", "ghg_scope2_guidance", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol 项目核算协议", "GHG Protocol Project Protocol", "ghg_project_protocol", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol 产品生命周期核算与报告标准", "GHG Protocol Product Life Cycle Accounting and Reporting Standard", "ghg_product_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol Scope 3 计算指南", "GHG Protocol Scope 3 Calculation Guidance", "ghg_scope3_calculation_guidance", "GHG Protocol", "true", "false", "true", "需求方文档称 GHGP 7 类，但正文只列明 6 个名称；第 7 项暂按现有标准注册表映射为 Scope 3 Calculation Guidance，后续可按需求方确认调整。"],
  ["ISO", "ISO 14064", "ISO 14064", "iso_14064", "ISO system", "true", "true", "false", ""],
  ["ISO", "ISO 14067", "ISO 14067", "iso_14067", "ISO system", "true", "true", "false", ""],
  ["ISO", "ISO 14040/14044", "ISO 14040/14044", "iso_14040_14044", "ISO system", "true", "true", "false", "需求方指定展示节点；当前无 accepted 企业-标准边时保留为 0-flow / 待补证据，不用其他 ISO 标准替代。"],
  ["GB/T", "GB/T 24067-2024", "GB/T 24067-2024", "gb_t_24067_2024", "Chinese national standard system", "true", "true", "false", ""],
  ["GB/T", "GB/T 32150-2015", "GB/T 32150-2015", "gb_t_32150_2015", "Chinese national standard system", "true", "true", "false", "需求方指定展示节点；当前无 accepted 企业-标准边时保留为 0-flow / 待补证据，不用其他 GB/T 标准替代。"],
];

const canonicalSections = [
  ["A", "\u519c\u3001\u6797\u3001\u7267\u3001\u6e14\u4e1a", "Agriculture, Forestry, Animal Husbandry and Fishery"],
  ["B", "\u91c7\u77ff\u4e1a", "Mining"],
  ["C", "\u5236\u9020\u4e1a", "Manufacturing"],
  ["D", "\u7535\u529b\u3001\u70ed\u529b\u3001\u71c3\u6c14\u53ca\u6c34\u751f\u4ea7\u548c\u4f9b\u5e94\u4e1a", "Electricity, Heat, Gas and Water Production and Supply"],
  ["E", "\u5efa\u7b51\u4e1a", "Construction"],
  ["F", "\u6279\u53d1\u548c\u96f6\u552e\u4e1a", "Wholesale and Retail Trade"],
  ["G", "\u4ea4\u901a\u8fd0\u8f93\u3001\u4ed3\u50a8\u548c\u90ae\u653f\u4e1a", "Transport, Storage and Post"],
  ["H", "\u4f4f\u5bbf\u548c\u9910\u996e\u4e1a", "Accommodation and Catering"],
  ["I", "\u4fe1\u606f\u4f20\u8f93\u3001\u8f6f\u4ef6\u548c\u4fe1\u606f\u6280\u672f\u670d\u52a1\u4e1a", "Information Transmission, Software and Information Technology Services"],
  ["J", "\u91d1\u878d\u4e1a", "Finance"],
  ["K", "\u623f\u5730\u4ea7\u4e1a", "Real Estate"],
  ["L", "\u79df\u8d41\u548c\u5546\u52a1\u670d\u52a1\u4e1a", "Leasing and Business Services"],
  ["M", "\u79d1\u5b66\u7814\u7a76\u548c\u6280\u672f\u670d\u52a1\u4e1a", "Scientific Research and Technical Services"],
  ["N", "\u6c34\u5229\u3001\u73af\u5883\u548c\u516c\u5171\u8bbe\u65bd\u7ba1\u7406\u4e1a", "Water, Environment and Public Facilities Management"],
  ["O", "\u5c45\u6c11\u670d\u52a1\u3001\u4fee\u7406\u548c\u5176\u4ed6\u670d\u52a1\u4e1a", "Resident Services, Repairs and Other Services"],
  ["P", "\u6559\u80b2", "Education"],
  ["Q", "\u536b\u751f\u548c\u793e\u4f1a\u5de5\u4f5c", "Health and Social Work"],
  ["R", "\u6587\u5316\u3001\u4f53\u80b2\u548c\u5a31\u4e50\u4e1a", "Culture, Sports and Entertainment"],
  ["S", "\u516c\u5171\u7ba1\u7406\u3001\u793e\u4f1a\u4fdd\u969c\u548c\u793e\u4f1a\u7ec4\u7ec7", "Public Administration, Social Security and Social Organizations"],
  ["T", "\u56fd\u9645\u7ec4\u7ec7", "International Organizations"],
];

const canonicalDisplayStandards = [
  ["GHG Protocol", "GHG Protocol \u4f01\u4e1a\u6838\u7b97\u4e0e\u62a5\u544a\u6807\u51c6", "GHG Protocol Corporate Accounting and Reporting Standard", "ghg_corporate_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol \u4f01\u4e1a\u4ef7\u503c\u94fe\uff08Scope 3\uff09\u6838\u7b97\u4e0e\u62a5\u544a\u6807\u51c6", "GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard", "ghg_scope3_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "\u91d1\u878d\u884c\u4e1a\u5168\u7403\u6e29\u5ba4\u6c14\u4f53\u6838\u7b97\u4e0e\u62a5\u544a\u6807\u51c6", "Global GHG Accounting and Reporting Standard for the Financial Industry", "ghg_financial_industry_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol Scope 2 \u6307\u5357", "GHG Protocol Scope 2 Guidance", "ghg_scope2_guidance", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol \u9879\u76ee\u51cf\u6392\u6838\u7b97\u534f\u8bae", "GHG Protocol Project Protocol", "ghg_project_protocol", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol \u4ea7\u54c1\u751f\u547d\u5468\u671f\u6838\u7b97\u4e0e\u62a5\u544a\u6807\u51c6", "GHG Protocol Product Life Cycle Accounting and Reporting Standard", "ghg_product_standard", "GHG Protocol", "true", "true", "false", ""],
  ["GHG Protocol", "GHG Protocol Scope 3 \u8ba1\u7b97\u6307\u5357", "GHG Protocol Scope 3 Calculation Guidance", "ghg_scope3_calculation_guidance", "GHG Protocol", "true", "false", "true", "Requested GHGP seventh display node; mapped to Scope 3 Calculation Guidance pending client confirmation."],
  ["ISO", "ISO 14064", "ISO 14064", "iso_14064", "ISO system", "true", "true", "false", ""],
  ["ISO", "ISO 14067", "ISO 14067", "iso_14067", "ISO system", "true", "true", "false", ""],
  ["ISO", "ISO 14040/14044", "ISO 14040/14044", "iso_14040_14044", "ISO system", "true", "true", "false", "Requested display node; retained as zero-flow when no accepted company-standard edge exists."],
  ["GB/T", "GB/T 24067-2024", "GB/T 24067-2024", "gb_t_24067_2024", "Chinese national standard system", "true", "true", "false", ""],
  ["GB/T", "GB/T 32150-2015", "GB/T 32150-2015", "gb_t_32150_2015", "Chinese national standard system", "true", "true", "false", "Requested display node; accepted flow requires explicit page-level standard evidence."],
];

const sectionByCode = new Map(canonicalSections.map((item) => [item[0], item]));
const utilityIndustryOverrides = new Map([
  ["r049_electricitédefrance", "D"],
  ["r078_chinasouthernpowergrid", "D"],
  ["r097_enel", "D"],
  ["r201_koreaelectricpower", "D"],
  ["r317_tokyoelectricpower", "D"],
  ["r336_chinahuadian", "D"],
  ["r456_koreagas", "D"],
  ["r485_centrica", "D"],
]);
const softwareIndustryReview = new Map([
  ["r299_oracle", "I"],
  ["r445_salesforce", "I"],
  ["r450_sap公司", "I"],
]);
const industryOutputOverrides = new Map([...utilityIndustryOverrides, ...softwareIndustryReview]);
const oilGasIndustryReviewIds = new Set([
  "r005_sinopecgroup",
  "r006_chinanationalpetroleum",
  "r012_exxonmobil",
  "r013_shell",
  "r023_totalenergies",
  "r025_bp",
  "r029_chevron",
  "r098_eni",
  "r099_petrobras",
  "r247_repsol",
]);
let excelIndustryReviewByRank = new Map();

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(wb, name), "utf8"));
}

function loadCompanyDetails() {
  const dir = path.join(wb, "companies");
  const details = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const item = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (item.company_id) details.set(item.company_id, item);
  }
  return details;
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
  fs.writeFileSync(path.join(wb, `${name}.csv`), `\uFEFF${csv}`, "utf8");
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
  const item = sectionByCode.get(code);
  return item ? item[lang === "zh" ? 1 : 2] : "";
}

function companyIndustry(company, rowCode = "") {
  const companyId = company.company_id || "";
  const excelReview = excelIndustryReviewByRank.get(Number(company.world500_rank));
  const overrideCode = industryOutputOverrides.get(companyId) || "";
  const code = excelReview?.revised_code || overrideCode || rowCode || company.industry_section_code || "";
  const status = excelReview
    ? "corrected_by_excel_industry_review"
    : overrideCode
    ? (utilityIndustryOverrides.has(companyId) ? "corrected_by_gbt4754_code_name_rule" : "corrected_by_gbt4754_business_activity_rule")
    : "consistent_with_company_workbench";
  return {
    code,
    nameZh: sectionName(code, "zh"),
    nameEn: sectionName(code, "en"),
    currentCode: company.industry_section_code || "",
    currentNameZh: company.industry_section_zh || "",
    currentNameEn: company.industry_section_en || "",
    status,
    excelReview: excelReview || null,
  };
}

function firstEvidence(values) {
  return Array.isArray(values) && values.length ? values[0] : "";
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
  const companyDetails = loadCompanyDetails();
  const excelIndustryReviewPayload = readJson("world500_company_industry_excel_review.json");
  const excelIndustryReviewRows = excelIndustryReviewPayload.rows || [];
  excelIndustryReviewByRank = new Map(excelIndustryReviewRows.map((row) => [Number(row.world500_rank), row]));
  const published = companies.filter((item) => item.is_published_company);
  const complete = readJson("world500_emissions_complete_comparable_ranking.json").rows;
  const completeIds = new Set(complete.map((item) => item.company_id));
  const available = views.emissions_ranking.available || [];
  const availableMap = new Map(available.map((item) => [item.company_id, item]));
  const displayMap = new Map(canonicalDisplayStandards.map((item) => [item[3], item]));
  const acceptedRows = (views.accepted_standard_role_graph.links || []).filter((row) => displayMap.has(row.standard_id));

  const sankeyGroups = new Map();
  for (const row of acceptedRows) {
    const display = displayMap.get(row.standard_id);
    const company = companyMap.get(row.company_id) || {};
    const industry = companyIndustry(company, row.industry_section_code);
    if (!industry.code) continue;
    const key = `${row.standard_id}::${industry.code}`;
    const group = sankeyGroups.get(key) || { display, code: industry.code, links: 0, companies: new Map() };
    group.links += 1;
    group.companies.set(row.company_id, row.company_name_en || companyMap.get(row.company_id)?.company_name_en || row.company_id);
    sankeyGroups.set(key, group);
  }

  const sankeyRows = [...sankeyGroups.values()].map((group) => {
    const companyPairs = [...group.companies.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return {
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
      company_ids: companyPairs.map(([companyId]) => companyId),
      company_names: companyPairs.map(([, companyName]) => companyName),
    };
  }).sort((a, b) => `${a.standard_system}${a.internal_standard_id}${a.industry_section_code}`.localeCompare(`${b.standard_system}${b.internal_standard_id}${b.industry_section_code}`));

  const sankeyEvidenceRows = [];
  for (const row of acceptedRows) {
    const display = displayMap.get(row.standard_id);
    const company = companyMap.get(row.company_id) || {};
    const industry = companyIndustry(company, row.industry_section_code);
    const code = industry.code;
    if (!display || !code) continue;
    const samples = Array.isArray(row.evidence_samples) && row.evidence_samples.length ? row.evidence_samples : [{}];
    samples.forEach((sample, index) => {
      sankeyEvidenceRows.push({
        sankey_flow_key: `${row.standard_id}::${code}`,
        company_id: row.company_id,
        company_name_en: company.company_name_en || row.company_id,
        company_name_zh: company.company_name_zh || "",
        world500_rank: company.world500_rank || "",
        industry_section_code: code,
        industry_section_name_zh: industry.nameZh,
        industry_section_name_en: industry.nameEn,
        company_workbench_industry_section_code: industry.currentCode,
        company_workbench_industry_section_name_zh: industry.currentNameZh,
        company_workbench_industry_section_name_en: industry.currentNameEn,
        industry_consistency_status: industry.status,
        standard_system: display[0],
        internal_standard_id: display[3],
        display_standard_name_zh: display[1],
        display_standard_name_en: display[2],
        decision_bucket: row.decision_bucket || "accepted",
        evidence_gate: row.evidence_gate || "",
        evidence_mode: row.evidence_mode || "",
        match_status: row.match_status || "",
        evidence_page: sample.page || (row.pages || [])[index] || "",
        source_file: sample.source_file || sample.report || (row.source_files || [])[index] || "",
        snippet_en: sample.snippet_en || "",
        snippet_zh: sample.snippet_zh || "",
        confidence: sample.confidence || "",
        review_status: sample.review_status || "",
        matched_aliases: row.matched_aliases || [],
      });
    });
  }

  const standardNameToId = new Map();
  for (const display of canonicalDisplayStandards) {
    standardNameToId.set(display[1], display[3]);
    standardNameToId.set(display[2], display[3]);
  }
  const standardIndustryEvidenceRows = [];
  for (const row of (views.standard_role_graph.links || []).filter((item) => displayMap.has(item.standard_id))) {
    const display = displayMap.get(row.standard_id);
    const company = companyMap.get(row.company_id) || {};
    const industry = companyIndustry(company, row.industry_section_code);
    const samples = Array.isArray(row.evidence_samples) && row.evidence_samples.length ? row.evidence_samples : [{}];
    samples.forEach((sample, index) => {
      standardIndustryEvidenceRows.push({
        standard_system: display[0],
        standard_id: display[3],
        standard_name_zh: display[1],
        standard_name_en: display[2],
        company_id: row.company_id,
        company_name_zh: company.company_name_zh || "",
        company_name_en: company.company_name_en || row.company_id,
        world500_rank: company.world500_rank || "",
        industry_section_code: industry.code,
        industry_section_name_zh: industry.nameZh,
        industry_section_name_en: industry.nameEn,
        current_company_workbench_code: industry.currentCode,
        current_company_workbench_name_zh: industry.currentNameZh,
        industry_consistency_status: industry.status,
        decision_bucket: row.decision_bucket || "",
        evidence_status: row.decision_bucket === "accepted" ? "verified" : "review",
        evidence_page: sample.page || firstEvidence(row.pages) || "",
        source_file: sample.source_file || sample.report || firstEvidence(row.source_files) || "",
        snippet: sample.snippet_zh || sample.snippet_en || "",
        enters_sankey: row.decision_bucket === "accepted" ? "true" : "false",
        review_note: row.evidence_gate || row.match_status || "",
      });
    });
  }
  const relevanceRows = parseCsv(fs.readFileSync(path.join(wb, "world500_standard_evidence_relevance_audit.csv"), "utf8"));
  for (const row of relevanceRows) {
    const standardId = standardNameToId.get(row.standard_name_en) || standardNameToId.get(row.standard_name_zh);
    if (!standardId || row.evidence_status === "verified") continue;
    const display = displayMap.get(standardId);
    const company = companyMap.get(row.company_id) || {};
    const industry = companyIndustry(company);
    standardIndustryEvidenceRows.push({
      standard_system: display[0],
      standard_id: display[3],
      standard_name_zh: display[1],
      standard_name_en: display[2],
      company_id: row.company_id,
      company_name_zh: company.company_name_zh || row.company_name_zh || "",
      company_name_en: company.company_name_en || row.company_name_en || row.company_id,
      world500_rank: company.world500_rank || row.world500_rank || "",
      industry_section_code: industry.code,
      industry_section_name_zh: industry.nameZh,
      industry_section_name_en: industry.nameEn,
      current_company_workbench_code: industry.currentCode,
      current_company_workbench_name_zh: industry.currentNameZh,
      industry_consistency_status: industry.status,
      decision_bucket: row.evidence_status || "weak",
      evidence_status: row.evidence_status || "",
      evidence_page: row.evidence_page || "",
      source_file: row.source_file || "",
      snippet: row.snippet_preview || "",
      enters_sankey: "false",
      review_note: row.review_reason || row.hit_source || "",
    });
  }

  const boundaryRows = canonicalDisplayStandards.map((display) => {
    const rows = standardIndustryEvidenceRows.filter((row) => row.standard_id === display[3]);
    const companiesBy = (predicate) => new Set(rows.filter(predicate).map((row) => row.company_id).filter(Boolean)).size;
    return {
      standard_system: display[0],
      standard_id: display[3],
      standard_name_zh: display[1],
      standard_name_en: display[2],
      accepted_company_count: companiesBy((row) => row.decision_bucket === "accepted"),
      review_company_count: companiesBy((row) => row.decision_bucket === "review"),
      weak_company_count: companiesBy((row) => row.evidence_status === "weak"),
      demoted_company_count: companiesBy((row) => row.decision_bucket === "demoted"),
      traceable_context_company_count: companiesBy((row) => String(row.review_note).includes("context")),
      enters_main_sankey: companiesBy((row) => row.decision_bucket === "accepted") ? "accepted_only" : "zero_accepted_retained_as_requested_node",
    };
  });

  const companyAcceptedCounts = new Map();
  for (const row of acceptedRows) {
    companyAcceptedCounts.set(row.company_id, (companyAcceptedCounts.get(row.company_id) || 0) + 1);
  }
  const companyReviewRows = [];
  const addedCompanyReviewIds = new Set();
  function addCompanyReview(companyId, suggestedCode, riskLevel, reason, appliedToOutputs) {
    const company = companyMap.get(companyId);
    if (!company || addedCompanyReviewIds.has(companyId)) return;
    const detail = companyDetails.get(companyId) || {};
    const suggested = sectionByCode.get(suggestedCode) || ["", "", ""];
    const outputIndustry = companyIndustry(company);
    const excelReview = outputIndustry.excelReview;
    const rawIndustryZh = detail.industry_label_zh || company.industry_label_zh || company.fortune_industry_label_zh || "";
    const rawIndustryEn = detail.industry_label_en || company.industry_label_en || company.fortune_industry_label_en || company.industry_label || "";
    companyReviewRows.push({
      company_id: company.company_id,
      company_name_zh: company.company_name_zh || "",
      company_name_en: company.company_name_en || "",
      world500_rank: company.world500_rank || "",
      country_zh: detail.country_zh || company.country_zh || "",
      country_en: detail.country_en || company.country_en || "",
      fortune_industry_label: rawIndustryZh || rawIndustryEn || "",
      fortune_industry_label_zh: rawIndustryZh,
      fortune_industry_label_en: rawIndustryEn,
      raw_registry_code: company.industry_section_code || "",
      raw_registry_name_zh: company.industry_section_zh || "",
      raw_registry_name_en: company.industry_section_en || "",
      current_gbt4754_code: company.industry_section_code || "",
      current_gbt4754_name_zh: company.industry_section_zh || "",
      current_gbt4754_name_en: company.industry_section_en || "",
      current_output_code: outputIndustry.code,
      current_output_name_zh: outputIndustry.nameZh,
      current_output_name_en: outputIndustry.nameEn,
      suggested_code: suggestedCode,
      suggested_name_zh: suggested[1],
      suggested_name_en: suggested[2],
      risk_level: riskLevel,
      reason,
      industry_review_source_workbook: excelReview ? excelIndustryReviewPayload.source_workbook || "" : "",
      industry_review_source_sheet: excelReview ? excelIndustryReviewPayload.source_sheet || "" : "",
      industry_review_source_row: excelReview?.workbook_row || "",
      industry_review_verdict: excelReview?.review_verdict || "",
      industry_review_note: excelReview?.note || "",
      industry_review_source_urls: excelReview?.source_urls || [],
      affects_sankey: companyAcceptedCounts.get(companyId) ? "true" : "false",
      accepted_standard_count: companyAcceptedCounts.get(companyId) || 0,
      applied_to_current_industry_outputs: appliedToOutputs ? "true" : "false",
    });
    addedCompanyReviewIds.add(companyId);
  }
  for (const row of excelIndustryReviewRows) {
    const company = published.find((item) => Number(item.world500_rank) === Number(row.world500_rank));
    if (!company) continue;
    const riskLevel = String(row.review_verdict || "").includes("需复核") ? "medium" : "high";
    addCompanyReview(company.company_id, row.revised_code, riskLevel, row.note, true);
  }
  for (const [companyId, suggestedCode] of utilityIndustryOverrides) {
    addCompanyReview(companyId, suggestedCode, "high", "company_workbench code is I but Chinese industry name is the GB/T 4754 utility section; output corrected to D for current Sankey.", true);
  }
  for (const [companyId, suggestedCode] of softwareIndustryReview) {
    addCompanyReview(companyId, suggestedCode, "high", "software/cloud enterprise classified to GB/T 4754 section I for current Sankey outputs.", true);
  }
  for (const companyId of oilGasIndustryReviewIds) {
    addCompanyReview(companyId, "", "low", "strict GB/T 4754 sectioning is retained; no macro energy-sector override is applied.", true);
  }

  const bySection = new Map(canonicalSections.map((row) => [row[0], { code: row[0] }]));
  for (const company of published) {
    const code = companyIndustry(company).code;
    if (bySection.has(code)) bySection.get(code).published = (bySection.get(code).published || 0) + 1;
  }
  for (const row of acceptedRows) {
    const code = companyIndustry(companyMap.get(row.company_id) || {}, row.industry_section_code).code;
    if (bySection.has(code)) bySection.get(code).acceptedCompanies = (bySection.get(code).acceptedCompanies || new Set()).add(row.company_id);
  }
  for (const row of complete) {
    const code = companyIndustry(companyMap.get(row.company_id) || {}, row.industry_section_code).code;
    if (bySection.has(code)) bySection.get(code).complete = (bySection.get(code).complete || 0) + 1;
  }
  for (const row of available) {
    const code = companyIndustry(companyMap.get(row.company_id) || {}, row.industry_section_code).code;
    if (bySection.has(code)) bySection.get(code).available = (bySection.get(code).available || 0) + 1;
  }

  const registryRows = canonicalSections.map(([code, zh, en]) => {
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

  const displayRows = canonicalDisplayStandards.map((item) => ({
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
    const industry = companyIndustry(companyMap.get(row.company_id) || {}, row.industry_section_code);
    rankByIndustry[industry.code] = (rankByIndustry[industry.code] || 0) + 1;
    return {
      industry_section_code: industry.code,
      industry_section_name_zh: industry.nameZh,
      industry_section_name_en: industry.nameEn,
      gb_standard: "GB/T 4754-2017",
      rank_within_industry_section: rankByIndustry[industry.code],
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
    const industry = companyIndustry(company);
    return {
      company_id: company.company_id,
      company_name: company.company_name_en,
      world500_rank: company.world500_rank,
      industry_section_code: industry.code,
      industry_section_name_zh: industry.nameZh,
      industry_section_name_en: industry.nameEn,
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
  const rankingTotalsBySection = new Map();
  for (const row of rankingRows) {
    const item = rankingTotalsBySection.get(row.industry_section_code) || {
      companyCount: 0,
      scope1: 0,
      scope2: 0,
      scope3: 0,
      total: 0,
    };
    item.companyCount += 1;
    item.scope1 += num(row.scope1);
    item.scope2 += num(row.scope2_selected);
    item.scope3 += num(row.scope3);
    item.total += num(row.total_emissions);
    rankingTotalsBySection.set(row.industry_section_code, item);
  }
  const scopeSummaryRows = coverageRows.map((section) => {
    const totals = rankingTotalsBySection.get(section.industry_section_code) || {};
    return {
      industry_section_code: section.industry_section_code,
      industry_section_name_zh: section.industry_section_name_zh,
      industry_section_name_en: section.industry_section_name_en,
      published_company_count: section.published_company_count,
      complete_comparable_company_count: section.complete_comparable_count,
      available_emissions_company_count: section.available_emissions_count,
      missing_total_emissions_company_count: section.missing_total_emissions_count,
      complete_scope1_mtco2e: +(totals.scope1 || 0).toFixed(6),
      complete_scope2_selected_mtco2e: +(totals.scope2 || 0).toFixed(6),
      complete_scope3_mtco2e: +(totals.scope3 || 0).toFixed(6),
      complete_total_mtco2e: +(totals.total || 0).toFixed(6),
      source_boundary: "complete_scope123_strong_evidence_companies_only",
    };
  });

  writeRows("national_industry_section_registry", registryRows);
  writeRows("standard_industry_sankey_registry", displayRows);
  writeRows("world500_standard_industry_section_sankey_links", sankeyRows, { flow_definition: "accepted company-standard association count only" });
  writeRows("world500_standard_industry_section_sankey_evidence", sankeyEvidenceRows, {
    flow_definition: "one row per evidence sample behind accepted company-standard associations used by the Sankey",
    accepted_company_standard_link_count: acceptedRows.length,
  });
  writeRows("world500_standard_industry_evidence_review_pack", standardIndustryEvidenceRows, {
    flow_definition: "client review table for accepted/review/weak standard-industry-company evidence boundaries",
  });
  writeRows("world500_standard_evidence_boundary_summary", boundaryRows);
  writeRows("world500_company_industry_review_pack", companyReviewRows, {
    policy: "Current industry outputs use strict GB/T 4754 sections. The revised codes in docs/500强企业行业分类核验.xlsx are applied first; legacy utility/software corrections and oil/gas review rows are retained only where the workbook does not provide a revised code.",
    excel_review_row_count: excelIndustryReviewRows.length,
  });
  writeRows("world500_primary_secondary_evidence_chain_export", evidenceRows);
  writeRows("world500_primary_secondary_bubble_company_summary", summaryRows);
  writeRows("world500_emissions_industry_section_ranking", rankingRows);
  writeRows("world500_emissions_industry_section_coverage_summary", coverageRows, { denominator_company_count: 351 });
  writeRows("world500_emissions_industry_section_scope_summary", scopeSummaryRows, { denominator_company_count: 351 });
  writeRows("world500_emissions_missing_company_list", missingRows, { denominator_company_count: 351 });
  console.log("Industry-section reporting outputs built.");
}

build();
