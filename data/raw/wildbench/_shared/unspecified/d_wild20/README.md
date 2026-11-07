本次实验：WildBench v2-hard，固定筛选抽样20条。

四组配置为 gpt-6.1-sol 的 low、high、ultra，以及 gpt-6-luna 的 high。每题每组独立回答2次，共160份回答。每份回答主评1次，另抽16份重复盲评，共计划336次成功请求，失败重试另外记录。

每次回答和评分使用新的 Codex 进程、临时配置和独立会话，不共享跨题历史，禁止工具、联网和委派。原题提示词保持原样，检查清单只提供给裁判。裁判固定 gpt-6.1-sol/high。

评分按 WildBench v2 原始1到10整数尺度，使用每题专属检查清单辅助判断。另存转换值 `(score - 5) * 2`。本次更换裁判并增加逐项诊断，属于改编的子集实验。分数不能标为官方完整榜单结果，也不能直接与旧实验的通用四维总分混为同一量尺。

执行：

```powershell
& 'D:/code/visual/.venv/Scripts/python.exe' -X utf8 .\start_experiment.py
```

只核对题库：`python script/prepare_dataset.py --verify`。
只核对模型目录：`python script/preflight.py`，此命令不产生题目回答。
离线测试：`python -m unittest discover -s script -p 'test_*.py'`。

脚本支持断点续跑，复用首个成功且格式有效的结果，保留每次失败记录。结果位于 `result/wildbench_20/`；日志位于 `work/logs/`。停止时在结果目录创建 `STOP_REQUESTED`，确认进程结束后删除该标记才能继续。

`run_id` 对应同一任务、配置和生成次数。评分用 `answer_request_id`、`answer_attempt_id` 和 `answer_hash` 关联原回答。跨实验唯一键为 `experiment_id + run_id`。保存候选请求的耗时、首段可见文字等待、token用量，以及评分请求自己的记录。未测得的 TTFT、TPOT 保持 `null`。

汇总文件为 `merged_results.json`、`frontend_rows.jsonl`、`summary.json`；完整检查为 `audit.json`。正式结论必须等待完整审计通过。样本只有20题，类别覆盖和统计代表性有限。

来源：https://huggingface.co/datasets/allenai/WildBench ，许可证 CC BY 4.0。源版本、文件哈希、抽样种子和筛选决定见 `dataset/`。文件夹日期沿用最初准备日期，实际实验标识与开始时间以配置和清单为准。
