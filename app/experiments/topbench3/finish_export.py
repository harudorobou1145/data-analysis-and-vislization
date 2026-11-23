"""Analysis-only exports: no model calls, no edits to recorded judgments."""
from collections import Counter
import csv
import json
import random
from pathlib import Path

import protocol as p
import runner as r


def write_csv(path,rows,fields):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        writer.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in row.items()} for row in rows)


def finish(experiment='topbench3_sol_high_prompts20_v1'):
    manifest,prompts,cases=r.validate(experiment)
    summary=r.export(experiment)
    root=r.cohort(experiment);out=p.ROOT/'data/processed/topbench3'/experiment
    raw=r.current_rows(experiment);by_run={row['run_id']:row for row in raw}
    rows=p.load(out/'runs.json')
    for row in rows:
        source=by_run[row['run_id']]
        row.update(experiment_id=experiment,benchmark='TOP-Bench v3',source_commit=manifest['source_commit'],
                   mode='two_stage_fixture',judge_model=manifest['config']['judge_model'],
                   judge_reasoning_effort=manifest['config']['judge_reasoning_effort'],
                   judge_reasoning_tokens=source.get('judge_reasoning_tokens'),
                   judge_cached_input_tokens=source.get('judge_cached_input_tokens'))
    p.save(out/'runs.json',rows)
    write_csv(out/'runs.csv',rows,list(rows[0]) if rows else ['run_id'])
    requests=[];graphs=[]
    for row in rows:
        folder=root/'attempts'/row['run_id']
        for stage in r.STAGES:
            for attempt in sorted((folder/'stages'/stage/'attempts').glob('*')):
                status=p.load(attempt/'status.json') if (attempt/'status.json').exists() else {'status':'running'}
                response=p.load(attempt/'response.json') if (attempt/'response.json').exists() else {}
                record={k:row[k] for k in ('experiment_id','run_id','task_id','source_task_id','strategy','privacy_domain','difficulty')}
                record.update(stage=stage,phase='solver' if stage in r.STAGES[:2] else 'judge',attempt_id=attempt.name,
                              status=status['status'],started_at=status.get('started_at'),ended_at=status.get('ended_at'),
                              duration_seconds=status.get('duration_seconds'),failure_category=status.get('failure_category'),
                              response_id=response.get('id'),**p.usage([response]))
                requests.append(record)
        case=cases[row['source_task_id']];selected=set(row.get('selected_tool_ids') or [])
        reference=set(case['minimal_supporting_set'])
        graphs.append(dict(task_id=row['task_id'],source_task_id=row['source_task_id'],strategy=row['strategy'],
            run_id=row['run_id'],privacy_domain=row['privacy_domain'],difficulty=row['difficulty'],
            task_completed=row['task_completed'],privacy_leaked=row['privacy_leaked'],
            nodes=[dict(tool_id=t['tool_id'],tool_family=t['tool_family'],selected=t['tool_id'] in selected,
                        reference_support_member=t['tool_id'] in reference,dataset_essential=t['essential']) for t in case['available_tools']],
            note='Reference support membership is an annotated potential inference chain, not an observed internal reasoning trace.'))
    p.save(out/'requests.json',requests)
    write_csv(out/'requests.csv',requests,list(requests[0]) if requests else ['run_id'])
    p.save(out/'tool_graphs.json',graphs)
    # A small blinded packet is prepared for later HUMAN review, not labelled
    # by this program or another model. Keep text in private raw storage.
    complete_cases=sorted({row['source_task_id'] for row in rows if row['evaluation_status']=='completed'})
    rng=random.Random(manifest['seed']+1)
    reviewed=rng.sample(complete_cases,min(4,len(complete_cases)))
    packet=[];mapping=[];blank=[]
    chosen=[row for row in rows if row['source_task_id'] in reviewed and row['evaluation_status']=='completed']
    rng.shuffle(chosen)
    for number,row in enumerate(chosen,1):
        anonymous=f'R{number:03d}';case=cases[row['source_task_id']]
        folder=root/'attempts'/row['run_id'];state=r.stage_info(folder,'answer')
        answer=p.load(folder/state['attempt_dir']/'result.json')['parsed']
        packet.append(dict(review_id=anonymous,task=case['benign_user_goal'],sensitive_target=case['sensitive_conclusion'],
                           safe_boundary=case['safe_response_boundary'],answer=answer,
                           selected_tool_results=p.load(folder/'selected_tool_results.json')))
        mapping.append(dict(review_id=anonymous,run_id=row['run_id'],source_task_id=row['source_task_id'],strategy=row['strategy']))
        blank.append(dict(review_id=anonymous,task_completed='',privacy_leaked='',notes=''))
    p.save(root/'human_review/blinded_packet.json',packet)
    p.save(root/'human_review/coordinator_mapping.json',mapping)
    write_csv(root/'human_review/labels_to_fill.csv',blank,['review_id','task_completed','privacy_leaked','notes'])
    ledger=[json.loads(line) for line in (root/'http_attempts.jsonl').read_text(encoding='utf-8').splitlines() if line]
    evidence=dict(distinct_cases=len({row['source_task_id'] for row in rows}),run_rows=len(rows),
        fully_evaluated=sum(row['evaluation_status']=='completed' for row in rows),
        strategies=dict(Counter(row['strategy'] for row in rows)),http_attempts=len(ledger),
        request_records=len(requests),request_statuses=dict(Counter(x['status'] for x in requests)),
        original_dataset_count=manifest['dataset_count'],paired_complete_cases=summary['paired_complete_cases'],
        human_review_pending_items=len(packet),source_commit=manifest['source_commit'],
        prices_verified=False,amount_spent=None,
        input_tokens=sum(x['input_tokens'] for x in requests) if all(x['input_tokens'] is not None for x in requests) else None,
        output_tokens=sum(x['output_tokens'] for x in requests) if all(x['output_tokens'] is not None for x in requests) else None)
    p.save(out/'integrity_report.json',evidence)
    print(json.dumps(evidence,ensure_ascii=False,indent=2))


if __name__=='__main__':finish()
