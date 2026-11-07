Luna 与 Sol 主观评分数据交付说明

这份数据用于比较不同模型和思考档位的回答质量、耗时与 Token 用量。60 道题分为写作表达、分析论证、方案设计三个方向，每个方向 20 题，每个条件下每题独立回答两次。每次请求使用全新会话，没有历史上下文。

| 批次 | 候选模型与档位 | 回答 | 主评 | 重复盲评 |
|---|---|---:|---:|---:|
| 新批次 | gpt-6-luna / high | 120 | 120 | 12 |
| 原批次 | gpt-6.1-sol / low、high、ultra | 360 | 360 | 36 |
| 合计 | 四个实验条件 | 480 | 480 | 48 |

最终完整性以归档内的 verification.json、交付清单及 analysis 中的检查结果为准。读取最终包时，应确认主评覆盖全部 480 份回答，重复盲评共 48 份，关联检查没有错误。

建议前端先读取这些文件：

- `analysis/实验结果总结.md`：结论、比较结果与限制。
- `analysis/`：按条件、任务方向等计算的统计结果。
- `frontend/visualization_data.json`：整合对象，`primary_rows` 为 480 条主评记录，`repeat_scores` 为 48 条复评记录，`summary` 为统计汇总。
- `frontend/primary_rows.jsonl`：每行一份回答及其主评，适合逐行导入。
- `frontend/primary_rows.csv`：同类表格数据，便于临时查看。
- `frontend/repeat_scores.json`：复评数据，用于检查裁判评分稳定性。
- `frontend/field_dictionary.json`：主评记录的字段类型、单位和含义。
- `archive/`：新旧批次的原始回答、评分、尝试记录、题目、脚本、日志及实验清单，用于追溯和复核。
- `history/`：正式执行前的接口 503 和本地权限失败记录，单独存档，不进入统计。
- `reproduce/`：汇总、打包和恢复脚本。部分脚本保留原本机路径，换机器运行前需设置输入目录、安装依赖并配置模型接口。

质量评分由固定的 `gpt-6.1-sol / high` 裁判完成。四个方向为任务完成度 completion、逻辑与可靠性 logic、内容价值 value、表达清晰度 clarity，各为 0 至 5 分，按 0.5 分递增。总分为四项之和除以 2，范围 0 至 10，单份总分可出现 0.25 分的步长。这些分数属于模型裁判的主观评价，不能标为正确率。图表显示两位小数只用于阅读，不代表评分测量具备两位小数精度。

主统计只使用主评。先将同一题在同一条件下的两次回答取均值，再按题汇总。复评用于观察裁判稳定性，不能当作新增回答，也不要与主评混合后重复计权。

题目来自 MT-Bench 与 BiGGen-Bench 的选题及改编。打分使用本实验自定义的四维 GEval 扩展，不使用 logprob 加权；这些结果不等同于数据集的官方榜单分数。

**关联方式**

单条回答的唯一键为 `experiment_id + run_id`。不同批次可能出现相同的 run_id，不能仅靠 run_id 合并。主评通过 `candidate_request_id`、`answer_hash` 等字段关联到实际回答，原始评分文件还保留回答 attempt 的引用。

跨批次比较使用 `task_id + effort + repeat_id`，并核对 `prompt_hash`。Luna 与 Sol 的 high 档可按这个组合逐条对应。跨档位比较时，档位是比较条件，按 `task_id + repeat_id` 对齐后分别保留 effort。同一题的两次生成是重复观测，统计检验宜以题目为单位。

**耗时与 Token**

`elapsed_seconds` 为运行时报告的候选 turn 耗时，包含思考及服务、网络等待；`client_elapsed_seconds` 为客户端从发出 turn/start 到完成通知的时间；`wall_seconds` 还包含进程启动和清理。比较回答速度时，应统一使用同一个字段。裁判耗时单列在 `judge_elapsed_seconds`，不应叠加到候选模型的回答耗时。

本次交付的 `ttft_seconds`、`tpot_seconds` 均缺失，保留为 null。`client_first_answer_delta_seconds` 表示首段可见回答文本的等待时间，不能代替真实 TTFT。流跨度字段也不能直接作为 TPOT。

Token 计数沿用上游返回值。null 表示未提供，0 表示报告值为零，两者需要区分。`cached_input_tokens` 可能是输入 Token 的子集，`reasoning_tokens` 可能包含于输出 Token 中，避免重复相加。运行时和服务端可能添加额外输入，因此输入 Token 数会大于题目文本本身。

**解释结果时需要保留的限制**

大量回答接近满分，存在评分天花板，微小均分差不能直接解释成明显能力差距。固定裁判也可能存在偏好。Luna 本批仅测 high，不能据此推断 Luna 的 low、ultra 或思考深度的因果效果。

新旧批次运行日期和 API 路由条件不同，耗时比较会受到服务负载、网络、缓存和路由变化影响。候选请求分别使用了指定模型和档位，原始记录保留请求及配置值；若 `runtime_reported_model`、`runtime_reported_effort` 缺失，上游没有独立回报这些信息。请求配置不能作为独立的上游模型鉴真。

CSV 对可能被表格软件当作公式的文本加了单引号，包括以 `=`、`+`、`-`、`@` 或部分控制字符开头的文本。JSON 和 JSONL 保留原文。需要展示或复核完整题目、回答、评分理由时，优先使用 JSON；不要为了还原 CSV 而全局删除单引号。
