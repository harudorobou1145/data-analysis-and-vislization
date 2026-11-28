import { lazy, Suspense, useEffect, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Collapse, Drawer, Fab, IconButton, InputAdornment, ListItemButton, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, useScrollTrigger } from '@mui/material';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, BrainCircuit, ChartNoAxesCombined, ChevronRight, ClipboardPenLine, CodeXml, Database, FlaskConical, Layers3, Menu, MessagesSquare, RotateCcw, Route, ScanEye, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { Chart } from './Chart';
import { ContextSection } from './ContextSection';
import { DetailCharts, PageSections, scoreOption } from './DetailCharts';
import type { TokenMetric } from './DetailCharts';
import { downloadRows, format, groupKey, groupsFor, inMode, matchingTasks, mean, median, modelNames, overviewStats, taskMean } from './data';
import type { ComparisonDirection, Data, Dataset, Group, Mode, Row } from './data';
import { commonCases, exportTopRows } from './topbench-data';
import type { TopData } from './topbench-data';
import { PromptOverview } from './PromptOverview';
import { TaskGuide } from './TaskGuide';
import { CollaborativePage } from './CollaborativePage';

const TopBenchPage = lazy(() => import('./TopBenchPage'));
const collaborativeItem = { id: 'collaborative', name: '协作实验' };

const datasetIcons: Partial<Record<string, typeof Database>> = {
  subjective_60: ClipboardPenLine,
  wildbench: MessagesSquare,
  hss: ScanEye,
  humanevalplus: CodeXml,
  alfworld: Route,
};

const datasetDescriptions: Record<string, string> = {
  subjective_60: '从 MT-Bench 和 BiGGen-Bench 选取 60 道开放题，涵盖写作、分析与规划等任务。模型需要按要求给出完整回答，由模型裁判按回答质量评分，同一题的重复作答先取均值。',
  wildbench: '选取 WildBench v2-hard 中的 20 道真实对话场景难题。模型需要理解用户意图，并在多项约束下给出有用的回答；本实验使用自定义模型裁判，分数不等同于官方榜单成绩。',
  hss: '使用 20 道图片问答题，考查模型理解图像信息并据此回答问题的能力。每道题有多个判分要点，按满足要点的比例折算成 0–10 分。',
  humanevalplus: '使用 EvalPlus 的 Python 函数补全任务。模型根据函数签名和题目描述编写实现，评估器执行基础与扩展测试；两套测试均通过才算成功。',
  alfworld: '使用 ALFWorld 的文本交互任务，模拟家居环境中的找物、搬放和处理物品。模型根据每一步环境反馈决定下一步动作，最终由环境判定目标是否完成。',
  gsm8k: '小学数学文字题，要求根据题意完成多步计算，再按最终答案判分。',
  mt_bench: '开放式对话任务，要求模型根据用户指令作答。当前预实验只记录耗时与 Token，没有可用评分。',
};

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function AppState() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const dataset = hash.get('dataset') ?? 'overview';
  const direction: ComparisonDirection = hash.get('mode') === 'prompts' && dataset !== collaborativeItem.id ? 'prompts' : hash.get('mode') === 'models' ? 'models' : 'depth';
  return { mode: (direction === 'models' ? 'models' : 'depth') as Mode, direction, dataset: ['gsm8k', 'mt_bench'].includes(dataset) ? 'overview' : dataset };
}
function BackToTop() {
  const visible = useScrollTrigger({ threshold: 320, disableHysteresis: true });
  if (!visible) return null;

  const goToTop = () => {
    document.getElementById('page-top')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <Tooltip title="返回顶部">
      <Fab className="back-to-top" color="primary" size="small" aria-label="返回顶部" onClick={goToTop}>
        <ArrowUp size={20} aria-hidden="true" />
      </Fab>
    </Tooltip>
  );
}

export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [topData, setTopData] = useState<TopData | null>(null);
  const [topError, setTopError] = useState('');
  const [error, setError] = useState('');
  const [route, setRoute] = useState(AppState);
  const [mobile, setMobile] = useState(false);
  const [expandedDirections, setExpandedDirections] = useState<ComparisonDirection[]>(() =>
    ['overview', 'task-guide'].includes(route.dataset) ? [] : [route.dataset === 'topbench3' ? 'prompts' : route.mode],
  );
  const [search, setSearch] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}analysis-data.json`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(setData).catch(reason => { if (reason.name !== 'AbortError') setError(String(reason)); });
    fetch(`${import.meta.env.BASE_URL}topbench-data.json`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(setTopData).catch(reason => { if (reason.name !== 'AbortError') setTopError(String(reason)); });
    const listener = () => {
      const next = AppState();
      setRoute(next);
      if (!['overview', 'task-guide'].includes(next.dataset)) {
        const section = next.dataset === 'topbench3' ? 'prompts' : next.mode;
        setExpandedDirections(current => current.includes(section) ? current : [...current, section]);
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
  function navigateOverview(direction: ComparisonDirection) {
    location.hash = new URLSearchParams({ mode: direction, dataset: 'overview' }).toString();
    setMobile(false);
    setSearch('');
  }
  if (error) return <div className="load-state"><Alert severity="error">数据加载失败：{error}</Alert><Button onClick={() => location.reload()}>重试</Button></div>;
  if (!data) return <div className="load-state"><CircularProgress /><p>加载实验指标…</p></div>;
  const { mode, direction, dataset: datasetId } = route;
  const isTopBench = datasetId === 'topbench3';
  const isTaskGuide = datasetId === 'task-guide';
  const isCollaborative = datasetId === collaborativeItem.id;
  const comparisonLabel = mode === 'depth' ? '思考深度' : '不同模型';
  const taskGuideHref = `#${new URLSearchParams({ mode: direction, dataset: 'task-guide' })}`;
  const openTopBench = () => { location.hash = 'mode=prompts&dataset=topbench3'; setMobile(false); setSearch(''); };
  const groups = groupsFor(mode);
  const formalDatasets = data.datasets.filter(item => item.kind !== '预实验');
  const dataset = formalDatasets.find(item => item.id === datasetId);
  const isPromptOverview = !dataset && !isTopBench && direction === 'prompts';
  const coverage = overviewStats(data, topData, direction);
  const exportCurrent = () => {
    if (isPromptOverview) {
      if (topData) exportTopRows(topData, commonCases(topData).map(c => c.task_id));
    } else downloadRows(modeRows.filter(row => !dataset || row.dataset === dataset.id), dataset?.id ?? mode);
  };
  const modeRows = data.rows.filter(row => inMode(row, mode) && formalDatasets.some(item => item.id === row.dataset));
  const datasets = formalDatasets.filter(item => (item.name + item.kind).toLowerCase().includes(search.toLowerCase()));
  const comparisonDatasets = [...formalDatasets, collaborativeItem];
  const researchDirections = [
    { id: 'depth', name: '思考深度', icon: BrainCircuit, datasets: comparisonDatasets },
    { id: 'models', name: '不同模型', icon: ChartNoAxesCombined, datasets: comparisonDatasets },
    { id: 'prompts', name: '提示词策略', icon: ShieldCheck, datasets: [{ id: 'topbench3', name: 'TOP-Bench v3' }] },
  ] as const;
  const renderSidebar = (idPrefix: string) => <>
    <a className="brand" href="#mode=depth&dataset=overview" aria-label="CodeDepth 首页"><div className="brand-mark"><Layers3 size={24} /></div><span>CodeDepth<span className="brand-dot">.</span></span></a>
    <ListItemButton selected={!dataset && !isTopBench && !isTaskGuide && !isCollaborative} onClick={() => navigateOverview(direction)} className="nav-item"><Activity size={20} /><span>比较总览</span></ListItemButton>
    <ListItemButton component="a" href={taskGuideHref} selected={isTaskGuide} aria-current={isTaskGuide ? 'page' : undefined} onClick={() => { setMobile(false); setSearch(''); }} className="nav-item"><ClipboardPenLine size={20} /><span>任务说明</span></ListItemButton>
    <span className="nav-label research-label">研究方向</span>
    {researchDirections.map(({ id, name, icon: Icon, datasets }) => {
      const expanded = expandedDirections.includes(id);
      const selected = isTopBench ? id === 'prompts' : (!!dataset || isCollaborative) && mode === id;
      const submenuId = `${idPrefix}-datasets-${id}`;
      return (
        <div className="sidebar-section" key={id}>
          <ListItemButton selected={selected} className="nav-item" aria-expanded={expanded} aria-controls={submenuId}
            onClick={() => setExpandedDirections(current => current.includes(id)
              ? current.filter(section => section !== id)
              : [...current, id])}>
            <Icon size={20} /><span>{name}</span>
            <ChevronRight size={15} className={`nav-chevron ${expanded ? 'expanded' : ''}`} />
          </ListItemButton>
          <Collapse in={expanded} unmountOnExit>
            <div id={submenuId} className="dataset-submenu" role="group" aria-label={`${name}数据集`}>
              {datasets.map(item => (
                <ListItemButton key={item.id} selected={selected && datasetId === item.id} aria-current={selected && datasetId === item.id ? 'page' : undefined} className="nav-item dataset-nav"
                  onClick={() => id === 'prompts' ? openTopBench() : navigate(id, item.id)}>
                  <span className="dataset-dot" /><span>{item.name}</span>
                </ListItemButton>
              ))}
            </div>
          </Collapse>
        </div>
      );
    })}
    <div className="sidebar-bottom"><div className="source-mark"><Database size={17} /> PROCESSED DATA</div><p>{isTopBench ? 'TOP-Bench v3' : `${coverage.recordsTotal.toLocaleString()} 条指标记录`}</p><small>{isTopBench ? '同题配对 · 三种提示策略' : `${coverage.datasetsTotal}个正式数据集 · 各方向分别统计`}</small><a href="https://github.com/minimal-ui-kit/material-kit-react" target="_blank" rel="noreferrer">Material Kit React ↗</a></div>
  </>;
  function moveSpotlight(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse') return;
    const { currentTarget, target, clientX, clientY } = event;
    const surfaceSelector = '.dataset-card, .panel, .tb-strategy-card, .glass-band, .guide-pipeline';
    const hoveredCard = target instanceof Element ? target.closest<HTMLElement>('[data-navigable]') : null;
    const surfaces = Array.from(currentTarget.querySelectorAll<HTMLElement>(surfaceSelector), surface => ({
      surface,
      rect: surface.getBoundingClientRect(),
    }));
    for (const { surface, rect } of surfaces) {
      surface.style.setProperty('--spotlight-x', `${clientX - rect.left - surface.clientLeft}px`);
      surface.style.setProperty('--spotlight-y', `${clientY - rect.top - surface.clientTop}px`);
      if (surface === hoveredCard && rect.width && rect.height) {
        const horizontal = 2 * (clientX - rect.left) / rect.width - 1;
        const vertical = 2 * (clientY - rect.top) / rect.height - 1;
        const limit = Math.max(1, Math.hypot(horizontal, vertical));
        const tilt = surface.matches('.dataset-card, .tb-strategy-card') ? 8 : 2;
        surface.style.setProperty('--tilt-x', `${-vertical * tilt / limit}deg`);
        surface.style.setProperty('--tilt-y', `${horizontal * tilt / limit}deg`);
      }
    }
    currentTarget.querySelector('[data-tilting]')?.removeAttribute('data-tilting');
    if (hoveredCard && currentTarget.contains(hoveredCard)) hoveredCard.setAttribute('data-tilting', '');
    currentTarget.setAttribute('data-spotlight', '');
  }

  function clearSpotlight(event: PointerEvent<HTMLElement>) {
    event.currentTarget.removeAttribute('data-spotlight');
    event.currentTarget.querySelector('[data-tilting]')?.removeAttribute('data-tilting');
  }

  return <div className="app-shell">
    <aside className="desktop-nav">{renderSidebar('desktop')}</aside>
    <Drawer open={mobile} onClose={() => setMobile(false)} slotProps={{ paper: { sx: { width: 270, p: 2.5, background: 'var(--canvas-gradient), var(--canvas-base)' } } }}><IconButton aria-label="关闭导航" onClick={() => setMobile(false)} sx={{ alignSelf: 'flex-end' }}><X size={20} /></IconButton>{renderSidebar('mobile')}</Drawer>
    <div className="main-shell">
      <header className="topbar" id="page-top" tabIndex={-1}><div className="breadcrumbs"><IconButton className="mobile-menu" aria-label="打开导航" onClick={() => setMobile(true)}><Menu size={22} /></IconButton><span>CodeDepth</span><ChevronRight size={14} /><strong>{isTaskGuide ? '任务说明' : isTopBench ? '提示词策略' : dataset || isCollaborative ? comparisonLabel : '比较总览'}</strong>{(dataset || isTopBench || isCollaborative) && <><ChevronRight size={14} /><span className="breadcrumb-dataset">{isTopBench ? 'TOP-Bench v3' : isCollaborative ? collaborativeItem.name : dataset?.name}</span></>}</div></header>
      <main onPointerMove={moveSpotlight} onPointerLeave={clearSpotlight} onPointerCancel={clearSpotlight}>
        <div className={`route-content${isTopBench ? ' route-content-lazy' : ''}`} key={isTaskGuide ? 'task-guide' : `${direction}:${datasetId}`}>
        {!isTopBench && !isTaskGuide && !isCollaborative && <div className="page-heading"><div><div className="eyebrow">EXPERIMENT ANALYTICS</div><h1>{dataset?.name ?? '比较总览'}</h1>{dataset && <p>{mode === 'depth' ? 'GPT 6.1 Sol · Low / High / Ultra' : 'GPT 6.1 Sol / GPT 6 Luna / DeepSeek Flash · High'}</p>}</div><Button variant="outlined" startIcon={<ArrowDownToLine size={17} />} onClick={exportCurrent} disabled={isPromptOverview && !topData}>导出数据</Button></div>}
        {isCollaborative ? <CollaborativePage mode={mode} /> : isTaskGuide ? <PageSections items={[
          ['guide-pipeline', '数据处理流程'], ['guide-questions', '研究问题'], ['guide-workflow', '各阶段处理规则'],
          ['guide-record', '记录实例'], ['guide-fields', '字段来源'],
        ]}><TaskGuide /></PageSections> : isTopBench ? <Suspense fallback={<Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>}><TopBenchPage onBack={() => navigateOverview('prompts')} /></Suspense> : dataset ? <Detail key={`${mode}-${dataset.id}`} dataset={dataset} data={data} mode={mode} groups={groups} onBack={() => navigate(mode)} /> : <PageSections items={[
          ['overview-context', '实验内容说明'], ['overview-comparison', '当前比较'], ['overview-results', '数据集表现'],
        ]}>
          <div data-chart-section="overview-context" tabIndex={-1}>
          <ContextSection title="实验内容说明">
            <p>我们用开放问答、图像理解、代码生成、环境交互和隐私保护任务，观察回答质量、任务完成度、信息泄漏、响应耗时与 Token 消耗如何变化。</p>
            <p><strong>思考深度：</strong>固定 GPT 6.1 Sol，比较 Low、High、Ultra 三档。</p>
            <p><strong>不同模型：</strong>固定 High 档，比较 GPT 6.1 Sol、GPT 6 Luna 和 DeepSeek Flash。</p>
            <p><strong>提示词策略：</strong>固定 GPT 6.1 Sol、High，在 TOP-Bench 的80道同题上比较原始提示、TNM和CBD，观察完成度与隐私保护的权衡。</p>
            <p>评分按各数据集的规则分别统计，同题重复作答先取均值，不把不同数据集的得分合成一个总分。</p>
          </ContextSection>
          </div>
          <ToggleButtonGroup exclusive value={direction} onChange={(_, value: ComparisonDirection | null) => value && navigateOverview(value)} className="direction-tabs" aria-label="研究方向"><ToggleButton value="depth"><BrainCircuit size={18} />思考深度</ToggleButton><ToggleButton value="models"><ChartNoAxesCombined size={18} />不同模型</ToggleButton><ToggleButton value="prompts"><ShieldCheck size={18} />提示词策略</ToggleButton></ToggleButtonGroup>
          <p className="current-comparison" data-chart-section="overview-comparison" tabIndex={-1}>
            <strong>当前比较</strong>
            <span>{isPromptOverview ? '固定 GPT 6.1 Sol、High，比较原始提示、TNM、CBD；同一80题上的完成率与泄漏率。' : <>固定 {mode === 'depth' ? 'GPT 6.1 Sol' : 'High 档'}，比较 {groups.map(group => group.label).join('、')}。</>}</span>
          </p>
          <div className="summary-strip">
            <div><span>正式数据集</span><strong>{coverage.datasetsTotal}<small>全部 · 当前方向{coverage.datasetsCurrent}个</small></strong></div>
            <div><span>当前方向</span><strong>{coverage.recordsCurrent?.toLocaleString() ?? '—'}<small>条实验记录</small></strong></div>
            <div className="experiment-conditions">
              <span>实验条件</span>
              <strong>{groups.length}<small>{isPromptOverview ? '种提示策略' : mode === 'depth' ? '个深度档位' : '个模型'}</small></strong>
            </div>
            <div><span>评分口径</span><strong className="text-stat">{isPromptOverview ? '完成与泄漏' : '按题等权'}<small>{isPromptOverview ? `${topData?.cases.length ?? '—'}道同题配对` : '缺失不计零分'}</small></strong></div>
          </div>
          <div className="section-toolbar" data-chart-section="overview-results" tabIndex={-1}><div><h2>数据集表现</h2><p>{isPromptOverview ? '同题配对 · 比较任务完成率和隐私泄漏率' : '独立评分尺度 · 同题重复先取均值'}</p></div><div className="toolbar-controls"><TextField size="small" placeholder="查找数据集" aria-label="查找数据集" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }} /></div></div>
          {isPromptOverview ? topError ? <Alert severity="error">提示词策略数据加载失败：{topError}</Alert> : !topData ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : !search || 'TOP-Bench v3 隐私 提示词策略'.toLowerCase().includes(search.toLowerCase()) ? <PromptOverview data={topData} onOpen={openTopBench} /> : <Alert severity="info">没有匹配的数据集。</Alert> : <><div className="dataset-grid">{datasets.map(item => {
            const rows = modeRows.filter(row => row.dataset === item.id);
            const missing = groups.filter(group => !rows.some(row => groupKey(row, mode) === group.key));
            const DatasetIcon = datasetIcons[item.id] ?? Database;
            return <section className="dataset-card" data-navigable key={item.id}><div className="dataset-card-heading"><div className="dataset-icon"><DatasetIcon size={20} aria-hidden="true" /></div><div><h3>{item.name}</h3><span>{item.kind} · {item.metric}{item.max === 100 ? ' (%)' : ' / 10'}</span></div><Tooltip title={`查看 ${item.name}`}><IconButton aria-label={`查看 ${item.name}`} onClick={() => navigate(mode, item.id)}><ArrowRight size={19} /></IconButton></Tooltip></div><Chart option={scoreOption(rows, item, mode, groups)} label={`${item.name}评分比较`} height={218} /><div className="dataset-card-footer"><span>{rows.filter(row => row.score !== null).length} 条有效评分 · {new Set(rows.map(row => row.task)).size} 道题</span><span className={missing.length ? 'missing-text' : 'complete-text'}>{missing.length ? `缺测 ${missing.map(group => group.label).join(' / ')}` : '条件齐全'}</span></div></section>;
          })}</div>
          {!datasets.length && <Alert severity="info">没有匹配的数据集。</Alert>}</>}
          <div className="method-note"><FlaskConical size={19} /><div><strong>分析口径</strong><p>{isPromptOverview ? 'TOP-Bench使用80道不重复题目、240组实验。作答与评分产生的960次HTTP请求单独统计；自动评分尚需人工抽检。三个研究方向分别统计，不合成为总能力分。' : '正式主图排除历史、补跑、修复及辅助运行。TOP-Bench在“提示词策略”方向独立比较；不同数据集不汇总为单一能力分。HumanEval+ 和 ALFWorld 的 Sol 首轮 max 按本次实验口径归入 Ultra。'}</p></div></div>
        </PageSections>}
        </div>
        <footer><span>CodeDepth · AI 对话行为分析</span><span>Material Kit React / Minimal UI</span></footer>
      </main>
    </div>
    <BackToTop />
  </div>;
}

function Detail({ dataset, data, mode, groups, onBack }: { dataset: Dataset; data: Data; mode: Mode; groups: Group[]; onBack: () => void }) {
  const [type, setType] = useState('all');
  const [token, setToken] = useState<TokenMetric>('reasoning');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Row | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const all = data.rows.filter(row => row.dataset === dataset.id && inMode(row, mode));
  const typed = all.filter(row => type === 'all' || row.type === type);
  const pairedRows = all.some(row => row.score !== null) ? matchingTasks(typed, mode, groups) : typed;
  const rows = pairedRows.filter(row => !hidden.includes(groupKey(row, mode)));
  const missing = groups.filter(group => !all.some(row => groupKey(row, mode) === group.key));
  const types = [...new Set(all.map(row => row.type))].sort();
  const valid = rows.filter(row => row.score !== null);
  const tableRows = rows.filter(row => `${row.task} ${row.id} ${row.type} ${row.model} ${row.effort}`.toLowerCase().includes(query.toLowerCase()));
  const toggleGroup = (key: string) => {
    setHidden(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
    setPage(0);
  };
  const reset = () => { setType('all'); setHidden([]); setQuery(''); setPage(0); setToken('reasoning'); };
  return <>
    {datasetDescriptions[dataset.id] && <ContextSection title="数据集内容说明"><p>{datasetDescriptions[dataset.id]}</p></ContextSection>}
    <div className="detail-controls">
      <Button startIcon={<ArrowLeft size={16} />} onClick={onBack}>比较总览</Button>
      <div className="toolbar-controls">
        <SlidersHorizontal size={17} />
        <Select value={type} size="small" onChange={event => { setType(event.target.value); setPage(0); }} inputProps={{ 'aria-label': '任务类型' }}>
          <MenuItem value="all">全部任务类型</MenuItem>
          {types.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </Select>
        <Tooltip title="重置筛选">
          <IconButton className="reset-button" aria-label="重置筛选" onClick={reset} size="small">
            <RotateCcw size={17} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
    <Alert severity={dataset.kind === '预实验' || missing.length ? 'warning' : 'info'} icon={<FlaskConical size={20} />} sx={{ mb: 3 }}>{dataset.note}{missing.length > 0 && ` 当前方向缺测：${missing.map(group => group.label).join('、')}。`}</Alert>
    <div className="summary-strip detail-summary"><div><span>有效评分 / 请求</span><strong>{valid.length}<small>/ {rows.length}</small></strong></div><div><span>共同题目 / 题目总数</span><strong>{new Set(pairedRows.map(row => row.task)).size}<small>/ {new Set(typed.map(row => row.task)).size}</small></strong></div><div><span>响应耗时中位数</span><strong>{format(median(rows.map(row => row.seconds)), 1)}<small>秒</small></strong></div><div><span>平均总 Token</span><strong>{format(mean(rows.map(row => row.total)), 0)}<small>tokens</small></strong></div></div>
    <div className="chart-condition-filter" role="group" aria-labelledby="chart-filter-title">
      <span id="chart-filter-title" className="chart-filter-label">{mode === 'models' ? '模型筛选' : '深度筛选'}</span>
      {groups.map(group => (
        <label key={group.key}>
          <Checkbox checked={!hidden.includes(group.key)} onChange={() => toggleGroup(group.key)} />
          {group.label}
        </label>
      ))}
    </div>
    {!rows.length && <Alert severity="info" sx={{ mb: 2 }}>当前筛选没有可比较记录。可调整任务类型或实验条件。</Alert>}
    <DetailCharts dataset={dataset} mode={mode} groups={groups} rows={pairedRows} hidden={hidden}
  token={token} onTokenChange={setToken}
      repairChains={dataset.id === 'humanevalplus' && mode === 'depth'
        ? data.repairChains?.filter(chain => typed.some(row => row.task === chain.task)) : undefined} />
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
