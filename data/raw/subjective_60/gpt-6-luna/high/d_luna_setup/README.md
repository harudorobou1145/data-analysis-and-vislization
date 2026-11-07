# Luna high 同题重测

使用原60题，每题以 `gpt-6-luna / high` 独立生成2次，共120份回答。
裁判固定 `gpt-6.1-sol / high`，沿用原四项评分；120次主评及12次重复盲评，共252次请求，不含重试。
本批沿用原评分口径，以便比较，原评分天花板的局限继续保留。

输出目录：`result/formal_luna_high_60/`。
日志：`work/logs/luna_high_60_20261102.stdout.log` 和同名 `.stderr.log`，使用UTF-16。
单条回答、评分、失败尝试分别存于 `answers/`、`scores/`、`attempts/`。
`merged_results.jsonl` 与 `.csv` 通过run_id关联问题、回答、评分、耗时和Token。
跨实验关联用 `experiment_id + run_id`，避免与原批次重复标识混淆。
真实TTFT和TPOT仅在运行时明确提供时记录，缺失保持null；首段可见文本等待另列。

```powershell
& 'D:/code/visual/.venv/Scripts/python.exe' -u './script/resume_supervisor.py'
```

恢复程序只对已识别的连接中断有限续跑，已完成请求复用。需要停止时，在结果目录创建 `STOP_REQUESTED` 文件。
`comparison_provenance.json` 记录原批次哈希及保持一致的设置。
