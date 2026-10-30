"""Only observable CLI events; unknown fields remain in the raw trace."""
import json
from pathlib import Path
try:
    from .common import *
except ImportError:
    from common import *
TOOLS={"command_execution", "file_change", "mcp_tool_call", "web_search", "image_generation"}
def parse_trace(path, run_id, prompt=None, arrivals=None):
    events=[]; messages=[]; items={}; turns={}; warnings=[]; turn=1; completed=False; failed=False
    if prompt is not None:
        messages.append(dict(run_id=run_id,message_id="prompt",turn_id=1,role="user",content=prompt,timestamp=None,message_type="task_prompt"))
    for index,line in enumerate(Path(path).read_text(encoding="utf-8",errors="replace").splitlines(),1):
        try:
            e=json.loads(line)
            if not isinstance(e,dict): raise ValueError("not an object")
        except (ValueError,TypeError):
            warnings.append(f"invalid JSON event at line {index}"); continue
        typ=e.get("type","unknown"); item=e.get("item") or {}
        if not isinstance(item,dict): item={}
        iid=item.get("id"); it=item.get("type")
        stamp=e.get("timestamp") or (arrivals or {}).get(str(index),{}).get("timestamp")
        relative=(arrivals or {}).get(str(index),{}).get("relative_time_seconds")
        events.append(dict(run_id=run_id,event_index=index,timestamp=stamp,relative_time_seconds=relative,event_type=typ,item_id=iid,item_type=it,tool_name=item.get("tool") or (it if it in TOOLS else None),status=item.get("status"),exit_code=item.get("exit_code"),duration_seconds=item.get("duration_seconds"),command=item.get("command"),error=e.get("error")))
        if iid:
            items[iid]={**items.get(iid,{}),**item}
            if it=="agent_message" and typ=="item.completed":
                existing=next((m for m in messages if m["message_id"]==iid),None)
                row=dict(run_id=run_id,message_id=iid,turn_id=turn,role="assistant",content=item.get("text",""),timestamp=stamp,message_type="agent_message")
                if existing: existing.update(row)
                else: messages.append(row)
        if typ=="turn.completed":
            usage=e.get("usage")
            if not isinstance(usage,dict):
                usage={}; warnings.append(f"missing or invalid usage at line {index}")
            turns[e.get("turn_id") or str(turn)]=usage; completed=True; turn+=1
        if typ in {"turn.failed","error"}: failed=True
    metrics={}
    for name in ["input_tokens","output_tokens","reasoning_tokens"]:
        values=[u.get(name,u.get("reasoning_output_tokens") if name=="reasoning_tokens" else None) for u in turns.values()]
        vals=[value for value in values if isinstance(value,(int,float))]
        metrics[name]=sum(vals) if vals else None
    metrics.update(tool_call_count=sum(i.get("type") in TOOLS for i in items.values()),command_execution_count=sum(i.get("type")=="command_execution" for i in items.values()),file_change_count=sum(i.get("type")=="file_change" for i in items.values()),test_execution_count=sum(i.get("type")=="command_execution" and any(x in i.get("command", "") for x in ["pytest","unittest"]) for i in items.values()),agent_completed=completed and not failed)
    return dict(events=events,messages=messages,metrics=metrics,warnings=warnings)
if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser(); p.add_argument("trace"); p.add_argument("--run-id",required=True); p.add_argument("--output",required=True); a=p.parse_args()
    out=Path(a.output); out.mkdir(parents=True,exist_ok=True); parsed=parse_trace(a.trace,a.run_id)
    csv_write(out/"events.csv",parsed["events"],EVENT_FIELDS); csv_write(out/"messages.csv",parsed["messages"],MESSAGE_FIELDS); save_json(out/"parsed.json",parsed)
