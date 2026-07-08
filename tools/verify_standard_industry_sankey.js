const fs = require("fs");
const path = require("path");

const root = process.cwd();
const wb = path.join(root, "assets/data/world500/workbench");
const failures = [];
const deliveryReadmePath = path.join(wb, "world500_standard_industry_delivery_readme.md");
const deliveryReadme = fs.existsSync(deliveryReadmePath) ? fs.readFileSync(deliveryReadmePath, "utf8") : "";

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
const evidencePayload = readJson("world500_standard_industry_section_sankey_evidence.json");
const evidenceRows = evidencePayload.rows || [];
const reviewPackRows = readJson("world500_standard_industry_evidence_review_pack.json").rows || [];
const boundaryRows = readJson("world500_standard_evidence_boundary_summary.json").rows || [];
const industryReviewRows = readJson("world500_company_industry_review_pack.json").rows || [];
const sectionCodes = new Set(sections.map((row) => row.industry_section_code));
const standardIds = new Set(registry.map((row) => row.internal_standard_id));
const correctedUtilityIds = new Set([
  "r049_electricitédefrance",
  "r078_chinasouthernpowergrid",
  "r097_enel",
  "r201_koreaelectricpower",
  "r317_tokyoelectricpower",
  "r336_chinahuadian",
  "r456_koreagas",
  "r485_centrica",
]);
const correctedSoftwareIds = new Set(["r299_oracle", "r445_salesforce", "r450_sap公司"]);
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
if (!String(evidencePayload.flow_definition || "").includes("evidence sample")) {
  fail("sankey evidence payload must state evidence-sample flow definition");
}
if (!deliveryReadme) {
  fail("missing standard-industry delivery README");
}
for (const token of ["275", "276", "GB/T 32150-2015", "ISO 14040/14044", "accepted", "review", "weak", "demoted"]) {
  if (deliveryReadme && !deliveryReadme.includes(token)) {
    fail(`delivery README missing required explanation token: ${token}`);
  }
}
const acceptedLinkTotal = links.reduce((total, row) => total + Number(row.accepted_link_count || 0), 0);
if (Number(evidencePayload.accepted_company_standard_link_count) !== acceptedLinkTotal) {
  fail(`sankey evidence accepted link count ${evidencePayload.accepted_company_standard_link_count} != ${acceptedLinkTotal}`);
}
if (evidenceRows.length < acceptedLinkTotal) {
  fail(`sankey evidence rows ${evidenceRows.length} below accepted link total ${acceptedLinkTotal}`);
}
for (const row of links) {
  if (!standardIds.has(row.internal_standard_id)) fail(`link uses standard outside registry: ${row.internal_standard_id}`);
  if (!sectionCodes.has(row.industry_section_code)) fail(`link uses industry outside GB/T registry: ${row.industry_section_code}`);
  const companyIds = Array.isArray(row.company_ids) ? row.company_ids : [];
  const companyNames = Array.isArray(row.company_names) ? row.company_names : [];
  if (Number(row.accepted_company_count) !== companyIds.length) {
    fail(`company count mismatch for ${row.internal_standard_id}/${row.industry_section_code}`);
  }
  if (companyIds.length !== companyNames.length) {
    fail(`company id/name array length mismatch for ${row.internal_standard_id}/${row.industry_section_code}`);
  }
  if (Number(row.accepted_link_count) < Number(row.distinct_company_count)) {
    fail(`accepted_link_count below distinct_company_count for ${row.internal_standard_id}/${row.industry_section_code}`);
  }
  companyIds.forEach((companyId, index) => {
    const expected = evidenceRows.find((item) => item.sankey_flow_key === `${row.internal_standard_id}::${row.industry_section_code}` && item.company_id === companyId);
    if (expected && expected.company_name_en !== companyNames[index]) {
      fail(`company id/name pair mismatch for ${companyId}: ${companyNames[index]} != ${expected.company_name_en}`);
    }
  });
}
for (const row of evidenceRows) {
  if (!standardIds.has(row.internal_standard_id)) fail(`evidence uses standard outside registry: ${row.internal_standard_id}`);
  if (!sectionCodes.has(row.industry_section_code)) fail(`evidence uses industry outside GB/T registry: ${row.industry_section_code}`);
  if (row.decision_bucket !== "accepted") fail(`evidence row is not accepted: ${row.company_id}/${row.internal_standard_id}`);
  if (!row.evidence_page || !row.source_file) fail(`evidence row missing page/source: ${row.company_id}/${row.internal_standard_id}`);
  if (!["consistent_with_company_workbench", "corrected_by_gbt4754_code_name_rule", "corrected_by_gbt4754_business_activity_rule"].includes(row.industry_consistency_status)) {
    fail(`industry mismatch against company_workbench: ${row.company_id}/${row.internal_standard_id}`);
  }
  if (correctedUtilityIds.has(row.company_id) && row.industry_section_code !== "D") {
    fail(`utility company must be corrected to GB/T section D in Sankey evidence: ${row.company_id}`);
  }
  if (correctedSoftwareIds.has(row.company_id) && row.industry_section_code !== "I") {
    fail(`software company must be corrected to GB/T section I in Sankey evidence: ${row.company_id}`);
  }
}
if (!evidenceRows.some((row) => row.internal_standard_id === "gb_t_32150_2015" && row.company_id === "r451_crrcgroup" && row.industry_section_code === "C")) {
  fail("GB/T 32150-2015 must retain CRRC manufacturing accepted evidence in the Sankey source table");
}
if (!reviewPackRows.some((row) => row.standard_id === "gb_t_32150_2015" && row.company_id === "r250_contemporaryamperextechnology" && row.evidence_status === "weak")) {
  fail("review pack must retain CATL weak GB/T 32150-2015 evidence");
}
const gbt32150Boundary = boundaryRows.find((row) => row.standard_id === "gb_t_32150_2015");
if (!gbt32150Boundary || Number(gbt32150Boundary.accepted_company_count) !== 1 || Number(gbt32150Boundary.weak_company_count) < 1) {
  fail("GB/T 32150-2015 boundary must show 1 accepted company and weak/review evidence retained");
}
const iso14040Boundary = boundaryRows.find((row) => row.standard_id === "iso_14040_14044");
if (!iso14040Boundary || Number(iso14040Boundary.accepted_company_count) !== 0 || Number(iso14040Boundary.review_company_count) < 1) {
  fail("ISO 14040/14044 boundary must remain zero accepted with review evidence retained");
}
for (const companyId of correctedUtilityIds) {
  const row = industryReviewRows.find((item) => item.company_id === companyId);
  if (!row || row.suggested_code !== "D" || row.applied_to_current_industry_outputs !== "true") {
    fail(`company industry review pack missing applied utility correction: ${companyId}`);
  }
}
for (const companyId of correctedSoftwareIds) {
  const row = industryReviewRows.find((item) => item.company_id === companyId);
  if (!row || row.suggested_code !== "I" || row.applied_to_current_industry_outputs !== "true") {
    fail(`company industry review pack missing applied software correction: ${companyId}`);
  }
  if (row && !String(row.fortune_industry_label_zh || row.fortune_industry_label || "").includes("计算机软件")) {
    fail(`software company review row missing original Fortune software label: ${companyId}`);
  }
}
for (const row of industryReviewRows) {
  if (!row.fortune_industry_label || row.fortune_industry_label === "not_available_in_company_workbench") {
    fail(`company industry review row missing original Fortune industry label: ${row.company_id}`);
  }
}

if (failures.length) {
  console.error("Standard industry Sankey verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Standard industry Sankey verification passed.");
