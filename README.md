# CodeDepth

CodeDepth 是「数据分析与可视化」课程题目二选项 B 的四人小组项目。系统用交互图表研究两个问题：同一模型在不同推理档位下，任务表现、耗时、Token 和工具行为有什么变化？在请求档位相同的情况下，不同模型在现有实验设置下表现如何？

## 打开系统

克隆或解压本仓库后，用浏览器打开 [dashboard/index.html](dashboard/index.html)。页面使用仓库内的 [dashboard/data.js](dashboard/data.js)，打开时无需安装 Python、构建前端或登录模型账号。ECharts 通过 CDN 加载，图表渲染需要联网。

## 页面导览

| 页面 | 内容 |
| --- | --- |
| 模型对比 | 查看 high 档下 Sol、Luna、DeepSeek Flash 的编程和主观任务表现。 |
| EvalPlus | 查看 Sol 在 low、medium、high、max 四档的同题对比、Token 差值和失败题修复。可从任务矩阵或修复轨迹选择运行，再查看工具与代码。 |
| 代码 | 查看 Luna 和 DeepSeek Flash 在 HumanEval 与 ALFWorld 上的结果。 |
| 主观评分 | 查看 60 道开放题的质量、耗时、推理 Token、配对分差和复评稳定性。 |
| WildBench | 查看 20 道 WildBench 题在五个配置下的质量与资源消耗。 |

## 数据和复现

- **查看图表**：使用随仓库提供的 `dashboard/data.js`，按上面的步骤打开页面。
- **重建图表数据**：取得各实验的脱敏交接包后，按 [前端说明](dashboard/README.md) 用 [导出脚本](analysis/export_evalplus_data.py) 重建 `dashboard/data.js`。完整导出所需的交接包单独保管。
- **理解数据**：前端说明记录各实验、数据接口和比较局限。[采集框架数据字典](docs/data_schema.md) 说明早期运行、事件和消息表的字段；正式实验的详细字段以各交接包随附字典为准。仓库中的前端数据是派生结果，原始日志由采集成员私下保管。

## 提交材料

[课程验收清单](docs/assignment_requirements.md) 列出系统、报告与答辩要求。当前仓库提供系统源码和前端数据；案例报告、答辩材料和演示视频待补充。

早期 T001 试验、采集环境和故障记录见 [采集框架开发说明](docs/collection_framework.md)。
