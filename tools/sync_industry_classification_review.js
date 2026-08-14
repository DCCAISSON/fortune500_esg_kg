const fs = require("fs");
const path = require("path");

const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const workbench = path.join(siteRoot, "assets/data/world500/workbench");
const reviewPayload = JSON.parse(fs.readFileSync(path.join(workbench, "world500_company_industry_excel_review.json"), "utf8"));
const reviewRows = reviewPayload.rows || [];

const sections = new Map([
  ["A", ["农、林、牧、渔业", "Agriculture, Forestry, Animal Husbandry and Fishery"]],
  ["B", ["采矿业", "Mining"]],
  ["C", ["制造业", "Manufacturing"]],
  ["D", ["电力、热力、燃气及水生产和供应业", "Electricity, Heat, Gas and Water Production and Supply"]],
  ["E", ["建筑业", "Construction"]],
  ["F", ["批发和零售业", "Wholesale and Retail Trade"]],
  ["G", ["交通运输、仓储和邮政业", "Transport, Storage and Post"]],
  ["H", ["住宿和餐饮业", "Accommodation and Catering"]],
  ["I", ["信息传输、软件和信息技术服务业", "Information Transmission, Software and Information Technology Services"]],
  ["J", ["金融业", "Finance"]],
  ["K", ["房地产业", "Real Estate"]],
  ["L", ["租赁和商务服务业", "Leasing and Business Services"]],
  ["M", ["科学研究和技术服务业", "Scientific Research and Technical Services"]],
  ["N", ["水利、环境和公共设施管理业", "Water, Environment and Public Facilities Management"]],
  ["O", ["居民服务、修理和其他服务业", "Resident Services, Repairs and Other Services"]],
  ["P", ["教育", "Education"]],
  ["Q", ["卫生和社会工作", "Health and Social Work"]],
  ["R", ["文化、体育和娱乐业", "Culture, Sports and Entertainment"]],
  ["S", ["公共管理、社会保障和社会组织", "Public Administration, Social Security and Social Organizations"]],
  ["T", ["国际组织", "International Organizations"]],
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) rows.push([...row, cell]);
  const header = (rows.shift() || []).map((item) => item.replace(/^\uFEFF/, ""));
  return rows.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] || ""])));
}

function writeCsv(file, rows) {
  const keys = Object.keys(rows[0] || {});
  const body = [keys.join(","), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\n");
  fs.writeFileSync(file, `\uFEFF${body}\n`, "utf8");
}

function industryFields(review) {
  const names = sections.get(review.revised_code);
  if (!names) throw new Error(`Unknown GB/T 4754 code: ${review.revised_code}`);
  return {
    industry_section_code: review.revised_code,
    industry_section_zh: names[0],
    industry_section_en: names[1],
    gbt4754_section_code: review.revised_code,
    gbt4754_section_name_zh: names[0],
    gbt4754_section_name_en: names[1],
  };
}

const reviewByRank = new Map(reviewRows.map((row) => [Number(row.world500_rank), row]));
const workbenchFile = path.join(workbench, "company_workbench.json");
const workbenchPayload = readJson(workbenchFile);
const companiesByRank = new Map(workbenchPayload.companies.map((company) => [Number(company.world500_rank), company]));
const updatedCompanyIds = new Set();

for (const review of reviewRows) {
  const company = companiesByRank.get(Number(review.world500_rank));
  if (!company) throw new Error(`Missing published company for World500 rank ${review.world500_rank}`);
  const currentCode = String(company.industry_section_code || "");
  const allowedCodes = new Set([String(review.original_code || ""), String(review.revised_code || "")]);
  if (!allowedCodes.has(currentCode)) {
    throw new Error(
      `Unexpected current code for rank ${review.world500_rank}: ${currentCode} is neither ${review.original_code} nor ${review.revised_code}`,
    );
  }
  const fields = industryFields(review);
  Object.assign(company, fields, {
    industry_mapping_basis_en: `Revised from ${reviewPayload.source_workbook}, Sheet1 row ${review.workbook_row}; GB/T 4754-2017 review.`,
    industry_mapping_basis_zh: `依据《500强企业行业分类核验.xlsx》Sheet1第${review.workbook_row}行及 GB/T 4754-2017 核验结果修订。`,
    industry_review_source: reviewPayload.source_workbook,
    industry_review_source_sheet: reviewPayload.source_sheet,
    industry_review_source_row: review.workbook_row,
    industry_review_verdict: review.review_verdict,
    industry_review_note: review.note,
    industry_review_source_urls: review.source_urls,
  });
  updatedCompanyIds.add(company.company_id);
}
writeJson(workbenchFile, workbenchPayload);

for (const companyId of updatedCompanyIds) {
  const file = path.join(workbench, "companies", `${companyId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Missing company detail: ${companyId}`);
  const detail = readJson(file);
  const review = reviewByRank.get(Number(detail.world500_rank));
  Object.assign(detail, industryFields(review), {
    industry_mapping_basis_en: `Revised from ${reviewPayload.source_workbook}, Sheet1 row ${review.workbook_row}; GB/T 4754-2017 review.`,
    industry_mapping_basis_zh: `依据《500强企业行业分类核验.xlsx》Sheet1第${review.workbook_row}行及 GB/T 4754-2017 核验结果修订。`,
    industry_review_source: reviewPayload.source_workbook,
    industry_review_source_sheet: reviewPayload.source_sheet,
    industry_review_source_row: review.workbook_row,
    industry_review_verdict: review.review_verdict,
    industry_review_note: review.note,
    industry_review_source_urls: review.source_urls,
  });
  writeJson(file, detail);
}

const curatedDir = path.join(repoRoot, "data/curated");
for (const file of fs.readdirSync(curatedDir).filter((name) => /^world500_batch_\d+_company_industry_classification\.csv$/.test(name))) {
  const fullPath = path.join(curatedDir, file);
  const rows = parseCsv(fs.readFileSync(fullPath, "utf8"));
  let changed = false;
  for (const row of rows) {
    const review = reviewByRank.get(Number(row.world500_rank));
    if (!review || !updatedCompanyIds.has(row.company_id)) continue;
    Object.assign(row, industryFields(review), {
      mapping_basis_en: `Revised from ${reviewPayload.source_workbook}, Sheet1 row ${review.workbook_row}; GB/T 4754-2017 review.`,
      mapping_basis_zh: `依据《500强企业行业分类核验.xlsx》Sheet1第${review.workbook_row}行及 GB/T 4754-2017 核验结果修订。`,
      review_status: "excel_reviewed",
      confidence_level: String(review.review_verdict || "").includes("需复核") ? "medium" : "high",
    });
    changed = true;
  }
  if (changed) writeCsv(fullPath, rows);
}

const reportingFile = path.join(workbench, "reporting_views.json");
const reporting = readJson(reportingFile);
function updateNestedIndustry(value) {
  if (Array.isArray(value)) {
    value.forEach(updateNestedIndustry);
    return;
  }
  if (!value || typeof value !== "object") return;
  const review = reviewByRank.get(Number(value.world500_rank));
  if (review && value.company_id && updatedCompanyIds.has(value.company_id)) {
    const fields = industryFields(review);
    if (Object.prototype.hasOwnProperty.call(value, "industry_section_code")) value.industry_section_code = fields.industry_section_code;
    if (Object.prototype.hasOwnProperty.call(value, "industry_section_zh")) value.industry_section_zh = fields.industry_section_zh;
    if (Object.prototype.hasOwnProperty.call(value, "industry_section_en")) value.industry_section_en = fields.industry_section_en;
    if (Object.prototype.hasOwnProperty.call(value, "gbt4754_section_code")) value.gbt4754_section_code = fields.gbt4754_section_code;
    if (Object.prototype.hasOwnProperty.call(value, "gbt4754_section_name_zh")) value.gbt4754_section_name_zh = fields.gbt4754_section_name_zh;
    if (Object.prototype.hasOwnProperty.call(value, "gbt4754_section_name_en")) value.gbt4754_section_name_en = fields.gbt4754_section_name_en;
  }
  Object.values(value).forEach(updateNestedIndustry);
}
updateNestedIndustry(reporting);
writeJson(reportingFile, reporting);

console.log(`Applied ${updatedCompanyIds.size} Excel industry revisions to workbench, company details, curated tables, and reporting views.`);
