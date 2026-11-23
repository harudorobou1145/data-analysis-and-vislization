"""TOP-Bench v3 paired prompt experiment. Explicit --execute for paid calls."""
import argparse
from concurrent.futures import ThreadPoolExecutor,as_completed
from collections import Counter
import csv
import getpass
import itertools
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
import threading
import time
import uuid

import protocol as p

if hasattr(sys.stdout,'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')

STAGES=('selection','answer','completion','leakage')
SCRIPTS=('protocol.py','runner.py','config.json')
TRANSIENT={'network_error','timeout','http_429','http_500','http_502','http_503','http_504','transport_error'}


def fingerprints():
    return {name:p.digest((p.HERE/name).read_bytes()) for name in SCRIPTS}|{
        'reused/'+name:p.digest((p.RELAY/name).read_bytes()) for name in ('relay_chat_tools.py','relay_environment.py')}


def plan_path(experiment):return p.HERE/'plans'/f'{experiment}.json'
def cohort(experiment):return p.RAW/experiment


def prepare(count=20,seed=20261123,experiment=None):
    experiment=experiment or f'topbench3_sol_high_prompts{count}_v1'
    cfg=p.load(p.HERE/'config.json')
    commit=subprocess.check_output(['git','-C',str(p.SOURCE),'rev-parse','HEAD'],text=True).strip()
    if commit!=p.COMMIT:raise ValueError('Official source commit mismatch')
    rows=p.dataset();sample=p.stratified(rows,count,seed)
    prompts=p.official_prompts(p.SOURCE/'README.md')
    cases=[];matrix=[];rng=random.Random(seed)
    permutations=list(itertools.permutations(cfg['strategies']));rng.shuffle(permutations)
    for i,row in enumerate(sample,1):
        case=dict(task_id=f'TOP{i:03d}',source_task_id=row['scenario_input_id'],position=i,
                  privacy_domain=row['privacy_domain'],difficulty=row['difficulty_plan']['difficulty'],
                  content_sha256=p.digest(p.canonical(row)))
        cases.append(case)
        for strategy in permutations[(i-1)%len(permutations)]:
            identity=dict(experiment_id=experiment,task_id=case['task_id'],source_task_id=case['source_task_id'],
                          strategy=strategy,model=cfg['model'],reasoning_effort=cfg['reasoning_effort'],repeat=1,mode='two_stage_fixture')
            matrix.append(dict(**identity,combination_id=p.digest(p.canonical(identity))[:24]))
    manifest=dict(schema_version=1,experiment_id=experiment,benchmark='TOP-Bench v3',source_url='https://github.com/1Ponder/TOP-R',
        source_commit=commit,seed=seed,sampling='equal allocation across 5 domains x 4 difficulties' if count!=1000 else 'all official cases',
        dataset_count=1000,selected_distinct_cases=count,cases=cases,matrix=matrix,config=cfg,
        source_file_sha256={str(path.relative_to(p.SOURCE)):p.digest(path.read_bytes())
            for path in [p.SOURCE/'README.md',*(p.SOURCE/'TOP-Bench-v3').glob('*.jsonl')]},
        prompt_sha256=p.digest(p.canonical(prompts)),script_sha256=fingerprints(),
        judge_note='Same model as solver, separate blind contexts. Automated labels are not independent human/official ground truth.',
        adaptations='Pinned v3 README prompts, inert JSON tools, HTTPS Responses endpoint, no server-side chaining. Legacy code-v2 scripts are not executed.',
        supported_metrics=['CR','LR','H-score','selected tool count','supporting-set precision/recall','dataset noise selection','latency','tokens'])
    dest=plan_path(experiment)
    if dest.exists() and p.load(dest)!=manifest:raise ValueError('Existing frozen experiment differs; use a new experiment ID')
    p.save(dest,manifest);p.save(p.HERE/'prompts.json',prompts)
    source=p.RAW/'source';source.mkdir(parents=True,exist_ok=True)
    for name in manifest['source_file_sha256']:
        target=source/name;target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists():shutil.copyfile(p.SOURCE/name,target)
    p.save(source/'index.json',dict(source_commit=commit,count=1000,
          cases=[dict(source_task_id=r['scenario_input_id'],content_sha256=p.digest(p.canonical(r)),
                      privacy_domain=r['privacy_domain'],difficulty=r['difficulty_plan']['difficulty']) for r in rows]))
    p.save(cohort(experiment)/'experiment.json',manifest)
    with (cohort(experiment)/'selected_cases.jsonl').open('w',encoding='utf-8') as stream:
        for row in sample:stream.write(json.dumps(row,ensure_ascii=False)+'\n')
    print(json.dumps(dict(prepared=True,experiment_id=experiment,distinct_cases=count,combinations=len(matrix),
          expected_solver_requests=len(matrix)*2,expected_judge_requests=len(matrix)*2,model_requests=0),ensure_ascii=False))
    return manifest


def validate(experiment):
    manifest=p.load(plan_path(experiment))
    if manifest['script_sha256']!=fingerprints():raise ValueError('Frozen runner/config changed; audit before running')
    prompts=p.load(p.HERE/'prompts.json')
    if p.digest(p.canonical(prompts))!=manifest['prompt_sha256']:raise ValueError('Prompt templates changed')
    for name,sha in manifest['source_file_sha256'].items():
        if p.digest((p.RAW/'source'/name).read_bytes())!=sha:raise ValueError('Official source snapshot changed')
    cases=[json.loads(line) for line in (cohort(experiment)/'selected_cases.jsonl').read_text(encoding='utf-8').splitlines() if line]
    by_id={row['scenario_input_id']:row for row in cases}
    if len(by_id)!=manifest['selected_distinct_cases']:raise ValueError('Selected case count mismatch')
    for item in manifest['cases']:
        if p.digest(p.canonical(by_id[item['source_task_id']]))!=item['content_sha256']:raise ValueError('Selected case changed')
    return manifest,prompts,by_id


def stage_info(folder,stage):
    path=folder/'stages'/stage/'state.json'
    return p.load(path) if path.exists() else None


class Engine:
    def __init__(self,manifest,prompts,cases,request=p.request_json):
        self.manifest=manifest;self.cfg=manifest['config'];self.prompts=prompts;self.cases=cases;self.request=request
        self.root=cohort(manifest['experiment_id']);self.guard=threading.Lock();self.cancel=threading.Event()
        ledger=self.root/'http_attempts.jsonl'
        self.attempts=sum(1 for line in ledger.read_text(encoding='utf-8').splitlines() if line) if ledger.exists() else 0

    def reserve(self,record):
        with self.guard:
            if self.cancel.is_set():raise RuntimeError('Controller stopped')
            if self.attempts>=self.cfg['max_total_http_attempts']:raise RuntimeError('Total HTTP attempt cap reached')
            self.attempts+=1
            p.append(self.root/'http_attempts.jsonl',dict(attempt_number=self.attempts,**record))

    def stage(self,folder,name,messages,parser,judge=False):
        model=self.cfg['judge_model'] if judge else self.cfg['model']
        effort=self.cfg['judge_reasoning_effort'] if judge else self.cfg['reasoning_effort']
        body=dict(model=model,input=messages,reasoning={'effort':effort},max_output_tokens=self.cfg['max_output_tokens'],
                  stream=False,store=False)
        signature=p.digest(p.canonical(body))
        old=stage_info(folder,name)
        if old:
            if old['request_sha256']!=signature:raise ValueError('Stage input changed')
            if old['status']=='completed':return p.load(folder/old['attempt_dir']/'result.json')['parsed']
            raise RuntimeError(f'Retained {old["status"]} stage {name}; explicit review/retry required')
        for number in range(1,2+self.cfg['automatic_retries']):
            attempt=folder/'stages'/name/'attempts'/uuid.uuid4().hex[:12]
            record=dict(status='running',request_sha256=signature,attempt_dir=attempt.relative_to(folder).as_posix(),
                        started_at=p.now(),attempt_index=number)
            p.save(folder/'stages'/name/'state.json',record);p.save(attempt/'request.json',body)
            start=time.monotonic();error=None;category=None
            try:
                self.reserve(dict(run_id=folder.name,stage=name,timestamp=p.now(),request_sha256=signature))
                response=self.request(self.cfg['base_url'].rstrip('/')+'/responses',os.environ.get(self.cfg['key_env'],''),body,
                                      self.cfg['request_timeout_seconds'])
                p.save(attempt/'response.json',response)
                text=p.response_text(response)
                (attempt/'text.txt').write_text(p.safe(text),encoding='utf-8')
                parsed=parser(text)
                p.save(attempt/'result.json',dict(text=text,parsed=parsed))
                record['status']='completed'
            except BaseException as exc:
                error=p.safe(str(exc));category=getattr(exc,'category',None)
                if not category:
                    category='model_output_schema' if isinstance(exc,(ValueError,json.JSONDecodeError)) else 'transport_error'
                record['status']='interrupted' if isinstance(exc,KeyboardInterrupt) else ('timeout' if category=='timeout' else 'failed')
                if category in ('http_401','http_403'):self.cancel.set()
            record.update(ended_at=p.now(),duration_seconds=time.monotonic()-start,error=error,failure_category=category)
            p.save(attempt/'status.json',record);p.save(folder/'stages'/name/'state.json',record)
            p.append(folder/'events.jsonl',dict(event='stage_finished',stage=name,**record))
            if record['status']=='completed':return parsed
            if record['status']=='interrupted':raise KeyboardInterrupt()
            # One recorded retry for transport errors only. Model selection
            # mistakes are outcomes, not a reason to regenerate until success.
            if category not in TRANSIENT or number>=1+self.cfg['automatic_retries']:break
            time.sleep(min(5,number*2))
        raise RuntimeError(f'{name}: {error}')

    def run_one(self,item,mode):
        index=self.root/'runs'/item['combination_id']/'current.json'
        if index.exists():rid=p.load(index)['run_id']
        else:
            rid='top3_'+uuid.uuid4().hex
            p.save(index,dict(run_id=rid))
        folder=self.root/'attempts'/rid
        row_path=folder/'metrics.json'
        row=p.load(row_path) if row_path.exists() else dict(**item,run_id=rid,benchmark='TOP-Bench v3',data_kind='real',
            execution_status='pending',evaluation_status='pending',task_completed=None,privacy_leaked=None,
            start_time=p.now(),reasoning_effort_verified=False)
        case=self.cases[item['source_task_id']]
        meta=next(m for m in self.manifest['cases'] if m['source_task_id']==item['source_task_id'])
        row.update(privacy_domain=meta['privacy_domain'],difficulty=meta['difficulty'],judge_model=self.cfg['judge_model'])
        p.save(row_path,row)
        try:
            if mode in ('run','all'):
                selected=self.stage(folder,'selection',p.selection_messages(case,item['strategy'],self.prompts),lambda t:p.selected_ids(t,case))
                messages,outputs=p.answer_messages(case,item['strategy'],selected,self.prompts)
                p.save(folder/'selected_tool_results.json',outputs)
                answer=self.stage(folder,'answer',messages,lambda t:t)
                row.update(execution_status='completed',generation_completed_at=p.now(),error=None)
                reference=set(case['minimal_supporting_set']);chosen=set(selected)
                row.update(selected_tool_ids=selected,tool_call_count=len(selected),native_tool_call_count=0,
                    tool_mode='fixed_fixture_returns',tool_error_count=0,
                    noise_tool_count=sum(not t['essential'] for t in case['available_tools'] if t['tool_id'] in chosen),
                    supporting_set_precision=len(chosen&reference)/len(chosen) if chosen else 0.0,
                    supporting_set_recall=len(chosen&reference)/len(reference),
                    all_supporting_tools_selected=reference<=chosen)
                p.save(row_path,row)
            if mode in ('evaluate','all'):
                prior=stage_info(folder,'answer')
                if not prior or prior['status']!='completed':raise ValueError('No completed answer to judge')
                answer=p.load(folder/prior['attempt_dir']/'result.json')['parsed']
                completion=self.stage(folder,'completion',p.judge_messages(case,answer,'completion',self.prompts),p.judge_label,True)
                leakage=self.stage(folder,'leakage',p.judge_messages(case,answer,'leakage',self.prompts),p.judge_label,True)
                row.update(evaluation_status='completed',task_completed=completion,privacy_leaked=leakage,
                    evaluation_completed_at=p.now(),evaluation_error=None,
                    outcome=('completed_' if completion else 'incomplete_')+('leaking' if leakage else 'safe'))
        except BaseException as exc:
            failed=[stage_info(folder,s) for s in STAGES if stage_info(folder,s) and stage_info(folder,s)['status']!='completed']
            status=(failed[-1]['status'] if failed else 'failed')
            if row['execution_status']=='completed':row.update(evaluation_status=status,evaluation_error=p.safe(exc))
            else:row.update(execution_status=status,error=p.safe(exc))
            if isinstance(exc,KeyboardInterrupt):self.cancel.set()
        finally:
            for category,names in [('solver',STAGES[:2]),('judge',STAGES[2:])]:
                responses=[];complete=True;seconds=0;attempts=0;known=[]
                for name in names:
                    state=stage_info(folder,name)
                    if not state or state['status']!='completed':complete=False
                    for attempt in (folder/'stages'/name/'attempts').glob('*'):
                        if (attempt/'status.json').exists():seconds+=p.load(attempt/'status.json')['duration_seconds']
                        if (attempt/'request.json').exists():attempts+=1
                        if (attempt/'response.json').exists():
                            response=p.load(attempt/'response.json');responses.append(response);known.append(response)
                        elif (attempt/'request.json').exists():complete=False
                row.update({category+'_'+k:v for k,v in p.usage(responses,complete).items()})
                row[category+'_observed_usage']=p.usage(known)
                row[category+'_duration_seconds']=seconds;row[category+'_http_attempts']=attempts
            row['updated_at']=p.now();p.save(row_path,row)
        return row


def current_rows(experiment):
    root=cohort(experiment);rows=[]
    for index in sorted((root/'runs').glob('*/current.json')):
        folder=root/'attempts'/p.load(index)['run_id']
        if (folder/'metrics.json').exists():rows.append(p.load(folder/'metrics.json'))
    return rows


def export(experiment):
    manifest=p.load(plan_path(experiment));rows=current_rows(experiment)
    destination=p.ROOT/'data/processed/topbench3'/experiment
    # Whitelist features: no raw answers, task text, tool returns, target facts,
    # judgement explanations, credentials or exposed sensitive conclusions.
    fields=['run_id','combination_id','task_id','source_task_id','strategy','model','reasoning_effort','repeat',
        'privacy_domain','difficulty','execution_status','evaluation_status','task_completed','privacy_leaked','outcome',
        'selected_tool_ids','tool_call_count','native_tool_call_count','noise_tool_count','supporting_set_precision',
        'supporting_set_recall','all_supporting_tools_selected','solver_input_tokens','solver_output_tokens',
        'solver_reasoning_tokens','solver_cached_input_tokens','solver_total_tokens','solver_duration_seconds','solver_http_attempts',
        'judge_input_tokens','judge_output_tokens','judge_total_tokens','judge_duration_seconds','judge_http_attempts']
    clean=[{k:r.get(k) for k in fields} for r in rows]
    p.save(destination/'runs.json',clean)
    def csv_file(name,values,columns):
        destination.mkdir(parents=True,exist_ok=True)
        with (destination/name).open('w',encoding='utf-8-sig',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=columns);writer.writeheader()
            writer.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()} for r in values)
    csv_file('runs.csv',clean,fields)
    by_case={}
    for row in clean:by_case.setdefault(row['source_task_id'],{})[row['strategy']]=row
    common={case for case,variants in by_case.items() if all(s in variants and variants[s]['evaluation_status']=='completed' for s in manifest['config']['strategies'])}
    summary=dict(benchmark='TOP-Bench v3',experiment_id=experiment,planned_distinct_cases=manifest['selected_distinct_cases'],
        planned_combinations=len(manifest['matrix']),paired_complete_cases=len(common),
        execution_statuses=dict(Counter(r['execution_status'] for r in rows)),
        limitations=['20-cell balanced subset is not the full 1000-case distribution.',
                     'Same-model blind automated judges; labels require human spot checks.',
                     'Provider model identity, effort and billing remain unverified.'],strategies={})
    paired=[]
    for case in manifest['cases']:
        entry={k:case[k] for k in ('task_id','source_task_id','privacy_domain','difficulty')}
        entry['paired_complete']=case['source_task_id'] in common
        for strategy,row in by_case.get(case['source_task_id'],{}).items():
            for field in ('task_completed','privacy_leaked','solver_total_tokens','solver_duration_seconds','tool_call_count'):
                entry[strategy+'_'+field]=row.get(field)
        paired.append(entry)
    for strategy in manifest['config']['strategies']:
        selected=[by_case[case][strategy] for case in sorted(common)]
        cr=sum(r['task_completed'] for r in selected)/len(selected) if selected else None
        lr=sum(r['privacy_leaked'] for r in selected)/len(selected) if selected else None
        summary['strategies'][strategy]=dict(n=len(selected),CR=cr,LR=lr,H_score=p.h_score(cr,lr),
            outcomes=dict(Counter(r['outcome'] for r in selected)))
    p.save(destination/'summary.json',summary);p.save(destination/'paired.json',paired)
    csv_file('paired.csv',paired,list(dict.fromkeys(k for r in paired for k in r)))
    return summary


def run_batch(a,manifest,prompts,cases):
    positions={c['source_task_id'] for c in manifest['cases'][a.start-1:a.start-1+a.count]}
    selected=[item for item in manifest['matrix'] if item['source_task_id'] in positions and item['strategy'] in a.strategy]
    rows={r['combination_id']:r for r in current_rows(a.experiment_id)}
    solver_needed=sum(1 for item in selected if rows.get(item['combination_id'],{}).get('execution_status')!='completed')*2
    judge_needed=sum(1 for item in selected if rows.get(item['combination_id'],{}).get('evaluation_status')!='completed')*2
    print(json.dumps(dict(preview=not a.execute,experiment_id=a.experiment_id,selected_cases=len(positions),selected_combinations=len(selected),
          solver_requests_upper_estimate=solver_needed if a.command!='evaluate' else 0,
          judge_requests_upper_estimate=judge_needed if a.command!='run' else 0,
          expected_initial_all_requests=len(selected)*4,estimated_tokens=None,estimated_cost=None,
          max_total_http_attempts=manifest['config']['max_total_http_attempts'],automatic_retries_per_stage=manifest['config']['automatic_retries'],
          model=manifest['config']['model'],reasoning_effort=manifest['config']['reasoning_effort'],
          note='Each stage checkpoint is reused. Real billing/token volume unknown; judge calls are paid separately.'),ensure_ascii=False,indent=2),flush=True)
    if not a.execute:return
    validation=p.load(p.HERE/'validation.json')
    if not validation.get('passed') or validation['script_sha256']!=fingerprints():raise ValueError('Matching offline validation required')
    if not os.environ.get(manifest['config']['key_env']):raise ValueError('Missing relay key; use hidden input, not a config file')
    engine=Engine(manifest,prompts,cases)
    with ThreadPoolExecutor(max_workers=manifest['config']['workers']) as pool:
        futures={pool.submit(engine.run_one,item,a.command):item for item in selected}
        try:
            for future in as_completed(futures):
                row=future.result()
                print(json.dumps({k:row.get(k) for k in ('task_id','strategy','run_id','execution_status','evaluation_status','task_completed','privacy_leaked','error','evaluation_error')},ensure_ascii=False),flush=True)
        except KeyboardInterrupt:
            engine.cancel.set()
            for future in futures:future.cancel()
            raise
    summary=export(a.experiment_id)
    print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)


def retry(experiment,run_id,stage):
    if not run_id or not run_id.startswith('top3_'):raise ValueError('Expected run ID')
    folder=cohort(experiment)/'attempts'/run_id
    if folder.resolve().parent!=(cohort(experiment)/'attempts').resolve():raise ValueError('Invalid run path')
    state=stage_info(folder,stage)
    if not state or state['status']=='completed':raise ValueError('Only failed/interrupted/uncertain stages can be reset')
    if any(stage_info(folder,later) for later in STAGES[STAGES.index(stage)+1:]):raise ValueError('Downstream stages exist; inspect before resetting upstream')
    p.save(folder/'stages'/stage/'recovery_history'/f'{uuid.uuid4().hex}.json',state)
    # Remove only the tiny pointer, never the request/response evidence.
    (folder/'stages'/stage/'state.json').unlink()
    print('Stage pointer reset; all attempt evidence preserved. No API call.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['prepare','preview','run','evaluate','all','export','status','retry'])
    parser.add_argument('--experiment-id',default='topbench3_sol_high_prompts20_v1')
    parser.add_argument('--cases',type=int,default=20);parser.add_argument('--seed',type=int,default=20261123)
    parser.add_argument('--start',type=int,default=1);parser.add_argument('--count',type=int,default=20)
    parser.add_argument('--strategy',nargs='+',choices=['baseline','tnm','cbd'],default=['baseline','tnm','cbd'])
    parser.add_argument('--execute',action='store_true');parser.add_argument('--key-prompt',action='store_true')
    parser.add_argument('--run-id');parser.add_argument('--stage',choices=STAGES)
    a=parser.parse_args()
    if a.start<1 or a.count<1:parser.error('start/count must be positive')
    if a.key_prompt and a.execute and not os.environ.get('CODEDEPTH_RELAY_API_KEY'):
        os.environ['CODEDEPTH_RELAY_API_KEY']=getpass.getpass('Relay key (hidden): ')
    with p.controller_lock():
        if a.command=='prepare':prepare(a.cases,a.seed,a.experiment_id)
        elif a.command=='retry':retry(a.experiment_id,a.run_id,a.stage)
        elif a.command=='export':print(json.dumps(export(a.experiment_id),ensure_ascii=False,indent=2))
        elif a.command=='status':print(json.dumps(current_rows(a.experiment_id),ensure_ascii=False,indent=2))
        else:
            manifest,prompts,cases=validate(a.experiment_id)
            if a.command=='preview':a.command='all';a.execute=False
            run_batch(a,manifest,prompts,cases)


if __name__=='__main__':main()
