# CodeDepth
不同推理强度下 Codex 编程智能体的任务表现与行为可视化分析。4人课程项目，题目二/选项B。
当前已跑通T001 Low试验：CLI完成、独立验收5/5通过。T001用于框架验证，尚无正式研究结论。原始运行记录默认不提交仓库。

四人协作、首次上传和队友安装步骤见 [团队配置说明](docs/team_setup.md)。队友需要重建环境、独立登录并初始化本机沙箱，不能克隆后直接沿用维护者的账号与配置。

## 文档入口
- docs/assignment_requirements.md：课程逐页验收与风险。
- docs/experiment_design.md：研究问题、控制变量、隔离边界。
- docs/data_schema.md：三层数据字典、计数与缺失口径。
- docs/setup_report.md：环境、测试、文件清单和下一步。
- dashboard/README.md：EvalPlus 交互式可视化系统（四视图+联动，已接入队友真实交接数据）。

## 本地复核（PowerShell，从 codedepth 目录运行）
```powershell
# 先在独立终端启动 codex，查看 /model；不发送任务，记录实际可用模型ID
$Model = Read-Host "输入你在CLI中确认可用的模型ID"
# 已有项目虚拟环境；迁移机器后重新创建，不要复制.venv
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe runner/run_experiment.py --task T001 --effort low --repeat 1 --model $Model --http-only
.\.venv\Scripts\python.exe runner/run_experiment.py --task T001 --effort high --repeat 1 --model $Model --http-only
.\.venv\Scripts\python.exe analysis/summarize.py results/runs.csv
```
默认两条实验命令均仅预演，不创建结果、不调用模型。测试使用明确模拟事件/伪CLI和开发者编写的可信代码，不运行AI生成代码。requirements-dev为范围，requirements-lock为本次安装快照。

## 获准后的首次真实对照
**先完成外部隔离、隐藏测试不可读与资源配额验证，并获得用户对真实调用及代码执行的确认。当前不要执行下面命令。** 应在受控环境内执行；开关不能替代实际隔离。
```powershell
.\.venv\Scripts\python.exe runner/run_experiment.py --task T001 --effort low --repeat 1 --model $Model --http-only --timeout 300 --execute --isolation-confirmed --allow-host-evaluation
.\.venv\Scripts\python.exe runner/run_experiment.py --task T001 --effort high --repeat 1 --model $Model --http-only --timeout 300 --execute --isolation-confirmed --allow-host-evaluation
```
每条新会话可能消耗账号模型额度；Token/费用事前未知。统一模型、权限、环境、任务和测试。首次核实模型/强度是否实际生效、provider认证和JSONL schema，再继续；不自动重试和批量扩大。
CLI支持`exec --json`，通过stdin提交prompt，`workspace-write`、`approval_policy=never`，不使用resume/绕过选项。用户配置被忽略，若当前自定义provider为必需，须先审核固定最小profile并调整代码；详见实验设计。若客户端有认证/嵌套调用限制，请关闭自动调用，在独立PowerShell/受控环境手动执行以上命令，不绕过限制。

## 输出
results/<run_id>/保存初始hash、请求配置、工作区、原始trace、stderr、接收时间、验收和三张CSV；results/runs.csv为顺序汇总。未批准独立验收时task_success为空。日志/消息是私有原始材料，公开前必须脱敏；正式采集前建立独立备份。不要并发运行多个调度器。

## AI 使用说明
本准备阶段由AI辅助提取课程要求、设计实验、编写程序/测试/文档；组员需复核并能在答辩解释代码。所有模拟数据仅用于软件验证，未作为研究结果。前端可视化系统已接入队友 EvalPlus 交接数据的真实结果（dashboard/，四视图+联动，经 analysis/export_evalplus_data.py 导出 data.js）；正式统计、案例短报告与答辩材料尚未完成。

## 首次调用故障修复（2026-10-30）
真实日志已证实当前ChatGPT认证拒绝gpt-6.1-sol（model_not_found），缓存不能证明账号权限；此前启动示例中的该默认模型已撤销。--model现在必填，必须使用CLI账号实际可用的精确ID。先在独立终端运行codex，查看/model，不发送任务，确认账号及支持的推理档位；若无法列出可用模型，先解决CLI登录/权限/版本问题，不重复提交实验。不要仅凭本地缓存猜模型名。
--http-only显式恢复本机openai-http的四项最小配置（Responses、ChatGPT认证、禁用WebSocket），仍忽略个人hooks/MCP。此选项处理WebSocket连接路径，不会解决模型授权。
新运行的模型访问错误记录failure_category=model_access及trace_errors，独立验收跳过并记blocked_model_access，task_success为空。已有失败运行保留原样：其4/5只是未修改初始代码的验收，不能当作Low任务表现。当前分析脚本不会自动排除这条历史记录，不要用其汇总作正式结论；正式分析前按日志审核并建立排除清单。
修复后9项测试通过；未重新调用模型。具体故障说明见docs/troubleshooting_model_access.md。


## 2026-10-30：工具被策略拒绝的后续诊断
运行20261030T071200_T001_low_686b37d2b6c1已成功连接模型，故先前模型拒绝不是当前认证恒定不可用的证据。该次CLI版本为0.166.0（较初始0.152.0已有变化）。stdout JSONL无工具事件，但stderr明确有exec_command读取solution.py被blocked by policy；源码未变。模型回复称只读并不能单独证明最终权限，已知命令请求workspace-write，实际生效权限需诊断。
runner使用--ignore-user-config，忽略了本机windows.sandbox=elevated。新增--windows-sandbox elevated显式恢复该选择，仍保留workspace-write和never，不绕过管理策略。此项是待验证的配置修正，不保证解决全部策略拒绝；elevated需预先完成官方沙箱初始化，不是让生成代码以管理员权限运行。
新metrics增加policy_denials（stderr中真实拒绝行）和failure_category=policy_blocked；工具次数仍只计JSONL中可观察项，不能从stderr伪造item事件。既往结果不覆盖，不用此运行比较Low/High能力。JSONL实际提供reasoning_output_tokens=23，旧解析器遗漏；现在将该字段兼容映射到reasoning_tokens，不重复叠加，不改写历史记录。
先在独立终端的CLI中用/status和/debug-config检查生效权限、Windows沙箱与管理要求；不要公开完整配置/认证信息。确认初始化和策略允许后，使用README同一命令加--windows-sandbox elevated，先预演再仅重试Low一次。若仍blocked by policy，停止重复调用，检查执行规则/管理策略与Windows沙箱状态；不使用full-access或绕过开关。外部隐藏测试隔离的前置要求仍然存在。
官方诊断参考：https://learn.chatgpt.com/docs/windows/windows-sandbox 。修复仅本地验证，未调用模型。
