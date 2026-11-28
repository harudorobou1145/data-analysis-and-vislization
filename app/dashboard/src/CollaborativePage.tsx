import { useState } from 'react';
import { Alert, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Radio, UserRound, UsersRound } from 'lucide-react';
import type { Mode } from './data';
import results from './collaborative-results.json';

type Outcome = boolean | null;
type Scenario = { id: string; dimension: string; solo: Outcome; control: Outcome; test: Outcome; eligible: boolean };
type Config = keyof typeof results;
const depthConfigs = ['candidate_sol_low', 'candidate_sol_high', 'candidate_sol_ultra'] as const;
const modelConfigs = ['candidate_sol_high', 'candidate_luna_high', 'candidate_deepseek_high'] as const;
const conditions = [
  { label: '独做', Icon: UserRound, ink: '#385b79', tint: '#edf3f8' },
  { label: '正常协作', Icon: UsersRound, ink: '#28675f', tint: '#eaf4f1' },
  { label: '受扰协作', Icon: Radio, ink: '#805c34', tint: '#f8f1e7' },
];
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
  const common = new Set(results[configs[0]].filter(row => configs.every(key => results[key].some(other => other.id === row.id && paired(other)))).map(row => row.id));
  return <>
    <div className="page-heading"><div><div className="eyebrow">COLLABORATIVE INTELLIGENCE</div><h1>协作实验</h1><p>{mode === 'depth' ? '思考深度 · 固定 GPT 6.1 Sol' : '不同模型 · 固定 High 档'} ｜ collaborative10 · Seed 0</p></div></div>
    <Box component="ul" role="list" aria-label="实验条件" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 0.75, sm: 1.5 }, listStyle: 'none', m: 0, p: 0 }}>
      {conditions.map(({ label, Icon, ink, tint }) => (
        <Box component="li" key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: { xs: 0.65, sm: 1.25 }, minHeight: { xs: 46, sm: 56 }, px: { xs: 0.5, sm: 2 }, borderTop: '2px solid', borderColor: ink, color: ink, bgcolor: tint, fontSize: { xs: 12, sm: 14 }, fontWeight: 700 }}>
          <Icon size={17} strokeWidth={1.75} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{label}</span>
        </Box>
      ))}
    </Box>
    <Box component="section" className="glass-band" aria-labelledby="collaborative-compare" data-chart-section="collaborative-compare" tabIndex={-1} sx={{ my: 3 }}>
      <h2 id="collaborative-compare">同场景对比</h2>
      <p>三组共同满足独做门槛、且正常与受扰协作均有判定：{common.size}/{results[configs[0]].length} 个场景。以下按场景等权，不是官方榜单分数。</p>
      {common.size ? <Table size="small" aria-label="共同场景通过率">
        <TableHead><TableRow><TableCell>{mode === 'depth' ? '深度' : '模型'}</TableCell><TableCell align="right">正常协作</TableCell><TableCell align="right">受扰协作</TableCell><TableCell align="right">变化</TableCell></TableRow></TableHead>
        <TableBody>{configs.map(key => {
          const rows = results[key].filter(row => common.has(row.id));
          const control = rows.filter(row => row.control).length;
          const test = rows.filter(row => row.test).length;
          const change = (test - control) * 100 / rows.length;
          return <TableRow key={key} selected={key === config}><TableCell component="th" scope="row">{configLabel(key, mode)}</TableCell><TableCell align="right">{control}/{rows.length}</TableCell><TableCell align="right">{test}/{rows.length}</TableCell><TableCell align="right">{change > 0 ? '+' : ''}{change.toFixed(1)} pp</TableCell></TableRow>;
        })}</TableBody>
      </Table> : <Alert severity="info">没有可用于三组对比的共同场景。</Alert>}
    </Box>
    <h2 data-chart-section="collaborative-groups" tabIndex={-1}>分组详情</h2>
    <ToggleButtonGroup exclusive value={config} onChange={(_, next: Config | null) => next && setConfig(next)} size="small" aria-label="查看实验配置" sx={{ flexWrap: 'wrap', mb: 2 }}>
      {configs.map(key => <ToggleButton key={key} value={key}>{configLabel(key, mode)}</ToggleButton>)}
    </ToggleButtonGroup>
    <ConfigurationDetail key={config} scenarios={results[config]} />
    <p>来源：collaborative10 批次评分报告。只展示场景标识与评测判定。</p>
  </>;
}

function ConfigurationDetail({ scenarios }: { scenarios: Scenario[] }) {
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
    <div className="summary-strip">
      <div><span>覆盖场景</span><strong>{scenarios.length}</strong></div>
      <div><span>独做通过且三联完整</span><strong>{eligible}</strong></div>
      <div><span>正常协作通过</span><strong>{eligible ? `${passTotal('control')}/${eligible}` : '不适用'}</strong></div>
      <div><span>受扰协作通过</span><strong>{eligible ? `${passTotal('test')}/${eligible}` : '不适用'}</strong></div>
    </div>
    <Box component="section" className="glass-band" aria-labelledby="collaborative-flows" data-chart-section="collaborative-flows" tabIndex={-1} sx={{ my: 4 }}>
      <h2 id="collaborative-flows">同场景结果迁移</h2>
      <p>仅统计当前配置独做通过且三种条件均有判定的场景。带宽与场景数成正比，同一张图内可比较。</p>
      <Box component="svg" viewBox="0 0 480 228" sx={{ display: 'block', width: '100%', maxWidth: 720, mx: 'auto', fontSize: 15 }} role="img" aria-label="正常协作到受扰协作的结果迁移">
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
    </Box>
    <Box component="section" className="glass-band" aria-labelledby="collaborative-matrix" data-chart-section="collaborative-matrix" tabIndex={-1} sx={{ my: 4 }}>
      <h2 id="collaborative-matrix">场景指纹矩阵</h2>
      <p role="status">显示 {visible.length}/{scenarios.length} 个场景；未通过独做门槛而未运行的协作条件标为「未评测」。</p>
      <Table size="small" aria-label="场景在三个条件下的通过状态" sx={{ tableLayout: 'fixed', '& th, & td': { px: { xs: .75, sm: 2 } } }}>
        <TableHead><TableRow><TableCell sx={{ width: { xs: '43%', sm: '55%' } }}>场景 ID</TableCell><TableCell align="center">独做</TableCell><TableCell align="center">正常协作</TableCell><TableCell align="center">受扰协作</TableCell></TableRow></TableHead>
        <TableBody>{visible.map(({ id, solo, control, test, eligible: gated }) => <TableRow key={id} hover>
          <TableCell component="th" scope="row" sx={{ overflowWrap: 'anywhere' }}><code>{id}</code></TableCell>
          {[solo, control, test].map((value, index) => <TableCell key={index} align="center" sx={{ color: outcomeColor(value), fontWeight: 700, bgcolor: value === null ? '#f1f4f6' : value ? '#ecf7f2' : '#fff1ef' }}>{index > 0 && !gated && value === null ? '未评测' : outcomeLabel(value)}</TableCell>)}
        </TableRow>)}</TableBody>
      </Table>
    </Box>
  </>;
}