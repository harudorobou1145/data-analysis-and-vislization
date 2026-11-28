import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/import-collaborative.mjs <official_scores.json>');
const report = JSON.parse(await readFile(source, 'utf8'));
const configurations = ['candidate_sol_low', 'candidate_sol_high', 'candidate_sol_ultra', 'candidate_luna_high', 'candidate_deepseek_high'];
if (report.complete !== true || report.problems?.length || report.missing_runs?.length) throw new Error('The score report is incomplete');

function outcome(value) {
  if (value === 0 || value === 1) return value === 1;
  if (value === null) return null;
  throw new Error(`Expected binary or missing outcome, got ${value}`);
}

const groups = Object.fromEntries(configurations.map(key => {
  const cells = report.cells[key];
  if (!cells) throw new Error(`Missing configuration: ${key}`);
  const rows = Object.entries(cells).flatMap(([dimension, cell]) => cell.scenarios.map(scenario => {
    const prefix = `benchmark/scenarios/${dimension}/`;
    const id = scenario.path.slice(prefix.length);
    if (!scenario.path.startsWith(prefix) || !/^[\w-]+$/.test(id) || !/^[\w-]+$/.test(dimension)) throw new Error('Invalid scenario identifier');
    if (typeof scenario.gated !== 'boolean' || scenario.expected_seeds?.length !== 1 || scenario.expected_seeds[0] !== 0) throw new Error(`Unexpected gate or seed: ${id}`);
    return { id, dimension, solo: outcome(scenario.gate), control: outcome(scenario.control), test: outcome(scenario.manipulation), eligible: scenario.gated };
  }));
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error(`Duplicate scenario in ${key}`);
  return [key, rows];
}));

const reference = groups[configurations[0]];
for (const rows of Object.values(groups)) {
  if (!reference.length || rows.length !== reference.length || reference.some(row => !rows.some(other => other.id === row.id && other.dimension === row.dimension))) throw new Error('Configuration scenario sets do not match');
}

await writeFile(new URL('../src/collaborative-results.json', import.meta.url), `${JSON.stringify(groups, null, 2)}\n`, 'utf8');
console.table(configurations.map(key => ({ configuration: key, scenarios: groups[key].length, eligible: groups[key].filter(row => row.eligible && row.control !== null && row.test !== null).length })));