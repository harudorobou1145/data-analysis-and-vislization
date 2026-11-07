本轮沿用原60题，候选为 DeepSeek Flash high，裁判固定 Sol high。

写作、分析、规划各20题。每题独立回答2次，共120份回答、120份主评和12份重复盲评。
每次请求使用全新进程与无历史临时会话，禁用工具、文件、联网和委派。

评分保留原四维标准，各维0至5分，步长0.5，合成0至10分。题库及评分模块字节保持一致。
这批分数可与之前60题同口径配对比较，不能与 WildBench 的整体评分直接合并。

候选通过官方 DeepSeek Responses 接口，裁判使用现有 Codex API配置。两者均使用相同 Codex harness。
候选目录由已验证的官方模型清单作前置校验，实际 thread/start 和 turn/start 同时核对精确模型及high档。
客户端运行时间包含服务和网络等待，跨服务时延差异不能全部解释为模型思考。

密钥通过环境变量 DEEPSEEK_CREDENTIAL_HELPER 指向实验外的Windows加密凭据读取模块。
实验包不包含密钥或该私有模块。provider_preflight.json 必须在prepare前生成并记录官方验证结果。

运行：python script/run_experiment.py --stage all --workers 4 --timeout 600 --max-attempts 3
成功请求会复用；失败尝试保留。主键为 experiment_id 与 run_id，评分连接精确的answer_request_id和answer_hash。
