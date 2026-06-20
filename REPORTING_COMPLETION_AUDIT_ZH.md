# 世界500强 ESG 知识图谱完成度审计

- 生成时间：2026-06-21
- 审计矩阵日期：2026-06-07
- PNG manifest 生成时间：2026-06-20T17:29:34+00:00
- 总体状态：partial
- 是否可以声明全部完成：不可

## 结论

这些任务没有全部完成。展示层、全屏图和静态 PNG 同步基本完成；证据层和可采信覆盖率仍需继续补强。

当前可以声明的是：展示层、全屏图运行层和静态 PNG 同步门槛已经基本完成；不能声明的是：GHG 细分系列证据、企业总排放完整强证据排行、技术路径项目级证据、初级/次级数据真实计算权重仍未闭环。

## 核心指标

| 指标 | 当前值 |
| --- | --- |
| 企业总数 | 500 |
| GHG Protocol 相关企业 | 232 |
| 显式命中 GHG 具体系列企业 | 140 |
| 标准角色图标准节点 | 32 |
| 标准角色图企业 | 339 |
| 标准-企业关系 | 1913 |
| 有可用总排放量企业 | 85 |
| 完整强证据可比排行企业 | 16 |
| 技术路径企业 | 173 |
| 技术路径类别 | 9 |
| 项目级技术证据记录 | 77 |
| 项目级技术证据企业 | 51 |
| 项目级技术成本/投资强证据 | 12 |
| 项目级技术成本/投资复核说明 | 31 |
| 项目级技术减排效果证据 | 67 |
| 进入初级/次级来源结构企业 | 306 |
| 有可显示来源比例企业 | 161 |
| 原文明示 primary-data 百分比企业 | 13 |

## 需求逐项完成度

| 需求 | 状态 | 可声明完成 | 开放队列行数 | 已实现 | 未完成/风险 |
| --- | --- | --- | --- | --- | --- |
| R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | 部分完成 | 不可 | 927 | GHG Protocol 已拆为 12 个细分系列；标准角色图已有 32 个标准节点、339 家企业、1908 条标准-企业关系。 | GHG 显式细分证据仍不足，137/231 家企业显式命中具体系列；当前只有 267 条 accepted 细分边。12 类白名单核心 GHG review export 保留 515 条追溯行，其中 454 条仍为 effective review 待处理；另有 19 条白名单外 GHG 衍生/泛化引用已隔离，不得混入 12 类核心标准统计。标准-企业边也仍需继续提升页码和 snippet 质量。 |
| R2_TOTAL_EMISSIONS_RANKING_DESC | 部分完成 | 不可 | 189 | 已生成完整强证据排行图和静态 PNG；当前 85 家有可用总量，16 家进入完整 Scope 1/2/3 强证据排行。 | 完整可比排行覆盖率仍低，不能把 69 家 partial 总量混入主排行。 |
| R3_STANDARD_ROLE_FULL_GRAPH_AND_SCOPE_LANGUAGE | 已实现但仍有复核队列 | 不可 | 74 | 50 个 full-graph HTML 均为内嵌 JSON；标准节点和企业节点按标准/行业着色；非 GHG 标准自身 Scope 术语误用为 0。 | 仍有 74 条非 GHG 源文引用含 Scope 词，需要确认只作为引用语境展示。 |
| R4_TECHNOLOGY_PATH_AXIS | 部分完成 | 不可 | 432 | 图6 已有 9 类技术路径、流程轴、标准对齐、细分方向、时间信号和成本信号，并有中英文静态 PNG。 | 303 条技术-企业关系仍全部是披露关键词信号，不是已核证项目成本或减排量。 |
| R5_PRIMARY_SECONDARY_BUBBLE | 部分完成 | 不可 | 449 | 初级/次级气泡图已生成；306 家企业进入来源结构数据，161 家有可显示比例。 | 只有 13 家使用原文明示 primary data 百分比，多数比例仍是 method_rows 来源结构推断，不等同审定计算权重。 |
| R6_STATIC_PNG_SYNC_SUPPORTING_GATE | 已实现 | 可 | 0 | 8 张中英文 PNG 均存在，manifest 记录 reporting_views 源 hash 和每张 PNG hash。 | 只要 reporting_views.json 更新，就必须重跑静态图同步脚本。 |

## 未解决问题和优先级

| 序号 | 优先级 | 问题 | 状态 | 开放队列行数 | 下一步 | 风险 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | ghg_protocol_fine_series | 部分完成 | 927 | 逐条回到 PDF 页级证据，能显式命名具体 GHG 系列的升级；不能命名的降级或删除。 | 如果不降级上下文弱边，GHG 细分图会被误读为强证据企业-系列关系。 |
| 2 | P2 | standard_company_relationships | 结构已实现但证据质量有风险 | 0 | 抽样复核标准-企业边的页码与 snippet 完整度，优先处理低置信/弱片段。 | 结构完整但边证据不均衡，弱 snippet 会影响图谱可信度。 |
| 3 | P0 | emissions_ranking | 部分完成 | 189 | 按 Scope 1、Scope 2 方法/数值、Scope 3 缺口队列补齐完整强证据总量。 | partial 总量若混入主排行，会导致企业总排放排序不可比。 |
| 4 | Monitor | standard_full_graph_runtime | 已实现 | 0 | 后续每次改 reporting_views 或 full-graph 生成器后跑全量 HTML/PNG hash 校验。 | 当前是展示层风险；数据更新后未同步生成会重新漂移。 |
| 5 | P2 | scope_language_policy | 已实现但仍有复核队列 | 74 | 确认非 GHG 标准源文中的 Scope 词只作为引用展示，不进入标准自身术语。 | Scope 术语若进入非 GHG 标准口径，会造成标准体系概念错误。 |
| 6 | P1 | technology_path_axis | 部分完成 | 432 | 把关键词信号升级到公司级项目证据，补时间节点和成本/投资证据边界。 | 关键词信号若被当成项目级技术应用或成本证据，会夸大减碳路径结论。 |
| 7 | P1 | primary_secondary_bubble | 部分完成 | 449 | 把来源结构比例与真实计算权重区分开，优先补原文明示 primary data 百分比。 | 来源结构比例若被当成真实计算权重，会误导初级数据质量判断。 |
| 8 | Monitor | static_png_sync | 已实现 | 0 | 后续 reporting_views.json 更新后重跑 sync_reporting_static_figures.py。 | 页面和汇报 PNG 若不同源，会造成 GitHub 页面与汇报材料不一致。 |

## 五项需求的当前判断

### 一、GHG Protocol 具体系列、原则、清单匹配和企业关系

- 当前判断：已拆成细分系列/标准/指南/项目节点，泛化引用不再直接作为强证据；但显式证据覆盖不足，仍要逐条回 PDF 页级证据升/降级。
- 开放队列行数：927
- 下一步：逐条回到 PDF 页级证据，能显式命名具体 GHG 系列的升级；不能命名的降级或删除。

### 二、企业总碳排放量从高到低排序

- 当前判断：已有可用排行和静态图；但完整强证据可比排行只有少数企业，partial 总量不能混入主排行。
- 开放队列行数：189
- 下一步：按 Scope 1、Scope 2 方法/数值、Scope 3 缺口队列补齐完整强证据总量。

### 三、标准角色族全屏实体级知识图谱

- 当前判断：全屏图运行层已实现，标准/行业颜色已实现；仍需复核非 GHG 源文 Scope 词只作为引用语境。
- 开放队列行数：74
- 下一步：确认非 GHG 标准源文中的 Scope 词只作为引用展示，不进入标准自身术语。

### 四、图6 技术路径主轴

- 当前判断：已有 9 类技术路径、子类、流程轴、标准对齐、时间和成本信号，并新增 77 条项目/措施级页级证据，覆盖 51 家企业；但更大的技术-企业边集合仍主要是关键词披露信号，不能整体当作项目级核证证据。
- 开放队列行数：432
- 下一步：把关键词信号升级到公司级项目证据，补时间节点和成本/投资证据边界。

### 五、初级/次级数据气泡图

- 当前判断：气泡图已生成；但只有少量企业来自原文明示 primary-data 百分比，多数仍是来源结构推断，不可当作真实计算权重。
- 开放队列行数：449
- 下一步：把来源结构比例与真实计算权重区分开，优先补原文明示 primary data 百分比。

## 静态图和全屏图同步门槛

- PNG manifest：`assets/figures/reporting_static_figures_manifest.json`
- PNG 数量：10
- PNG 源数据：`assets/data/world500/workbench/reporting_views.json`
- 源数据 SHA256：`c85ef0fdd04cad020882dc41754aacb94b5bd0d1f0153085b2a1dff586eec914`
- 全屏图校验要求：50 个 `zh/en/*full-graph.html` 必须内嵌 JSON，且不能出现 `fetch(` 或 `<img>` fallback。

## 关键源文件

- `assets/data/world500/workbench/world500_requirement_completion_matrix.json`
- `assets/data/world500/workbench/reporting_gap_status_summary.json`
- `assets/data/world500/workbench/world500_reporting_unresolved_issue_register.json`
- `assets/data/world500/workbench/world500_reporting_completion_workplan.json`
- `assets/data/world500/workbench/world500_reporting_completion_workplan.csv`
- `assets/data/world500/workbench/reporting_completion_audit.json`
- `assets/data/world500/workbench/reporting_views.json`
- `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json`
- `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.csv`
- `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json`
- `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.csv`
- `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.json`
- `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.csv`
- `assets/data/world500/workbench/world500_technology_project_evidence.json`
- `assets/data/world500/workbench/world500_technology_project_evidence_audit.csv`
- `assets/data/world500/workbench/world500_technology_project_evidence_invalid_queue.csv`
- `assets/figures/reporting_static_figures_manifest.json`
- `tools/verify_reporting_completion_gate.py`

## 静态 PNG 业务完成边界

| 静态图 | 对应需求 | 业务完成状态 | 可声明业务完成 | 审计边界 |
| --- | --- | --- | --- | --- |
| assets/figures/zh/world500_emissions_ranking_graph.png | R2_TOTAL_EMISSIONS_RANKING_DESC | partial_complete_comparable_only | 不可 | 只有 Scope 1、选定 Scope 2 和 Scope 3 均具备强证据的企业进入可比排行图；partial 总量被排除。 |
| assets/figures/zh/world500_standard_chain_overview.png | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | partial_review_edges_remain | 不可 | GHG 细分系列企业数默认只按显式采信证据统计；上下文映射和疑似过度映射仍为复核数据。 |
| assets/figures/zh/world500_standard_role_entity_graph.png | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | partial_review_edges_remain | 不可 | Entity graph renders accepted standard-company edges only; generic GHG references and contextual mappings are excluded. |
| assets/figures/zh/world500_technology_cluster_overview.png | R4_TECHNOLOGY_PATH_AXIS | partial_disclosure_signal_only | 不可 | 技术聚类是企业报告中的披露主题信号，不等于已核证项目实施、减排量或项目经济性。 |
| assets/figures/zh/world500_primary_secondary_source_mix.png | R5_PRIMARY_SECONDARY_BUBBLE | partial_source_mix_inference | 不可 | 除原文明示 primary-data 百分比外，图中比例是来源结构推断，不是审定计算权重。 |
| assets/figures/en/world500_emissions_ranking_graph.png | R2_TOTAL_EMISSIONS_RANKING_DESC | partial_complete_comparable_only | 不可 | 只有 Scope 1、选定 Scope 2 和 Scope 3 均具备强证据的企业进入可比排行图；partial 总量被排除。 |
| assets/figures/en/world500_standard_chain_overview.png | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | partial_review_edges_remain | 不可 | GHG 细分系列企业数默认只按显式采信证据统计；上下文映射和疑似过度映射仍为复核数据。 |
| assets/figures/en/world500_standard_role_entity_graph.png | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | partial_review_edges_remain | 不可 | Entity graph renders accepted standard-company edges only; generic GHG references and contextual mappings are excluded. |
| assets/figures/en/world500_technology_cluster_overview.png | R4_TECHNOLOGY_PATH_AXIS | partial_disclosure_signal_only | 不可 | 技术聚类是企业报告中的披露主题信号，不等于已核证项目实施、减排量或项目经济性。 |
| assets/figures/en/world500_primary_secondary_source_mix.png | R5_PRIMARY_SECONDARY_BUBBLE | partial_source_mix_inference | 不可 | 除原文明示 primary-data 百分比外，图中比例是来源结构推断，不是审定计算权重。 |

## Completion Workplan

This section summarizes the executable evidence-closure workplan generated from the unresolved issue register.

| Priority | Open queue rows |
| --- | --- |
| P0 | 1116 |
| P2 | 74 |
| Monitor | 0 |
| P1 | 881 |

- JSON: `assets/data/world500/workbench/world500_reporting_completion_workplan.json`
- CSV: `assets/data/world500/workbench/world500_reporting_completion_workplan.csv`
- Verification: `python tools/verify_reporting_completion_gate.py`

## Evidence Closure Dashboard

This dashboard groups unresolved queues by priority, requirement, issue, and company. It is a review-planning artifact only and does not promote evidence or mark requirements complete.

- JSON: `assets/data/world500/workbench/world500_reporting_closure_dashboard.json`
- CSV: `assets/data/world500/workbench/world500_reporting_closure_dashboard.csv`
- Batch count: 793
- Open queue rows covered: 2071

| Priority | Requirement | Issue | Company | Rows | Safe action |
| --- | --- | --- | --- | --- | --- |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | APPLE | 11 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | PANASONIC HOLDINGS | 11 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | VOLKSWAGEN | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | VALERO ENERGY | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | PEPSICO | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | TESCO | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | AIRBUS | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | AMERICAN EXPRESS | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | MITSUBISHI ELECTRIC | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | OLAM GROUP | 10 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | ELECTRICITÉ DE FRANCE | 9 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |
| P0 | R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING | ghg_protocol_fine_series | ITOCHU | 9 | Return to page-level PDF text. Upgrade only if the concrete GHG Protocol series is explicitly named; otherwise keep review-only or demote the edge. |

## GHG Fine-Series Acceptance Ledger

This ledger unifies accepted, review-only, and demoted GHG Protocol fine-series company edges. It is the current safe boundary for whether a company-standard edge can be treated as accepted.

- JSON: `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json`
- CSV: `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.csv`
- Row count: 782
- Accepted explicit edges: 267
- Review-only contextual edges: 454
- Demoted overmapped edges: 61
- Generic GHG accepted count: 0
- Accepted outside 12-item whitelist: 0
- Review/demoted outside 12-item whitelist: 0

| Bucket | Decision | Company | GHG fine series | Match status | Safe use |
| --- | --- | --- | --- | --- | --- |
| accepted | accepted_explicit_named_series_edge | WALMART | GHG Protocol Corporate Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | WALMART | GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | UNITEDHEALTH GROUP | GHG Protocol Corporate Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | UNITEDHEALTH GROUP | Global GHG Accounting and Reporting Standard for the Financial Industry | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | CVS Health | GHG Protocol Corporate Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | CVS Health | GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | SHELL | GHG Protocol Corporate Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | SHELL | GHG Protocol Scope 2 Guidance | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | SHELL | GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | MCKESSON | GHG Protocol Corporate Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | Alphabet | GHG Protocol Corporate Accounting and Reporting Standard | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |
| accepted | accepted_explicit_named_series_edge | Alphabet | GHG Protocol Scope 2 Guidance | explicit_series_citation | May be used as an accepted company-to-GHG-fine-series edge. Scope wording is allowed only inside this GHG Protocol evidence context. |

## GHGP Zero-Accepted Standard Audit

This audit records controlled GHGP/PCAF standards with zero accepted company edges. Zero accepted is treated as a guarded evidence conclusion, not permission to infer adoption from generic GHG mentions.

- JSON: `assets/data/world500/workbench/world500_ghg_zero_accepted_standard_audit.json`
- CSV: `assets/data/world500/workbench/world500_ghg_zero_accepted_standard_audit.csv`
- Zero accepted standards: 5
- Policy: Zero accepted does not mean missing taxonomy work. It means current page-level evidence does not explicitly name and use the controlled GHGP standard enough to draw an accepted company-standard edge.

| GHGP standard | Accepted | Review | Evidence | Status | Decision |
| --- | --- | --- | --- | --- | --- |
| GHG Protocol Land Sector and Removals Standard | 0 | 8 | 12 | zero_accepted_review_only | Current rows are contextual or possible overmapping review leads. They do not explicitly show adoption/use of this exact standard, so they remain outside the accepted graph. |
| Global Protocol for Community-Scale Greenhouse Gas Emission Inventories | 0 | 0 | 0 | zero_accepted_no_current_evidence | No page-level source text in the current workbench names this controlled GHGP standard. Keep zero accepted; do not create company-standard edges without new PDF evidence. |
| GHG Protocol Mitigation Goal Standard | 0 | 0 | 0 | zero_accepted_no_current_evidence | No page-level source text in the current workbench names this controlled GHGP standard. Keep zero accepted; do not create company-standard edges without new PDF evidence. |
| GHG Protocol Policy and Action Standard | 0 | 0 | 0 | zero_accepted_no_current_evidence | No page-level source text in the current workbench names this controlled GHGP standard. Keep zero accepted; do not create company-standard edges without new PDF evidence. |
| GHG Protocol Guidelines for Grid-Connected Electricity Projects | 0 | 0 | 0 | zero_accepted_no_current_evidence | No page-level source text in the current workbench names this controlled GHGP standard. Keep zero accepted; do not create company-standard edges without new PDF evidence. |

## GHGP Zero-Accepted Review Closure Queue

This queue makes the zero-accepted decision machine-readable at company/standard level. It is intentionally review-only and forbids automatic promotion.

- JSON: `assets/data/world500/workbench/world500_ghg_zero_accepted_review_closure_queue.json`
- CSV: `assets/data/world500/workbench/world500_ghg_zero_accepted_review_closure_queue.csv`
- Closure rows: 12
- Promotion allowed rows: 0

| Not-acceptance reason | Rows |
| --- | --- |
| contextual_or_generic_ghg_without_exact_standard_use | 7 |
| monitoring_awaiting_finalization_not_adoption | 1 |
| no_current_page_level_source_text | 4 |

| GHGP standard | Company | Reason | Promote | Safe decision |
| --- | --- | --- | --- | --- |
| GHG Protocol Land Sector and Removals Standard | APPLE | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | ADM | monitoring_awaiting_finalization_not_adoption | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | PEPSICO | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | TESCO | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | CANADIAN IMPERIAL BANK OF COMMERCE | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | OLAM GROUP | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | RABOBANK GROUP | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Land Sector and Removals Standard | EMIRATES GROUP | contextual_or_generic_ghg_without_exact_standard_use | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| Global Protocol for Community-Scale Greenhouse Gas Emission Inventories | aggregate/no current row | no_current_page_level_source_text | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Mitigation Goal Standard | aggregate/no current row | no_current_page_level_source_text | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Policy and Action Standard | aggregate/no current row | no_current_page_level_source_text | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |
| GHG Protocol Guidelines for Grid-Connected Electricity Projects | aggregate/no current row | no_current_page_level_source_text | false | Keep out of the accepted standard-company graph until new page-level evidence satisfies the evidence gate. |

## Figure 6 Strict Project Evidence Gate

Figure 6 separates project-level evidence from broader disclosure signals. Cost/investment evidence is counted only when the normalized project record has `cost_evidence_status = accepted_project_cost_or_investment_evidence`; capacity, procurement volume, sales revenue, cost-advantage wording, and no-cost-disclosed notes are not counted as cost evidence.

- Project evidence rows: 77
- Project companies: 51
- Strict cost/investment evidence rows: 12
- Cost review-note rows excluded from strict cost evidence: 31
- Abatement-effect evidence rows: 67
- Source JSON: `assets/data/world500/workbench/world500_technology_project_evidence.json`
- Audit CSV: `assets/data/world500/workbench/world500_technology_project_evidence_audit.csv`

## GHG Overmapping Demotion Decisions

These decisions identify contextual GHG edges whose evidence does not support the currently linked series strongly enough. They are demotion/reassignment review records only and do not promote evidence.

- JSON: `assets/data/world500/workbench/world500_ghg_overmapped_demote_decisions.json`
- CSV: `assets/data/world500/workbench/world500_ghg_overmapped_demote_decisions.csv`
- Decision count: 61
- Company count: 35
- P0 subset JSON: `assets/data/world500/workbench/world500_ghg_p0_overmapped_demote_decisions.json`
- P0 subset CSV: `assets/data/world500/workbench/world500_ghg_p0_overmapped_demote_decisions.csv`
- P0 decision count: 16

| Company | Current series | Named series in sample | Decision | Safe action |
| --- | --- | --- | --- | --- |
| WALMART | ghg_scope2_guidance | ghg_corporate_standard / ghg_scope3_standard | demote_current_edge_reassign_only_after_page_review | Close the current overmapped edge as demoted. The series explicitly named in the sample already exists as an accepted company-series edge, so no new edge should be promoted from this row. |
| WALMART | ghg_scope3_calculation_guidance | ghg_corporate_standard / ghg_scope3_standard | demote_current_edge_reassign_only_after_page_review | Close the current overmapped edge as demoted. The series explicitly named in the sample already exists as an accepted company-series edge, so no new edge should be promoted from this row. |
| APPLE | ghg_scope3_standard |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| UNITEDHEALTH GROUP | ghg_scope2_guidance |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| UNITEDHEALTH GROUP | ghg_scope3_calculation_guidance |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| UNITEDHEALTH GROUP | ghg_scope3_standard |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| CHINA CONSTRUCTION BANK | ghg_scope3_standard |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| WALGREENS BOOTS ALLIANCE | ghg_scope2_guidance | ghg_corporate_standard | demote_current_edge_reassign_only_after_page_review | Close the current overmapped edge as demoted. The series explicitly named in the sample already exists as an accepted company-series edge, so no new edge should be promoted from this row. |
| WALGREENS BOOTS ALLIANCE | ghg_scope3_standard |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| ENEL | ghg_scope3_standard |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| BOSCH GROUP | ghg_scope3_standard |  | demote_current_edge_reassign_only_after_page_review | Demote the current edge. No replacement series is named in the sample; keep this only as a search lead until page-level PDF text explicitly names a concrete GHG series. |
| MORGAN STANLEY | ghg_scope2_guidance | ghg_corporate_standard | demote_current_edge_reassign_only_after_page_review | Close the current overmapped edge as demoted. The series explicitly named in the sample already exists as an accepted company-series edge, so no new edge should be promoted from this row. |

## Emissions Partial-Total Exclusion Decisions

These decisions record companies whose available total emissions remain sorted for review but are excluded from the complete comparable emissions ranking graph until Scope 1, selected Scope 2, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate.

- JSON: `assets/data/world500/workbench/world500_emissions_partial_exclusion_decisions.json`
- CSV: `assets/data/world500/workbench/world500_emissions_partial_exclusion_decisions.csv`
- Decision count: 69
- Company count: 69
- Missing Scope counts: {"Evidence Scope 2 scope2_method": 9, "Inventory year alignment": 2, "Scope 1": 24, "Scope 2": 41, "Scope 2 method": 9, "Scope 3": 45}

| Available rank | Company | Partial total MtCO2e | Missing scopes | Safe action |
| --- | --- | --- | --- | --- |
| 1 | AIRBUS | 781.765 | Scope 3 | Keep excluded from complete ranking. Backfill Scope 3 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 3 | RIO TINTO GROUP | 574.6 | Scope 1 / Scope 2 | Keep excluded from complete ranking. Backfill Scope 1 / Scope 2 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 4 | BHP GROUP | 377.6 | Scope 1 / Scope 2 | Keep excluded from complete ranking. Backfill Scope 1 / Scope 2 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 8 | BUNGE GLOBAL | 138.345291 | Scope 2 method / Scope 3 / Evidence Scope 2 scope2_method | Keep excluded from complete ranking. Backfill Scope 2 method / Scope 3 / Evidence Scope 2 scope2_method with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 12 | MAGNA INTERNATIONAL | 60.181438 | Scope 2 method / Evidence Scope 2 scope2_method | Keep excluded from complete ranking. Backfill Scope 2 method / Evidence Scope 2 scope2_method with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 13 | SHELL | 58 | Scope 3 | Keep excluded from complete ranking. Backfill Scope 3 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 14 | UNITED AIRLINES HOLDINGS | 52.105234 | Scope 2 | Keep excluded from complete ranking. Backfill Scope 2 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 15 | PTT | 41.4502 | Inventory year alignment | Keep excluded from complete ranking. Backfill Inventory year alignment with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 16 | AMERICAN AIRLINES GROUP | 39.782019 | Scope 3 | Keep excluded from complete ranking. Backfill Scope 3 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 17 | LINDE | 37.413 | Scope 3 | Keep excluded from complete ranking. Backfill Scope 3 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 19 | PBF Energy | 30.46 | Scope 3 | Keep excluded from complete ranking. Backfill Scope 3 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |
| 20 | ORLEN | 28.510855 | Scope 2 | Keep excluded from complete ranking. Backfill Scope 2 with page-level value, unit, inventory year, boundary, and Scope 2 method where applicable. |

## Emissions Ranking Evidence Ledger

This ledger unifies complete ranking rows, partial exclusions, and gap candidates. It is the current safe boundary for whether a company can enter the complete comparable total-emissions ranking.

- JSON: `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json`
- CSV: `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.csv`
- Complete accepted rows: 16
- Partial excluded rows: 69
- Gap candidate rows: 24
- P0 gap candidates: 3
- Auto-promote allowed count: 0
- P0 review buckets: {"P0_page_level_recheck_required": 3}

| Record type | Bucket | Company | Missing scopes | Candidate scope | P0 bucket | Safe use |
| --- | --- | --- | --- | --- | --- | --- |
| ranking_row_decision | partial_review_excluded | AIRBUS | Scope 3 |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |
| ranking_row_decision | complete_comparable_accepted | WALMART |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | partial_review_excluded | RIO TINTO GROUP | Scope 1 / Scope 2 |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |
| ranking_row_decision | partial_review_excluded | BHP GROUP | Scope 1 / Scope 2 |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |
| ranking_row_decision | complete_comparable_accepted | Equinor |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | complete_comparable_accepted | HOME DEPOT |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | complete_comparable_accepted | ECOPETROL |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | partial_review_excluded | BUNGE GLOBAL | Scope 2 method / Scope 3 / Evidence Scope 2 scope2_method |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |
| ranking_row_decision | complete_comparable_accepted | UNICREDIT GROUP |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | complete_comparable_accepted | AMAZON.COM |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | complete_comparable_accepted | ROYAL AHOLD DELHAIZE |  |  |  | May enter the complete comparable total-emissions ranking and ranking graph, including explicit finance Scope 3 boundary treatment where applicable. |
| ranking_row_decision | partial_review_excluded | MAGNA INTERNATIONAL | Scope 2 method / Evidence Scope 2 scope2_method |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |
| ranking_row_decision | partial_review_excluded | SHELL | Scope 3 |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |
| ranking_row_decision | partial_review_excluded | UNITED AIRLINES HOLDINGS | Scope 2 |  |  | Review only. Keep this total out of the complete comparable ranking until Scope 1, selected Scope 2 value/method, Scope 3, and finance Scope 3 boundary where applicable all pass the strong-evidence gate. |

## Emissions Year-Alignment Demotion Ledger

This ledger records direct Scope candidates whose value token maps to a different year column than inventory_year. These rows are excluded from the strong-evidence gate until source evidence is corrected and reporting_views is rebuilt.

- JSON: `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.json`
- CSV: `assets/data/world500/workbench/world500_emissions_year_alignment_demotions.csv`
- Decision count: 7
- Company count: 6
- Scope counts: {"Scope 1": 3, "Scope 2": 1, "Scope 3": 3}

| Company | Scope | Candidate MtCO2e | Inventory year | Demotion reason |
| --- | --- | --- | --- | --- |
| UNITEDHEALTH GROUP | Scope 3 | 13.811453 | 2024 | year_column_alignment mismatch: candidate 13,811,453 maps to 2022 but inventory_year is 2024; 2024 column value is 17,977,601 |
| Centene | Scope 1 | 0.013694 | 2024 | year_column_alignment mismatch: candidate 13,694 maps to 2022 but inventory_year is 2024; 2024 column value is 7,825 |
| KIA | Scope 3 | 0.0729755 | 2024 | year_column_alignment mismatch: candidate 72,975.5 maps to 2022 but inventory_year is 2024; 2024 column value is 99,395.2 |
| METLIFE | Scope 1 | 0.010610999999999999 | 2019 | year_column_alignment mismatch: candidate 10,611 maps to 2024 but inventory_year is 2019; 2019 column value is 18,342 |
| NEW YORK LIFE INSURANCE | Scope 2 | 0.095548 | 2024 | year_column_alignment mismatch: candidate 95,548 maps to 2019 but inventory_year is 2024; 2024 column value is 75,388 |
| NEW YORK LIFE INSURANCE | Scope 3 | 0.028430999999999998 | 2024 | year_column_alignment mismatch: candidate 28,431 maps to 2019 but inventory_year is 2024; 2024 column value is 57,931 |
| HONEYWELL INTERNATIONAL | Scope 1 | 1.5404849999999999 | 2024 | year_column_alignment mismatch: candidate 1,540,485 maps to 2020 but inventory_year is 2024; 2024 column value is 750,530 |
