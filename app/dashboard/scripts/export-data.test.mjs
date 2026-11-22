import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { appRoot, definitions, exportData, normalize, numeric } from './export-data.mjs';
import { inMode } from '../src/data.ts';

test('missing values remain null and zero remains observed', () => {
  assert.equal(numeric(null), null);
  assert.equal(numeric(undefined), null);
  assert.equal(numeric(0), 0);
  const row = normalize({ run_id: 'test', model: 'sol', task_id: 'T', task_success: null, reasoning_effort: 'max' }, definitions[3], 'xwb');
  assert.equal(row.score, null);
  assert.equal(row.effort, 'max');
  assert.equal(row.seconds, null);
  assert.equal(normalize({ task_id: 154 }, definitions[6], 'wty').task, '154');
});

test('real export excludes repairs and private payloads, keeps formal and pilot datasets separate', () => {
  const data = exportData(path.resolve(appRoot, '../../data/processed'));
  assert.equal(data.rows.filter(row => row.dataset === 'humanevalplus').length, 600);
  assert.equal(data.rows.filter(row => row.dataset === 'alfworld').length, 300);
  assert.equal(data.rows.filter(row => row.dataset === 'gsm8k').length, 25);
  assert.equal(data.rows.filter(row => row.dataset === 'mt_bench').length, 20);
  const aliased = data.rows.filter(row => row.rawEffort === 'max' && row.effort === 'ultra');
  assert.equal(aliased.length, 160);
  assert.equal(aliased.filter(row => row.dataset === 'humanevalplus').length, 100);
  assert.equal(aliased.filter(row => row.dataset === 'alfworld').length, 60);
  assert.ok(aliased.every(row => inMode(row, 'depth') && !inMode(row, 'models') && row.phase === 'initial'));
  assert.equal(new Set(data.rows.map(row => row.id)).size, data.rows.length);
  for (const row of data.rows) {
    assert.ok(!['repair', 'auxiliary', 'supplement'].includes(row.phase));
    assert.ok(!('record_path' in row));
    assert.ok(!('token_usage' in row));
    assert.ok(row.score === null || Number.isFinite(row.score));
  }
});

test('ALFWorld exports aligned step states for all 60 shared High tasks', () => {
  const { rows } = exportData(path.resolve(appRoot, '../../data/processed'));
  const high = rows.filter(row => row.dataset === 'alfworld' && inMode(row, 'models'));
  assert.equal(high.length, 180);
  const tasks = new Map();
  for (const row of high) {
    assert.ok(Array.isArray(row.stepTrace), `${row.model}/${row.task} is missing a trace`);
    assert.equal(row.stepTrace.length, row.environmentSteps);
    assert.ok(row.stepTrace.every(state => state === null || typeof state === 'boolean'));
    if (!tasks.has(row.task)) tasks.set(row.task, new Set());
    tasks.get(row.task).add(row.model);
  }
  assert.equal(tasks.size, 60);
  assert.ok([...tasks.values()].every(models => models.size === 3));
  assert.ok(rows.filter(row => row.dataset !== 'alfworld').every(row => !('stepTrace' in row)));
});