import argparse
import csv
import json
from collections import defaultdict
def summarize(path):
    groups=defaultdict(list)
    with open(path,encoding="utf-8-sig",newline="") as f:
        for r in csv.DictReader(f):
            if r.get("data_kind")!="real": continue
            groups[r["reasoning_effort"]].append(r)
    def mean(rows,key):
        vals=[float(r[key]) for r in rows if r.get(key) not in (None,"", "null")]
        return sum(vals)/len(vals) if vals else None
    out={}
    for effort,rows in groups.items():
        known=[r for r in rows if r.get("task_success", "").lower() in ("true","false")]
        tokens=[float(r["input_tokens"])+float(r["output_tokens"]) for r in rows if r.get("input_tokens") and r.get("output_tokens")]
        out[effort]=dict(n=len(rows),evaluated_n=len(known),success_rate=sum(r["task_success"].lower()=="true" for r in known)/len(known) if known else None,mean_duration_seconds=mean(rows,"duration_seconds"),mean_total_tokens=sum(tokens)/len(tokens) if tokens else None,mean_tool_calls=mean(rows,"tool_call_count"))
    return out
if __name__=="__main__":
    p=argparse.ArgumentParser(); p.add_argument("runs"); a=p.parse_args(); print(json.dumps(summarize(a.runs),indent=2))
