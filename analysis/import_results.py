#!/usr/bin/env python
"""从队友打包的压缩包 / 目录导入三张派生 CSV，并重新生成仪表盘数据。

安全约定：只读取 runs.csv / events.csv / messages.csv 三张派生表，复制到 results/；
原始 trace.jsonl / workspace / stderr.log 等私有材料不复制、不进仓库、不执行。

用法（从项目根目录）：
    python analysis/import_results.py 队友发来的.zip            # .zip 自动解压到临时目录
    python analysis/import_results.py 某个已解压的目录/          # .rar/.7z 请先手动解压再传目录
    python analysis/import_results.py xxx.zip --no-export       # 只导入 CSV，不重生成 data.js
"""
import argparse
import csv
import datetime
import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

import export_dashboard_data as ex

REQUIRED = {"runs.csv", "events.csv", "messages.csv"}
SIGNATURE = {
    "runs.csv": {"run_id", "reasoning_effort", "task_success"},
    "events.csv": {"run_id", "event_index", "event_type"},
    "messages.csv": {"run_id", "role", "content"},
}


def find_csv_files(root):
    """递归查找三张 CSV；同名多份时优先选表头含特征字段的那份。"""
    root = Path(root)
    candidates = {k: [] for k in REQUIRED}
    for p in root.rglob("*.csv"):
        if p.name in candidates:
            candidates[p.name].append(p)
    chosen = {}
    for name, paths in candidates.items():
        if not paths:
            continue
        sig = SIGNATURE[name]
        best = paths[0]
        for p in paths:
            try:
                with p.open("r", encoding="utf-8-sig", newline="") as f:
                    header = {c.strip() for c in f.readline().split(",")}
            except Exception:
                continue
            if sig.issubset(header):
                best = p
                break
        chosen[name] = best
    return chosen


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("source", help=".zip 文件或已解压目录")
    ap.add_argument("--dest", default="results", help="CSV 目标目录（默认 results/）")
    ap.add_argument("--no-export", action="store_true", help="不重新生成 dashboard/data.js")
    a = ap.parse_args()

    src = Path(a.source)
    tmpdir = None
    if src.suffix.lower() == ".zip":
        tmpdir = Path(tempfile.mkdtemp(prefix="codedepth_import_"))
        with zipfile.ZipFile(src) as z:
            z.extractall(tmpdir)
        root = tmpdir
    elif src.is_dir():
        root = src
    else:
        sys.exit("source 必须是 .zip 文件或已解压的目录")

    chosen = find_csv_files(root)
    missing = REQUIRED - set(chosen)
    if missing:
        found = ", ".join(sorted(chosen)) or "无"
        sys.exit("未找到：%s（已找到 %s）。请确认压缩包内含这三张派生 CSV。" % (", ".join(sorted(missing)), found))

    dest = Path(a.dest)
    dest.mkdir(parents=True, exist_ok=True)
    for name in sorted(REQUIRED):
        shutil.copy2(chosen[name], dest / name)
        print("已复制 %s -> %s" % (chosen[name], dest / name))

    # 简单核对
    try:
        with (dest / "runs.csv").open("r", encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))
        real = [r for r in rows if r.get("data_kind") == "real"]
        print("runs.csv 共 %d 行，其中 data_kind=real 有 %d 行" % (len(rows), len(real)))
    except Exception as e:
        print("（核对跳过：%s）" % e)

    if not a.no_export:
        payload = ex.build_payload(str(dest / "runs.csv"), str(dest / "events.csv"), str(dest / "messages.csv"))
        ex.write_data_js(payload, "dashboard/data.js")
        print("已重新生成 dashboard/data.js（kind=real，runs=%d）" % len(payload["runs"]))
        print("现在双击 dashboard/index.html 即可看到真实数据。")

    if tmpdir:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
