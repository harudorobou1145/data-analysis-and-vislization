export type Row = {
  id: string; dataset: string; model: string; effort: string; rawEffort: string; task: string;
  type: string; phase: string; score: number | null; seconds: number | null;
  input: number | null; output: number | null; reasoning: number | null; total: number | null;
  timestamp: string | null; status: string;
  environmentSteps?: number | null; invalidActions?: number | null; repeatedActions?: number | null;
  stepTrace?: (boolean | null)[];
  baseStatus?: 'pass' | 'fail' | null; plusStatus?: 'pass' | 'fail' | null;
};
export type Dataset = { id: string; name: string; kind: string; metric: string; max: number; note: string };
export type RepairChain = {
  task: string; effort: 'low' | 'high' | 'ultra'; attempts: number; evaluated: number;
  firstPass: number | null; status: 'solved' | 'exhausted' | 'interrupted';
};
export type Data = { datasets: Dataset[]; rows: Row[]; excluded: Record<string, number>; repairChains?: RepairChain[] };
export type Mode = 'depth' | 'models';
export type ComparisonDirection = Mode | 'prompts';
export type Group = { key: string; label: string; color: string };
export const modelNames: Record<string, string> = {
  'gpt-6.1-sol': 'GPT 6.1 Sol', 'gpt-6-luna': 'GPT 6 Luna', 'deepseek-flash': 'DeepSeek Flash',
};
export const groupsFor = (mode: Mode): Group[] => mode === 'depth'
  ? [{ key: 'low', label: 'Low', color: '#1877F2' }, { key: 'high', label: 'High', color: '#118D57' }, { key: 'ultra', label: 'Ultra', color: '#D47716' }]
  : [{ key: 'gpt-6.1-sol', label: 'GPT 6.1 Sol', color: '#1877F2' }, { key: 'gpt-6-luna', label: 'GPT 6 Luna', color: '#118D57' }, { key: 'deepseek-flash', label: 'DeepSeek Flash', color: '#D47716' }];
export const groupKey = (row: Row, mode: Mode) => mode === 'depth' ? row.effort : row.model;
export const inMode = (row: Row, mode: Mode) => mode === 'depth'
  ? row.model === 'gpt-6.1-sol' && ['low', 'high', 'ultra'].includes(row.effort)
  : row.effort === 'high' && Object.keys(modelNames).includes(row.model);
export function overviewStats(data: Data, top: { runs: unknown[]; cases: unknown[] } | null, direction: ComparisonDirection) {
  const datasets = new Set(data.datasets.filter(item => item.kind !== '预实验').map(item => item.id));
  const formal = data.rows.filter(row => datasets.has(row.dataset));
  return {
    datasetsTotal: datasets.size + (top ? 1 : 0),
    datasetsCurrent: direction === 'prompts' ? (top ? 1 : 0) : datasets.size,
    recordsCurrent: direction === 'prompts' ? (top?.runs.length ?? null) : formal.filter(row => inMode(row, direction)).length,
    recordsTotal: formal.length + (top?.runs.length ?? 0),
  };
}
export function mean(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
export function median(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null).sort((left, right) => left - right);
  const middle = Math.floor(valid.length / 2);
  return valid.length ? (valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2) : null;
}
export const format = (value: number | null, digits = 2) => value === null ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: digits });
export function taskMean(rows: Row[]) {
  const tasks = new Map<string, (number | null)[]>();
  for (const row of rows) tasks.set(row.task, [...(tasks.get(row.task) ?? []), row.score]);
  return mean([...tasks.values()].map(mean));
}
export function matchingTasks(rows: Row[], mode: Mode, groups: Group[]) {
  const present = groups.filter(group => rows.some(row => groupKey(row, mode) === group.key));
  const tasks = new Map<string, Set<string>>();
  for (const row of rows.filter(row => row.score !== null)) {
    if (!tasks.has(row.task)) tasks.set(row.task, new Set());
    tasks.get(row.task)!.add(groupKey(row, mode));
  }
  return rows.filter(row => present.every(group => tasks.get(row.task)?.has(group.key)));
}
export function downloadRows(rows: Row[], name: string) {
  const keys: (keyof Row)[] = ['dataset', 'model', 'effort', 'rawEffort', 'task', 'type', 'phase', 'score', 'seconds', 'input', 'output', 'reasoning', 'total', 'timestamp', 'status', 'id'];
  const diagnostics = ['environmentSteps', 'invalidActions', 'repeatedActions', 'baseStatus', 'plusStatus'] as const;
  keys.push(...diagnostics.filter(key => rows.some(row => row[key] !== undefined)));
  const escape = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const csv = '\uFEFF' + [keys.join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
