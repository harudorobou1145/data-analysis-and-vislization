# TOP-Bench v3 提示词策略实验

官方来源：https://github.com/1Ponder/TOP-R

固定版本：`a4842a9ba3e515dff69c24ca7c5f87248a0bd807`。
已核对1000条不同场景、5个隐私领域、4档难度。默认按领域×难度20个单元各抽1题，seed=20261123。
每题Baseline/TNM/CBD各1次，共60个配对组合。三组均为同一中转站`gpt-6.1-sol`、High，其他控制条件相同。
领域等额抽样提高了PCI的占比，结果代表这个平衡子集，不冒充1000题总体成绩。

## 协议与评测

按固定版本README的v3协议，复用其提示词文本；不运行采用旧数据结构、旧提示词的`code-v2`脚本。

1. 选工具：仅提供用户目标及工具ID、名称、家族、描述，模型输出JSON选择。
2. 回答：仅提供所选工具的固定`return_data`，让模型完成用户任务。
3. 完成度评分：仅提供任务和最终回答，返回yes/no及简短理由。
4. 泄露评分：仅提供目标敏感结论和最终回答，返回yes/no及简短理由。

所有模型调用为独立、无服务器状态链的HTTPS Responses请求，`store=false`，从不发送`previous_response_id`。
模型固定High；单次请求上限600秒、8192输出Token，两并发工作线程。温度参数统一省略，不因模型拒绝而切换协议或模型。
TNM和CBD仅在两个作答阶段的system提示追加官方后缀；两阶段用户模板和每题工具排列相同。
策略执行顺序轮换，避免始终由Baseline先运行。

这是静态工具返回的受控协议，没有真实联系人/数据库调用，没有终端执行或模型生成代码运行，无需Docker。
`tool_call_count`表示选中并读取的模拟工具返回数量，`native_tool_call_count=0`，不与Codex/MCP实际函数调用混为同一指标。
`minimal_supporting_set`是隐私组合推断的参考支撑集合；其precision/recall不是“用户任务最优工具选择”的绝对真值。

评分也用同一中转站Sol High，但采用独立且对策略盲化的上下文。这属于同模型自动评分，存在共同偏差，建议后续人工抽检。
隐藏的敏感结论、参考集合、essential标签、安全边界不会进入作答模型提示。
响应中的拒绝会作为实际回答交给评分；无效JSON、连接故障和未知评分标签不自动记为正确、不泄露或0 Token。

## 请求量、费用与恢复

20题×3策略×2作答阶段=120次作答请求；另加2次评分/组合，共120次评分请求，正常总计240次。
网络/429/服务端错误每阶段最多自动重试1次，所有重试请求和已知usage保留，总HTTP尝试上限320次。
密钥认证错误停止后续请求。模型选工具的格式错误不自动反复生成直到成功。
中转站价格未核实，无法承诺人民币金额。Token以原始API usage为准；推理属于输出，不重复加算。
若一次断连没有返回usage，完整计费总量保持null，另保留`*_observed_usage`作为已观测下界，不能据此声称零扣费。

完成的每个阶段立即落盘。重启会复用已完成选工具、回答和评分，不重复付费调用。
失败、超时或不确定的阶段默认保留并阻止静默重放；可明确恢复对应阶段，原始证据不会删除。
锁由操作系统持有，进程退出后自动释放；不需要手工删除可能陈旧的PID锁。

```powershell
cd D:\数据分析与可视化实践\visualization-v1

# 预览，默认不调用模型
.\app\experiments\topbench3\Start-TopBench.ps1

# 正式继续所有20题；需要时隐藏输入Key
.\app\experiments\topbench3\Start-TopBench.ps1 -Execute

# 单题三策略试跑，同协议下计入正式20题，不重复生成
.\app\experiments\topbench3\Start-TopBench.ps1 -Count 1 -Execute

# 只生成或只评分
.\app\experiments\topbench3\Start-TopBench.ps1 -Command run -Execute
.\app\experiments\topbench3\Start-TopBench.ps1 -Command evaluate -Execute

# 状态和导出不调用API
.\app\experiments\topbench3\Start-TopBench.ps1 -Command status
.\app\experiments\topbench3\Start-TopBench.ps1 -Command export

# 检查失败日志后，明确重置该阶段指针；保留其所有请求/响应，随后再执行原启动命令
..\codedepth\.venv\Scripts\python.exe -X utf8 app/experiments/topbench3/runner.py retry --run-id <top3运行ID> --stage <selection|answer|completion|leakage>
```

## 数据与分析

- `plans/topbench3_sol_high_prompts20_v1.json`：固定抽样、task_id映射、每题校验值、60组合矩阵及代码/提示/数据校验值。
- `prompts.json`：从固定README提取的原始模板与两种后缀。
- `validation.json`：14项离线验证，包含字段隔离、支撑集合、断点恢复、计费和失败处理。
- `data/raw/topbench3/source/`：官方两分片、README及1000题索引。
- `data/raw/topbench3/<experiment_id>/`：选中原题、阶段状态、原始请求/响应、模型输出、工具返回、事件和评分理由，仅供团队内部。
- `data/processed/topbench3/<experiment_id>/runs.json,csv`：不含对话、工具返回或敏感结论的特征白名单表。
- `paired.json,csv`：每题三策略的配对数据；`paired_complete`注明评分是否齐全。
- `summary.json`：只在三策略均完成评分的共同题集上计算CR、LR、H-score，明确分母与覆盖率。

CR=完成任务的比例；LR=披露目标结论的比例；H=2×CR×(1−LR)/(CR+1−LR)。使用组级CR/LR计算，不对单题H取平均。
主要可视化：完成度—隐私权衡散点、每题三策略配对结果、领域×难度热力图、所选工具支撑链和成本比较。
本次数据尚未自动接入现有前端，避免与其他实验口径混合或公开原始对话。

```powershell
# 完整离线验证，不调用模型
..\codedepth\.venv\Scripts\python.exe -X utf8 app/experiments/topbench3/validate_offline.py
```

现有其他数据集、模型配置和实验记录未改动；不恢复已删除的Terminal-Bench环境。

## 新增60题扩展批次

`topbench3_sol_high_prompts60_extension_v1`从原1000题中先排除首批20题，再在5领域×4难度各随机抽3题，共60道新题、180个策略组合。seed=2026112303，任务别名TOP021–TOP080。新增批次固定原作答/评分模型、High档、提示模板、8192输出上限、600秒请求超时及两并发；仅样本量和批次总尝试上限改变。

正常请求数为60×3×4=720（360作答、360评分）；960次上限涵盖有限的网络重试，不是960次必定调用。选择格式错误、有效但失败的任务判定均不会为了提高分数而重新生成。

```powershell
# 抽样与离线计划检查
python app/experiments/topbench3/expand60.py prepare
python -m unittest discover -s app/experiments/topbench3 -p test_expansion.py -v

# 正式执行或继续；隐藏输入原中转站密钥
python app/experiments/topbench3/expand60.py all --execute --key-prompt

# 只查看进度
python app/experiments/topbench3/expand60.py status

# 全部结束后离线导出与整合，不调用模型
python app/experiments/topbench3/expand60.py export
python app/experiments/topbench3/prepare_visualization.py --experiment-id topbench3_sol_high_prompts60_extension_v1
python app/experiments/topbench3/build_combined_visualization.py
```

整合输出位于`data/processed/topbench3/topbench3_sol_high_prompts80_combined_v1/visualization/`，底层保留`initial20`、`extension60`作为来源标识。首批20题的数据不覆盖。只有两批结果都完整并通过去重、配对和工具/Token检查后，才写入`data/processed/topbench3/active_visualization.json`切换展示源；前端统一展示全部80题，不提供批次切换，CSV也不输出批次字段。

本轮初次执行发生Windows沙箱`WinError 10013`，尚未建立网络连接。360次本地连接尝试、180条启动失败记录已保存在新增批次`transport_incidents/socket_block_001/`，其中没有任何供应方响应。恢复前逐项检查了错误码、阶段、状态和响应文件，日志完整保留，未将基础设施错误计作模型答错。正式网络尝试和本地连接故障分别统计。
