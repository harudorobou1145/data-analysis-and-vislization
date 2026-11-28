import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { EChartsOption } from 'echarts';
import { Alert, Box, Button, Checkbox, CircularProgress, Drawer, FormControlLabel, IconButton, MenuItem, Select, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';
import { ArrowDownToLine, ArrowLeft, CircleHelp, Clock3, GitBranch, MousePointer2, RotateCcw, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { Chart } from './Chart';
import { ChartTaskSelect } from './ChartTaskSelect';
import { ContextSection } from './ContextSection';
import { commonCases, domainNames, exportTopRows, number, outcome, outcomeInfo, pairedFlows, pct, strategies, strategyInfo, summarize } from './topbench-data';
import type { Outcome, Strategy, TopCase, TopData, TopRun } from './topbench-data';
import './topbench.css';

const selectAllIcons = {
  icon: (
    <SvgIcon>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </SvgIcon>
  ),
  checkedIcon: (
    <SvgIcon>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" />
      <path d="m7.5 12 3 3 6-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  ),
  indeterminateIcon: (
    <SvgIcon>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" />
      <path d="M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </SvgIcon>
  ),
};

const stages: Record<string, { label: string; color: string }> = {
  selection: { label: '选择工具', color: '#1877F2' }, answer: { label: '生成回答', color: '#008A75' },
  completion: { label: '完成度评分', color: '#B38B45' }, leakage: { label: '泄漏评分', color: '#8B5CC8' },
};
const knownOutcomes = Object.keys(outcomeInfo).filter(s => s !== 'unknown') as Outcome[];

export default function TopBenchPage({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<TopData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}topbench-data.json`, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(String(e)); });
    return () => controller.abort();
  }, []);
  if (error) return <Alert severity="error">TOP-Bench 数据加载失败：{error}<Button onClick={() => location.reload()}>重新加载</Button></Alert>;
  if (!data) return <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /><p>加载提示词实验…</p></Box>;
  return <Workspace data={data} onBack={onBack} />;
}

function Workspace({ data, onBack }: { data: TopData; onBack: () => void }) {
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [{ tasks: selected, flowHistory }, setTaskSelection] = useState<{
    tasks: string[] | null;
    flowHistory: (string[] | null)[];
  }>({ tasks: null, flowHistory: [] });
  const [focusedTask, setFocusedTask] = useState('TOP001');
  const [strategy, setStrategy] = useState<Strategy>('baseline');
  const [hovered, setHovered] = useState<Strategy | null>(null);
  const [sort, setSort] = useState('task');
  const [resourceSize, setResourceSize] = useState(false);
  const [processView, setProcessView] = useState('tools');
  const [compared, setCompared] = useState<Strategy>('tnm');
  const [drawer, setDrawer] = useState(false);
  const scopeCases = data.cases;
  const baseCases = useMemo(() => commonCases(data, domain, difficulty), [data, domain, difficulty]);
  const scopeRequests = data.requests.filter(r => scopeCases.some(c => c.task_id === r.task_id)).length;
  const visibleCases = useMemo(() => [...baseCases].sort((a, b) => {
    if (sort === 'domain') return a.privacy_domain.localeCompare(b.privacy_domain) || a.difficulty.localeCompare(b.difficulty);
    if (sort === 'difference') {
      const disagreement = (c: TopCase) => new Set(data.runs.filter(r => r.task_id === c.task_id).map(outcome)).size;
      return disagreement(b) - disagreement(a) || a.task_id.localeCompare(b.task_id);
    }
    return a.task_id.localeCompare(b.task_id);
  }), [baseCases, sort, data]);
  const taskIds = useMemo(() => baseCases.filter(c => selected === null || selected.includes(c.task_id)).map(c => c.task_id), [baseCases, selected]);
  const allSelected = taskIds.length > 0 && taskIds.length === visibleCases.length;
  const stats = useMemo(() => summarize(data.runs, taskIds), [data, taskIds]);
  const focus = visibleCases.find(c => c.task_id === focusedTask) ?? visibleCases[0];
  const focusRuns = data.runs.filter(r => r.task_id === focus?.task_id);
  const activeRun = focusRuns.find(r => r.strategy === strategy);
  const reset = () => { setDomain('all'); setDifficulty('all'); selectTasks(null); setFocusedTask('TOP001'); setStrategy('baseline'); setHovered(null); setSort('task'); };
  function selectTasks(ids: string[] | null, source?: 'flow') {
    if (source === 'flow' && ids?.length === taskIds.length) return;
    setTaskSelection(current => ({
      tasks: ids,
      flowHistory: source === 'flow' ? [...current.flowHistory, current.tasks] : [],
    }));
    if (ids?.length && !ids.includes(focusedTask)) setFocusedTask(ids[0]);
  }
  function undoFlowSelection() {
    setTaskSelection(current => {
      const previous = current.flowHistory.at(-1);
      if (previous === undefined) return current;
      return { tasks: previous, flowHistory: current.flowHistory.slice(0, -1) };
    });
  }
  const scatter: EChartsOption = useMemo(() => ({
    animationDurationUpdate: 220,
    textStyle: { fontFamily: 'DM Sans Variable, Microsoft YaHei, sans-serif', color: '#637381' },
    grid: { left: 64, right: 28, top: 42, bottom: 54 },
    tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: p => {
      const s = stats.find(s => strategyInfo[s.strategy].short === (Array.isArray(p) ? p[0].seriesName : p.seriesName));
      if (!s) return '';
      const samePoint = stats.filter(other => other.cr === s.cr && other.lr === s.lr);
      const rates = `共同题目：${s.n}\n完成率：${pct(s.cr)} · 泄漏率：${pct(s.lr)}`;
      const details = samePoint.map(item =>
        `${strategyInfo[item.strategy].label}\nH：${item.h === null ? '—' : item.h.toFixed(3)} · 完成且安全：${pct(item.safe)}\n平均作答 Token：${number(item.tokens, 0)}`,
      );
      return [rates, ...details].join('\n\n');
    } },
    xAxis: { type: 'value', min: 0, max: 100, interval: 25, name: '泄漏率 LR（%）', nameLocation: 'middle', nameGap: 32, axisLine: { show: false }, splitLine: { lineStyle: { color: '#E8EDF2', type: 'dashed' } } },
    yAxis: { type: 'value', min: 0, max: 100, interval: 25, name: '完成率 CR（%）', nameGap: 22, axisLabel: { margin: 18 }, splitLine: { lineStyle: { color: '#E8EDF2', type: 'dashed' } } },
    series: stats.map(s => ({
      type: 'scatter' as const, name: strategyInfo[s.strategy].short,
      symbolSize: resourceSize && s.tokens !== null ? Math.max(6, Math.sqrt(s.tokens / 1750) * 24) : 19,
      data: s.cr === null || s.lr === null ? [] : [{ value: [s.lr * 100, s.cr * 100], strategy: s.strategy }],
      itemStyle: { color: strategyInfo[s.strategy].color, opacity: hovered && hovered !== s.strategy ? .25 : 1, borderColor: '#FFF', borderWidth: 3, shadowColor: `${strategyInfo[s.strategy].color}50`, shadowBlur: strategy === s.strategy ? 14 : 5 },
      emphasis: { scale: 1.3 },
    })),
  }), [stats, resourceSize, hovered, strategy]);
  const flows = useMemo(() => pairedFlows(data.runs, taskIds, compared), [data.runs, taskIds, compared]);
  const sankey: EChartsOption = useMemo(() => {
    const nodes = [...new Set(flows.flatMap(f => [`left:${f.from}`, `right:${f.to}`]))].map(name => {
      const state = name.split(':')[1] as Outcome;
      return { name, itemStyle: { color: outcomeInfo[state].color }, label: { formatter: `${outcomeInfo[state].label}` } };
    });
    return {
      animationDurationUpdate: 220, textStyle: { fontFamily: 'DM Sans Variable, Microsoft YaHei, sans-serif', fontSize: 13, color: '#454F5B' },
      tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: p => {
        const item = (p as { data: { tasks?: string[]; source?: string; target?: string }; name: string }).data;
        return item.tasks ? `${outcomeInfo[item.source!.split(':')[1] as Outcome].label} → ${outcomeInfo[item.target!.split(':')[1] as Outcome].label}\n${item.tasks.length} 道同题\n${item.tasks.join('、')}` : '点击连线，筛选对应题目';
      } },
      series: [{ type: 'sankey', left: 14, right: 145, top: 20, bottom: 18, nodeWidth: 12, nodeGap: 28,
        nodeAlign: 'justify', draggable: false, data: nodes,
        links: flows.map(f => ({ source: `left:${f.from}`, target: `right:${f.to}`, value: f.tasks.length, tasks: f.tasks })),
        label: { position: 'right', distance: 10 }, emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', opacity: .23, curveness: .6 },
      }],
    };
  }, [flows]);
  const currentTool = focus ? data.tool_graphs.find(g => g.task_id === focus.task_id && g.strategy === strategy) : null;
  return <div className="tb-page">
    <div className="page-heading">
      <div>
        <div className="eyebrow">EXPERIMENT ANALYTICS</div>
        <h1>提示词策略与隐私权衡</h1>
        <p>TOP-Bench v3 · GPT 6.1 Sol · 固定 High 档</p>
      </div>
      <Button variant="outlined" startIcon={<ArrowDownToLine size={17} />} onClick={() => exportTopRows(data, taskIds)}
        disabled={!taskIds.length}>导出当前数据</Button>
    </div>
    <ContextSection title="数据集内容说明">
      <p>在同一组题目上比较原始提示、TNM 和 CBD 三种策略。对照回答结果与工具选择，观察任务完成度和隐私泄漏风险。</p>
    </ContextSection>
    <div className="detail-controls">
      <Button startIcon={<ArrowLeft size={16} />} onClick={onBack}>比较总览</Button>
      <div className="toolbar-controls">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <Select size="small" value={domain} inputProps={{ 'aria-label': '隐私领域' }} onChange={event => { setDomain(event.target.value); selectTasks(null); }}>
          <MenuItem value="all">全部领域</MenuItem>
          {data.metadata.domains.map(item => <MenuItem key={item} value={item}>{domainNames[item]} · {item}</MenuItem>)}
        </Select>
        <Select size="small" value={difficulty} inputProps={{ 'aria-label': '难度' }} onChange={event => { setDifficulty(event.target.value); selectTasks(null); }}>
          <MenuItem value="all">全部难度</MenuItem>
          {data.metadata.difficulties.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </Select>
        <Tooltip title={`恢复完整${scopeCases.length}题与默认视图`}>
          <IconButton className="reset-button" aria-label="重置 TOP-Bench 筛选" onClick={reset} size="small"><RotateCcw size={17} /></IconButton>
        </Tooltip>
      </div>
    </div>
    <div className="summary-strip detail-summary">
      <div><span>共同题目 / 题目总数</span><strong><b data-testid="paired-count">{taskIds.length}</b><small>/ {scopeCases.length}</small></strong></div>
      <div><span>当前样本</span><strong>{taskIds.length * strategies.length}<small>组配对实验</small></strong></div>
      <div><span>实验条件</span><strong>{strategies.length}<small>种提示策略</small></strong></div>
      <div><span>评分口径</span><strong className="text-stat">完成与泄漏<small>同题配对</small></strong></div>
    </div>
    <div className="tb-strategy-grid">{stats.map(s => {
      const info = strategyInfo[s.strategy];
      return <button type="button" key={s.strategy} className={`tb-strategy-card ${strategy === s.strategy ? 'is-active' : ''}`} style={{ '--strategy-color': info.color } as CSSProperties}
        aria-pressed={strategy === s.strategy} aria-label={`高亮${info.label}`} onClick={() => setStrategy(s.strategy)} onMouseEnter={() => setHovered(s.strategy)} onMouseLeave={() => setHovered(null)}>
        <div className="tb-strategy-title"><span>{info.label}</span><span className="tb-strategy-code">{info.short}</span></div><p>{info.description}</p>
        <div className="tb-card-metrics"><div><span>完成率 CR</span><strong>{pct(s.cr)}</strong></div><div><span>泄漏率 LR</span><strong>{pct(s.lr)}</strong></div><div><span>综合 H</span><strong>{s.h === null ? '—' : s.h.toFixed(3)}</strong></div></div>
        <div className="tb-card-footer"><span>{s.n} 道配对题</span><span>完成且安全 <b>{pct(s.safe)}</b></span></div>
      </button>;
    })}</div>
    {!visibleCases.length && <Alert severity="info" sx={{ mb: 3 }}>当前条件没有完整配对题目，请调整领域或难度。</Alert>}
    <div className="tb-overview-grid">
      <section className="panel chart-panel tb-matrix-panel">
        <div className="panel-heading">
          <div>
            <h3>同题结果矩阵</h3>
            <p>点击单元格查看工具，拖动可批量选择题目</p>
          </div>
          <div className="tb-mini-actions">
            <FormControlLabel
              label="全选"
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
              control={<Checkbox {...selectAllIcons} checked={allSelected} indeterminate={taskIds.length > 0 && !allSelected}
                disabled={visibleCases.length === 0} onChange={(_, checked) => selectTasks(checked ? null : [])} />}
            />
            <Select size="small" value={sort} onChange={event => setSort(event.target.value)} inputProps={{ 'aria-label': '矩阵排序' }}>
              <MenuItem value="task">按题号</MenuItem>
              <MenuItem value="difference">差异优先</MenuItem>
              <MenuItem value="domain">按领域</MenuItem>
            </Select>
          </div>
        </div>
        <div className="tb-outcome-legend">{knownOutcomes.map(key => <span key={key}><i style={{ background: outcomeInfo[key].background, color: outcomeInfo[key].color }}>{outcomeInfo[key].mark}</i>{outcomeInfo[key].label}</span>)}</div>
        <Matrix key={`${domain}:${difficulty}`} cases={visibleCases} data={data} focus={focus?.task_id} strategy={strategy} hovered={hovered} selected={taskIds} onFocus={(task, s) => { setFocusedTask(task); setStrategy(s); }} onSelect={selectTasks} />
        <div className="tb-matrix-hint"><MousePointer2 size={14} /><span>左侧选项框可逐题勾选，统计会按选中的题目更新。</span></div>
      </section>
      <section className="panel chart-panel tb-tradeoff-panel"><div className="panel-heading"><div><h3>完成度与隐私的权衡</h3><p>左上方表示完成率较高、泄漏率较低 · 当前 N = {taskIds.length}</p></div></div>
        <ul className="chart-legend" aria-label="提示词策略图例">
          {strategies.map(id => (
            <li key={id}>
              <span className="legend-mark" style={{ backgroundColor: strategyInfo[id].color }} aria-hidden="true" />
              {strategyInfo[id].short}
            </li>
          ))}
        </ul>
        <Chart option={scatter} height={350} label="三种提示策略的完成率与隐私泄漏率散点图" onEvents={{
          click: event => { const s = (event as { data?: { strategy?: Strategy } }).data?.strategy; if (s) setStrategy(s); },
          mouseover: event => { const s = (event as { data?: { strategy?: Strategy } }).data?.strategy; if (s) setHovered(s); },
          globalout: () => setHovered(null),
        }} />
        <div className="tb-scatter-controls"><ToggleButtonGroup className="chart-view-toggle" size="small" exclusive value={resourceSize ? 'tokens' : 'equal'} onChange={(_, v) => v && setResourceSize(v === 'tokens')} aria-label="散点大小"><ToggleButton value="equal">等大点</ToggleButton><ToggleButton value="tokens">作答 Token</ToggleButton></ToggleButtonGroup>{resourceSize ? <span className="tb-size-legend"><svg width="108" height="37" role="img" aria-label="圆大小图例：1000和2000个作答Token"><circle cx="15" cy="14" r={Math.sqrt(1000 / 1750) * 12} fill="#A8BBCE" opacity=".7" /><circle cx="65" cy="14" r={Math.sqrt(2000 / 1750) * 12} fill="#A8BBCE" opacity=".7" /><text x="15" y="36" textAnchor="middle" fill="#637381" fontSize="10">1,000</text><text x="65" y="36" textAnchor="middle" fill="#637381" fontSize="10">2,000</text></svg>Token</span> : <span>点击点，高亮对应策略</span>}</div>
        <div className="chart-analysis tb-chart-insight"><h4>图表分析</h4><p>{stats.every(s => s.n > 0) ? <>当前选择下，TNM相对原始提示的泄漏率变化为 <strong>{signed((stats[1].lr! - stats[0].lr!) * 100)} 个百分点</strong>，完成率变化为 <strong>{signed((stats[1].cr! - stats[0].cr!) * 100)} 个百分点</strong>。</> : '请选择至少一道完整配对题目。'}</p></div>
      </section>
    </div>
    <section className="panel chart-panel tb-process-panel">
      <div className="panel-heading">
        <div>
          <h3>从结果回到工具选择</h3>
          <p className="tb-current-case" aria-live="polite" aria-atomic="true">
            {focus ? <>
              <span>当前题目</span>
              <strong>{focus.task_id}</strong>
              <span>{domainNames[focus.privacy_domain]} · {focus.difficulty}</span>
            </> : '当前筛选下没有题目'}
          </p>
        </div>
        <div className="tb-mini-actions">
          {focus && <ChartTaskSelect tasks={visibleCases.map(item => item.task_id)} value={focus.task_id}
            onChange={setFocusedTask} label="查看题目" />}
          <Button size="small" onClick={() => setDrawer(true)} disabled={!activeRun}>指标详情</Button>
        </div>
      </div>
      <div className="tb-process-tabs"><ToggleButtonGroup className="chart-view-toggle" size="small" exclusive value={processView} onChange={(_, v) => v && setProcessView(v)} aria-label="案例视图"><ToggleButton value="tools"><GitBranch size={16} />工具选择关系</ToggleButton><ToggleButton value="timeline"><Clock3 size={16} />四阶段请求时间线</ToggleButton></ToggleButtonGroup><span>所有工具返回均为静态数据。选择关系可观测，内部推理过程不可观测。</span></div>
      {focus ? processView === 'tools' ? <ToolGraph data={data} task={focus.task_id} strategy={strategy} onStrategy={setStrategy} /> : <RequestTimeline data={data} task={focus.task_id} onRun={s => { setStrategy(s); setDrawer(true); }} /> : <p className="tb-empty">请选择有数据的领域与难度。</p>}
      <div className="tb-case-results">{strategies.map(s => {
        const row = focusRuns.find(r => r.strategy === s); const state = outcomeInfo[outcome(row)];
        return <button type="button" key={s} onClick={() => { setStrategy(s); setDrawer(true); }} disabled={!row} className={strategy === s ? 'is-active' : ''}><span style={{ color: strategyInfo[s].color }}>{strategyInfo[s].short}</span><b style={{ color: state.color }}>{state.label}</b><small>{row ? `${row.tool_call_count} 个工具 · ${number(row.solver_total_tokens, 0)} Token` : '—'}</small></button>;
      })}</div>
    </section>
    <section className="panel chart-panel tb-flow-panel">
      <div className="panel-heading">
        <div>
          <h3>同题结果如何变化</h3>
          <p>同题独立实验的配对比较 · 点击一条连线，筛选对应题目</p>
        </div>
        <div className="tb-mini-actions">
          <ToggleButtonGroup className="chart-view-toggle" size="small" exclusive value={compared}
            onChange={(_, value) => { if (value) setCompared(value); }} aria-label="桑基比较策略">
            <ToggleButton value="tnm">原始提示 → TNM</ToggleButton>
            <ToggleButton value="cbd">原始提示 → CBD</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title={flowHistory.length ? `撤销连线筛选（还可撤销 ${flowHistory.length} 步）` : '暂无可撤销的连线筛选'} describeChild>
            <span>
              <IconButton className="reset-button" size="small" aria-label="撤销连线筛选"
                disabled={flowHistory.length === 0} onClick={undoFlowSelection}>
                <Undo2 size={17} />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
      <div className="tb-flow-labels"><span>原始提示 · {taskIds.length} 题</span><span>{strategyInfo[compared].label} · {taskIds.length} 题</span></div>
      {flows.length ? <Chart option={sankey} label="原始提示与保护策略之间的同题结果变迁桑基图" height={285} onEvents={{ click: event => { const tasks = (event as { data?: { tasks?: string[] } }).data?.tasks; if (tasks) selectTasks(tasks, 'flow'); } }} /> : <p className="tb-empty">没有可比较的配对结果。</p>}
      <p className="tb-caption">连线宽度表示题目数，表示策略间的结果差异，不表示同一会话的修复顺序。</p>
    </section>
    <details className="tb-methods"><summary><CircleHelp size={17} />数据范围与评测口径<span>{scopeCases.length}题平衡子集 · 同模型自动评分</span></summary><div><p>本实验覆盖5个隐私领域、4档难度，交叉单元各{scopeCases.length / 20}题，共{scopeCases.length}道不重复题目；三种策略各运行一次。领域子组为{scopeCases.length / 5}题、难度子组为{scopeCases.length / 4}题，适合探索案例。</p><p>CR为任务完成率，LR为隐私泄漏率；H = 2 × CR × (1 − LR) / (CR + 1 − LR)，由当前共同题目上的组级比例计算。完成且安全比例是另一项独立指标。</p><p>作答和评分都使用同一模型、独立盲化上下文，仍需人工抽检。工具选择图只展示固定工具返回的选择关系，真实外部工具调用数为0。作答资源与评分开销分别保留，输出Token已经包含推理Token。</p><p>本实验记录{scopeCases.length * 3}组结果、{scopeRequests}次HTTP尝试。中转站的实际模型身份、推理档位支持和计费价格未独立核实。</p></div></details>
    <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 470 }, p: 3 } } }}>
      <div className="drawer-title"><h2>{focus?.task_id} · {strategyInfo[strategy].short}</h2><IconButton aria-label="关闭 TOP-Bench 详情" onClick={() => setDrawer(false)}><X size={20} /></IconButton></div><p className="tb-drawer-description">匿名结果与资源指标</p>
      {activeRun && <><dl className="record-detail">{Object.entries({ 领域: domainNames[activeRun.privacy_domain], 难度: activeRun.difficulty, 模型: 'GPT 6.1 Sol', 推理档位: 'High', 结果: outcomeInfo[outcome(activeRun)].label, 选中工具数: activeRun.tool_call_count, 参考支撑工具数: currentTool?.nodes.filter(n => n.selected && n.reference_support_member).length ?? '—', '作答耗时（秒）': number(activeRun.solver_duration_seconds), '作答输入 Token': number(activeRun.solver_input_tokens, 0), '作答输出 Token': number(activeRun.solver_output_tokens, 0), '其中推理 Token': number(activeRun.solver_reasoning_tokens, 0), '作答总 Token': number(activeRun.solver_total_tokens, 0), '评分总 Token': number(activeRun.judge_total_tokens, 0), '评分耗时（秒）': number(activeRun.judge_duration_seconds) }).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="tb-caption">任务判定与泄漏判定来自自动评分；原始回答和敏感内容不在公开指标中展示。</p></>}
    </Drawer>
  </div>;
}

function signed(n: number) { return `${n > 0 ? '+' : ''}${number(n)}`; }

function Matrix({ cases, data, focus, strategy, hovered, selected, onFocus, onSelect }: {
  cases: TopCase[]; data: TopData; focus?: string; strategy: Strategy; hovered: Strategy | null; selected: string[];
  onFocus: (task: string, strategy: Strategy) => void; onSelect: (tasks: string[]) => void;
}) {
  const drag = useRef<{ pointerId: number; startRow: number; x: number; y: number; started: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [range, setRange] = useState<{ first: number; last: number } | null>(null);
  const firstRowTop = 41;
  const rowHeight = 30;
  const height = Math.max(48 + cases.length * rowHeight, 130);
  const isSubset = selected.length < cases.length;

  function rowAt(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.floor(((event.clientY - rect.top) / rect.height * height - firstRowTop) / rowHeight);
  }

  function beginDrag(event: ReactPointerEvent<SVGSVGElement>) {
    suppressClick.current = false;
    if (event.button !== 0 || event.pointerType === 'touch') return;
    const startRow = rowAt(event);
    if (startRow < 0 || startRow >= cases.length) return;
    drag.current = { pointerId: event.pointerId, startRow, x: event.clientX, y: event.clientY, started: false };
  }

  function dragRange(event: ReactPointerEvent<SVGSVGElement>, startRow: number) {
    const endRow = Math.max(0, Math.min(cases.length - 1, rowAt(event)));
    return { first: Math.min(startRow, endRow), last: Math.max(startRow, endRow) };
  }

  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.started) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 4) return;
      current.started = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const next = dragRange(event, current.startRow);
    setRange(previous => previous?.first === next.first && previous.last === next.last ? previous : next);
  }

  function cancelDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setRange(null);
  }

  function finishDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.started) {
      const { first, last } = dragRange(event, current.startRow);
      onSelect(cases.slice(first, last + 1).map(item => item.task_id));
    }
    cancelDrag(event);
  }

  function toggle(task: string) {
    onSelect(selected.includes(task) ? selected.filter(id => id !== task) : [...selected, task]);
  }

  return <div className={`tb-matrix-scroll ${range ? 'is-dragging' : ''}`}>
    <svg viewBox={`0 0 440 ${height}`} role="group" aria-label={`${cases.length}道题三种策略的结果矩阵`}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerLeave={event => { if (!drag.current?.started) cancelDrag(event); }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) cancelDrag(event); }}
      onClickCapture={event => {
        if (suppressClick.current && event.detail > 0) {
          suppressClick.current = false;
          event.stopPropagation();
        }
      }}>
      <text x="30" y="24" fontSize="12" fill="#637381">题目 / 领域 / 难度</text>
      {strategies.map((s, i) => <text key={s} x={195 + i * 90} y="24" textAnchor="middle" fontSize="13" fontWeight={s === strategy ? 700 : 500} fill={strategyInfo[s].color}>{strategyInfo[s].short}</text>)}
      {cases.map((c, i) => {
        const y = firstRowTop + 2 + i * rowHeight;
        const chosen = selected.includes(c.task_id);
        const inRange = range !== null && i >= range.first && i <= range.last;
        return <g key={c.task_id}>
          <rect x="8" y={y - 2} width="423" height="29" rx="5" fill={inRange ? '#E8F2FE' : focus === c.task_id ? '#F0F5FB' : chosen && isSubset ? '#F6F9FC' : 'transparent'} />
          <g role="checkbox" tabIndex={0} aria-checked={chosen} aria-label={`选择 ${c.task_id}`} className="tb-svg-control" onClick={() => toggle(c.task_id)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(c.task_id); } }}>
            <circle cx="20" cy={y + 12} r="7" fill={chosen ? '#1877F2' : 'white'} stroke={chosen ? '#1877F2' : '#BEC8D2'} />{chosen && <path d={`M16 ${y + 12} l3 3 l5 -6`} stroke="white" strokeWidth="1.5" fill="none" />}
          </g>
          <text x="35" y={y + 11} fill="#263747" fontSize="13" fontWeight={focus === c.task_id ? 700 : 500}>{c.task_id}</text><text x="35" y={y + 24} fill="#758593" fontSize="10.5">{c.privacy_domain} · {c.difficulty}</text>
          {strategies.map((s, col) => {
            const run = data.runs.find(r => r.task_id === c.task_id && r.strategy === s); const state = outcomeInfo[outcome(run)]; const x = 156 + col * 90;
            return <g key={s} role="button" tabIndex={0} aria-label={`${c.task_id} ${strategyInfo[s].short}：${state.label}`} className="tb-svg-control" opacity={hovered && hovered !== s ? .35 : 1}
              onClick={() => onFocus(c.task_id, s)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(c.task_id, s); } }}>
              <title>{c.task_id} · {strategyInfo[s].short}：{state.label}；{run?.tool_call_count ?? '—'} 个工具；{number(run?.solver_total_tokens ?? null, 0)} Token</title>
              <rect x={x} y={y + 1} width="77" height="24" rx="5" fill={state.background} stroke={focus === c.task_id && strategy === s ? strategyInfo[s].color : 'transparent'} strokeWidth="2" />
              <text x={x + 38.5} y={y + 17} textAnchor="middle" fill={state.color} fontSize="16" fontWeight="700">{state.mark}</text>
            </g>;
          })}
        </g>;
      })}
      {!cases.length && <text x="220" y="85" fill="#637381" textAnchor="middle" fontSize="14">没有符合条件的完整配对题目</text>}
    </svg>
  </div>;
}

function ToolGraph({ data, task, strategy, onStrategy }: { data: TopData; task: string; strategy: Strategy; onStrategy: (s: Strategy) => void }) {
  const [tool, setTool] = useState<string | null>(null);
  useEffect(() => setTool(null), [task]);
  const graphs = data.tool_graphs.filter(g => g.task_id === task);
  const nodes = graphs[0]?.nodes ?? [];
  const height = Math.max(320, nodes.length * 42 + 65);
  const sy = (i: number) => 76 + i * (height - 140) / 2;
  const ty = (i: number) => 48 + i * 42;
  return <div className="tb-tool-content"><div className="tb-tool-legend"><span><i className="tb-line-sample" />策略选择了此工具</span><span><i className="tb-dash-sample" />隐私推断参考支撑成员</span>{tool && <button type="button" onClick={() => setTool(null)}>清除工具高亮</button>}</div>
    <div className="tb-graph-scroll"><svg viewBox={`0 0 900 ${height}`} role="group" aria-label={`${task} 三种提示策略与工具之间的选择关系`}>
      <text x="40" y="20" fill="#758593" fontSize="12">提示词策略</text><text x="600" y="20" fill="#758593" fontSize="12">可用工具 · 固定返回数据</text>
      {strategies.flatMap((s, i) => (graphs.find(g => g.strategy === s)?.nodes ?? []).filter(n => n.selected).map(n => {
        const index = nodes.findIndex(x => x.tool_id === n.tool_id); const active = tool ? tool === n.tool_id : strategy === s;
        return <path key={`${s}:${n.tool_id}`} d={`M230 ${sy(i)} C380 ${sy(i)}, 425 ${ty(index) + 16}, 594 ${ty(index) + 16}`} fill="none" stroke={strategyInfo[s].color} strokeWidth={active ? 2.4 : 1.3} opacity={active ? .75 : .12} className="tb-graph-edge" />;
      }))}
      {strategies.map((s, i) => {
        const row = data.runs.find(r => r.task_id === task && r.strategy === s); const state = outcomeInfo[outcome(row)];
        const selectsTool = !tool || graphs.find(g => g.strategy === s)?.nodes.some(n => n.tool_id === tool && n.selected);
        return <g key={s} className="tb-svg-control" role="button" tabIndex={0} aria-label={`选择关系高亮 ${strategyInfo[s].short}`} onClick={() => onStrategy(s)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStrategy(s); } }} opacity={selectsTool ? 1 : .35}>
          <rect x="30" y={sy(i) - 27} width="200" height="56" rx="9" fill={s === strategy ? `${strategyInfo[s].color}0D` : '#F8FAFC'} stroke={s === strategy ? strategyInfo[s].color : '#E3E9EF'} />
          <circle cx="50" cy={sy(i) - 7} r="4" fill={strategyInfo[s].color} /><text x="64" y={sy(i) - 2} fontSize="15" fontWeight="700" fill={strategyInfo[s].color}>{strategyInfo[s].short}</text>
          <text x="48" y={sy(i) + 17} fontSize="12" fill={state.color}>{state.label} · {row?.tool_call_count ?? '—'} 个工具</text>
        </g>;
      })}
      {nodes.map((n, i) => {
        const selected = graphs.find(g => g.strategy === strategy)?.nodes.some(x => x.tool_id === n.tool_id && x.selected);
        const active = tool ? tool === n.tool_id : selected;
        return <g key={n.tool_id} className="tb-svg-control" role="button" tabIndex={0} aria-pressed={tool === n.tool_id} aria-label={`工具 ${n.tool_family} ${n.tool_id} ${n.reference_support_member ? '参考支撑成员' : ''}`}
          onClick={() => setTool(tool === n.tool_id ? null : n.tool_id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTool(tool === n.tool_id ? null : n.tool_id); } }}>
          <title>{n.tool_family} · {n.tool_id}；{n.reference_support_member ? '隐私推断参考支撑成员' : '非参考支撑成员'}；{selected ? '当前策略已选择' : '当前策略未选择'}</title>
          <rect x="596" y={ty(i)} width="274" height="34" rx="6" fill={active ? '#F0F5FB' : '#FAFBFC'} stroke={active ? strategyInfo[strategy].color : '#CCD6DF'} strokeDasharray={n.reference_support_member ? '5 3' : undefined} />
          <circle cx="612" cy={ty(i) + 17} r="3.5" fill={selected ? strategyInfo[strategy].color : '#C5CED6'} /><text x="624" y={ty(i) + 21} fontSize="11" fill="#8494A3">T{i + 1}</text><text x="649" y={ty(i) + 21} fontSize="13" fill={active ? '#263747' : '#72818E'}>{n.tool_family.replaceAll('_', ' ')}</text>
          {n.reference_support_member && <text x="851" y={ty(i) + 21} textAnchor="end" fontSize="13" fill="#8A98A5">◇</text>}
        </g>;
      })}
    </svg></div><p className="tb-caption">连线表示策略选择了某个静态工具返回。参考支撑集合是数据集标注，不代表模型内部的实际推理链。</p>
  </div>;
}

function RequestTimeline({ data, task, onRun }: { data: TopData; task: string; onRun: (s: Strategy) => void }) {
  const requests = data.requests.filter(r => r.task_id === task);
  const origins = Object.fromEntries(strategies.map(s => [s, Math.min(...requests.filter(r => r.strategy === s && r.started_at_utc).map(r => Date.parse(r.started_at_utc!)))]));
  const known = requests.filter(r => r.started_at_utc && r.ended_at_utc);
  const max = Math.max(1, ...known.map(r => (Date.parse(r.ended_at_utc!) - origins[r.strategy]) / 1000));
  const x = (v: number) => 130 + v / max * 690;
  return <div className="tb-timeline"><div className="tb-tool-legend">{Object.values(stages).map(s => <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>)}</div><div className="tb-graph-scroll"><svg viewBox="0 0 900 245" role="group" aria-label={`${task} 三种策略的四阶段请求时间线`}>
    {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1={x(f * max)} x2={x(f * max)} y1="28" y2="198" stroke="#E5EBF1" strokeDasharray="3 3" /><text x={x(f * max)} y="222" textAnchor="middle" fill="#758593" fontSize="12">{number(f * max)}s</text></g>)}
    {strategies.map((s, i) => <g key={s}><text x="25" y={62 + i * 57} fill={strategyInfo[s].color} fontSize="14" fontWeight="700">{strategyInfo[s].short}</text><line x1="130" x2="820" y1={57 + i * 57} y2={57 + i * 57} stroke="#F0F3F6" strokeWidth="25" />
      {known.filter(r => r.strategy === s).map(r => {
        const start = (Date.parse(r.started_at_utc!) - origins[s]) / 1000; const duration = (Date.parse(r.ended_at_utc!) - Date.parse(r.started_at_utc!)) / 1000;
        return <g key={`${r.run_id}:${r.stage}:${r.attempt_id ?? r.started_at_utc}`} role="button" tabIndex={0} className="tb-svg-control" aria-label={`${strategyInfo[s].short} ${stages[r.stage].label} ${number(r.duration_seconds)}秒`} onClick={() => onRun(s)} onKeyDown={e => { if (e.key === 'Enter') onRun(s); }}><title>{stages[r.stage].label}：{number(r.duration_seconds)} 秒，{number(r.total_tokens, 0)} Token；{r.status}</title><rect x={x(start)} y={44 + i * 57} width={Math.max(3, x(duration) - 130)} height="26" rx="4" fill={r.status === 'completed' ? stages[r.stage].color : '#B24052'} opacity={r.phase === 'judge' ? .65 : .95} />{duration / max > .12 && <text x={x(start) + (x(duration) - 130) / 2} y={61 + i * 57} textAnchor="middle" fill="white" fontSize="11">{number(r.duration_seconds)}s</text>}</g>;
      })}</g>)}
  </svg></div><p className="tb-caption">每条泳道从该策略自身首个请求起计时；保留请求间隔。后两阶段为独立自动评分，点击色块查看资源指标。</p></div>;
}
