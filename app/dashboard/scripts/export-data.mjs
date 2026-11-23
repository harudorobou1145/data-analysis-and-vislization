import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportTopbench } from './export-topbench.mjs';

export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const models = ['gpt-6.1-sol', 'gpt-6-luna', 'deepseek-flash'];
export const definitions = [
  { id: 'subjective_60', name: '主观评分 60 题', kind: '开放任务', metric: '主观质量分', max: 10, note: 'MT-Bench / BiGGen 混合集；同题重复回答分别保留，主图先按题目取均值。模型裁判评分存在天花板效应。' },
  { id: 'wildbench', name: 'WildBench', kind: '开放任务', metric: '主观质量分', max: 10, note: 'v2-hard 20 题，自定义模型裁判评分，不是官方榜单成绩。' },
  { id: 'hss', name: 'HSS 多模态', kind: '多模态', metric: '准则得分', max: 10, note: '按满足准则比例折算到 10 分；DeepSeek high于2026-11-22补测原20题，其余四组来自2026-11-06。API日期、客户端及上游动态模型版本的变化可能影响比较。' },
  { id: 'humanevalplus', name: 'HumanEval+', kind: '代码任务', metric: '通过率', max: 100, note: '只纳入正式首轮；Base 与 Plus 都通过才记为通过。Sol 的原始 max 按本次实验口径归入 Ultra。' },
  { id: 'alfworld', name: 'ALFWorld', kind: '交互任务', metric: '成功率', max: 100, note: '只纳入正式首轮，按官方环境结果判定。Sol 的原始 max 按本次实验口径归入 Ultra；模型通道与控制器不同。' },
  { id: 'gsm8k', name: 'GSM8K 预实验', kind: '预实验', metric: '正确率', max: 100, note: '每档仅 5 道题、单次运行，样本过小；不据此推断总体能力。' },
  { id: 'mt_bench', name: 'MT-Bench 预实验', kind: '预实验', metric: '主观质量分', max: 10, note: '仅 4 道题，当前指标索引未提供评分；只能分析耗时与 Token，评分图保持空白。' },
];

export function numeric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

const testStatus = value => value === 'pass' || value === 'fail' ? value : null;

export function normalize(row, definition, source) {
  const code = source === 'xwb';
  const rawEffort = (code ? row.reasoning_effort : row.effort) ?? 'unknown';
  const isUltraAlias = code && row.model === 'gpt-6.1-sol' && row.phase === 'initial'
    && rawEffort === 'max' && ['humanevalplus', 'alfworld'].includes(definition.id);
  const passed = code ? row.task_success : row.passed;
  const score = definition.max === 100
    ? (typeof passed === 'boolean' ? Number(passed) * 100 : null)
    : numeric(row.score_10);
  return {
    id: `${source}:${row.source_id ?? ''}:${row.run_id}`,
    dataset: definition.id,
    model: row.model,
    effort: isUltraAlias ? 'ultra' : rawEffort,
    rawEffort,
    task: String(row.task_id),
    type: row.task_type ?? '未分类',
    phase: row.phase,
    score: score !== null && score <= definition.max ? score : null,
    seconds: numeric(code ? row.duration_seconds : row.elapsed_seconds),
    input: numeric(code ? row.input_tokens : row.token_usage?.inputTokens),
    output: numeric(code ? row.output_tokens : row.token_usage?.outputTokens),
    reasoning: numeric(code ? row.reasoning_tokens : row.token_usage?.reasoningOutputTokens),
    total: numeric(code ? row.total_tokens : row.token_usage?.totalTokens),
    timestamp: code ? (row.start_time ?? null) : null,
    status: (code ? row.execution_status : row.status) ?? 'unknown',
    ...(code && definition.id === 'alfworld' ? {
      environmentSteps: numeric(row.environment_steps),
      invalidActions: numeric(row.invalid_action_count),
      repeatedActions: numeric(row.repeated_action_count),
    } : {}),
    ...(code && definition.id === 'humanevalplus' ? {
      baseStatus: testStatus(row.base_status),
      plusStatus: testStatus(row.plus_status),
    } : {}),
  };
}

function readStepEvents(directory) {
  const traces = new Map();
  const file = path.join(directory, 'tool_events.json');
  if (!fs.existsSync(file)) return traces;
  for (const event of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    if (event.phase !== 'initial' || event.tool_name !== 'step' || !Number.isInteger(event.event_index)) continue;
    if (!traces.has(event.run_id)) traces.set(event.run_id, []);
    traces.get(event.run_id).push(event);
  }
  return traces;
}

export function exportData(dataRoot) {
  const rows = [];
  const seen = new Set();
  const excluded = {};
  for (const definition of definitions) {
    for (const model of models) {
      const directory = path.join(dataRoot, definition.id, model);
      const code = ['humanevalplus', 'alfworld'].includes(definition.id);
      const file = path.join(directory, code ? 'runs.json' : 'wty_results.jsonl');
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const records = code ? JSON.parse(text) : text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      const traces = definition.id === 'alfworld' ? readStepEvents(directory) : null;
      for (const row of records) {
        const accepted = code ? row.phase === 'initial' : (definition.kind === '预实验' || row.phase === 'formal');
        if (!accepted) {
          const key = `${definition.id}/${row.phase}`;
          excluded[key] = (excluded[key] ?? 0) + 1;
          continue;
        }
        const record = normalize(row, definition, code ? 'xwb' : 'wty');
        const steps = traces?.get(row.run_id);
        if (steps?.length && steps.length === record.environmentSteps && new Set(steps.map(step => step.event_index)).size === steps.length) {
          record.stepTrace = steps.sort((left, right) => left.event_index - right.event_index)
            .map(step => typeof step.action_admissible === 'boolean' ? step.action_admissible : null);
        }
        if (seen.has(record.id)) throw new Error(`Duplicate identity: ${record.id}`);
        seen.add(record.id);
        rows.push(record);
      }
    }
  }
  return { datasets: definitions, rows, excluded };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = exportData(path.resolve(appRoot, '../../data/processed'));
  fs.mkdirSync(path.join(appRoot, 'public'), { recursive: true });
  fs.writeFileSync(path.join(appRoot, 'public/analysis-data.json'), JSON.stringify(data));
  exportTopbench(path.resolve(appRoot, '../../data/processed'), path.join(appRoot, 'public'));
  console.log(`Exported ${data.rows.length} metric-only records across ${data.datasets.length} datasets.`);
  for (const dataset of definitions) {
    console.log(dataset.id, data.rows.filter(row => row.dataset === dataset.id).length);
  }
}
