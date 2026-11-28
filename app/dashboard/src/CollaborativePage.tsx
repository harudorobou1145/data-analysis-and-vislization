import { useState } from 'react';
import { Alert, Box, Button, ListItemButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BarChart3, Grid2X2, Shuffle, Table2 } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { Chart } from './Chart';
import { ContextSection } from './ContextSection';
import type { Mode } from './data';
import results from './collaborative-results.json';

type Outcome = boolean | null;
type Scenario = { id: string; dimension: string; solo: Outcome; control: Outcome; test: Outcome; eligible: boolean };
type View = 'overview' | 'compare' | 'flows' | 'matrix';
const chartViews = [
  { id: 'overview', title: '总览', icon: Grid2X2 },
  { id: 'compare', title: '同场景对比', icon: BarChart3 },
  { id: 'flows', title: '同场景结果迁移', icon: Shuffle },
  { id: 'matrix', title: '场景指纹矩阵', icon: Table2 },
] as const;

type Config = keyof typeof results;
const depthConfigs = ['candidate_sol_low', 'candidate_sol_high', 'candidate_sol_ultra'] as const;
const modelConfigs = ['candidate_sol_high', 'candidate_luna_high', 'candidate_deepseek_high'] as const;
const comparisonConditions = [
  { key: 'control', label: '正常协作', color: '#1877F2' },
  { key: 'test', label: '受扰协作', color: '#D47716' },
] as const;
const labels: Record<Config, string> = {
  candidate_sol_low: 'Low', candidate_sol_high: 'High', candidate_sol_ultra: 'Ultra',
  candidate_luna_high: 'GPT 6 Luna', candidate_deepseek_high: 'DeepSeek Flash',
};
const configLabel = (config: Config, mode: Mode) => mode === 'models' && config === 'candidate_sol_high' ? 'GPT 6.1 Sol' : labels[config];
const paired = (row: Scenario) => row.eligible && row.control !== null && row.test !== null;
const outcomeLabel = (value: Outcome) => value === null ? '缺测' : value ? '通过' : '失败';
const outcomeColor = (value: Outcome) => value === null ? '#526475' : value ? '#087556' : '#a43835';
const flowTypes = [
  { control: true, test: true, color: '#13836a' },
  { control: true, test: false, color: '#c65347' },
  { control: false, test: true, color: '#236dad' },
  { control: false, test: false, color: '#94531e' },
];

export function CollaborativePage({ mode }: { mode: Mode }) {
  const configs = mode === 'depth' ? depthConfigs : modelConfigs;
  const [config, setConfig] = useState<Config>(configs[0]);
  const [view, setView] = useState<View>('overview');
  const common = new Set(results[configs[0]].filter(row => configs.every(key => results[key].some(other => other.id === row.id && paired(other)))).map(row => row.id));
  const scenarios = results[config];
  const pairs = scenarios.filter(paired);
  const comparison = configs.map(key => {
    const rows = results[key].filter(row => common.has(row.id));
    return {
      label: configLabel(key, mode),
      control: rows.filter(row => row.control).length,
      test: rows.filter(row => row.test).length,
    };
  });
  const comparisonOption: EChartsOption = {
    animationDuration: 240,
    textStyle: { fontFamily: 'DM Sans Variable, Microsoft YaHei, sans-serif', color: '#637381', fontSize: 12 },
    grid: { left: 44, right: 18, top: 36, bottom: 54 },
    tooltip: {
      trigger: 'axis', confine: true, renderMode: 'richText',
      formatter: params => {
        const item = comparison[(Array.isArray(params) ? params[0] : params).dataIndex];
        const change = (item.test - item.control) * 100 / common.size;
        return [
          item.label,
          ...comparisonConditions.map(condition =>
            `${condition.label}：${item[condition.key]}/${common.size}（${(item[condition.key] * 100 / common.size).toFixed(1)}%）`),
          `通过率变化：${change > 0 ? '+' : ''}${change.toFixed(1)} 个百分点`,
        ].join('\n');
      },
    },
    xAxis: {
      type: 'category', data: comparison.map(item => item.label.replace(/ (Sol|Luna|Flash)$/, '\n$1')),
      axisTick: { show: false }, axisLine: { lineStyle: { color: '#DFE5EC' } },
      axisLabel: { interval: 0, fontSize: 11, lineHeight: 15 },
    },
    yAxis: {
      type: 'value', min: 0, max: 100, interval: 25, name: '通过率（%）', nameGap: 18,
      splitLine: { lineStyle: { type: 'dashed', color: '#E8EDF2' } },
    },
    series: comparisonConditions.map(condition => ({
      type: 'bar', name: condition.label, barMaxWidth: 32,
      itemStyle: { color: condition.color, borderRadius: [4, 4, 0, 0] },
      data: comparison.map(item => common.size ? item[condition.key] * 100 / common.size : null),
      label: {
        show: true, position: 'top', color: '#1c252e', fontSize: 12,
        formatter: params => `${comparison[params.dataIndex][condition.key]}/${common.size}`,
      },
    })),
  };
  return <div className="information-page collaborative-page">
    <div className="page-heading"><div><div className="eyebrow">COLLABORATIVE INTELLIGENCE</div><h1>协作实验</h1><p>{mode === 'depth' ? '思考深度 · 固定 GPT 6.1 Sol' : '不同模型 · 固定 High 档'} ｜ collaborative10 · Seed 0</p></div></div>
    <div data-chart-section="collaborative-context" tabIndex={-1}>
      <ContextSection title="实验内容说明">
        <p>在 collaborative10 的 10 个场景中，先通过独做评测检查模型的任务能力，再比较正常协作与受扰协作条件下的通过情况，观察干扰带来的表现变化。</p>
        <p>同场景对比使用三组均通过独做门槛、且协作判定完整的共同场景。数据概览与下方详情使用当前配置的有效场景；未运行或缺少判定的结果保留为未评测或缺测。</p>
      </ContextSection>
    </div>
    <div className="detail-controls" aria-label="协作实验配置">
      <div className="toolbar-controls">
        <span className="chart-filter-label">当前配置</span>
        <ToggleButtonGroup className="chart-view-toggle" exclusive value={config}
          onChange={(_, next: Config | null) => { if (next) setConfig(next); }} size="small" aria-label="查看实验配置" sx={{ flexWrap: 'wrap' }}>
          {configs.map(key => <ToggleButton key={key} value={key}>{configLabel(key, mode)}</ToggleButton>)}
        </ToggleButtonGroup>
      </div>
    </div>
    <div className="summary-strip detail-summary" data-chart-section="collaborative-summary" tabIndex={-1} aria-label="当前配置数据概览">
      <div><span>覆盖场景</span><strong>{scenarios.length}</strong></div>
      <div><span>当前配置有效场景</span><strong>{pairs.length}</strong></div>
      <div><span>正常协作通过</span><strong>{pairs.length ? `${pairs.filter(row => row.control).length}/${pairs.length}` : '不适用'}</strong></div>
      <div><span>受扰协作通过</span><strong>{pairs.length ? `${pairs.filter(row => row.test).length}/${pairs.length}` : '不适用'}</strong></div>
    </div>
    <div className="chart-workspace">
      <nav className="chart-navigation" aria-label="图表视图">
        <h2>图表视图</h2>
        {chartViews.map(({ id, title, icon: Icon }) => (
          <ListItemButton key={id} component="button" type="button" className="chart-nav-item"
            selected={view === id} aria-pressed={view === id} onClick={() => setView(id)}>
            <Icon size={17} aria-hidden="true" />
            <span>{title}</span>
          </ListItemButton>
        ))}
      </nav>
      <div className="chart-results">
    {(view === 'overview' || view === 'compare') && <Box component="section" className="glass-band" aria-labelledby="collaborative-compare" data-chart-section="collaborative-compare" tabIndex={-1}>
      <h2 id="collaborative-compare">同场景对比</h2>
      <p>三组共同满足独做门槛、且正常与受扰协作均有判定：{common.size}/{results[configs[0]].length} 个场景。以下按场景等权，不是官方榜单分数。</p>
      <ul className="chart-legend" aria-label="同场景对比图例" style={{ padding: 0 }}>
        {comparisonConditions.map(condition => (
          <li key={condition.key}><span className="legend-mark bar" style={{ backgroundColor: condition.color }} aria-hidden="true" />{condition.label}</li>
        ))}
      </ul>
      {common.size ? <>
        <Chart option={comparisonOption} label="正常协作与受扰协作的共同场景通过率" height={310} />
        <div className="chart-analysis" style={{ margin: '16px 0 0' }}>
          <h4>图表分析</h4>
          <p>{comparison.map(item => {
            const change = (item.test - item.control) * 100 / common.size;
            return `${item.label}：正常协作 ${item.control}/${common.size}，受扰协作 ${item.test}/${common.size}，通过率变化 ${change > 0 ? '+' : ''}${change.toFixed(1)} 个百分点`;
          }).join('；')}。</p>
        </div>
      </> : <Alert severity="info">没有可用于三组对比的共同场景。</Alert>}
    </Box>}
    <ConfigurationDetail key={config} scenarios={results[config]} view={view} />
      </div>
    </div>
    <p className="collaborative-source">来源：collaborative10 批次评分报告。只展示场景标识与评测判定。</p>
  </div>;
}

function ConfigurationDetail({ scenarios, view }: { scenarios: Scenario[]; view: View }) {
  const [selected, setSelected] = useState<number | null>(null);
  const pairs = scenarios.filter(paired);
  const transitions = flowTypes.map(flow => ({ ...flow, count: pairs.filter(({ control, test }) => control === flow.control && test === flow.test).length }));
  const eligible = pairs.length;
  const unit = 144 / Math.max(eligible, 1);
  const passTotal = (side: 'control' | 'test') => pairs.filter(row => row[side]).length;
  const filter = selected === null ? null : transitions[selected];
  const visible = filter ? pairs.filter(({ control, test }) => control === filter.control && test === filter.test) : scenarios;
  const offset = (side: 'control' | 'test', index: number) => {
    const value = transitions[index][side];
    const previous = transitions.slice(0, index).reduce((sum, flow) => sum + (flow[side] === value ? flow.count : 0), 0);
    return 45 + previous * unit + (value ? 0 : passTotal(side) * unit + 20);
  };
  const toggle = (index: number) => setSelected(current => current === index ? null : index);

  return <>
    {(view === 'overview' || view === 'flows') && <Box component="section" className="glass-band" aria-labelledby="collaborative-flows" data-chart-section="collaborative-flows" tabIndex={-1}>
      <h2 id="collaborative-flows">同场景结果迁移</h2>
      <p>仅统计当前配置独做通过且三种条件均有判定的场景。带宽与场景数成正比，同一张图内可比较。</p>
      <Box component="svg" viewBox="0 0 480 228" sx={{ display: 'block', width: '100%', maxWidth: 720, mx: 'auto', fontSize: 11 }} role="img" aria-label="正常协作到受扰协作的结果迁移">
        <text x="15" y="23" fill="currentColor">正常协作</text>
        <text x="465" y="23" textAnchor="end" fill="currentColor">受扰协作</text>
        {transitions.map(({ control, test, count, color }, index) => {
          if (!count) return null;
          const left = offset('control', index);
          const right = offset('test', index);
          const width = count * unit;
          return <path key={index} d={`M104 ${left} C190 ${left} 290 ${right} 376 ${right} v${width} C290 ${right + width} 190 ${left + width} 104 ${left + width} Z`}
            fill={color} fillOpacity={selected === null || selected === index ? .72 : .15} stroke={selected === index ? color : 'none'} style={{ cursor: 'pointer' }} onClick={() => toggle(index)}>
            <title>{`${outcomeLabel(control)} → ${outcomeLabel(test)}：${count} 个场景`}</title>
          </path>;
        })}
        {(['control', 'test'] as const).map(side => [true, false].map(value => {
          const left = side === 'control';
          const passes = passTotal(side);
          const count = value ? passes : eligible - passes;
          const top = 45 + (value ? 0 : passes * unit + 20);
          return <g key={`${side}:${value}`} fill={outcomeColor(value)}><rect x={left ? 98 : 376} y={top} width="6" height={count * unit} rx="2" /><text x={left ? 92 : 388} y={top + count * unit / 2} dominantBaseline="middle" textAnchor={left ? 'end' : 'start'}>{outcomeLabel(value)} {count}</text></g>;
        }))}
      </Box>
      <Box role="group" aria-label="按迁移结果筛选场景" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant={selected === null ? 'contained' : 'outlined'} aria-pressed={selected === null} onClick={() => setSelected(null)}>全部场景</Button>
        {transitions.map(({ control, test, count, color }, index) => <Button key={index} size="small" variant={selected === index ? 'contained' : 'outlined'} aria-pressed={selected === index} disabled={!count} onClick={() => toggle(index)} startIcon={<Box component="span" sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: selected === index ? 'currentColor' : color }} />}>
          {outcomeLabel(control)} → {outcomeLabel(test)} · {count}
        </Button>)}
      </Box>
    </Box>}
    {(view === 'overview' || view === 'matrix') && <Box component="section" className="glass-band" aria-labelledby="collaborative-matrix" data-chart-section="collaborative-matrix" tabIndex={-1}>
      <h2 id="collaborative-matrix">场景指纹矩阵</h2>
      <p role="status">显示 {visible.length}/{scenarios.length} 个场景；未通过独做门槛而未运行的协作条件标为「未评测」。</p>
      <TableContainer><Table size="small" aria-label="场景在三个条件下的通过状态" sx={{ tableLayout: 'fixed', '& th, & td': { px: { xs: .75, sm: 2 } } }}>
        <TableHead><TableRow><TableCell sx={{ width: { xs: '43%', sm: '55%' } }}>场景 ID</TableCell><TableCell align="center">独做</TableCell><TableCell align="center">正常协作</TableCell><TableCell align="center">受扰协作</TableCell></TableRow></TableHead>
        <TableBody>{visible.map(({ id, solo, control, test, eligible: gated }) => <TableRow key={id} hover>
          <TableCell component="th" scope="row" sx={{ overflowWrap: 'anywhere' }}><code>{id}</code></TableCell>
          {[solo, control, test].map((value, index) => <TableCell key={index} align="center" sx={{ color: outcomeColor(value), fontWeight: 700, bgcolor: value === null ? '#f1f4f6' : value ? '#ecf7f2' : '#fff1ef' }}>{index > 0 && !gated && value === null ? '未评测' : outcomeLabel(value)}</TableCell>)}
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Box>}
  </>;
}