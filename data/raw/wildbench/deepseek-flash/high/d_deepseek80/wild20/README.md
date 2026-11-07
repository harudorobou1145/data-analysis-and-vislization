本批用 deepseek-flash / high 重跑原 WildBench v2-hard 20题，每题独立生成2次。

共40份回答、40份主评、4份重复盲评，84次成功请求，失败尝试另外保存。
裁判仍为 gpt-6.1-sol / high。原题、检查清单、scoring.py 保持原字节。
候选和裁判均用独立 Codex app-server、空白 ephemeral thread、无历史、无工具。
候选走官方 DeepSeek Responses，裁判走既有 Codex 服务；服务路径变化影响速度比较。

准备前需放入经过真实目录及推理检查的 provider_preflight.json。
凭据由环境变量 DEEPSEEK_CREDENTIAL_HELPER 指向外部本机加密凭据读取脚本，结果中不保存凭据。
执行 script/run_experiment.py --stage all；中断后沿用同一命令恢复，保留首次成功结果。

结果与旧60题分开评分，不混合两个量尺的均分。唯一连接键是 experiment_id 与 run_id。
TTFT、TPOT 缺失时保持 null，首段可见文本等待单独记录。
