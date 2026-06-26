# 世界500强 ESG 知识图谱完善方案

**日期**: 2026-06-25 | **状态**: 调研完成 | **基准门控**: 已通过

## 当前状态概览

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| GHGP accepted边 | 267 | 267（保持） |
| 排放完整可比排行 | 16家 | 30家 |
| 图6成本证据 | 9条 | 25-35条 |
| 初级/次级强证据 | 13家 | 25-30家 |
| GHGP 零接受标准 | 5 | 3（移除非企业级） |

---

## 一、GHGP零接受标准处理方案

### 1.1 确认可移除的标准（3个）

| 标准ID | 标准名称 | 原因 |
|--------|----------|------|
| `ghg_policy_action_standard` | Policy and Action Standard | 政策评估标准，非企业级 |
| `ghg_cities_gpc` | GPC | 城市/社区级协议 |
| `ghg_grid_connected_electricity_projects` | Grid-Connected Electricity | CDM/JCM项目级指南 |

### 1.2 有潜力继续挖掘的标准

| 标准ID | 当前证据 | 进展 |
|--------|----------|------|
| `ghg_mitigation_goal_standard` | 零直接引用 | 考虑SBTi替代方案 |
| `ghg_land_sector_removals_standard` | 4家企业提及草案 | 标准尚未正式发布 |

### 1.3 Land Sector引用证据

- **ADM**: "awaits the finalization of the GHG Protocol's Land Sector and Removals Guidance"
- **PepsiCo**: "consistent with...draft Land Sector and Removals Guidance and Standard"
- **Bunge Global**: "expected by the end of 2025"
- **Ingka Group**: "using the 2022 GHG Protocol Land Sector and Removals Draft Guidance"

→ 全部为草案引用或等待状态，无一家明确采用最终版。

---

## 二、图6技术成本证据扩充方案

### 2.1 当前状态与目标

| 技术类别 | 现有accepted | 目标 | 重点企业PDF |
|----------|-------------|------|-------------|
| electrified_transport | **0** | 5-8 | Ford, Amazon, Tesla, Volkswagen |
| battery_storage | 2 | 5-8 | Ford(BlueOval), Amazon(BESS) |
| energy_efficiency | 2 | 8-12 | Intel, Amazon, TotalEnergies |
| low_carbon_fuels | 2 | 6-10 | Amazon(SAF), TotalEnergies |
| renewable_power | 3 | 10-15 | Amazon(PPAs), E.ON, Enel |

### 2.2 具体执行步骤

1. **P0 (立即)**: 审查 Ford $11.4B BlueOval City 投资项目范围，确认适用于battery_storage/electrified_transport
2. **P0**: 从Amazon Sustainability Report中提取5-8条成本证据（PPA、EV、SAF、储能）
3. **P1**: 补充Volkswagen、GM、Tesla的电动化投资证据
4. **P2**: 补充能源企业的可再生电力投资金额

---

## 三、排放排行扩充方案（16→30家）

### 3.1 缺口分析

| 缺失原因 | 企业数 | 占比 |
|----------|--------|------|
| 缺Scope 3 | 45家 | 65.2% |
| 缺Scope 1+2 | 24家 | 34.8% |
| Scope 2方法未指定 | 9家 | 13.0% |

### 3.2 P0优先升级企业（14家）

| 企业 | 缺失项 | 修复难度 |
|------|--------|----------|
| Shell | Scope 3 | 中 |
| United Airlines | Scope 3年份 | 低 |
| Linde | Scope 3年份 | 低 |
| American Airlines | Scope 3 | 中 |
| Suncor Energy | Scope 2方法 | 低 |
| Glencore | Scope 2方法 | 低 |
| Heineken | Scope 1+2方法 | 中 |
| Compass Group | Scope 1+2 | 中 |
| Bunge Global | Scope 2方法 | 低 |
| Magna International | Scope 2方法 | 低 |
| E.ON | Scope 3 | 中 |
| Meta | Scope 3年份 | 低 |
| Valero Energy | Scope 2方法 | 低 |
| PTT | 年份对齐 | 中 |

---

## 四、初级/次级数据比例扩充方案（13→25家）

### 4.1 高潜力企业（20+家）

**金融业**: BBVA, Bank of Montreal, RBC, Allianz, Intesa Sanpaolo, JPMorgan Chase
**科技业**: Salesforce, Meta, Alphabet, Intel, Cisco
**制造业**: Ford, Volkswagen, Hyundai, Heineken, Novartis

### 4.2 证据搜索关键词

- "primary data" + "secondary data"
- "supplier-specific" vs "industry average"
- "PCAF" + "asset class" + "data quality"
- "measured" vs "estimated" vs "calculated"

---

## 五、执行路线图

| 阶段 | 任务 | 预期耗时 | 产出 |
|------|------|----------|------|
| P0-1 | 更新GHGP标准注册表(3个非企业级标注) | 1小时 | 更新registry + 同步报告 |
| P0-2 | 扩充成本证据 p0 batch | 2-3天 | 新增5-10条成本证据 |
| P0-3 | 排放排行补Scope 3 + Scope 2方法 | 2-3天 | 5-10家升至complete |
| P1-1 | 继续扩充成本证据 p1 batch | 2-3天 | 新增10-15条成本证据 |
| P1-2 | 排排放行补scope 1+2 | 2天 | 5-8家升至complete |
| P1-3 | 初级/次级数据比例证据 | 2-3天 | 新增10-15家强证据 |
| P2 | 运行门控 + sync + 审计报告 | 0.5天 | 全量验证通过 |
