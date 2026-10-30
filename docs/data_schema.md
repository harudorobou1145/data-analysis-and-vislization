# 数据字典与统计口径
CSV UTF-8，空字段代表 null；JSON 使用 null，布尔为 true/false。raw trace 私有保存不覆盖，独立安全备份尚需正式采集前配置；发布只使用人工审查的匿名化派生副本。当前程序不自动脱敏，messages/trace/命令可能含敏感信息，不能直接公开。模拟数据只在 tests 中临时生成，禁止混入 results。

## runs.csv（一行一次运行）
|字段|含义/来源/缺失|
|---|---|
|run_id|UTC+任务+强度+UUID，调度器生成|
|task_id/task_type/task_difficulty|任务 metadata；T001 debugging/easy|
|model/reasoning_effort|请求的模型和配置，不声称后台实际版本已核实|
|repeat_index|本次命令内从1起的重复序号；跨命令可能重复，主键用run_id|
|start_time/end_time|CLI阶段UTC ISO8601，由采集器记录|
|duration_seconds|CLI墙钟秒，排除验收|
|input_tokens/output_tokens|turn.completed.usage 中各轮用量求和；无字段则 null；不对 item/update 的累计值求和|
|reasoning_tokens|仅日志明确返回同名字段才取；通常缺失；不从输出估算|
|tool_call_count|按 item.id 唯一计数，已识别的命令/文件变更/MCP/搜索/图像项；启动/更新/完成只算一次|
|command_execution_count|唯一command_execution项数，是工具数子集|
|file_change_count|唯一file_change项数，不是文件数或修改行数；快照差异另行分析|
|test_execution_count|命令文本含pytest/unittest的唯一命令项数；仅启发式，漏掉别名/误计文本需人工复核，不含独立验收|
|test_passed/test_total|JUnit testcase 中无failure/error/skipped为通过；分母含跳过；没有有效测试则null或0且不得成功|
|test_pass_rate|passed/total；total=0为空|
|task_success|独立pytest exit=0、全部通过且total>0；阻断/超时为null|
|execution_status|completed/cli_failed/timeout/launch_error；只描述CLI|
|cli_exit_code|进程返回码，未启动为空|
|agent_completed|可见turn.completed且未观察error/turn.failed；不能替代验收|
|evaluation_status|blocked_isolation/completed/timeout/error|
|data_kind|真实调度运行real；测试夹具synthetic，分析默认排除|

Token 用量只计 turn.completed；按真实turn_id去重，无ID则按结束事件顺序定义轮，因此无ID重复传输不可可靠判定，首个真实日志到来后需验证协议。cached_input_tokens保留在trace，不额外加到input。总Token=input+output，reasoning若已包含在output不重复加入。成本未知不估算。没有item.id的工具事件保留但不计工具总数，因此工具数是可观测下界。未知工具类型留待适配；模型不披露内部推理，不建立伪造思维链。

## events.csv
|字段|含义|
|---|---|
|run_id/event_index|运行及原始日志行号，保序，不合并行为轨迹|
|timestamp/relative_time_seconds|优先事件自带时间；否则采集器接收UTC/距启动秒；无则空，来源查arrival_times|
|event_type|CLI原始type；未知保留unknown|
|item_id/item_type|原始item字段；缺失空|
|tool_name|MCP原始tool或已识别项类型；未知空|
|status/exit_code/duration_seconds|原始item字段，未提供空，不用接收间隔猜耗时|
|command/error|可见命令与顶层错误；更多tool输入输出、文件patch等保留在原始trace|

行为分类为派生指标，命令/文件修改/搜索/MCP/其他；测试执行是命令标签。命令非零退出/错误项可提示错误；读取文件和修复轮次无法从摘要可靠确定，不硬填。下一阶段需建立有版本的分类规则、错误恢复链接及人工复核表。

## messages.csv
run_id 关联运行；message_id 为原始agent item.id（初始任务为prompt）；turn_id 为本地响应段分组；role 只输出user/assistant；content 为真实文本（发布前脱敏）；timestamp 无源时空；message_type 为task_prompt/agent_message。不收 reasoning/tool/系统事件为用户对话。初始prompt由调度器额外保存，因为CLI可能不回显。agent_message去重按id，分段不必然等于独立对话；统计课程规模前还需语义合并。PDF只给150消息/100轮门槛，未定义轮次，详见课程清单；turn.completed也不能等同于一轮用户交互。

## 文件与分析约定
每run：config.json（请求/版本信息/初始hash）、prompt.txt、workspace/、trace.jsonl、stderr.log、arrival_times.json、evaluation.json、metrics.json、runs.csv、events.csv、messages.csv；已批准验收另有evaluation/pytest.log和junit.xml。
results/runs.csv 仅顺序调度后重建汇总，不支持多调度进程并发写入。分析以已观测验收作成功率分母，并同时给n和evaluated_n，缺失不能当0；正式研究应额外按意向执行口径报告失败与缺失敏感性。均值跳过缺失，后续增加各指标有效n及缺失率审计。原始数据备份、自动清洗/脱敏/发布、修复分类不是本阶段已完成功能。


## 2026-10-30 首次实测更正
当前ChatGPT认证实际拒绝gpt-6.1-sol（model_not_found），撤销此前以该模型为默认的启动示例。--model现为必填，--http-only恢复最小HTTP配置但不提供模型权限。新模型访问失败记blocked_model_access、task_success=null并保留trace_errors；历史失败记录不覆盖。请以README及troubleshooting_model_access.md为最新启动说明。本地测试更新为9项通过，修复过程未调用模型。


## 2026-10-30：工具被策略拒绝的后续诊断
运行20261030T071200_T001_low_686b37d2b6c1已成功连接模型，故先前模型拒绝不是当前认证恒定不可用的证据。该次CLI版本为0.166.0（较初始0.152.0已有变化）。stdout JSONL无工具事件，但stderr明确有exec_command读取solution.py被blocked by policy；源码未变。模型回复称只读并不能单独证明最终权限，已知命令请求workspace-write，实际生效权限需诊断。
runner使用--ignore-user-config，忽略了本机windows.sandbox=elevated。新增--windows-sandbox elevated显式恢复该选择，仍保留workspace-write和never，不绕过管理策略。此项是待验证的配置修正，不保证解决全部策略拒绝；elevated需预先完成官方沙箱初始化，不是让生成代码以管理员权限运行。
新metrics增加policy_denials（stderr中真实拒绝行）和failure_category=policy_blocked；工具次数仍只计JSONL中可观察项，不能从stderr伪造item事件。既往结果不覆盖，不用此运行比较Low/High能力。JSONL实际提供reasoning_output_tokens=23，旧解析器遗漏；现在将该字段兼容映射到reasoning_tokens，不重复叠加，不改写历史记录。
先在独立终端的CLI中用/status和/debug-config检查生效权限、Windows沙箱与管理要求；不要公开完整配置/认证信息。确认初始化和策略允许后，使用README同一命令加--windows-sandbox elevated，先预演再仅重试Low一次。若仍blocked by policy，停止重复调用，检查执行规则/管理策略与Windows沙箱状态；不使用full-access或绕过开关。外部隐藏测试隔离的前置要求仍然存在。
官方诊断参考：https://learn.chatgpt.com/docs/windows/windows-sandbox 。修复仅本地验证，未调用模型。
