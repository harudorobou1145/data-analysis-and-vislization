# 交互式可视化系统（代码四档对比 + 主观评分）

单页交互系统，整合两个子实验，顶部用「实验切换」按钮切换：

- **代码实验 · EvalPlus**：同一 Codex 模型（请求 `gpt-6.1-sol`）在 low/medium/high/max 四档下做 100 道算法题 + 失败题修复。
- **主观评分实验**：同一模型在 low/high/ultra 三档下回答 60 道开放题，同模型 high 盲评四维质量。

数据来自队友交接包（脱敏派生数据，非原始日志）。

## 快速运行

浏览器直接打开 `dashboard/index.html` 即可（无需构建）。图表由 ECharts CDN 渲染，**需要联网**；离线请下载 `echarts.min.js` 放到本目录并改 `index.html` 里的 `<script src>`。

`dashboard/data.js` 已由两个交接包导出（`kind=real`）。重新生成：

```powershell
.\.venv\Scripts\python.exe analysis/export_evalplus_data.py "<代码完整交接包根目录>" --subjective "<主观评分包根目录>" -o dashboard/data.js
```

## 代码实验（四视图 + 联动）

1. **主实验矩阵（100 题 × 4 档）**：着色可切「状态 / 输出 Token / 总 Token / 耗时」；纵向缩放；「只看失败题」聚焦 5 道失败题。
2. **配对差值**：High−Low / Med−Low / Max−High / Max−Low 输出 Token 差值箱线 + 逐题散点（可切 Max vs High / High vs Low / Max vs Low）。
3. **修复轨迹**：5 道失败题按失败档位分泳道；圆点=结果、菱形=首次通过、空圈=600s 预算。
4. **工具与代码**：点选运行 → 工具动作序列 + 失败题候选代码/题面对比。

关键事实：四档成功率 low/med/high 96%、Max 95%（base 均 99%）；Max 输出 Token 1294（vs 656/726/791）、耗时 41s、推理 453；Max 失败新增 EP122；EP032 四档均未修复成功。

## 主观评分实验

60 题（写作/分析/规划各 20）× low/high/ultra × 2 次 = 360 份回答。视图：

- 质量均分 / 耗时中位数 / 平均推理 Token 按档位（质量纵轴从 9.0 起）。
- 总分分布（满分柱 302/360 = 83.9%，评分天花板明显）。
- 分任务方向 × 档位质量均分。
- 配对分差森林图（high−low +0.056、ultra−low +0.054、ultra−high −0.002，题级 bootstrap 95% 区间）。
- 复评稳定性（36 次重复盲评 vs 主评分）。

关键结论：high/ultra 质量均分几乎相同（9.96），但 ultra 耗时中位数是 high 的 1.67 倍、推理 Token 是 4 倍；高档位增加了投入、主观分数仅小幅变化，且存在同模型裁判局限。

## 数据接口

`window.CODEDEPTH_DATA`：代码实验（`paired` 100×4、`repair_rounds` 67、`repair_groups` 17、`tool_actions` 1616、`candidates`/`specs`）+ `subjective`（`primary_rows` 360、`repeat_scores` 36、`groups`、`paired`）。字段口径见交接包 `docs/02_数据字典.md` 与主观包 `frontend/field_dictionary.json`。

## 已知边界

- `reasoning_effort` 为请求档位、未经独立验证；Max 后采集、非随机交错，95% 对 96% 仅差 1 题，不能宣称显著差异。
- 主实验与修复实验口径不同，不合并单一准确率；修复非官方 pass@10。
- 主观评分为项目自定义四维、含改编题，不等同官方 benchmark；同模型裁判存在偏差；302/360 满分导致天花板，区间不推广"思考越深越好"。
- 时间含网络/服务端影响，相关≠因果；工具/自测分类为启发式。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 结构、样式（浅/深色）、实验切换与视图容器 |
| `app.js` | 两实验渲染、联动、筛选逻辑 |
| `data.js` | 由 `analysis/export_evalplus_data.py` 生成的真实数据 |
