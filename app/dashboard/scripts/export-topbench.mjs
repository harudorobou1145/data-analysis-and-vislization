import fs from 'node:fs';
import path from 'node:path';

export function exportTopbench(dataRoot, publicRoot) {
  const topRoot = path.resolve(dataRoot, 'topbench3');
  const pointer = path.join(topRoot, 'active_visualization.json');
  const relative = fs.existsSync(pointer) ? JSON.parse(fs.readFileSync(pointer, 'utf8')).relative_path : 'topbench3_sol_high_prompts20_v1/visualization/dashboard_data.json';
  if (typeof relative !== 'string') throw new Error('Invalid TOP-Bench active pointer');
  const source = path.resolve(topRoot, relative);
  if (!source.startsWith(topRoot + path.sep)) throw new Error('TOP-Bench source must stay inside its data directory');
  if (!fs.existsSync(source)) throw new Error('TOP-Bench display data missing. Run app/experiments/topbench3/prepare_visualization.py first.');
  const data = JSON.parse(fs.readFileSync(source, 'utf8'));
  if (data.metadata?.schema_version !== 'topbench-viz-1' || data.runs.length !== data.metadata.planned_cases * 3 || data.cases.length !== data.metadata.planned_cases) throw new Error('Unexpected TOP-Bench data version or coverage');
  if (new Set(data.cases.map(c => c.source_task_id)).size !== data.cases.length) throw new Error('Duplicate TOP-Bench source case');
  for (const c of data.cases) {
    const rows = data.runs.filter(r => r.task_id === c.task_id);
    if (rows.length !== 3 || new Set(rows.map(r => r.strategy)).size !== 3 || rows.some(r => r.evaluation_status !== 'completed')) throw new Error('Incomplete TOP-Bench paired case');
  }
  const forbidden = new Set(['content', 'prompt_text', 'answer', 'return_data', 'sensitive_conclusion', 'api_key', 'authorization']);
  function check(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key.toLowerCase())) throw new Error(`Private TOP-Bench field: ${key}`);
      check(child);
    }
  }
  check(data);
  fs.mkdirSync(publicRoot, { recursive: true });
  fs.writeFileSync(path.join(publicRoot, 'topbench-data.json'), JSON.stringify(data));
  return data;
}
