# 前端数据交接

主图只使用正式批次 `result/formal_60_v3/`。共60题，写作、分析、规划各20题；low/high/ultra每题各生成2次，共360份回答。裁判为同模型high，完成360次主评和36次重复盲评。

| 从哪里开始 | 内容 |
|---|---|
| `result/formal_60_v3/analysis/visualization_data.json` | 推荐入口，标准JSON；`primary_rows`为360条主结果，`repeat_scores`为36条复评 |
| `result/formal_60_v3/merged_results.jsonl` | 完整问题、回答、评分理由、耗时和用量；每行一个JSON对象 |
| `result/formal_60_v3/summary.json` | 已计算的分组均分、耗时与配对分差 |
| `result/formal_60_v3/analysis/results_overview.png` | 已生成的结果图，另有SVG |
| `result/formal_60_v3/answers/`、`scores/`、`attempts/` | 单份原始记录、裁判记录、全部成功与失败尝试 |
| `dataset/tasks_60.json`、`result/formal_60_v3/manifest.json` | 题库与冻结实验设置 |

旧批次 `formal_v1`、`formal_60_v2` 和 `preview_*` 供历史追溯，避免混入正式主图。

**字段与关联**

`run_id`关联同一份候选回答；`candidate_request_id`是生成请求，`judge_request_id`是主评分请求。复评通过`run_id`关联，`score_id`末尾为`__repeat`。[字段字典](frontend/field_dictionary.json)逐项记录类型、空值、单位和用途。

四维分别为完成要求、内容逻辑、具体价值、清晰表达，各0至5分、步长0.5；总分`score_10`为四项之和÷2。质量先平均同题同档两次生成，再汇总题目；36次复评用于检查裁判稳定性，单独展示。

耗时单位均为秒，时间戳为UTC。候选总耗时看`elapsed_seconds`，首段可见回答等待看`client_first_answer_delta_seconds`。**真实`ttft_seconds`与`tpot_seconds`全部为null，应显示“未获取”**。首段文本等待不等同于真实TTFT。`output_tokens`包含`reasoning_tokens`，勿重复相加；裁判耗时和Token用`judge_*`字段。15条`preview_timing_overlap=true`可用于排除预览评分重叠的耗时敏感性分析。

本批302/360份回答满分，占83.89%，存在评分天花板。评分为项目自定义四维评价，含改编题，不等同于官方benchmark成绩。前端应同时展示分数分布、耗时和推理投入，保留同模型裁判局限。

解压根目录作为静态站点根目录时，可直接读取：

```javascript
const data = await fetch('./result/formal_60_v3/analysis/visualization_data.json')
  .then(response => response.json());
const mainRows = data.primary_rows;
const repeatScores = data.repeat_scores;
```

所有JSON/JSONL使用UTF-8，CSV含UTF-8 BOM；部分PowerShell日志使用UTF-16。分数两位小数用于展示，统计时保留原始数值。

`PACKAGE_MANIFEST.json`记录包内各文件的路径、字节数与SHA256。压缩包保留原目录，完整性检查结果见`result/formal_60_v3/verification.json`。题库、全部结果、历史记录、脚本及日志均已收入；运行环境、缓存和临时认证配置不属于交接数据。
