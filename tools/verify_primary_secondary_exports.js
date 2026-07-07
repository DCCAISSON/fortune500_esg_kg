const fs = require("fs");
const path = require("path");

const root = process.cwd();
const wb = path.join(root, "assets/data/world500/workbench");
const failures = [];
const allowedLayers = new Set([
  "explicit_reported_primary_data_percentage",
  "explicit_primary_secondary_mention_without_ratio",
  "supplier_specific_data",
  "spend_based_data",
  "average_data",
  "method_row_source_mix_inference",
  "unknown",
]);

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(wb, name), "utf8"));
}

function fail(message) {
  failures.push(message);
}

const views = readJson("reporting_views.json");
const evidence = readJson("world500_primary_secondary_evidence_chain_export.json").rows || [];
const summary = readJson("world500_primary_secondary_bubble_company_summary.json").rows || [];
const summaryCounts = views.primary_secondary_data.summary || {};
const distinctSummaryCompanies = new Set(summary.map((row) => row.company_id));
const explicitCompanies = new Set(summary.filter((row) => row.bubble_evidence_type === "explicit_reported_primary_data_percentage").map((row) => row.company_id));
const inferenceCompanies = new Set(summary.filter((row) => row.bubble_evidence_type === "method_row_source_mix_inference").map((row) => row.company_id));
const includedCompanies = new Set(summary.filter((row) => row.included_in_bubble === "true").map((row) => row.company_id));

if (evidence.length === 0) fail("evidence chain export is empty");
if (distinctSummaryCompanies.size !== summary.length) fail("bubble company summary has duplicate company_id rows");
if (distinctSummaryCompanies.size !== Number(views.summary.source_mix_company_count)) {
  fail(`source_mix_company_count mismatch: ${distinctSummaryCompanies.size} != ${views.summary.source_mix_company_count}`);
}
if (includedCompanies.size !== Number(views.summary.source_mix_known_company_count)) {
  fail(`included bubble count mismatch: ${includedCompanies.size} != ${views.summary.source_mix_known_company_count}`);
}
if (explicitCompanies.size !== Number(views.summary.source_mix_explicit_reported_primary_ratio_company_count)) {
  fail(`explicit primary-ratio company count mismatch: ${explicitCompanies.size} != ${views.summary.source_mix_explicit_reported_primary_ratio_company_count}`);
}
if (inferenceCompanies.size !== Number(summaryCounts.inference_bubble_count)) {
  fail(`inference company count mismatch: ${inferenceCompanies.size} != ${summaryCounts.inference_bubble_count}`);
}
for (const row of evidence) {
  if (!allowedLayers.has(row.evidence_layer)) fail(`unknown evidence layer: ${row.evidence_layer}`);
}
for (const row of summary) {
  if (row.included_in_bubble === "false" && row.primary_ratio_for_bubble === 0) {
    fail(`unknown or undisclosed primary ratio was coerced to 0: ${row.company_id}`);
  }
}
const strongEvidenceWithoutLocator = evidence.filter((row) => row.evidence_layer === "explicit_reported_primary_data_percentage" && (!row.source_file || !row.page));
if (strongEvidenceWithoutLocator.length) fail(`explicit primary-ratio evidence rows missing source locator: ${strongEvidenceWithoutLocator.length}`);

if (failures.length) {
  console.error("Primary/secondary export verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Primary/secondary export verification passed.");
