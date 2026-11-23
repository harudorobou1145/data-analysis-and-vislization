"""60 NEW cases: 3 per domain/difficulty cell, excluding the original 20.

Reuses the frozen original protocol/engine without changing its fingerprints.
No paid requests without --execute. Credentials are held in process memory only.
"""
import argparse
from collections import Counter
import copy
import getpass
import itertools
import json
import os
import random

import protocol as p
import runner as r

EXPERIMENT = 'topbench3_sol_high_prompts60_extension_v1'
BASE = 'topbench3_sol_high_prompts20_v1'
SEED = 2026112303


def prepare():
    destination = r.plan_path(EXPERIMENT)
    if destination.exists():
        return validate()[0]
    base, _, _ = r.validate(BASE)
    excluded = {c['source_task_id'] for c in base['cases']}
    rows = [c for c in p.dataset() if c['scenario_input_id'] not in excluded]
    selected = p.stratified(rows, 60, SEED)
    cfg = copy.deepcopy(base['config'])
    cfg.update(default_case_count=60, seed=SEED, max_total_http_attempts=960)
    manifest = copy.deepcopy(base)
    permutations = list(itertools.permutations(cfg['strategies']))
    random.Random(SEED).shuffle(permutations)
    cases, matrix = [], []
    for index, row in enumerate(selected, 1):
        case = dict(task_id=f'TOP{index+20:03d}', source_task_id=row['scenario_input_id'], position=index,
                    privacy_domain=row['privacy_domain'], difficulty=row['difficulty_plan']['difficulty'],
                    content_sha256=p.digest(p.canonical(row)))
        cases.append(case)
        for strategy in permutations[(index-1) % len(permutations)]:
            identity = dict(experiment_id=EXPERIMENT, task_id=case['task_id'], source_task_id=case['source_task_id'],
                            strategy=strategy, model=cfg['model'], reasoning_effort=cfg['reasoning_effort'],
                            repeat=1, mode='two_stage_fixture')
            matrix.append(dict(**identity, combination_id=p.digest(p.canonical(identity))[:24]))
    manifest.update(experiment_id=EXPERIMENT, seed=SEED, selected_distinct_cases=60, cases=cases, matrix=matrix, config=cfg,
                    sampling='3 new cases per 5 domain x 4 difficulty cell; original 20 excluded before random sampling',
                    excluded_experiment=BASE, excluded_source_task_ids=sorted(excluded),
                    excluded_plan_sha256=p.digest(r.plan_path(BASE).read_bytes()),
                    extension_adapter_sha256=p.digest(p.HERE.joinpath('expand60.py').read_bytes()))
    p.save(destination, manifest)
    p.save(r.cohort(EXPERIMENT)/'experiment.json', manifest)
    with (r.cohort(EXPERIMENT)/'selected_cases.jsonl').open('w', encoding='utf-8') as stream:
        for row in selected:
            stream.write(json.dumps(row, ensure_ascii=False)+'\n')
    return validate()[0]


def validate():
    manifest, prompts, cases = r.validate(EXPERIMENT)
    assert manifest['extension_adapter_sha256'] == p.digest(p.HERE.joinpath('expand60.py').read_bytes()), 'Extension adapter changed'
    assert manifest['excluded_plan_sha256'] == p.digest(r.plan_path(BASE).read_bytes()), 'Original plan changed'
    assert len(cases) == 60 and len(manifest['matrix']) == 180
    assert not set(cases).intersection(manifest['excluded_source_task_ids'])
    cells = Counter((c['privacy_domain'], c['difficulty']) for c in manifest['cases'])
    assert len(cells) == 20 and set(cells.values()) == {3}
    base = p.load(r.plan_path(BASE))
    for key, value in base['config'].items():
        if key not in ('default_case_count', 'seed', 'max_total_http_attempts'):
            assert manifest['config'][key] == value, 'Protocol condition changed: '+key
    assert p.digest(p.canonical(prompts)) == base['prompt_sha256']
    return manifest, prompts, cases


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'preview', 'all', 'status', 'export'], default='preview', nargs='?')
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--key-prompt', action='store_true')
    a = parser.parse_args()
    manifest = prepare()
    if a.command == 'prepare':
        print(json.dumps(dict(experiment_id=EXPERIMENT, new_cases=60, combinations=180,
                             original_case_overlap=0, expected_http_requests=720, model_requests=0)))
        return
    if a.command == 'status':
        rows = r.current_rows(EXPERIMENT)
        print(json.dumps(dict(records=len(rows), execution=dict(Counter(x['execution_status'] for x in rows)),
                              evaluation=dict(Counter(x['evaluation_status'] for x in rows))), indent=2))
        return
    if a.command == 'export':
        import finish_export
        finish_export.finish(EXPERIMENT)
        return
    if a.key_prompt and a.execute and not os.environ.get('CODEDEPTH_RELAY_API_KEY'):
        os.environ['CODEDEPTH_RELAY_API_KEY'] = getpass.getpass('Relay key (hidden): ')
    with p.controller_lock():
        manifest, prompts, cases = validate()
        arguments = argparse.Namespace(experiment_id=EXPERIMENT, command='all', execute=a.execute and a.command=='all',
                                      start=1, count=60, strategy=manifest['config']['strategies'])
        r.run_batch(arguments, manifest, prompts, cases)


if __name__ == '__main__':
    main()
