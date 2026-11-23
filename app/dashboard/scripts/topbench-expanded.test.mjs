import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commonCases, summarize, pairedFlows } from '../src/topbench-data.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/processed/topbench3');
const pointerFile = path.join(root, 'active_visualization.json');

test('unified dashboard uses all 80 cases while retaining source provenance', { skip: !fs.existsSync(pointerFile) }, () => {
  const pointer = JSON.parse(fs.readFileSync(pointerFile, 'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join(root, pointer.relative_path), 'utf8'));
  assert.equal(data.cases.length, 80);
  assert.equal(data.runs.length, 240);
  assert.equal(new Set(data.cases.map(c => c.source_task_id)).size, 80);
  assert.equal(data.metadata.default_cohort, 'all');
  assert.equal(commonCases(data).length, 80);
  assert.deepEqual(summarize(data.runs, commonCases(data).map(c => c.task_id)).map(s => s.n), [80,80,80]);
  for (const [cohort, n, perDomain, perDifficulty, perCell] of [['initial20',20,4,5,1], ['extension60',60,12,15,3], ['all',80,16,20,4]]) {
    const cases = commonCases(data, 'all', 'all', cohort);
    assert.equal(cases.length, n);
    assert.deepEqual(summarize(data.runs, cases.map(c => c.task_id)).map(s => s.n), [n,n,n]);
    for (const domain of data.metadata.domains) {
      assert.equal(commonCases(data, domain, 'all', cohort).length, perDomain);
      for (const difficulty of data.metadata.difficulties) assert.equal(commonCases(data, domain, difficulty, cohort).length, perCell);
    }
    for (const difficulty of data.metadata.difficulties) assert.equal(commonCases(data, 'all', difficulty, cohort).length, perDifficulty);
    for (const strategy of ['tnm','cbd']) assert.equal(pairedFlows(data.runs, cases.map(c => c.task_id), strategy).flatMap(f => f.tasks).length, n);
  }
});
