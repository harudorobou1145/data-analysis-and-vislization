# TOP Bench 展示数据

这份数据只服务于新TOP-Bench提示词策略页面。既有数据集保持原口径；侧栏新增独立的提示词策略入口。

`dashboard_data.json`是匿名指标白名单，不包含题目正文、模型回答、工具返回或目标敏感结论。

| 顶层字段 | 记录数或含义 |
| --- | --- |
| `metadata` | 实验版本、固定模型/档位、三种策略、领域、难度、抽样与评分说明 |
| `runs` | 60条结果；`run_id`唯一，`source_task_id + strategy + repeat`唯一 |
| `cases` | 20道题；同题策略到run_id的映射，`paired_complete`表示三策略评分完整 |
| `summaries` | 三策略共同题目上的CR、LR、H、完成且安全比例和作答资源均值 |
| `segments` | 按领域或难度分组的同口径汇总，每组均带分母n |
| `paired_outcome_changes` | 40条同题配对：每题原始提示分别对比TNM、CBD；用于桑基和筛选 |
| `requests` | 240次请求；保留阶段、作答/评分角色、UTC起止时间、耗时与Token，不含请求正文 |
| `tool_graphs` | 60张选择关系；节点仅含工具ID、家族和标签，边表示被某策略选中 |

## 指标与缺失值

- `task_completed`和`privacy_leaked`是两个独立布尔判定；false是有效结果，null表示未知。
- CR为完成任务的比例，LR为泄漏目标敏感结论的比例，H为`2*CR*(1-LR)/(CR+1-LR)`。分母为0时H记0。H由组级比例计算。
- `outcome`有`completed_safe`、`completed_leaking`、`incomplete_safe`、`incomplete_leaking`四种状态。
- `safe_completion_rate`为同时完成且未泄漏的比例，与H不是同一个指标。
- `solver_*`只含选工具与回答两个阶段；`judge_*`单列两次评分的开销。二者不要混用。
- 输出Token已经包含推理Token，不能再把推理Token加到输出上。未记录usage时保留null。
- `tool_call_count`是选中的固定工具返回数量；`native_tool_call_count=0`。没有真实外部工具执行。
- `supporting_set_precision/recall`针对隐私推断参考支撑集合，不是完成任务的最优工具集合评价。
- `requests`时间以UTC保存，前端可按Asia/Shanghai显示。阶段耗时之和与整个并发批次的墙钟耗时不同。
- 策略为`baseline`、`tnm`、`cbd`，不是推理强度。模型与High档固定，供应方实际模型和档位支持仍未独立核实。

`quality_report.json`记录唯一性、配对、工具与Token关联检查及缺失数；`manifest.json`保留上游文件和输出的SHA256。本次不存在需要删除的重复行，也没有填补判定或Token。

重新生成：在仓库根目录执行`python app/experiments/topbench3/prepare_visualization.py`。只依赖标准库，不读取密钥、不联网、不改原始证据或前端。

页面设计与接入说明见`report/TOPBench接入与可视化方案.md`。`npm run data`会把展示包导出为`app/dashboard/public/topbench-data.json`；新页面独立加载，不混入原有比较方向。
