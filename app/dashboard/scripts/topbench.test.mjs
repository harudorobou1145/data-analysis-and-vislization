import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commonCases, summarize, pairedFlows, outcome } from '../src/topbench-data.ts';
import { exportTopbench } from './export-topbench.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/processed');
const source = path.join(root, 'topbench3/topbench3_sol_high_prompts20_v1/visualization/dashboard_data.json');
const data = JSON.parse(fs.readFileSync(source, 'utf8'));

test('TOP-Bench keeps 20 paired cases and four request stages per run', () => {
  assert.equal(data.runs.length, 60);
  assert.equal(commonCases(data).length, 20);
  assert.equal(commonCases(data, 'BAL').length, 4);
  assert.equal(commonCases(data, 'all', 'D1').length, 5);
  assert.equal(commonCases(data, 'BAL', 'D1').length, 1);
  for (const run of data.runs) {
    assert.deepEqual(new Set(data.requests.filter(r => r.run_id === run.run_id).map(r => r.stage)), new Set(['selection', 'answer', 'completion', 'leakage']));
  }
});

test('unknown verdict removes the whole case from all three comparison denominators', () => {
  const copy = structuredClone(data);
  copy.runs.find(r => r.task_id === 'TOP001' && r.strategy === 'cbd').privacy_leaked = null;
  const cases = commonCases(copy);
  assert.equal(cases.length, 19);
  const summary = summarize(copy.runs, cases.map(c => c.task_id));
  assert.deepEqual(summary.map(r => r.n), [19, 19, 19]);
  assert.equal(outcome(copy.runs.find(r => r.task_id === 'TOP001' && r.strategy === 'cbd')), 'unknown');
});

test('summary recalculates group H rather than averaging per-case H', () => {
  const summary = summarize(data.runs, commonCases(data).map(c => c.task_id));
  assert.deepEqual(summary.map(s => s.cr), [.6, .45, .4]);
  assert.deepEqual(summary.map(s => s.lr), [.4, .25, .4]);
  assert.ok(Math.abs(summary[1].h - .5625) < 1e-12);
  const ids = ['TOP001', 'TOP002'];
  for (const s of summarize(data.runs, ids)) {
    const rows = data.runs.filter(r => ids.includes(r.task_id) && r.strategy === s.strategy);
    assert.equal(s.n, 2);
    assert.equal(s.cr, rows.filter(r => r.task_completed).length / 2);
    assert.equal(s.lr, rows.filter(r => r.privacy_leaked).length / 2);
  }
});

test('empty selection stays empty and never becomes zero success or full coverage', () => {
  for (const s of summarize(data.runs, [])) {
    assert.equal(s.n, 0); assert.equal(s.cr, null); assert.equal(s.lr, null); assert.equal(s.h, null); assert.equal(s.tokens, null);
  }
});

test('cohort selection excludes other batches while keeping all three strategies', () => {
  const copy = structuredClone(data);
  const early = new Set(copy.cases.slice(0, 10).map(c => c.task_id));
  for (const c of copy.cases) c.cohort_id = early.has(c.task_id) ? 'early' : 'new';
  for (const r of copy.runs) r.cohort_id = early.has(r.task_id) ? 'early' : 'new';
  for (const group of ['early', 'new']) {
    const cases = commonCases(copy, 'all', 'all', group);
    assert.equal(cases.length, 10);
    assert.ok(cases.every(c => c.cohort_id === group));
    assert.deepEqual(summarize(copy.runs, cases.map(c => c.task_id)).map(s => s.n), [10,10,10]);
  }
  assert.equal(commonCases(copy).length, 20);
});

test('Sankey links partition paired cases once per independent strategy comparison', () => {
  const ids = commonCases(data).map(c => c.task_id);
  for (const s of ['tnm', 'cbd']) {
    const flows = pairedFlows(data.runs, ids, s);
    const tasks = flows.flatMap(f => f.tasks);
    assert.equal(tasks.length, 20);
    assert.equal(new Set(tasks).size, 20);
    assert.deepEqual([...tasks].sort(), [...ids].sort());
    assert.equal(pairedFlows(data.runs, [ids[0]], s).flatMap(f => f.tasks).length, 1);
  }
});

test('export contains safe features and does not overwrite source', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'topbench-export-'));
  try {
    const before = fs.readFileSync(source, 'utf8');
    exportTopbench(root, dir);
    assert.equal(fs.readFileSync(source, 'utf8'), before);
    const exported = JSON.parse(fs.readFileSync(path.join(dir, 'topbench-data.json'), 'utf8'));
    assert.equal(exported.runs.length, exported.metadata.planned_cases * 3);
    const badRoot = path.join(dir, 'bad');
    const badSource = path.join(badRoot, 'topbench3/topbench3_sol_high_prompts20_v1/visualization');
    fs.mkdirSync(badSource, { recursive: true });
    const bad = structuredClone(data); bad.runs[0].answer = 'private benchmark answer';
    fs.writeFileSync(path.join(badSource, 'dashboard_data.json'), JSON.stringify(bad));
    assert.throws(() => exportTopbench(badRoot, path.join(dir, 'bad-public')), /Private TOP-Bench field/);
  } finally {
    const absolute = path.resolve(dir);
    assert.ok(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(absolute).startsWith('topbench-export-'));
    fs.rmSync(absolute, { recursive: true, force: true });
  }
});
