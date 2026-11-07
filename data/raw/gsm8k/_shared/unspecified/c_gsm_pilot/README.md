# GSM8K 思考强度预实验

本目录使用 Codex Desktop 自带的 codex.exe，通过 app-server 的本地标准输入输出协议调用模型。沿用本机已有登录和提供方设置，无需在脚本里填写密钥。

## 运行

需要 Python 3.11 或更高版本，以及已配置可用模型连接的 Codex Desktop。脚本仅使用 Python 标准库。

```powershell
python .\run_experiment.py --workers 2 --timeout 240
```

默认模型为 `gpt-6.1-sol`，档位为 `low / medium / high / xhigh / ultra`，固定种子 `20261030`，从 GSM8K test 集随机抽取 5 题，共 25 次调用。可用 `--codex` 指定 Desktop 自带 codex.exe 路径，用 `--codex-home` 指定已有配置目录。

```powershell
python .\run_experiment.py --sample-size 5 --seed 20261030 --workers 2 --timeout 240
python .\run_experiment.py --only gsm8k_test_1116__low --workers 1 --timeout 240
python .\run_experiment.py --dry-run
```

默认复用已有成功记录，失败记录会重新运行；`--overwrite` 会重新调用模型。重复实验或改变样本、模型时，请先复制整个目录，保留原始结果。单题模式的汇总仅包含该次选中的任务，随后运行完整命令可以复用已有结果并恢复全量汇总。

## 隔离与判分

- 每个题目和档位使用独立进程、临时配置目录和全新临时会话，历史用户与助手消息数为 0。
- 输入只有固定指令和当前题目，不提供示例题及参考答案。个人指令、历史记录、技能、MCP 和记忆不复制到实验环境。
- 禁用搜索、执行工具和委派；保存工具活动和模型重路由事件用于检查。
- Codex 固有的系统运行环境仍然存在。无上下文表示无先前对话，并不表示请求没有系统提示词。返回的输入 token 可能包含较大的固定开销。
- 用 GSM8K 标准答案中 `####` 后的数值自动判分，要求回答包含 `FINAL_ANSWER: <number>`。答案格式问题和运行错误单独记录。
- 原始数据校验 SHA256，抽样索引与执行顺序保存在 manifest.json。

## 指标解释

- `elapsed_seconds`：运行时返回的本轮总耗时，不含进程启动。
- `client_turn_elapsed_seconds`：客户端测得的本轮耗时。
- `wall_seconds_including_setup`：包含进程启动和清理的本次耗时。
- `client_first_answer_delta_seconds`：客户端首次收到回答文本增量的等待时间，可能包含推理及网络等待。
- `ttft_seconds`：仅在运行时明确返回相应字段时填写，缺失时为 null。
- `tpot_seconds`：目前没有匹配的逐 token 时间数据，保留 null。
- `token_usage`：原样记录提供方经 Codex 返回的输入、缓存输入、输出、推理及总 token。推理 token 返回 0 不能证明没有推理过程。

## 研究限制

5 题每档 1 次适合验证实验链路，无法稳定估计总体效果。若全部答对，应扩大样本和任务难度；不能据此断言思考强度无效。两路并发、网络和服务负载会影响耗时，尤其应谨慎解释单个长尾值。

本地运行时会验证请求模型及档位。现有连接经过用户配置的中转提供方，脚本无法独立核验上游实际模型或推理预算。Ultra 在本机模型目录中含有自动委派语义，本实验禁用委派，仅测试其单模型配置。

临时目录会短暂复制模型连接所需配置，结束时清理。交付目录不保存认证文件或密钥。脚本不修改原始 Codex 配置。

## 输出

- `report.md`：中文汇总和逐题矩阵。
- `results.json`：汇总与全部实验记录。
- `runs/*.json`：单次完整回答、配置、计时、token、判分及错误。
- `data/sample.json`：抽取的题目和用于事后判分的参考答案。
- `data/gsm8k_test.jsonl`：官方 test 数据。
- `manifest.json`：模型、档位、种子、抽样和执行顺序。

数据来源：https://github.com/openai/grade-school-math/blob/master/grade_school_math/data/test.jsonl
