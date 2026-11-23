"""Write the completed extension's evidence summary. Offline; no model calls."""
from collections import Counter

import protocol as p
from expand60 import EXPERIMENT, BASE, validate


def build():
    manifest, _, _ = validate()
    folder = p.ROOT / 'data/processed/topbench3' / EXPERIMENT
    summary = p.load(folder/'summary.json')
    integrity = p.load(folder/'integrity_report.json')
    assert summary['paired_complete_cases'] == 60 and integrity['fully_evaluated'] == 180
    lines = ['# TOP Bench 新增60题实验结果', '',
        '固定中转站GPT 6.1 Sol、High，比较原始提示、TNM和CBD。新增批次已完成60道题、180组作答与评分。原20题保留为独立批次。', '',
        '## 抽样与协议', '',
        '- 原始来源：[TOP-R](https://github.com/1Ponder/TOP-R)，固定提交`'+manifest['source_commit']+'`。',
        '- 从1000条官方场景中排除原20题，再在5个领域×4档难度的每个单元抽3道新题。',
        '- 随机种子2026112303，题号TOP021–TOP080；与TOP001–TOP020无重复。',
        '- 与原批次保持同一作答/评分模型、High档、官方提示模板、静态工具返回协议、8192输出上限、600秒请求超时和两并发。',
        '- 每组两次作答请求、两次评分请求；正常720次HTTP请求，不是180次。', '',
        '## 新增批次成绩', '',
        '| 策略 | 配对题数 | 完成率 CR | 泄漏率 LR | H分数 |',
        '| --- | ---: | ---: | ---: | ---: |']
    labels = {'baseline':'原始提示','tnm':'TNM','cbd':'CBD'}
    for strategy, label in labels.items():
        row = summary['strategies'][strategy]
        lines.append(f"| {label} | {row['n']} | {row['CR']:.1%} | {row['LR']:.1%} | {row['H_score']:.3f} |")
    lines += ['', 'H由组级CR和LR计算：`2×CR×(1−LR)/(CR+1−LR)`。任务完成与泄漏是两个独立判定。', '',
              '## 原20题与合并80题', '',
              '| 范围 | 策略 | 题数 | CR | LR | H |', '| --- | --- | ---: | ---: | ---: | ---: |']
    old = p.load(p.ROOT/'data/processed/topbench3'/BASE/'summary.json')
    for strategy, label in labels.items():
        a, b = old['strategies'][strategy], summary['strategies'][strategy]
        lines.append(f"| 原20题 | {label} | {a['n']} | {a['CR']:.1%} | {a['LR']:.1%} | {a['H_score']:.3f} |")
        cr, lr = (a['CR']*20+b['CR']*60)/80, (a['LR']*20+b['LR']*60)/80
        lines.append(f"| 合并80题 | {label} | 80 | {cr:.1%} | {lr:.1%} | {p.h_score(cr,lr):.3f} |")
    lines += ['', '## 完整性与范围', '',
        f"- 正式网络尝试：{integrity['http_attempts']}次；状态分布：{integrity['request_statuses']}。",
        f"- 新增样本：{integrity['distinct_cases']}题；结果：{integrity['run_rows']}条；完整配对：{integrity['paired_complete_cases']}题。",
        '- 360次被Windows沙箱拒绝的本地连接尝试已单独归档，其中供应方响应为0；未混入正式模型结果和正式网络尝试。',
        '- Token以原始API usage为准；价格未核实，不估算人民币费用。推理Token已包含在输出Token中。',
        '- 当前为平衡子集，PCI在样本中的占比高于1000题原始分布；不冒充官方全量成绩。',
        '- 作答与评分使用同一模型、独立且对策略盲化的上下文，尚需人工抽检。',
        '- 参考支撑集合是隐私推断的标注集合，图边仅表示工具选择关系，真实外部工具执行数为0。', '',
        '## 页面接入', '',
        '前端从“提示词策略 → TOP-Bench v3”进入，统一展示全部80题、240组结果，不提供批次切换。领域、难度、矩阵框选、散点、工具图、桑基图及导出均在合并题集上联动；底层来源标识仅供追溯。', '',
        '新增批次指标在`data/processed/topbench3/'+EXPERIMENT+'/`；原20题不覆盖。合并展示包位于`topbench3_sol_high_prompts80_combined_v1/visualization/`，`active_visualization.json`指向当前展示源。', '',
        '## 离线复现', '', '```powershell',
        'python app/experiments/topbench3/expand60.py export',
        'python app/experiments/topbench3/prepare_visualization.py --experiment-id '+EXPERIMENT,
        'python app/experiments/topbench3/build_combined_visualization.py',
        'python app/experiments/topbench3/write_extension_report.py',
        'cd app/dashboard', 'npm test', 'npm run build', 'npm run dev', '```', '',
        '上述导出与构建命令不调用模型。正式重启或继续实验的命令另见实验README，已完成阶段会复用断点。', '']
    destination = p.ROOT/'report/TOPBench新增60题结果.md'
    destination.write_text('\n'.join(lines), encoding='utf-8')
    print('Wrote', destination)


if __name__ == '__main__':
    build()
