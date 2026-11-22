import { useId, useState } from 'react';
import type { EChartsOption, TooltipComponentOption } from 'echarts';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, ListItemButton, MenuItem, Pagination, Select, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BarChart3, Clock3, Grid2X2, Hash, LineChart, X, ZoomIn } from 'lucide-react';
import { Chart } from './Chart';
import { ResourceWaterfall } from './TimeWaterfall';
import { format, groupKey, mean, taskMean } from './data';
import type { Dataset, Group, Mode, Row } from './data';

export type TokenMetric = 'total' | 'output' | 'reasoning';
type ResourceAxis = 'seconds' | TokenMetric;
type ChartId = 'score' | 'requests' | 'time' | 'token';

const tokenLabels: Record<TokenMetric, string> = {
  reasoning: '推理 Token',
  output: '输出 Token',
  total: '总 Token',
};

const chartBase = {
  textStyle: { fontFamily: 'DM Sans Variable, Microsoft YaHei, sans-serif', color: '#637381' },
  tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
  grid: { left: 48, right: 24, top: 25, bottom: 48 },
} satisfies EChartsOption;

export function scoreOption(rows: Row[], dataset: Dataset, mode: Mode, groups: Group[]): EChartsOption {
  return {
    ...chartBase,
    tooltip: { ...chartBase.tooltip, valueFormatter: value => typeof value === 'number' ? format(value, 3) : '—' },
    xAxis: { type: 'category', data: groups.map(group => group.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { interval: 0, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: dataset.max, splitLine: { lineStyle: { color: '#F0F2F5', type: 'dashed' } } },
    series: [{
      type: 'bar', barWidth: 34, data: groups.map(group => ({
        value: taskMean(rows.filter(row => groupKey(row, mode) === group.key)),
        itemStyle: { color: group.color, borderRadius: [5, 5, 0, 0] },
      })),
      label: { show: true, position: 'top', color: '#1C252E', formatter: parameters => parameters.value == null ? '' : format(Number(parameters.value)) },
    }],
  };
}

function requestOption(rows: Row[], dataset: Dataset, mode: Mode, groups: Group[]): EChartsOption {
  return {
    ...chartBase,
    grid: { left: 48, right: 48, top: 28, bottom: 72 },
    xAxis: { type: 'value', name: '请求（样本顺序）', nameLocation: 'middle', nameGap: 30, min: 1, minInterval: 1 },
    yAxis: { type: 'value', name: dataset.metric, min: 0, max: dataset.max },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 10 }],
    series: groups.map(group => {
      const seriesRows = rows.filter(row => groupKey(row, mode) === group.key)
        .sort((left, right) => left.task.localeCompare(right.task, undefined, { numeric: true }) || left.id.localeCompare(right.id));
      return {
        name: group.label, type: 'line', showSymbol: seriesRows.length < 50, symbolSize: 5, connectNulls: false,
        lineStyle: { color: group.color, width: 1.8 }, itemStyle: { color: group.color },
        data: seriesRows.map((row, index) => [index + 1, row.score]),
      };
    }),
  };
}

function scoreAnalysis(rows: Row[], dataset: Dataset, mode: Mode, groups: Group[]) {
  const unit = dataset.max === 100 ? '%' : ' 分';
  const scores = groups.flatMap(group => {
    const score = taskMean(rows.filter(row => groupKey(row, mode) === group.key));
    return score === null ? [] : [{ label: group.label, score }];
  });
  const values = scores.map(item => item.score);
  const summary = scores.map(({ label, score }) => `${label} ${format(score, 3)}${unit}`).join('，');
  const gap = Math.max(...values) - Math.min(...values);
  const difference = gap < 0.001 ? '各条件的均值相同或相差不足 0.001。'
    : `最高与最低均值相差 ${format(gap, 3)} ${dataset.max === 100 ? '个百分点' : '分'}。`;
  return `按题等权计算，${dataset.metric}为 ${summary}。${scores.length > 1 ? difference : '当前仅一个条件有有效评分，无法比较条件间差异。'}`;
}

const positionResourceTooltip: TooltipComponentOption['position'] = (
  [pointerX, pointerY], _params, tooltip, _rect, { contentSize: [width, height] },
) => {
  if (!(tooltip instanceof HTMLElement) || !tooltip.parentElement) return 'top';

  const chart = tooltip.parentElement;
  const chartBounds = chart.getBoundingClientRect();
  const panel = chart.closest('.chart-panel, .MuiDialogContent-root') ?? chart;
  const panelBounds = panel.getBoundingClientRect();
  const gap = 8;
  const left = Math.max(0, panelBounds.left) + gap - chartBounds.left;
  const right = Math.min(window.innerWidth, panelBounds.right) - gap - chartBounds.left;
  const top = Math.max(0, panelBounds.top) + gap - chartBounds.top;
  const bottom = Math.min(window.innerHeight, panelBounds.bottom) - gap - chartBounds.top;
  const x = Math.max(left, Math.min(pointerX + gap, right - width));
  const preferredY = pointerY - height - gap;
  const y = preferredY >= top ? preferredY : Math.max(top, Math.min(pointerY + gap, bottom - height));
  return [x, y];
};

function ResourceSmallMultiples({ rows, dataset, mode, groups, axis }: {
  rows: Row[]; dataset: Dataset; mode: Mode; groups: Group[]; axis: ResourceAxis;
}) {
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<'waterfall' | 'grid'>('waterfall');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const dialogTitleId = useId();
  const resourceLabel = axis === 'seconds' ? '响应耗时（秒）' : tokenLabels[axis];
  const resourceValue = (value: number) => `${format(value)} ${axis === 'seconds' ? '秒' : 'Token'}`;
  const resourceTick = (value: number) => value >= 1000 ? `${format(value / 1000, 1)}k` : format(value, 1);
  const byTask = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const conditions = byTask.get(row.task) ?? new Map<string, Row[]>();
    const key = groupKey(row, mode);
    const samples = conditions.get(key) ?? [];
    samples.push(row);
    conditions.set(key, samples);
    byTask.set(row.task, conditions);
  }
  const tasks = [...byTask].sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([task, conditions]) => ({ task, points: groups.map(group => {
      const samples = conditions.get(group.key);
      return samples ? { group, resource: mean(samples.map(row => row[axis]))!, score: mean(samples.map(row => row.score))!, count: samples.length } : null;
    }) }));
  const points = tasks.flatMap(task => task.points.flatMap(point => point ? [point] : []));
  const peak = Math.max(1, ...points.map(point => point.resource));
  const step = 10 ** Math.floor(Math.log10(peak / 2));
  const resourceMax = Math.ceil(peak / (2 * step)) * 2 * step;
  const binary = dataset.max === 100 && points.every(point => point.score === 0 || point.score === 100);
  const metric = binary ? '执行结果' : dataset.metric;
  const scoreLabel = (value: number) => binary ? (value === 100 ? '成功' : '失败') : `${format(value)}${dataset.max === 100 ? '%' : ''}`;
  const pages = Math.ceil(tasks.length / 20);
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * 20;
  const pageTasks = tasks.slice(start, start + 20);
  const expanded = tasks.find(item => item.task === expandedTask);
  const taskOption = (points: (typeof tasks)[number]['points'], large = false): EChartsOption => {
    const max = large ? Math.max(1, ...points.map(point => point?.resource ?? 0)) * 1.1 : resourceMax;
    return {
      ...chartBase,
      animation: false,
      grid: large ? { left: 55, right: 28, top: 22, bottom: 52 } : { left: 37, right: 21, top: 9, bottom: 24 },
      tooltip: {
        trigger: 'item',
        renderMode: 'html',
        confine: false,
        className: 'resource-point-tooltip',
        position: positionResourceTooltip,
        padding: [8, 10],
        textStyle: { fontSize: 12 },
        extraCssText: 'max-width: min(218px, calc(100vw - 32px)); white-space: normal; overflow-wrap: anywhere;',
        formatter: params => {
          const item = Array.isArray(params) ? params[0] : params;
          const point = points[item.dataIndex];
          if (!point) return '';

          return points.flatMap(other => {
            if (!other || other.resource !== point.resource || other.score !== point.score) return [];

            const details = document.createElement('div');
            const label = document.createElement('strong');
            label.textContent = other.group.label;
            const metrics = document.createElement('div');
            metrics.textContent = `${resourceValue(other.resource)} · ${metric}：${scoreLabel(other.score)}（${other.count} 条）`;
            details.append(label, metrics);
            return [details];
          });
        },
      },
      xAxis: { type: 'value', min: 0, ...(large ? { max: Math.ceil(max), name: resourceLabel, nameLocation: 'middle', nameGap: 30 } : { max, interval: max / 2 }), axisLabel: { fontSize: large ? 12 : 10, hideOverlap: true, formatter: resourceTick }, splitLine: { show: false } },
      yAxis: { type: 'value', min: 0, max: dataset.max, interval: binary ? dataset.max : dataset.max / 2, axisLabel: { fontSize: large ? 12 : 10, formatter: scoreLabel }, splitLine: { lineStyle: { color: '#E9EDF1', type: 'dashed' } } },
      series: [{
        type: 'line', symbol: 'circle', symbolSize: large ? 11 : 7, connectNulls: false,
        lineStyle: { color: '#8E9BA8', width: large ? 2 : 1.5 },
        data: points.map(point => point ? { value: [point.resource, point.score], itemStyle: { color: point.group.color } } : [null, null]),
      }],
    };
  };

  return <>
    <div className="resource-charts">
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary', fontSize: 12, my: 1 }}>
        <ToggleButtonGroup className="resource-layout-toggle" size="small" exclusive value={layout} aria-label={`${resourceLabel}同题图布局`}
          onChange={(_, next: typeof layout | null) => { if (next) setLayout(next); }}>
          <ToggleButton value="waterfall">立体分层</ToggleButton>
          <ToggleButton value="grid">平面小图</ToggleButton>
        </ToggleButtonGroup>
        <span>第 {start + 1}–{Math.min(start + 20, tasks.length)} 题 / 共 {tasks.length} 题</span>
      </Box>
      {layout === 'waterfall' ? <ResourceWaterfall tasks={pageTasks} resourceMax={resourceMax} resourceLabel={resourceLabel}
        resourceValue={resourceValue} resourceTick={resourceTick} scoreMax={dataset.max} metric={metric} binary={binary} scoreLabel={scoreLabel} onOpenTask={setExpandedTask} />
        : <><Box sx={{ color: 'text.secondary', fontSize: 12, mb: 1 }}>{metric} × {resourceLabel}</Box>
        <Box role="list" aria-label={axis === 'seconds' ? '同题耗时对比' : '同题 Token 对比'} className="resource-chart-grid">
        {pageTasks.map(({ task, points }) => (
          <Box role="listitem" key={task} onClick={() => setExpandedTask(task)} sx={{ borderTop: 1, borderColor: 'divider', minWidth: 0, pt: 0.5, cursor: 'zoom-in', '&:hover': { bgcolor: 'action.hover' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
              <Box component="h4" title={task} sx={{ m: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task}</Box>
              <IconButton size="small" sx={{ flexShrink: 0 }} aria-label={`放大 ${task}`} title={`放大 ${task}`} aria-haspopup="dialog"><ZoomIn size={14} /></IconButton>
            </Box>
            <Chart option={taskOption(points)} label={`${task}：${points.flatMap(point => point ? [`${point.group.label} ${resourceValue(point.resource)}，${scoreLabel(point.score)}`] : []).join('；')}`} height={92} />
          </Box>
        ))}
      </Box></>}
      {pages > 1 && <Pagination sx={{ display: 'flex', justifyContent: 'center', mt: 1 }} size="small" count={pages} page={currentPage} onChange={(_, next) => setPage(next)} aria-label="题目分页" />}
    </div>
    <Dialog open={!!expanded} onClose={() => setExpandedTask(null)} aria-labelledby={dialogTitleId} fullWidth maxWidth="sm">
      {expanded && <>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, overflowWrap: 'anywhere' }}>
          <span id={dialogTitleId}>题目 {expanded.task}</span>
          <IconButton autoFocus onClick={() => setExpandedTask(null)} aria-label="关闭单题详情" title="关闭单题详情"><X size={19} /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Chart option={taskOption(expanded.points, true)} label={`${expanded.task}：${metric}与${resourceLabel}`} height={250} />
          <Table size="small" aria-label="各实验条件结果" sx={{ '& td, & th': { px: { xs: 0.5, sm: 1.5 }, whiteSpace: 'normal' } }}>
            <TableHead><TableRow><TableCell>实验条件</TableCell><TableCell align="right">{resourceLabel}</TableCell><TableCell align="right">{metric}</TableCell><TableCell align="right">样本数</TableCell></TableRow></TableHead>
            <TableBody>{groups.map((group, index) => {
              const point = expanded.points[index];
              return <TableRow key={group.key}>
                <TableCell component="th" scope="row"><Box component="span" aria-hidden="true" sx={{ display: 'inline-block', width: 8, height: 8, mr: 0.75, borderRadius: '50%', bgcolor: group.color }} />{group.label}</TableCell>
                <TableCell align="right">{point ? resourceValue(point.resource) : '缺测'}</TableCell>
                <TableCell align="right">{point ? scoreLabel(point.score) : '—'}</TableCell>
                <TableCell align="right">{point?.count ?? 0}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </DialogContent>
      </>}
    </Dialog>
  </>;
}

function requestAnalysis(rows: Row[], dataset: Dataset) {
  const scores = rows.flatMap(row => row.score === null ? [] : [row.score]);
  const atMax = scores.filter(score => score === dataset.max).length;
  const unit = dataset.max === 100 ? '%' : ' 分';
  return `${scores.length} 条有效评分中，有 ${atMax} 条达到满分（${format(atMax / scores.length * 100, 1)}%）。${dataset.metric}落在 ${format(Math.min(...scores))}${unit}至 ${format(Math.max(...scores))}${unit}之间。横轴是各条件内的请求序号，可用来定位低分样本。`;
}

type ChartView = {
  id: ChartId;
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  legendShape: 'bar' | 'line' | 'dot';
  includes: (row: Row) => boolean;
  option?: (observations: Row[]) => EChartsOption;
  analysis: (observations: Row[]) => string;
};

export function DetailCharts({ dataset, mode, groups, rows, hidden, onToggleGroup, token, onTokenChange }: {
  dataset: Dataset;
  mode: Mode;
  groups: Group[];
  rows: Row[];
  hidden: string[];
  onToggleGroup: (key: string) => void;
  token: TokenMetric;
  onTokenChange: (metric: TokenMetric) => void;
}) {
  const [view, setView] = useState<ChartId | 'overview'>('overview');
  const activeGroups = groups.filter(group => !hidden.includes(group.key));
  const scored = (row: Row) => row.score !== null;
  const views: ChartView[] = [
    {
      id: 'score', title: `${dataset.metric}比较`, icon: BarChart3, legendShape: 'bar',
      subtitle: `${dataset.max === 100 ? '0–100%' : '0–10 分'} · 按题等权平均，重复运行先按题取均值`,
      includes: scored,
      option: observations => scoreOption(observations, dataset, mode, activeGroups),
      analysis: observations => scoreAnalysis(observations, dataset, mode, activeGroups),
    },
    {
      id: 'requests', title: '逐请求评分', icon: LineChart, legendShape: 'line',
      subtitle: '各条件内按任务编号和运行编号排序',
      includes: scored,
      option: () => requestOption(rows, dataset, mode, activeGroups),
      analysis: observations => requestAnalysis(observations, dataset),
    },
    {
      id: 'time', title: '评分与响应耗时', icon: Clock3, legendShape: 'dot',
      subtitle: '同一条件下取有效请求的平均耗时和平均分 · 各页刻度一致',
      includes: row => scored(row) && row.seconds !== null,
      analysis: () => '连线只连接同一道题的结果，缺测处断开。立体图段内按耗时排列，平面图按图例的条件顺序连接；两者都不代表分数随时间连续变化。',
    },
    {
      id: 'token', title: '评分与 Token 消耗', icon: Hash, legendShape: 'dot',
      subtitle: '同题同条件取有效请求的平均 Token 和平均分 · 输出 Token 已包含推理 Token',
      includes: row => scored(row) && row[token] !== null,
      analysis: () => '连线只连接同一道题的结果，缺测处断开。立体图段内按 Token 消耗排列，平面图按图例的条件顺序连接；观察到的差异不代表增加 Token 会提高评分。',
    },
  ];
  const overview = view === 'overview';
  const currentViews = overview ? views : views.filter(chart => chart.id === view);
  const navigation = [{ id: 'overview' as const, title: '总览', icon: Grid2X2 }, ...views];

  return (
    <div className="chart-workspace">
      <nav className="chart-navigation" aria-label="图表视图">
        <h2>图表视图</h2>
        {navigation.map(({ id, title, icon: Icon }) => (
          <ListItemButton key={id} component="button" type="button" className="chart-nav-item"
            selected={view === id} aria-pressed={view === id} onClick={() => setView(id)}>
            <Icon size={17} aria-hidden="true" />
            <span>{title}</span>
          </ListItemButton>
        ))}
      </nav>
      <div className="chart-results">
        <div className={overview ? 'detail-chart-grid' : 'detail-chart-grid single-chart'}>
          {currentViews.map(chart => {
            const eligible = rows.filter(chart.includes);
            const observations = eligible.filter(row => !hidden.includes(groupKey(row, mode)));
            return (
              <section className="panel chart-panel" key={chart.id} aria-labelledby={`chart-${chart.id}-title`}
                style={chart.id === 'time' || chart.id === 'token' ? { gridColumn: '1 / -1' } : undefined}>
                <div className="panel-heading">
                  <div>
                    <h3 id={`chart-${chart.id}-title`}>{chart.title}</h3>
                    <p>{chart.subtitle}</p>
                  </div>
                  {chart.id === 'token' && (
                    <Select size="small" value={token} onChange={event => onTokenChange(event.target.value)}
                      inputProps={{ 'aria-label': 'Token 口径' }}>
                      {Object.entries(tokenLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                    </Select>
                  )}
                </div>
                <div className="chart-legend" role="group" aria-label={`${chart.title}图例（筛选当前数据集的实验条件）`}>
                  {groups.map(group => {
                    const count = eligible.filter(row => groupKey(row, mode) === group.key).length;
                    const shown = !hidden.includes(group.key);
                    return (
                      <button type="button" key={group.key} aria-pressed={shown} onClick={() => onToggleGroup(group.key)}
                        className={shown ? '' : 'legend-off'} title="切换此条件在当前数据集中的显示">
                        <span className={`legend-mark ${chart.legendShape}`} style={{ backgroundColor: group.color }} aria-hidden="true" />
                        {group.label} <small>{count ? `${count} 条` : '缺测'}</small>
                      </button>
                    );
                  })}
                </div>
                {observations.length === 0 ? <p className="chart-empty">当前筛选条件下没有可绘制的记录。</p>
                  : chart.option ? <Chart option={chart.option(observations)} label={chart.title} height={overview ? 270 : 390} />
                    : <ResourceSmallMultiples rows={observations} dataset={dataset} mode={mode} groups={activeGroups} axis={chart.id === 'time' ? 'seconds' : token} />}
                {!overview && (
                  <div className="chart-analysis">
                    <h4>图表分析</h4>
                    <p>{observations.length ? chart.analysis(observations) : '可调整任务类型、共同题目或图例筛选后查看。'}</p>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
