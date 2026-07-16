const fs = require("fs");
const path = require("path");

const root = process.cwd();
const wb = path.join(root, "assets/data/world500/workbench");
const failures = [];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(wb, name), "utf8"));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function fail(message) {
  failures.push(message);
}

const views = readJson("reporting_views.json");
const sections = readJson("national_industry_section_registry.json").rows || [];
const ranking = readJson("world500_emissions_industry_section_ranking.json").rows || [];
const coveragePayload = readJson("world500_emissions_industry_section_coverage_summary.json");
const coverage = coveragePayload.rows || [];
const scopeSummary = readJson("world500_emissions_industry_section_scope_summary.json").rows || [];
const missingPayload = readJson("world500_emissions_missing_company_list.json");
const missing = missingPayload.rows || [];
const sectionCodes = new Set(sections.map((row) => row.industry_section_code));
const completeCount = Number(views.summary.complete_emissions_ranking_company_count);
const availableCount = Number(views.summary.available_emissions_ranking_company_count);
const denominator = Number(coveragePayload.denominator_company_count || missingPayload.denominator_company_count);

if (denominator !== 351) fail(`emissions denominator must be 351 published KG companies, got ${denominator}`);
if (ranking.length !== completeCount) fail(`ranking row count ${ranking.length} != complete comparable count ${completeCount}`);
if (missing.length !== denominator - completeCount) fail(`missing list count ${missing.length} != ${denominator - completeCount}`);
if (coverage.length !== 20) fail(`coverage summary must retain 20 GB/T sections, got ${coverage.length}`);
if (scopeSummary.length !== 20) fail(`scope summary must retain 20 GB/T sections, got ${scopeSummary.length}`);
if (sum(coverage, "published_company_count") !== denominator) fail("coverage published_company_count does not sum to denominator");
if (sum(coverage, "complete_comparable_count") !== completeCount) fail("coverage complete count does not match reporting_views");
if (sum(coverage, "available_emissions_count") !== availableCount) fail("coverage available count does not match reporting_views");
if (sum(coverage, "missing_total_emissions_count") !== missing.length) fail("coverage missing count does not match missing company list");
if (sum(scopeSummary, "complete_comparable_company_count") !== completeCount) fail("scope summary complete count does not match reporting_views");
if (sum(scopeSummary, "missing_total_emissions_company_count") !== missing.length) fail("scope summary missing count does not match missing company list");
for (const key of [["scope1", "complete_scope1_mtco2e"], ["scope2_selected", "complete_scope2_selected_mtco2e"], ["scope3", "complete_scope3_mtco2e"], ["total_emissions", "complete_total_mtco2e"]]) {
  if (Math.abs(sum(ranking, key[0]) - sum(scopeSummary, key[1])) > 0.001) fail(`scope summary ${key[1]} does not match ranking rows`);
}
for (const row of [...ranking, ...coverage, ...scopeSummary, ...missing]) {
  if (!sectionCodes.has(row.industry_section_code)) fail(`row uses industry outside GB/T registry: ${row.industry_section_code}`);
}
for (const row of ranking) {
  if (row.evidence_status !== "complete_comparable_scope123_strong_evidence") {
    fail(`non-complete row leaked into emissions industry ranking: ${row.company_id}`);
  }
  for (const key of ["scope1", "scope2_selected", "scope3", "total_emissions", "year", "unit", "page"]) {
    if (row[key] === "" || row[key] === null || row[key] === undefined) fail(`ranking row missing ${key}: ${row.company_id}`);
  }
}

if (failures.length) {
  console.error("Emissions industry output verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Emissions industry output verification passed.");
