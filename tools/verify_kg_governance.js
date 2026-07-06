const fs = require("fs");
const path = require("path");

const root = process.cwd();
const failures = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function requireFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`missing file: ${file}`);
  }
}

function requireText(file, needles) {
  requireFile(file);
  if (!fs.existsSync(path.join(root, file))) return;
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${file} missing text: ${needle}`);
  }
}

function requireEqual(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

function requireAtLeast(label, actual, min) {
  if (actual < min) failures.push(`${label}: expected >= ${min}, got ${actual}`);
}

[
  "docs/REQUIREMENT_TRACEABILITY.md",
  "docs/KG_SCHEMA.md",
  "docs/RELATION_DICTIONARY.md",
  "docs/GRAPH_INTERACTION_SPEC.md",
  "KG_QUALITY_REPORT.md",
  "assets/data/world500/kg_schema.json",
  "assets/data/world500/kg_acceptance_rules.json",
  "assets/data/world500/workbench/snapshot_manifest.json",
  "assets/data/world500/workbench/reporting_views.json"
].forEach(requireFile);

requireText("docs/REQUIREMENT_TRACEABILITY.md", [
  "GHG Protocol",
  "企业总碳排放量",
  "标准角色族",
  "图 6",
  "初级/次级数据"
]);

requireText("docs/KG_SCHEMA.md", [
  "Company",
  "Standard",
  "EvidenceSnippet",
  "事实采信边",
  "本体骨架边"
]);

requireText("docs/RELATION_DICTIONARY.md", [
  "COMPANY_CITES_GHGP_FINE_SERIES",
  "COMPANY_REPORTS_EMISSION_VALUE",
  "COMPANY_DISCLOSES_TECHNOLOGY_PATHWAY"
]);

const schema = readJson("assets/data/world500/kg_schema.json");
const rules = readJson("assets/data/world500/kg_acceptance_rules.json");
const views = readJson("assets/data/world500/workbench/reporting_views.json");
const manifest = readJson("assets/data/world500/workbench/snapshot_manifest.json");
const ghgLedger = readJson("assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json");
const emissionsLedger = readJson("assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json");

for (const key of ["Company", "Standard", "EvidenceSnippet", "AcceptanceDecision"]) {
  if (!schema.node_types || !schema.node_types[key]) failures.push(`kg_schema missing node type: ${key}`);
}

for (const key of ["COMPANY_CITES_GHGP_FINE_SERIES", "COMPANY_REPORTS_EMISSION_VALUE", "COMPANY_DISCLOSES_TECHNOLOGY_PATHWAY"]) {
  if (!schema.relation_types || !schema.relation_types[key]) failures.push(`kg_schema missing relation type: ${key}`);
  if (!rules.relation_rules || !rules.relation_rules[key]) failures.push(`kg_acceptance_rules missing relation rule: ${key}`);
}

for (const key of ["accepted", "review", "demoted"]) {
  if (!rules.acceptance_layers || !rules.acceptance_layers[key]) failures.push(`kg_acceptance_rules missing acceptance layer: ${key}`);
}

if (!manifest.policy || !manifest.policy.count_rule || !manifest.policy.evidence_page_rule) {
  failures.push("snapshot_manifest missing count/evidence policy");
}

requireEqual("GHGP whitelist standard count", ghgLedger.core_whitelist_standard_count, 12);
requireEqual("GHGP generic accepted count", ghgLedger.generic_reference_accepted_count, 0);
requireAtLeast("GHGP accepted fine-series edges", ghgLedger.accepted_edge_count, 267);

const acceptedRows = (ghgLedger.rows || []).filter((row) => row.decision_bucket === "accepted");
for (const row of acceptedRows) {
  if (!String(row.pages || "").trim()) failures.push(`accepted GHGP edge missing pages: ${row.decision_id}`);
  if (!String(row.source_files || "").trim()) failures.push(`accepted GHGP edge missing source_files: ${row.decision_id}`);
}

requireEqual(
  "emissions complete accepted count matches reporting summary",
  emissionsLedger.complete_accepted_count,
  views.summary.complete_emissions_ranking_company_count
);
requireAtLeast("emissions complete accepted count", emissionsLedger.complete_accepted_count, 27);
requireAtLeast("technology project evidence count", views.summary.technology_project_evidence_count, 77);
requireAtLeast("technology cost evidence count", views.summary.technology_project_cost_evidence_count, 11);
requireAtLeast("explicit primary-data ratio company count", views.summary.source_mix_explicit_reported_primary_ratio_company_count, 13);

if (failures.length) {
  console.error("KG governance verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("KG governance verification passed.");
