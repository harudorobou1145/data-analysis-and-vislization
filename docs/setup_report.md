# 第一阶段准备报告
日期：2026-10-30（Asia/Shanghai）。状态：本地框架测试通过；停止在真实实验之前。

## 1. 课程要求
完整读取题目二9页并渲染核对，未修改PDF。p1要求2～3任务、150消息或100轮；p2～3原始备份、数据字典、匿名化；p5 B明确目标、管道、≥3交互视图、联动、案例和可运行交付；p6 ≥5发现（2条一/二维、2条三维以上、1条异常/局限）；p7 README/复现、5～6分钟1080P视频、PPT建议8～12页；p8为B评分；p9诚信和扣分。详细验收见assignment_requirements.md，未混入海报和题目一要求。

## 2. 研究设计检查
单模型推理强度对照符合自定义方向。三类任务合理，目前只有T001且无真实数据，不满足最终规模，也不能得出结论。消息/轮次PDF无明确定义，工具调用不当作对话；需向老师确认智能体日志口径，按保守真实交互口径规划并在正式实验扩充样本。RQ1～5仍是待验证问题，简单T001仅验证框架。

## 3. 实测环境
|项目|结果|
|---|---|
|系统|Windows NT 10.0.22631（PowerShell报告）|
|终端|PowerShell Core 7.6.5|
|默认Python|3.14.7（miniconda3）|
|pip|26.2.1|
|pytest|默认Python无；项目.venv安装pytest 9.2.0及小型依赖，锁定requirements-lock.txt|
|Codex CLI|0.152.0；npm PowerShell入口，runner转为node直接调用，兼容大写.CMD|
|非交互/日志|`codex exec --help`实际列出exec、--json、--ephemeral、--ignore-user-config、--model、--config、--sandbox|
|当前用户配置|只读取白名单三项：model=gpt-6.1-sol，model_provider=openai-http，model_reasoning_effort=low；未读取认证文件或输出密钥|
|强度|models_cache.json中该模型列出low/medium/high（亦有更高档）；这是本地缓存证据，账号实际服务支持/配置生效待真实调用验证|
|Git|2.48.1.windows.1；codedepth当前不是Git仓库，未擅自初始化|
|CLI警告|帮助及版本出现“Could not find home directory”；未做真实认证验证|

PDF默认Python没有pypdf，使用本机预置运行时pypdf提取，pdftoppm渲染，未下载大型依赖。小型pytest最初受网络沙箱限制，获工具自动审批后安装到项目.venv。OpenAI Docs搜索未返回结果，直接打开官方非交互文档成功：https://developers.openai.com/codex/noninteractive/ （重定向 https://learn.chatgpt.com/docs/non-interactive-mode）。实际参数以本机help为准，未以文档替代模型实测。

## 4. 文件清单
|文件|作用|
|---|---|
|README.md|项目入口、复核和未来启动命令、AI辅助范围|
|.gitignore|忽略虚拟环境、缓存、私有运行目录|
|requirements-dev.txt / requirements-lock.txt|测试依赖范围及本机锁定快照|
|tasks/T001/starter/solution.py|有空列表缺陷的初始代码|
|tasks/T001/prompt.md / metadata.json|统一任务规范、类型难度、pilot标记|
|evaluation/T001/test_average.py|不复制给智能体的独立5案例pytest|
|runner/common.py|统一CSV字段和写出函数|
|runner/run_experiment.py|预演/调度、新会话新目录、采集、超时、失败与汇总|
|runner/parse_trace.py|可观察事件、消息、Token及去重计数|
|runner/evaluate.py|独立pytest、JUnit解析及隔离确认门槛|
|analysis/summarize.py|按强度输出成功率及平均时间/Token/工具次数|
|tests/test_framework.py|模拟日志/伪CLI和可信实现的本地测试|
|runner/__init__.py / analysis/__init__.py|模块包标记|
|docs/assignment_requirements.md|带页码课程验收清单及风险|
|docs/experiment_design.md|变量、RQ、隔离、失败/时间口径|
|docs/data_schema.md|字段来源、缺失、消息与工具计数限制|
|docs/setup_report.md|本报告|
|docs/source_review/page-1.png～page-9.png、overview.png|题目二只读渲染核对材料|
|dashboard/README.md|三视图及联动计划，未开发前端|
|results/README.md / runs.csv|无真实数据声明、仅表头的汇总入口|
|.venv/|项目内本地Python环境，不提交不迁移|

## 5. 已实现与验证
` .\.venv\Scripts\python.exe -m pytest tests -q `：最终 **8 passed**。覆盖启动/完成同一工具去重、带ID重复用量、未知/异常字段、消息与工具分离、验收默认阻断、可信初始代码失败及参考修复通过、两个独立工作区、CLI失败日志、超时保留、分析排除模拟/缺失、Windows npm shim。
Low和High命令均完成预演，未调用模型、未产生真实run。首次compileall因部分__pycache__写权限失败，已改用内存compile逐个语法检查，10个Python文件全部通过，不写缓存。独立验收测试仅对开发者编写的可信样本运行：初始实现4/5，参考修复5/5，均为框架验证，不是实验结果。

## 6. 未解决事项
- 实际模型访问、Low/Medium/High生效、provider认证/嵌套限制与真实JSONL协议未验证。
- 宿主机没有验证可靠隔离；workspace-write不阻止读隐藏测试，宿主pytest无CPU/内存强配额。真实运行/验收保持阻断；先建立并验证外部隔离，或另获用户明确确认当前执行风险。
- runner忽略个人配置，当前自定义provider可能需要审核后的固定最小profile；代码尚未提供profile参数，需要在首次调用前核实并统一调整。
- 自动分类仅基础类型/测试命令启发式；错误恢复、读取文件、首次修复等需真实日志及人工核验。
- 无ID重复累计usage无法可靠去重；未知工具类型保留原文并待适配；reasoning_tokens不披露则null。
- 原始备份、自动脱敏、清洗审计、正式样本设计、完整前端、案例报告、PPT、视频留到后续，不宣称已完成。

## 7. 下一步：首次T001 Low/High
先用README中两条默认命令预演；确认外部隔离/资源配额/隐藏测试访问边界，核实provider和认证方案，然后向用户说明真实命令、workspace-write权限、每次新会话及未知额度消耗并等待确认。确认后在独立PowerShell/受控环境依次运行README的--execute命令（每强度1次），不要在当前阶段直接执行。若客户端限制嵌套调用，按同一手动命令运行，不绕过沙箱。

## 8. 首次实验预期输出
每run包含config.json、prompt.txt、workspace/、trace.jsonl、stderr.log、arrival_times.json、metrics.json、evaluation.json、runs.csv、events.csv、messages.csv；批准pytest后另有evaluation/pytest.log、junit.xml。results/runs.csv顺序汇总两次运行。真实Token、耗时、成功率均未知，不能填预期数值；失败/空日志/验收阻断应保留可追踪记录。

本阶段已停止，等待用户确认真实实验；安全隔离及提供方核实仍是启动前置条件。


## 2026-10-30 首次实测更正
当前ChatGPT认证实际拒绝gpt-6.1-sol（model_not_found），撤销此前以该模型为默认的启动示例。--model现为必填，--http-only恢复最小HTTP配置但不提供模型权限。新模型访问失败记blocked_model_access、task_success=null并保留trace_errors；历史失败记录不覆盖。请以README及troubleshooting_model_access.md为最新启动说明。本地测试更新为9项通过，修复过程未调用模型。


## 2026-10-30：工具被策略拒绝的后续诊断
运行20261030T071200_T001_low_686b37d2b6c1已成功连接模型，故先前模型拒绝不是当前认证恒定不可用的证据。该次CLI版本为0.166.0（较初始0.152.0已有变化）。stdout JSONL无工具事件，但stderr明确有exec_command读取solution.py被blocked by policy；源码未变。模型回复称只读并不能单独证明最终权限，已知命令请求workspace-write，实际生效权限需诊断。
runner使用--ignore-user-config，忽略了本机windows.sandbox=elevated。新增--windows-sandbox elevated显式恢复该选择，仍保留workspace-write和never，不绕过管理策略。此项是待验证的配置修正，不保证解决全部策略拒绝；elevated需预先完成官方沙箱初始化，不是让生成代码以管理员权限运行。
新metrics增加policy_denials（stderr中真实拒绝行）和failure_category=policy_blocked；工具次数仍只计JSONL中可观察项，不能从stderr伪造item事件。既往结果不覆盖，不用此运行比较Low/High能力。JSONL实际提供reasoning_output_tokens=23，旧解析器遗漏；现在将该字段兼容映射到reasoning_tokens，不重复叠加，不改写历史记录。
先在独立终端的CLI中用/status和/debug-config检查生效权限、Windows沙箱与管理要求；不要公开完整配置/认证信息。确认初始化和策略允许后，使用README同一命令加--windows-sandbox elevated，先预演再仅重试Low一次。若仍blocked by policy，停止重复调用，检查执行规则/管理策略与Windows沙箱状态；不使用full-access或绕过开关。外部隐藏测试隔离的前置要求仍然存在。
官方诊断参考：https://learn.chatgpt.com/docs/windows/windows-sandbox 。修复仅本地验证，未调用模型。
