export type Row = {
  id: string; dataset: string; model: string; effort: string; task: string;
  type: string; phase: string; score: number | null; seconds: number | null;
  input: number | null; output: number | null; reasoning: number | null; total: number | null;
  timestamp: string | null; status: string;
};
export type Dataset = { id: string; name: string; kind: string; metric: string; max: number; note: string };
export type Data = { datasets: Dataset[]; rows: Row[]; excluded: Record<string, number> };
export type Mode = 'depth' | 'models';
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
  const keys: (keyof Row)[] = ['dataset', 'model', 'effort', 'task', 'type', 'phase', 'score', 'seconds', 'input', 'output', 'reasoning', 'total', 'timestamp', 'status', 'id'];
  const escape = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const csv = '\uFEFF' + [keys.join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}