# HSS DeepSeek补测结果

沿用原20题、原图、原参考答案及逐项rubric，high档每题一次。候选与裁判均使用独立Codex app-server会话。

| 模型 | 档位 | 回答数 | 逐题均分（0至10） | 全部准则满足 | 候选中位耗时（秒） |
|---|---|---:|---:|---:|---:|
| gpt-6.1-sol | high | 20 | 4.42 | 8/20 | 12.79 |
| gpt-6.1-sol | low | 20 | 3.75 | 6/20 | 7.84 |
| gpt-6.1-sol | ultra | 20 | 4.42 | 8/20 | 22.12 |
| gpt-6-luna | high | 20 | 2.75 | 4/20 | 8.60 |
| deepseek-flash | high | 20 | 3.92 | 6/20 | 23.62 |

本次20份回答、20次主评、2次重复盲评均已核查。评分以answer_request_id、answer_attempt_id和answer_hash关联回答。前端正式池增加20条，HSS从80条变为100条。

本次使用2026-11-22的DeepSeek官方API动态别名deepseek-flash，裁判为当前配置的gpt-6.1-sol/high，Codex版本0.167.0-alpha.4.1。原GPT HSS结果来自2026-11-06；模型上游版本、API日期与客户端变化均可能影响比较，不能将差异完全归因于模型名称。没有重跑或覆盖原GPT结果。

原图继续读取旧实验目录，当前交付只增加结果与代码，不重复复制图片。真实TTFT/TPOT未返回的项目保留null，客户端首段可见文本等待另列。重复盲评不计入主质量均值。具体原始证据、主评、复评和失败尝试见data/raw/hss/deepseek-flash/high/hss20_20261122。
