# 模型访问故障（2026-10-30）
运行：20261030T065818_T001_low_f5723d34fb80。
trace.jsonl最终错误：The 'gpt-6.1-sol' model is not supported when using Codex with a ChatGPT account；code=model_not_found。此前WebSocket重试超时，随后回退HTTPS才显示明确错误。因此增加timeout、修改T001或增加repeat不能解决模型授权。
本次没有工具调用或代码修改，4/5为初始代码基线。保留全部原始文件，不改写为成功，不用作推理强度效果证据；118秒也不是成功完成任务耗时。

## 已修复
runner取消默认模型，--model必填。增加--http-only，仅恢复本机openai-http四项无密钥provider设置，禁用WebSocket，不加载个人hooks/MCP。捕获顶层及item错误并输出trace_errors；模型访问失败时evaluation_status=blocked_model_access、task_success=null，避免把初始代码验收当作模型表现。未修改用户目录配置和认证文件。9项本地测试通过，未做真实重试。

## 手动下一步
在独立PowerShell运行codex，使用/model查看该登录实际列出的模型与推理档位，不发送实验任务；模型列表仍需首次实际调用验证。若仍只有不受支持的ID，先核对CLI登录账号、服务权限及客户端安装来源/版本；不要猜替代模型，也不要公开认证文件。
选定支持low/high的精确模型ID，在codedepth目录设置$Model，再按README预演。确认同一模型/认证/隔离配置后先仅重试Low一次，通过再做High。--http-only不改变模型访问权限。真实重试会消耗账号额度，具体用量未知。


## 2026-10-30：工具被策略拒绝的后续诊断
运行20261030T071200_T001_low_686b37d2b6c1已成功连接模型，故先前模型拒绝不是当前认证恒定不可用的证据。该次CLI版本为0.166.0（较初始0.152.0已有变化）。stdout JSONL无工具事件，但stderr明确有exec_command读取solution.py被blocked by policy；源码未变。模型回复称只读并不能单独证明最终权限，已知命令请求workspace-write，实际生效权限需诊断。
runner使用--ignore-user-config，忽略了本机windows.sandbox=elevated。新增--windows-sandbox elevated显式恢复该选择，仍保留workspace-write和never，不绕过管理策略。此项是待验证的配置修正，不保证解决全部策略拒绝；elevated需预先完成官方沙箱初始化，不是让生成代码以管理员权限运行。
新metrics增加policy_denials（stderr中真实拒绝行）和failure_category=policy_blocked；工具次数仍只计JSONL中可观察项，不能从stderr伪造item事件。既往结果不覆盖，不用此运行比较Low/High能力。JSONL实际提供reasoning_output_tokens=23，旧解析器遗漏；现在将该字段兼容映射到reasoning_tokens，不重复叠加，不改写历史记录。
先在独立终端的CLI中用/status和/debug-config检查生效权限、Windows沙箱与管理要求；不要公开完整配置/认证信息。确认初始化和策略允许后，使用README同一命令加--windows-sandbox elevated，先预演再仅重试Low一次。若仍blocked by policy，停止重复调用，检查执行规则/管理策略与Windows沙箱状态；不使用full-access或绕过开关。外部隐藏测试隔离的前置要求仍然存在。
官方诊断参考：https://learn.chatgpt.com/docs/windows/windows-sandbox 。修复仅本地验证，未调用模型。
