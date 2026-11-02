#!/usr/bin/env python
"""把 results/*.csv 的三张派生表导出为仪表盘使用的 dashboard/data.js。

用法（从项目根目录）：
    python analysis/export_dashboard_data.py results/runs.csv results/events.csv results/messages.csv \
        -o dashboard/data.js

默认只导出 data_kind == "real" 的运行（与 analysis/summarize.py 一致，排除测试夹具）。
事件的行为分类（command/file_change/search/mcp/other）是启发式，规则见 classify_event；
发布前应人工复核分类，具体口径见 docs/data_schema.md。
"""
import argparse
import csv
import json
from pathlib import Path


def read_rows(path):
    with Path(path).open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def to_num(s):
    if s is None or s == "":
        return None
    s = s.strip()
    if s.lower() == "null":
        return None
    try:
        f = float(s)
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def to_bool(s):
    if s is None or s == "":
        return None
    s = s.strip().lower()
    if s == "true":
        return True
    if s == "false":
        return False
    return None


def classify_event(event_type, tool_name, command):
    """启发式行为分类：命令/文件修改/搜索/MCP/其他。需人工复核。"""
    et = (event_type or "").lower()
    tn = (tool_name or "").lower()
    if "command" in tn or "exec" in tn or et == "command_execution":
        return "command"
    if "patch" in tn or "write" in tn or "edit" in tn or "file_change" in et:
        return "file_change"
    if "search" in tn or "grep" in tn or "read" in tn or "glob" in tn:
        return "search"
    if "mcp" in tn or et.startswith("mcp"):
        return "mcp"
    return "other"


def build_runs(run_rows):
    runs = []
    for r in run_rows:
        if r.get("data_kind") != "real":
            continue
        runs.append({
            "run_id": r.get("run_id"),
            "task_id": r.get("task_id"),
            "task_type": r.get("task_type"),
            "task_difficulty": r.get("task_difficulty"),
            "reasoning_effort": r.get("reasoning_effort"),
            "repeat_index": to_num(r.get("repeat_index")),
            "duration_seconds": to_num(r.get("duration_seconds")),
            "input_tokens": to_num(r.get("input_tokens")),
            "output_tokens": to_num(r.get("output_tokens")),
            "reasoning_tokens": to_num(r.get("reasoning_tokens")),
            "tool_call_count": to_num(r.get("tool_call_count")),
            "command_execution_count": to_num(r.get("command_execution_count")),
            "file_change_count": to_num(r.get("file_change_count")),
            "test_execution_count": to_num(r.get("test_execution_count")),
            "test_passed": to_num(r.get("test_passed")),
            "test_total": to_num(r.get("test_total")),
            "test_pass_rate": to_num(r.get("test_pass_rate")),
            "task_success": to_bool(r.get("task_success")),
            "execution_status": r.get("execution_status"),
            "evaluation_status": r.get("evaluation_status"),
            "data_kind": r.get("data_kind"),
        })
    return runs


def build_events(event_rows):
    events = []
    for e in event_rows:
        events.append({
            "run_id": e.get("run_id"),
            "index": to_num(e.get("event_index")),
            "relative_time_seconds": to_num(e.get("relative_time_seconds")),
            "category": classify_event(e.get("event_type"), e.get("tool_name"), e.get("command")),
            "event_type": e.get("event_type"),
            "tool_name": e.get("tool_name"),
            "status": e.get("status"),
            "text": e.get("command") or "",
            "error": e.get("error") or "",
        })
    return events


def build_messages(message_rows):
    messages = []
    per_run = {}
    for m in message_rows:
        run_id = m.get("run_id")
        order = per_run.get(run_id, 0)
        per_run[run_id] = order + 1
        messages.append({
            "run_id": run_id,
            "message_id": m.get("message_id"),
            "turn_id": m.get("turn_id"),
            "role": m.get("role"),
            "message_type": m.get("message_type"),
            "content": m.get("content"),
            "relative_time_seconds": order,  # 派生顺序，用于前端保序展示
        })
    return messages


def build_payload(runs_path, events_path, messages_path):
    import datetime
    return {
        "kind": "real",
        "generatedAt": datetime.datetime.now().astimezone().isoformat(),
        "note": "由 results/*.csv 导出；用于结论前请复核口径与排除清单。",
        "runs": build_runs(read_rows(runs_path)),
        "events": build_events(read_rows(events_path)),
        "messages": build_messages(read_rows(messages_path)),
    }


def write_data_js(payload, out_path):
    header = (
        "/* 由 analysis/export_dashboard_data.py 生成，勿手改。 */\n"
        "/* 重新生成：python analysis/export_dashboard_data.py results/runs.csv "
        "results/events.csv results/messages.csv -o dashboard/data.js */\n"
    )
    body = "window.CODEDEPTH_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    Path(out_path).write_text(header + body, encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("runs", help="results/runs.csv")
    p.add_argument("events", help="results/events.csv")
    p.add_argument("messages", help="results/messages.csv")
    p.add_argument("-o", "--output", default="dashboard/data.js")
    a = p.parse_args()

    payload = build_payload(a.runs, a.events, a.messages)
    write_data_js(payload, a.output)
    print(f"已写出 {a.output}：runs={len(payload['runs'])}, events={len(payload['events'])}, "
          f"messages={len(payload['messages'])}, kind={payload['kind']}")


if __name__ == "__main__":
    main()
