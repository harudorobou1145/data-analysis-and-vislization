import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Collapse, Drawer, FormControlLabel, IconButton, InputAdornment, ListItemButton, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BrainCircuit, ChartNoAxesCombined, ChevronRight, Database, FlaskConical, Layers3, Menu, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Chart } from './Chart';
import { DetailCharts, scoreOption } from './DetailCharts';
import type { TokenMetric } from './DetailCharts';
import { downloadRows, format, groupKey, groupsFor, inMode, matchingTasks, mean, median, modelNames, taskMean } from './data';
import type { Data, Dataset, Group, Mode, Row } from './data';

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function AppState() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const dataset = hash.get('dataset') ?? 'overview';
  return { mode: (hash.get('mode') === 'models' ? 'models' : 'depth') as Mode, dataset: ['gsm8k', 'mt_bench'].includes(dataset) ? 'overview' : dataset };
}
export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(AppState);
  const [mobile, setMobile] = useState(false);
  const [expandedModes, setExpandedModes] = useState<Mode[]>(() => route.dataset === 'overview' ? [] : [route.mode]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}analysis-data.json`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(setData).catch(reason => { if (reason.name !== 'AbortError') setError(String(reason)); });
    const listener = () => {
      const next = AppState();
      setRoute(next);
      if (next.dataset !== 'overview') {
        setExpandedModes(current => current.includes(next.mode) ? current : [...current, next.mode]);
      }
    };
    addEventListener('hashchange', listener);
    return () => { abort.abort(); removeEventListener('hashchange', listener); };
  }, []);
  function navigate(mode: Mode, dataset = 'overview') {
    location.hash = new URLSearchParams({ mode, dataset }).toString();
    setMobile(false);
    setSearch('');
  }
  if (error) return <div className="load-state"><Alert severity="error">数据加载失败：{error}</Alert><Button onClick={() => location.reload()}>重试</Button></div>;
  if (!data) return <div className="load-state"><CircularProgress /><p>加载实验指标…</p></div>;
  const { mode, dataset: datasetId } = route;
  const groups = groupsFor(mode);
  const formalDatasets = data.datasets.filter(item => item.kind !== '预实验');
  const dataset = formalDatasets.find(item => item.id === datasetId);
  const modeRows = data.rows.filter(row => inMode(row, mode) && formalDatasets.some(item => item.id === row.dataset));
  const datasets = formalDatasets.filter(item => (item.name + item.kind).toLowerCase().includes(search.toLowerCase()));
  const sidebar = <>
    <a className="brand" href="#mode=depth&dataset=overview" aria-label="CodeDepth 首页"><div className="brand-mark"><Layers3 size={24} /></div><span>CodeDepth<span className="brand-dot">.</span></span></a>
    <ListItemButton selected={!dataset} onClick={() => navigate(mode)} className="nav-item"><Activity size={20} /><span>比较总览</span></ListItemButton>
    <span className="nav-label research-label">研究方向</span>
    {(['depth', 'models'] as const).map(direction => {
      const expanded = expandedModes.includes(direction);
      const label = direction === 'depth' ? '思考深度' : '不同模型';
      const toggleExpanded = () => {
        setExpandedModes(current => current.includes(direction)
          ? current.filter(mode => mode !== direction)
          : [...current, direction]);
      };
      return <div key={direction}>
        <ListItemButton selected={!!dataset && mode === direction} onClick={toggleExpanded} className="nav-item" aria-expanded={expanded} aria-controls={`datasets-${direction}`}>
          {direction === 'depth' ? <BrainCircuit size={20} /> : <ChartNoAxesCombined size={20} />}<span>{label}</span><ChevronRight size={15} className={`nav-chevron ${expanded ? 'expanded' : ''}`} />
        </ListItemButton>
        <Collapse in={expanded} unmountOnExit>
          <div id={`datasets-${direction}`} className="dataset-submenu" role="group" aria-label={`${label}数据集`}>
            {formalDatasets.map(item => <ListItemButton key={item.id} selected={mode === direction && dataset?.id === item.id} onClick={() => navigate(direction, item.id)} className="nav-item dataset-nav"><span className="dataset-dot" /><span>{item.name}</span></ListItemButton>)}
          </div>
        </Collapse>
      </div>;
    })}
    <div className="sidebar-bottom"><div className="source-mark"><Database size={17} /> PROCESSED DATA</div><p>{data.rows.filter(row => formalDatasets.some(item => item.id === row.dataset)).length.toLocaleString()} 条指标记录</p><small>正式首轮实验指标</small><a href="https://github.com/minimal-ui-kit/material-kit-react" target="_blank" rel="noreferrer">Material Kit React ↗</a></div>
  </>;
  return <div className="app-shell">
    <aside className="desktop-nav">{sidebar}</aside>
    <Drawer open={mobile} onClose={() => setMobile(false)} slotProps={{ paper: { sx: { width: 270, p: 2.5 } } }}><IconButton aria-label="关闭导航" onClick={() => setMobile(false)} sx={{ alignSelf: 'flex-end' }}><X size={20} /></IconButton>{sidebar}</Drawer>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><IconButton className="mobile-menu" aria-label="打开导航" onClick={() => setMobile(true)}><Menu size={22} /></IconButton><span>工作空间</span><ChevronRight size={14} /><strong>{dataset ? (mode === 'depth' ? '思考深度' : '不同模型') : '比较总览'}</strong>{dataset && <><ChevronRight size={14} /><span className="breadcrumb-dataset">{dataset.name}</span></>}</div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow">EXPERIMENT ANALYTICS</div><h1>{dataset?.name ?? '比较总览'}</h1><p>{mode === 'depth' ? 'GPT 6.1 Sol · Low / High / Ultra' : 'GPT 6.1 Sol / GPT 6 Luna / DeepSeek Flash · High'}</p></div><Button variant="outlined" startIcon={<ArrowDownToLine size={17} />} onClick={() => downloadRows(modeRows.filter(row => !dataset || row.dataset === dataset.id), dataset?.id ?? mode)}>导出数据</Button></div>
        {!dataset && <ToggleButtonGroup exclusive value={mode} onChange={(_, value: Mode | null) => value && navigate(value, datasetId)} className="direction-tabs" aria-label="研究方向"><ToggleButton value="depth"><BrainCircuit size={18} />思考深度</ToggleButton><ToggleButton value="models"><ChartNoAxesCombined size={18} />不同模型</ToggleButton></ToggleButtonGroup>}
        {dataset ? <Detail key={`${mode}-${dataset.id}`} dataset={dataset} data={data} mode={mode} groups={groups} onBack={() => navigate(mode)} /> : <>
          <div className="summary-strip"><div><span>数据集</span><strong>{formalDatasets.length}<small>正式</small></strong></div><div><span>当前方向</span><strong>{modeRows.length.toLocaleString()}<small>条请求</small></strong></div><div><span>实验条件</span><strong>3<small>{mode === 'depth' ? '个深度档位' : '个模型 · High'}</small></strong></div><div><span>评分口径</span><strong className="text-stat">按题等权<small>缺失不计零分</small></strong></div></div>
          <div className="section-toolbar"><div><h2>数据集表现</h2><p>独立评分尺度 · 同题重复先取均值</p></div><div className="toolbar-controls"><TextField size="small" placeholder="查找数据集" aria-label="查找数据集" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }} /></div></div>
          <div className="dataset-grid">{datasets.map(item => {
            const rows = modeRows.filter(row => row.dataset === item.id);
            const missing = groups.filter(group => !rows.some(row => groupKey(row, mode) === group.key));
            return <section className="dataset-card" key={item.id}><div className="dataset-card-heading"><div className="dataset-icon"><Database size={20} /></div><div><h3>{item.name}</h3><span>{item.kind} · {item.metric}{item.max === 100 ? ' (%)' : ' / 10'}</span></div><Tooltip title={`查看 ${item.name}`}><IconButton aria-label={`查看 ${item.name}`} onClick={() => navigate(mode, item.id)}><ArrowRight size={19} /></IconButton></Tooltip></div><Chart option={scoreOption(rows, item, mode, groups)} label={`${item.name}评分比较`} height={218} /><div className="dataset-card-footer"><span>{rows.filter(row => row.score !== null).length} 条有效评分 · {new Set(rows.map(row => row.task)).size} 道题</span><span className={missing.length ? 'missing-text' : 'complete-text'}>{missing.length ? `缺测 ${missing.map(group => group.label).join(' / ')}` : '条件齐全'}</span></div></section>;
          })}</div>
          {!datasets.length && <Alert severity="info">没有匹配的数据集。</Alert>}
          <div className="method-note"><FlaskConical size={19} /><div><strong>分析口径</strong><p>正式主图排除历史、补跑、修复及辅助运行。不同数据集不汇总为单一能力分；HumanEval+ 和 ALFWorld 的 Sol 首轮 max 按本次实验口径归入 Ultra。</p></div></div>
        </>}
        <footer><span>CodeDepth · AI 对话行为分析</span><span>Material Kit React / Minimal UI</span></footer>
      </main>
    </div>
  </div>;
}

function Detail({ dataset, data, mode, groups, onBack }: { dataset: Dataset; data: Data; mode: Mode; groups: Group[]; onBack: () => void }) {
  const [type, setType] = useState('all');
  const [paired, setPaired] = useState(() => data.rows.some(row => row.dataset === dataset.id && inMode(row, mode) && row.score !== null));
  const [token, setToken] = useState<TokenMetric>('reasoning');
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
  const toggleGroup = (key: string) => {
    setHidden(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
    setPage(0);
  };
  const reset = () => { setType('all'); setPaired(true); setHidden([]); setQuery(''); setPage(0); setToken('reasoning'); };
  return <>
    <div className="detail-controls"><Button startIcon={<ArrowLeft size={16} />} onClick={onBack}>比较总览</Button><div className="toolbar-controls"><SlidersHorizontal size={17} /><Select value={type} size="small" onChange={event => { setType(event.target.value); setPage(0); }} inputProps={{ 'aria-label': '任务类型' }}><MenuItem value="all">全部任务类型</MenuItem>{types.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select><FormControlLabel control={<Checkbox size="small" checked={paired} onChange={event => { setPaired(event.target.checked); setPage(0); }} />} label="共同题目" /><Tooltip title="重置筛选"><IconButton aria-label="重置筛选" onClick={reset}><RotateCcw size={17} /></IconButton></Tooltip></div></div>
    <Alert severity={dataset.kind === '预实验' || missing.length ? 'warning' : 'info'} icon={<FlaskConical size={20} />} sx={{ mb: 3 }}>{dataset.note}{missing.length > 0 && ` 当前方向缺测：${missing.map(group => group.label).join('、')}。`}</Alert>
    <div className="summary-strip detail-summary"><div><span>有效评分 / 请求</span><strong>{valid.length}<small>/ {rows.length}</small></strong></div><div><span>共同题目 / 题目总数</span><strong>{new Set(pairedRows.map(row => row.task)).size}<small>/ {new Set(typed.map(row => row.task)).size}</small></strong></div><div><span>响应耗时中位数</span><strong>{format(median(rows.map(row => row.seconds)), 1)}<small>秒</small></strong></div><div><span>平均总 Token</span><strong>{format(mean(rows.map(row => row.total)), 0)}<small>tokens</small></strong></div></div>
    {!rows.length && <Alert severity="info" sx={{ mb: 2 }}>当前筛选没有可比较记录。可调整任务类型、共同题目或图例条件。</Alert>}
    <DetailCharts dataset={dataset} mode={mode} groups={groups} rows={pairedRows} hidden={hidden}
      onToggleGroup={toggleGroup} token={token} onTokenChange={setToken} />
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