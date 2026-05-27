const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKBENCH_DIR = path.join(ROOT, "assets", "data", "world500", "workbench");
const COMPANIES_DIR = path.join(WORKBENCH_DIR, "companies");
const EXPANDED_DIR = path.join(WORKBENCH_DIR, "expanded_evidence");
const OUTPUT_FILE = path.join(WORKBENCH_DIR, "reporting_views.json");

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
      /corporate standard/i,
      /corporate accounting standard/i,
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
      /scope 3.*accounting and reporting standard/i,
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
      /land sector.*removals/i,
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
    patterns: [/product life cycle/i, /product standard/i],
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
    patterns: [/scope 2 guidance/i, /ghg protocol scope 2/i],
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
    patterns: [/scope 3 calculation guidance/i, /technical guidance.*scope 3/i],
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
    patterns: [/estimating and reporting avoided emissions/i, /avoided emissions.*ghg protocol/i],
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
      /pcaf.*ghg/i,
      /financed emissions.*ghg protocol/i,
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
    patterns: [/project protocol/i, /project accounting/i],
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
    row.source_file,
  ].join(" "));
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

function addMapItem(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function classifyGhgSeries(company, meta) {
  const evidenceRows = [];
  const sourceRows = [
    ...(Array.isArray(company.standards) ? company.standards : []),
    ...(Array.isArray(company.evidence_ledger) ? company.evidence_ledger.filter((row) => /standard/i.test(clean(row.fact_type_en))) : []),
  ];

  sourceRows.forEach((row) => {
    const text = evidenceText(row);
    if (!/ghg protocol|greenhouse gas protocol/i.test(text)) return;
    const matchedSeries = GHG_SERIES.filter((series) => series.id !== "ghg_generic_reference" && series.patterns.some((pattern) => pattern.test(text)));
    const targets = matchedSeries.length ? matchedSeries : [GHG_SERIES.find((series) => series.id === "ghg_generic_reference")];
    targets.forEach((series) => {
      evidenceRows.push({
        series_id: series.id,
        match_status: matchedSeries.length ? "explicit_series_citation" : "generic_ghg_reference_review_required",
        evidence: rowEvidence(row),
      });
    });
  });

  if (!evidenceRows.length) return null;

  const grouped = new Map();
  evidenceRows.forEach((item) => addMapItem(grouped, item.series_id, item));
  const series = [...grouped.entries()].map(([seriesId, rows]) => {
    const definition = GHG_SERIES.find((item) => item.id === seriesId);
    return {
      series_id: seriesId,
      name_en: definition.name_en,
      name_zh: definition.name_zh,
      category_key: definition.category_key,
      category_en: definition.category_en,
      category_zh: definition.category_zh,
      match_status: rows.some((row) => row.match_status === "explicit_series_citation")
        ? "explicit_series_citation"
        : "generic_ghg_reference_review_required",
      evidence_count: rows.length,
      pages: unique(rows.map((row) => row.evidence.page)).slice(0, 8),
      source_files: unique(rows.map((row) => row.evidence.source_file)).slice(0, 4),
      evidence_samples: rows.map((row) => row.evidence).slice(0, 3),
    };
  });

  return {
    ...meta,
    series,
    explicit_series_count: series.filter((item) => item.match_status === "explicit_series_citation").length,
    generic_reference_count: series.filter((item) => item.series_id === "ghg_generic_reference").reduce((sum, item) => sum + item.evidence_count, 0),
  };
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

    const selected = {
      scope1: selectBestRecord(buckets.scope1),
      scope2_market: selectBestRecord(buckets.scope2_market),
      scope2_location: selectBestRecord(buckets.scope2_location),
      scope2_unknown: selectBestRecord(buckets.scope2_unknown),
      scope3: selectBestRecord(buckets.scope3),
    };
    const selectedScope2 = selected.scope2_market || selected.scope2_location || selected.scope2_unknown;
    const selectedRows = [selected.scope1, selectedScope2, selected.scope3].filter(Boolean);
    if (!selectedRows.length) return;

    const total = selectedRows.reduce((sum, record) => sum + numberOrZero(record.value_mtco2e), 0);
    const missingScopes = [
      selected.scope1 ? "" : "Scope 1",
      selectedScope2 ? "" : "Scope 2",
      selected.scope3 ? "" : "Scope 3",
    ].filter(Boolean);
    available.push({
      company_id: companyId,
      company_name_en: clean(strongRecords[0].company_name_en),
      company_name_zh: clean(strongRecords[0].company_name_zh),
      world500_rank: numberOrZero(strongRecords[0].world500_rank) || "",
      industry_section_code: clean(strongRecords[0].industry_section_code) || "unknown",
      industry_section_en: clean(strongRecords[0].industry_section_en) || "Unknown",
      industry_section_zh: clean(strongRecords[0].industry_section_zh) || "未分类",
      industry_color: INDUSTRY_COLORS[clean(strongRecords[0].industry_section_code)] || INDUSTRY_COLORS.unknown,
      total_mtco2e: Number(total.toFixed(6)),
      scope1_mtco2e: selected.scope1 ? numberOrZero(selected.scope1.value_mtco2e) : null,
      scope2_mtco2e: selectedScope2 ? numberOrZero(selectedScope2.value_mtco2e) : null,
      scope2_method_en: selectedScope2 ? clean(selectedScope2.scope2_reporting_method || selectedScope2.basis_en || "Unspecified") : "",
      scope3_mtco2e: selected.scope3 ? numberOrZero(selected.scope3.value_mtco2e) : null,
      inventory_years: unique(selectedRows.map((record) => clean(record.inventory_year))).slice(0, 5),
      selected_evidence_pages: unique(selectedRows.map((record) => clean(record.evidence_page))).slice(0, 8),
      selected_source_files: unique(selectedRows.map((record) => clean(record.source_file))).slice(0, 4),
      selected_rows: selectedRows.map((record) => ({
        scope_en: clean(record.scope_en),
        scope_zh: clean(record.scope_zh),
        value_mtco2e: numberOrZero(record.value_mtco2e),
        inventory_year: clean(record.inventory_year),
        scope2_reporting_method: clean(record.scope2_reporting_method || record.basis_en),
        evidence_page: clean(record.evidence_page),
        source_file: clean(record.source_file),
        snippet_en: compactSnippet(record.snippet_en, 520),
        snippet_zh: compactSnippet(record.snippet_zh || record.snippet_en, 520),
      })),
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

  return { available, complete, ranking_graph: buildEmissionRankingGraph(complete) };
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

function buildStandardRoleGraph(companies) {
  const standardMap = new Map();
  const companyMap = new Map();
  const linkMap = new Map();
  const industryMap = new Map();

  companies.forEach((company) => {
    const meta = getCompanyMeta(company);
    const standards = Array.isArray(company.standards) ? company.standards : [];
    standards.forEach((row) => {
      const standardName = clean(row.standard_name_en || row.standard_name_zh || row.label_en || row.label_zh);
      if (!standardName) return;
      const id = standardName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || encodeURIComponent(standardName);
      if (!standardMap.has(id)) {
        const color = STANDARD_COLORS[standardMap.size % STANDARD_COLORS.length];
        standardMap.set(id, {
          id,
          name_en: standardName,
          name_zh: clean(row.standard_name_zh || standardName),
          family_en: clean(row.standard_family_en),
          family_zh: clean(row.standard_family_zh),
          roles_en: new Set(),
          roles_zh: new Set(),
          principles_en: new Set(),
          principles_zh: new Set(),
          color,
          company_ids: new Set(),
          evidence_count: 0,
          evidence_samples: [],
        });
      }

      const standard = standardMap.get(id);
      clean(row.standard_role_en).split("|").forEach((item) => item && standard.roles_en.add(item));
      clean(row.standard_role_zh).split("|").forEach((item) => item && standard.roles_zh.add(item));
      clean(row.accounting_principle_en).split("|").forEach((item) => item && standard.principles_en.add(item));
      clean(row.accounting_principle_zh).split("|").forEach((item) => item && standard.principles_zh.add(item));
      standard.company_ids.add(meta.company_id);
      standard.evidence_count += 1;
      if (standard.evidence_samples.length < 4) standard.evidence_samples.push(rowEvidence(row));

      if (!companyMap.has(meta.company_id)) {
        companyMap.set(meta.company_id, {
          ...meta,
          standard_ids: new Set(),
          evidence_count: 0,
        });
      }
      const companyNode = companyMap.get(meta.company_id);
      companyNode.standard_ids.add(id);
      companyNode.evidence_count += 1;

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

      const linkKey = `${id}__${meta.company_id}`;
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, {
          standard_id: id,
          company_id: meta.company_id,
          industry_section_code: meta.industry_section_code,
          evidence_count: 0,
          pages: new Set(),
          source_files: new Set(),
          evidence_samples: [],
        });
      }
      const link = linkMap.get(linkKey);
      link.evidence_count += 1;
      if (row.evidence_page) link.pages.add(clean(row.evidence_page));
      if (row.source_file) link.source_files.add(clean(row.source_file));
      if (link.evidence_samples.length < 2) link.evidence_samples.push(rowEvidence(row));
    });
  });

  const standards = [...standardMap.values()]
    .map((standard) => ({
      ...standard,
      roles_en: [...standard.roles_en],
      roles_zh: [...standard.roles_zh],
      principles_en: [...standard.principles_en],
      principles_zh: [...standard.principles_zh],
      company_count: standard.company_ids.size,
      company_ids: [...standard.company_ids],
    }))
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

function collectEvidenceRows(company) {
  return [
    ...(Array.isArray(company.carbon_evidence_rows) ? company.carbon_evidence_rows : []),
    ...(Array.isArray(company.method_rows) ? company.method_rows : []),
    ...(Array.isArray(company.evidence_ledger) ? company.evidence_ledger : []),
  ];
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

function buildTechnologyPathsFromEmbedded(graphPayload, companiesById) {
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
    };
  });

  return clusters.sort((a, b) => b.company_count - a.company_count);
}

function buildTechnologyPaths(companies) {
  const companiesById = new Map(companies.map((company) => [company.company_id, company]));
  const embeddedTechnologyGraph = loadEmbeddedGraphData(path.join("en", "technology-cluster-full-graph.html"));
  if (embeddedTechnologyGraph?.system?.key === "technology_clusters") {
    const clusters = buildTechnologyPathsFromEmbedded(embeddedTechnologyGraph, companiesById);
    return {
      clusters,
      source: "embedded_technology_cluster_full_graph",
      source_note_en: "Technology cluster counts are extracted from the existing full-screen technology graph; timeline, subtype, and cost signals remain keyword evidence signals.",
      source_note_zh: "技术聚类数量来自现有技术全屏图谱；时间、细分类型和成本仍是关键词证据信号。",
      flow: technologyFlow(),
    };
  }

  const clusterMap = new Map(TECHNOLOGY_CLUSTERS.map((cluster) => [cluster.id, {
    ...cluster,
    company_ids: new Set(),
    evidence_count: 0,
    evidence_samples: [],
    cost_signal_count: 0,
    timeline_counts: { near: 0, mid: 0, long: 0 },
    subtype_counts: Object.fromEntries(cluster.subtypes.map((subtype) => [subtype.id, 0])),
    company_examples: [],
  }]));

  companies.forEach((company) => {
    const meta = getCompanyMeta(company);
    const rows = collectEvidenceRows(company);
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
    }))
    .sort((a, b) => b.company_count - a.company_count);

  return { clusters, source: "company_workbench_keyword_fallback", flow: technologyFlow() };
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
    const ranking = totalsByCompany.get(meta.company_id);
    return {
      ...meta,
      primary_count: counts.primary,
      secondary_count: counts.secondary,
      mixed_count: counts.mixed,
      unknown_count: counts.unknown,
      method_evidence_count: total,
      known_source_evidence_count: known,
      primary_ratio_known: known ? Number((weightedPrimary / known).toFixed(4)) : null,
      secondary_ratio_known: known ? Number((weightedSecondary / known).toFixed(4)) : null,
      primary_ratio_all: total ? Number((weightedPrimary / total).toFixed(4)) : null,
      unknown_ratio: total ? Number((counts.unknown / total).toFixed(4)) : null,
      total_mtco2e: ranking ? ranking.total_mtco2e : null,
      strong_scope_row_count: ranking ? ranking.strong_row_count : 0,
      evidence_samples: samples,
      quality_note_en: known
        ? "Source-mix ratio inferred from disclosed methodology evidence."
        : "No explicit primary/secondary source-origin evidence found in methodology rows.",
      quality_note_zh: known
        ? "根据方法学披露证据推断来源结构比例。"
        : "方法学行中未发现明确初级/次级来源证据。",
    };
  });

  const visible = bubbles
    .filter((row) => row.method_evidence_count > 0)
    .sort((a, b) => (b.known_source_evidence_count - a.known_source_evidence_count) || (b.method_evidence_count - a.method_evidence_count));

  return {
    bubbles: visible,
    summary: {
      companies_with_method_rows: visible.length,
      companies_with_known_source_mix: visible.filter((row) => row.known_source_evidence_count > 0).length,
      primary_evidence_rows: visible.reduce((sum, row) => sum + row.primary_count, 0),
      secondary_evidence_rows: visible.reduce((sum, row) => sum + row.secondary_count, 0),
      mixed_evidence_rows: visible.reduce((sum, row) => sum + row.mixed_count, 0),
      unknown_evidence_rows: visible.reduce((sum, row) => sum + row.unknown_count, 0),
    },
    policy_en: "Bubble positions are disclosure-evidence source mix, not audited measurement precision or actual calculation weight.",
    policy_zh: "气泡位置表示披露证据中的来源结构，不代表已审定的计量精度或真实计算权重。",
  };
}

function summarizeSeries(companyMappings) {
  return GHG_SERIES.map((series) => {
    const companies = companyMappings.filter((company) => company.series.some((item) => item.series_id === series.id));
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
      company_count: companies.length,
      explicit_company_count: companies.filter((company) => company.series.some((item) => item.series_id === series.id && item.match_status === "explicit_series_citation")).length,
      evidence_count: companies.reduce((sum, company) => sum + company.series.filter((item) => item.series_id === series.id).reduce((inner, item) => inner + item.evidence_count, 0), 0),
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
  const rankings = buildEmissionRankings(expandedRecordsByCompany);
  const ghgCompanyMappings = companies
    .map((company) => classifyGhgSeries(company, getCompanyMeta(company)))
    .filter(Boolean)
    .sort((a, b) => numberOrZero(a.world500_rank) - numberOrZero(b.world500_rank));
  const standardRoleGraph = buildStandardRoleGraph(companies);
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
      standard_en: "Exact GHG Protocol series are assigned only when the source text names the series; generic GHG mentions remain review-required.",
      standard_zh: "GHG Protocol 具体系列只在原文写明时归类；泛化 GHG 引用保留为待复核。",
      source_mix_en: "Primary/secondary data ratios are disclosure-evidence ratios, not audited calculation weights.",
      source_mix_zh: "初级/次级数据比例是披露证据结构比例，不是已审定计算权重。",
    },
    summary: {
      company_count: companies.length,
      ghg_protocol_company_count: ghgCompanyMappings.length,
      ghg_explicit_series_company_count: ghgCompanyMappings.filter((company) => company.explicit_series_count > 0).length,
      standard_company_count: standardRoleGraph.companies.length,
      standard_count: standardRoleGraph.standards.length,
      standard_link_count: standardRoleGraph.links.length,
      expanded_evidence_company_count: expandedRecordsByCompany.size,
      strong_direct_scope_row_count: rankings.available.reduce((sum, row) => sum + row.strong_row_count, 0),
      complete_emissions_ranking_company_count: rankings.complete.length,
      available_emissions_ranking_company_count: rankings.available.length,
      technology_cluster_count: technologyPaths.clusters.length,
      technology_company_count: new Set(technologyPaths.clusters.flatMap((cluster) => cluster.company_ids || [])).size,
      source_mix_company_count: primarySecondary.summary.companies_with_method_rows,
      source_mix_known_company_count: primarySecondary.summary.companies_with_known_source_mix,
    },
    ghg_standard_series: {
      definitions: GHG_SERIES.map(({ patterns, ...series }) => series),
      series_summary: summarizeSeries(ghgCompanyMappings),
      company_mappings: ghgCompanyMappings,
    },
    emissions_ranking: rankings,
    standard_role_graph: standardRoleGraph,
    technology_paths: technologyPaths,
    primary_secondary_data: primarySecondary,
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main();
