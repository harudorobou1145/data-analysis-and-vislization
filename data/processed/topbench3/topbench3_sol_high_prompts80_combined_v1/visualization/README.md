# TOP Bench 合并展示数据

合并原20题和新增60题，共80道互不重复的源题目、240组完整结果、960次正式HTTP请求。三个策略均为原始提示、TNM、CBD；模型固定GPT 6.1 Sol、High。

页面统一展示全部80题，不提供批次切换。`dashboard_data.json`中的`cases`和`runs`仅为来源追溯保留`cohort_id`：

| cohort_id | 页面名称 | 题目数 | 结果数 | 每领域×难度单元 |
| --- | --- | ---: | ---: | ---: |
| `extension60` | 后续采集的60题 | 60 | 180 | 3 |
| `initial20` | 原20题 | 20 | 60 | 1 |
| `all` | 统一展示范围；不是实际行标签 | 80 | 240 | 4 |

`metadata.default_cohort=all`，`metadata.planned_cases=80`。计算分母时在80题内筛选领域/难度，再对三策略取共同题目。每领域16题、每档难度20题、每个交叉单元4题；不可把结果行数240当作题目数。

`summaries`和`segments`为全部80题的预汇总；前端使用`runs`对领域、难度及题目选择重新汇总，H必须从组级CR/LR重新计算。CSV不输出批次字段。`requests`包含作答和评分两个角色，不与静态工具选择数量混淆。

`quality_report.json`包含去重、每单元样本数、网络状态、本地网络故障归档和来源哈希。`manifest.json`对两个上游展示包及当前数据包作SHA256校验。原20题文件不覆盖；全部文件均不含回答正文、工具返回或敏感目标。

当前展示源由上级`active_visualization.json`指定。离线重建：

```powershell
python app/experiments/topbench3/expand60.py export
python app/experiments/topbench3/prepare_visualization.py --experiment-id topbench3_sol_high_prompts60_extension_v1
python app/experiments/topbench3/build_combined_visualization.py
```

命令在仓库根目录执行，不发起模型请求。详细成绩和限制见`report/TOPBench新增60题结果.md`。
