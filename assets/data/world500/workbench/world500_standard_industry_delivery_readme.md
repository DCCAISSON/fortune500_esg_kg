# 标准-行业 Sankey 与证据表交付说明

本说明用于配套交付“GHGP、ISO、GB/T 标准与国民经济行业门类分栏关联图”及其原始证据表，避免把图形流量、企业数量和证据行数混用。

## 1. 主图口径

- 主图为“行业门类 A-J / 具体标准 / 行业门类 K-T”的分栏 Sankey。
- 左右两侧共同覆盖 GB/T 4754-2017 的 20 个国民经济行业门类，不表示行业之间流动或因果关系。
- 中间节点为需求方指定的 12 个具体标准节点：GHGP 7 类、ISO 3 类、GB/T 2 类。
- 流量按 accepted 企业-标准关联数计算，不是企业去重数。
- 同一企业如果被 accepted 到多个标准，会产生多条企业-标准关联。

## 2. 275 与 276 的差异

- `world500_standard_industry_section_sankey_links.csv` 用于绘制主图，按唯一企业-标准 accepted 关联计数，当前合计为 275。
- `world500_standard_industry_section_sankey_evidence.csv` 按证据页/证据片段展开，当前为 276 行。
- 二者差 1 行不是数据冲突，而是因为 CRRC GROUP / 中国中车在 `GB/T 32150-2015` 下有两个证据页 `p52` 和 `p97`；主图只计 1 条 accepted 企业-标准关联，证据表保留 2 条页级证据。

## 3. 证据状态含义

- `accepted`：页级证据明确命中具体标准，进入主 Sankey 和 accepted 图谱。
- `review`：存在上下文或候选证据，但还不足以采信，不进入主 Sankey。
- `weak`：弱证据或弱别名命中，仅用于复核，不进入主 Sankey。
- `demoted`：已降级证据，不进入主 Sankey。
- `enters_sankey=true`：该行计入 accepted 主图。
- `enters_sankey=false`：该行只作为复核证据或边界说明。

## 4. GB/T 32150-2015 与 ISO 14040/14044 边界

- `GB/T 32150-2015`：CRRC GROUP / 中国中车已 accepted，行业门类为 `C 制造业`，证据页为 `p52` 和 `p97`，进入主图。
- `GB/T 32150-2015`：宁德时代相关证据保留为 review/weak，不进入主图。
- `ISO 14040/14044`：按需求方指定保留为 12 个展示标准之一；当前没有 accepted 企业-标准边，相关证据保留在 review 队列，不用其他 ISO 标准替代。

## 5. 行业归类说明

- 软件/云服务企业在当前输出层按主营业务归入 `I 信息传输、软件和信息技术服务业`，例如 ORACLE、SALESFORCE、SAP。
- 公用事业企业中原代码/中文门类不一致的记录已按 GB/T 4754-2017 代码-名称一致性修正到 `D 电力、热力、燃气及水生产和供应业`。
- 油气、炼化、能源企业不合并成宏观“能源”类别，继续严格按 GB/T 4754-2017 的 `B/C/D` 门类拆分。
- `world500_company_industry_review_pack.csv` 提供企业原始 Fortune 行业标签、国家、原注册门类、当前输出门类、建议门类和是否影响 Sankey。

## 6. 交付文件清单

- `standard_industry_sankey_registry.csv`：12 个中间展示标准节点。
- `national_industry_section_registry.csv`：GB/T 4754-2017 的 20 个行业门类。
- `world500_standard_industry_section_sankey_links.csv`：主 Sankey 绘图数据，按 accepted 企业-标准关联聚合。
- `world500_standard_industry_section_sankey_evidence.csv`：主 Sankey 的页级原始证据表。
- `world500_standard_industry_evidence_review_pack.csv`：accepted/review/weak/demoted 标准-企业证据复核包。
- `world500_company_industry_review_pack.csv`：企业行业归类复核包。
- `world500_primary_secondary_evidence_chain_export.csv`：初级/次级数据原始证据链导出。
- `world500_primary_secondary_bubble_company_summary.csv`：初级/次级气泡图公司汇总。
- `world500_emissions_industry_section_coverage_summary.csv`：排放行业门类覆盖率汇总。
- `world500_emissions_missing_company_list.csv`：未进入完整排放主榜企业清单。
- `world500_emissions_industry_section_ranking.csv`：排放行业门类排行。

