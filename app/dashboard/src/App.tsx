import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { EChartsOption } from 'echarts';
import { Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Drawer, FormControlLabel, IconButton, InputAdornment, ListItemButton, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BrainCircuit, ChartNoAxesCombined, ChevronRight, Database, FlaskConical, Layers3, Menu, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Chart } from './Chart';
import { downloadRows, format, groupKey, groupsFor, inMode, matchingTasks, mean, median, modelNames, taskMean } from './data';
import type { Data, Dataset, Group, Mode, Row } from './data';

const chartBase = {
  textStyle: { fontFamily: 'DM Sans Variable, Microsoft YaHei, sans-serif', color: '#637381' },
  tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
  grid: { left: 48, right: 24, top: 25, bottom: 48 },
} satisfies EChartsOption;
function scoreOption(rows: Row[], dataset: Dataset, mode: Mode, groups: Group[]): EChartsOption {
  return {
    ...chartBase,
    xAxis: { type: 'category', data: groups.map(group => group.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { interval: 0, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: dataset.max, splitLine: { lineStyle: { color: '#F0F2F5', type: 'dashed' } } },
    series: [{ type: 'bar', barWidth: 34, data: groups.map(group => ({
      value: taskMean(rows.filter(row => groupKey(row, mode) === group.key)),
      itemStyle: { color: group.color, borderRadius: [5, 5, 0, 0] },
    })), label: { show: true, position: 'top', color: '#1C252E', formatter: parameters => parameters.value == null ? '' : format(Number(parameters.value)) } }],
  };
}
function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function AppState() {
  const hash = new URLSearchParams(location.hash.slice(1));
  return { mode: (hash.get('mode') === 'models' ? 'models' : 'depth') as Mode, dataset: hash.get('dataset') ?? 'overview' };
}
export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(AppState);
  const [mobile, setMobile] = useState(false);
  const [scope, setScope] = useState('formal');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}analysis-data.json`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(setData).catch(reason => { if (reason.name !== 'AbortError') setError(String(reason)); });
    const listener = () => setRoute(AppState());
    addEventListener('hashchange', listener);
    return () => { abort.abort(); removeEventListener('hashchange', listener); };
  }, []);
  function navigate(mode: Mode, dataset = 'overview') {
    location.hash = new URLSearchParams({ mode, dataset }).toString();
    setRoute({ mode, dataset });
    setMobile(false);
    setSearch('');
  }
  if (error) return <div className="load-state"><Alert severity="error">数据加载失败：{error}</Alert><Button onClick={() => location.reload()}>重试</Button></div>;
  if (!data) return <div className="load-state"><CircularProgress /><p>加载实验指标…</p></div>;
  const { mode, dataset: datasetId } = route;
  const groups = groupsFor(mode);
  const dataset = data.datasets.find(item => item.id === datasetId);
  const modeRows = data.rows.filter(row => inMode(row, mode));
  const datasets = data.datasets.filter(item => (scope === 'all' || item.kind !== '预实验') && (item.name + item.kind).toLowerCase().includes(search.toLowerCase()));
  const sidebar = <>
    <a className="brand" href="#mode=depth&dataset=overview" aria-label="CodeDepth 首页"><div className="brand-mark"><Layers3 size={24} /></div><span>CodeDepth<span className="brand-dot">.</span></span></a>
    <div className="workspace-label"><Avatar sx={{ bgcolor: '#E8F2FE', color: '#1877F2', width: 34, height: 34 }}><FlaskConical size={18} /></Avatar><div><strong>AI 对话行为分析</strong><small>实验工作空间</small></div><span className="live-dot" /></div>
    <span className="nav-label">研究方向</span>
    <ListItemButton selected={mode === 'depth'} onClick={() => navigate('depth')} className="nav-item"><BrainCircuit size={20} /><span>思考深度</span><ChevronRight size={15} /></ListItemButton>
    <ListItemButton selected={mode === 'models'} onClick={() => navigate('models')} className="nav-item"><ChartNoAxesCombined size={20} /><span>不同模型</span><ChevronRight size={15} /></ListItemButton>
    <span className="nav-label dataset-label">数据集</span>
    <ListItemButton selected={datasetId === 'overview'} onClick={() => navigate(mode)} className="nav-item"><Activity size={18} /><span>比较总览</span></ListItemButton>
    {data.datasets.map(item => <ListItemButton key={item.id} selected={datasetId === item.id} onClick={() => navigate(mode, item.id)} className="nav-item dataset-nav"><span className={`dataset-dot ${item.kind === '预实验' ? 'pilot' : ''}`} /><span>{item.name}</span>{item.kind === '预实验' && <small>预实验</small>}</ListItemButton>)}
    <div className="sidebar-bottom"><div className="source-mark"><Database size={17} /> PROCESSED DATA</div><p>{data.rows.length.toLocaleString()} 条指标记录</p><small>正式首轮 / 预实验独立口径</small><a href="https://github.com/minimal-ui-kit/material-kit-react" target="_blank" rel="noreferrer">Material Kit React ↗</a></div>
  </>;
  return <div className="app-shell">
    <aside className="desktop-nav">{sidebar}</aside>
    <Drawer open={mobile} onClose={() => setMobile(false)} slotProps={{ paper: { sx: { width: 270, p: 2.5 } } }}><IconButton aria-label="关闭导航" onClick={() => setMobile(false)} sx={{ alignSelf: 'flex-end' }}><X size={20} /></IconButton>{sidebar}</Drawer>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><IconButton className="mobile-menu" aria-label="打开导航" onClick={() => setMobile(true)}><Menu size={22} /></IconButton><span>工作空间</span><ChevronRight size={14} /><strong>{mode === 'depth' ? '思考深度' : '不同模型'}</strong>{dataset && <><ChevronRight size={14} /><span className="breadcrumb-dataset">{dataset.name}</span></>}</div><div className="topbar-right"><span className="status-dot" />本地实验结果<Avatar sx={{ width: 32, height: 32, bgcolor: '#E8F5EE', color: '#118D57', fontSize: 12, fontWeight: 700 }}>CD</Avatar></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow">EXPERIMENT ANALYTICS</div><h1>{dataset?.name ?? (mode === 'depth' ? '思考深度分析' : '模型表现对比')}</h1><p>{mode === 'depth' ? 'GPT 6.1 Sol · Low / High / Ultra' : 'GPT 6.1 Sol / GPT 6 Luna / DeepSeek Flash · High'}</p></div><Button variant="outlined" startIcon={<ArrowDownToLine size={17} />} onClick={() => downloadRows(modeRows.filter(row => !dataset || row.dataset === dataset.id), dataset?.id ?? mode)}>导出数据</Button></div>
        <ToggleButtonGroup exclusive value={mode} onChange={(_, value: Mode | null) => value && navigate(value, datasetId)} className="direction-tabs" aria-label="研究方向"><ToggleButton value="depth"><BrainCircuit size={18} />思考深度</ToggleButton><ToggleButton value="models"><ChartNoAxesCombined size={18} />不同模型</ToggleButton></ToggleButtonGroup>
        {dataset ? <Detail key={`${mode}-${dataset.id}`} dataset={dataset} data={data} mode={mode} groups={groups} onBack={() => navigate(mode)} /> : <>
          <div className="summary-strip"><div><span>数据集</span><strong>{data.datasets.filter(item => item.kind !== '预实验').length}<small>正式</small><i>+ 2 预实验</i></strong></div><div><span>当前方向</span><strong>{modeRows.length.toLocaleString()}<small>条请求</small></strong></div><div><span>实验条件</span><strong>3<small>{mode === 'depth' ? '个深度档位' : '个模型 · High'}</small></strong></div><div><span>评分口径</span><strong className="text-stat">按题等权<small>缺失不计零分</small></strong></div></div>
          <div className="section-toolbar"><div><h2>数据集表现</h2><p>独立评分尺度 · 同题重复先取均值</p></div><div className="toolbar-controls"><TextField size="small" placeholder="查找数据集" aria-label="查找数据集" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }} /><Select size="small" value={scope} onChange={event => setScope(event.target.value)} inputProps={{ 'aria-label': '实验范围' }}><MenuItem value="formal">正式实验</MenuItem><MenuItem value="all">包含预实验</MenuItem></Select></div></div>
          <div className="dataset-grid">{datasets.map(item => {
            const rows = modeRows.filter(row => row.dataset === item.id);
            const missing = groups.filter(group => !rows.some(row => groupKey(row, mode) === group.key));
            return <section className="dataset-card" key={item.id}><div className="dataset-card-heading"><div className="dataset-icon"><Database size={20} /></div><div><h3>{item.name}</h3><span>{item.kind} · {item.metric}{item.max === 100 ? ' (%)' : ' / 10'}</span></div><Tooltip title={`查看 ${item.name}`}><IconButton aria-label={`查看 ${item.name}`} onClick={() => navigate(mode, item.id)}><ArrowRight size={19} /></IconButton></Tooltip></div><Chart option={scoreOption(rows, item, mode, groups)} label={`${item.name}评分比较`} height={218} /><div className="dataset-card-footer"><span>{rows.filter(row => row.score !== null).length} 条有效评分 · {new Set(rows.map(row => row.task)).size} 道题</span><span className={missing.length ? 'missing-text' : 'complete-text'}>{missing.length ? `缺测 ${missing.map(group => group.label).join(' / ')}` : '条件齐全'}</span></div></section>;
          })}</div>
          {!datasets.length && <Alert severity="info">没有匹配的数据集。</Alert>}
          <div className="method-note"><FlaskConical size={19} /><div><strong>分析口径</strong><p>正式主图排除历史、补跑、修复及辅助运行。不同数据集不汇总为单一能力分；代码与交互任务的 max 档位不替代 Ultra。</p></div></div>
        </>}
        <footer><span>CodeDepth · AI 对话行为分析</span><span>Material Kit React / Minimal UI</span></footer>
      </main>
    </div>
  </div>;
}

function Detail({ dataset, data, mode, groups, onBack }: { dataset: Dataset; data: Data; mode: Mode; groups: Group[]; onBack: () => void }) {
  const [type, setType] = useState('all');
  const [paired, setPaired] = useState(() => data.rows.some(row => row.dataset === dataset.id && inMode(row, mode) && row.score !== null));
  const [token, setToken] = useState<'total' | 'output' | 'reasoning'>('reasoning');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Row | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const all = data.rows.filter(row => row.dataset === dataset.id && inMode(row, mode));
  const typed = all.filter(row => type === 'all' || row.type === type);
  const pairedRows = paired ? matchingTasks(typed, mode, groups) : typed;
  const rows = pairedRows.filter(row => !hidden.includes(groupKey(row, mode)));
  const missing = groups.filter(group => !all.some(row => groupKey(row, mode) === group.key));
  const types = [...new Set(all.map(row => row.type))].sort();
  const valid = rows.filter(row => row.score !== null);
  const tableRows = rows.filter(row => `${row.task} ${row.id} ${row.type} ${row.model} ${row.effort}`.toLowerCase().includes(query.toLowerCase()));
  const line: EChartsOption = {
    ...chartBase, grid: { left: 48, right: 24, top: 28, bottom: 68 },
    tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
    xAxis: { type: 'value', name: '请求（样本顺序）', nameLocation: 'middle', nameGap: 32, min: 1, minInterval: 1 },
    yAxis: { type: 'value', name: dataset.metric, min: 0, max: dataset.max },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 4 }],
    series: groups.filter(group => !hidden.includes(group.key)).map(group => {
      const seriesRows = rows.filter(row => groupKey(row, mode) === group.key).sort((left, right) => left.task.localeCompare(right.task, undefined, { numeric: true }) || left.id.localeCompare(right.id));
      return { name: group.label, type: 'line', showSymbol: seriesRows.length < 50, symbolSize: 5, connectNulls: false, lineStyle: { width: 1.8 }, itemStyle: { color: group.color }, data: seriesRows.map((row, index) => [index + 1, row.score]) };
    }),
  };
  function scatter(axis: 'seconds' | 'total' | 'output' | 'reasoning', label: string): EChartsOption {
    return {
      ...chartBase, tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: parameters => {
        const item = Array.isArray(parameters) ? parameters[0] : parameters;
        const values = item.value as [number, number, string];
        return `${item.seriesName}\n${values[2]}\n${label}: ${format(values[0])}\n${dataset.metric}: ${format(values[1])}`;
      } },
      xAxis: { type: 'value', name: label, nameLocation: 'middle', nameGap: 30, splitLine: { show: false }, axisLabel: { formatter: value => value >= 1000 ? `${format(value / 1000, 1)}k` : String(value) } },
      yAxis: { type: 'value', min: 0, max: dataset.max, splitLine: { lineStyle: { type: 'dashed', color: '#EDEFF2' } } },
      series: groups.filter(group => !hidden.includes(group.key)).map(group => ({ name: group.label, type: 'scatter', symbolSize: 7, itemStyle: { color: group.color, opacity: 0.65 }, data: valid.filter(row => groupKey(row, mode) === group.key && row[axis] !== null).map(row => [row[axis], row.score, row.task]) })),
    };
  }
  const reset = () => { setType('all'); setPaired(true); setHidden([]); setQuery(''); setPage(0); setToken('reasoning'); };
  return <>
    <div className="detail-controls"><Button startIcon={<ArrowLeft size={16} />} onClick={onBack}>比较总览</Button><div className="toolbar-controls"><SlidersHorizontal size={17} /><Select value={type} size="small" onChange={event => { setType(event.target.value); setPage(0); }} inputProps={{ 'aria-label': '任务类型' }}><MenuItem value="all">全部任务类型</MenuItem>{types.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select><FormControlLabel control={<Checkbox size="small" checked={paired} onChange={event => { setPaired(event.target.checked); setPage(0); }} />} label="共同题目" /><Tooltip title="重置筛选"><IconButton aria-label="重置筛选" onClick={reset}><RotateCcw size={17} /></IconButton></Tooltip></div></div>
    <Alert severity={dataset.kind === '预实验' || missing.length ? 'warning' : 'info'} icon={<FlaskConical size={20} />} sx={{ mb: 3 }}>{dataset.note}{missing.length > 0 && ` 当前方向缺测：${missing.map(group => group.label).join('、')}。`}</Alert>
    <div className="summary-strip detail-summary"><div><span>有效评分 / 请求</span><strong>{valid.length}<small>/ {rows.length}</small></strong></div><div><span>共同题目 / 题目总数</span><strong>{new Set(pairedRows.map(row => row.task)).size}<small>/ {new Set(typed.map(row => row.task)).size}</small></strong></div><div><span>响应耗时中位数</span><strong>{format(median(rows.map(row => row.seconds)), 1)}<small>秒</small></strong></div><div><span>平均总 Token</span><strong>{format(mean(rows.map(row => row.total)), 0)}<small>tokens</small></strong></div></div>
    <div className="legend">{groups.map(group => <button key={group.key} aria-pressed={!hidden.includes(group.key)} className={hidden.includes(group.key) ? 'legend-off' : ''} onClick={() => { setHidden(hidden.includes(group.key) ? hidden.filter(key => key !== group.key) : [...hidden, group.key]); setPage(0); }}><span style={{ background: group.color }} />{group.label}<small>{pairedRows.filter(row => groupKey(row, mode) === group.key).length} 条</small></button>)}</div>
    {!rows.length && <Alert severity="info" sx={{ mb: 2 }}>当前筛选没有可比较记录。可调整任务类型、共同题目或图例条件。</Alert>}
    <div className="detail-chart-grid"><Panel title={`${dataset.metric}比较`} subtitle={`${dataset.max === 100 ? '0–100%' : '0–10 分'} · 按题等权平均，重复运行先按题取均值`}><Chart option={scoreOption(rows, dataset, mode, groups)} label="平均评分比较" /></Panel><Panel title="逐请求评分" subtitle="按任务编号、运行编号排序；横向序号不代表时间或训练进步"><Chart option={line} label="逐请求评分折线图" /></Panel><Panel title="评分与响应耗时" subtitle={`${valid.filter(row => row.seconds !== null).length} 个有效观测 · 单位：秒`}><Chart option={scatter('seconds', '响应耗时（秒）')} label="评分与耗时散点图" /></Panel><Panel title="评分与 Token 消耗" subtitle={`${valid.filter(row => row[token] !== null).length} 个有效观测 · 输出 Token 已包含推理 Token`} action={<Select size="small" value={token} onChange={event => setToken(event.target.value as typeof token)} inputProps={{ 'aria-label': 'Token 口径' }}><MenuItem value="reasoning">推理 Token</MenuItem><MenuItem value="output">输出 Token</MenuItem><MenuItem value="total">总 Token</MenuItem></Select>}><Chart option={scatter(token, `${token === 'total' ? '总' : token === 'output' ? '输出' : '推理'} Token`)} label="评分与Token散点图" /></Panel></div>
    <Panel title="条件统计" subtitle="空值不参与均值；请求数包含未评分记录。">
      <TableContainer><Table size="small"><TableHead><TableRow>{['实验条件', '请求', '已评分', '题目', dataset.metric, '耗时中位数 (s)', '平均总 Token', '平均推理 Token'].map(item => <TableCell key={item}>{item}</TableCell>)}</TableRow></TableHead><TableBody>{groups.map(group => { const subset = rows.filter(row => groupKey(row, mode) === group.key); return <TableRow key={group.key}><TableCell><span className="table-condition"><i style={{ background: group.color }} />{group.label}</span></TableCell><TableCell>{subset.length}</TableCell><TableCell>{subset.filter(row => row.score !== null).length}</TableCell><TableCell>{new Set(subset.map(row => row.task)).size}</TableCell><TableCell>{format(taskMean(subset))}{dataset.max === 100 && subset.some(row => row.score !== null) ? '%' : ''}</TableCell><TableCell>{format(median(subset.map(row => row.seconds)))}</TableCell><TableCell>{format(mean(subset.map(row => row.total)), 0)}</TableCell><TableCell>{format(mean(subset.map(row => row.reasoning)), 0)}</TableCell></TableRow>; })}</TableBody></Table></TableContainer>
    </Panel>
    <Panel title="请求明细" subtitle="点击记录查看完整指标" action={<div className="toolbar-controls"><TextField size="small" placeholder="搜索任务 / 条件" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }} /><Tooltip title="导出当前筛选"><IconButton aria-label="导出当前筛选" onClick={() => downloadRows(tableRows, `${dataset.id}-${mode}-filtered`)}><ArrowDownToLine size={18} /></IconButton></Tooltip></div>}>
      <TableContainer><Table size="small"><TableHead><TableRow>{['任务', '条件', '类型', '评分', '耗时 (s)', '总 Token', '状态', ''].map((item, index) => <TableCell key={index}>{item}</TableCell>)}</TableRow></TableHead><TableBody>{tableRows.slice(page * perPage, (page + 1) * perPage).map(row => <TableRow key={row.id} hover onClick={() => setSelected(row)} sx={{ cursor: 'pointer' }}><TableCell>{row.task}</TableCell><TableCell>{mode === 'depth' ? row.effort : modelNames[row.model]}</TableCell><TableCell>{row.type}</TableCell><TableCell sx={{ fontWeight: 700 }}>{format(row.score)}</TableCell><TableCell>{format(row.seconds, 1)}</TableCell><TableCell>{format(row.total, 0)}</TableCell><TableCell><Chip size="small" color={row.status === 'completed' ? 'success' : 'default'} variant="outlined" label={row.status} /></TableCell><TableCell><IconButton aria-label={`查看请求 ${row.id}`} onClick={event => { event.stopPropagation(); setSelected(row); }}><ChevronRight size={16} /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>
      <TablePagination component="div" count={tableRows.length} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={perPage} rowsPerPageOptions={[10, 25, 50]} onRowsPerPageChange={event => { setPerPage(Number(event.target.value)); setPage(0); }} labelRowsPerPage="每页" labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`} />
    </Panel>
    <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, p: 3 } } }}>{selected && <><div className="drawer-title"><h2>请求指标</h2><IconButton aria-label="关闭请求详情" onClick={() => setSelected(null)}><X size={20} /></IconButton></div><p className="record-id">{selected.id}</p><dl className="record-detail">{Object.entries({ 数据集: dataset.name, 模型: modelNames[selected.model], 思考深度: selected.effort, 任务: selected.task, 类型: selected.type, 阶段: selected.phase, 状态: selected.status, [dataset.metric]: format(selected.score), '耗时（秒）': format(selected.seconds), '输入 Token': format(selected.input, 0), '输出 Token': format(selected.output, 0), '推理 Token': format(selected.reasoning, 0), '总 Token': format(selected.total, 0), 时间: selected.timestamp ?? '未提供时间戳' }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></>}</Drawer>
    <div className="method-note"><FlaskConical size={19} /><p>散点仅表示观测关联，不代表因果关系。共同题目取当前有数据条件的已评分题目交集，未出现的条件仍显示缺测；主观分、准则分和成功率不可跨数据集直接比较。</p></div>
  </>;
}