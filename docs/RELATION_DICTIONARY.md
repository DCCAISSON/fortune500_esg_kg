# 关系字典

本字典定义主要关系的语义、采信条件、禁止条件和展示规则。机器可读采信规则见 `assets/data/world500/kg_acceptance_rules.json`。

## 统一采信层

| 层级 | 含义 | 展示规则 |
| --- | --- | --- |
| accepted | 页级证据满足关系门槛，可作为已采信事实边 | 默认验收图可显示为实线 |
| review | 有信号但证据不足，需复核 | 不进入 accepted 图；审计模式可弱化/虚线显示 |
| demoted | 已判定为泛化、过度映射、弱上下文或不适用 | 不进入 accepted 图；只在审计账本保留 |

## COMPANY_CITES_GHGP_FINE_SERIES

企业报告明示引用某个 GHGP 细分标准、指南、项目协议或 PCAF/行业扩展。

| 项目 | 规则 |
| --- | --- |
| Domain | Company |
| Range | Standard |
| accepted 条件 | 有 `source_file`、`page`、`snippet`；snippet 明确命名白名单 GHGP 细分标准、官方简称或强别名；不是泛化 `GHG Protocol` 提及；不是仅由 Scope 上下文推断 |
| review 条件 | 有 GHG/Scope 上下文但未命名具体细分标准；别名弱；页码或 snippet 不完整 |
| demoted 条件 | 泛化引用、过度映射、弱上下文、命中非当前标准、白名单外派生项误入核心 12 类 |
| 展示 | accepted-only 图中为实线；review/demoted 不画入验收图 |
| 当前账本 | `world500_ghg_series_acceptance_ledger.json` |

## COMPANY_CITES_STANDARD

企业报告引用任一 ESG、碳核算、披露、保证或本地标准。

| 项目 | 规则 |
| --- | --- |
| Domain | Company |
| Range | Standard |
| accepted 条件 | 报告原文或标准索引明确命名标准；关系有页级证据或可追溯来源 |
| review 条件 | 只有弱关键词、上下文暗示、来源页缺失或片段过短 |
| demoted 条件 | 标准名误判、泛化框架名误挂、非标准术语误作标准 |
| 展示 | 标准角色图默认只展示 accepted；审计说明必须列出被排除 review 边数量 |

## COMPANY_REPORTS_EMISSION_VALUE

企业披露排放数值。

| 项目 | 规则 |
| --- | --- |
| Domain | Company |
| Range | EmissionRecord |
| accepted 条件 | 数值、单位、年份、边界/Scope、来源页完整；主排行还要求 Scope 1、selected Scope 2、Scope 3 同时通过强证据门槛 |
| review 条件 | 缺 Scope 2 方法、缺 Scope 3、缺年份、单位或边界不清 |
| demoted 条件 | 单位缩放风险未解决、年份错配、combined scope value 无法拆分、partial total 被误作 total |
| 展示 | 完整可比主榜只显示 accepted complete；partial 进入参考或复核队列 |

## COMPANY_DISCLOSES_TECHNOLOGY_PATHWAY

企业披露某类减碳技术路径、项目或措施。

| 项目 | 规则 |
| --- | --- |
| Domain | Company |
| Range | TechnologyPathway |
| accepted 条件 | 至少达到项目/措施级证据；有页级来源、项目/措施描述和企业归属 |
| review 条件 | 仅关键词披露、公司层面承诺、缺实施时间、缺项目边界 |
| 成本强证据 | 必须是成本、投资、capex、contract value、subsidy、cost saving 等金额，不得用容量、采购量或项目规模替代 |
| 展示 | 技术路径图必须分层显示 disclosure signal、project evidence、cost evidence、abatement evidence |

## EVIDENCE_SUPPORTS_EDGE

页级证据片段支持某条事实边。

| 项目 | 规则 |
| --- | --- |
| Domain | EvidenceSnippet |
| Range | Fact edge |
| accepted 条件 | 包含 source file、page、snippet；snippet 能解释关系成立原因 |
| review 条件 | 页码有但片段过短、片段不含关系关键词、来源文件缺失 |
| 展示 | 右侧证据面板或边级解释链展示 |

## REPORT_BELONGS_TO_COMPANY

报告来源归属到企业。

| 项目 | 规则 |
| --- | --- |
| Domain | Report |
| Range | Company |
| 证据类型 | 注册表/文件目录关系 |
| 页级证据 | 不需要 |
| 展示 | 数据血缘，不作为事实采信覆盖率分母 |

## STANDARD_BELONGS_TO_FAMILY

标准属于某标准体系或角色族。

| 项目 | 规则 |
| --- | --- |
| Domain | Standard |
| Range | StandardFamily |
| 证据类型 | 本体骨架/标准注册表 |
| 页级证据 | 不需要 |
| 展示 | 标准目录、图例、中心节点聚类 |

## EDGE_HAS_ACCEPTANCE_DECISION

事实边关联采信决策。

| 项目 | 规则 |
| --- | --- |
| Domain | Fact edge |
| Range | AcceptanceDecision |
| 证据类型 | 决策账本 |
| 必填字段 | `decision_bucket`、`decision_status`、`evidence_gate`、`source_queue` |
| 展示 | 审计模式和关系解释链 |

