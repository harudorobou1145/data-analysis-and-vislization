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


def build_lunads(root):
    root = Path(root)
    summary = json.loads((root / "data" / "summary.json").read_text(encoding="utf-8"))
    paired = []
    for r in load_csv(root / "data" / "paired_luna_deepseek.csv"):
        rec = {"benchmark": r["benchmark"], "task_id": r["task_id"]}
        for m in ("luna", "deepseek"):
            rec[m] = {
                "task_success": b(r[f"{m}_task_success"]),
                "base_status": r[f"{m}_base_status"] or None,
                "plus_status": r[f"{m}_plus_status"] or None,
                "duration_seconds": num(r[f"{m}_duration_seconds"]),
                "environment_steps": num(r[f"{m}_environment_steps"]),
                "tool_call_count": num(r[f"{m}_tool_call_count"]),
                "tool_error_count": num(r[f"{m}_tool_error_count"]),
                "invalid_action_count": num(r[f"{m}_invalid_action_count"]),
                "input_tokens": num(r[f"{m}_input_tokens"]),
                "output_tokens": num(r[f"{m}_output_tokens"]),
                "reasoning_tokens": num(r[f"{m}_reasoning_tokens"]),
            }
        paired.append(rec)
    return {"summary": summary, "paired": paired}


def build_flash(root):
    root = Path(root)
    cs = json.loads((root / "result" / "comparison_summary.json").read_text(encoding="utf-8"))
    def norm(g):
        tok = g.get("tokens") or {}
        return {
            "condition_id": g["condition_id"], "model": g.get("model"),
            "mean_score_10": g.get("mean_score_10"),
            "full_score_rate": g.get("full_score_rate"),
            "elapsed_median": (g.get("successful_candidate_timing") or {}).get("median"),
            "output_tokens_mean": tok.get("outputTokens", {}).get("mean"),
            "reasoning_tokens_mean": tok.get("reasoningOutputTokens", {}).get("mean"),
        }
    wb_rows = []
    fp = root / "wild20" / "result" / "wildbench_20" / "frontend_rows.jsonl"
    if fp.exists():
        with fp.open(encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                tok = r.get("token_usage") or {}
                wb_rows.append({
                    "run_id": r.get("run_id"), "task_id": r.get("task_id"), "task_type": r.get("task_type"),
                    "condition_id": r.get("condition_id"), "model": r.get("model"), "effort": r.get("effort"),
                    "repeat_id": r.get("repeat_id"),
                    "score_10": r.get("score_10"), "wb_score": r.get("wb_score"),
                    "elapsed_seconds": r.get("elapsed_seconds"),
                    "client_first_answer_delta_seconds": r.get("client_first_answer_delta_seconds"),
                    "input_tokens": tok.get("inputTokens"), "output_tokens": tok.get("outputTokens"),
                    "reasoning_tokens": tok.get("reasoningOutputTokens"),
                    "row_status": r.get("row_status"), "join_issues": r.get("join_issues"),
                })
    return {
        "formal60": {"groups": [norm(g) for g in cs["formal60"]["groups"]],
                     "paired": cs["formal60"].get("paired_comparisons", [])},
        "wild20": {"groups": [norm(g) for g in cs["wild20"]["groups"]],
                   "paired": cs["wild20"].get("paired_comparisons", []),
                   "rows": wb_rows},
    }


def build_model_compare(paired, lunads, subjective, wildbench):
    """三模型对比（同为 high）：sol / luna / deepseek-flash。代码题按 task_id 联表，主观题取 high 配置汇总。"""
    # 代码题：EvalPlus 的 sol high 与 Luna/DeepSeek 的 humaneval100 联表
    luna_by_task = {r["task_id"]: r for r in lunads["paired"] if r["benchmark"] == "humaneval100"}
    code_per_task = []
    for p in paired:
        lr = luna_by_task.get(p["task_id"])
        if not lr:
            continue
        code_per_task.append({
            "task_id": p["task_id"],
            "sol": {"success": p["high"]["task_success"], "duration": p["high"]["duration_seconds"], "output_tokens": p["high"]["output_tokens"]},
            "luna": {"success": lr["luna"]["task_success"], "duration": lr["luna"]["duration_seconds"], "output_tokens": lr["luna"]["output_tokens"]},
            "deepseek": {"success": lr["deepseek"]["task_success"], "duration": lr["deepseek"]["duration_seconds"], "output_tokens": lr["deepseek"]["output_tokens"]},
        })

    def code_summary(name, key):
        n = len(code_per_task)
        succ = sum(1 for t in code_per_task if t[key]["success"] is True)
        durs = [t[key]["duration"] for t in code_per_task if t[key]["duration"] is not None]
        outs = [t[key]["output_tokens"] for t in code_per_task if t[key]["output_tokens"] is not None]
        return {
            "model": name,
            "n": n,
            "success_rate": (succ / n) if n else None,
            "mean_duration": (sum(durs) / len(durs)) if durs else None,
            "mean_output_tokens": (sum(outs) / len(outs)) if outs else None,
        }

    def subj_summary(conds):
        out = []
        for cid, name in (("sol_high", "sol"), ("luna_high", "luna"), ("deepseek_high", "deepseek")):
            g = next((x for x in conds if x["condition_id"] == cid), None)
            if g:
                out.append({
                    "model": name,
                    "mean_score_10": g.get("mean_score_10"),
                    "elapsed_median": g.get("elapsed_median"),
                    "output_tokens_mean": g.get("output_tokens_mean"),
                })
        return out

    return {
        "code": {
            "summary": [code_summary("sol", "sol"), code_summary("luna", "luna"), code_summary("deepseek", "deepseek")],
            "per_task": code_per_task,
        },
        "subj60": {"summary": subj_summary(subjective["conditions"]) if subjective.get("conditions") else []},
        "wild20": {"summary": subj_summary(wildbench["groups"])},
    }


def build_wildbench(root):
    root = Path(root)
    rdir = root / "result" / "wildbench_20"
    summ = json.loads((rdir / "summary.json").read_text(encoding="utf-8"))
    groups = []
    for g in summ.get("groups", []):
        groups.append({
            "condition_id": g["condition_id"], "model": g["model"], "effort": g["effort"],
            "mean_score_10": g.get("mean_score_10"), "mean_wb_score": g.get("mean_wb_score"),
            "full_score_rate": g.get("full_score_rate"),
            "elapsed_median": (g.get("timing") or {}).get("elapsed_seconds", {}).get("median"),
            "output_tokens_mean": (g.get("tokens") or {}).get("outputTokens", {}).get("mean"),
            "reasoning_tokens_mean": (g.get("tokens") or {}).get("reasoningOutputTokens", {}).get("mean"),
        })
    rows = []
    with (rdir / "frontend_rows.jsonl").open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            tok = r.get("token_usage") or {}
            rows.append({
                "run_id": r.get("run_id"), "task_id": r.get("task_id"), "task_type": r.get("task_type"),
                "condition_id": r.get("condition_id"), "model": r.get("model"), "effort": r.get("effort"),
                "repeat_id": r.get("repeat_id"),
                "score_10": r.get("score_10"), "wb_score": r.get("wb_score"),
                "elapsed_seconds": r.get("elapsed_seconds"),
                "client_first_answer_delta_seconds": r.get("client_first_answer_delta_seconds"),
                "input_tokens": tok.get("inputTokens"), "output_tokens": tok.get("outputTokens"),
                "reasoning_tokens": tok.get("reasoningOutputTokens"),
                "row_status": r.get("row_status"), "join_issues": r.get("join_issues"),
            })
    return {
        "groups": groups,
        "paired": summ.get("paired_task_comparisons", []),
        "repeats": summ.get("repeat_judge_agreement", []),
        "rows": rows,
    }


def build_solalfworld(root):
    root = Path(root)
    runs = json.loads((root / "data" / "all_runs.json").read_text(encoding="utf-8"))
    summary = json.loads((root / "data" / "summary.json").read_text(encoding="utf-8"))
    high = next((s for s in summary if s.get("reasoning_effort") == "high"), None)
    per_task = {}
    for r in runs:
        if r.get("reasoning_effort") == "high":
            per_task[r["task_id"]] = {
                "success": r.get("task_success"),
                "duration": r.get("duration_seconds"),
                "steps": r.get("environment_steps"),
                "tool_calls": r.get("tool_call_count"),
                "output_tokens": r.get("output_tokens"),
            }
    return {"summary": summary, "high": high, "per_task": per_task}


def build_repairs(root):
    root = Path(root)
    summary = json.loads((root / "data" / "repair_summary.json").read_text(encoding="utf-8"))
    rounds = json.loads((root / "data" / "repair_rounds.json").read_text(encoding="utf-8"))
    norm = []
    for r in rounds:
        norm.append({
            "run_id": r.get("run_id"), "task_id": r.get("task_id"), "model_group": r.get("model_group"),
            "chain_id": r.get("chain_id"), "repair_round": r.get("repair_round"),
            "task_success": r.get("task_success"), "base_status": r.get("base_status"), "plus_status": r.get("plus_status"),
            "execution_status": r.get("execution_status"),
            "duration_seconds": r.get("duration_seconds"), "total_tokens": r.get("total_tokens"),
            "output_tokens": r.get("output_tokens"), "input_tokens": r.get("input_tokens"),
            "tool_call_count": r.get("tool_call_count"), "test_execution_count": r.get("test_execution_count"),
        })
    return {"summary": summary, "rounds": norm}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("bundle", help="完整交接包根目录")
    ap.add_argument("--subjective", default=None, help="主观评分实验包根目录（可选）")
    ap.add_argument("--lunads", default=None, help="Luna vs DeepSeek 交接包根目录（可选）")
    ap.add_argument("--wildbench", default=None, help="WildBench 四组实验包根目录（可选）")
    ap.add_argument("--flash", default=None, help="DeepSeek Flash 补充实验包根目录（可选）")
    ap.add_argument("--solalfworld", default=None, help="Sol ALFWorld 补充实验包根目录（可选）")
    ap.add_argument("--repairs", default=None, help="Luna vs DeepSeek 修复实验包根目录（可选）")
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
    lunads = build_lunads(a.lunads) if a.lunads else None
    wildbench = build_wildbench(a.wildbench) if a.wildbench else None
    flash = build_flash(a.flash) if a.flash else None
    solalf = build_solalfworld(a.solalfworld) if a.solalfworld else None
    repairs = build_repairs(a.repairs) if a.repairs else None

    # 把 DeepSeek Flash 补充合并进两个主观实验
    if wildbench and flash:
        wildbench["groups"] = flash["wild20"]["groups"]  # 5 配置
        wildbench["rows"] = wildbench["rows"] + flash["wild20"]["rows"]  # 追加 deepseek 逐题数据
        ds_vs_high = next((c for c in flash["wild20"]["paired"] if c["reference_condition_id"] == "sol_high"), None)
        if ds_vs_high:
            wildbench["paired"] = wildbench["paired"] + [{
                "condition_id": "deepseek_high", "reference_condition_id": "sol_high",
                "mean_difference": ds_vs_high["mean_difference"],
                "higher": ds_vs_high["higher"], "tied": ds_vs_high["tied"], "lower": ds_vs_high["lower"],
            }]
    if subjective and flash:
        subjective["conditions"] = flash["formal60"]["groups"]  # 5 配置汇总
        subjective["conditions_paired"] = flash["formal60"]["paired"]

    model_compare = None
    if paired and lunads and subjective and wildbench:
        model_compare = build_model_compare(paired, lunads, subjective, wildbench)

    # 把 sol 加入 lunads 的 HumanEval（三模型对比），ALFWorld 保持 luna/deepseek
    if lunads and model_compare:
        sol = next((s for s in model_compare["code"]["summary"] if s["model"] == "sol"), None)
        if sol:
            lunads["summary"].append({
                "model_group": "sol", "benchmark": "humaneval100",
                "official_success": round(sol["success_rate"] * 100),
                "success_rate": sol["success_rate"],
                "duration_seconds_mean": sol["mean_duration"],
                "output_tokens_mean": sol["mean_output_tokens"],
                "input_tokens_mean": None, "reasoning_tokens_mean": None,
                "environment_steps_mean": None, "tool_call_count_mean": None,
                "tool_error_count_mean": None, "invalid_action_count_mean": None,
                "base_pass": None, "plus_pass": None,
            })

    # 把 Sol 加入 ALFWorld（三模型对比），并扩展 model_compare
    if lunads and solalf and solalf["high"] and model_compare:
        h = solalf["high"]
        lunads["summary"].append({
            "model_group": "sol", "benchmark": "alfworld60",
            "official_success": h.get("success"),
            "success_rate": h.get("success_rate"),
            "duration_seconds_mean": h.get("duration_seconds_mean"),
            "output_tokens_mean": h.get("output_tokens_mean"),
            "input_tokens_mean": h.get("input_tokens_mean"),
            "reasoning_tokens_mean": h.get("reasoning_tokens_mean"),
            "environment_steps_mean": h.get("environment_steps_mean"),
            "tool_call_count_mean": h.get("tool_call_count_mean"),
            "tool_error_count_mean": h.get("tool_error_count_mean"),
            "invalid_action_count_mean": h.get("invalid_action_count_mean"),
            "base_pass": None, "plus_pass": None,
        })
        luna_alf = {p["task_id"]: p for p in lunads["paired"] if p["benchmark"] == "alfworld60"}
        alf_per_task = []
        for tid, s in solalf["per_task"].items():
            lr = luna_alf.get(tid)
            if not lr:
                continue
            alf_per_task.append({
                "task_id": tid,
                "sol": {"success": s["success"], "duration": s["duration"], "steps": s["steps"], "tool_calls": s["tool_calls"], "output_tokens": s["output_tokens"]},
                "luna": {"success": lr["luna"]["task_success"], "duration": lr["luna"]["duration_seconds"], "steps": lr["luna"]["environment_steps"], "tool_calls": lr["luna"]["tool_call_count"], "output_tokens": lr["luna"]["output_tokens"]},
                "deepseek": {"success": lr["deepseek"]["task_success"], "duration": lr["deepseek"]["duration_seconds"], "steps": lr["deepseek"]["environment_steps"], "tool_calls": lr["deepseek"]["tool_call_count"], "output_tokens": lr["deepseek"]["output_tokens"]},
            })

        def alf_summary(name, key):
            n = len(alf_per_task)
            succ = sum(1 for t in alf_per_task if t[key]["success"] is True)
            durs = [t[key]["duration"] for t in alf_per_task if t[key]["duration"] is not None]
            steps = [t[key]["steps"] for t in alf_per_task if t[key]["steps"] is not None]
            return {"model": name, "n": n,
                    "success_rate": (succ / n) if n else None,
                    "mean_duration": (sum(durs) / len(durs)) if durs else None,
                    "mean_steps": (sum(steps) / len(steps)) if steps else None}

        model_compare["alfworld"] = {
            "summary": [alf_summary("sol", "sol"), alf_summary("luna", "luna"), alf_summary("deepseek", "deepseek")],
            "per_task": alf_per_task,
        }

    payload = {
        "kind": "real",
        "source": "CodeDepth 四档 + 主观评分 + Luna/DeepSeek + WildBench",
        "generatedAt": datetime.datetime.now().astimezone().isoformat(),
        "note": "四个子实验合并。reasoning_effort 未经独立验证；相关≠因果；不同实验口径不合并。",
        "efforts": EFFORTS,
        "meta": {
            "primary_tasks": len(paired),
            "repair_rounds": len(repair_rounds),
            "repair_chains": len(repair_groups),
            "tool_actions": len(tool_actions),
            "candidates": len(candidates),
            "specs": len(specs),
            "subjective_answers": len(subjective["primary_rows"]) if subjective else 0,
            "lunads_runs": len(lunads["paired"]) if lunads else 0,
            "wildbench_rows": len(wildbench["rows"]) if wildbench else 0,
            "flash_formal60": len(flash["formal60"]["groups"]) if flash else 0,
            "model_compare_code_tasks": len(model_compare["code"]["per_task"]) if model_compare else 0,
        },
        "paired": paired,
        "repair_rounds": repair_rounds,
        "repair_groups": repair_groups,
        "tool_actions": tool_actions,
        "candidates": candidates,
        "specs": specs,
        "subjective": subjective,
        "lunads": lunads,
        "wildbench": wildbench,
        "flash": flash,
        "model_compare": model_compare,
        "repairs": repairs,
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
