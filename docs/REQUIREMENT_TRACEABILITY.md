# 需求方问题交付追踪矩阵

本文件把需求方 5 个核心问题映射到页面、图表、数据、口径说明和验证入口。它是后续验收导航文件，不替代原始数据账本。

权威数据快照以 `assets/data/world500/workbench/snapshot_manifest.json` 和 `assets/data/world500/workbench/reporting_views.json` 为准。不同图层的节点数、边数和公司数不得混写为同一快照。

## 当前总判断

| 需求 | 当前状态 | 可对外声明 | 主要风险 |
| --- | --- | --- | --- |
| 一、GHG Protocol 细分标准和企业关联 | 部分完成，已拆 12 个 GHGP 节点，accepted 细分边 267 | 可声明“已建立 accepted/review/demoted 闭环”，不可声明全量完成 | 还有 demoted/review 历史队列和弱证据上下文需要继续清洗 |
| 二、企业总碳排放量排序 | 部分完成，完整可比排行 27 家 | 可展示强证据主榜，partial 只能作参考 | Scope 1/2/3 缺口企业不能混入主排行 |
| 三、标准角色族全屏实体级图谱 | 展示层已实现，仍需持续复核证据边界 | 可作为验收图展示 accepted 图谱 | 非 GHG 语境下 Scope 词汇只能作为原文引用，不得扩展成标准口径 |
| 四、图 6 技术路径主轴 | 部分完成，项目证据 77 条、成本/投资强证据 11 条 | 可展示“披露信号 + 项目证据分层” | 技术关键词不能等同于已实施项目，成本证据仍薄 |
| 五、初级/次级数据气泡图 | 部分完成，13 家有原文明示 primary-data 百分比 | 可作为探索图展示 | 推断比例不能当作审计级计算权重 |

## 需求一：GHG Protocol 具体系列、原则和企业关联

### 回答对象

需求方要看到具体用了哪些 GHG Protocol 标准、指南或项目协议，而不是一个泛化的 `GHG Protocol` 大类。

### 当前交付物

| 类型 | 路径 |
| --- | --- |
| 全屏验收图 | `zh/ghg-protocol-full-graph.html`、`en/ghg-protocol-full-graph.html` |
| 标准角色全屏图 | `zh/role-family-standard-full-graph.html`、`en/role-family-standard-full-graph.html` |
| 核心数据 | `assets/data/world500/workbench/reporting_views.json` |
| GHGP 决策账本 | `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json` |
| accepted/review/demoted 决策视图 | `assets/data/world500/workbench/world500_ghg_review_acceptance_decisions.json` |
| 静态 PNG | `assets/figures/zh/world500_standard_role_entity_graph.png`、`assets/figures/en/world500_standard_role_entity_graph.png` |

### 验收口径

| 项目 | 标准 |
| --- | --- |
| GHGP 清单 | 必须覆盖需求方给出的 12 个 GHGP 标准/指南/项目协议节点 |
| accepted 边 | 只允许企业报告页级原文明示具体 GHGP 细分标准、官方简称或强别名 |
| review 边 | 只来自上下文、Scope 语境或弱别名推断，不能画入 accepted 验收图 |
| demoted 边 | 泛化 GHG 引用、过度映射、弱上下文，必须排除出 accepted 图 |
| 泛化引用 | `GHG Protocol` 泛化提及不得直接等同于任一具体细分标准 |

### 下一步

继续清洗 GHGP 历史队列：能回到 PDF 页级原文明示具体标准的保留 accepted；不能确认的保留 review 或 demoted。目标不是强行让 12 个标准都有企业，而是证明每条边的证据状态可解释。

## 需求二：企业总碳排放量从高到低

### 当前交付物

| 类型 | 路径 |
| --- | --- |
| 排放账本页面 | `zh/emission-ledger.html`、`en/emission-ledger.html` |
| 排行数据 | `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json` |
| 发布视图 | `assets/data/world500/workbench/reporting_views.json` |
| 静态 PNG | `assets/figures/zh/world500_emissions_ranking_graph.png`、`assets/figures/en/world500_emissions_ranking_graph.png` |

### 验收口径

主排行只允许 `Scope 1 + selected Scope 2 + Scope 3` 均通过强证据门槛的企业进入。partial total、缺 Scope 3、缺年份、缺单位、缺 Scope 2 方法的记录只能进入参考或复核队列。

### 下一步

当前完整可比主榜为 27 家。若汇报强依赖“从高到低”结论，应继续把 3 家以上 near-complete 企业补成 Scope 1/2/3 闭环，目标达到 30 家以上。

## 需求三：标准角色族全屏实体级知识图谱

### 当前交付物

| 类型 | 路径 |
| --- | --- |
| 标准角色图谱 | `zh/role-family-standard-full-graph.html`、`en/role-family-standard-full-graph.html` |
| GHGP 验收图谱 | `zh/ghg-protocol-full-graph.html`、`en/ghg-protocol-full-graph.html` |
| 图谱运行时 | `assets/js/standard_cluster_full_graph.js`、`assets/js/generic_full_graph.js` |
| 静态 PNG | `assets/figures/zh/world500_standard_role_entity_graph.png`、`assets/figures/en/world500_standard_role_entity_graph.png` |

### 验收口径

| 视觉要求 | 状态/规则 |
| --- | --- |
| 标准放中间 | 标准节点作为中心/簇中心节点 |
| 企业放外围 | 企业节点围绕标准聚类 |
| 不同标准不同颜色 | 标准色用于标准节点和对应边 |
| 企业按行业背景色 | 企业节点和行业扇区使用行业色 |
| accepted/review/demoted 区分 | 默认验收图只画 accepted；review/demoted 不伪装为采信边 |
| Scope 术语边界 | 仅 GHGP 语境使用 Scope 1/2/3；非 GHGP 标准使用 direct/indirect/other indirect 等表述 |

### 下一步

把 GHGP 页面的筛选、目录、边级解释、导出 PNG、可信边界卡片沉淀为全项目图谱交互规范，并逐步推广到 ISO、GB、技术路径等 full-graph 页面。

## 需求四：图 6 技术路径主轴和企业聚类

### 当前交付物

| 类型 | 路径 |
| --- | --- |
| 技术路径全屏图 | `zh/technology-cluster-full-graph.html`、`en/technology-cluster-full-graph.html` |
| 技术路径数据 | `assets/data/world500/workbench/reporting_views.json` 的 `technology_paths` |
| 成本补强队列 | `assets/data/world500/workbench/world500_technology_cost_p0_backfill_targets.csv` |
| 静态 PNG | `assets/figures/zh/world500_technology_cluster_overview.png`、`assets/figures/en/world500_technology_cluster_overview.png` |

### 验收口径

图 6 必须区分五层证据：关键词披露、公司层面技术提及、项目/措施证据、成本/投资证据、减排效果证据。只有项目/措施证据以上才能支持“企业有具体减碳项目”的表述；成本/投资证据不能用容量、采购量或项目规模替代。

### 下一步

优先补电动化运输、可再生电力、电池与储能、低碳燃料、能效五类技术的成本/投资证据；同时在图上明确时间信息是“报告披露年份”还是“项目实施年份”。

## 需求五：初级/次级数据气泡图

### 当前交付物

| 类型 | 路径 |
| --- | --- |
| 数据来源图谱 | `zh/method-data-source-type-full-graph.html`、`en/method-data-source-type-full-graph.html` |
| 数据质量图谱 | `zh/method-data-quality-flag-full-graph.html`、`en/method-data-quality-flag-full-graph.html` |
| 明示 primary 比例数据 | `assets/data/world500/workbench/world500_primary_secondary_explicit_primary_ratio.csv` |
| 静态 PNG | `assets/figures/zh/world500_primary_secondary_source_mix.png`、`assets/figures/en/world500_primary_secondary_source_mix.png` |

### 验收口径

必须区分三类：报告明示 primary-data 百分比、报告明示使用 primary/secondary 但未披露比例、根据方法行来源结构推断。缺披露不等于 0，推断比例不等于审计级计算权重。

### 下一步

保留现有气泡图作为探索图，并继续补企业报告中明确写出的 `primary data`、`supplier-specific data`、`secondary data`、`spend-based`、`average-data` 比例或计算权重。

## 建议验证命令

```powershell
cd "C:\Users\lenovo\Desktop\一些任务\董敬轩\知识图谱\fortune500_esg_kg_demo\site"
node tools\verify_kg_governance.js
python tools\verify_reporting_completion_gate.py
```
