# KG Quality Report

本报告记录当前知识图谱的质量边界。它不宣称项目全量完成，只说明当前哪些关系可以采信、哪些仍需复核。

数据基准：

| 文件 | 用途 |
| --- | --- |
| `assets/data/world500/workbench/reporting_views.json` | 网页和 PNG 同源发布视图 |
| `assets/data/world500/workbench/snapshot_manifest.json` | 图层 hash、节点数、边数、公司数 |
| `assets/data/world500/workbench/world500_ghg_series_acceptance_ledger.json` | GHGP 细分标准采信账本 |
| `assets/data/world500/workbench/world500_emissions_ranking_evidence_ledger.json` | 排放排行采信账本 |
| `assets/data/world500/workbench/world500_requirement_completion_matrix.json` | 需求完成度矩阵 |

## 核心指标

| 指标 | 当前值 |
| --- | ---: |
| 企业总数 | 500 |
| GHG Protocol 相关企业 | 229 |
| 显式命中 GHGP 具体系列企业 | 137 |
| GHGP 12 类白名单标准数 | 12 |
| GHGP accepted 细分边 | 267 |
| GHGP demoted 细分边 | 515 |
| 泛化 GHG 引用 accepted 数 | 0 |
| 标准角色 accepted 企业 | 209 |
| 标准角色 accepted 标准 | 25 |
| 标准角色 accepted 边 | 456 |
| 标准角色 review 边排除数 | 1452 |
| 完整可比排放排行企业 | 27 |
| 可用排放排行企业 | 91 |
| 技术路径类别 | 9 |
| 技术路径企业 | 173 |
| 项目级技术证据 | 77 |
| 项目级技术证据企业 | 53 |
| 项目级成本/投资强证据 | 11 |
| 项目级减排效果证据 | 68 |
| 初级/次级来源结构企业 | 306 |
| 可显示来源比例企业 | 161 |
| 原文明示 primary-data 百分比企业 | 13 |

## 质量判断

### 1. 实体层

企业实体以公司注册表、世界 500 强排名和别名表为基础。当前主要风险不是企业实体缺失，而是不同语言名称、中文公司后缀和 PDF 来源文件之间的别名一致性仍需抽样复核。

### 2. 标准层

GHGP 已从泛化 `GHG Protocol` 拆成 12 个细分标准/指南/项目协议节点。accepted 边只保留页级原文明示具体系列的关系。不能命名具体系列的泛化引用被降级或排除出 accepted 图。

5 个零 accepted 标准不应被强行补边。若企业报告未明确点名这些政府、社区、项目或尚未正式发布的标准，应保留为“无 accepted 企业证据”或“适用范围不在企业披露主语境”。

### 3. 关系层

事实边和本体骨架边必须分开统计。企业-标准、企业-排放、企业-技术项目等事实边需要页级证据；标准族层级、节点分类和概念归属属于本体骨架，不进入 evidence-page 覆盖率分母。

### 4. 排放排行

完整可比主榜只接受 Scope 1、selected Scope 2、Scope 3、年份、单位和边界均闭环的企业。当前主榜 27 家可用；64 条 partial 记录被排除，不能混入主排序。

### 5. 技术路径

图 6 已有 9 类技术路径和 77 条项目/措施级证据，但总体仍需严格区分关键词披露、项目证据、成本证据和减排效果证据。成本/投资强证据 11 条，是当前最需要继续补强的薄弱点。

### 6. 初级/次级数据

当前只有 13 家企业报告明示 primary-data 百分比。其余来源结构比例多数来自方法行归类推断，不等同于审计级计算权重。图中必须持续标注 `explicit reported ratio` 和 `source-mix inference`。

## 已知限制

| 限制 | 处理原则 |
| --- | --- |
| 泛化 GHG Protocol 引用很多 | 不直接映射到具体 GHGP 细分标准 |
| 部分企业未披露 Scope 3 总量 | 不进入完整可比排放主榜 |
| 技术成本证据稀疏 | 只把金额类投资/成本/节省算作成本证据 |
| primary/secondary 比例披露稀少 | 缺披露不等于 0，推断不等于计算权重 |
| 静态发布图无法替代查询数据库 | 当前定位是证据型静态发布和审计系统，不是生产级图数据库平台 |

## 下一轮质量提升优先级

1. 继续清洗 GHGP 细分标准历史队列，保持 accepted 图零泛化引用。
2. 抽样复核 50 条 accepted 标准-企业边、50 条 demoted GHGP 边、50 条技术路径边和 50 条排放排行行。
3. 将技术路径成本/投资强证据从 11 条继续提升，优先电动化运输、可再生电力、电池与储能、低碳燃料、能效。
4. 排放排行继续冲 30 家以上完整可比企业，但不得用 partial total 填充主榜。
5. Primary/secondary 图继续补原文明示比例，未披露企业只保留为 unknown 或推断层。

