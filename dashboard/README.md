# 交互式可视化系统（四个子实验）

单页交互系统，顶部「实验切换」按钮在四个子实验间切换：

1. **代码 · EvalPlus 四档**：同一 Codex 模型（`gpt-6.1-sol`）在 low/medium/high/max 四档下做 100 道算法题 + 失败题修复。
2. **代码 · Luna vs DeepSeek**：Luna（Plus/CLI）与 DeepSeek（官方 API）在 HumanEval 100 + ALFWorld 60 上的对比。
3. **主观评分 · 60 题**：同一模型 low/high/ultra 三档回答 60 道开放题，同模型 high 盲评四维质量。
4. **WildBench · 四组**：WildBench v2-hard 20 题，Sol low/high/ultra + Luna high 四组，1-10 整数分。
5. **DeepSeek Flash 补充**：DeepSeek Flash/high 重跑 60 题与 WildBench 20 题，凑成 5 配置对比（含分差）。

数据来自队友交接包（脱敏派生数据，非原始日志）。

## 快速运行

浏览器直接打开 `dashboard/index.html`（无需构建）。图表由 ECharts CDN 渲染，**需要联网**。

重新生成 `data.js`：

```powershell
.\.venv\Scripts\python.exe analysis/export_evalplus_data.py `
  "<代码完整交接包根目录>" `
  --subjective "<主观评分包根目录>" `
  --lunads "<Luna_DeepSeek 包根目录>" `
  --wildbench "<WildBench 包根目录>" `
  -o dashboard/data.js
```

## 各实验关键结论

**EvalPlus 四档**：low/med/high 各 96%、Max 95%；Max 输出 Token 1294（vs 656/726/791）、耗时 41s；Max 失败新增 EP122；EP032 四档均未修复成功。

**Luna vs DeepSeek**：DeepSeek 略强（Python 96 vs 93，ALFWorld 60 vs 58）且快得多（Python 14s vs 41s、ALFWorld 25s vs 79s）；DeepSeek 输出更长（1426 vs 625 Token）、输入更少（7871 vs 11631）。注意两模型通道/控制器不同，Token 口径不可直接等同。

**主观评分 60 题**：high/ultra 质量均分几乎相同（9.96），但 ultra 耗时中位数是 high 的 1.67 倍、推理 Token 是 4 倍；302/360 满分（评分天花板）。

**WildBench 20 题**：Sol ultra≈high（8.72 vs 8.68）但更慢（168s vs 78s）；Sol low 8.22；Luna high 6.38（明显更低）但最快（15s）。

**DeepSeek Flash 补充**：60 题上 DeepSeek Flash 垫底（8.97，vs Sol high 9.96、Luna 9.36）；WildBench 上与 Luna 接近（6.65 vs 6.38），但输出 Token 极高（WildBench 均值 10617）。

## 数据接口

`window.CODEDEPTH_DATA`：`paired`/`repair_rounds`/`repair_groups`/`tool_actions`/`candidates`/`specs`（EvalPlus）、`subjective`（60 题）、`lunads`（summary+paired）、`wildbench`（groups+paired+repeats+rows）。

## 已知边界（各实验各自的局限，报告须写明）

- 推理档位多为请求档位、未经独立验证；单次/小样本（20~100 题），不能据此宣称统计显著或因果。
- 修复非官方 pass@10；主实验与修复口径不同，不合并单一准确率。
- Luna 走 Plus/CLI+MCP、DeepSeek 走官方 API，提示词封装、通道、Token 计数器、缓存均不同；耗时含网络/服务端等待。
- 主观/ WildBench 评分存在天花板与同模型裁判局限，分数不能标为官方榜单成绩；不同实验的量尺不可直接比较合并。
- 时间/工具/自测分类为启发式；相关≠因果。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 结构、样式（浅/深色）、实验切换与视图容器 |
| `app.js` | 四实验渲染、联动、筛选逻辑 |
| `data.js` | 由 `analysis/export_evalplus_data.py` 生成的真实数据 |
