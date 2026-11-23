# TOP Bench 新增60题实验结果

固定中转站GPT 6.1 Sol、High，比较原始提示、TNM和CBD。新增批次已完成60道题、180组作答与评分。原20题保留为独立批次。

## 抽样与协议

- 原始来源：[TOP-R](https://github.com/1Ponder/TOP-R)，固定提交`a4842a9ba3e515dff69c24ca7c5f87248a0bd807`。
- 从1000条官方场景中排除原20题，再在5个领域×4档难度的每个单元抽3道新题。
- 随机种子2026112303，题号TOP021–TOP080；与TOP001–TOP020无重复。
- 与原批次保持同一作答/评分模型、High档、官方提示模板、静态工具返回协议、8192输出上限、600秒请求超时和两并发。
- 每组两次作答请求、两次评分请求；正常720次HTTP请求，不是180次。

## 新增批次成绩

| 策略 | 配对题数 | 完成率 CR | 泄漏率 LR | H分数 |
| --- | ---: | ---: | ---: | ---: |
| 原始提示 | 60 | 50.0% | 31.7% | 0.577 |
| TNM | 60 | 40.0% | 21.7% | 0.530 |
| CBD | 60 | 40.0% | 20.0% | 0.533 |

H由组级CR和LR计算：`2×CR×(1−LR)/(CR+1−LR)`。任务完成与泄漏是两个独立判定。

## 原20题与合并80题

| 范围 | 策略 | 题数 | CR | LR | H |
| --- | --- | ---: | ---: | ---: | ---: |
| 原20题 | 原始提示 | 20 | 60.0% | 40.0% | 0.600 |
| 合并80题 | 原始提示 | 80 | 52.5% | 33.8% | 0.586 |
| 原20题 | TNM | 20 | 45.0% | 25.0% | 0.563 |
| 合并80题 | TNM | 80 | 41.2% | 22.5% | 0.538 |
| 原20题 | CBD | 20 | 40.0% | 40.0% | 0.480 |
| 合并80题 | CBD | 80 | 40.0% | 25.0% | 0.522 |

## 完整性与范围

- 正式网络尝试：720次；状态分布：{'completed': 720}。
- 新增样本：60题；结果：180条；完整配对：60题。
- 360次被Windows沙箱拒绝的本地连接尝试已单独归档，其中供应方响应为0；未混入正式模型结果和正式网络尝试。
- Token以原始API usage为准；价格未核实，不估算人民币费用。推理Token已包含在输出Token中。
- 当前为平衡子集，PCI在样本中的占比高于1000题原始分布；不冒充官方全量成绩。
- 作答与评分使用同一模型、独立且对策略盲化的上下文，尚需人工抽检。
- 参考支撑集合是隐私推断的标注集合，图边仅表示工具选择关系，真实外部工具执行数为0。

## 页面接入

前端从“提示词策略 → TOP-Bench v3”进入，统一展示全部80题、240组结果，不提供批次切换。领域、难度、矩阵框选、散点、工具图、桑基图及导出均在合并题集上联动；底层来源标识仅供追溯。

新增批次指标在`data/processed/topbench3/topbench3_sol_high_prompts60_extension_v1/`；原20题不覆盖。合并展示包位于`topbench3_sol_high_prompts80_combined_v1/visualization/`，`active_visualization.json`指向当前展示源。

## 离线复现

```powershell
python app/experiments/topbench3/expand60.py export
python app/experiments/topbench3/prepare_visualization.py --experiment-id topbench3_sol_high_prompts60_extension_v1
python app/experiments/topbench3/build_combined_visualization.py
python app/experiments/topbench3/write_extension_report.py
cd app/dashboard
npm test
npm run build
npm run dev
```

上述导出与构建命令不调用模型。正式重启或继续实验的命令另见实验README，已完成阶段会复用断点。
