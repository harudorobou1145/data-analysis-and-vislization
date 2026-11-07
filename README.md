# AI 对话行为分析系统

本目录合并 WTY、XWB 的实验结果和 XXT 的可视化代码，原工作区三个目录未修改。提交前请将目录名中的“学号_姓名”替换为实际信息。

## 目录

```text
学号_姓名_AI对话行为分析_系统/
├── README.md
├── app/
│   ├── dashboard/              可直接打开的可视化系统
│   ├── analysis/               原有导入、统计、前端导出脚本
│   ├── runner/                 原有实验运行代码
│   ├── tests/                  原有测试
│   ├── merge_workspace.py      合并和离线校验脚本
│   └── source_packages/        WTY/XWB 原包快照，保持原有相对路径
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

用浏览器打开 [app/dashboard/index.html](app/dashboard/index.html)，无需安装依赖或启动服务。ECharts 使用 CDN，需要联网。前端继续读取已有的脱敏派生数据 [app/dashboard/data.js](app/dashboard/data.js)。本次仅整合目录与结果，不修改图表统计口径，也不新增原系统尚未实现的数据集视图。

注意：已有 `data.js` 是原交付快照，并非本次根据统一分组目录重新计算。原导出脚本需要其说明中列出的历史来源布局，不能直接把本目录当作旧版导出输入。后续改图表时请从 `data/processed/<数据集>/<模型>/` 读取并明确阶段、档位和分母。

## 数据与校验

WTY：945 条结果索引、1932 条请求索引。XWB：1047 条主体记录（包含正式首轮、补测和修复）、43 条辅助记录。XWB 原始表有 1092 条，含恢复副本，不应直接作为样本量。各组精确数量见 `data/processed/catalog.json`。

在本目录运行 Python 3.11+：

```powershell
python app/merge_workspace.py --verify
python app/source_packages/wty/app/inspect_package.py --verify
python app/source_packages/xwb/scripts/verify_package.py
```

第一条检查合并复制文件哈希、分组归属、记录数量、运行 ID 和主要证据路径。后两条运行各原包自带的离线校验，不调用模型。只有重新从原工作区合并时才使用 `python app/merge_workspace.py`；需要本目录仍与 `wty/`、`xwb/`、`xxt/` 同级。

`app/source_packages/` 是兼容归档，不是另一份独立实验；分析时不要与 `data/processed/` 重复计数。原包内路径相对各自包根目录，统一分组数据中的证据路径相对本合并目录。

## 提交边界

报告和答辩 PDF 尚未提供，见相应目录说明。课程要求 PDF 保留在 XWB 原包内，不是案例报告。原始日志仅用于队内受控核查，不能将整个本目录部署到公开静态网站；公开展示只部署经审查的 `app/dashboard/`。题库、HSS 原图片及模型调用环境不因合并自动补齐。