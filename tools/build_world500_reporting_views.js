const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKBENCH_DIR = path.join(ROOT, "assets", "data", "world500", "workbench");
const GRAPH_DIR = path.join(ROOT, "assets", "data", "world500", "graph");
const COMPANIES_DIR = path.join(WORKBENCH_DIR, "companies");
const EXPANDED_DIR = path.join(WORKBENCH_DIR, "expanded_evidence");
const STRICT_TRACEABLE_NODES_FILE = path.join(GRAPH_DIR, "world500_strict_traceable_nodes.csv");
const GHG_SERIES_BACKFILL_FILE = path.join(WORKBENCH_DIR, "ghg_series_pdf_page_backfill.json");
const GHG_SERIES_ACCEPTANCE_LEDGER_FILE = path.join(WORKBENCH_DIR, "world500_ghg_series_acceptance_ledger.json");
const MANUAL_EMISSIONS_CORRECTIONS_FILE = path.join(WORKBENCH_DIR, "world500_emissions_manual_corrections.json");
const TECHNOLOGY_PROJECT_EVIDENCE_FILE = path.join(WORKBENCH_DIR, "world500_technology_project_evidence.json");
const TECHNOLOGY_PROJECT_CANDIDATE_DECISIONS_FILE = path.join(WORKBENCH_DIR, "world500_technology_project_candidate_decisions.json");
const OUTPUT_FILE = path.join(WORKBENCH_DIR, "reporting_views.json");
const GHG_PCAF_REGISTRY_OUTPUT_FILE = path.join(WORKBENCH_DIR, "world500_ghg_pcaf_standard_registry.json");

const STANDARD_COLORS = [
  "#2f6f63",
  "#c76b2d",
  "#315f8c",
  "#9b3b2f",
  "#6f5b2f",
  "#7a4f82",
  "#2f6f8f",
  "#8a6d1d",
  "#4f6f2f",
  "#8b4b2f",
  "#3f5678",
  "#7a3f52",
];

const INDUSTRY_COLORS = {
  A: "#8fb36f",
  B: "#8a5a44",
  C: "#c76b2d",
  D: "#d89b3d",
  E: "#4f8a83",
  F: "#2f6f63",
  G: "#315f8c",
  H: "#6a89a8",
  I: "#7a4f82",
  J: "#446f9f",
  K: "#8a6d1d",
  L: "#9b3b2f",
  M: "#547f68",
  N: "#6f6f2f",
  O: "#7b6b5f",
  P: "#4f7f9f",
  Q: "#7f4f6f",
  R: "#5d6f8f",
  S: "#7f7f7f",
  unknown: "#98a1a8",
};

const GHG_SERIES = [
  {
    id: "ghg_corporate_standard",
    name_en: "GHG Protocol Corporate Accounting and Reporting Standard",
    name_zh: "GHG Protocol 企业核算与报告标准",
    category_key: "standard",
    category_en: "Standard",
    category_zh: "标准",
    role_en: "Corporate inventory accounting standard",
    role_zh: "企业组织层面清单核算标准",
    principle_en: "Relevance, completeness, consistency, transparency, and accuracy.",
    principle_zh: "相关性、完整性、一致性、透明性和准确性。",
    language_policy_en: "Within GHG Protocol evidence, this may define Scope 1 and Scope 2 corporate inventory boundaries.",
    language_policy_zh: "仅在 GHG Protocol 证据下使用 Scope 1/2 的组织层面清单口径。",
    patterns: [
      /corporate accounting and reporting standard/i,
      /(?:ghg protocol|greenhouse gas protocol|wri|world resources institute|world business council)[\s\S]{0,160}corporate standard/i,
      /(?:ghg protocol|greenhouse gas protocol|wri|world resources institute|world business council)[\s\S]{0,160}corporate accounting standard/i,
    ],
  },
  {
    id: "ghg_scope3_standard",
    name_en: "GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard",
    name_zh: "GHG Protocol 企业价值链（Scope 3）核算与报告标准",
    category_key: "standard",
    category_en: "Standard",
    category_zh: "标准",
    role_en: "Value-chain emissions accounting standard",
    role_zh: "价值链排放核算标准",
    principle_en: "Scope 3 categories are GHG Protocol-specific category language.",
    principle_zh: "Scope 3 类别是 GHG Protocol 特有的类别口径。",
    language_policy_en: "Scope 3 and Scope 3 category names are only used for GHG Protocol evidence.",
    language_policy_zh: "Scope 3 及十五类类别口径只在 GHG Protocol 证据下使用。",
    patterns: [
      /corporate value chain\s*\(scope 3\)/i,
      /corporate value chain.*scope 3/i,
      /value chain\s*\(scope 3\)\s*accounting/i,
    ],
  },
  {
    id: "ghg_land_sector_removals_standard",
    name_en: "GHG Protocol Land Sector and Removals Standard",
    name_zh: "GHG Protocol 土地部门与碳移除标准",
    category_key: "standard",
    category_en: "Standard",
    category_zh: "标准",
    role_en: "Land emissions and removals accounting standard",
    role_zh: "土地排放与碳移除核算标准",
    principle_en: "Quantify, report, and track land-sector emissions, CO2 removals, and related metrics.",
    principle_zh: "量化、报告和跟踪土地部门排放、二氧化碳移除及相关指标。",
    language_policy_en: "Use land-sector/removals wording; do not translate removals into corporate Scope totals unless cited that way.",
    language_policy_zh: "使用土地部门/移除口径；除非原文如此引用，不直接改写为企业 Scope 总量。",
    patterns: [
      /land sector and removals standard/i,
      /land-sector-and-removals-standard/i,
      /ghg protocol.*removals standard/i,
    ],
  },
  {
    id: "ghg_product_standard",
    name_en: "GHG Protocol Product Life Cycle Accounting and Reporting Standard",
    name_zh: "GHG Protocol 产品生命周期核算与报告标准",
    category_key: "standard",
    category_en: "Standard",
    category_zh: "标准",
    role_en: "Product life-cycle accounting standard",
    role_zh: "产品生命周期核算标准",
    principle_en: "Product-level life-cycle boundary; not a corporate Scope 1/2/3 total by itself.",
    principle_zh: "产品层生命周期边界，本身不等同于企业 Scope 1/2/3 总量。",
    language_policy_en: "Use product life-cycle wording unless the source also cites corporate Scope accounting.",
    language_policy_zh: "除非原文同时引用组织层 Scope 核算，否则使用产品生命周期口径。",
    patterns: [
      /product life cycle accounting and reporting standard/i,
      /\bghgp\b.*product life cycle/i,
      /ghg protocol product standard/i,
      /greenhouse gas protocol product standard/i,
    ],
  },
  {
    id: "ghg_cities_gpc",
    name_en: "Global Protocol for Community-Scale Greenhouse Gas Emission Inventories",
    name_zh: "社区规模温室气体排放清单全球协议（GPC）",
    category_key: "standard",
    category_en: "Standard",
    category_zh: "标准",
    role_en: "City and community inventory accounting standard",
    role_zh: "城市与社区清单核算标准",
    principle_en: "City-wide inventory accounting and reporting framework.",
    principle_zh: "城市范围温室气体清单核算与报告框架。",
    language_policy_en: "Use city/community inventory wording, not corporate Scope 1/2/3 wording.",
    language_policy_zh: "使用城市/社区清单口径，不套用企业 Scope 1/2/3 口径。",
    patterns: [
      /global protocol for community-scale greenhouse gas emission inventories/i,
      /global protocol for community-scale greenhouse gas inventories/i,
      /\bgpc\b.*greenhouse gas/i,
      /ghg protocol for cities/i,
    ],
  },
  {
    id: "ghg_mitigation_goal_standard",
    name_en: "GHG Protocol Mitigation Goal Standard",
    name_zh: "GHG Protocol 减缓目标标准",
    category_key: "policy_goal_standard",
    category_en: "Policy / goal standard",
    category_zh: "政策/目标标准",
    role_en: "Mitigation goal design and progress assessment standard",
    role_zh: "减缓目标设计与进展评估标准",
    principle_en: "Design mitigation goals and assess progress toward goal achievement.",
    principle_zh: "设计减缓目标并评估目标实现进展。",
    language_policy_en: "Use target/progress wording; not a direct corporate emissions inventory standard.",
    language_policy_zh: "使用目标/进展评估口径，不等同于企业排放清单标准。",
    patterns: [/mitigation goal standard/i],
  },
  {
    id: "ghg_policy_action_standard",
    name_en: "GHG Protocol Policy and Action Standard",
    name_zh: "GHG Protocol 政策与行动标准",
    category_key: "policy_goal_standard",
    category_en: "Policy / goal standard",
    category_zh: "政策/目标标准",
    role_en: "Policy and action effect accounting standard",
    role_zh: "政策与行动影响核算标准",
    principle_en: "Estimate and report the greenhouse gas effect of policies and actions.",
    principle_zh: "估计和报告政策与行动的温室气体影响。",
    language_policy_en: "Use policy/action effect wording; do not treat as a corporate Scope total.",
    language_policy_zh: "使用政策/行动影响口径，不直接作为企业 Scope 总量。",
    patterns: [/policy and action standard/i],
  },
  {
    id: "ghg_actions_market_instruments_standard",
    name_en: "GHG Protocol Actions and Market Instruments Standard",
    name_zh: "GHG Protocol 行动与市场工具标准",
    category_key: "market_instrument_standard",
    category_en: "Market-instrument standard",
    category_zh: "市场工具标准",
    role_en: "Actions and market instruments reporting standard",
    role_zh: "行动与市场工具报告标准",
    principle_en: "Classify and report action and market-instrument statements when explicitly cited.",
    principle_zh: "原文明示时，用于归类和报告行动与市场工具陈述。",
    language_policy_en: "Do not use this as a direct emissions inventory total.",
    language_policy_zh: "不作为直接排放清单总量口径。",
    patterns: [/actions and market instruments/i, /\bami standard\b/i],
  },
  {
    id: "ghg_scope2_guidance",
    name_en: "GHG Protocol Scope 2 Guidance",
    name_zh: "GHG Protocol Scope 2 指南",
    category_key: "guidance",
    category_en: "Guidance",
    category_zh: "指南",
    role_en: "Purchased electricity and energy method guidance",
    role_zh: "外购电力与能源口径指南",
    principle_en: "Location-based and market-based Scope 2 reporting are separated when cited.",
    principle_zh: "原文显式引用时区分位置法与市场法 Scope 2 披露。",
    language_policy_en: "Scope 2 market-based and location-based language is treated as GHG-specific.",
    language_policy_zh: "Scope 2 市场法/位置法术语只在 GHG Protocol 语境下使用。",
    patterns: [/scope 2 guidance/i],
  },
  {
    id: "ghg_scope3_calculation_guidance",
    name_en: "GHG Protocol Scope 3 Calculation Guidance",
    name_zh: "GHG Protocol Scope 3 计算指南",
    category_key: "guidance",
    category_en: "Guidance",
    category_zh: "指南",
    role_en: "Scope 3 inventory calculation guidance",
    role_zh: "Scope 3 清单计算指南",
    principle_en: "Companion calculation guidance for completing Scope 3 inventories.",
    principle_zh: "配套计算指南，用于完成 Scope 3 清单。",
    language_policy_en: "Scope 3 categories are GHG-specific and only shown when the source uses that wording.",
    language_policy_zh: "Scope 3 类别是 GHG 特有口径，仅在原文如此使用时展示。",
    patterns: [/scope 3 calculation guidance/i, /technical guidance for calculating scope 3 emissions/i],
  },
  {
    id: "ghg_agriculture_guidance",
    name_en: "GHG Protocol Agriculture Guidance",
    name_zh: "GHG Protocol 农业指南",
    category_key: "sector_guidance",
    category_en: "Sector guidance",
    category_zh: "行业指南",
    role_en: "Agriculture-sector supplement to the Corporate Standard",
    role_zh: "企业标准的农业部门补充指南",
    principle_en: "Agricultural emissions, livestock, crop production, and land-use change guidance.",
    principle_zh: "覆盖农业排放、畜牧、作物生产和土地利用变化。",
    language_policy_en: "Use sector guidance wording, not a standalone corporate Scope total.",
    language_policy_zh: "使用行业指南口径，不作为独立企业 Scope 总量。",
    patterns: [/agricultur(?:e|al) guidance/i, /agriculture sector.*ghg/i],
  },
  {
    id: "ghg_gpc_forests_trees_guidance",
    name_en: "GPC Supplemental Guidance for Forests and Trees",
    name_zh: "GPC 森林与树木补充指南",
    category_key: "supplemental_guidance",
    category_en: "Supplemental guidance",
    category_zh: "补充指南",
    role_en: "Community forests and trees emissions/removals guidance",
    role_zh: "社区森林与树木排放/移除补充指南",
    principle_en: "Identify, calculate, and report community-boundary emissions and removals from forests and trees.",
    principle_zh: "识别、计算和报告社区边界内森林与树木相关排放和移除。",
    language_policy_en: "Use community forests/trees wording, not corporate Scope totals.",
    language_policy_zh: "使用社区森林/树木口径，不套用企业 Scope 总量。",
    patterns: [/gpc supplemental guidance for forests and trees/i, /forests and trees.*gpc/i],
  },
  {
    id: "ghg_avoided_emissions_guidance",
    name_en: "GHG Protocol Estimating and Reporting Avoided Emissions",
    name_zh: "GHG Protocol 避免排放估算与报告指南",
    category_key: "guidance",
    category_en: "Guidance / working paper",
    category_zh: "指南/工作文件",
    role_en: "Avoided-emissions disclosure guidance",
    role_zh: "避免排放披露指南",
    principle_en: "Estimate and disclose positive and negative comparative product impacts.",
    principle_zh: "估算和披露产品比较影响中的正向与负向影响。",
    language_policy_en: "Avoided emissions are separate from inventory emissions unless the source explicitly links them.",
    language_policy_zh: "避免排放与清单排放分开处理，除非原文明示关联。",
    patterns: [/estimating and reporting avoided emissions/i],
  },
  {
    id: "ghg_public_sector_protocol",
    name_en: "GHG Protocol Public Sector Protocol",
    name_zh: "GHG Protocol 公共部门协议",
    category_key: "sector_guidance",
    category_en: "Sector guidance",
    category_zh: "行业指南",
    role_en: "Public-sector interpretation of the Corporate Standard",
    role_zh: "企业标准在公共部门的解释性指南",
    principle_en: "Interpret Corporate Standard principles for public-sector operations.",
    principle_zh: "面向公共部门运营解释企业标准原则。",
    language_policy_en: "Use public-sector operations wording, not corporate enterprise wording.",
    language_policy_zh: "使用公共部门运营口径，不强行改写为企业组织口径。",
    patterns: [/public sector protocol/i],
  },
  {
    id: "ghg_fossil_reserves_guidance",
    name_en: "GHG Protocol Potential Emissions from Fossil Fuel Reserves",
    name_zh: "GHG Protocol 化石燃料储量潜在排放指南",
    category_key: "sector_guidance",
    category_en: "Sector guidance",
    category_zh: "行业指南",
    role_en: "Fossil-fuel reserve potential emissions guidance",
    role_zh: "化石燃料储量潜在排放指南",
    principle_en: "Measure and report potential emissions from fossil-fuel reserves.",
    principle_zh: "测量和报告化石燃料储量的潜在排放。",
    language_policy_en: "Potential emissions are not direct corporate inventory emissions.",
    language_policy_zh: "潜在排放不等同于企业直接清单排放。",
    patterns: [/potential emissions from fossil fuel reserves/i, /fossil fuel reserves/i],
  },
  {
    id: "ghg_financial_industry_standard",
    name_en: "Global GHG Accounting and Reporting Standard for the Financial Industry",
    name_zh: "金融行业全球温室气体核算与报告标准",
    category_key: "sector_guidance",
    category_en: "Sector standard / guidance",
    category_zh: "行业标准/指南",
    role_en: "Financial-industry financed-emissions methodology",
    role_zh: "金融行业投融资排放方法学",
    principle_en: "Measure financed emissions for loans and investments when explicitly cited.",
    principle_zh: "原文明示时用于贷款和投资的投融资排放测算。",
    language_policy_en: "Use financed-emissions wording rather than corporate operational Scope totals.",
    language_policy_zh: "使用投融资排放口径，不改写为企业运营 Scope 总量。",
    patterns: [
      /global ghg accounting and reporting standard for the financial industry/i,
      /the global ghg accounting and reporting standard for the financial industry/i,
      /partnership for carbon accounting financials/i,
      /\bpcaf\b/i,
    ],
  },
  {
    id: "ghg_project_protocol",
    name_en: "GHG Protocol Project Protocol",
    name_zh: "GHG Protocol 项目减排核算协议",
    category_key: "project_protocol",
    category_en: "Project protocol",
    category_zh: "项目协议",
    role_en: "Project-level reduction accounting protocol",
    role_zh: "项目层减排核算协议",
    principle_en: "Project accounting and reductions; not a direct corporate inventory total.",
    principle_zh: "项目减排核算口径，不直接等同于企业组织层总排放。",
    language_policy_en: "Use project or reduction-accounting language for non-inventory evidence.",
    language_policy_zh: "项目证据使用项目减排口径，不直接改写成 Scope 口径。",
    patterns: [/project protocol/i, /project accounting/i, /the ghg protocol for project accounting/i, /ghg protocol for project accounting/i],
  },
  {
    id: "ghg_grid_connected_electricity_projects",
    name_en: "GHG Protocol Guidelines for Grid-Connected Electricity Projects",
    name_zh: "GHG Protocol 并网电力项目指南",
    category_key: "project_guidance",
    category_en: "Project guidance",
    category_zh: "项目指南",
    role_en: "Grid-connected electricity project accounting guidance",
    role_zh: "并网电力项目核算指南",
    principle_en: "Use project-level electricity generation and grid-displacement accounting; do not treat it as a corporate Scope total.",
    principle_zh: "使用项目层面的发电与电网替代核算口径，不直接等同于企业 Scope 总量。",
    language_policy_en: "Use grid-connected electricity project wording; Scope terminology is not promoted unless the source separately cites corporate inventory accounting.",
    language_policy_zh: "使用并网电力项目口径；除非原文另行引用企业清单核算，否则不提升为 Scope 术语。",
    patterns: [
      /guidelines for grid-connected electricity projects/i,
      /grid-connected electricity projects/i,
      /grid connected electricity projects/i,
    ],
  },
  {
    id: "ghg_brazilian_program",
    name_en: "Brazilian GHG Protocol Program",
    name_zh: "巴西 GHG Protocol 项目/计划",
    category_key: "program",
    category_en: "Program / adapted methodology",
    category_zh: "项目/本地化方法",
    role_en: "National GHG inventory reporting program adapted from GHG Protocol methodology",
    role_zh: "基于 GHG Protocol 方法本地化的国家温室气体清单报告项目",
    principle_en: "Use program/inventory wording; do not treat it as a named corporate Scope standard unless the source also cites that standard.",
    principle_zh: "使用项目/清单口径；除非原文另行引用企业核算标准，不直接等同为企业 Scope 标准。",
    language_policy_en: "Escopo/Scope wording is retained only in the Brazilian GHG Protocol evidence context.",
    language_policy_zh: "Escopo/Scope 术语仅在巴西 GHG Protocol 证据语境下保留。",
    patterns: [
      /programa brasileiro ghg protocol/i,
      /brazilian ghg protocol program/i,
      /registro p[úu]blico de emiss[õo]es do programa brasileiro ghg protocol/i,
      /selo ouro no programa ghg protocol/i,
      /ghg protocol\s*-\s*fgv/i,
    ],
  },
  {
    id: "ghg_generic_reference",
    name_en: "GHG Protocol generic reference",
    name_zh: "GHG Protocol 泛化引用",
    category_key: "review_required",
    category_en: "Review-required generic reference",
    category_zh: "待复核泛化引用",
    role_en: "Generic GHG Protocol mention requiring series review",
    role_zh: "需复核具体系列的 GHG Protocol 泛化引用",
    principle_en: "Do not infer the exact GHG Protocol series unless the cited text names it.",
    principle_zh: "原文未写明具体系列时，不硬推断企业采用了哪个 GHG Protocol 系列。",
    language_policy_en: "Scope wording may appear, but series assignment remains review-required.",
    language_policy_zh: "即便原文出现 Scope 术语，具体系列仍标记为待复核。",
    patterns: [],
  },
];

const CORE_GHG_PCAF_STANDARD_IDS = new Set([
  "ghg_policy_action_standard",
  "ghg_mitigation_goal_standard",
  "ghg_land_sector_removals_standard",
  "ghg_grid_connected_electricity_projects",
  "ghg_cities_gpc",
  "ghg_scope3_standard",
  "ghg_financial_industry_standard",
  "ghg_scope2_guidance",
  "ghg_scope3_calculation_guidance",
  "ghg_corporate_standard",
  "ghg_project_protocol",
  "ghg_product_standard",
]);

const SCOPE_LANGUAGE_RULES = {
  ghg_corporate_standard: {
    scope_terms_allowed: true,
    scope_terms_allowed_for: "Scope 1 and Scope 2 corporate inventory boundaries",
  },
  ghg_scope2_guidance: {
    scope_terms_allowed: true,
    scope_terms_allowed_for: "Scope 2 location-based and market-based electricity accounting",
  },
  ghg_scope3_standard: {
    scope_terms_allowed: true,
    scope_terms_allowed_for: "Scope 3 value-chain inventory and category language",
  },
  ghg_scope3_calculation_guidance: {
    scope_terms_allowed: true,
    scope_terms_allowed_for: "Scope 3 calculation methods and category data",
  },
  ghg_financial_industry_standard: {
    scope_terms_allowed: "limited",
    scope_terms_allowed_for: "financed-emissions / portfolio-emissions context; do not rewrite as operational Scope totals",
  },
};

const CORE_GHG_PCAF_STANDARD_DETAILS = {
  ghg_policy_action_standard: {
    aliases_en: ["Policy and Action Standard", "GHG Protocol Policy and Action Standard"],
    aliases_zh: ["政策与行动标准", "GHG Protocol 政策与行动标准"],
    applicable_boundary_en: "Policies and mitigation actions; estimates the GHG effect of interventions rather than corporate inventory totals.",
    applicable_boundary_zh: "政策与减缓行动影响评估；估算干预措施的温室气体影响，不作为企业清单总量。",
  },
  ghg_mitigation_goal_standard: {
    aliases_en: ["Mitigation Goal Standard", "GHG Protocol Mitigation Goal Standard"],
    aliases_zh: ["减缓目标标准", "GHG Protocol 减缓目标标准"],
    applicable_boundary_en: "Mitigation goal design and progress tracking; not a direct corporate emissions inventory standard.",
    applicable_boundary_zh: "减缓目标设计与进展跟踪；不直接作为企业排放清单核算标准。",
  },
  ghg_land_sector_removals_standard: {
    aliases_en: ["Land Sector and Removals Standard", "Land-Sector-and-Removals-Standard"],
    aliases_zh: ["土地部门与碳移除标准", "GHG Protocol 土地部门与碳移除标准"],
    applicable_boundary_en: "Land-sector emissions, removals, storage, and related land metrics.",
    applicable_boundary_zh: "土地部门排放、移除、碳储存及相关土地指标。",
  },
  ghg_grid_connected_electricity_projects: {
    aliases_en: ["Guidelines for Grid-Connected Electricity Projects", "Grid-Connected Electricity Projects"],
    aliases_zh: ["并网电力项目指南", "GHG Protocol 并网电力项目指南"],
    applicable_boundary_en: "Project-level grid-connected electricity generation and grid-displacement accounting.",
    applicable_boundary_zh: "项目层面的并网发电与电网替代核算。",
  },
  ghg_cities_gpc: {
    aliases_en: ["Global Protocol for Community-Scale Greenhouse Gas Inventories", "Global Protocol for Community-Scale Greenhouse Gas Emission Inventories", "GPC"],
    aliases_zh: ["社区规模温室气体清单全球协议", "社区规模温室气体排放清单全球协议", "GPC"],
    applicable_boundary_en: "City and community-scale GHG inventories, not corporate enterprise inventories.",
    applicable_boundary_zh: "城市与社区尺度温室气体清单，不作为企业组织清单。",
  },
  ghg_scope3_standard: {
    aliases_en: [
      "Corporate Value Chain (Scope 3) Accounting and Reporting Standard",
      "Corporate Value Chain (Scope 3)",
      "Scope 3 Standard",
      "Value Chain (Scope 3) Standard",
    ],
    aliases_zh: ["企业价值链（Scope 3）核算与报告标准", "Scope 3 标准", "价值链 Scope 3 标准"],
    applicable_boundary_en: "Corporate value-chain Scope 3 inventory categories and reporting.",
    applicable_boundary_zh: "企业价值链 Scope 3 清单类别与报告。",
  },
  ghg_financial_industry_standard: {
    aliases_en: [
      "The Global GHG Accounting and Reporting Standard for the Financial Industry",
      "Global GHG Accounting and Reporting Standard for the Financial Industry",
      "Partnership for Carbon Accounting Financials",
      "PCAF Standard",
      "PCAF",
    ],
    aliases_zh: ["金融行业全球温室气体核算与报告标准", "PCAF 标准", "PCAF", "碳核算金融联盟"],
    applicable_boundary_en: "Financial-industry financed emissions and portfolio emissions for loans and investments.",
    applicable_boundary_zh: "金融行业贷款、投资和组合的投融资排放核算。",
  },
  ghg_scope2_guidance: {
    aliases_en: ["Scope 2 Guidance", "GHG Protocol Scope 2 Guidance"],
    aliases_zh: ["Scope 2 指南", "GHG Protocol Scope 2 指南", "范围二指南"],
    applicable_boundary_en: "Purchased electricity, steam, heat, and cooling; location-based and market-based Scope 2 methods.",
    applicable_boundary_zh: "外购电力、蒸汽、供热和制冷；Scope 2 位置法与市场法。",
  },
  ghg_scope3_calculation_guidance: {
    aliases_en: ["Technical Guidance for Calculating Scope 3 Emissions", "Scope 3 Calculation Guidance"],
    aliases_zh: ["Scope 3 排放计算技术指南", "Scope 3 计算指南", "范围三计算指南"],
    applicable_boundary_en: "Scope 3 category calculation methods, data types, and emission-factor application.",
    applicable_boundary_zh: "Scope 3 类别计算方法、数据类型和排放因子应用。",
  },
  ghg_corporate_standard: {
    aliases_en: [
      "The GHG Protocol Corporate Accounting and Reporting Standard",
      "Greenhouse Gas Protocol Corporate Accounting and Reporting Standard",
      "GHG Protocol Corporate Standard",
      "Greenhouse Gas Protocol Corporate Standard",
      "Corporate Accounting and Reporting Standard",
      "Corporate Accounting Standard",
      "A Corporate Accounting Standard",
      "Corporate Standard",
    ],
    aliases_zh: ["企业核算与报告标准", "GHG Protocol 企业标准", "企业核算标准", "企业标准"],
    applicable_boundary_en: "Corporate organizational inventory accounting, including Scope 1 and Scope 2 boundaries.",
    applicable_boundary_zh: "企业组织层面清单核算，包括 Scope 1 和 Scope 2 边界。",
  },
  ghg_project_protocol: {
    aliases_en: ["The GHG Protocol for Project Accounting", "GHG Protocol Project Protocol", "Project Accounting Protocol"],
    aliases_zh: ["项目核算协议", "GHG Protocol 项目协议", "GHG Protocol 项目减排核算协议"],
    applicable_boundary_en: "Project-level baseline, project emissions, and GHG reduction accounting.",
    applicable_boundary_zh: "项目层面的基准线、项目排放和温室气体减排核算。",
  },
  ghg_product_standard: {
    aliases_en: ["Greenhouse Gas Protocol Product Life Cycle Accounting and Reporting Standard", "Product Life Cycle Accounting and Reporting Standard", "GHG Protocol Product Standard", "Greenhouse Gas Protocol Product Standard", "GHGP Product Standard"],
    aliases_zh: ["产品生命周期核算与报告标准", "GHG Protocol 产品标准", "产品生命周期标准"],
    applicable_boundary_en: "Product life-cycle GHG accounting and reporting; not a corporate Scope total by itself.",
    applicable_boundary_zh: "产品生命周期温室气体核算与报告；本身不作为企业 Scope 总量。",
  },
};

function ghgSeriesMetadata(series) {
  const rule = SCOPE_LANGUAGE_RULES[series.id] || {
    scope_terms_allowed: false,
    scope_terms_allowed_for: "Use direct/indirect emissions, project, product, target, policy, city/community, land-sector, or financed-emissions wording instead of Scope 1/2/3.",
  };
  const details = CORE_GHG_PCAF_STANDARD_DETAILS[series.id] || {};
  return {
    core_whitelist: CORE_GHG_PCAF_STANDARD_IDS.has(series.id),
    aliases_en: details.aliases_en || [],
    aliases_zh: details.aliases_zh || [],
    applicable_boundary_en: details.applicable_boundary_en || "",
    applicable_boundary_zh: details.applicable_boundary_zh || "",
    accepted_evidence_gate_en: "Accept only when page-level PDF text explicitly names this specific standard, official abbreviation, or strong alias.",
    accepted_evidence_gate_zh: "仅当 PDF 页级原文明确命名该具体标准、官方缩写或强别名时采信。",
    generic_reference_policy_en: "Generic 'GHG Protocol' mentions remain review-only and are not drawn as accepted graph edges.",
    generic_reference_policy_zh: "泛化 GHG Protocol 引用保留为复核数据，不画成已采信图谱边。",
    ...rule,
  };
}

const TECHNOLOGY_CLUSTERS = [
  {
    id: "renewable_power",
    name_en: "Renewable power and green electricity procurement",
    name_zh: "可再生电力与绿电采购",
    color: "#2f6f63",
    standards_en: ["GHG Protocol Scope 2 Guidance", "GHG Protocol Corporate Standard", "GRI 302 / 305"],
    standards_zh: ["GHG Protocol Scope 2 指南", "GHG Protocol 企业核算标准", "GRI 302 / 305"],
    patterns: [/renewable energy/i, /renewable electricity/i, /green electricity/i, /\bppa\b/i, /power purchase agreement/i, /solar/i, /wind/i, /onsite energy/i, /clean electricity/i],
    subtypes: [
      { id: "onsite_solar_wind", label_en: "Onsite solar or wind", label_zh: "园区/现场光伏与风电", patterns: [/onsite.*(solar|wind|renewable)/i, /(solar|wind).*onsite/i] },
      { id: "ppa_vppa", label_en: "PPA / VPPA procurement", label_zh: "PPA / VPPA 绿电采购", patterns: [/\bppa\b/i, /\bvppa\b/i, /power purchase agreement/i] },
      { id: "renewable_certificates", label_en: "Certificates / green tariffs", label_zh: "证书与绿色电价", patterns: [/certificate/i, /\brec\b/i, /green tariff/i] },
      { id: "grid_clean_power", label_en: "Grid clean-power transition", label_zh: "电网清洁电力转型", patterns: [/grid.*renewable/i, /clean electricity/i] },
    ],
  },
  {
    id: "electrified_transport",
    name_en: "Electrified transport",
    name_zh: "电动化运输",
    color: "#315f8c",
    standards_en: ["GHG Protocol Corporate Standard", "GHG Protocol Scope 3 Standard"],
    standards_zh: ["GHG Protocol 企业核算标准", "GHG Protocol Scope 3 标准"],
    patterns: [/electric vehicle/i, /\bev\b/i, /fleet electrification/i, /electrified fleet/i, /charging infrastructure/i, /hybrid vehicle/i, /zero emission vehicle/i],
    subtypes: [
      { id: "fleet_ev", label_en: "Owned fleet EV transition", label_zh: "自有车队电动化", patterns: [/fleet.*(electric|ev|electrification)/i, /(electric|ev).*fleet/i] },
      { id: "charging", label_en: "Charging infrastructure", label_zh: "充电基础设施", patterns: [/charging/i, /charger/i] },
      { id: "hybrid_hydrogen_vehicle", label_en: "Hybrid / hydrogen vehicles", label_zh: "混动与氢燃料车辆", patterns: [/hybrid vehicle/i, /hydrogen vehicle/i, /fuel cell vehicle/i] },
      { id: "route_optimization", label_en: "Route and logistics optimization", label_zh: "线路与物流优化", patterns: [/route optimization/i, /logistics optimization/i, /transport efficiency/i] },
    ],
  },
  {
    id: "battery_storage",
    name_en: "Battery and energy storage",
    name_zh: "电池与储能",
    color: "#8a6d1d",
    standards_en: ["GHG Protocol Scope 2 Guidance", "Product life-cycle evidence when cited"],
    standards_zh: ["GHG Protocol Scope 2 指南", "原文引用时的产品生命周期证据"],
    patterns: [/battery/i, /energy storage/i, /\bbess\b/i, /storage system/i, /stationary storage/i],
    subtypes: [
      { id: "stationary_storage", label_en: "Stationary / grid storage", label_zh: "固定式/电网侧储能", patterns: [/stationary storage/i, /grid storage/i, /\bbess\b/i] },
      { id: "battery_recycling", label_en: "Battery recycling", label_zh: "电池回收", patterns: [/battery recycling/i, /recycled battery/i] },
      { id: "ev_battery", label_en: "EV batteries", label_zh: "动力电池", patterns: [/ev battery/i, /electric vehicle battery/i] },
      { id: "backup_storage", label_en: "Backup and resilience storage", label_zh: "备电与韧性储能", patterns: [/backup.*battery/i, /resilience.*storage/i] },
    ],
  },
  {
    id: "hydrogen_methanol",
    name_en: "Hydrogen, methanol, and ammonia",
    name_zh: "氢能、甲醇与氨",
    color: "#2f6f8f",
    standards_en: ["Project-level and fuel-switching evidence", "GHG Protocol when explicitly cited"],
    standards_zh: ["项目层与燃料替代证据", "原文显式引用时的 GHG Protocol"],
    patterns: [/hydrogen/i, /green hydrogen/i, /ammonia/i, /methanol/i, /fuel cell/i],
    subtypes: [
      { id: "green_hydrogen", label_en: "Green hydrogen", label_zh: "绿氢", patterns: [/green hydrogen/i, /renewable hydrogen/i] },
      { id: "ammonia", label_en: "Ammonia", label_zh: "氨燃料/绿氨", patterns: [/ammonia/i] },
      { id: "methanol", label_en: "Methanol", label_zh: "甲醇", patterns: [/methanol/i] },
      { id: "fuel_cell", label_en: "Fuel cells", label_zh: "燃料电池", patterns: [/fuel cell/i] },
    ],
  },
  {
    id: "low_carbon_fuels",
    name_en: "Low-carbon fuels",
    name_zh: "低碳燃料",
    color: "#8b4b2f",
    standards_en: ["GHG Protocol Corporate Standard", "GHG Protocol Scope 3 Standard"],
    standards_zh: ["GHG Protocol 企业核算标准", "GHG Protocol Scope 3 标准"],
    patterns: [/biofuel/i, /sustainable aviation fuel/i, /\bsaf\b/i, /renewable diesel/i, /biogas/i, /low-carbon fuel/i, /alternative fuel/i],
    subtypes: [
      { id: "saf", label_en: "Sustainable aviation fuel", label_zh: "可持续航空燃料", patterns: [/sustainable aviation fuel/i, /\bsaf\b/i] },
      { id: "renewable_diesel", label_en: "Renewable diesel / biofuel", label_zh: "可再生柴油/生物燃料", patterns: [/renewable diesel/i, /biofuel/i] },
      { id: "biogas", label_en: "Biogas / biomethane", label_zh: "沼气/生物甲烷", patterns: [/biogas/i, /biomethane/i] },
    ],
  },
  {
    id: "energy_efficiency",
    name_en: "Advanced clean power and energy efficiency",
    name_zh: "先进清洁电力与能效提升",
    color: "#4f6f2f",
    standards_en: ["GHG Protocol Corporate Standard", "ISO 14064 when verified"],
    standards_zh: ["GHG Protocol 企业核算标准", "经核查时的 ISO 14064"],
    patterns: [/advanced clean power/i, /clean power/i, /nuclear/i, /\bsmr\b/i, /geothermal/i, /energy efficiency/i, /efficiency improvement/i, /electrification/i, /heat pump/i, /\bled\b/i, /building automation/i, /energy management/i],
    subtypes: [
      { id: "advanced_power", label_en: "Nuclear, SMR, and advanced clean power", label_zh: "核电、SMR 与先进清洁电力", patterns: [/nuclear/i, /\bsmr\b/i, /advanced clean power/i] },
      { id: "building_efficiency", label_en: "Building and facility efficiency", label_zh: "建筑/设施能效", patterns: [/building.*efficiency/i, /facility.*efficiency/i, /\bled\b/i] },
      { id: "industrial_electrification", label_en: "Industrial electrification", label_zh: "工业电气化", patterns: [/industrial electrification/i, /electrification/i] },
      { id: "heat_pumps", label_en: "Heat pumps / heating systems", label_zh: "热泵与供热系统", patterns: [/heat pump/i, /heating system/i] },
    ],
  },
  {
    id: "circular_recycling",
    name_en: "Circularity, recycling, and waste recovery",
    name_zh: "循环利用、回收与废弃物资源化",
    color: "#7a4f82",
    standards_en: ["Disclosure evidence", "GHG Protocol Scope 3 Standard when value-chain emissions are cited"],
    standards_zh: ["披露证据", "价值链排放被引用时的 GHG Protocol Scope 3 标准"],
    patterns: [/recycling/i, /recycled/i, /circular/i, /reuse/i, /waste recovery/i, /resource circulation/i, /closed loop/i],
    subtypes: [
      { id: "materials_recycling", label_en: "Materials recycling", label_zh: "材料回收", patterns: [/materials recycling/i, /recycled material/i] },
      { id: "waste_recovery", label_en: "Waste recovery", label_zh: "废弃物资源化", patterns: [/waste recovery/i, /waste recycling/i] },
      { id: "reuse_repair", label_en: "Reuse and repair", label_zh: "再使用与维修", patterns: [/reuse/i, /repair/i] },
    ],
  },
  {
    id: "low_carbon_materials",
    name_en: "Low-carbon materials and process changes",
    name_zh: "低碳材料与工艺改造",
    color: "#9b3b2f",
    standards_en: ["Product or process evidence", "GHG Protocol when inventory effects are cited"],
    standards_zh: ["产品/工艺证据", "涉及清单影响时的 GHG Protocol"],
    patterns: [/low-carbon material/i, /green steel/i, /low-carbon steel/i, /low-carbon cement/i, /sustainable material/i, /process improvement/i, /process emissions/i],
    subtypes: [
      { id: "steel_cement", label_en: "Steel, cement, and heavy materials", label_zh: "钢铁、水泥等高耗能材料", patterns: [/steel/i, /cement/i] },
      { id: "product_design", label_en: "Product redesign and substitution", label_zh: "产品设计与材料替代", patterns: [/product design/i, /material substitution/i, /sustainable material/i] },
      { id: "process_upgrade", label_en: "Process upgrade", label_zh: "工艺升级", patterns: [/process improvement/i, /process upgrade/i] },
    ],
  },
  {
    id: "carbon_management",
    name_en: "Carbon management, methane, CCUS, and removals",
    name_zh: "碳管理、甲烷、CCUS 与碳移除",
    color: "#3f5678",
    standards_en: ["GHG Protocol Corporate Standard", "Project Protocol / removals evidence when cited"],
    standards_zh: ["GHG Protocol 企业核算标准", "原文引用时的项目协议/移除证据"],
    patterns: [/carbon capture/i, /\bccus\b/i, /\bccs\b/i, /carbon removal/i, /carbon offset/i, /methane/i, /flaring/i, /carbon management/i],
    subtypes: [
      { id: "ccus", label_en: "CCUS / CCS", label_zh: "CCUS / CCS", patterns: [/carbon capture/i, /\bccus\b/i, /\bccs\b/i] },
      { id: "methane_flaring", label_en: "Methane and flaring reduction", label_zh: "甲烷与火炬减排", patterns: [/methane/i, /flaring/i] },
      { id: "removals_offsets", label_en: "Removals and offsets", label_zh: "碳移除与抵消", patterns: [/carbon removal/i, /offset/i] },
    ],
  },
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`Skip unreadable JSON: ${filePath} (${error.message})`);
    return null;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => clean(header));
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function readCsvRecords(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dirPath, name))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function loadEmbeddedGraphData(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, "utf8");
  const idIndex = html.indexOf("world500-generic-full-graph-data");
  if (idIndex < 0) return null;
  const start = html.indexOf(">", idIndex);
  const end = html.indexOf("</script>", start);
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(html.slice(start + 1, end));
  } catch (error) {
    console.warn(`Failed to parse embedded graph data from ${relativePath}: ${error.message}`);
    return null;
  }
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compactSnippet(value, maxLength = 360) {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function unique(values) {
  return [...new Set((values || []).map(clean).filter(Boolean))];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrZero(value) {
  const number = toNumber(value);
  return number === null ? 0 : number;
}

function yearNumber(value) {
  const match = String(value || "").match(/20\d{2}/);
  return match ? Number(match[0]) : 0;
}

function getCompanyMeta(company) {
  return {
    company_id: company.company_id || "",
    company_name_en: clean(company.company_name_en),
    company_name_zh: clean(company.company_name_zh),
    world500_rank: numberOrZero(company.world500_rank) || "",
    industry_label_zh: clean(company.industry_label_zh),
    industry_section_code: clean(company.industry_section_code) || "unknown",
    industry_section_en: clean(company.industry_section_en) || "Unknown",
    industry_section_zh: clean(company.industry_section_zh) || "未分类",
    industry_color: INDUSTRY_COLORS[clean(company.industry_section_code)] || INDUSTRY_COLORS.unknown,
  };
}

function evidenceText(row) {
  return clean([
    row.label_en,
    row.label_zh,
    row.standard_name_en,
    row.standard_name_zh,
    row.standard_family_en,
    row.standard_role_en,
    row.accounting_principle_en,
    row.recognition_basis_en,
    row.snippet_en,
    row.estimate_basis_en,
    row.data_source_type_en,
    row.data_source_class_en,
    row.data_source_class_basis_en,
    row.data_quality_flag_en,
    row.calculation_method_en,
    row.value_text,
    row.basis_en,
    row.basis_zh,
    row.boundary_en,
    row.boundary_zh,
    row.source_file,
  ].join(" "));
}

function expandedEvidenceText(record) {
  return clean([
    record.scope_en,
    record.scope_zh,
    record.scope2_reporting_method,
    record.basis_en,
    record.basis_zh,
    record.recognition_basis_en,
    record.snippet_en,
    record.original_snippet_en,
    record.source_file,
  ].join(" "));
}

function expandedContextForRow(row, expandedRecords) {
  const sourceFile = clean(row.source_file).toLowerCase();
  const matched = (expandedRecords || []).filter((record) => {
    if (!sourceFile) return true;
    return clean(record.source_file).toLowerCase() === sourceFile;
  });
  return matched.map(expandedEvidenceText).join(" ");
}

function matchExplicitGhgSeries(text) {
  return findExplicitGhgSeriesMatches(text).map((match) => match.series);
}

function findExplicitGhgSeriesMatches(text) {
  const sourceText = clean(text);
  if (!sourceText) return [];
  return GHG_SERIES.map((series) => {
    if (series.id === "ghg_generic_reference" || series.is_external_standard) return null;
    const matchedPattern = series.patterns.find((pattern) => pattern.test(sourceText));
    return matchedPattern ? { series, matched_alias: matchedPattern.source } : null;
  }).filter(Boolean);
}

function snippetAroundPattern(text, patternSource, radius = 180) {
  const sourceText = clean(text);
  if (!sourceText || !patternSource) return "";
  try {
    const match = sourceText.match(new RegExp(patternSource, "i"));
    if (!match || typeof match.index !== "number") return "";
    const start = Math.max(0, match.index - radius);
    const end = Math.min(sourceText.length, match.index + match[0].length + radius);
    return compactSnippet(sourceText.slice(start, end));
  } catch (error) {
    return "";
  }
}

function contextAroundPattern(text, patternSource, radius = 520) {
  const sourceText = clean(text);
  if (!sourceText || !patternSource) return "";
  try {
    const match = sourceText.match(new RegExp(patternSource, "i"));
    if (!match || typeof match.index !== "number") return "";
    const start = Math.max(0, match.index - radius);
    const end = Math.min(sourceText.length, match.index + match[0].length + radius);
    return sourceText.slice(start, end);
  } catch (error) {
    return "";
  }
}

function ghgExplicitSourceText(row, expandedContext = "") {
  return clean([
    ghgEvidenceAnchorText(row),
    expandedContext,
  ].join(" "));
}

function backfillExplicitSourceText(row) {
  return clean([
    row.snippet_en,
    row.snippet_zh,
    row.recognition_basis_en,
    row.recognition_basis_zh,
  ].join(" "));
}

function matchExplicitGhgSeriesFromStructuredText(text) {
  return GHG_SERIES.filter((series) => (
    series.id !== "ghg_generic_reference"
    && !series.is_external_standard
    && series.patterns.some((pattern) => pattern.test(text))
  ));
}

function hasGhgSeriesAcceptanceContext(text) {
  const sourceText = clean(text);
  if (!sourceText) return false;
  return /in accordance with|in line with|align(?:ed|ment)? (?:with|to)|adher(?:e|es|ed|ing) to|according to|under (?:the )?|basis set out (?:within|in)|participated in the pilot|pilot of the standard|since[\s\S]{0,80}published|calculated(?:\s+\w+){0,8}\s+(?:per|using|under|according to|in accordance with|based on|consistent with)|prepared(?:\s+\w+){0,8}\s+(?:using|under|according to|in accordance with|based on|consistent with)|using|uses|used|following|followed|based on|criteria|methodolog|accounted|guided|pursuant to|consistent with|conform(?:s|ed|ing)? to|reference to|draws on|defined by|defined in|classif(?:y|ies|ied)|standards? used|standards? including|recommended by|as recommended by|assessment[\s\S]{0,80}in line|we follow|we use|we also use|we apply|apply|applies|applied|verification conducted|assurance[\s\S]{0,120}against|report(?:ed|ing)?(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)|disclos(?:e|ed|ing)(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)|按照|依据|根据|参照|采用|使用|遵循|符合|依據|根據|參照|採用|遵循/i.test(sourceText);
}

function hasFinancedEmissionsMethodContext(text) {
  return /pcaf|partnership for carbon accounting financials|financed emissions|portfolio emissions|loans and investments|category\s*15/i.test(clean(text));
}

function hasSeriesSpecificAcceptanceContext(seriesId, text) {
  const sourceText = clean(text);
  if (!sourceText || !hasGhgSeriesAcceptanceContext(sourceText)) return false;
  if (seriesId !== "ghg_financial_industry_standard") return true;
  const hasNamedPcafStandard = /global ghg accounting and reporting standard for the financial industry|pcaf standard|partnership for carbon accounting financials|\bpcaf\b/i.test(sourceText);
  const hasFinanceBoundary = /financed(?: and facilitated)? emissions|facilitated emissions|portfolio emissions|insurance[-\s]+associated emissions|insured emissions|loans? and investments?|investment emissions|investments? emission|category\s*15|asset classes?|data quality score|pcaf score|listed equity|corporate bonds?|business loans?|project finance|commercial real estate|mortgages?|sovereign debt|lending\/capital markets|green bonds?|renewable energy power plants/i.test(sourceText);
  const hasMethodUse = /in accordance with|in line with|align(?:ed|ment)? (?:with|to)|adher(?:e|es|ed|ing) to|according to|under (?:the )?|basis set out (?:within|in)|calculated|calculation|methodolog|using|used|based on|consistent with|standards? including|standards? used|we use|we follow|we apply|apply|applies|applied|measured|accounted|refer(?:s|red|ring)? to|referencing|report(?:ed|ing)?(?:\s+\w+){0,8}\s+(?:under|using|according to|in accordance with|based on|consistent with)/i.test(sourceText);
  const membershipOnly = /member of pcaf|joined pcaf|pcaf signatory|pcaf member|partnership for carbon accounting financials is a global partnership/i.test(sourceText)
    && !/calculated|calculation|methodolog|using|used|based on|consistent with|standards? including|standards? used|in accordance with|in line with|we apply|apply|applies|applied|financed emissions|portfolio emissions/i.test(sourceText);
  const negativeUse = /(?:do|does|did)\s+not\s+(?:use|apply|follow)|not\s+(?:used|applied|followed)|pcaf[\s\S]{0,160}not\s+suitable|pcaf methodology[\s\S]{0,160}nonsensical|determined[\s\S]{0,160}pcaf[\s\S]{0,160}not\s+suitable|pcaf[\s\S]{0,80}lacks guidance|pcaf-like/i.test(sourceText);
  return hasNamedPcafStandard && hasMethodUse && hasFinanceBoundary && !membershipOnly && !negativeUse;
}

function emissionRecordBoundaryText(record) {
  if (!record) return "";
  return clean([
    record.scope_en,
    record.scope_zh,
    record.scope3_category_en,
    record.scope3_category_zh,
    record.boundary_en,
    record.emissions_boundary_en,
    record.basis_en,
    record.basis_zh,
    record.estimate_basis_en,
    record.estimate_basis_zh,
    record.recognition_basis_en,
    record.recognition_basis_zh,
    record.snippet_en,
    record.snippet_zh,
    record.original_snippet_en,
    record.source_file,
  ].join(" "));
}

function classifyScope3Boundary(record, industrySectionCode) {
  if (!record) {
    return {
      scope3_boundary_class_en: "",
      scope3_boundary_basis_en: "",
    };
  }
  const text = emissionRecordBoundaryText(record);
  const isFinance = clean(industrySectionCode) === "J";
  const negatedPcafSignal = /not\s+(?:a\s+)?pcaf|not\s+.*financed[-\s]emissions\s+value|not\s+.*financed\s+emissions/i.test(text);
  const pcafFinancedSignal = /pcaf|partnership for carbon accounting financials|financed emissions|portfolio emissions|insurance-associated emissions|loans and investments/i.test(text);
  const category15Signal = /category\s*15|category 15 investments/i.test(text);
  const operationalSignal = /operational|operations|business travel|employee commuting|purchased goods|waste generated|fuel- and energy-related|retail pharmacy|value chain|environmental sustainability|corporate responsibility|scope\s*1\s+ghg emissions|total scope\s*3/i.test(text);
  if (isFinance && (negatedPcafSignal || (operationalSignal && !pcafFinancedSignal && !category15Signal))) {
    return {
      scope3_boundary_class_en: "finance_operational_or_value_chain_scope3",
      scope3_boundary_basis_en: "Finance-sector company with Scope 3 evidence that appears operational or value-chain rather than PCAF financed-emissions evidence.",
    };
  }
  if (pcafFinancedSignal || (isFinance && category15Signal)) {
    return {
      scope3_boundary_class_en: "financed_emissions_or_pcaf",
      scope3_boundary_basis_en: "Scope 3 evidence text contains PCAF, financed/portfolio/insurance-associated emissions, loans and investments, or Category 15 wording.",
    };
  }
  if (isFinance && operationalSignal) {
    return {
      scope3_boundary_class_en: "finance_operational_or_value_chain_scope3",
      scope3_boundary_basis_en: "Finance-sector company with Scope 3 evidence that appears operational or value-chain rather than PCAF financed-emissions evidence.",
    };
  }
  if (isFinance) {
    return {
      scope3_boundary_class_en: "finance_scope3_boundary_review_required",
      scope3_boundary_basis_en: "Finance-sector company has a selected Scope 3 value, but the selected evidence does not explicitly identify PCAF/financed-emissions versus operational Scope 3 boundary.",
    };
  }
  return {
    scope3_boundary_class_en: "operational_or_value_chain_scope3",
    scope3_boundary_basis_en: "Non-finance company selected Scope 3 row; no PCAF/financed-emissions boundary signal required for the ranking gate.",
  };
}

function ghgEvidenceAnchorText(row) {
  const recognitionBasis = clean(row.recognition_basis_en || row.recognition_basis_zh);
  const keepRecognition = recognitionBasis && !/structured standard tag/i.test(recognitionBasis);
  return clean([
    row.accounting_principle_en,
    row.accounting_principle_zh,
    keepRecognition ? recognitionBasis : "",
    row.snippet_en,
    row.snippet_zh,
    row.estimate_basis_en,
    row.estimate_basis_zh,
    row.data_source_type_en,
    row.data_source_type_zh,
    row.data_source_class_en,
    row.data_source_class_zh,
    row.data_source_class_basis_en,
    row.data_source_class_basis_zh,
    row.data_quality_flag_en,
    row.data_quality_flag_zh,
    row.calculation_method_en,
    row.calculation_method_zh,
    row.source_file,
  ].join(" "));
}

function hasReadableGhgEvidence(row, expandedContext = "") {
  const anchorText = clean([ghgEvidenceAnchorText(row), expandedContext].join(" "));
  if (/^\s*nan\s*$/i.test(anchorText)) return false;
  return /ghg protocol|greenhouse gas protocol|温室气体核算体系|溫室氣體核算體系|programa brasileiro ghg protocol|protocolo ghg/i.test(anchorText)
    || /scope\s*[123]|范围[一二三]|範疇[一二三]|碳盘查|碳盤查|inventory|footprint|co2 emissions|carbon emissions|emiss[õo]es/i.test(anchorText);
}

function inferContextualGhgSeries(text, expandedContext) {
  const combined = clean([text, expandedContext].join(" "));
  const lower = combined.toLowerCase();
  const inferredIds = new Set();
  const hasScope1 = /\bscope\s*1\b|direct ghg emissions|direct emissions|范围一|範疇一|直接排放|escopo\s*1/i.test(combined);
  const hasScope2 = /\bscope\s*2\b|indirect ghg emissions|energy indirect|purchased electricity|market-based|location-based|范围二|範疇二|能源间接|能源間接|外购电|外購電|escopo\s*2/i.test(combined);
  const hasScope3 = /\bscope\s*3\b|value chain|upstream|downstream|purchased goods|sold products|supplier|supply chain|category\s*(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15)|范围三|範疇三|价值链|價值鏈|供应商|供應商|上游|下游|商务差旅|商務差旅|纸张|紙張|escopo\s*3/i.test(combined);
  const hasInventorySignal = /inventory|footprint|emissions by scope|ghg emissions|greenhouse gas emissions|co2 emissions|carbon emissions|operational control|equity share|organizational boundary|annual scope|scope 1\s*(,|and|&|\/)?\s*2|碳盘查|碳盤查|温室气体盘查|溫室氣體盤查|温室气体清单|温室氣體清單|组织边界|組織邊界|运营控制|營運控制|运行控制|invent[aá]rio|emiss[õo]es de gee|emiss[õo]es/i.test(combined);
  const hasScope3CategorySignal = /scope\s*3.*categor|category\s*(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15)|value chain|purchased goods|capital goods|fuel- and energy|upstream|downstream|business travel|employee commuting|leased assets|use of sold products|end-of-life|investments|范围三|範疇三|价值链|價值鏈|供应商|供應商|商务差旅|商務差旅|纸张|紙張|escopo\s*3/i.test(combined);
  const hasScope2MethodSignal = /scope\s*2|market-based|location-based|purchased electricity|renewable electricity|electricity purchases|energy indirect|范围二|範疇二|外购电|外購電|市场法|市場法|位置法|escopo\s*2/i.test(combined);

  if ((hasScope1 || hasScope2 || hasInventorySignal) && /emission|inventory|footprint|scope/.test(lower)) {
    inferredIds.add("ghg_corporate_standard");
  }
  if ((hasScope1 || hasScope2 || hasInventorySignal) && /温室气体|溫室氣體|碳盘查|碳盤查|范围|範疇/.test(combined)) {
    inferredIds.add("ghg_corporate_standard");
  }
  if (hasScope2 && hasScope2MethodSignal) {
    inferredIds.add("ghg_scope2_guidance");
  }
  if (hasScope3 && hasScope3CategorySignal) {
    inferredIds.add("ghg_scope3_standard");
  }
  if (hasScope3 && /calculation|methodolog|emission factor|supplier-specific|spend-based|activity data/i.test(combined)) {
    inferredIds.add("ghg_scope3_calculation_guidance");
  }
  if (/product life cycle|product carbon footprint|product-level|life-cycle assessment|lca/i.test(combined)) {
    inferredIds.add("ghg_product_standard");
  }
  if (/project protocol|project accounting|project-level|carbon offset|offset project|emission reduction project/i.test(combined)) {
    inferredIds.add("ghg_project_protocol");
  }
  if (/avoided emissions|estimating and reporting avoided emissions/i.test(combined)) {
    inferredIds.add("ghg_avoided_emissions_guidance");
  }
  if (/land sector|removals standard|carbon removals|co2 removals|land-use change|lulucf/i.test(combined)) {
    inferredIds.add("ghg_land_sector_removals_standard");
  }
  if (/programa brasileiro ghg protocol|registro p[úu]blico de emiss[õo]es do programa brasileiro ghg protocol|selo ouro no programa ghg protocol|ghg protocol\s*-\s*fgv/i.test(combined)) {
    inferredIds.add("ghg_brazilian_program");
  }

  return [...inferredIds]
    .map((id) => GHG_SERIES.find((series) => series.id === id))
    .filter(Boolean);
}

function rowEvidence(row) {
  return {
    report: clean(row.report_title_en || row.report_title || row.source_file),
    page: clean(row.evidence_page || row.page),
    source_file: clean(row.source_file),
    confidence: clean(row.confidence_level),
    review_status: clean(row.review_status),
    snippet_en: compactSnippet(row.snippet_en || row.recognition_basis_en || row.estimate_basis_en),
    snippet_zh: compactSnippet(row.snippet_zh || row.recognition_basis_zh || row.estimate_basis_zh || row.snippet_en || row.recognition_basis_en || row.estimate_basis_en),
  };
}

function backfillEvidence(row) {
  return {
    report: clean(row.source_file),
    page: clean(row.page),
    source_file: clean(row.source_file),
    confidence: "pdf_page_backfill",
    review_status: clean(row.match_status),
    snippet_en: compactSnippet(row.snippet_en || row.recognition_basis_en),
    snippet_zh: compactSnippet(row.snippet_zh || row.snippet_en || row.recognition_basis_zh || row.recognition_basis_en),
  };
}

function addMapItem(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function loadGhgSeriesBackfill() {
  const map = new Map();
  if (!fs.existsSync(GHG_SERIES_BACKFILL_FILE)) return map;
  const payload = readJson(GHG_SERIES_BACKFILL_FILE);
  if (!payload || !Array.isArray(payload.records)) return map;
  payload.records.forEach((record) => addMapItem(map, clean(record.company_id), record));
  return map;
}

function classifyGhgSeries(company, meta, expandedRecords = [], backfillRows = []) {
  const evidenceRows = [];
  const sourceRows = [
    ...(Array.isArray(company.standards) ? company.standards : []),
    ...(Array.isArray(company.evidence_ledger) ? company.evidence_ledger.filter((row) => /standard/i.test(clean(row.fact_type_en))) : []),
  ];

  sourceRows.forEach((row) => {
    const text = evidenceText(row);
    const hasGhgProtocolText = /ghg protocol|greenhouse gas protocol/i.test(text);
    const hasPcafText = hasFinancedEmissionsMethodContext(text);
    if (!hasGhgProtocolText && !hasPcafText) return;
    const expandedContext = expandedContextForRow(row, expandedRecords);
    const explicitSourceText = ghgExplicitSourceText(row, expandedContext);
    const explicitMatches = findExplicitGhgSeriesMatches(explicitSourceText);
    const matchedSeries = explicitMatches.map((match) => match.series);
    if (!matchedSeries.length && hasFinancedEmissionsMethodContext(`${text} ${expandedContext}`)) return;
    const matchedIds = new Set(matchedSeries.map((series) => series.id));
    const matchedAliasById = new Map(explicitMatches.map((match) => [match.series.id, match.matched_alias]));
    const inferredSeries = inferContextualGhgSeries(text, expandedContext)
      .filter((series) => !matchedIds.has(series.id));
    const targets = [...matchedSeries, ...inferredSeries];
    if (!targets.length && hasReadableGhgEvidence(row, expandedContext)) {
      targets.push(GHG_SERIES.find((series) => series.id === "ghg_generic_reference"));
    }
    targets.forEach((series) => {
      const isInferredFromExplicitSnippet = !matchedIds.has(series.id) && matchedIds.size > 0 && series.id !== "ghg_generic_reference";
      const matchedAlias = matchedAliasById.get(series.id) || "";
      const acceptanceWindow = contextAroundPattern(explicitSourceText, matchedAlias) || explicitSourceText;
      const isAcceptedCoreExplicit = matchedIds.has(series.id)
        && CORE_GHG_PCAF_STANDARD_IDS.has(series.id)
        && hasSeriesSpecificAcceptanceContext(series.id, acceptanceWindow);
      const evidence = rowEvidence(row);
      const matchedSnippet = isAcceptedCoreExplicit ? snippetAroundPattern(explicitSourceText, matchedAlias) : "";
      if (matchedSnippet) {
        evidence.snippet_en = matchedSnippet;
        evidence.snippet_zh = matchedSnippet;
      }
      evidenceRows.push({
        series_id: series.id,
        match_status: isAcceptedCoreExplicit
          ? "explicit_series_citation"
          : (series.id === "ghg_generic_reference"
            ? "generic_ghg_reference_review_required"
            : (isInferredFromExplicitSnippet ? "contextual_overmapped_review" : "contextual_scope_inventory_mapping")),
        matched_alias: matchedAlias,
        evidence_gate: isAcceptedCoreExplicit
          ? "page_text_explicitly_names_whitelisted_series"
          : (series.id === "ghg_generic_reference"
            ? "generic_ghg_reference_review_only"
            : "no_explicit_whitelisted_series_name_in_page_text"),
        evidence,
      });
    });
  });

  (backfillRows || []).forEach((row) => {
    const definition = GHG_SERIES.find((series) => series.id === clean(row.series_id));
    if (!definition || definition.id === "ghg_generic_reference" || definition.is_external_standard) return;
    const backfillText = backfillExplicitSourceText(row);
    const backfillMatches = findExplicitGhgSeriesMatches(backfillText);
    const namedBackfillIds = new Set(backfillMatches.map((match) => match.series.id));
    const matchedAliasById = new Map(backfillMatches.map((match) => [match.series.id, match.matched_alias]));
    const rawMatchStatus = clean(row.match_status) || "pdf_contextual_scope_inventory_mapping";
    namedBackfillIds.forEach((seriesId) => {
      const namedDefinition = GHG_SERIES.find((series) => series.id === seriesId);
      if (!namedDefinition || !CORE_GHG_PCAF_STANDARD_IDS.has(namedDefinition.id)) return;
      const matchedAlias = matchedAliasById.get(namedDefinition.id) || "";
      const acceptanceWindow = contextAroundPattern(backfillText, matchedAlias) || backfillText;
      if (!hasSeriesSpecificAcceptanceContext(namedDefinition.id, acceptanceWindow)) return;
      evidenceRows.push({
        series_id: namedDefinition.id,
        match_status: "pdf_explicit_series_citation",
        matched_alias: matchedAlias,
        evidence_gate: "page_text_explicitly_names_whitelisted_series",
        evidence: {
          ...backfillEvidence(row),
          snippet_en: snippetAroundPattern(backfillText, matchedAlias) || backfillEvidence(row).snippet_en,
          snippet_zh: snippetAroundPattern(backfillText, matchedAlias) || backfillEvidence(row).snippet_zh,
        },
      });
    });
    if (hasFinancedEmissionsMethodContext(backfillText) && !namedBackfillIds.has(definition.id)) {
      if (namedBackfillIds.size > 0) {
        evidenceRows.push({
          series_id: definition.id,
          match_status: "contextual_overmapped_review",
          matched_alias: "",
          evidence_gate: "no_explicit_whitelisted_series_name_in_page_text",
          evidence: backfillEvidence(row),
        });
      }
      return;
    }
    const isContextualBackfill = rawMatchStatus === "contextual_scope_inventory_mapping" || rawMatchStatus === "pdf_contextual_scope_inventory_mapping";
    let matchStatus = isContextualBackfill && namedBackfillIds.size > 0 && !namedBackfillIds.has(definition.id)
      ? "contextual_overmapped_review"
      : rawMatchStatus;
    if ((matchStatus === "explicit_series_citation" || matchStatus === "pdf_explicit_series_citation")
      && (!CORE_GHG_PCAF_STANDARD_IDS.has(definition.id)
        || !namedBackfillIds.has(definition.id)
        || !hasSeriesSpecificAcceptanceContext(
          definition.id,
          contextAroundPattern(backfillText, matchedAliasById.get(definition.id) || "") || backfillText,
        ))) {
      matchStatus = "contextual_scope_inventory_mapping";
    }
    evidenceRows.push({
      series_id: definition.id,
      match_status: matchStatus,
      matched_alias: matchedAliasById.get(definition.id) || "",
      evidence_gate: (matchStatus === "explicit_series_citation" || matchStatus === "pdf_explicit_series_citation")
        ? "page_text_explicitly_names_whitelisted_series"
        : "no_explicit_whitelisted_series_name_in_page_text",
      evidence: {
        ...backfillEvidence(row),
        snippet_en: snippetAroundPattern(backfillText, matchedAliasById.get(definition.id) || "") || backfillEvidence(row).snippet_en,
        snippet_zh: snippetAroundPattern(backfillText, matchedAliasById.get(definition.id) || "") || backfillEvidence(row).snippet_zh,
      },
    });
  });

  if (!evidenceRows.length) return null;

  const grouped = new Map();
  evidenceRows.forEach((item) => addMapItem(grouped, item.series_id, item));
  if (grouped.size > 1 && grouped.has("ghg_generic_reference")) grouped.delete("ghg_generic_reference");
  const series = [...grouped.entries()].map(([seriesId, rows]) => {
    const definition = GHG_SERIES.find((item) => item.id === seriesId);
    const sortedRows = [...rows].sort((a, b) => {
      const aExplicit = a.match_status === "explicit_series_citation" || a.match_status === "pdf_explicit_series_citation";
      const bExplicit = b.match_status === "explicit_series_citation" || b.match_status === "pdf_explicit_series_citation";
      const aAlias = clean(a.matched_alias) ? 1 : 0;
      const bAlias = clean(b.matched_alias) ? 1 : 0;
      return Number(bExplicit) - Number(aExplicit) || bAlias - aAlias;
    });
    const matchStatus = rows.some((row) => row.match_status === "explicit_series_citation" || row.match_status === "pdf_explicit_series_citation")
      ? "explicit_series_citation"
      : (rows.some((row) => row.match_status === "contextual_overmapped_review")
        ? "contextual_overmapped_review"
        : (rows.some((row) => row.match_status === "contextual_scope_inventory_mapping" || row.match_status === "pdf_contextual_scope_inventory_mapping")
          ? "contextual_scope_inventory_mapping"
          : "generic_ghg_reference_review_required"));
    return {
      series_id: seriesId,
      name_en: definition.name_en,
      name_zh: definition.name_zh,
      category_key: definition.category_key,
      category_en: definition.category_en,
      category_zh: definition.category_zh,
      match_status: matchStatus,
      evidence_count: rows.length,
      matched_aliases: unique(rows.map((row) => row.matched_alias)).slice(0, 5),
      evidence_gate: matchStatus === "explicit_series_citation"
        ? "page_text_explicitly_names_whitelisted_series"
        : (seriesId === "ghg_generic_reference"
          ? "generic_ghg_reference_review_only"
          : "no_explicit_whitelisted_series_name_in_page_text"),
      overmapped_review_evidence_count: rows.filter((row) => row.match_status === "contextual_overmapped_review").length,
      pages: unique(sortedRows.map((row) => row.evidence.page)).slice(0, 8),
      source_files: unique(sortedRows.map((row) => row.evidence.source_file)).slice(0, 4),
      evidence_samples: sortedRows.map((row) => ({
        ...row.evidence,
        matched_alias: clean(row.matched_alias),
        evidence_gate: clean(row.evidence_gate),
        match_status: clean(row.match_status),
      })).slice(0, 3),
    };
  });

  const explicitSeries = series.filter((item) => item.match_status === "explicit_series_citation");
  const contextualSeries = series.filter((item) => item.match_status === "contextual_scope_inventory_mapping");
  const overmappedReviewSeries = series.filter((item) => item.match_status === "contextual_overmapped_review");
  const genericReferenceEvidenceCount = series
    .filter((item) => item.series_id === "ghg_generic_reference")
    .reduce((sum, item) => sum + item.evidence_count, 0);

  return {
    ...meta,
    series,
    explicit_series_count: explicitSeries.length,
    accepted_series_count: explicitSeries.length,
    resolved_series_count: explicitSeries.length,
    contextual_series_count: contextualSeries.length,
    overmapped_review_series_count: overmappedReviewSeries.length,
    review_series_count: contextualSeries.length + overmappedReviewSeries.length,
    non_generic_series_count: series.filter((item) => item.series_id !== "ghg_generic_reference").length,
    generic_reference_count: genericReferenceEvidenceCount,
  };
}

function loadGhgSeriesAcceptanceLedgerMappings(companiesById) {
  if (!fs.existsSync(GHG_SERIES_ACCEPTANCE_LEDGER_FILE)) return [];
  const payload = readJson(GHG_SERIES_ACCEPTANCE_LEDGER_FILE);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const grouped = new Map();
  rows.forEach((row) => {
    const companyId = clean(row.company_id);
    const seriesId = clean(row.series_id);
    if (!companyId || !seriesId || !CORE_GHG_PCAF_STANDARD_IDS.has(seriesId)) return;
    const company = companiesById.get(companyId);
    if (!company) return;
    addMapItem(grouped, companyId, row);
  });
  return [...grouped.entries()].map(([companyId, companyRows]) => {
    const company = companiesById.get(companyId);
    const meta = getCompanyMeta(company);
    const seriesRowsById = new Map();
    companyRows.forEach((row) => addMapItem(seriesRowsById, clean(row.series_id), row));
    const series = [...seriesRowsById.entries()].map(([seriesId, seriesRows]) => {
      const definition = GHG_SERIES.find((item) => item.id === seriesId);
      const sortedRows = [...seriesRows].sort((a, b) => {
        const score = { accepted: 0, review: 1, demoted: 2 };
        return (score[clean(a.decision_bucket)] ?? 9) - (score[clean(b.decision_bucket)] ?? 9);
      });
      const bucket = sortedRows.some((row) => clean(row.decision_bucket) === "accepted")
        ? "accepted"
        : sortedRows.some((row) => clean(row.decision_bucket) === "review")
          ? "review"
          : "demoted";
      const matchStatus = bucket === "accepted"
        ? "explicit_series_citation"
        : bucket === "review"
          ? "contextual_scope_inventory_mapping"
          : "demoted_generic_or_contextual_mapping";
      return {
        series_id: seriesId,
        name_en: clean(definition?.name_en || sortedRows[0]?.series_name_en),
        name_zh: clean(definition?.name_zh || sortedRows[0]?.series_name_zh),
        category_key: clean(definition?.category_key || sortedRows[0]?.category_en),
        category_en: clean(definition?.category_en || sortedRows[0]?.category_en),
        category_zh: clean(definition?.category_zh || sortedRows[0]?.category_zh),
        match_status: matchStatus,
        decision_bucket: bucket,
        decision_statuses: unique(sortedRows.map((row) => row.decision_status)),
        evidence_count: sortedRows.reduce((sum, row) => sum + Math.max(1, numberOrZero(row.evidence_count)), 0),
        matched_aliases: unique(sortedRows.flatMap((row) => clean(row.matched_aliases).split(/[|;]/))).slice(0, 5),
        evidence_gate: unique(sortedRows.map((row) => row.evidence_gate)).join(" | "),
        overmapped_review_evidence_count: sortedRows.filter((row) => clean(row.decision_status) === "demoted_overmapped_edge_not_accepted").length,
        pages: unique(sortedRows.flatMap((row) => clean(row.pages).split(/[|;]/))).slice(0, 8),
        source_files: unique(sortedRows.flatMap((row) => clean(row.source_files).split(/[|;]/))).slice(0, 4),
        evidence_samples: sortedRows.map((row) => ({
          report: clean(row.source_files),
          page: clean(row.pages),
          source_file: clean(row.source_files),
          confidence: clean(row.sample_confidence),
          review_status: clean(row.decision_status),
          snippet_en: compactSnippet(row.sample_snippet_en, 360),
          snippet_zh: compactSnippet(row.sample_snippet_zh || row.sample_snippet_en, 360),
          matched_alias: clean(row.matched_aliases),
          evidence_gate: clean(row.evidence_gate),
          match_status: matchStatus,
          decision_bucket: bucket,
          decision_status: clean(row.decision_status),
        })).slice(0, 3),
      };
    });
    return {
      ...meta,
      series,
      explicit_series_count: series.filter((item) => item.decision_bucket === "accepted").length,
      accepted_series_count: series.filter((item) => item.decision_bucket === "accepted").length,
      resolved_series_count: series.filter((item) => item.decision_bucket === "accepted").length,
      contextual_series_count: series.filter((item) => item.decision_bucket === "review").length,
      overmapped_review_series_count: series.filter((item) => item.decision_bucket === "demoted").length,
      review_series_count: series.filter((item) => item.decision_bucket === "review").length,
      demoted_series_count: series.filter((item) => item.decision_bucket === "demoted").length,
      non_generic_series_count: series.length,
      generic_reference_count: 0,
    };
  }).sort((a, b) => numberOrZero(a.world500_rank) - numberOrZero(b.world500_rank));
}
function loadExpandedEvidence(companiesById) {
  const recordsByCompany = new Map();
  listJsonFiles(EXPANDED_DIR).forEach((filePath) => {
    const payload = readJson(filePath);
    if (!payload || !Array.isArray(payload.records)) return;
    payload.records.forEach((record) => {
      const companyId = clean(record.company_id || payload.company_id);
      if (!companyId) return;
      const enriched = {
        ...record,
        ...getCompanyMeta(companiesById.get(companyId) || record),
      };
      addMapItem(recordsByCompany, companyId, enriched);
    });
  });
  if (fs.existsSync(MANUAL_EMISSIONS_CORRECTIONS_FILE)) {
    const payload = readJson(MANUAL_EMISSIONS_CORRECTIONS_FILE);
    (payload.records || []).forEach((record) => {
      const companyId = clean(record.company_id);
      if (!companyId) return;
      const enriched = {
        ...record,
        source_layer: clean(record.source_layer) || "authoritative_structured",
        acceptance_tier_code: clean(record.acceptance_tier_code) || "A1",
        confidence_level: clean(record.confidence_level) || "high",
        review_status: clean(record.review_status) || "manual_corrected_from_pdf_table",
        is_complete: record.is_complete !== false,
        matched_parts: record.matched_parts || {
          scope: true,
          value: true,
          unit: true,
          year: true,
          scope2_method: true,
        },
        missing_parts: Array.isArray(record.missing_parts) ? record.missing_parts : [],
        conflict_parts: Array.isArray(record.conflict_parts) ? record.conflict_parts : [],
        ...getCompanyMeta(companiesById.get(companyId) || record),
      };
      addMapItem(recordsByCompany, companyId, enriched);
    });
  }
  return recordsByCompany;
}

function isStrongExpandedRecord(record) {
  const conflicts = Array.isArray(record.conflict_parts) ? record.conflict_parts : [];
  return record.is_complete === true
    && conflicts.length === 0
    && clean(record.source_layer) === "authoritative_structured"
    && clean(record.acceptance_tier_code) === "A1"
    && clean(record.confidence_level).toLowerCase() === "high"
    && clean(record.inventory_year)
    && clean(record.source_file)
    && clean(record.evidence_page)
    && toNumber(record.value_mtco2e) !== null;
}

function scopeBucket(record) {
  const scope = clean(record.scope_en || record.scope_zh).toLowerCase();
  if (/scope\s*1|范围\s*1|范畴\s*1/.test(scope)) return "scope1";
  if (/scope\s*3|范围\s*3|范畴\s*3/.test(scope)) return "scope3";
  if (/scope\s*2|范围\s*2|范畴\s*2/.test(scope)) {
    const method = clean(record.scope2_reporting_method || record.basis_en || record.scope2_reporting_method_zh || record.basis_zh).toLowerCase();
    if (/market/.test(method) || /市场/.test(method)) return "scope2_market";
    if (/location/.test(method) || /位置/.test(method)) return "scope2_location";
    return "scope2_unknown";
  }
  return "";
}

function scope2MethodLabel(record) {
  return clean(record?.scope2_reporting_method || record?.basis_en || record?.scope2_reporting_method_zh || record?.basis_zh);
}

function hasAcceptedScope2Method(record) {
  const method = scope2MethodLabel(record).toLowerCase();
  return Boolean(method) && !/unspecified|unknown|n\/a|not specified/.test(method);
}

function matchedPart(record, key) {
  const parts = record && typeof record.matched_parts === "object" ? record.matched_parts : {};
  return parts[key] === true;
}

function unitEvidenceLabel(record) {
  const explicitUnit = clean(record?.unit_en || record?.unit || record?.unit_zh);
  if (explicitUnit) return explicitUnit;
  const text = clean([
    record?.snippet_en,
    record?.snippet_zh,
    record?.original_snippet_en,
    record?.recognition_basis_en,
  ].join(" "));
  const match = text.match(/\b(?:MMT|Mt|MT|metric tons?|tonnes?|t)\s*CO2e\b|\btCO2e\b|\bCO2\s*equivalent\b|\bCO2eq\b/i);
  if (match) return match[0];
  return matchedPart(record, "unit") ? "unit_matched_in_page_text" : "";
}

function selectedRowBoundary(record, scope3Boundary) {
  const bucket = scopeBucket(record);
  const explicitBoundary = clean(record?.boundary_en || record?.emissions_boundary_en);
  if (bucket === "scope3") {
    return {
      boundary_class_en: scope3Boundary.scope3_boundary_class_en || "scope3_boundary_review_required",
      boundary_basis_en: explicitBoundary || scope3Boundary.scope3_boundary_basis_en || "Selected Scope 3 row requires boundary review.",
    };
  }
  if (bucket === "scope1") {
    return {
      boundary_class_en: "corporate_direct_scope1_inventory",
      boundary_basis_en: explicitBoundary || "Selected page-level row names Scope 1 direct GHG emissions; treated as corporate direct-emissions inventory evidence.",
    };
  }
  if (bucket === "scope2_market" || bucket === "scope2_location" || bucket === "scope2_unknown") {
    return {
      boundary_class_en: "corporate_energy_indirect_scope2_inventory",
      boundary_basis_en: explicitBoundary || `Selected page-level row names Scope 2 ${scope2MethodLabel(record) || "method"} emissions; treated as corporate energy-indirect inventory evidence.`,
    };
  }
  return {
    boundary_class_en: explicitBoundary ? "explicit_boundary" : "",
    boundary_basis_en: explicitBoundary,
  };
}

function selectedRowMissingEvidence(record, scope3Boundary) {
  const missing = [];
  const bucket = scopeBucket(record);
  const unitEvidence = unitEvidenceLabel(record);
  const boundary = selectedRowBoundary(record, scope3Boundary);
  if (!clean(record?.evidence_page)) missing.push("page");
  if (!clean(record?.source_file)) missing.push("source");
  if (!clean(record?.snippet_en || record?.snippet_zh || record?.original_snippet_en)) missing.push("snippet");
  if (!clean(record?.inventory_year)) missing.push("year");
  if (toNumber(record?.value_mtco2e) === null) missing.push("value");
  if (!unitEvidence) missing.push("unit");
  if (!boundary.boundary_class_en) missing.push("boundary");
  if ((bucket === "scope2_market" || bucket === "scope2_location" || bucket === "scope2_unknown") && !hasAcceptedScope2Method(record)) {
    missing.push("scope2_method");
  }
  if (bucket === "scope3" && boundary.boundary_class_en === "finance_scope3_boundary_review_required") {
    missing.push("finance_scope3_boundary");
  }
  return missing;
}

function selectBestRecord(records) {
  return (records || [])
    .slice()
    .sort((a, b) => {
      const yearDiff = yearNumber(b.inventory_year) - yearNumber(a.inventory_year);
      if (yearDiff) return yearDiff;
      const confidenceDiff = (clean(b.confidence_level).toLowerCase() === "high" ? 1 : 0) - (clean(a.confidence_level).toLowerCase() === "high" ? 1 : 0);
      if (confidenceDiff) return confidenceDiff;
      return clean(b.snippet_en).length - clean(a.snippet_en).length;
    })[0] || null;
}

function methodPreference(record) {
  const bucket = scopeBucket(record);
  if (bucket === "scope2_market") return 3;
  if (bucket === "scope2_location") return 2;
  if (bucket === "scope2_unknown") return 1;
  return 0;
}

function selectBestScopeSet(buckets) {
  const scope2Candidates = [
    ...(buckets.scope2_market || []),
    ...(buckets.scope2_location || []),
    ...(buckets.scope2_unknown || []),
  ];
  const alignedComplete = [];
  for (const scope1 of buckets.scope1 || []) {
    for (const scope2 of scope2Candidates) {
      for (const scope3 of buckets.scope3 || []) {
        if (!hasAcceptedScope2Method(scope2)) continue;
        const years = unique([scope1, scope2, scope3].map((record) => clean(record.inventory_year)));
        if (years.length !== 1) continue;
        alignedComplete.push({ scope1, scope2, scope3, year: yearNumber(years[0]) });
      }
    }
  }
  if (alignedComplete.length) {
    return alignedComplete
      .sort((a, b) => {
        const yearDiff = b.year - a.year;
        if (yearDiff) return yearDiff;
        const methodDiff = methodPreference(b.scope2) - methodPreference(a.scope2);
        if (methodDiff) return methodDiff;
        const totalA = numberOrZero(a.scope1.value_mtco2e) + numberOrZero(a.scope2.value_mtco2e) + numberOrZero(a.scope3.value_mtco2e);
        const totalB = numberOrZero(b.scope1.value_mtco2e) + numberOrZero(b.scope2.value_mtco2e) + numberOrZero(b.scope3.value_mtco2e);
        return totalB - totalA;
      })[0];
  }
  return {
    scope1: selectBestRecord(buckets.scope1),
    scope2: selectBestRecord(scope2Candidates),
    scope3: selectBestRecord(buckets.scope3),
  };
}

function conflictGroupKey(record) {
  return [
    clean(record.company_id),
    scopeBucket(record),
    clean(record.inventory_year),
    clean(record.scope2_reporting_method || record.basis_en || "unspecified").toLowerCase(),
  ].join("__");
}

function buildEmissionRankings(recordsByCompany) {
  const available = [];
  recordsByCompany.forEach((records, companyId) => {
    const deduped = new Map();
    records.forEach((record) => {
      const key = clean(record.evidence_key) || [companyId, record.scope_en, record.scope2_reporting_method, record.inventory_year, record.value_mtco2e, record.evidence_page, record.source_file].join("__");
      if (!deduped.has(key)) deduped.set(key, record);
    });

    const allRecords = [...deduped.values()];
    const strongRecords = allRecords.filter(isStrongExpandedRecord);
    if (!strongRecords.length) return;

    const conflictKeys = new Set();
    const grouped = new Map();
    strongRecords.forEach((record) => addMapItem(grouped, conflictGroupKey(record), record));
    grouped.forEach((groupRows, groupKey) => {
      const values = unique(groupRows.map((record) => String(numberOrZero(record.value_mtco2e))));
      if (values.length > 1) conflictKeys.add(groupKey);
    });
    const usableRecords = strongRecords.filter((record) => !conflictKeys.has(conflictGroupKey(record)));
    if (!usableRecords.length) return;

    const buckets = {
      scope1: [],
      scope2_market: [],
      scope2_location: [],
      scope2_unknown: [],
      scope3: [],
    };
    usableRecords.forEach((record) => {
      const bucket = scopeBucket(record);
      if (bucket && buckets[bucket]) buckets[bucket].push(record);
    });

    const selected = selectBestScopeSet(buckets);
    const selectedScope2 = selected.scope2;
    const selectedScope2Method = selectedScope2 ? scope2MethodLabel(selectedScope2) : "";
    const selectedScope2HasMethod = selectedScope2 ? hasAcceptedScope2Method(selectedScope2) : false;
    const industrySectionCode = clean(strongRecords[0].industry_section_code) || "unknown";
    const scope3Boundary = classifyScope3Boundary(selected.scope3, industrySectionCode);
    const selectedRows = [selected.scope1, selectedScope2, selected.scope3].filter(Boolean);
    if (!selectedRows.length) return;
    const selectedInventoryYears = unique(selectedRows.map((record) => clean(record.inventory_year))).slice(0, 5);
    const selectedYearsAligned = selectedInventoryYears.length <= 1;
    const selectedEvidenceMissing = unique(selectedRows.flatMap((record) => (
      selectedRowMissingEvidence(record, scope3Boundary).map((part) => `${clean(record.scope_en || record.scope_zh || scopeBucket(record))} ${part}`)
    )));

    const total = selectedRows.reduce((sum, record) => sum + numberOrZero(record.value_mtco2e), 0);
    const missingScopes = [
      selected.scope1 ? "" : "Scope 1",
      selectedScope2 ? "" : "Scope 2",
      selectedScope2 && !selectedScope2HasMethod ? "Scope 2 method" : "",
      selected.scope3 ? "" : "Scope 3",
      selected.scope3 && scope3Boundary.scope3_boundary_class_en === "finance_scope3_boundary_review_required" ? "Scope 3 finance boundary" : "",
      selectedRows.length === 3 && !selectedYearsAligned ? "Inventory year alignment" : "",
      ...selectedEvidenceMissing.map((item) => `Evidence ${item}`),
    ].filter(Boolean);
    available.push({
      company_id: companyId,
      company_name_en: clean(strongRecords[0].company_name_en),
      company_name_zh: clean(strongRecords[0].company_name_zh),
      world500_rank: numberOrZero(strongRecords[0].world500_rank) || "",
      industry_section_code: industrySectionCode,
      industry_section_en: clean(strongRecords[0].industry_section_en) || "Unknown",
      industry_section_zh: clean(strongRecords[0].industry_section_zh) || "未分类",
      industry_color: INDUSTRY_COLORS[industrySectionCode] || INDUSTRY_COLORS.unknown,
      total_mtco2e: Number(total.toFixed(6)),
      scope1_mtco2e: selected.scope1 ? numberOrZero(selected.scope1.value_mtco2e) : null,
      scope2_mtco2e: selectedScope2 ? numberOrZero(selectedScope2.value_mtco2e) : null,
      scope2_method_en: selectedScope2 ? (selectedScope2Method || "Unspecified") : "",
      scope3_mtco2e: selected.scope3 ? numberOrZero(selected.scope3.value_mtco2e) : null,
      scope3_boundary_class_en: scope3Boundary.scope3_boundary_class_en,
      scope3_boundary_basis_en: scope3Boundary.scope3_boundary_basis_en,
      selected_evidence_missing_elements: selectedEvidenceMissing,
      inventory_years: selectedInventoryYears,
      inventory_year_alignment_status: selectedYearsAligned ? "aligned" : "mixed_years_review_required",
      selected_evidence_pages: unique(selectedRows.map((record) => clean(record.evidence_page))).slice(0, 8),
      selected_source_files: unique(selectedRows.map((record) => clean(record.source_file))).slice(0, 4),
      selected_rows: selectedRows.map((record) => {
        const rowBoundary = selectedRowBoundary(record, scope3Boundary);
        const unitEvidence = unitEvidenceLabel(record);
        const missingEvidence = selectedRowMissingEvidence(record, scope3Boundary);
        return {
          evidence_key: clean(record.evidence_key),
          scope_en: clean(record.scope_en),
          scope_zh: clean(record.scope_zh),
          value_mtco2e: numberOrZero(record.value_mtco2e),
          inventory_year: clean(record.inventory_year),
          scope3_category_en: clean(record.scope3_category_en),
          scope3_boundary_class_en: scopeBucket(record) === "scope3" ? scope3Boundary.scope3_boundary_class_en : "",
          scope3_boundary_basis_en: scopeBucket(record) === "scope3" ? scope3Boundary.scope3_boundary_basis_en : "",
          scope2_reporting_method: clean(record.scope2_reporting_method || record.basis_en),
          evidence_page: clean(record.evidence_page),
          source_file: clean(record.source_file),
          review_status: clean(record.review_status),
          correction_basis_en: clean(record.correction_basis_en),
          boundary_en: clean(record.boundary_en || record.emissions_boundary_en),
          boundary_class_en: rowBoundary.boundary_class_en,
          boundary_basis_en: rowBoundary.boundary_basis_en,
          unit_en: clean(record.unit_en || record.unit),
          unit_evidence_en: unitEvidence,
          evidence_element_status: missingEvidence.length ? "missing_required_evidence_elements" : "page_unit_year_value_boundary_traceable",
          missing_evidence_elements: missingEvidence,
          snippet_en: compactSnippet(record.snippet_en, 520),
          snippet_zh: compactSnippet(record.snippet_zh || record.snippet_en, 520),
        };
      }),
      strong_row_count: usableRecords.length,
      review_required_row_count: allRecords.length - strongRecords.length,
      conflict_excluded_row_count: strongRecords.length - usableRecords.length,
      duplicate_scope_candidate_count: Math.max(0, usableRecords.length - selectedRows.length),
      missing_scopes: missingScopes,
      completeness_key: missingScopes.length ? "partial_strong_evidence_total" : "complete_scope123_strong_evidence_total",
      completeness_en: missingScopes.length
        ? `Partial strong-evidence total; missing ${missingScopes.join(", ")}.`
        : "Complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence total.",
      completeness_zh: missingScopes.length
        ? `强证据部分总量；缺 ${missingScopes.join("、")}。`
        : "完整 Scope 1 + 选定 Scope 2 + Scope 3 强证据总量。",
    });
  });

  available.sort((a, b) => b.total_mtco2e - a.total_mtco2e);
  available.forEach((row, index) => {
    row.available_rank = index + 1;
  });

  const complete = available
    .filter((row) => row.completeness_key === "complete_scope123_strong_evidence_total")
    .map((row, index) => ({ ...row, complete_rank: index + 1 }));

  const partial = available.filter((row) => row.completeness_key !== "complete_scope123_strong_evidence_total");
  const sortedDesc = (rows) => rows.every((row, index) => index === 0 || numberOrZero(rows[index - 1].total_mtco2e) >= numberOrZero(row.total_mtco2e));

  return {
    available,
    complete,
    ranking_graph: buildEmissionRankingGraph(complete),
    gate: {
      sort_key: "total_mtco2e_desc",
      available_sorted_desc: sortedDesc(available),
      complete_sorted_desc: sortedDesc(complete),
      complete_gate_en: "Main graph/table includes only complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence totals.",
      complete_gate_zh: "主图/主表只纳入完整 Scope 1 + 选定 Scope 2 + Scope 3 强证据总量。",
      partial_policy_en: "Partial strong-evidence totals remain sorted in the review table and are not mixed into the comparable ranking graph.",
      partial_policy_zh: "部分强证据总量只保留在复核表中按总量排序，不混入可比排行图谱。",
      complete_count: complete.length,
      available_count: available.length,
      partial_excluded_count: partial.length,
      highest_partial_excluded_company_en: partial[0]?.company_name_en || "",
      highest_partial_excluded_company_zh: partial[0]?.company_name_zh || "",
      highest_partial_excluded_total_mtco2e: partial[0]?.total_mtco2e ?? null,
      highest_partial_excluded_missing_scopes: partial[0]?.missing_scopes || [],
    },
  };
}

function buildEmissionRankingGraph(completeRows) {
  const companies = (completeRows || []).slice(0, 30);
  const maxTotal = Math.max(1, ...companies.map((row) => numberOrZero(row.total_mtco2e)));
  return {
    policy_en: "Graph uses only complete Scope 1 + selected Scope 2 + Scope 3 strong-evidence rows. It does not include partial totals or candidate values.",
    policy_zh: "图谱只使用完整 Scope 1 + 选定 Scope 2 + Scope 3 强证据行，不纳入部分总量或候选值。",
    center_en: "Strong-evidence total emissions ranking",
    center_zh: "强证据总排放排行",
    scope_nodes: [
      {
        id: "scope1",
        label_en: "Scope 1",
        label_zh: "Scope 1",
        role_en: "Direct operations emissions",
        role_zh: "直接运营排放",
        color: "#9b3b2f",
      },
      {
        id: "scope2",
        label_en: "Selected Scope 2",
        label_zh: "选定 Scope 2",
        role_en: "Purchased-energy indirect emissions",
        role_zh: "外购能源间接排放",
        color: "#c76b2d",
      },
      {
        id: "scope3",
        label_en: "Scope 3",
        label_zh: "Scope 3",
        role_en: "Value-chain emissions",
        role_zh: "价值链排放",
        color: "#315f8c",
      },
    ],
    companies: companies.map((row) => ({
      company_id: row.company_id,
      company_name_en: row.company_name_en,
      company_name_zh: row.company_name_zh,
      world500_rank: row.world500_rank,
      evidence_rank: row.complete_rank,
      industry_section_code: row.industry_section_code,
      industry_section_en: row.industry_section_en,
      industry_section_zh: row.industry_section_zh,
      industry_color: row.industry_color,
      total_mtco2e: row.total_mtco2e,
      relative_size: Number((numberOrZero(row.total_mtco2e) / maxTotal).toFixed(6)),
      scope1_mtco2e: row.scope1_mtco2e,
      scope2_mtco2e: row.scope2_mtco2e,
      scope2_method_en: row.scope2_method_en,
      scope3_mtco2e: row.scope3_mtco2e,
      inventory_years: row.inventory_years,
      selected_evidence_pages: row.selected_evidence_pages,
    })),
  };
}

function standardIdForName(standardName) {
  return clean(standardName).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || encodeURIComponent(clean(standardName));
}

function isCoarseGhgProtocolStandardName(standardName) {
  const normalized = clean(standardName).toLowerCase();
  return normalized === "ghg protocol"
    || normalized === "greenhouse gas protocol"
    || normalized === "greenhouse gas protocol (ghg protocol)"
    || /温室气体核算体系|溫室氣體核算體系/.test(standardName);
}

function standardEvidenceText(row) {
  return clean([
    row.snippet_en,
    row.snippet_zh,
  ].join(" "));
}

function hasPageTraceableStandardEvidence(row) {
  const evidence = rowEvidence(row);
  return Boolean(evidence.page && evidence.source_file && clean([evidence.snippet_en, evidence.snippet_zh].join(" ")));
}

function standardStrongAliases(standardName) {
  const name = clean(standardName);
  const normalized = name.toLowerCase();
  const aliases = new Set([name]);
  const add = (...items) => items.forEach((item) => item && aliases.add(item));
  if (normalized === "gri") add("GRI");
  if (normalized === "sasb") add("SASB");
  if (normalized === "tcfd") add("TCFD", "Task Force on Climate-related Financial Disclosures", "Task Force on Climate-related Financial");
  if (normalized === "sbti") add("SBTi", "Science Based Targets initiative", "Science Based Targets", "science-based");
  if (normalized === "ifrs s2") add("IFRS S2", "ISSB", "International Sustainability Standards Board");
  if (normalized === "ifrs s1") add("IFRS S1", "ISSB", "International Sustainability Standards Board");
  if (normalized === "pcaf") add("PCAF", "Partnership for Carbon Accounting Financials");
  if (/^iso\s*\d+/i.test(name)) add(name.replace(/\s+/g, " "), name.replace(/\s+/g, ""));
  if (/^gb\/?t/i.test(name)) add(name, name.replace("/", ""), name.replace(/\s+/g, ""));
  return [...aliases].map(clean).filter(Boolean);
}

function textHasAlias(text, alias) {
  const source = clean(text);
  const term = clean(alias);
  if (!source || !term) return false;
  if (/^[A-Za-z0-9][A-Za-z0-9 .\/&()+-]{0,64}$/.test(term)) {
    const pattern = term
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\ /g, "\\s+");
    return new RegExp(`(^|[^A-Za-z0-9])${pattern}([^A-Za-z0-9]|$)`, "i").test(source);
  }
  return source.toLowerCase().includes(term.toLowerCase());
}

function isAcceptedNonGhgStandardLink(row, standardName) {
  if (!hasPageTraceableStandardEvidence(row)) return false;
  const text = standardEvidenceText(row);
  return standardStrongAliases(standardName).some((alias) => textHasAlias(text, alias));
}

function buildStandardRoleGraph(companies, ghgCompanyMappings = [], ghgSeriesSummary = []) {
  const standardMap = new Map();
  const companyMap = new Map();
  const linkMap = new Map();
  const industryMap = new Map();
  const ghgSeriesSummaryById = new Map((ghgSeriesSummary || []).map((item) => [item.series_id, item]));

  function ghgDecisionForMatchStatus(matchStatus) {
    if (matchStatus === "explicit_series_citation" || matchStatus === "pdf_explicit_series_citation") {
      return {
        evidence_mode: "accepted_explicit_ghg_fine_series_edge",
        decision_bucket: "accepted",
        evidence_gate: "page_text_explicitly_names_whitelisted_series",
      };
    }
    if (matchStatus === "contextual_overmapped_review") {
      return {
        evidence_mode: "review_contextual_overmapped_ghg_fine_series_edge",
        decision_bucket: "review",
        evidence_gate: "named_different_series_or_no_explicit_current_series_name",
      };
    }
    return {
      evidence_mode: "review_contextual_ghg_fine_series_edge",
      decision_bucket: "review",
      evidence_gate: "scope_inventory_context_without_explicit_fine_series_name",
    };
  }

  function ensureStandard(standardPayload) {
    const id = clean(standardPayload.id) || standardIdForName(standardPayload.name_en || standardPayload.name_zh);
    if (!standardMap.has(id)) {
      const color = standardPayload.color || STANDARD_COLORS[standardMap.size % STANDARD_COLORS.length];
      standardMap.set(id, {
        id,
        name_en: clean(standardPayload.name_en || standardPayload.name_zh),
        name_zh: clean(standardPayload.name_zh || standardPayload.name_en),
        family_en: clean(standardPayload.family_en),
        family_zh: clean(standardPayload.family_zh),
        roles_en: new Set(),
        roles_zh: new Set(),
        principles_en: new Set(),
        principles_zh: new Set(),
        color,
        company_ids: new Set(),
        evidence_count: 0,
        evidence_samples: [],
        is_ghg_series: Boolean(standardPayload.is_ghg_series),
        core_whitelist: Boolean(standardPayload.core_whitelist),
        scope_terms_allowed: standardPayload.scope_terms_allowed ?? "",
        scope_terms_allowed_for: clean(standardPayload.scope_terms_allowed_for),
        accepted_evidence_gate_en: clean(standardPayload.accepted_evidence_gate_en),
        generic_reference_policy_en: clean(standardPayload.generic_reference_policy_en),
        category_key: clean(standardPayload.category_key),
      });
    }
    return standardMap.get(id);
  }

  function addStandardCompanyLink(meta, standardPayload, evidenceRows = []) {
    if (!meta.company_id) return;
    const standard = ensureStandard(standardPayload);
    (standardPayload.roles_en || []).forEach((item) => item && standard.roles_en.add(item));
    (standardPayload.roles_zh || []).forEach((item) => item && standard.roles_zh.add(item));
    (standardPayload.principles_en || []).forEach((item) => item && standard.principles_en.add(item));
    (standardPayload.principles_zh || []).forEach((item) => item && standard.principles_zh.add(item));
    standard.company_ids.add(meta.company_id);
    standard.evidence_count += Math.max(1, evidenceRows.length);
    const sampleSlots = Math.max(0, 4 - standard.evidence_samples.length);
    evidenceRows.slice(0, sampleSlots).forEach((item) => standard.evidence_samples.push(item));

    if (!companyMap.has(meta.company_id)) {
      companyMap.set(meta.company_id, {
        ...meta,
        standard_ids: new Set(),
        evidence_count: 0,
      });
    }
    const companyNode = companyMap.get(meta.company_id);
    companyNode.standard_ids.add(standard.id);
    companyNode.evidence_count += Math.max(1, evidenceRows.length);

    const industryKey = meta.industry_section_code || "unknown";
    if (!industryMap.has(industryKey)) {
      industryMap.set(industryKey, {
        code: industryKey,
        label_en: meta.industry_section_en,
        label_zh: meta.industry_section_zh,
        color: meta.industry_color,
        company_ids: new Set(),
      });
    }
    industryMap.get(industryKey).company_ids.add(meta.company_id);

    const linkKey = `${standard.id}__${meta.company_id}`;
    if (!linkMap.has(linkKey)) {
      linkMap.set(linkKey, {
        standard_id: standard.id,
        company_id: meta.company_id,
        industry_section_code: meta.industry_section_code,
        evidence_count: 0,
        pages: new Set(),
        source_files: new Set(),
        evidence_samples: [],
        match_status: clean(standardPayload.match_status),
        evidence_mode: clean(standardPayload.evidence_mode),
        decision_bucket: clean(standardPayload.decision_bucket),
        evidence_gate: clean(standardPayload.evidence_gate),
        matched_aliases: new Set(),
      });
    }
    const link = linkMap.get(linkKey);
    if (standardPayload.match_status) link.match_status = clean(standardPayload.match_status);
    if (standardPayload.evidence_mode) link.evidence_mode = clean(standardPayload.evidence_mode);
    if (standardPayload.decision_bucket) link.decision_bucket = clean(standardPayload.decision_bucket);
    if (standardPayload.evidence_gate) link.evidence_gate = clean(standardPayload.evidence_gate);
    (standardPayload.matched_aliases || []).forEach((item) => item && link.matched_aliases.add(clean(item)));
    link.evidence_count += Math.max(1, evidenceRows.length);
    evidenceRows.forEach((item) => {
      if (item.page) link.pages.add(clean(item.page));
      if (item.source_file) link.source_files.add(clean(item.source_file));
      if (link.evidence_samples.length < 2) link.evidence_samples.push(item);
    });
  }

  companies.forEach((company) => {
    const meta = getCompanyMeta(company);
    const standards = Array.isArray(company.standards) ? company.standards : [];
    standards.forEach((row) => {
      const standardName = clean(row.standard_name_en || row.standard_name_zh || row.label_en || row.label_zh);
      if (!standardName) return;
      if (isCoarseGhgProtocolStandardName(standardName)) return;
      const accepted = isAcceptedNonGhgStandardLink(row, standardName);
      addStandardCompanyLink(meta, {
        id: standardIdForName(standardName),
        name_en: standardName,
        name_zh: clean(row.standard_name_zh || standardName),
        family_en: clean(row.standard_family_en),
        family_zh: clean(row.standard_family_zh),
        roles_en: clean(row.standard_role_en).split("|").filter(Boolean),
        roles_zh: clean(row.standard_role_zh).split("|").filter(Boolean),
        principles_en: clean(row.accounting_principle_en).split("|").filter(Boolean),
        principles_zh: clean(row.accounting_principle_zh).split("|").filter(Boolean),
        match_status: accepted ? "explicit_standard_citation" : "source_standard_link",
        evidence_mode: accepted ? "accepted_page_traceable_standard_source_link" : "source_standard_evidence_pending_quality_review",
        decision_bucket: accepted ? "accepted" : "review",
        evidence_gate: accepted ? "page_text_explicitly_names_standard_or_strong_alias" : "page_traceable_standard_source_row_not_ghg_fine_series_gate",
      }, [rowEvidence(row)]);
    });
  });

  GHG_SERIES
    .filter((series) => CORE_GHG_PCAF_STANDARD_IDS.has(series.id))
    .forEach((definition) => {
      const metadata = ghgSeriesMetadata(definition);
      ensureStandard({
        id: definition.id,
        name_en: definition.name_en,
        name_zh: definition.name_zh,
        family_en: "GHG Protocol",
        family_zh: "GHG Protocol",
        roles_en: [definition.role_en],
        roles_zh: [definition.role_zh],
        principles_en: [definition.principle_en],
        principles_zh: [definition.principle_zh],
        color: STANDARD_COLORS[standardMap.size % STANDARD_COLORS.length],
        is_ghg_series: true,
        ...metadata,
        category_key: definition.category_key,
      });
    });

  ghgCompanyMappings.forEach((mapping) => {
    (mapping.series || [])
      .filter((series) => series.series_id !== "ghg_generic_reference")
      .filter((series) => CORE_GHG_PCAF_STANDARD_IDS.has(series.series_id))
      .forEach((series) => {
        const definition = GHG_SERIES.find((item) => item.id === series.series_id);
        if (!definition) return;
        const metadata = ghgSeriesMetadata(definition);
        const decision = series.decision_bucket
          ? {
            evidence_mode: series.decision_bucket === "accepted" ? "accepted_explicit_ghg_fine_series_edge" : "excluded_ghg_fine_series_edge",
            decision_bucket: series.decision_bucket,
            evidence_gate: series.evidence_gate,
          }
          : ghgDecisionForMatchStatus(series.match_status);
        addStandardCompanyLink(mapping, {
          id: definition.id,
          name_en: definition.name_en,
          name_zh: definition.name_zh,
          family_en: "GHG Protocol",
          family_zh: "GHG Protocol",
          roles_en: [definition.role_en],
          roles_zh: [definition.role_zh],
          principles_en: [definition.principle_en],
          principles_zh: [definition.principle_zh],
          color: STANDARD_COLORS[standardMap.size % STANDARD_COLORS.length],
          is_ghg_series: true,
          ...metadata,
          category_key: definition.category_key,
          match_status: series.match_status,
          ...decision,
          evidence_gate: decision.evidence_gate || series.evidence_gate,
          matched_aliases: series.matched_aliases || [],
        }, series.evidence_samples || []);
      });
  });

  const acceptedCompanyIdsByStandard = new Map();
  const reviewCompanyIdsByStandard = new Map();
  linkMap.forEach((link) => {
    const target = link.decision_bucket === "accepted" ? acceptedCompanyIdsByStandard : reviewCompanyIdsByStandard;
    if (!target.has(link.standard_id)) target.set(link.standard_id, new Set());
    target.get(link.standard_id).add(link.company_id);
  });

  const standards = [...standardMap.values()]
    .map((standard) => {
      const ghgSummary = standard.is_ghg_series ? ghgSeriesSummaryById.get(standard.id) : null;
      const acceptedCompanyIds = acceptedCompanyIdsByStandard.get(standard.id) || new Set();
      const reviewCompanyIds = reviewCompanyIdsByStandard.get(standard.id) || new Set();
      return {
        ...standard,
        roles_en: [...standard.roles_en],
        roles_zh: [...standard.roles_zh],
        principles_en: [...standard.principles_en],
        principles_zh: [...standard.principles_zh],
        company_count: standard.company_ids.size,
        accepted_company_count: standard.is_ghg_series ? numberOrZero(ghgSummary?.explicit_company_count) : acceptedCompanyIds.size,
        review_company_count: standard.is_ghg_series ? numberOrZero(ghgSummary?.contextual_company_count) : reviewCompanyIds.size,
        total_mapped_company_count: standard.is_ghg_series ? numberOrZero(ghgSummary?.company_count) : standard.company_ids.size,
        company_ids: [...standard.company_ids],
      };
    })
    .sort((a, b) => b.company_count - a.company_count);

  const companiesOut = [...companyMap.values()]
    .map((company) => ({
      ...company,
      standard_ids: [...company.standard_ids],
      standard_count: company.standard_ids.size,
    }))
    .sort((a, b) => numberOrZero(a.world500_rank) - numberOrZero(b.world500_rank));

  const links = [...linkMap.values()].map((link) => ({
    ...link,
    pages: [...link.pages].slice(0, 5),
    source_files: [...link.source_files].slice(0, 3),
    matched_aliases: [...link.matched_aliases].slice(0, 5),
  }));

  const industries = [...industryMap.values()]
    .map((industry) => ({
      ...industry,
      company_count: industry.company_ids.size,
      company_ids: [...industry.company_ids],
    }))
    .sort((a, b) => b.company_count - a.company_count);

  return { standards, companies: companiesOut, links, industries };
}

function buildAcceptedStandardRoleGraph(roleGraph) {
  const sourceLinks = (Array.isArray(roleGraph.links) ? roleGraph.links : [])
    .filter((link) => clean(link.standard_id) && clean(link.standard_id) !== "ghg_generic_reference");
  const acceptedLinks = sourceLinks
    .filter((link) => clean(link.decision_bucket) === "accepted")
    .map((link) => ({ ...link }));

  const acceptedCompanyIdsByStandard = new Map();
  const acceptedStandardIdsByCompany = new Map();
  const acceptedEvidenceCountByStandard = new Map();
  const acceptedSamplesByStandard = new Map();

  acceptedLinks.forEach((link) => {
    const standardId = clean(link.standard_id);
    const companyId = clean(link.company_id);
    if (!standardId || !companyId) return;
    if (!acceptedCompanyIdsByStandard.has(standardId)) acceptedCompanyIdsByStandard.set(standardId, new Set());
    if (!acceptedStandardIdsByCompany.has(companyId)) acceptedStandardIdsByCompany.set(companyId, new Set());
    acceptedCompanyIdsByStandard.get(standardId).add(companyId);
    acceptedStandardIdsByCompany.get(companyId).add(standardId);
    acceptedEvidenceCountByStandard.set(
      standardId,
      (acceptedEvidenceCountByStandard.get(standardId) || 0) + numberOrZero(link.evidence_count),
    );
    if (!acceptedSamplesByStandard.has(standardId)) acceptedSamplesByStandard.set(standardId, []);
    (Array.isArray(link.evidence_samples) ? link.evidence_samples : []).forEach((sample) => {
      const samples = acceptedSamplesByStandard.get(standardId);
      if (samples.length < 8) samples.push(sample);
    });
  });

  const coreGhgStandardIds = new Set((Array.isArray(roleGraph.standards) ? roleGraph.standards : [])
    .filter((standard) => Boolean(standard.is_ghg_series) && Boolean(standard.core_whitelist))
    .map((standard) => clean(standard.id))
    .filter(Boolean));
  const acceptedStandardIds = new Set([...acceptedCompanyIdsByStandard.keys(), ...coreGhgStandardIds]);
  const standards = (Array.isArray(roleGraph.standards) ? roleGraph.standards : [])
    .filter((standard) => acceptedStandardIds.has(clean(standard.id)))
    .map((standard) => {
      const standardId = clean(standard.id);
      const companyIds = [...(acceptedCompanyIdsByStandard.get(standardId) || new Set())].sort();
      return {
        ...standard,
        company_ids: companyIds,
        company_count: companyIds.length,
        accepted_company_count: companyIds.length,
        display_company_count: companyIds.length,
        total_mapped_company_count: numberOrZero(standard.total_mapped_company_count || standard.company_count),
        evidence_count: acceptedEvidenceCountByStandard.get(standardId) || 0,
        evidence_samples: acceptedSamplesByStandard.get(standardId) || [],
      };
    })
    .sort((a, b) => numberOrZero(b.company_count) - numberOrZero(a.company_count));

  const acceptedCompanyIds = new Set(acceptedStandardIdsByCompany.keys());
  const companies = (Array.isArray(roleGraph.companies) ? roleGraph.companies : [])
    .filter((company) => acceptedCompanyIds.has(clean(company.company_id)))
    .map((company) => {
      const standardIds = [...(acceptedStandardIdsByCompany.get(clean(company.company_id)) || new Set())]
        .filter((standardId) => acceptedStandardIds.has(standardId))
        .sort();
      return {
        ...company,
        standard_ids: standardIds,
        standard_count: standardIds.length,
      };
    })
    .filter((company) => company.standard_ids.length)
    .sort((a, b) => numberOrZero(a.world500_rank) - numberOrZero(b.world500_rank));

  const industries = (Array.isArray(roleGraph.industries) ? roleGraph.industries : [])
    .map((industry) => {
      const companyIds = (Array.isArray(industry.company_ids) ? industry.company_ids : [])
        .filter((companyId) => acceptedCompanyIds.has(clean(companyId)))
        .sort();
      return {
        ...industry,
        company_ids: companyIds,
        company_count: companyIds.length,
      };
    })
    .filter((industry) => industry.company_count > 0)
    .sort((a, b) => numberOrZero(b.company_count) - numberOrZero(a.company_count));

  return {
    graph_view_key: "accepted_standard_role_graph",
    source_graph_key: "standard_role_graph",
    decision_bucket: "accepted",
    standards,
    companies,
    links: acceptedLinks,
    industries,
    graph_exclusion_summary: {
      generic_reference_excluded: true,
      review_edges_excluded: sourceLinks.length - acceptedLinks.length,
      review_companies_excluded: new Set(sourceLinks
        .filter((link) => clean(link.decision_bucket) !== "accepted")
        .map((link) => clean(link.company_id))
        .filter(Boolean)).size,
      drawn_decision_bucket: "accepted",
    },
  };
}

function collectEvidenceRows(company) {
  return [
    ...(Array.isArray(company.carbon_evidence_rows) ? company.carbon_evidence_rows : []),
    ...(Array.isArray(company.method_rows) ? company.method_rows : []),
    ...(Array.isArray(company.evidence_ledger) ? company.evidence_ledger : []),
  ];
}

function loadStrictTraceableTechnologyRows(companiesById) {
  return readCsvRecords(STRICT_TRACEABLE_NODES_FILE)
    .filter((row) => companiesById.has(clean(row.company_id)))
    .map((row) => ({
      ...row,
      source_file: clean(row.source_file || row.source_path || row.report_id),
      report_title_en: clean(row.source_file || row.report_id),
      snippet_en: clean(row.snippet_en || row.recognition_basis_en || row.basis_en || row.label_en),
      snippet_zh: clean(row.snippet_zh || row.recognition_basis_zh || row.basis_zh || row.label_zh || row.snippet_en),
      confidence_level: clean(row.confidence_level) || "strict_traceable_graph",
      review_status: clean(row.review_status) || "strict_traceable_graph_signal",
      evidence_source_layer: "world500_strict_traceable_nodes",
    }))
    .filter((row) => evidenceText(row));
}

function detectTimeline(text) {
  const years = unique((text.match(/\b20[2-5]\d\b/g) || [])).map(Number);
  return {
    years,
    near: years.filter((year) => year <= 2026).length,
    mid: years.filter((year) => year >= 2027 && year <= 2035).length,
    long: years.filter((year) => year >= 2036).length,
  };
}

function hasCostSignal(text) {
  return /cost|capex|investment|invest|spend|budget|\$|usd|eur|rmb|cny|krw|million|billion|trillion|成本|投资|资本开支|预算|亿元|百万|十亿/i.test(text);
}

function isValidProjectCostEvidence(text) {
  const sourceText = clean(text);
  if (!sourceText) return false;
  if (/no quantified|not disclose|not disclosed|does not disclose|no cost|no quantified cost|not provided|not quantified|amount is not|transaction amount is not|share is not|not separately quantified|does not allocate|not allocate|sales revenue|revenue goes|revenue from/i.test(sourceText)) {
    return false;
  }
  return /\$|US\$|USD|EUR|CNY|RMB|million|billion|trillion|invested|investment|green loan|allocation|bond|financ(?:e|ing)|budget|capex|capital expenditure/i.test(sourceText);
}

function projectCostEvidenceStatus(text) {
  const sourceText = clean(text);
  if (!sourceText) return "missing_project_cost_or_investment_evidence";
  return isValidProjectCostEvidence(sourceText)
    ? "accepted_project_cost_or_investment_evidence"
    : "cost_not_disclosed_or_unquantified_review_note";
}

function technologyDefinitionForName(name) {
  const text = clean(name).toLowerCase();
  if (/renewable|ppa/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "renewable_power");
  if (/circular|recycling/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "circular_recycling");
  if (/electrified|transport/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "electrified_transport");
  if (/battery|storage/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "battery_storage");
  if (/low-carbon fuels|fuel/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "low_carbon_fuels");
  if (/hydrogen|methanol/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "hydrogen_methanol");
  if (/carbon management|removal|ccus|ccs/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "carbon_management");
  if (/low-carbon materials|materials/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "low_carbon_materials");
  if (/advanced clean power|clean power/.test(text)) return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.id === "energy_efficiency");
  return TECHNOLOGY_CLUSTERS.find((cluster) => cluster.patterns.some((pattern) => pattern.test(name)));
}

function technologyEvidenceFromEmbedded(item) {
  return {
    report: clean(item.report),
    page: clean(item.page),
    source_file: clean(item.report),
    confidence: clean(item.confidence),
    review_status: clean(item.review_status),
    snippet_en: compactSnippet(item.snippet, 360),
    snippet_zh: compactSnippet(item.snippet, 360),
  };
}

function normalizeTechnologyProjectEvidence(record, companiesById) {
  const companyId = clean(record.company_id);
  const technologyId = clean(record.technology_id);
  const evidencePage = clean(record.evidence_page || record.page);
  const sourceFile = clean(record.source_file);
  const snippet = clean(record.snippet_en || record.snippet_zh);
  const projectOrMeasure = clean(record.project_name_en || record.measure_name_en);
  const costText = clean(record.cost_or_investment_en);
  const costEvidenceStatus = projectCostEvidenceStatus(costText);
  if (!companyId || !technologyId || !evidencePage || !sourceFile || !snippet || !projectOrMeasure) {
    return null;
  }
  const company = companiesById.get(companyId);
  if (!company) return null;
  const meta = getCompanyMeta(company);
  const timelineYears = Array.isArray(record.timeline_years)
    ? unique(record.timeline_years)
    : unique(clean(record.timeline_years).split(/[|,;]/));
  return {
    ...meta,
    technology_id: technologyId,
    subtype_id: clean(record.subtype_id),
    subtype_en: clean(record.subtype_en),
    project_name_en: clean(record.project_name_en),
    measure_name_en: clean(record.measure_name_en),
    implementation_stage: clean(record.implementation_stage),
    timeline_years: timelineYears,
    cost_or_investment_en: costEvidenceStatus === "accepted_project_cost_or_investment_evidence" ? costText : "",
    cost_or_investment_review_note_en: costEvidenceStatus === "accepted_project_cost_or_investment_evidence" ? "" : costText,
    cost_evidence_status: costEvidenceStatus,
    abatement_effect_en: clean(record.abatement_effect_en),
    evidence_page: evidencePage,
    page: evidencePage,
    source_file: sourceFile,
    report_title_en: clean(record.report_title_en),
    snippet_en: compactSnippet(snippet, 620),
    evidence_status: clean(record.evidence_status) || "project_evidence",
    evidence_boundary: "page_level_project_or_measure_evidence",
  };
}

function loadTechnologyProjectEvidence(companiesById) {
  if (!fs.existsSync(TECHNOLOGY_PROJECT_EVIDENCE_FILE)) return [];
  const payload = readJson(TECHNOLOGY_PROJECT_EVIDENCE_FILE);
  if (!payload || !Array.isArray(payload.records)) return [];
  return payload.records
    .map((record) => normalizeTechnologyProjectEvidence(record, companiesById))
    .filter(Boolean)
    .sort((a, b) => (
      a.technology_id.localeCompare(b.technology_id, "en")
      || numberOrZero(a.world500_rank) - numberOrZero(b.world500_rank)
      || a.company_id.localeCompare(b.company_id, "en")
    ));
}

function loadTechnologyProjectCandidateDecisions() {
  if (!fs.existsSync(TECHNOLOGY_PROJECT_CANDIDATE_DECISIONS_FILE)) {
    return {
      decision_count: 0,
      review_only_count: 0,
      demoted_count: 0,
      decisions: [],
    };
  }
  const payload = readJson(TECHNOLOGY_PROJECT_CANDIDATE_DECISIONS_FILE);
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  return {
    schema_version: payload.schema_version,
    policy: payload.policy,
    decision_gate_en: payload.decision_gate_en,
    decision_count: decisions.length,
    review_only_count: decisions.filter((row) => clean(row.decision_bucket) === "review_only").length,
    demoted_count: decisions.filter((row) => clean(row.decision_bucket) === "demoted").length,
    decisions: decisions.map((row) => ({
      company_id: clean(row.company_id),
      technology_id: clean(row.technology_id),
      decision_bucket: clean(row.decision_bucket),
      decision_status: clean(row.decision_status),
      missing_to_project_gate: clean(row.missing_to_project_gate),
      decision_rationale_en: clean(row.decision_rationale_en),
      decision_rationale_zh: clean(row.decision_rationale_zh),
    })),
  };
}

function projectEvidenceStats(projectEvidence) {
  const rows = Array.isArray(projectEvidence) ? projectEvidence : [];
  return {
    project_evidence_count: rows.length,
    project_company_count: new Set(rows.map((row) => row.company_id).filter(Boolean)).size,
    project_cost_evidence_count: rows.filter((row) => row.cost_evidence_status === "accepted_project_cost_or_investment_evidence").length,
    project_cost_review_note_count: rows.filter((row) => row.cost_evidence_status === "cost_not_disclosed_or_unquantified_review_note").length,
    project_abatement_evidence_count: rows.filter((row) => clean(row.abatement_effect_en)).length,
    project_timeline_years: unique(rows.flatMap((row) => row.timeline_years || [])).sort(),
  };
}

function groupTechnologyProjectEvidence(projectEvidence) {
  const grouped = new Map();
  (projectEvidence || []).forEach((record) => addMapItem(grouped, record.technology_id, record));
  return grouped;
}

function projectTimelineCounts(projectEvidence) {
  const counts = { near: 0, mid: 0, long: 0 };
  (projectEvidence || []).forEach((record) => {
    (record.timeline_years || []).forEach((yearText) => {
      const year = numberOrZero(yearText);
      if (!year) return;
      if (year <= 2026) counts.near += 1;
      else if (year <= 2035) counts.mid += 1;
      else counts.long += 1;
    });
  });
  return counts;
}

function buildTechnologyProjectClusters(disclosureClusters, projectEvidence) {
  const projectEvidenceByTechnology = groupTechnologyProjectEvidence(projectEvidence);
  return (disclosureClusters || [])
    .map((cluster) => {
      const records = projectEvidenceByTechnology.get(cluster.id) || [];
      const stats = projectEvidenceStats(records);
      const projectCompanyIds = unique(records.map((record) => record.company_id).filter(Boolean));
      const subtypeCounts = new Map();
      records.forEach((record) => {
        const subtypeId = clean(record.subtype_id);
        if (!subtypeId) return;
        subtypeCounts.set(subtypeId, (subtypeCounts.get(subtypeId) || 0) + 1);
      });
      return {
        ...cluster,
        evidence_bucket: "strong_project_evidence",
        evidence_boundary: "page_level_project_or_measure_evidence",
        company_count: projectCompanyIds.length,
        company_ids: projectCompanyIds,
        evidence_count: records.length,
        disclosure_signal_company_count: cluster.company_count,
        disclosure_signal_evidence_count: cluster.evidence_count,
        disclosure_signal_cost_signal_count: cluster.cost_signal_count,
        disclosure_signal_timeline_counts: cluster.timeline_counts,
        ...stats,
        cost_signal_count: stats.project_cost_evidence_count,
        timeline_counts: projectTimelineCounts(records),
        subtypes: (cluster.subtypes || []).map((subtype) => ({
          ...subtype,
          evidence_count: subtypeCounts.get(subtype.id) || 0,
        })),
        company_examples: records.slice(0, 40).map((record) => ({
          company_id: record.company_id,
          company_name_en: record.company_name_en,
          company_name_zh: record.company_name_zh,
          world500_rank: record.world500_rank,
          industry_section_code: record.industry_section_code,
          industry_section_en: record.industry_section_en,
          industry_section_zh: record.industry_section_zh,
          industry_color: record.industry_color,
          evidence_count: 1,
          sample_snippet_en: compactSnippet(record.snippet_en, 260),
          sample_snippet_zh: compactSnippet(record.snippet_zh || record.snippet_en, 260),
        })),
        evidence_samples: records.slice(0, 8).map((record) => ({
          report: record.source_file,
          page: record.evidence_page,
          source_file: record.source_file,
          snippet_en: record.snippet_en,
          snippet_zh: record.snippet_zh || record.snippet_en,
          confidence: "high",
          review_status: "valid_project_evidence",
        })),
        project_evidence: records.slice(0, 20),
      };
    })
    .sort((a, b) => (
      numberOrZero(b.project_evidence_count) - numberOrZero(a.project_evidence_count)
      || numberOrZero(b.project_company_count) - numberOrZero(a.project_company_count)
      || numberOrZero(b.disclosure_signal_company_count) - numberOrZero(a.disclosure_signal_company_count)
    ));
}

function buildTechnologyPathsFromEmbedded(graphPayload, companiesById, projectEvidence = []) {
  const projectEvidenceByTechnology = groupTechnologyProjectEvidence(projectEvidence);
  const graphCompaniesById = new Map((graphPayload.companies || []).map((company) => [company.id, company]));
  const clusters = (graphPayload.middleNodes || []).map((node) => {
    const definition = technologyDefinitionForName(node.name) || {
      id: clean(node.name).toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      name_en: node.name,
      name_zh: node.name,
      color: "#2f6f63",
      standards_en: ["Disclosure evidence"],
      standards_zh: ["披露证据"],
      subtypes: [],
    };
    const companyIds = Array.isArray(node.companyIds) ? node.companyIds : [];
    const evidenceRows = Array.isArray(node.evidence) ? node.evidence : [];
    const clusterProjectEvidence = projectEvidenceByTechnology.get(definition.id) || [];
    const clusterProjectStats = projectEvidenceStats(clusterProjectEvidence);
    const subtypeCounts = Object.fromEntries((definition.subtypes || []).map((subtype) => [subtype.id, 0]));
    const timelineCounts = { near: 0, mid: 0, long: 0 };
    let costSignalCount = 0;
    evidenceRows.forEach((row) => {
      const text = clean(row.snippet);
      const timeline = detectTimeline(text);
      timelineCounts.near += timeline.near;
      timelineCounts.mid += timeline.mid;
      timelineCounts.long += timeline.long;
      if (hasCostSignal(text)) costSignalCount += 1;
      (definition.subtypes || []).forEach((subtype) => {
        if (subtype.patterns.some((pattern) => pattern.test(text))) subtypeCounts[subtype.id] += 1;
      });
    });

    const companyExamples = companyIds
      .map((companyId) => {
        const graphCompany = graphCompaniesById.get(companyId) || {};
        const meta = companiesById.has(companyId)
          ? getCompanyMeta(companiesById.get(companyId))
          : {
              company_id: companyId,
              company_name_en: clean(graphCompany.name),
              company_name_zh: clean(graphCompany.name),
              world500_rank: numberOrZero(graphCompany.rank) || "",
              industry_section_code: "unknown",
              industry_section_en: "Unknown",
              industry_section_zh: "未分类",
              industry_color: INDUSTRY_COLORS.unknown,
            };
        const companyEvidence = graphCompany.evidenceByItem?.[node.name] || [];
        companyEvidence.forEach((row) => {
          const text = clean(row.snippet);
          const timeline = detectTimeline(text);
          timelineCounts.near += timeline.near;
          timelineCounts.mid += timeline.mid;
          timelineCounts.long += timeline.long;
          if (hasCostSignal(text)) costSignalCount += 1;
          (definition.subtypes || []).forEach((subtype) => {
            if (subtype.patterns.some((pattern) => pattern.test(text))) subtypeCounts[subtype.id] += 1;
          });
        });
        return {
          ...meta,
          evidence_count: companyEvidence.length || numberOrZero(graphCompany.factCount),
          sample_snippet_en: compactSnippet(companyEvidence.map((row) => row.snippet).find(Boolean), 260),
          sample_snippet_zh: compactSnippet(companyEvidence.map((row) => row.snippet).find(Boolean), 260),
        };
      })
      .sort((a, b) => b.evidence_count - a.evidence_count);

    return {
      id: definition.id,
      source_node_name: node.name,
      name_en: definition.name_en,
      name_zh: definition.name_zh,
      color: definition.color,
      standards_en: definition.standards_en,
      standards_zh: definition.standards_zh,
      company_count: companyIds.length || numberOrZero(node.companyCount),
      company_ids: companyIds,
      evidence_count: numberOrZero(node.factCount) || evidenceRows.length,
      ...clusterProjectStats,
      cost_signal_count: costSignalCount,
      timeline_counts: timelineCounts,
      subtypes: (definition.subtypes || []).map((subtype) => ({
        id: subtype.id,
        label_en: subtype.label_en,
        label_zh: subtype.label_zh,
        evidence_count: subtypeCounts[subtype.id] || 0,
      })),
      company_examples: companyExamples.slice(0, 60),
      evidence_samples: evidenceRows.slice(0, 8).map((row) => technologyEvidenceFromEmbedded(row)),
      project_evidence: clusterProjectEvidence.slice(0, 20),
    };
  });

  return clusters.sort((a, b) => b.company_count - a.company_count);
}

function buildTechnologyPaths(companies) {
  const companiesById = new Map(companies.map((company) => [company.company_id, company]));
  const projectEvidence = loadTechnologyProjectEvidence(companiesById);
  const projectCandidateDecisions = loadTechnologyProjectCandidateDecisions();
  const strictTechnologyRowsByCompany = new Map();
  loadStrictTraceableTechnologyRows(companiesById).forEach((row) => {
    addMapItem(strictTechnologyRowsByCompany, clean(row.company_id), row);
  });

  const clusterMap = new Map(TECHNOLOGY_CLUSTERS.map((cluster) => [cluster.id, {
    ...cluster,
    company_ids: new Set(),
    evidence_count: 0,
    evidence_samples: [],
    project_evidence: [],
    cost_signal_count: 0,
    timeline_counts: { near: 0, mid: 0, long: 0 },
    subtype_counts: Object.fromEntries(cluster.subtypes.map((subtype) => [subtype.id, 0])),
    company_examples: [],
  }]));

  companies.forEach((company) => {
    const meta = getCompanyMeta(company);
    const rows = [
      ...collectEvidenceRows(company),
      ...(strictTechnologyRowsByCompany.get(meta.company_id) || []),
    ];
    const companyClusterHits = new Map();
    rows.forEach((row) => {
      const text = evidenceText(row);
      if (!text) return;
      TECHNOLOGY_CLUSTERS.forEach((clusterDef) => {
        if (!clusterDef.patterns.some((pattern) => pattern.test(text))) return;
        const cluster = clusterMap.get(clusterDef.id);
        cluster.company_ids.add(meta.company_id);
        cluster.evidence_count += 1;
        addMapItem(companyClusterHits, clusterDef.id, row);
        const timeline = detectTimeline(text);
        cluster.timeline_counts.near += timeline.near;
        cluster.timeline_counts.mid += timeline.mid;
        cluster.timeline_counts.long += timeline.long;
        if (hasCostSignal(text)) cluster.cost_signal_count += 1;
        clusterDef.subtypes.forEach((subtype) => {
          if (subtype.patterns.some((pattern) => pattern.test(text))) {
            cluster.subtype_counts[subtype.id] += 1;
          }
        });
        if (cluster.evidence_samples.length < 8) {
          cluster.evidence_samples.push({
            ...rowEvidence(row),
            company_id: meta.company_id,
            company_name_en: meta.company_name_en,
            company_name_zh: meta.company_name_zh,
            world500_rank: meta.world500_rank,
          });
        }
      });
    });

    companyClusterHits.forEach((hitRows, clusterId) => {
      const cluster = clusterMap.get(clusterId);
      if (cluster.company_examples.length < 80) {
        cluster.company_examples.push({
          ...meta,
          evidence_count: hitRows.length,
          sample_snippet_en: compactSnippet(hitRows.map((row) => row.snippet_en || row.recognition_basis_en || row.estimate_basis_en).find(Boolean), 260),
          sample_snippet_zh: compactSnippet(hitRows.map((row) => row.snippet_zh || row.recognition_basis_zh || row.estimate_basis_zh || row.snippet_en).find(Boolean), 260),
        });
      }
    });
  });

  const clusters = [...clusterMap.values()]
    .map((cluster) => ({
      id: cluster.id,
      name_en: cluster.name_en,
      name_zh: cluster.name_zh,
      color: cluster.color,
      standards_en: cluster.standards_en,
      standards_zh: cluster.standards_zh,
      company_count: cluster.company_ids.size,
      company_ids: [...cluster.company_ids],
      evidence_count: cluster.evidence_count,
      ...projectEvidenceStats(projectEvidence.filter((record) => record.technology_id === cluster.id)),
      cost_signal_count: cluster.cost_signal_count,
      timeline_counts: cluster.timeline_counts,
      subtypes: cluster.subtypes.map((subtype) => ({
        id: subtype.id,
        label_en: subtype.label_en,
        label_zh: subtype.label_zh,
        evidence_count: cluster.subtype_counts[subtype.id] || 0,
      })),
      company_examples: cluster.company_examples.sort((a, b) => b.evidence_count - a.evidence_count).slice(0, 40),
      evidence_samples: cluster.evidence_samples,
      project_evidence: projectEvidence.filter((record) => record.technology_id === cluster.id).slice(0, 20),
    }))
    .sort((a, b) => b.company_count - a.company_count);
  const projectClusters = buildTechnologyProjectClusters(clusters, projectEvidence);

  return {
    clusters,
    project_clusters: projectClusters,
    disclosure_signal_clusters: clusters.map((cluster) => ({
      ...cluster,
      evidence_bucket: "disclosure_signal_review",
      evidence_boundary: "keyword_or_methodology_disclosure_signal_not_project_evidence",
      validated_project_evidence_count: projectClusters.find((item) => item.id === cluster.id)?.project_evidence_count || 0,
    })),
    project_evidence: projectEvidence,
    project_evidence_summary: projectEvidenceStats(projectEvidence),
    project_candidate_decisions: projectCandidateDecisions,
    source: "company_workbench_and_strict_traceable_graph_rows",
    source_note_en: "Technology clusters are rebuilt from company workbench rows and strict traceable graph node evidence, plus a separate curated page-level project-evidence layer. Legacy keyword-derived company-technology rows remain disclosure signals until project-level validation.",
    source_note_zh: "技术聚类由企业工作台证据行和严格可追溯图谱节点证据重建，并叠加单独维护的页级项目证据层；旧关键词企业-技术边在项目级核验前仍是披露信号。",
    flow: technologyFlow(),
  };
}

function technologyFlow() {
  return [
    {
      from_en: "Standard evidence",
      from_zh: "标准证据层",
      to_en: "Emission boundary",
      to_zh: "排放边界层",
      note_en: "GHG Protocol uses Scope 1/2/3. Other standards are shown as direct/indirect or disclosure/assurance language.",
      note_zh: "只有 GHG Protocol 使用 Scope 1/2/3；其他标准使用直接/间接排放或披露/核查口径。",
    },
    {
      from_en: "Emission boundary",
      from_zh: "排放边界层",
      to_en: "Decarbonization technology families",
      to_zh: "减碳技术族",
      note_en: "Technology evidence is clustered by report text, not promoted to verified reduction accounting.",
      note_zh: "技术证据按报告文本聚类，不升级为已核证减排量。",
    },
    {
      from_en: "Decarbonization technology families",
      from_zh: "减碳技术族",
      to_en: "Time horizon and cost signals",
      to_zh: "时间趋势与成本信号",
      note_en: "Timeline and cost are keyword evidence signals and require project-level validation for quantified economics.",
      note_zh: "时间与成本是关键词证据信号，量化经济性仍需项目级验证。",
    },
  ];
}

const PRIMARY_PATTERNS = [
  /primary data/i,
  /actual data/i,
  /actual consumption/i,
  /meter/i,
  /invoice/i,
  /supplier-specific/i,
  /site-specific/i,
  /vehicle-specific/i,
  /fuel consumption/i,
  /distance traveled/i,
  /measured/i,
  /activity data/i,
  /实测/,
  /一手/,
  /初级/,
  /实际/,
  /供应商特定/,
];

const SECONDARY_PATTERNS = [
  /secondary data/i,
  /secondary emissions factor/i,
  /emission factor/i,
  /average data/i,
  /industry average/i,
  /spend-based/i,
  /proxy/i,
  /estimated/i,
  /\bdefra\b/i,
  /\biea\b/i,
  /\beia\b/i,
  /\bepa\b/i,
  /ecoinvent/i,
  /估算/,
  /次级/,
  /平均/,
  /代理/,
  /排放因子/,
];

function classifyDataSourceRow(row) {
  const text = clean([
    row.data_source_class_keys,
    row.data_source_class_en,
    row.data_source_class_zh,
    row.data_source_classes_en,
    row.data_source_classes_zh,
    row.data_source_type_en,
    row.data_source_type_zh,
    row.data_source_class_basis_en,
    row.data_source_class_basis_zh,
    row.data_quality_flag_en,
    row.data_quality_flag_zh,
    row.data_quality_raw_flag_en,
    row.data_quality_raw_flag_zh,
    row.calculation_method_en,
    row.calculation_method_zh,
  ].join(" "));
  const primary = PRIMARY_PATTERNS.some((pattern) => pattern.test(text));
  const secondary = SECONDARY_PATTERNS.some((pattern) => pattern.test(text));
  if (primary && secondary) return "mixed";
  if (primary) return "primary";
  if (secondary) return "secondary";
  return "unknown";
}

function dataSourceEvidenceText(row) {
  return clean([
    row.recognition_basis_en,
    row.recognition_basis_zh,
    row.estimate_basis_en,
    row.estimate_basis_zh,
    row.snippet_en,
    row.snippet_zh,
  ].join(" "));
}

function stripStructuredTags(text) {
  return clean(text)
    .replace(/Structured [^;。]+[;。]\s*/gi, " ")
    .replace(/结构化[^；。]+[；。]\s*/g, " ")
    .replace(/Matched keywords:\s*[^A-Z0-9+%]{0,120}/gi, " ")
    .replace(/原文命中关键词：[^A-Z0-9+%]{0,120}/g, " ");
}

function normalizePercent(value) {
  const number = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return number;
}

function primaryDataScopeLabel(context, localPrefix = "") {
  const lastScope = [...localPrefix.matchAll(/\bscope\s*([123])\b/gi)].pop();
  if (lastScope) {
    const value = lastScope[1];
    if (value === "3") return { en: "Scope 3 emissions", zh: "Scope 3 排放" };
    if (value === "2") return { en: "Scope 2 emissions", zh: "Scope 2 排放" };
    if (value === "1") return { en: "Scope 1 emissions", zh: "Scope 1 排放" };
  }
  if (/\bscope\s*1\s+and\s+2\b/i.test(context)) return { en: "Scope 1 and 2 emissions", zh: "Scope 1 和 2 排放" };
  if (/\bscope\s*3\b/i.test(context)) return { en: "Scope 3 emissions", zh: "Scope 3 排放" };
  if (/\bscope\s*2\b/i.test(context)) return { en: "Scope 2 emissions", zh: "Scope 2 排放" };
  if (/\bscope\s*1\b/i.test(context)) return { en: "Scope 1 emissions", zh: "Scope 1 排放" };
  if (/product|device|carbon footprint|lca|life cycle/i.test(context)) {
    return { en: "Product or carbon-footprint calculation", zh: "产品或碳足迹计算" };
  }
  if (/total|all emissions|all scopes|overall/i.test(context)) {
    return { en: "Total or all-scope emissions", zh: "总量或全范围排放" };
  }
  return { en: "Reported primary-data basis", zh: "披露的初级数据口径" };
}

function primaryDataCandidateScore(context) {
  let score = 0;
  if (/total|all emissions|all scopes|overall/i.test(context)) score += 6;
  if (/\bscope\s*3\b/i.test(context)) score += 5;
  if (/\bscope\s*[12]\b/i.test(context)) score += 3;
  if (/product|device|carbon footprint|lca|life cycle/i.test(context)) score += 2;
  if (/calculated|calculation|accounted|informed|measured|using|based/i.test(context)) score += 2;
  if (/primary data/i.test(context)) score += 1;
  return score;
}

function extractPrimaryPercentCandidates(text, row) {
  const normalized = stripStructuredTags(text).replace(/(\d+(?:[.,]\d+)?)\s*per\s*cent/gi, "$1%");
  if (!/primary data/i.test(normalized)) return [];
  const patterns = [
    /primary data\s*[:：]\s*(?:approximately|about|around|~)?\s*(\d+(?:[.,]\d+)?)\s*%/gi,
    /(?:percentage|share|proportion|portion)[^.;。]{0,220}?primary data[^.;。]{0,90}?(?:is|was|:|=|of|accounted for)?\s*(?:approximately|about|around|~)?\s*(\d+(?:[.,]\d+)?)\s*%/gi,
    /primary data[^.;。]{0,120}?(?:accounted for|represented|has been used to calculate|used to calculate|was used to calculate)[^.;。]{0,50}?(?:approximately|about|around|~)?\s*(\d+(?:[.,]\d+)?)\s*%/gi,
    /(\d+(?:[.,]\d+)?)\s*%\s+of[^.;。]{0,180}?(?:calculated|based|using|informed|measured|accounted)[^.;。]{0,100}?primary data/gi,
    /(?:emissions|carbon footprint|scope\s*[123])[^.;。]{0,160}?(?:calculated|measured|informed)[^.;。]{0,100}?primary data[^.;。]{0,80}?(?:is|was|=|:)\s*(?:approximately|about|around|~)?\s*(\d+(?:[.,]\d+)?)\s*%/gi,
  ];
  const candidates = [];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const percent = normalizePercent(match[1]);
      if (percent === null) continue;
      const start = Math.max(0, match.index - 180);
      const end = Math.min(normalized.length, match.index + match[0].length + 180);
      const context = clean(normalized.slice(start, end));
      const localPrefix = normalized.slice(Math.max(0, match.index - 80), match.index);
      const scope = primaryDataScopeLabel(context, localPrefix);
      candidates.push({
        percent,
        ratio: Number((percent / 100).toFixed(4)),
        context,
        score: primaryDataCandidateScore(context),
        row,
        scope_en: scope.en,
        scope_zh: scope.zh,
      });
    }
  });
  return candidates;
}

function extractReportedPrimaryRatio(methodRows) {
  const candidates = [];
  methodRows.forEach((row) => {
    candidates.push(...extractPrimaryPercentCandidates(dataSourceEvidenceText(row), row));
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.score - a.score) || (b.context.length - a.context.length));
  const best = candidates[0];
  const evidence = {
    ...rowEvidence(best.row),
    snippet_en: compactSnippet(best.context, 420),
    snippet_zh: compactSnippet(best.context, 420),
  };
  return {
    primary_ratio: best.ratio,
    reported_primary_percent: best.percent,
    reported_primary_scope_en: best.scope_en,
    reported_primary_scope_zh: best.scope_zh,
    reported_primary_basis_en: compactSnippet(best.context, 260),
    reported_primary_basis_zh: compactSnippet(best.context, 260),
    reported_primary_evidence: evidence,
    reported_primary_candidate_count: candidates.length,
  };
}

function buildPrimarySecondaryBubbles(companies, rankings) {
  const totalsByCompany = new Map((rankings.available || []).map((row) => [row.company_id, row]));
  const bubbles = companies.map((company) => {
    const meta = getCompanyMeta(company);
    const methodRows = Array.isArray(company.method_rows) ? company.method_rows : [];
    const counts = { primary: 0, secondary: 0, mixed: 0, unknown: 0 };
    const samples = [];
    methodRows.forEach((row) => {
      const category = classifyDataSourceRow(row);
      counts[category] += 1;
      if (category !== "unknown" && samples.length < 3) samples.push(rowEvidence(row));
    });
    const known = counts.primary + counts.secondary + counts.mixed;
    const total = methodRows.length;
    const weightedPrimary = counts.primary + counts.mixed * 0.5;
    const weightedSecondary = counts.secondary + counts.mixed * 0.5;
    const sourcePrimaryRatio = known ? Number((weightedPrimary / known).toFixed(4)) : null;
    const sourceSecondaryRatio = known ? Number((weightedSecondary / known).toFixed(4)) : null;
    const reportedPrimary = extractReportedPrimaryRatio(methodRows);
    const ratioBasisKey = reportedPrimary ? "explicit_reported_primary_percentage" : "method_row_source_mix";
    const primaryRatioKnown = reportedPrimary ? reportedPrimary.primary_ratio : sourcePrimaryRatio;
    const secondaryRatioKnown = reportedPrimary ? Number((1 - reportedPrimary.primary_ratio).toFixed(4)) : sourceSecondaryRatio;
    const evidenceSamples = reportedPrimary
      ? [reportedPrimary.reported_primary_evidence, ...samples].filter(Boolean).slice(0, 4)
      : samples;
    const ranking = totalsByCompany.get(meta.company_id);
    return {
      ...meta,
      primary_count: counts.primary,
      secondary_count: counts.secondary,
      mixed_count: counts.mixed,
      unknown_count: counts.unknown,
      method_evidence_count: total,
      known_source_evidence_count: known,
      primary_ratio_known: primaryRatioKnown,
      secondary_ratio_known: secondaryRatioKnown,
      primary_ratio_all: total ? Number((weightedPrimary / total).toFixed(4)) : null,
      unknown_ratio: total ? Number((counts.unknown / total).toFixed(4)) : null,
      source_mix_primary_ratio_known: sourcePrimaryRatio,
      source_mix_secondary_ratio_known: sourceSecondaryRatio,
      ratio_basis_key: ratioBasisKey,
      ratio_basis_en: reportedPrimary
        ? "Explicit reported primary-data percentage"
        : "Method-row source-mix inference",
      ratio_basis_zh: reportedPrimary
        ? "原文明示初级数据百分比"
        : "方法行来源结构推断",
      reported_primary_percent: reportedPrimary ? reportedPrimary.reported_primary_percent : null,
      reported_primary_scope_en: reportedPrimary ? reportedPrimary.reported_primary_scope_en : "",
      reported_primary_scope_zh: reportedPrimary ? reportedPrimary.reported_primary_scope_zh : "",
      reported_primary_basis_en: reportedPrimary ? reportedPrimary.reported_primary_basis_en : "",
      reported_primary_basis_zh: reportedPrimary ? reportedPrimary.reported_primary_basis_zh : "",
      reported_primary_candidate_count: reportedPrimary ? reportedPrimary.reported_primary_candidate_count : 0,
      total_mtco2e: ranking ? ranking.total_mtco2e : null,
      strong_scope_row_count: ranking ? ranking.strong_row_count : 0,
      evidence_samples: evidenceSamples,
      quality_note_en: reportedPrimary
        ? "Primary-data ratio uses an explicit reported percentage; still pending calculation-weight validation."
        : known
        ? "Source-mix ratio inferred from disclosed methodology evidence."
        : "No explicit primary/secondary source-origin evidence found in methodology rows.",
      quality_note_zh: reportedPrimary
        ? "优先使用原文明示初级数据百分比；仍需核验是否等同计算权重。"
        : known
        ? "根据方法学披露证据推断来源结构比例。"
        : "方法学行中未发现明确初级/次级来源证据。",
    };
  });

  const visible = bubbles
    .filter((row) => row.method_evidence_count > 0)
    .sort((a, b) => (b.known_source_evidence_count - a.known_source_evidence_count) || (b.method_evidence_count - a.method_evidence_count));
  const strongBubbles = visible
    .filter((row) => row.ratio_basis_key === "explicit_reported_primary_percentage")
    .map((row) => ({
      ...row,
      bubble_evidence_bucket: "strong_explicit_reported_primary_ratio",
      bubble_evidence_boundary_en: "Company report explicitly discloses a primary-data percentage. This can be drawn as a strong-evidence bubble, while calculation-weight equivalence remains subject to validation.",
      bubble_evidence_boundary_zh: "企业报告明确披露 primary data 百分比，可作为强证据气泡展示；是否等同于计算权重仍需核验。",
    }));
  const inferenceBubbles = visible
    .filter((row) => row.ratio_basis_key !== "explicit_reported_primary_percentage")
    .map((row) => ({
      ...row,
      bubble_evidence_bucket: "inference_source_mix_review",
      bubble_evidence_boundary_en: "Ratio is inferred from classified methodology rows and must remain review-only until the report discloses a percentage or calculation weight.",
      bubble_evidence_boundary_zh: "比例来自方法行来源结构推断；企业报告披露百分比或计算权重前，仅保留为复核数据。",
    }));

  return {
    bubbles: visible,
    strong_bubbles: strongBubbles,
    inference_bubbles: inferenceBubbles,
    summary: {
      companies_with_method_rows: visible.length,
      companies_with_known_source_mix: visible.filter((row) => row.known_source_evidence_count > 0).length,
      companies_with_explicit_reported_primary_ratio: strongBubbles.length,
      strong_bubble_count: strongBubbles.length,
      inference_bubble_count: inferenceBubbles.length,
      primary_evidence_rows: visible.reduce((sum, row) => sum + row.primary_count, 0),
      secondary_evidence_rows: visible.reduce((sum, row) => sum + row.secondary_count, 0),
      mixed_evidence_rows: visible.reduce((sum, row) => sum + row.mixed_count, 0),
      unknown_evidence_rows: visible.reduce((sum, row) => sum + row.unknown_count, 0),
    },
    display_policy_en: "The main bubble chart draws only strong bubbles based on explicitly reported primary-data percentages. Method-row source-mix ratios are retained as inference review data and are not drawn as strong evidence.",
    display_policy_zh: "主气泡图只绘制原文明示 primary data 百分比的强证据气泡；method_rows 来源结构比例保留为推断复核数据，不作为强证据绘制。",
    policy_en: "Bubble positions prefer explicit reported primary-data percentages when disclosed; otherwise method-row source mix remains inference review data rather than an audited calculation weight.",
    policy_zh: "气泡位置优先使用原文明示的初级数据百分比；没有明示百分比时退回方法行来源结构比例。两者仍需计算权重核验。",
  };
}

function summarizeSeries(companyMappings) {
  return GHG_SERIES.filter((series) => CORE_GHG_PCAF_STANDARD_IDS.has(series.id)).map((series) => {
    const companies = companyMappings.filter((company) => company.series.some((item) => item.series_id === series.id));
    const acceptedCompanies = companies.filter((company) => company.series.some((item) => item.series_id === series.id && (item.decision_bucket === "accepted" || (!item.decision_bucket && item.match_status === "explicit_series_citation"))));
    const reviewCompanies = companies.filter((company) => company.series.some((item) => item.series_id === series.id && (item.decision_bucket === "review" || (!item.decision_bucket && item.match_status === "contextual_scope_inventory_mapping"))));
    const demotedCompanies = companies.filter((company) => company.series.some((item) => item.series_id === series.id && (item.decision_bucket === "demoted" || (!item.decision_bucket && item.match_status === "contextual_overmapped_review"))));
    return {
      series_id: series.id,
      name_en: series.name_en,
      name_zh: series.name_zh,
      category_key: series.category_key,
      category_en: series.category_en,
      category_zh: series.category_zh,
      role_en: series.role_en,
      role_zh: series.role_zh,
      principle_en: series.principle_en,
      principle_zh: series.principle_zh,
      language_policy_en: series.language_policy_en,
      language_policy_zh: series.language_policy_zh,
      ...ghgSeriesMetadata(series),
      company_count: companies.length,
      accepted_company_count: acceptedCompanies.length,
      review_company_count: reviewCompanies.length,
      display_company_count: acceptedCompanies.length,
      explicit_company_count: acceptedCompanies.length,
      contextual_company_count: reviewCompanies.length,
      overmapped_review_company_count: demotedCompanies.length,
      resolved_company_count: acceptedCompanies.length,
      non_generic_company_count: companies.length,
      evidence_count: companies.reduce((sum, company) => sum + company.series.filter((item) => item.series_id === series.id).reduce((inner, item) => inner + item.evidence_count, 0), 0),
      overmapped_review_evidence_count: companies.reduce((sum, company) => sum + company.series.filter((item) => item.series_id === series.id).reduce((inner, item) => inner + (item.overmapped_review_evidence_count || 0), 0), 0),
    };
  });
}

function main() {
  const companies = listJsonFiles(COMPANIES_DIR)
    .map(readJson)
    .filter(Boolean)
    .filter((company) => clean(company.company_id));
  const companiesById = new Map(companies.map((company) => [company.company_id, company]));
  const expandedRecordsByCompany = loadExpandedEvidence(companiesById);
  const ghgSeriesBackfillByCompany = loadGhgSeriesBackfill();
  const rankings = buildEmissionRankings(expandedRecordsByCompany);
  const ledgerGhgCompanyMappings = loadGhgSeriesAcceptanceLedgerMappings(companiesById);
  const ghgCompanyMappings = ledgerGhgCompanyMappings.length
    ? ledgerGhgCompanyMappings
    : companies
      .map((company) => classifyGhgSeries(
        company,
        getCompanyMeta(company),
        expandedRecordsByCompany.get(company.company_id) || [],
        ghgSeriesBackfillByCompany.get(company.company_id) || [],
      ))
      .filter(Boolean)
      .sort((a, b) => numberOrZero(a.world500_rank) - numberOrZero(b.world500_rank));
  const ghgSeriesSummary = summarizeSeries(ghgCompanyMappings);
  const standardRoleGraph = buildStandardRoleGraph(companies, ghgCompanyMappings, ghgSeriesSummary);
  const acceptedStandardRoleGraph = buildAcceptedStandardRoleGraph(standardRoleGraph);
  const technologyPaths = buildTechnologyPaths(companies);
  const primarySecondary = buildPrimarySecondaryBubbles(companies, rankings);

  const payload = {
    schema_version: "world500-reporting-views-v1",
    generated_at: new Date().toISOString(),
    policy: {
      evidence_en: "P0 expanded evidence does not promote candidates. It only strengthens source display and gates direct-use Scope rows.",
      evidence_zh: "P0 扩展证据不提升候选值，只强化证据展示，并作为直接采信 Scope 行的证据门禁。",
      ranking_en: "Emissions ranking uses only expanded evidence rows that contain scope, value, unit, year, and no detected method conflict.",
      ranking_zh: "排放排行只使用同时命中范围、数值、单位、年份且无口径冲突的扩展证据行。",
      standard_en: "GHG series links distinguish explicit source citations from contextual inventory mappings. Unresolved generic GHG mentions remain review data and are not drawn as accepted graph edges.",
      standard_zh: "GHG 系列关系区分原文显式引用与清单上下文映射；未解析的泛化 GHG 提及保留为复核数据，不画成已采信图谱边。",
      source_mix_en: "Primary/secondary ratios prefer explicit reported primary-data percentages where disclosed; otherwise they remain disclosure-evidence source-mix ratios, not audited calculation weights.",
      source_mix_zh: "初级/次级比例优先使用原文明示初级数据百分比；没有明示百分比时仍为披露证据来源结构比例，不是已审定计算权重。",
    },
    summary: {
      company_count: companies.length,
      ghg_protocol_company_count: ghgCompanyMappings.length,
      ghg_explicit_series_company_count: ghgCompanyMappings.filter((company) => company.explicit_series_count > 0).length,
      ghg_resolved_series_company_count: ghgCompanyMappings.filter((company) => company.resolved_series_count > 0).length,
      ghg_accepted_series_company_count: ghgCompanyMappings.filter((company) => company.accepted_series_count > 0).length,
      ghg_non_generic_series_company_count: ghgCompanyMappings.filter((company) => company.non_generic_series_count > 0).length,
      ghg_review_series_company_count: ghgCompanyMappings.filter((company) => company.review_series_count > 0).length,
      ghg_contextual_series_company_count: ghgCompanyMappings.filter((company) => company.contextual_series_count > 0).length,
      ghg_overmapped_review_company_count: ghgCompanyMappings.filter((company) => company.overmapped_review_series_count > 0).length,
      ghg_generic_review_company_count: ghgCompanyMappings.filter((company) => company.generic_reference_count > 0).length,
      ghg_pcaf_core_whitelist_standard_count: CORE_GHG_PCAF_STANDARD_IDS.size,
      ghg_pcaf_core_whitelist_defined_count: GHG_SERIES.filter((series) => CORE_GHG_PCAF_STANDARD_IDS.has(series.id)).length,
      standard_company_count: standardRoleGraph.companies.length,
      standard_count: standardRoleGraph.standards.length,
      standard_link_count: standardRoleGraph.links.length,
      accepted_standard_company_count: acceptedStandardRoleGraph.companies.length,
      accepted_standard_count: acceptedStandardRoleGraph.standards.length,
      accepted_standard_link_count: acceptedStandardRoleGraph.links.length,
      standard_review_edges_excluded_from_drawn_graph: acceptedStandardRoleGraph.graph_exclusion_summary.review_edges_excluded,
      standard_review_companies_excluded_from_drawn_graph: acceptedStandardRoleGraph.graph_exclusion_summary.review_companies_excluded,
      expanded_evidence_company_count: expandedRecordsByCompany.size,
      strong_direct_scope_row_count: rankings.available.reduce((sum, row) => sum + row.strong_row_count, 0),
      complete_emissions_ranking_company_count: rankings.complete.length,
      available_emissions_ranking_company_count: rankings.available.length,
      technology_cluster_count: technologyPaths.clusters.length,
      technology_company_count: new Set(technologyPaths.clusters.flatMap((cluster) => cluster.company_ids || [])).size,
      technology_project_cluster_count: technologyPaths.project_clusters.filter((cluster) => numberOrZero(cluster.project_evidence_count) > 0).length,
      technology_project_evidence_count: technologyPaths.project_evidence.length,
      technology_project_company_count: technologyPaths.project_evidence_summary.project_company_count,
      technology_project_cost_evidence_count: technologyPaths.project_evidence_summary.project_cost_evidence_count,
      technology_project_cost_review_note_count: technologyPaths.project_evidence_summary.project_cost_review_note_count,
      technology_project_abatement_evidence_count: technologyPaths.project_evidence_summary.project_abatement_evidence_count,
      source_mix_company_count: primarySecondary.summary.companies_with_method_rows,
      source_mix_known_company_count: primarySecondary.summary.companies_with_known_source_mix,
      source_mix_explicit_reported_primary_ratio_company_count: primarySecondary.summary.companies_with_explicit_reported_primary_ratio,
    },
    ghg_standard_series: {
      definitions: GHG_SERIES
        .filter((series) => CORE_GHG_PCAF_STANDARD_IDS.has(series.id))
        .map(({ patterns, ...series }) => ({
          ...series,
          ...ghgSeriesMetadata(series),
        })),
      series_summary: ghgSeriesSummary,
      company_mappings: ghgCompanyMappings,
    },
    emissions_ranking: rankings,
    standard_role_graph: standardRoleGraph,
    accepted_standard_role_graph: acceptedStandardRoleGraph,
    technology_paths: technologyPaths,
    primary_secondary_data: primarySecondary,
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const registryPayload = {
    schema_version: "world500-ghg-pcaf-standard-registry-v1",
    generated_at: payload.generated_at,
    source: "tools/build_world500_reporting_views.js::GHG_SERIES",
    acceptance_policy_en: "This is the controlled whitelist for GHG Protocol / PCAF fine-standard edges. A company-standard edge is accepted only when page-level PDF text explicitly names the specific standard, official abbreviation, or strong alias.",
    acceptance_policy_zh: "这是 GHG Protocol / PCAF 细分标准边的受控白名单。企业-标准边只有在 PDF 页级原文明确命名具体标准、官方缩写或强别名时才采信。",
    generic_reference_policy_en: "Generic GHG Protocol references stay review-only and must not be drawn as accepted graph edges.",
    generic_reference_policy_zh: "泛化 GHG Protocol 引用保留为复核数据，不得画成已采信图谱边。",
    standard_count: CORE_GHG_PCAF_STANDARD_IDS.size,
    standards: payload.ghg_standard_series.definitions
      .filter((series) => series.core_whitelist)
      .map((series) => ({
        id: series.id,
        name_en: series.name_en,
        name_zh: series.name_zh,
        aliases_en: series.aliases_en || [],
        aliases_zh: series.aliases_zh || [],
        category_key: series.category_key,
        category_en: series.category_en,
        category_zh: series.category_zh,
        role_en: series.role_en,
        role_zh: series.role_zh,
        principle_en: series.principle_en,
        principle_zh: series.principle_zh,
        applicable_boundary_en: series.applicable_boundary_en || "",
        applicable_boundary_zh: series.applicable_boundary_zh || "",
        language_policy_en: series.language_policy_en,
        language_policy_zh: series.language_policy_zh,
        scope_terms_allowed: series.scope_terms_allowed,
        scope_terms_allowed_for: series.scope_terms_allowed_for,
        accepted_evidence_gate_en: series.accepted_evidence_gate_en,
        accepted_evidence_gate_zh: series.accepted_evidence_gate_zh,
      })),
  };
  fs.writeFileSync(GHG_PCAF_REGISTRY_OUTPUT_FILE, `${JSON.stringify(registryPayload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`Wrote ${path.relative(ROOT, GHG_PCAF_REGISTRY_OUTPUT_FILE)}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main();


