import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { appRoot, exportData } from './export-data.mjs';

test('HSS supplement fills the same 20 tasks with audited DeepSeek high scores', () => {
  const root = path.resolve(appRoot, '../../data/processed');
  const data = exportData(root);
  const hss = data.rows.filter(row => row.dataset === 'hss');
  const deepseek = hss.filter(row => row.model === 'deepseek-flash');
  const solHigh = hss.filter(row => row.model === 'gpt-6.1-sol' && row.effort === 'high');
  assert.equal(hss.length, 100);
  assert.equal(deepseek.length, 20);
  assert.deepEqual([...new Set(deepseek.map(row => row.task))].sort(), [...new Set(solHigh.map(row => row.task))].sort());
  assert.ok(deepseek.every(row => row.effort === 'high' && row.status === 'completed' && row.phase === 'formal'));
  assert.ok(deepseek.every(row => typeof row.score === 'number' && row.score >= 0 && row.score <= 10));
  const source = fs.readFileSync(path.join(root, 'hss/deepseek-flash/wty_results.jsonl'), 'utf8')
    .trim().split('\n').map(line => JSON.parse(line));
  for (const row of source) {
    assert.ok(Math.abs(row.score_10 - row.criteria_met / row.criteria_total * 10) < 1e-10);
    assert.ok(row.answer_hash && row.judge_request_id && row.request_id);
    assert.ok(!('answer' in deepseek.find(metric => metric.task === String(row.task_id))));
    assert.equal(row.framework, 'codex_app_server');
  }
});
