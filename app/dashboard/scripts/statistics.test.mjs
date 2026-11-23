import test from 'node:test';
import assert from 'node:assert/strict';
import { groupsFor, inMode, matchingTasks, mean, median, overviewStats, taskMean } from '../src/data.ts';

test('task averaging does not overweight repeats or replace missing values', () => {
  assert.equal(taskMean([{ task: 'A', score: 10 }, { task: 'A', score: 10 }, { task: 'B', score: 0 }]), 5);
  assert.equal(mean([0, null, 10]), 5);
  assert.equal(mean([null]), null);
  assert.equal(median([null, 0, 10]), 5);
});

test('common tasks intersect valid scores of observed conditions', () => {
  const rows = [
    { task: 'A', effort: 'low', score: 10 },
    { task: 'A', effort: 'high', score: 8 },
    { task: 'B', effort: 'low', score: 9 },
    { task: 'B', effort: 'high', score: null },
  ];
  assert.deepEqual(matchingTasks(rows, 'depth', groupsFor('depth')).map(row => row.task), ['A', 'A']);
});

test('selection preserves exact model names and max is not ultra', () => {
  assert.equal(inMode({ model: 'gpt-6.1-sol', effort: 'max' }, 'depth'), false);
  assert.equal(inMode({ model: 'gpt-6.1-sol', effort: 'ultra' }, 'depth'), true);
  assert.equal(inMode({ model: 'deepseek-v4.1-flash', effort: 'high' }, 'models'), false);
  assert.equal(inMode({ model: 'deepseek-flash', effort: 'high' }, 'models'), true);
});

test('overview counts strategies separately from model/effort conditions and excludes pilots', () => {
  const data = { datasets: [{ id: 'formal', kind: '代码任务' }, { id: 'pilot', kind: '预实验' }], rows: [
    { dataset: 'formal', model: 'gpt-6.1-sol', effort: 'high' },
    { dataset: 'formal', model: 'gpt-6.1-sol', effort: 'low' },
    { dataset: 'formal', model: 'deepseek-flash', effort: 'high' },
    { dataset: 'pilot', model: 'gpt-6.1-sol', effort: 'high' },
  ] };
  const top = { cases: Array(80), runs: Array(240) };
  assert.deepEqual(overviewStats(data, top, 'prompts'), { datasetsTotal: 2, datasetsCurrent: 1, recordsCurrent: 240, recordsTotal: 243 });
  assert.equal(overviewStats(data, top, 'depth').recordsCurrent, 2);
  assert.equal(overviewStats(data, top, 'models').recordsCurrent, 2);
  assert.equal(overviewStats(data, null, 'prompts').recordsCurrent, null);
});
