const fs = require("fs");
const path = require("path");

const siteRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(siteRoot, "..");
const workbenchDir = path.join(siteRoot, "assets", "data", "world500", "workbench");
const pageTextDir = path.join(projectRoot, "data", "interim", "world500_page_text");
const emissionLedgerPath = path.join(workbenchDir, "emission_ledger.json");
const outputDir = path.join(workbenchDir, "expanded_evidence");
const summaryPath = path.join(workbenchDir, "expanded_scope_evidence_summary.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCarbonText(value) {
  return normalizeSpace(value)
    .replace(/CO\s*\u2082\s*e?/gi, "CO2e")
    .replace(/CO\s*\u9227\S{0,3}/gi, "CO2e")
    .replace(/carbon dioxide equivalents?/gi, "CO2e");
}

function normalizeLookup(value) {
  return normalizeCarbonText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeNumber(value) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return String(value ?? "").trim();
  return String(Math.round(numeric * 1e9) / 1e9);
}

function evidenceKey(row) {
  return [
    row.company_id,
    row.scope_en,
    row.scope2_reporting_method || row.basis_en || "",
    row.inventory_year || "",
    row.evidence_page || row.page || "",
    normalizeNumber(row.value_mtco2e),
    row.source_file || "",
  ]
    .map((part) => normalizeLookup(part) || "_")
    .join("__");
}

function readCompanyPageRows(companyId) {
  if (!companyId || !fs.existsSync(pageTextDir)) return [];
  return fs
    .readdirSync(pageTextDir)
    .filter((name) => name.startsWith(`${companyId}__`) && name.endsWith(".jsonl"))
    .flatMap((name) => {
      const file = path.join(pageTextDir, name);
      return fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          try {
            return { ...JSON.parse(line), _jsonl_file: file };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    });
}

function addNumberVariant(variants, value) {
  if (!Number.isFinite(value) || value <= 0) return;
  variants.add(String(Math.round(value * 1e9) / 1e9));
  variants.add(value.toLocaleString("en-US", { maximumFractionDigits: 9 }));
  variants.add(value.toFixed(6).replace(/0+$/, "").replace(/\.$/, ""));
  variants.add(value.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""));
  variants.add(value.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));
}

function numberVariants(value) {
  const variants = new Set();
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return [];
  addNumberVariant(variants, numeric);
  addNumberVariant(variants, numeric * 1_000_000);
  addNumberVariant(variants, numeric * 1_000);
  return [...variants]
    .filter((item) => item && item !== "0" && normalizeLookup(item).length >= 2)
    .sort((a, b) => b.length - a.length);
}

function scopeTokens(row) {
  const scope = String(row.scope_en || row.scope_zh || "").toLowerCase();
  if (scope.includes("1")) return ["Scope 1", "Scope1", "direct emissions", "direct GHG emissions"];
  if (scope.includes("2")) return ["Scope 2", "Scope2", "purchased electricity", "energy indirect emissions"];
  if (scope.includes("3")) return ["Scope 3", "Scope3", "other indirect emissions", "value chain"];
  return [];
}

function methodTokens(row) {
  const method = `${row.scope2_reporting_method || ""} ${row.basis_en || ""}`.toLowerCase();
  if (method.includes("market")) return ["market-based", "market based"];
  if (method.includes("location")) return ["location-based", "location based"];
  return [];
}

function expectedScope2Method(row) {
  if (!String(row.scope_en || "").toLowerCase().includes("scope 2")) return "";
  const method = `${row.scope2_reporting_method || ""} ${row.basis_en || ""}`.toLowerCase();
  if (method.includes("market")) return "market";
  if (method.includes("location")) return "location";
  return "";
}

function oppositeMethodTokens(method) {
  if (method === "market") return ["location-based", "location based"];
  if (method === "location") return ["market-based", "market based"];
  return [];
}

function yearTokens(row) {
  const year = String(row.inventory_year || "").match(/20\d{2}/)?.[0] || "";
  if (!year) return [];
  return [year, `CY${year}`, `FY${year}`, `fiscal year ${year}`];
}

function containsAny(text, tokens) {
  const haystack = normalizeLookup(text);
  return tokens.some((token) => {
    const needle = normalizeLookup(token);
    return needle && haystack.includes(needle);
  });
}

function findTokenIndex(text, tokens) {
  const lowered = text.toLowerCase();
  for (const token of tokens) {
    const index = lowered.indexOf(String(token).toLowerCase());
    if (index >= 0) return { index, token };
  }
  const compactText = normalizeLookup(text);
  for (const token of tokens) {
    const compactToken = normalizeLookup(token);
    const compactIndex = compactToken ? compactText.indexOf(compactToken) : -1;
    if (compactIndex >= 0) return { index: Math.max(0, compactIndex), token };
  }
  return { index: -1, token: "" };
}

function detectUnit(text) {
  const normalized = normalizeCarbonText(text);
  return /\b(?:MMT|MMt|Mt|t|kt)\s*CO2e?\b/i.test(normalized) ||
    /\bCO2e\b/i.test(normalized) ||
    /million\s+(?:metric\s+)?(?:tons?|tonnes?)\s+(?:of\s+)?CO2e?/i.test(normalized) ||
    /metric\s+(?:tons?|tonnes?)\s+(?:of\s+)?CO2e?/i.test(normalized);
}

function nearbyMethodContext(pageText, anchorIndex) {
  if (!pageText || anchorIndex < 0) return "";
  const start = Math.max(0, anchorIndex - 180);
  const end = Math.min(pageText.length, anchorIndex + 90);
  return normalizeCarbonText(pageText.slice(start, end));
}

function scope2MethodConflicts(row, pageText, anchorIndex) {
  const expected = expectedScope2Method(row);
  if (!expected) return [];
  const localContext = nearbyMethodContext(pageText, anchorIndex);
  if (!localContext) return [];
  const expectedHit = containsAny(localContext, methodTokens(row));
  const oppositeHit = containsAny(localContext, oppositeMethodTokens(expected));
  return oppositeHit && !expectedHit ? ["scope2_method"] : [];
}

function buildSnippet(pageText, anchorIndex, width) {
  if (!pageText) return "";
  const safeIndex = anchorIndex >= 0 ? anchorIndex : 0;
  const start = Math.max(0, safeIndex - Math.floor(width * 0.45));
  const end = Math.min(pageText.length, safeIndex + Math.floor(width * 0.55));
  return normalizeSpace(pageText.slice(start, end));
}

function evaluateSnippet(snippet, row, pageText = "", anchorIndex = -1) {
  const valueMatched = containsAny(snippet, numberVariants(row.value_mtco2e));
  const scopeMatched = containsAny(snippet, scopeTokens(row));
  const yearMatched = containsAny(snippet, yearTokens(row));
  const unitMatched = detectUnit(snippet);
  const conflictParts = scope2MethodConflicts(row, pageText, anchorIndex);
  const methodList = methodTokens(row);
  const methodMatched = !methodList.length || (containsAny(snippet, methodList) && !conflictParts.includes("scope2_method"));
  const matchedParts = {
    scope: scopeMatched,
    value: valueMatched,
    unit: unitMatched,
    year: yearMatched,
    scope2_method: methodMatched,
  };
  const missingParts = Object.entries(matchedParts)
    .filter(([, matched]) => !matched)
    .map(([key]) => key);
  return {
    matched_parts: matchedParts,
    missing_parts: missingParts,
    conflict_parts: conflictParts,
    conflict_context: conflictParts.length ? nearbyMethodContext(pageText, anchorIndex) : "",
    is_complete: missingParts.length === 0 && conflictParts.length === 0,
  };
}

function expandedEvidenceForRow(row, pageRows) {
  const page = String(row.evidence_page || row.page || "").trim();
  const pageRow = pageRows.find((item) => String(item.page || "").trim() === page);
  const originalSnippet = normalizeSpace(row.snippet_en || row.basis_note_en || "");
  if (!pageRow) {
    return {
      page_text_found: false,
      snippet_en: normalizeCarbonText(originalSnippet),
      snippet_zh: normalizeCarbonText(originalSnippet),
      matched_parts: {},
      missing_parts: ["page_text"],
      conflict_parts: [],
      conflict_context: "",
      is_complete: false,
    };
  }
  const pageText = normalizeSpace(pageRow.text || "");
  const valueAnchor = findTokenIndex(pageText, numberVariants(row.value_mtco2e));
  const fallbackAnchor = findTokenIndex(pageText, [...scopeTokens(row), ...yearTokens(row)]);
  const anchor = valueAnchor.index >= 0 ? valueAnchor : fallbackAnchor;
  let snippet = buildSnippet(pageText, anchor.index, 1500);
  let evaluation = evaluateSnippet(snippet, row, pageText, anchor.index);
  if (!evaluation.is_complete) {
    snippet = buildSnippet(pageText, anchor.index, 2400);
    evaluation = evaluateSnippet(snippet, row, pageText, anchor.index);
  }
  if (String(row.scope_en || "").toLowerCase().includes("scope 2") && !evaluation.matched_parts.scope2_method) {
    snippet = buildSnippet(pageText, anchor.index, 3400);
    evaluation = evaluateSnippet(snippet, row, pageText, anchor.index);
  }
  const displaySnippet = normalizeCarbonText(snippet || originalSnippet);
  return {
    page_text_found: true,
    page_text_file: path.relative(projectRoot, pageRow._jsonl_file).replace(/\\/g, "/"),
    extraction_method: pageRow.extraction_method || "",
    quality_flag: pageRow.quality_flag || "",
    ocr_used: Boolean(pageRow.ocr_used),
    anchor_token: anchor.token || "",
    snippet_en: displaySnippet,
    snippet_zh: displaySnippet,
    original_snippet_en: normalizeCarbonText(originalSnippet),
    original_snippet_zh: normalizeCarbonText(row.snippet_zh || row.basis_note_zh || originalSnippet),
    ...evaluation,
  };
}

const ledger = readJson(emissionLedgerPath);
const rows = Array.isArray(ledger.authoritative_scope_rows) ? ledger.authoritative_scope_rows : [];
const pageCache = new Map();
const byKey = {};
const byCompany = {};
const records = [];

for (const row of rows) {
  const companyId = String(row.company_id || "").trim();
  if (!pageCache.has(companyId)) pageCache.set(companyId, readCompanyPageRows(companyId));
  const expanded = expandedEvidenceForRow(row, pageCache.get(companyId));
  const record = {
    evidence_key: evidenceKey(row),
    company_id: companyId,
    company_name_en: row.company_name_en || "",
    company_name_zh: row.company_name_zh || "",
    world500_rank: row.world500_rank || "",
    scope_en: row.scope_en || "",
    scope_zh: row.scope_zh || "",
    value_mtco2e: row.value_mtco2e,
    inventory_year: row.inventory_year || "",
    scope2_reporting_method: row.scope2_reporting_method || "",
    basis_en: row.basis_en || "",
    basis_zh: row.basis_zh || "",
    evidence_page: row.evidence_page || row.page || "",
    source_file: row.source_file || "",
    report_title_en: row.report_title_en || row.report_title || "",
    report_title_zh: row.report_title_zh || row.report_title || "",
    review_status: row.review_status || "",
    confidence_level: row.confidence_level || "",
    acceptance_tier_code: row.acceptance_tier_code || "",
    acceptance_tier_en: row.acceptance_tier_en || "",
    acceptance_tier_zh: row.acceptance_tier_zh || "",
    source_layer: row.source_layer || "",
    recognition_basis_en: "Expanded from source page text for direct-use Scope evidence.",
    recognition_basis_zh: "Expanded from source page text for direct-use Scope evidence.",
    ...expanded,
  };
  records.push(record);
  if (!byKey[record.evidence_key]) byKey[record.evidence_key] = record;
  if (!byCompany[companyId]) byCompany[companyId] = [];
  byCompany[companyId].push(record);
}

const output = {
  generated_at: new Date().toISOString(),
  policy: "Expanded snippets do not promote candidates. They only strengthen display and audit of rows already in authoritative_scope_rows.",
  summary: {
    authoritative_scope_rows: rows.length,
    expanded_rows: records.length,
    complete_rows: records.filter((item) => item.is_complete).length,
    missing_page_text_rows: records.filter((item) => !item.page_text_found).length,
    conflict_rows: records.filter((item) => (item.conflict_parts || []).length).length,
    duplicate_key_rows: records.length - Object.keys(byKey).length,
  },
  records,
  by_key: byKey,
  by_company: byCompany,
};

fs.mkdirSync(outputDir, { recursive: true });
for (const [companyId, companyRows] of Object.entries(byCompany)) {
  const companyByKey = {};
  for (const row of companyRows) {
    if (!companyByKey[row.evidence_key]) companyByKey[row.evidence_key] = row;
  }
  const companyOutput = {
    schema_version: "scope-evidence-v1",
    generated_at: output.generated_at,
    policy: output.policy,
    company_id: companyId,
    summary: {
      expanded_rows: companyRows.length,
      complete_rows: companyRows.filter((item) => item.is_complete).length,
      missing_page_text_rows: companyRows.filter((item) => !item.page_text_found).length,
      conflict_rows: companyRows.filter((item) => (item.conflict_parts || []).length).length,
      duplicate_key_rows: companyRows.length - Object.keys(companyByKey).length,
    },
    records: companyRows,
    by_key: companyByKey,
  };
  fs.writeFileSync(path.join(outputDir, `${companyId}.json`), JSON.stringify(companyOutput, null, 2), "utf8");
}

const summaryOutput = {
  schema_version: "scope-evidence-summary-v1",
  generated_at: output.generated_at,
  policy: output.policy,
  summary: output.summary,
  companies: Object.entries(byCompany)
    .map(([companyId, companyRows]) => ({
      company_id: companyId,
      expanded_rows: companyRows.length,
      complete_rows: companyRows.filter((item) => item.is_complete).length,
      missing_page_text_rows: companyRows.filter((item) => !item.page_text_found).length,
      conflict_rows: companyRows.filter((item) => (item.conflict_parts || []).length).length,
    }))
    .sort((a, b) => a.company_id.localeCompare(b.company_id)),
};
fs.writeFileSync(summaryPath, JSON.stringify(summaryOutput, null, 2), "utf8");
console.log(`Wrote ${records.length} expanded scope evidence rows to ${outputDir}`);
console.log(JSON.stringify(output.summary, null, 2));
