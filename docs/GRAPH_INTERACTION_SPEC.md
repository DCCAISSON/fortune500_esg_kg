# 图谱交互规范

本规范以 GHGP 全屏验收图为金标准，逐步推广到标准角色图、ISO/GB 图、技术路径图、排放图和方法数据图。

## 默认视图

默认视图必须服务验收，不展示会被误读为事实的弱关系。

| 图谱类型 | 默认视图 |
| --- | --- |
| GHGP 细分标准图 | accepted-only，排除泛化 GHG、contextual review 和 demoted |
| 标准角色图 | accepted standard-company edges only |
| 技术路径图 | 区分 disclosure signal、project evidence、cost evidence、abatement evidence |
| 排放排行图 | 只用 complete comparable accepted 主榜 |
| Primary/secondary 图 | 显著区分 explicit reported ratio 和 source-mix inference |

## 必备交互

| 能力 | 规则 |
| --- | --- |
| 标准筛选 | 能只看某个标准或标准族 |
| 行业筛选 | 能只看某个行业企业 |
| 企业搜索 | 能定位企业节点和相关边 |
| 边点击 | 展示关系解释链、采信层、证据门槛、页码和来源 |
| 可信边界卡片 | 说明当前图能声明什么、不能声明什么 |
| PNG 导出 | 导出当前视图，并尽量带上图名、筛选状态和数据源说明 |
| 键盘/缩放 | 支持基本缩放、fit、键盘聚焦或可替代操作 |

## 视觉编码

| 元素 | 编码 |
| --- | --- |
| 标准节点 | 标准或标准族固定颜色 |
| 企业节点 | 行业背景色 |
| accepted 边 | 实线，颜色跟随标准或关系类别 |
| review 边 | 审计模式才显示，虚线/弱化 |
| demoted 边 | 不进入验收图；审计账本显示 |
| 本体骨架边 | 不作为事实采信边解释 |

## 语言边界

Scope 1/2/3、Scope 3 categories 只在 GHGP 语境中使用。非 GHGP 页面如果展示原文中的 Scope 字样，必须说明这是来源文本引用，不代表该标准体系采用 GHGP Scope 分类。

## URL 状态

后续可扩展 URL 状态，但不作为当前强制项：

```text
?standard=ghg_scope3_standard
?industry=Energy
?company=r013_shell
?edge=r013_shell::ghg_scope3_standard
?mode=accepted
```

迁移到 Sigma.js、G6 或 Cytoscape.js 之前，必须证明新渲染层不会丢失 accepted/review/demoted、边级证据解释链、PNG 导出和移动端可读性。

