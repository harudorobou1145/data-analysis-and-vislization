# AI 对话行为分析系统

本目录合并 WTY、XWB 的实验结果。新前端基于 [Minimal UI Material Kit React](https://github.com/minimal-ui-kit/material-kit-react)，复用模板主题、字体、配色及导航风格，使用 React、TypeScript、Vite、Material UI 和 ECharts。原工作区三个来源目录未修改。提交前请将目录名中的“学号_姓名”替换为实际信息。

## 目录

```text
学号_姓名_AI对话行为分析_系统/
├── README.md
├── app/
│   └── dashboard/              前端工程与构建配置
│       ├── src/                React 页面、统计工具、模板主题
│       ├── scripts/            指标导出及测试
│       ├── public/analysis-data.json 脱离原始对话的指标表
│       └── dist/               构建产物（npm run build 生成）
├── data/
│   ├── raw/<数据集>/<模型>/     原始结果、日志和运行证据
│   ├── processed/<数据集>/<模型>/ 结构化结果与行为特征
│   ├── processed/<数据集>/_shared/ 共享题目和跨模型配对
│   ├── processed/catalog.json  分组记录数
│   ├── processed/merge_manifest.json 复制文件 SHA256
│   └── data_dictionary.md
├── report/                    报告说明与待补交材料
└── presentation/              答辩材料状态说明
```

数据集：`gsm8k`、`hss`、`mt_bench`、`subjective_60`、`wildbench`、`humanevalplus`、`alfworld`、`custom_t001`。最后一项仅包含辅助试跑，不是正式基准。目录名保留实际请求模型 ID，不擅自合并名称相似的模型。

## 打开系统

需要 Node.js 22.18+，推荐 Node.js 24。在本目录运行：

```powershell
cd app/dashboard
npm ci
npm run dev
```

默认访问 `http://127.0.0.1:3039/`，端口占用时以 Vite 输出为准。首次安装依赖需要联网；字体和图表库随构建打包，不使用外部 CDN。

两个分析方向分别为 GPT 6.1 Sol 的 low/high/ultra，以及 GPT 6.1 Sol、GPT 6 Luna、DeepSeek Flash 的 high。总览按数据集展示评分；详情包含评分比较、逐请求折线、评分与耗时/Token 散点、条件统计及请求明细。支持任务类型、共同题目、Token 口径、图例筛选、搜索、CSV 导出及记录抽屉。

## 数据与校验

WTY：945 条结果索引、1932 条请求索引。XWB：1047 条主体记录（包含正式首轮、补测和修复）、43 条辅助记录。XWB 原始表有 1092 条，含恢复副本，不应直接作为样本量。各组精确数量见 `data/processed/catalog.json`。

在 `app/dashboard/` 运行：

```powershell
npm test
npm run build
npm run preview
```

开发和构建前自动从 `data/processed/<数据集>/<模型>/` 导出指标；源数据改变后重启开发服务，或执行 `npm run data` 并刷新。当前候选池 1,825 条：主观60题600、WildBench200、HSS80、HumanEval+600、ALFWorld300、GSM8K25、MT-Bench20。页面按方向再次筛选，不把候选池总量作为单张图的分母。测试覆盖真实首轮计数、空值、档位、模型名、题目等权和共同题目交集。

旧静态页面、合并脚本及 `app/source_packages/` 已不在当前交付目录，不能再调用旧说明中的命令。历史 `catalog.json` 和 `merge_manifest.json` 是合并快照，不是新前端输入。

## 分析口径

- WTY 正式数据取 `phase=formal`，XWB 只取 `phase=initial`；预实验单独展示，历史、补测、修复和辅助运行不混入正式主图。
- 主观分及 HSS 使用原始 0–10 分；客观任务使用已记录的布尔判定折算为 0/100 后计算正确率或成功率。null 不补零。
- 柱图先将同题重复评分取均值，再按题等权平均。详情默认比较有数据条件的已评分题目交集；未出现的条件仍标为缺测。
- `max` 不等于 `ultra`，不擅自替换，因此代码和交互数据的 Ultra 为缺测。
- 逐请求折线按任务编号、运行编号排序，序号不是时间或训练进步，也不代表各条件的请求一一配对。
- 输出 Token 已含推理 Token，两者不相加；不同数据源的计时、缓存及模型通道不同，不作为严格同预算比较。
- 散点表示观测关联，不推断因果。不同数据集不合并为总能力分；主观评分不是官方榜单成绩，预实验样本不足以推断总体能力。

## 提交边界

报告和答辩 PDF 尚未提供，见相应目录说明。课程要求 PDF 不是案例报告。生产部署仅发布 `app/dashboard/dist/`，不要发布整个结果包；前端指标白名单不包含提示词、回答、原始日志路径或访问凭据。题库、HSS 原图片及模型调用环境不因合并自动补齐。模板许可见 [app/dashboard/LICENSE.material-kit.md](app/dashboard/LICENSE.material-kit.md)。