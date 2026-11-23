"""Build TOP-Bench-only feature data for a future dashboard view; no APIs.

Inputs are the completed experiment's feature exports. This script never writes
raw evidence, previous benchmarks, or app/dashboard. No extra dependencies.
"""
from collections import Counter, defaultdict
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXPERIMENT = "topbench3_sol_high_prompts20_v1"
SOURCE = ROOT / "data/processed/topbench3" / EXPERIMENT
OUT = SOURCE / "visualization"
STRATEGIES = ("baseline", "tnm", "cbd")
LABELS = {"baseline": "原始提示", "tnm": "任务必要最小化 TNM", "cbd": "情境边界披露 CBD"}
STAGES = ("selection", "answer", "completion", "leakage")
OUTCOMES = {
    (True, False): "completed_safe", (True, True): "completed_leaking",
    (False, False): "incomplete_safe", (False, True): "incomplete_leaking",
}


def read(name):
    return json.loads((SOURCE / name).read_text(encoding="utf-8-sig"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, value):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def mean(values):
    observed = [x for x in values if x is not None]
    return sum(observed) / len(observed) if observed else None


def rates(rows):
    valid = [x for x in rows if type(x["task_completed"]) is bool and type(x["privacy_leaked"]) is bool and x["evaluation_status"] == "completed"]
    cr, lr = mean([int(x["task_completed"]) for x in valid]), mean([int(x["privacy_leaked"]) for x in valid])
    denominator = None if cr is None else cr + 1 - lr
    return dict(n=len(valid), completion_rate=cr, leakage_rate=lr,
                h_score=None if denominator is None else (2 * cr * (1-lr) / denominator if denominator else 0),
                safe_completion_rate=mean([int(x["task_completed"] and not x["privacy_leaked"]) for x in valid]),
                outcomes=dict(Counter(x["outcome"] for x in valid)),
                solver_tokens_mean=mean([x["solver_total_tokens"] for x in valid]),
                solver_tokens_known_records=sum(x["solver_total_tokens"] is not None for x in valid),
                solver_seconds_mean=mean([x["solver_duration_seconds"] for x in valid]),
                selected_fixture_tools_mean=mean([x["tool_call_count"] for x in valid]))


def build(experiment=EXPERIMENT):
    global SOURCE, OUT
    if not experiment or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for c in experiment):
        raise ValueError('Invalid experiment ID')
    SOURCE = ROOT / 'data/processed/topbench3' / experiment
    OUT = SOURCE / 'visualization'
    input_names = ("runs.json", "requests.json", "tool_graphs.json", "summary.json", "integrity_report.json")
    before = {name: sha(SOURCE / name) for name in input_names}
    original = read("runs.json")
    expected = read('summary.json')
    planned_count = expected['planned_distinct_cases']
    source_requests, source_graphs = read("requests.json"), read("tool_graphs.json")
    # Explicit feature allowlist. No task/answer text, tool return, identity or sensitive target.
    allowed = (
        "run_id", "task_id", "source_task_id", "strategy", "model", "reasoning_effort", "repeat", "privacy_domain", "difficulty",
        "execution_status", "evaluation_status", "task_completed", "privacy_leaked", "outcome", "selected_tool_ids",
        "tool_call_count", "native_tool_call_count", "noise_tool_count", "supporting_set_precision", "supporting_set_recall",
        "all_supporting_tools_selected", "solver_input_tokens", "solver_output_tokens", "solver_reasoning_tokens",
        "solver_cached_input_tokens", "solver_total_tokens", "solver_duration_seconds", "solver_http_attempts",
        "judge_input_tokens", "judge_output_tokens", "judge_reasoning_tokens", "judge_cached_input_tokens",
        "judge_total_tokens", "judge_duration_seconds", "judge_http_attempts",
    )
    runs = [{k: x.get(k) for k in allowed} for x in original]
    runs.sort(key=lambda x: (x["task_id"], STRATEGIES.index(x["strategy"])))
    assert len({x["run_id"] for x in runs}) == len(runs), "Duplicate run_id"
    assert len({(x["source_task_id"], x["strategy"], x["repeat"]) for x in runs}) == len(runs), "Duplicate case/strategy/repeat"
    by_run = {x["run_id"]: x for x in runs}
    per_case, requests, graphs = defaultdict(list), [], []
    for x in runs:
        assert x["strategy"] in STRATEGIES
        assert x["native_tool_call_count"] == 0, "Static fixture protocol must stay separate from native tool calls"
        assert len(x["selected_tool_ids"]) == len(set(x["selected_tool_ids"])) == x["tool_call_count"]
        if x["evaluation_status"] == "completed":
            assert type(x["task_completed"]) is bool and type(x["privacy_leaked"]) is bool
            assert x["outcome"] == OUTCOMES[(x["task_completed"], x["privacy_leaked"])]
        for k, v in x.items():
            if k.endswith(("_tokens", "_seconds")) and v is not None:
                assert type(v) in (int, float) and math.isfinite(v) and v >= 0, (x["run_id"], k)
        per_case[x["source_task_id"]].append(x)
    paired = {case for case, rows in per_case.items() if len(rows) == 3 and {x["strategy"] for x in rows} == set(STRATEGIES) and all(x["evaluation_status"] == "completed" and type(x["task_completed"]) is bool and type(x["privacy_leaked"]) is bool for x in rows)}
    request_fields = ("stage", "phase", "attempt_id", "status", "duration_seconds", "input_tokens", "output_tokens", "reasoning_tokens", "cached_input_tokens", "total_tokens", "failure_category")
    for x in source_requests:
        assert x["run_id"] in by_run and x["stage"] in STAGES
        row = by_run[x["run_id"]]
        record = {k: x.get(k) for k in request_fields}
        record.update(run_id=x["run_id"], task_id=row["task_id"], strategy=row["strategy"])
        for source, target in (("started_at", "started_at_utc"), ("ended_at", "ended_at_utc")):
            value = x.get(source)
            if value:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                assert parsed.tzinfo, "Do not invent timezone"
                record[target] = parsed.astimezone(timezone.utc).isoformat()
            else:
                record[target] = None
        requests.append(record)
    assert len({(x["run_id"], x["stage"], x["attempt_id"]) for x in requests}) == len(requests)
    for x in source_graphs:
        assert x["run_id"] in by_run
        parent = by_run[x["run_id"]]
        nodes = [{k: n[k] for k in ("tool_id", "tool_family", "selected", "reference_support_member", "dataset_essential")} for n in x["nodes"]]
        assert len({n["tool_id"] for n in nodes}) == len(nodes)
        assert {n["tool_id"] for n in nodes if n["selected"]} == set(parent["selected_tool_ids"])
        graphs.append(dict(run_id=x["run_id"], task_id=parent["task_id"], strategy=parent["strategy"], nodes=nodes,
                           edges=[dict(source=parent["strategy"], target=n["tool_id"], relation="selected_fixture") for n in nodes if n["selected"]]))
    assert {g["run_id"] for g in graphs} == set(by_run), "Graph coverage incomplete"
    for row in runs:
        evidence = [x for x in requests if x["run_id"] == row["run_id"]]
        assert {x["stage"] for x in evidence if x["status"] == "completed"} == set(STAGES)
        for phase in ("solver", "judge"):
            for metric in ("input_tokens", "output_tokens", "total_tokens"):
                values = [x[metric] for x in evidence if x["phase"] == phase]
                if values and all(v is not None for v in values):
                    assert sum(values) == row[phase + "_" + metric], (row["run_id"], phase, metric)
    summaries, segments = [], []
    for strategy in STRATEGIES:
        rows = [x for x in runs if x["strategy"] == strategy and x["source_task_id"] in paired]
        summaries.append(dict(strategy=strategy, label=LABELS[strategy], **rates(rows)))
        for dimension in ("privacy_domain", "difficulty"):
            for category in sorted({x[dimension] for x in runs}):
                segments.append(dict(strategy=strategy, dimension=dimension, category=category,
                                     **rates([x for x in rows if x[dimension] == category])))
    cases = []
    transitions = []
    for source_id, rows in sorted(per_case.items(), key=lambda item: item[1][0]["task_id"]):
        assert len({(r["task_id"], r["privacy_domain"], r["difficulty"]) for r in rows}) == 1
        cases.append(dict(task_id=rows[0]["task_id"], source_task_id=source_id, privacy_domain=rows[0]["privacy_domain"],
                          difficulty=rows[0]["difficulty"], paired_complete=source_id in paired,
                          runs={r["strategy"]: r["run_id"] for r in rows}))
        if source_id in paired:
            indexed = {r["strategy"]: r for r in rows}
            for strategy in ("tnm", "cbd"):
                transitions.append(dict(task_id=rows[0]["task_id"], compared_strategy=strategy,
                                        baseline_outcome=indexed["baseline"]["outcome"], compared_outcome=indexed[strategy]["outcome"],
                                        completion_delta=int(indexed[strategy]["task_completed"]) - int(indexed["baseline"]["task_completed"]),
                                        leakage_delta=int(indexed[strategy]["privacy_leaked"]) - int(indexed["baseline"]["privacy_leaked"])))
    metadata = dict(schema_version="topbench-viz-1", experiment_id=experiment, model="gpt-6.1-sol", effort="high",
                    dataset="TOP-Bench v3", source_commit=original[0]["source_commit"],
                    strategies=[dict(id=s, name=LABELS[s]) for s in STRATEGIES],
                    domains=sorted({x["privacy_domain"] for x in runs}), difficulties=sorted({x["difficulty"] for x in runs}),
                    planned_cases=planned_count, paired_cases=len(paired),
                    score_scope="same_model_blind_automated_judges_not_human_labels",
                    tool_scope="selection_of_static_fixture_returns_not_native_execution",
                    h_formula="2 * CR * (1 - LR) / (CR + 1 - LR)",
                    sampling=f'{planned_count // 20} cases per domain/difficulty cell; balanced subset, not full1000 distribution')
    payload = dict(metadata=metadata, summaries=summaries, segments=segments, cases=cases, runs=runs,
                   paired_outcome_changes=transitions, requests=requests, tool_graphs=graphs)
    missing = {key: sum(x[key] is None for x in runs) for key in allowed}
    quality = dict(cases=len(cases), paired_cases=len(paired), runs=len(runs), requests=len(requests), graphs=len(graphs),
                   execution_statuses=dict(Counter(x["execution_status"] for x in runs)),
                   evaluation_statuses=dict(Counter(x["evaluation_status"] for x in runs)),
                   request_statuses=dict(Counter(x["status"] for x in requests)), missing_by_field=missing,
                   removed_duplicate_records=0, label_imputation=False, original_files_modified=False,
                   raw_content_in_payload=False, frontend_files_modified=False,
                   validation_checks=["unique run and case/strategy identities", "boolean verdicts and 4-state outcomes",
                                      "paired 3-strategy denominator", "tool selection matches graph nodes",
                                      "request stage coverage", "request/run solver and judge usage reconciled", "null usage retained"],
                   limitations=[f'{planned_count} cases only; domain n={planned_count // 5} and difficulty n={planned_count // 4}; each domain/difficulty cell n={planned_count // 20}.',
                                "No independent human labels yet; judge model is the same as the solver.",
                                "Model identity, effort support and prices remain unverified at the relay.",
                                "Reference supporting set is an annotated privacy-inference support set, not the task-optimal tool set."])
    assert len(paired) == expected["paired_complete_cases"] == planned_count
    assert len(runs) == planned_count * 3 and len(requests) >= len(runs) * 4
    for s in summaries:
        for key, old in (("completion_rate", "CR"), ("leakage_rate", "LR"), ("h_score", "H_score")):
            assert math.isclose(s[key], expected["strategies"][s["strategy"]][old], abs_tol=1e-12)
    save("dashboard_data.json", payload)
    save("quality_report.json", quality)
    assert before == {name: sha(SOURCE / name) for name in input_names}, "Source changed during export"
    save("manifest.json", dict(inputs=before, builder_sha256=sha(Path(__file__)),
                               outputs={name: sha(OUT / name) for name in ("dashboard_data.json", "quality_report.json")}))
    print(json.dumps(dict(cases=len(cases), runs=len(runs), requests=len(requests), output=str(OUT),
                          summaries=summaries), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--experiment-id', default=EXPERIMENT)
    build(parser.parse_args().experiment_id)
