import { useState } from 'react';
import type { EChartsOption } from 'echarts';
import { ListItemButton, MenuItem, Select } from '@mui/material';
import { BarChart3, ChevronRight, Clock3, Grid2X2, Hash, LineChart } from 'lucide-react';
import { Chart } from './Chart';
import { format, groupKey, mean, median, taskMean } from './data';
import type { Dataset, Group, Mode, Row } from './data';

export type TokenMetric = 'total' | 'output' | 'reasoning';
type ScatterAxis = 'seconds' | TokenMetric;
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
    grid: { left: 48, right: 24, top: 28, bottom: 72 },
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

function scatterOption(rows: Row[], dataset: Dataset, mode: Mode, groups: Group[], axis: ScatterAxis, label: string): EChartsOption {
  return {
    ...chartBase,
    tooltip: {
      trigger: 'item', confine: true, renderMode: 'richText', formatter: parameters => {
        const item = Array.isArray(parameters) ? parameters[0] : parameters;
        const values = item.value as [number, number, string];
        return `${item.seriesName}\n${values[2]}\n${label}：${format(values[0])}\n${dataset.metric}：${format(values[1])}`;
      },
    },
    xAxis: {
      type: 'value', name: label, nameLocation: 'middle', nameGap: 30, splitLine: { show: false },
      axisLabel: { formatter: value => value >= 1000 ? `${format(value / 1000, 1)}k` : String(value) },
    },
    yAxis: { type: 'value', min: 0, max: dataset.max, splitLine: { lineStyle: { type: 'dashed', color: '#EDEFF2' } } },
    series: groups.map(group => ({
      name: group.label, type: 'scatter', symbolSize: 7,
      itemStyle: { color: group.color, opacity: 0.65 },
      data: rows.filter(row => groupKey(row, mode) === group.key).map(row => [row[axis], row.score, row.task]),
    })),
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

function requestAnalysis(rows: Row[], dataset: Dataset) {
  const scores = rows.flatMap(row => row.score === null ? [] : [row.score]);
  const atMax = scores.filter(score => score === dataset.max).length;
  const unit = dataset.max === 100 ? '%' : ' 分';
  return `${scores.length} 条有效评分中，有 ${atMax} 条达到满分（${format(atMax / scores.length * 100, 1)}%）。${dataset.metric}落在 ${format(Math.min(...scores))}${unit}至 ${format(Math.max(...scores))}${unit}之间。横轴是各条件内的请求序号，可用来定位低分样本。`;
}

function scatterAnalysis(rows: Row[], dataset: Dataset, mode: Mode, groups: Group[], axis: ScatterAxis) {
  const scoreUnit = dataset.max === 100 ? '%' : ' 分';
  const costUnit = axis === 'seconds' ? ' 秒' : ' Token';
  const summaries = groups.flatMap(group => {
    const sample = rows.filter(row => groupKey(row, mode) === group.key);
    if (sample.length === 0) return [];
    const cost = median(sample.map(row => row[axis]));
    const score = mean(sample.map(row => row.score));
    return [`${group.label}（${sample.length} 条）为 ${format(cost, 1)}${costUnit}、${format(score)}${scoreUnit}`];
  });
  return `同时具备评分与${axis === 'seconds' ? '耗时' : tokenLabels[axis]}记录的请求中，各条件的资源消耗中位数与请求平均${dataset.metric}分别是 ${summaries.join('；')}。散点展示的是这些请求的观测关系，不能据此判断增加消耗是否会提高评分。`;
}

type ChartView = {
  id: ChartId;
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  legendShape: 'bar' | 'line' | 'dot';
  includes: (row: Row) => boolean;
  option: (observations: Row[]) => EChartsOption;
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
      subtitle: '每个点对应一条请求 · 横轴单位为秒',
      includes: row => scored(row) && row.seconds !== null,
      option: observations => scatterOption(observations, dataset, mode, activeGroups, 'seconds', '响应耗时（秒）'),
      analysis: observations => scatterAnalysis(observations, dataset, mode, activeGroups, 'seconds'),
    },
    {
      id: 'token', title: '评分与 Token 消耗', icon: Hash, legendShape: 'dot',
      subtitle: '每个点对应一条请求 · 输出 Token 已包含推理 Token',
      includes: row => scored(row) && row[token] !== null,
      option: observations => scatterOption(observations, dataset, mode, activeGroups, token, tokenLabels[token]),
      analysis: observations => scatterAnalysis(observations, dataset, mode, activeGroups, token),
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
            <ChevronRight className="chart-nav-arrow" size={14} aria-hidden="true" />
          </ListItemButton>
        ))}
      </nav>
      <div className="chart-results">
        <div className={overview ? 'detail-chart-grid' : 'detail-chart-grid single-chart'}>
          {currentViews.map(chart => {
            const eligible = rows.filter(chart.includes);
            const observations = eligible.filter(row => !hidden.includes(groupKey(row, mode)));
            return (
              <section className="panel chart-panel" key={chart.id} aria-labelledby={`chart-${chart.id}-title`}>
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
                {observations.length > 0
                  ? <Chart option={chart.option(observations)} label={chart.title} height={overview ? 270 : 390} />
                  : <p className="chart-empty">当前筛选条件下没有可绘制的记录。</p>}
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
