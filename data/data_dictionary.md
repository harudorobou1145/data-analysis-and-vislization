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

XWB 分组表中的 `artifact_dir` 已改为统一 raw 路径；其余以 `data/` 开头的来源路径指向 `app/source_packages/xwb/data/`。原包快照不修改。WTY 路径本身已符合统一布局，保持不变。

## 统计约束

正式、历史、预实验、补测、修复和辅助记录不能无条件合并。修复轮次本已属于主体表的子集，不应再把 `repair_rounds.json` 加到主体记录数。`null` 不填零或 false；Token 口径、计时范围和通道不同，不能直接作为同预算比较。主观评分不是官方榜单成绩。

详细字段定义保留在 [WTY 字典](../app/source_packages/wty/data/data_dictionary.md) 与 [XWB 字典](../app/source_packages/xwb/data/data_dictionary.md)。采集限制、隐私和实验设计见原包说明。