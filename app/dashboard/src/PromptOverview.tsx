import { Button } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { Chart } from './Chart';
import { commonCases, pct, strategyInfo, summarize } from './topbench-data';
import type { TopData } from './topbench-data';

export function PromptOverview({ data, onOpen }: { data: TopData; onOpen: () => void }) {
  const cases = commonCases(data);
  const stats = summarize(data.runs, cases.map(c => c.task_id));
  const option: EChartsOption = {
    animationDuration: 240,
    textStyle: { fontFamily: 'DM Sans Variable, Microsoft YaHei, sans-serif', color: '#637381' },
    grid: { left: 52, right: 24, top: 55, bottom: 38 },
    legend: { top: 8, icon: 'roundRect', itemWidth: 10, itemHeight: 7, textStyle: { color: '#637381', fontSize: 12 } },
    tooltip: { trigger: 'axis', confine: true, renderMode: 'richText', valueFormatter: v => `${v}%` },
    xAxis: { type: 'category', data: stats.map(s => strategyInfo[s.strategy].short), axisTick: { show: false }, axisLine: { lineStyle: { color: '#DFE5EC' } } },
    yAxis: { type: 'value', min: 0, max: 100, name: '%', splitLine: { lineStyle: { type: 'dashed', color: '#EDF0F3' } } },
    series: [
      { type: 'bar', name: '完成率 CR（越高越好）', barMaxWidth: 26, itemStyle: { color: '#1877F2', borderRadius: [3, 3, 0, 0] }, data: stats.map(s => s.cr === null ? null : Number((s.cr * 100).toFixed(2))) },
      { type: 'bar', name: '泄漏率 LR（越低越好）', barMaxWidth: 26, itemStyle: { color: '#D69A3E', borderRadius: [3, 3, 0, 0] }, data: stats.map(s => s.lr === null ? null : Number((s.lr * 100).toFixed(2))) },
    ],
  };
  return <div className="prompt-overview-grid">
    <section className="dataset-card prompt-overview-card"><div className="dataset-card-heading"><div className="dataset-icon"><ShieldCheck size={21} /></div><div><h3>TOP-Bench v3</h3><span>提示词策略 · 任务完成与隐私泄漏</span></div><Button size="small" variant="outlined" onClick={onOpen}>进入分析</Button></div>
      <Chart option={option} label="TOP-Bench三种提示策略的完成率和泄漏率" height={290} />
      <div className="dataset-card-footer"><span>{cases.length} 道同题 · {data.runs.length} 组实验 · {data.requests.length} 次HTTP请求（含评分）</span><span className="complete-text">三策略配对完整</span></div>
    </section>
    <section className="panel prompt-overview-results"><div className="panel-heading"><div><h3>策略比较摘要</h3><p>固定 GPT 6.1 Sol · High · 同一{cases.length}道题</p></div></div>
      <table aria-label="TOP-Bench策略汇总"><thead><tr><th>策略</th><th>完成率 ↑</th><th>泄漏率 ↓</th><th>H ↑</th></tr></thead><tbody>{stats.map(s => <tr key={s.strategy}><th style={{ color: strategyInfo[s.strategy].color }}>{strategyInfo[s.strategy].short}</th><td>{pct(s.cr)}</td><td>{pct(s.lr)}</td><td>{s.h === null ? '—' : s.h.toFixed(3)}</td></tr>)}</tbody></table>
      <p>三种策略比较同题的完成度与披露风险。进入分析可查看结果矩阵、工具选择、时间线与配对结果路径。</p>
      <p className="prompt-overview-caveat">同模型独立盲化自动评分，尚需人工抽检；H由组级完成率和泄漏率计算。</p>
    </section>
  </div>;
}
