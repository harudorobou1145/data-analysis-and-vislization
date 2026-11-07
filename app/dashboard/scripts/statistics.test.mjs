import test from 'node:test';
import assert from 'node:assert/strict';
import { groupsFor, inMode, matchingTasks, mean, median, taskMean } from '../src/data.ts';

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