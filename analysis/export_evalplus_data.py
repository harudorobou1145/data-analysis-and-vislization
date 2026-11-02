#!/usr/bin/env python
"""把 CodeDepth 完整交接包（2026-11-02）导出为仪表盘数据 dashboard/data.js。

用法（从项目根目录）：
    python analysis/export_evalplus_data.py "<完整交接包根目录>" -o dashboard/data.js

交接包根目录指含 01_原三档与历史修复 / 02_Max100与四档对比 / 03_Max最新修复 / data/ 的那一层。
只读取派生 CSV、公开候选代码与题面；不读官方私有测试、不执行任何候选代码。
"""
import argparse
import csv
import datetime
import json
from pathlib import Path

CASE_TASKS = {"EP015", "EP032", "EP099", "EP122", "EP132"}
EFFORTS = ["low", "medium", "high", "max"]


def num(s):
    if s is None or s == "":
        return None
    try:
        f = float(s)
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def b(s):
    if s is None or s == "":
        return None
    return s.strip().lower() == "true"


def load_csv(path):
    with Path(path).open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


RUN_KEEP = ["run_id", "task_id", "reasoning_effort", "duration_seconds", "input_tokens", "output_tokens",
            "reasoning_tokens", "total_tokens", "tool_call_count", "command_execution_count",
            "test_execution_count", "tool_error_count", "file_change_count", "task_success",
            "base_status", "plus_status", "execution_status", "source_task_id"]


def build_paired(run_rows):
    """从四档长表聚合为 100 题 × 4 档的嵌套结构。"""
    by_task = {}
    for r in run_rows:
        tid, e = r.get("task_id"), r.get("reasoning_effort")
        if tid not in by_task:
            by_task[tid] = {"task_id": tid, "source_task_id": r.get("source_task_id")}
        rec = {}
        for k in RUN_KEEP:
            rec[k] = r.get(k) or None
        for k in ["duration_seconds", "input_tokens", "output_tokens", "reasoning_tokens", "total_tokens",
                  "tool_call_count", "command_execution_count", "test_execution_count", "tool_error_count",
                  "file_change_count"]:
            rec[k] = num(rec[k])
        rec["task_success"] = b(rec["task_success"])
        by_task[tid][e] = rec
    return list(by_task.values())


ROUND_KEEP = ["run_id", "chain_id", "task_id", "reasoning_effort", "repair_round", "parent_run_id",
              "seed_run_id", "timeout_seconds", "duration_seconds", "input_tokens", "output_tokens",
              "reasoning_tokens", "total_tokens", "tool_call_count", "test_execution_count",
              "tool_error_count", "execution_status", "task_success", "base_status", "plus_status"]


def build_repair_rounds(rows):
    out = []
    for r in rows:
        rec = {k: (r.get(k) or None) for k in ROUND_KEEP}
        for k in ["repair_round", "timeout_seconds", "duration_seconds", "input_tokens", "output_tokens",
                  "reasoning_tokens", "total_tokens", "tool_call_count", "test_execution_count", "tool_error_count"]:
            rec[k] = num(rec[k])
        rec["task_success"] = b(rec["task_success"])
        out.append(rec)
    return out


def build_repair_groups(rows, prefix):
    out = []
    for r in rows:
        task, eff = r.get("task_id"), r.get("reasoning_effort")
        chain = r.get("chain_id") or (prefix + task + "_" + eff)
        first = num(r.get("first_success_additional_round"))
        out.append({
            "chain_id": chain, "task_id": task, "reasoning_effort": eff,
            "attempts_recorded": num(r.get("attempts_recorded") or r.get("recorded_rounds")),
            "evaluated_rounds": num(r.get("evaluated_rounds") or r.get("officially_evaluated_rounds")),
            "first_success_additional_round": first,
            "status": r.get("status") or None,
            "budget": r.get("budget") or None,
            "note": (r.get("note") or r.get("comparison_warning") or None),
        })
    return out


TOOL_KEEP = ["run_id", "task_id", "reasoning_effort", "action_index", "relative_time_seconds",
             "tool_name", "behavior_category", "is_test_execution", "is_error", "error_category",
             "exit_code", "bridge_duration_seconds", "command_duration_seconds", "file_role",
             "file_changed", "command_family"]


def build_tool_actions(rows):
    out = []
    for r in rows:
        rec = {k: (r.get(k) or None) for k in TOOL_KEEP}
        for k in ["action_index", "relative_time_seconds", "bridge_duration_seconds", "command_duration_seconds", "exit_code"]:
            rec[k] = num(rec[k])
        rec["is_test_execution"] = b(rec["is_test_execution"])
        rec["is_error"] = b(rec["is_error"])
        rec["file_changed"] = b(rec["file_changed"])
        out.append(rec)
    return out


def build_candidates(bundle):
    cand_dir = Path(bundle)
    candidates, specs = {}, {}
    for p in sorted(cand_dir.rglob("cases/candidates/*.py")):
        stem = p.stem
        if any(t in stem for t in CASE_TASKS):
            candidates[stem] = p.read_text(encoding="utf-8", errors="replace")
    for p in sorted(cand_dir.rglob("cases/public_tasks/*.txt")):
        if p.stem in CASE_TASKS:
            specs[p.stem] = p.read_text(encoding="utf-8", errors="replace")
    return candidates, specs


SUBJ_KEEP = ["run_id", "task_id", "task_type", "task_title", "effort", "repeat_id", "score_10",
             "completion_score", "logic_score", "value_score", "clarity_score",
             "elapsed_seconds", "reasoning_tokens", "output_tokens", "total_tokens", "preview_timing_overlap"]


def build_subjective(root):
    root = Path(root)
    viz = json.loads((root / "result" / "formal_60_v3" / "analysis" / "visualization_data.json").read_text(encoding="utf-8"))
    summ = json.loads((root / "result" / "formal_60_v3" / "summary.json").read_text(encoding="utf-8"))
    primary = [{k: r.get(k) for k in SUBJ_KEEP} for r in viz["primary_rows"]]
    repeats = viz["repeat_scores"]
    groups = summ.get("groups", [])
    paired = [c for c in summ.get("paired_comparisons", []) if c.get("task_type") == "all"]
    return {"primary_rows": primary, "repeat_scores": repeats, "groups": groups, "paired": paired}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("bundle", help="完整交接包根目录")
    ap.add_argument("--subjective", default=None, help="主观评分实验包根目录（可选）")
    ap.add_argument("-o", "--output", default="dashboard/data.js")
    a = ap.parse_args()
    b = Path(a.bundle)

    paired = build_paired(load_csv(b / "02_Max100与四档对比" / "data" / "four_efforts_runs.csv"))
    repair_rounds = build_repair_rounds(load_csv(b / "01_原三档与历史修复" / "data" / "06_repair_combined_rounds.csv"))
    repair_rounds += build_repair_rounds(load_csv(b / "03_Max最新修复" / "data" / "max_repair_rounds.csv"))
    repair_groups = build_repair_groups(load_csv(b / "01_原三档与历史修复" / "data" / "08_repair_groups_with_recovery.csv"), "R_")
    repair_groups += build_repair_groups(load_csv(b / "03_Max最新修复" / "data" / "max_repair_groups.csv"), "S_")

    tool_actions = build_tool_actions(load_csv(b / "01_原三档与历史修复" / "data" / "09_tool_actions.csv"))
    tool_actions += build_tool_actions(load_csv(b / "02_Max100与四档对比" / "data" / "max100_tool_actions.csv"))
    tool_actions += build_tool_actions(load_csv(b / "03_Max最新修复" / "data" / "tool_actions.csv"))

    candidates, specs = build_candidates(b)
    subjective = build_subjective(a.subjective) if a.subjective else None

    payload = {
        "kind": "real",
        "source": "CodeDepth Complete Handoff 2026-11-02 + Subjective 60",
        "generatedAt": datetime.datetime.now().astimezone().isoformat(),
        "note": "代码四档对比 + Max 修复 + 主观评分实验。reasoning_effort 未经独立验证；相关≠因果。",
        "efforts": EFFORTS,
        "meta": {
            "primary_tasks": len(paired),
            "repair_rounds": len(repair_rounds),
            "repair_chains": len(repair_groups),
            "tool_actions": len(tool_actions),
            "candidates": len(candidates),
            "specs": len(specs),
            "subjective_answers": len(subjective["primary_rows"]) if subjective else 0,
        },
        "paired": paired,
        "repair_rounds": repair_rounds,
        "repair_groups": repair_groups,
        "tool_actions": tool_actions,
        "candidates": candidates,
        "specs": specs,
        "subjective": subjective,
    }

    header = (
        "/* 由 analysis/export_evalplus_data.py 生成，勿手改。 */\n"
        "/* 数据源：CodeDepth 完整交接包（脱敏派生数据）。 */\n"
    )
    body = "window.CODEDEPTH_DATA = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
    Path(a.output).write_text(header + body, encoding="utf-8")
    print(f"已写出 {a.output}")
    for k, v in payload["meta"].items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
