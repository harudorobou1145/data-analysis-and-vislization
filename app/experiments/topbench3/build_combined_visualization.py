"""Combine two immutable, nonoverlapping sources for one 80-case dashboard.

Run only after the extension's finish_export and prepare_visualization. No APIs.
The old 20-case payload is never rewritten. The active pointer changes last.
"""
from collections import Counter
import json
from pathlib import Path

import protocol as p
from prepare_visualization import rates

BASE = 'topbench3_sol_high_prompts20_v1'
NEW = 'topbench3_sol_high_prompts60_extension_v1'
COMBINED = 'topbench3_sol_high_prompts80_combined_v1'
ROOT = p.ROOT / 'data/processed/topbench3'


def build():
    sources = [ROOT / name / 'visualization/dashboard_data.json' for name in (BASE, NEW)]
    payloads = [p.load(file) for file in sources]
    combined = {key: [] for key in ('runs', 'cases', 'requests', 'tool_graphs', 'paired_outcome_changes')}
    for group, expected, value in zip(('initial20', 'extension60'), (20, 60), payloads):
        assert len(value['cases']) == expected and len(value['runs']) == expected * 3
        assert all(c['paired_complete'] for c in value['cases'])
        for key in combined:
            combined[key].extend(dict(**item, cohort_id=group) for item in value[key])
    assert len({c['source_task_id'] for c in combined['cases']}) == 80, 'Original/extension overlap'
    assert len({c['task_id'] for c in combined['cases']}) == 80, 'Task aliases overlap'
    assert len({r['run_id'] for r in combined['runs']}) == 240
    cells = Counter((c['privacy_domain'], c['difficulty']) for c in combined['cases'])
    assert len(cells) == 20 and set(cells.values()) == {4}
    combined['metadata'] = dict(payloads[0]['metadata'], experiment_id=COMBINED,
        planned_cases=80, paired_cases=80, default_cohort='all',
        cohorts=[dict(id='extension60', name='新增60题', case_count=60, experiment_id=NEW),
                 dict(id='initial20', name='原20题', case_count=20, experiment_id=BASE)],
        sampling='Original 1 plus 3 nonoverlapping new cases per 5 x 4 cell; cohort membership retained')
    combined['summaries'] = [dict(strategy=s, **rates([r for r in combined['runs'] if r['strategy']==s]))
                             for s in ('baseline','tnm','cbd')]
    combined['segments'] = [dict(strategy=s, dimension=d, category=c,
                                **rates([r for r in combined['runs'] if r['strategy']==s and r[d]==c]))
                           for s in ('baseline','tnm','cbd') for d in ('privacy_domain','difficulty')
                           for c in sorted({r[d] for r in combined['runs']})]
    destination = ROOT / COMBINED / 'visualization'
    p.save(destination/'dashboard_data.json', combined)
    report = dict(distinct_cases=80, runs=240, additional_cases=60, additional_groups=180,
                  total_http_attempts=len(combined['requests']), original_case_overlap=0,
                  cells={f'{d}/{level}': n for (d,level),n in sorted(cells.items())},
                  request_statuses=dict(Counter(r['status'] for r in combined['requests'])),
                  sources={file.relative_to(p.ROOT).as_posix(): p.digest(file.read_bytes()) for file in sources},
                  default_cohort='all', prices_verified=False, amount_spent=None)
    incident = p.RAW / NEW / 'transport_incidents/socket_block_001/incident.json'
    if incident.exists():
        report['local_transport_incident'] = p.load(incident)
    p.save(destination/'quality_report.json', report)
    p.save(destination/'manifest.json', dict(inputs=report['sources'],
        builder_sha256=p.digest(Path(__file__).read_bytes()),
        outputs={name:p.digest((destination/name).read_bytes()) for name in ('dashboard_data.json','quality_report.json')}))
    p.save(ROOT/'active_visualization.json', dict(schema_version=1,
        relative_path=f'{COMBINED}/visualization/dashboard_data.json', default_cohort='all'))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
