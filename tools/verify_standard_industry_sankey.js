const fs = require("fs");
const path = require("path");

const root = process.cwd();
const wb = path.join(root, "assets/data/world500/workbench");
const failures = [];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(wb, name), "utf8"));
}

function fail(message) {
  failures.push(message);
}

const sections = readJson("national_industry_section_registry.json").rows || [];
const registry = readJson("standard_industry_sankey_registry.json").rows || [];
const linksPayload = readJson("world500_standard_industry_section_sankey_links.json");
const links = linksPayload.rows || [];
const sectionCodes = new Set(sections.map((row) => row.industry_section_code));
const standardIds = new Set(registry.map((row) => row.internal_standard_id));
const expectedStandardIds = [
  "ghg_corporate_standard",
  "ghg_scope3_standard",
  "ghg_financial_industry_standard",
  "ghg_scope2_guidance",
  "ghg_project_protocol",
  "ghg_product_standard",
  "ghg_scope3_calculation_guidance",
  "iso_14064",
  "iso_14067",
  "iso_14040_14044",
  "gb_t_24067_2024",
  "gb_t_32150_2015",
];
const forbiddenSubstitutes = new Set(["iso_14064_3", "gb_t_36001_2015"]);

if (sections.length !== 20) fail(`expected 20 GB/T section rows, got ${sections.length}`);
if (registry.length !== 12) fail(`expected 12 display standard rows, got ${registry.length}`);
for (const id of expectedStandardIds) {
  if (!standardIds.has(id)) fail(`missing requested display standard: ${id}`);
}
for (const id of standardIds) {
  if (!expectedStandardIds.includes(id)) fail(`unexpected display standard: ${id}`);
  if (forbiddenSubstitutes.has(id)) fail(`substitute standard must not appear in requested display registry: ${id}`);
}
for (const [system, count] of [["GHG Protocol", 7], ["ISO", 3], ["GB/T", 2]]) {
  const actual = registry.filter((row) => row.display_system === system).length;
  if (actual !== count) fail(`${system} display node count ${actual} != ${count}`);
}
for (const row of sections) {
  if (row.gb_standard !== "GB/T 4754-2017" || row.level !== "section") {
    fail(`invalid industry registry scope: ${row.industry_section_code}`);
  }
}
if (!String(linksPayload.flow_definition || "").includes("accepted")) {
  fail("sankey link payload must state accepted-only flow definition");
}
for (const row of links) {
  if (!standardIds.has(row.internal_standard_id)) fail(`link uses standard outside registry: ${row.internal_standard_id}`);
  if (!sectionCodes.has(row.industry_section_code)) fail(`link uses industry outside GB/T registry: ${row.industry_section_code}`);
  const companyIds = Array.isArray(row.company_ids) ? row.company_ids : [];
  if (Number(row.accepted_company_count) !== companyIds.length) {
    fail(`company count mismatch for ${row.internal_standard_id}/${row.industry_section_code}`);
  }
  if (Number(row.accepted_link_count) < Number(row.distinct_company_count)) {
    fail(`accepted_link_count below distinct_company_count for ${row.internal_standard_id}/${row.industry_section_code}`);
  }
}

if (failures.length) {
  console.error("Standard industry Sankey verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Standard industry Sankey verification passed.");
