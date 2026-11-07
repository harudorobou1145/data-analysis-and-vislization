# 三档主观测试

60题，分为写作表达、分析论证、方案设计，各20题。`gpt-6.1-sol` 的 low、high、ultra 每题各跑2次，共360份回答。每方向均保留8道旧题，补充12道BiGGen-Bench任务。

来源为24道MT-Bench素材题和36道BiGGen-Bench任务。前者含16道原始首轮题与8道规划改编题；后者保留原系统要求和用户问题，合为一次输入，并标记该调整。按任务覆盖选题，保留来源与原文，未宣称随机抽样或官方benchmark得分。部分题使用相同模板，题目数量不等于独立题型数量。

每份完整回答按四项打分：完成要求、内容逻辑、具体价值、清晰表达。每项0至5分，允许0.5分步长；总分为四项之和除以2。一次独立裁判请求返回四项，使用 DeepEval G-Eval 的自定义扩展，未使用logprob加权。裁判固定同模型high，不知道候选档位与耗时。

360次生成、360次主评分、36次重复盲评，共756次请求，不含失败重试。每次全新会话，禁止工具与委派。四路并发，生成与评分依次进行。重复评分单列，不并入主质量分。暂未进行人工评分校准。

运行：

```powershell
cd D:\code\visual\wty_work
.\script\run_all.ps1
```

脚本会复用上一级已经安装好的 `.venv`。迁移到其他机器时，先安装 Python 3.11+、配置 Codex Desktop，再建立环境：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

中断后重新运行相同命令，已完成请求不会重复调用。失败最多尝试2次，每次尝试都保存。若进程被强制结束，先确认没有测试进程运行，再删除 `result/formal_60_v3/.running.lock`。已经冻结的模型、档位、题库、评分代码、并发与超时不能静默更改。

分步运行：

```powershell
.\script\run_all.ps1 -Stage prepare
.\script\run_all.ps1 -Stage generate
.\script\run_all.ps1 -Stage score
.\script\run_all.ps1 -Stage audit
.\script\run_all.ps1 -Stage analyze
```

配置保存在 `experiment_config.json`，60题保存在 `dataset/tasks_60.json`，来源清单为 `dataset/source_manifest_60.json`。原24题 `dataset/tasks.json` 和旧输出 `result/formal_v1/` 保留。旧批次因沙箱TLS故障已停止，原记录保存在 `result/formal_60_v2/`。修复版使用 `result/formal_60_v3/`，日志路径见 `work/active_experiment.json`，完成情况以实际输出为准。

结果都在 `result/formal_60_v3/`：

| 文件 | 内容 |
|---|---|
| `merged_results.csv` | 一行一次候选请求，可用Excel打开，包含题目、回答、四项分、总分、耗时、token |
| `merged_results.jsonl` | 相同关联结果，保留未经CSV公式保护修改的原始文本 |
| `answers/` | 单份回答与请求、会话、计时、用量 |
| `scores/` | 主评分、重复盲评、各项理由、完整裁判提示及裁判用量 |
| `attempts/` | 所有成功与失败尝试，便于恢复和追踪 |
| `manifest.json` | 冻结的题库、条件、执行顺序和复评集合 |
| `summary.json`、`report.md`、`comparison.png` | 汇总、简短报告和图表 |
| `verification.json` | 隔离、数量、回答哈希和评分关联核查 |

关联字段：

- `source_dataset`、`source_id`、`source_category`：定位题目来源，便于分层比较。
- `run_id`：原题、档位、生成重复的固定组合，例如 `writing_01__low__r1`。
- `request_id`：每次实际模型请求唯一，重试时改变。
- `attempt_id`：某次尝试，保留失败记录。
- `score_id`：`run_id + primary/repeat`，指向具体回答的 `answer_hash` 和 `answer_request_id`。
- `answer_hash`：完整回答的SHA256。评分和回答不匹配时拒绝汇总。

比较输出时间时使用候选 `elapsed_seconds`；它包含本轮推理、传输和服务等待，未包含进程启动。`client_first_answer_delta_seconds`是客户端首段回答等待时间。`wall_seconds`包含启动与清理。接口未提供真正的TTFT、TPOT时保留空值；裁判耗时和token另列。

结果用于探索思考档位与质量的关系；每类20题和同模板题仍限制推广范围。上游中转实际模型与思考预算无法独立核验；同型号裁判可能有偏好。质量分与队友的数学、编程正确率分开展示。数据和结果中不保存认证密钥。

修复版连接方式：保持独立Codex app-server与临时会话，由 `https_relay.py` 在本机回环地址接收原请求，再用Python验证HTTPS证书后转发到已配置服务。认证只保存在内存和临时私有配置，三档使用相同通道。manifest冻结转发模块哈希；耗时包含本机转发开销。

连接错误会记录到 `runtime_errors` 并停止整批，避免持续600秒重试。`batch_status.json`记录阶段和停止原因。需要中止修复版时，在结果目录创建 `STOP_REQUESTED` 文件；恢复时移除该文件。已完成结果复用，所有尝试保留；停止和连接故障不消耗模型失败的2次重试预算。
