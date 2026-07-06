# ESG 知识图谱 Schema

本项目定位为“世界 500 强 ESG 披露证据知识图谱与可视化审计平台”。Schema 的目标不是把项目包装成已完全形式化的 RDF/OWL 平台，而是把当前应用型知识图谱的节点、关系、证据和采信边界显式化。

机器可读版本见 `assets/data/world500/kg_schema.json`。

## 图层

| 图层 | 用途 | 关键文件 |
| --- | --- | --- |
| strict_traceable_graph | 严格可追溯图层，保留更多证据链和本体骨架 | `assets/data/world500/graph/world500_strict_traceable_kg.graphml` |
| published_graph | 对外发布图层 | `assets/data/world500/graph/world500_published_kg.graphml` |
| reporting_views | 网页和 PNG 同源的报告视图 | `assets/data/world500/workbench/reporting_views.json` |
| audit_ledgers | accepted/review/demoted 决策账本 | `assets/data/world500/workbench/*ledger*.json`、`assets/data/world500/workbench/*decisions*.json` |

计数必须引用 `snapshot_manifest.json` 中的具体 `layer_id`，不得把不同图层的节点数、边数、公司数说成同一快照。

## 节点类型

| 节点类型 | 含义 | 必填字段 | 证据要求 |
| --- | --- | --- | --- |
| Company | 世界 500 强企业实体 | `company_id`、`name`、`world500_rank`、`industry_section_code` | 实体注册表和别名表支撑 |
| Report | 企业报告或 PDF 来源 | `source_file`、`company_id`、`report_year` | 必须能回到原始文件 |
| Standard | 标准、指南、协议或行业扩展 | `standard_id`、`name_en`、`family`、`role` | 标准定义可来自注册表；企业引用关系需要页级证据 |
| StandardFamily | 标准体系或角色族 | `family_id`、`name` | 本体骨架节点，可无页级证据 |
| TechnologyPathway | 减碳技术路径 | `technology_id`、`name`、`category` | 披露信号、项目证据、成本证据需分层 |
| EmissionRecord | 排放数值记录 | `company_id`、`scope_or_boundary`、`value`、`unit`、`year` | 进入主排行必须有强证据闭环 |
| EvidenceSnippet | 页级证据片段 | `source_file`、`page`、`snippet`、`company_id` | 事实采信边的核心支撑 |
| AuditQueue | 待复核、补证据或降级队列 | `queue_id`、`priority`、`reason` | 队列本身说明未采信或待处理 |
| AcceptanceDecision | 采信决策 | `decision_id`、`decision_bucket`、`decision_status`、`evidence_gate` | 应能指向来源账本或队列 |

## 关系类型

| 关系类型 | Domain | Range | 是否需要页级证据 | 默认展示 |
| --- | --- | --- | --- | --- |
| COMPANY_CITES_GHGP_FINE_SERIES | Company | Standard | 是 | accepted 图谱显示 |
| COMPANY_CITES_STANDARD | Company | Standard | 是 | accepted 图谱显示 |
| COMPANY_REPORTS_EMISSION_VALUE | Company | EmissionRecord | 是 | 排放账本和排行图 |
| COMPANY_DISCLOSES_TECHNOLOGY_PATHWAY | Company | TechnologyPathway | 视证据层级而定 | 技术路径图分层显示 |
| EVIDENCE_SUPPORTS_EDGE | EvidenceSnippet | 任一事实边 | 是 | 证据面板显示 |
| REPORT_BELONGS_TO_COMPANY | Report | Company | 否，注册表支撑 | 数据血缘 |
| STANDARD_BELONGS_TO_FAMILY | Standard | StandardFamily | 否，本体骨架 | 标准目录和图例 |
| EDGE_HAS_ACCEPTANCE_DECISION | 任一事实边 | AcceptanceDecision | 否，决策账本支撑 | 审计面板显示 |

## 事实边与本体骨架边

| 类型 | 定义 | 示例 | 页级证据门槛 |
| --- | --- | --- | --- |
| 事实采信边 | 表达企业披露、引用、报告或实施的事实 | 企业引用 Scope 2 Guidance；企业报告 Scope 3 总量 | accepted 必须有 `source_file`、`page`、`snippet` 或等价页级证据 |
| 本体骨架边 | 表达概念之间的固定层级或分类 | Standard 属于 GHG Protocol family；Technology 属于路径大类 | 不进入 evidence-page 覆盖率分母 |
| 复核边 | 有上下文信号但不足以采信 | 泛化 GHG Protocol 引用、Scope 上下文推断 | 不得进入 accepted 图谱 |
| 降级边 | 已判定过度映射、泛化或证据不足 | generic GHG 被误挂到具体 GHGP 标准 | 不得进入 accepted 图谱 |

## 术语边界

Scope 1/2/3 和 Scope 3 categories 只在 GHGP 语境下作为核算口径使用。非 GHGP 标准图、ISO/GB 标准图或通用标准角色图不得把 Scope 3 categories 扩展成这些标准自身的术语；如原文引用出现 Scope，只能作为引用语境展示。

## 版本和快照

所有对外数字必须引用以下文件之一：

| 用途 | 文件 |
| --- | --- |
| 图层计数和 hash | `assets/data/world500/workbench/snapshot_manifest.json` |
| 网页和 PNG 数据 | `assets/data/world500/workbench/reporting_views.json` |
| 需求完成度 | `assets/data/world500/workbench/world500_requirement_completion_matrix.json` |
| GHGP 决策 | `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json` |
| 排放排行决策 | `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json` |

