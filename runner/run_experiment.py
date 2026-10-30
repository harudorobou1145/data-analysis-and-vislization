"""Default: preview only. --execute requires prior user authorization."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
try:
    from .common import *
    from .parse_trace import parse_trace
    from .evaluate import evaluate
except ImportError:
    from common import *
    from parse_trace import parse_trace
    from evaluate import evaluate
ROOT=Path(__file__).resolve().parents[1]
def now(): return datetime.now(timezone.utc).isoformat()
def cli_command(executable):
    resolved=shutil.which(executable)
    if not resolved: raise FileNotFoundError(executable)
    if resolved.lower().endswith(".ps1"):
        # npm shim is replaced with its direct node entry point, avoiding shell quoting.
        script=Path(resolved).parent/"node_modules/@openai/codex/bin/codex.js"
        if not script.exists(): raise RuntimeError("Specify native Codex executable with --codex")
        return [shutil.which("node"),str(script)]
    if resolved.lower().endswith(".cmd"):
        script=Path(resolved).parent/"node_modules/@openai/codex/bin/codex.js"
        if script.exists(): return [shutil.which("node"),str(script)]
        raise RuntimeError("Specify native Codex executable with --codex")
    return [resolved]
def terminate_tree(p):
    if os.name=="nt":
        subprocess.run(["taskkill","/PID",str(p.pid),"/T","/F"],capture_output=True)
    else:
        import signal
        os.killpg(p.pid,signal.SIGKILL)
    p.wait()
def run(a,index):
    task=ROOT/"tasks"/a.task
    meta=json.loads((task/"metadata.json").read_text(encoding="utf-8"))
    prompt=(task/"prompt.md").read_text(encoding="utf-8")
    rid=f"{datetime.now(timezone.utc):%Y%m%dT%H%M%S}_{a.task}_{a.effort}_{uuid.uuid4().hex[:12]}"
    dest=ROOT/"results"/rid; work=dest/"workspace"
    cmd=cli_command(a.codex)+["exec","--json","--ephemeral","--skip-git-repo-check","--ignore-user-config","-s","workspace-write","-m",a.model,"-c",f'model_reasoning_effort="{a.effort}"',"-c",'approval_policy="never"',"-C",str(work),"-"]
    if getattr(a,"windows_sandbox",None):
        cmd[-1:-1]=["-c",f'windows.sandbox="{a.windows_sandbox}"']
    if getattr(a,"http_only",False):
        cmd[-1:-1]=["-c",'model_provider="openai-http"',"-c",'model_providers.openai-http.name="OpenAI HTTP/SSE"',"-c",'model_providers.openai-http.wire_api="responses"',"-c","model_providers.openai-http.requires_openai_auth=true","-c","model_providers.openai-http.supports_websockets=false"]
    if not a.execute:
        return dict(preview=True,run_id=rid,command=cmd,prompt=prompt,note="No directory created; no AI called. User config ignored: custom provider may need an explicitly reviewed profile.")
    dest.mkdir(parents=True,exist_ok=False); shutil.copytree(task/"starter",work)
    try:
        version=subprocess.run(cli_command(a.codex)+["--version"],capture_output=True,text=True,timeout=10).stdout.strip()
    except Exception:
        version=None
    save_json(dest/"config.json",dict(command=cmd,model=a.model,effort=a.effort,metadata=meta,prompt_sha256=hashlib.sha256(prompt.encode()).hexdigest(),starter_sha256={str(p.relative_to(work)):hashlib.sha256(p.read_bytes()).hexdigest() for p in work.rglob("*") if p.is_file()},python=sys.version,cli_version=version,permissions="workspace-write; approval_policy=never; user config ignored",isolation_confirmed=a.isolation_confirmed))
    (dest/"prompt.txt").write_text(prompt,encoding="utf-8")
    started=now(); timer=time.monotonic(); arrivals={}; status="launch_error"; code=None; error=None
    try:
        with (dest/"trace.jsonl").open("wb") as trace, (dest/"stderr.log").open("wb") as stderr:
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=stderr,start_new_session=os.name!="nt")
            def capture():
                for n,line in enumerate(proc.stdout,1):
                    trace.write(line); trace.flush(); arrivals[str(n)]={"timestamp":now(),"relative_time_seconds":time.monotonic()-timer}
            reader=threading.Thread(target=capture,daemon=True); reader.start()
            try:
                proc.stdin.write(prompt.encode()); proc.stdin.close()
                proc.wait(timeout=a.timeout); status="completed" if proc.returncode==0 else "cli_failed"
            except subprocess.TimeoutExpired:
                terminate_tree(proc); status="timeout"
            except BaseException:
                if proc.poll() is None: terminate_tree(proc)
                raise
            finally:
                reader.join(timeout=5); code=proc.returncode
    except Exception as e: error=str(e)
    ended=now(); duration=time.monotonic()-timer
    (dest/"trace.jsonl").touch(exist_ok=True); save_json(dest/"arrival_times.json",arrivals)
    parsed=parse_trace(dest/"trace.jsonl",rid,prompt,arrivals)
    trace_errors=[]
    for event_line in (dest/"trace.jsonl").read_text(encoding="utf-8",errors="replace").splitlines():
        try:
            event=json.loads(event_line)
            if not isinstance(event,dict): continue
            item=event.get("item") or {}
            if event.get("type") in {"error","turn.failed"}:
                trace_errors.append(event.get("message") or event.get("error"))
            elif isinstance(item,dict) and item.get("type")=="error":
                trace_errors.append(item.get("message"))
        except ValueError: pass
    stderr_text=(dest/"stderr.log").read_text(encoding="utf-8",errors="replace") if (dest/"stderr.log").exists() else ""
    policy_denials=[line for line in stderr_text.splitlines() if "blocked by policy" in line.lower()]
    error_text=json.dumps(trace_errors,ensure_ascii=False)
    access_failed="model_not_found" in error_text or "not supported when using Codex" in error_text
    failure_category="model_access" if access_failed else "policy_blocked" if policy_denials else None
    if access_failed:
        evaluation=dict(evaluation_status="blocked_model_access",test_passed=None,test_total=None,test_pass_rate=None,task_success=None)
    else:
        evaluation=evaluate(work,ROOT/"evaluation"/a.task,dest/"evaluation",approved=a.allow_host_evaluation)
    save_json(dest/"evaluation.json",evaluation)
    row=dict(run_id=rid,task_id=a.task,task_type=meta["task_type"],task_difficulty=meta["task_difficulty"],model=a.model,reasoning_effort=a.effort,repeat_index=index,start_time=started,end_time=ended,duration_seconds=duration,execution_status=status,cli_exit_code=code,data_kind="real",**parsed["metrics"],**{k:v for k,v in evaluation.items() if k in RUN_FIELDS})
    save_json(dest/"metrics.json",{**row,"error":error,"trace_errors":trace_errors,"failure_category":failure_category,"policy_denials":policy_denials,"parse_warnings":parsed["warnings"]})
    csv_write(dest/"runs.csv",[row],RUN_FIELDS); csv_write(dest/"events.csv",parsed["events"],EVENT_FIELDS); csv_write(dest/"messages.csv",parsed["messages"],MESSAGE_FIELDS)
    # Sequential rebuild only: do not run multiple scheduler processes simultaneously.
    rows=[]
    for f in sorted((ROOT/"results").glob("*/runs.csv")):
        import csv
        with f.open(encoding="utf-8",newline="") as stream: rows.extend(csv.DictReader(stream))
    csv_write(ROOT/"results/runs.csv",rows,RUN_FIELDS)
    return {**row,"failure_category":failure_category,"policy_denials":policy_denials,"trace_errors":trace_errors}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--task",default="T001"); p.add_argument("--effort",choices=["low","medium","high"],required=True)
    p.add_argument("--repeat",type=int,default=1); p.add_argument("--model",required=True,help="Exact model ID verified for your CLI account; local cache alone is insufficient"); p.add_argument("--codex",default="codex")
    p.add_argument("--timeout",type=float,default=300); p.add_argument("--execute",action="store_true")
    p.add_argument("--isolation-confirmed",action="store_true",help="External sandbox hides host project/tests, enforces resource quotas; required for real runs")
    p.add_argument("--allow-host-evaluation",action="store_true",help="Explicitly approve pytest execution in current environment; subprocess timeout is not a sandbox")
    p.add_argument("--http-only",action="store_true",help="Use minimal OpenAI Responses provider with WebSockets disabled; does not grant model access")
    p.add_argument("--windows-sandbox",choices=["elevated","mxc"],help="Explicit native sandbox implementation; must already be supported/provisioned. Does not override managed policy.")
    a=p.parse_args()
    if not a.task.isalnum() or a.repeat<1 or a.timeout<=0: p.error("Invalid task/repeat/timeout")
    if a.execute and not a.isolation_confirmed: p.error("Real runs require verified external isolation (including hidden tests and resource limits). See docs/experiment_design.md")
    for i in range(1,a.repeat+1): print(json.dumps(run(a,i),ensure_ascii=False,indent=2))
if __name__=="__main__": main()
