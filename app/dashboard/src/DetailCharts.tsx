import { useId, useState } from 'react';
import type { EChartsOption, TooltipComponentOption } from 'echarts';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, ListItemButton, MenuItem, Pagination, Select, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BarChart3, Clock3, Grid2X2, Hash, LineChart, ListChecks, Workflow, X, ZoomIn } from 'lucide-react';
import { Chart } from './Chart';
import { ChartTaskSelect } from './ChartTaskSelect';
import { ResourceWaterfall } from './TimeWaterfall';
import { format, groupKey, mean, taskMean } from './data';
import type { Dataset, Group, Mode, Row } from './data';

export type TokenMetric = 'total' | 'output' | 'reasoning';
type ResourceAxis = 'seconds' | TokenMetric;
type ChartId = 'score' | 'requests' | 'time' | 'token' | 'behavior' | 'test-results';

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

function diagnosticAxis(groups: Group[]) {
  return {
    type: 'category' as const,
    data: groups.map(group => group.label.replace(/ (Sol|Luna|Flash)$/, '\n$1')),
    axisLabel: { interval: 0, fontSize: 11 },
    axisTick: { show: false },
  };
}

const traceStates = {
  accepted: { label: '环境接受', color: '#118D57', mark: '●' },
  rejected: { label: '环境拒绝', color: '#B54708', mark: '×' },
  unknown: { label: '状态未记录', color: '#637381', mark: '○' },
};

function traceState(value: boolean | null) {
  return value === true ? traceStates.accepted : value === false ? traceStates.rejected : traceStates.unknown;
}

const taskTypeLabels: Record<string, string> = {
  pick_and_place_simple: '取物放置',
  look_at_obj_in_light: '在光下观察',
  pick_clean_then_place_in_recep: '清洁后放置',
  pick_heat_then_place_in_recep: '加热后放置',
  pick_cool_then_place_in_recep: '冷却后放置',
  pick_two_obj_and_place: '双物体放置',
};
const sectorColors = ['#43819B', '#59865B', '#A55A43', '#9A7031', '#5471A1', '#866187'];
const stepColors = ['#E8F5F2', '#BFE6DD', '#7CCBBB', '#3D9F93', '#246E67', '#174943'];

function radialPoint(radius: number, angle: number) {
  return [220 + radius * Math.sin(angle), 220 - radius * Math.cos(angle)] as const;
}

function ringSector(inner: number, outer: number, start: number, end: number) {
  const large = Number(end - start > Math.PI);
  return `M ${radialPoint(outer, start)} A ${outer} ${outer} 0 ${large} 1 ${radialPoint(outer, end)} L ${radialPoint(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${radialPoint(inner, start)} Z`;
}

function TaskStepRing({ rows, mode, groups, tasks, selected, onSelect }: {
  rows: Row[]; mode: Mode; groups: Group[]; tasks: string[]; selected: string; onSelect: (task: string) => void;
}) {
  const byTask = new Map<string, Row[]>();
  for (const row of rows) {
    if (!byTask.has(row.task)) byTask.set(row.task, []);
    byTask.get(row.task)!.push(row);
  }
  const byType = new Map<string, string[]>();
  for (const task of tasks) {
    const type = byTask.get(task)?.[0]?.type ?? '未分类';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(task);
  }
  const gap = 0.085;
  const pitch = (2 * Math.PI - byType.size * gap) / tasks.length;
  const band = 30;
  const inner = 81;
  const outer = inner + band * groups.length;
  const max = Math.max(1, ...rows.map(row => row.environmentSteps ?? 0));
  const ticks = [...byType].map(([type, ids], index) => ({ type, ids, color: sectorColors[index % sectorColors.length] }));
  let offset = 0;
  return <Box component="section" aria-label="环境步数环形总览" sx={{ mb: 2.5 }}>
    <h4>环境步数环形总览</h4>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 3fr) minmax(145px, 1fr)' }, gap: { xs: 1, md: 3 }, alignItems: 'center' }}>
      <Box component="svg" viewBox="0 0 440 440" role="group" aria-label="按任务类型分区的步数热图" sx={{ display: 'block', width: '100%', maxWidth: 500, mx: 'auto', '& [role=button]': { cursor: 'pointer', outline: 'none' }, '& [role=button]:is(:hover, :focus-visible) .task-outline': { stroke: '#111C24', strokeWidth: 2.5 } }}>
        {ticks.map(({ type, ids, color }, typeIndex) => {
          const start = offset + gap / 2;
          const end = start + ids.length * pitch;
          offset = end + gap / 2;
          const [labelX, labelY] = radialPoint(outer + 28, (start + end) / 2);
          return <g key={type}>
            <path d={ringSector(outer + 6, outer + 11, start, end)} fill={color} />
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fill={color} fontSize="14" fontWeight="700" aria-hidden="true">{typeIndex + 1}</text>
            {ids.map((task, taskIndex) => {
              const left = start + taskIndex * pitch + 0.003;
              const right = start + (taskIndex + 1) * pitch - 0.003;
              const cells = groups.map(group => {
                const records = (byTask.get(task) ?? []).filter(row => groupKey(row, mode) === group.key);
                const steps = mean(records.map(row => row.environmentSteps ?? null));
                return { group, steps, failed: records.some(row => row.score === 0) };
              });
              const label = `${task}，${taskTypeLabels[type] ?? type}；${cells.map(({ group, steps, failed }) => `${group.label} ${steps === null ? '缺测' : `${format(steps)} 步`}${failed ? '，有未成功记录' : ''}`).join('；')}`;
              return <g key={task} role="button" tabIndex={task === selected ? 0 : -1} aria-label={label} aria-pressed={task === selected}
                onClick={() => onSelect(task)} onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(task); }
                }}>
                <title>{label}</title>
                {cells.map(({ group, steps, failed }, ringIndex) => {
                  const radius = inner + band * ringIndex;
                  const color = steps === null ? '#E5E8EB' : stepColors[Math.min(stepColors.length - 1, Math.floor(steps / max * stepColors.length))];
                  const [markX, markY] = radialPoint(radius + band / 2, (left + right) / 2);
                  return <g key={group.key} aria-hidden="true">
                    <path d={ringSector(radius, radius + band - 2, left, right)} fill={color} />
                    {failed && <circle cx={markX} cy={markY} r="3" fill="#9E322F" stroke="#fff" strokeWidth="1" />}
                  </g>;
                })}
                <path className="task-outline" d={ringSector(inner, outer - 2, left, right)} fill="transparent" stroke={task === selected ? '#111C24' : 'none'} strokeWidth="2" />
              </g>;
            })}
          </g>;
        })}
        <g aria-hidden="true" textAnchor="middle" fill="#1C252E">
          <text x="220" y="219" fontSize="26" fontWeight="700">{selected}</text>
          <text x="220" y="241" fontSize="12" fill="#637381">{tasks.length} 道题</text>
        </g>
      </Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
        <Box component="p" sx={{ mb: 1 }}><strong>内环 → 外环</strong><br />{groups.map(group => group.label).join(' → ')}</Box>
        <Box component="p" sx={{ mb: 0.5 }}><strong>环境步数</strong></Box>
        <Box sx={{ display: 'flex', maxWidth: 180 }} aria-hidden="true">{stepColors.map(color => <Box key={color} sx={{ flex: 1, height: 9, bgcolor: color }} />)}</Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', maxWidth: 180 }}><span>0</span><span>{max} 步</span></Box>
        <Box component="p" sx={{ my: 1 }}><span style={{ color: '#9E322F' }}>●</span> 未成功　<span style={{ color: '#AAB2B9' }}>■</span> 缺测</Box>
        <Box component="ol" sx={{ m: 0, pl: 2.25, columns: { xs: 2, md: 1 }, columnGap: 2 }}>
          {ticks.map(({ type, ids, color }) => <Box component="li" key={type} sx={{ color, mb: 0.5, breakInside: 'avoid' }}>{taskTypeLabels[type] ?? type} · {ids.length}</Box>)}
        </Box>
      </Box>
    </Box>
  </Box>;
}

function TaskActionTrace({ rows, mode, groups }: { rows: Row[]; mode: Mode; groups: Group[] }) {
  const [selectedTask, setSelectedTask] = useState('AW058');
  const tasks = [...new Set(rows.filter(row => row.stepTrace?.length).map(row => row.task))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const task = tasks.includes(selectedTask) ? selectedTask : tasks[0];
  if (!task) return <p className="chart-empty">当前筛选条件下没有完整的逐步日志。</p>;
  const records = rows.filter(row => row.task === task);
  const tracks = groups.flatMap(group => {
    const matches = records.filter(row => groupKey(row, mode) === group.key);
    return (matches.length ? matches : [undefined]).map((row, index) => ({
      key: row?.id ?? group.key,
      label: matches.length > 1 ? `${group.label} · ${index + 1}` : group.label,
      row,
    }));
  });
  const maxSteps = Math.max(1, ...tracks.map(({ row }) => row?.stepTrace?.length ?? 0));
  return <Box component="section" aria-label="同题操作轨迹" sx={{ borderTop: '1px solid #E8ECEF', pt: 2, mt: 1, minWidth: 0 }}>
    <TaskStepRing rows={rows} mode={mode} groups={groups} tasks={tasks} selected={task} onSelect={setSelectedTask} />
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
      <h4>同题操作轨迹</h4>
      <ChartTaskSelect tasks={tasks} value={task} onChange={setSelectedTask} label="轨迹题目" />
    </Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5, fontSize: 12, color: 'text.secondary' }}>
      {Object.values(traceStates).map(state => <span key={state.label}><span aria-hidden="true" style={{ color: state.color }}>{state.mark}</span> {state.label}</span>)}
    </Box>
    <Box sx={{ overflowX: 'auto', maxWidth: '100%' }} tabIndex={0} aria-label={`${task} 逐步操作对照`} role="group">
      <Box sx={{ display: 'grid', gridTemplateColumns: `128px repeat(${maxSteps}, minmax(25px, 1fr))`, minWidth: 128 + maxSteps * 25, alignItems: 'center', rowGap: 1, py: 0.5 }}>
        <Box sx={{ gridRow: 1, fontSize: 12, color: 'text.secondary' }}>环境步数</Box>
        {Array.from({ length: maxSteps }, (_, index) => <Box key={index} sx={{ gridRow: 1, gridColumn: index + 2, textAlign: 'center', fontSize: 11, color: 'text.secondary' }}>
          {index + 1}
        </Box>)}
        {tracks.map(({ key, label, row }, trackIndex) => {
          const gridRow = trackIndex + 2;
          const trace = row?.stepTrace;
          const outcome = row?.score === 100 ? '成功' : row?.score === 0 ? '未成功' : '结果未知';
          return <Box key={key} sx={{ display: 'contents' }}>
            <Box sx={{ gridRow, gridColumn: 1, fontSize: 12, lineHeight: 1.45 }}>
              <strong>{label}</strong><br />
              <Box component="span" sx={{ color: 'text.secondary' }}>{trace?.length ? `${outcome} · ${trace.length} 步` : '轨迹缺测'}</Box>
            </Box>
            {trace?.map((value, index) => {
              const state = traceState(value);
              const description = `${label}第 ${index + 1} 步：${state.label}${index === trace.length - 1 ? `，结束（${outcome}）` : ''}`;
              return <Box key={index} role="img" aria-label={description} title={description} sx={{
                gridRow, gridColumn: index + 2, textAlign: 'center', lineHeight: '28px', height: 28,
                fontWeight: 700, color: state.color, bgcolor: `${state.color}12`, borderBlock: '1px solid #E8ECEF',
                borderRight: index === trace.length - 1 ? '2px solid currentColor' : '1px solid #E8ECEF',
              }}>{state.mark}</Box>;
            })}
          </Box>;
        })}
      </Box>
    </Box>
    <Box component="p" sx={{ color: 'text.secondary', fontSize: 12, mb: 0 }}>动作被环境接受不代表任务取得进展。不同模型使用的控制器不同，轨迹反映实验配置下的行为差异。</Box>
  </Box>;
}

const stepOutcomes = [
  { score: 100, name: '成功', color: '#118D57' },
  { score: 0, name: '未成功', color: '#D47716' },
];

const actionMetrics = [
  { key: 'invalidActions', name: '无效动作', color: '#D47716' },
  { key: 'repeatedActions', name: '重复动作', color: '#1877F2' },
] as const;

function stepDistribution(rows: Row[], mode: Mode, groups: Group[]): EChartsOption {
  return {
    ...chartBase,
    tooltip: { ...chartBase.tooltip, trigger: 'item' },
    grid: { ...chartBase.grid, top: 28 },
    xAxis: diagnosticAxis(groups),
    yAxis: { type: 'value', name: '环境步数', min: 0, minInterval: 1 },
    series: stepOutcomes.map(result => ({
      name: result.name, type: 'boxplot', dimensions: ['最少', '第 25 百分位', '中位数', '第 75 百分位', '最多'],
      itemStyle: { color: `${result.color}33`, borderColor: result.color },
      data: groups.map(group => {
        const steps = rows.filter(row => groupKey(row, mode) === group.key && row.score === result.score)
          .flatMap(row => row.environmentSteps == null ? [] : [row.environmentSteps]).sort((left, right) => left - right);
        if (!steps.length) return [NaN, NaN, NaN, NaN, NaN];
        return [0, 0.25, 0.5, 0.75, 1].map(fraction => {
          const index = fraction * (steps.length - 1);
          const lower = Math.floor(index);
          return steps[lower] + (steps[Math.ceil(index)] - steps[lower]) * (index - lower);
        });
      }),
    })),
  };
}

function actionShares(rows: Row[], mode: Mode, groups: Group[]): EChartsOption {
  return {
    ...chartBase,
    tooltip: { ...chartBase.tooltip, valueFormatter: value => typeof value === 'number' ? `${format(value)}%` : '缺测' },
    grid: { ...chartBase.grid, top: 28 },
    xAxis: diagnosticAxis(groups),
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: actionMetrics.map(metric => ({
      name: metric.name, type: 'bar', barMaxWidth: 36, itemStyle: { color: metric.color },
      data: groups.map(group => {
        let actions = 0;
        let steps = 0;
        for (const row of rows) {
          const count = row[metric.key];
          if (groupKey(row, mode) !== group.key || row.environmentSteps == null || row.environmentSteps <= 0 || count == null || count > row.environmentSteps) continue;
          actions += count;
          steps += row.environmentSteps;
        }
        return steps ? 100 * actions / steps : null;
      }),
      label: { show: true, position: 'top', formatter: point => typeof point.value === 'number' ? `${format(point.value)}%` : '' },
    })),
  };
}

const testOutcomes = [
  { name: '两项均通过', color: '#118D57', includes: (row: Row) => row.baseStatus === 'pass' && row.plusStatus === 'pass' },
  { name: '基础通过、加强未过', color: '#D47716', includes: (row: Row) => row.baseStatus === 'pass' && row.plusStatus === 'fail' },
  { name: '基础未通过', color: '#DF5366', includes: (row: Row) => row.baseStatus === 'fail' },
];

function testBreakdown(rows: Row[], mode: Mode, groups: Group[]): EChartsOption {
  return {
    ...chartBase,
    grid: { ...chartBase.grid, top: 28 },
    xAxis: diagnosticAxis(groups),
    yAxis: { type: 'value', min: 0, minInterval: 1, name: '首轮记录数' },
    series: testOutcomes.map(outcome => ({
      name: outcome.name, type: 'bar', stack: 'tests', barMaxWidth: 64, itemStyle: { color: outcome.color },
      data: groups.map(group => {
        const records = rows.filter(row => groupKey(row, mode) === group.key);
        return records.length ? records.filter(outcome.includes).length : null;
      }),
      label: { show: true, position: 'inside', color: '#fff', formatter: point => typeof point.value === 'number' && point.value >= 4 ? String(point.value) : '' },
    })),
  };
}

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

type LegendShape = 'bar' | 'line' | 'dot';

function ChartLegend({ title, shape, items }: {
  title: string;
  shape: LegendShape;
  items: readonly { name: string; color: string; count?: number }[];
}) {
  if (items.length === 0) return null;

  return (
    <ul className="chart-legend" aria-label={`${title}图例`}>
      {items.map(({ name, color, count }) => (
        <li key={name}>
          <span className={`legend-mark ${shape}`} style={{ backgroundColor: color }} aria-hidden="true" />
          {name}{count !== undefined && <small>{count ? `${count} 条` : '缺测'}</small>}
        </li>
      ))}
    </ul>
  );
}

type ChartView = {
  id: ChartId;
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  legendShape?: LegendShape;
  includes: (row: Row) => boolean;
  option?: (observations: Row[]) => EChartsOption;
  analysis: (observations: Row[]) => string;
};

export function DetailCharts({ dataset, mode, groups, rows, hidden, token, onTokenChange }: {
  dataset: Dataset;
  mode: Mode;
  groups: Group[];
  rows: Row[];
  hidden: string[];
  token: TokenMetric;
  onTokenChange: (metric: TokenMetric) => void;
}) {
  const [selectedView, setView] = useState<ChartId | 'overview'>('overview');
  const showResourceRelations = dataset.id === 'hss' || dataset.id === 'wildbench';
  const activeGroups = groups.filter(group => !hidden.includes(group.key));
  const scored = (row: Row) => row.score !== null;
  const chartViews: ChartView[] = [
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
  const views = showResourceRelations ? chartViews : chartViews.filter(chart => chart.id !== 'time' && chart.id !== 'token');
  if (dataset.id === 'alfworld') views.push({
    id: 'behavior', title: '操作行为', icon: Workflow,
    subtitle: '正式首轮 · 步数按成功状态分组，动作占比按实验条件汇总',
    includes: row => row.environmentSteps != null,
    analysis: () => '箱体为第 25 至第 75 百分位，横线为中位数，须线为最少与最多。占比分别用动作次数除以对应有记录的环境步数，两类动作可重叠。模型通道和控制器不同，步数差异不宜仅归因于模型。',
  });
  if (dataset.id === 'humanevalplus') views.push({
    id: 'test-results', title: 'Base／Plus 测试结果', icon: ListChecks,
    subtitle: '正式首轮 · Base 为基础测试，Plus 为加强测试 · 缺少任一判定的记录不计入',
    includes: row => row.baseStatus != null && row.plusStatus != null,
    option: observations => testBreakdown(observations, mode, activeGroups),
    analysis: observations => activeGroups.flatMap(group => {
      const records = observations.filter(row => groupKey(row, mode) === group.key);
      return records.length ? [`${group.label}：${testOutcomes.map(outcome => `${outcome.name} ${records.filter(outcome.includes).length} 条`).join('，')}`] : [];
    }).join('；') + '。',
  });
  const view = views.some(chart => chart.id === selectedView) ? selectedView : 'overview';
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
                style={chart.id !== 'score' && chart.id !== 'requests' ? { gridColumn: '1 / -1' } : undefined}>
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
                {chart.legendShape && (
                  <ChartLegend title={chart.title} shape={chart.legendShape} items={activeGroups.map(group => ({
                    name: group.label,
                    color: group.color,
                    count: eligible.filter(row => groupKey(row, mode) === group.key).length,
                  }))} />
                )}
                {chart.id === 'test-results' && observations.length > 0 && (
                  <ChartLegend title={chart.title} shape="bar" items={testOutcomes} />
                )}
                {observations.length === 0 ? <p className="chart-empty">当前筛选条件下没有可绘制的记录。</p>
                  : chart.id === 'behavior' ? <>
                    <ChartLegend title="环境步数分布" shape="bar" items={stepOutcomes} />
                    <Chart option={stepDistribution(observations, mode, activeGroups)} label="成功与未成功的环境步数分布" height={270} />
                    <ChartLegend title="动作占比" shape="bar" items={actionMetrics} />
                    <Chart option={actionShares(observations, mode, activeGroups)} label="无效动作与重复动作占比" height={270} />
                    <div className="behavior-charts">
                      <TaskActionTrace rows={observations} mode={mode} groups={activeGroups} />
                    </div>
                  </> : chart.option ? <Chart option={chart.option(observations)} label={chart.title} height={overview ? 270 : 390} />
                    : <ResourceSmallMultiples rows={observations} dataset={dataset} mode={mode} groups={activeGroups} axis={chart.id === 'time' ? 'seconds' : token} />}
                {!overview && (
                  <div className="chart-analysis">
                    <h4>图表分析</h4>
                    <p>{observations.length ? chart.analysis(observations) : '可调整任务类型、共同题目或实验条件后查看。'}</p>
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
