# 合并数据字典

## 存放约定

- `raw/<dataset>/<model>/`：原始证据。WTY 保留档位、批次等子目录；XWB 在 `artifacts/<source_id>/` 保存证据，分组原始表为 `run_records.jsonl`。
- `processed/<dataset>/<model>/wty_results.jsonl`：WTY 结果索引，保留全部原字段。
- `processed/<dataset>/<model>/wty_requests.jsonl`：WTY 请求索引，可能包含失败尝试，不等于结果样本数。
- `processed/<dataset>/<model>/runs.json`：XWB 主体表。
- 同目录 `auxiliary_runs.json` 为辅助试跑；`repair_rounds.json`、`repair_chains.json` 为修复分析表；`tool_events.json` 为工具行为；`summary.json` 为原包汇总。
- `<dataset>/_shared/tasks.json`、`task_pairs.json`：模型共享题目和跨模型配对，不人为复制到每个模型目录。
- 顶层 `catalog.json` 为结果计数索引；`merge_manifest.json` 为复制文件哈希清单。

## 核心字段

| 含义 | WTY | XWB |
| --- | --- | --- |
| 数据集 | `dataset` | `benchmark` |
| 请求模型 | `model` | `model` |
| 推理档位 | `effort` | `reasoning_effort` |
| 阶段 | `phase` | `phase` |
| 运行标识 | `run_id`，需结合来源、数据集理解 | `run_id`，主体表内唯一 |
| 题目标识 | `task_id` | `task_id`，与 benchmark 组合 |
| 质量/通过 | `score_10`、`passed` | `task_success`、`officially_evaluated` |
| 耗时（秒） | `elapsed_seconds` | `duration_seconds` |
| Token | `token_usage`，供应方命名 | `input_tokens`、`output_tokens`、`reasoning_tokens` |
| 原始证据 | `record_path` | `artifact_dir`、`source_id` |

目录严格按原始字段分组，包括仅在辅助记录出现的 `deepseek-v4.1-flash`、`kimi-k3`。不将它们自动改名成 `deepseek-flash` 或其他模型。共享表和兼容归档不参与结果重复计数。

XWB 分组表中的 `artifact_dir` 已改为统一 raw 路径；其他来源路径可能仍引用历史包布局，不能假设全部在当前交付中可用。旧 `app/source_packages/` 快照已移除。WTY 证据路径按统一布局保留。

## 统计约束

正式、历史、预实验、补测、修复和辅助记录不能无条件合并。修复轮次本已属于主体表的子集，不应再把 `repair_rounds.json` 加到主体记录数。`null` 不填零或 false；Token 口径、计时范围和通道不同，不能直接作为同预算比较。主观评分不是官方榜单成绩。

## 前端指标表

由 [导出脚本](../app/dashboard/scripts/export-data.mjs) 生成 `app/dashboard/public/analysis-data.json`，包含数据集定义、指标记录和排除阶段计数。只输出白名单字段，不含提示词、回答或原始证据路径。

| 字段 | 含义 |
| --- | --- |
| `id` | 来源、source_id、run_id 组合标识 |
| `dataset/model/effort` | 数据集、精确模型名、原始深度，不将 max 改为 ultra |
| `task/type/phase/status` | 任务编号、类型、阶段、执行状态 |
| `score` | 0–10 原始分，或布尔判定折算的 0/100；缺失为 null |
| `seconds` | WTY elapsed_seconds / XWB duration_seconds |
| `input/output/reasoning/total` | 输入、输出、推理、总 Token；输出已包含推理 |
| `timestamp` | XWB start_time；WTY 索引没有时间戳，保留 null |

正式数据取 WTY `formal` 与 XWB `initial`，两个预实验独立标记。当前候选池 1,825 条，页面按方向进一步筛选。柱图对同题重复先取均值再按题等权；null 不参与评分均值，不作失败处理。