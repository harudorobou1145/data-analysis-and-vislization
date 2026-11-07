HSS图片实验：固定官方数据版本，按四类各抽5题，共20题。四组配置为Sol low、high、ultra和Luna high，每题每组独立生成一次，共80份回答。

每次生成接收原始图片和问题。参考答案与评分标准只传给裁判，裁判固定Sol high。共80份主评、8份重复盲评。重复评分用于检查稳定性，不并入主分。

评分保留两项：所有必要标准都满足才算通过；部分分为满足标准数除以标准总数。另存部分分乘10，便于展示，不能当作独立主观量尺。部分题只有一个标准，所以单题部分分仍可能只有0或10。

这是一份20道图片题的适配实验，改变了原裁判和重复次数，不能当作完整HSS官方排行榜成绩。媒体版权和使用说明见dataset/UPSTREAM_README.md。

下载并冻结：

```powershell
python script/prepare_dataset.py --direct
```

运行前准备与核对：

```powershell
python script/run_experiment.py --stage prepare
python -m unittest discover -s script -p test_*.py
```

正式运行及续跑：

```powershell
python script/run_experiment.py --stage all --workers 4 --timeout 600 --max-attempts 3
python script/run_experiment.py --stage audit --require-complete
```

依赖父目录common/codex_client.py中的call_codex。默认每题之间新会话、无历史、无工具。请求原文、分数、请求ID、尝试ID、回答hash、图片hash、耗时、token均分别保留；TTFT和TPOT未返回时留空。候选与裁判开销分开统计。

数据入口为result/hss20/frontend_rows.jsonl。唯一键为experiment_id与run_id组合。原始回答在answers/，评分在scores/，所有尝试在attempts/，完整性检查为audit.json。
