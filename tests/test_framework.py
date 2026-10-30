"""Synthetic fixtures only. No model calls or untrusted generated code."""
import argparse
import csv
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from runner.parse_trace import parse_trace
from runner.evaluate import evaluate
from runner import run_experiment as runner
from analysis.summarize import summarize
class FrameworkTests(unittest.TestCase):
    def test_observable_events_deduplicate_tools_and_usage(self):
        with tempfile.TemporaryDirectory() as td:
            trace=Path(td)/"trace.jsonl"
            events=[{"type":"item.started","item":{"id":"c1","type":"command_execution","command":"python -m pytest"}},
                    {"type":"item.completed","item":{"id":"c1","type":"command_execution","exit_code":0}},
                    {"type":"item.completed","item":{"id":"a1","type":"agent_message","text":"Done"}},
                    {"type":"item.completed","item":{"id":"a1","type":"agent_message","text":"Done"}},
                    {"type":"turn.completed","turn_id":"t1","usage":{"input_tokens":10,"output_tokens":2}},
                    {"type":"turn.completed","turn_id":"t1","usage":{"input_tokens":10,"output_tokens":2}},
                    {"type":"something.new"}]
            trace.write_text("\n".join(json.dumps(e) for e in events)+"\nnot-json",encoding="utf-8")
            r=parse_trace(trace,"synthetic",prompt="Fix")
            self.assertEqual(r["metrics"]["tool_call_count"],1)
            self.assertEqual(r["metrics"]["input_tokens"],10)
            self.assertIsNone(r["metrics"]["reasoning_tokens"])
            self.assertEqual(len(r["messages"]),2)
            self.assertEqual(r["metrics"]["test_execution_count"],1)
            self.assertEqual(len(r["warnings"]),1)
    def test_missing_fields_failure_and_unknown(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"trace";p.write_text('[]\n{"type":"turn.failed"}\n{}',encoding="utf-8")
            r=parse_trace(p,"synthetic")
            self.assertFalse(r["metrics"]["agent_completed"])
            self.assertIsNone(r["metrics"]["input_tokens"])
            self.assertEqual(r["events"][-1]["event_type"],"unknown")
    def test_evaluation_blocked_by_default(self):
        with patch("runner.evaluate.subprocess.run") as mocked:
            self.assertEqual(evaluate(".",".",".")["evaluation_status"],"blocked_isolation")
            mocked.assert_not_called()
    def test_trusted_baseline_and_reference_evaluation(self):
        # These are developer-authored fixtures, never agent-generated candidates.
        with tempfile.TemporaryDirectory() as td:
            work=Path(td)/"work";work.mkdir()
            source=runner.ROOT/"tasks/T001/starter/solution.py"
            (work/"solution.py").write_text(source.read_text(),encoding="utf-8")
            bad=evaluate(work,runner.ROOT/"evaluation/T001",Path(td)/"bad",approved=True)
            self.assertFalse(bad["task_success"])
            self.assertEqual(bad["test_total"],5)
            (work/"solution.py").write_text("def average(numbers):\n    return sum(numbers)/len(numbers) if numbers else 0\n",encoding="utf-8")
            good=evaluate(work,runner.ROOT/"evaluation/T001",Path(td)/"good",approved=True)
            self.assertTrue(good["task_success"])
            self.assertEqual(good["test_passed"],5)
    def test_windows_npm_shim_case_insensitive(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); script=root/"node_modules/@openai/codex/bin/codex.js"; script.parent.mkdir(parents=True); script.write_text("")
            with patch.object(runner.shutil,"which",side_effect=lambda name: str(root/"codex.CMD") if name=="codex" else "node.exe"):
                self.assertEqual(runner.cli_command("codex"),["node.exe",str(script)])
    def test_preview_no_ai_or_output_and_fake_failure(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/"tasks").mkdir()
            import shutil
            shutil.copytree(runner.ROOT/"tasks/T001",root/"tasks/T001")
            a=argparse.Namespace(task="T001",effort="low",model="fake",codex="fake",execute=False,timeout=2,isolation_confirmed=False,allow_host_evaluation=False)
            with patch.object(runner,"ROOT",root),patch.object(runner,"cli_command",return_value=[sys.executable,"-c","import sys; print('not-json'); sys.exit(2)"]):
                with patch.object(runner.subprocess,"Popen") as popen:
                    self.assertTrue(runner.run(a,1)["preview"]);popen.assert_not_called()
                self.assertFalse((root/"results").exists())
                a.execute=True
                first=runner.run(a,1);second=runner.run(a,2)
                self.assertEqual(first["execution_status"],"cli_failed")
                self.assertIsNone(first["task_success"])
                self.assertNotEqual(first["run_id"],second["run_id"])
                self.assertEqual((root/"results"/first["run_id"]/"workspace/solution.py").read_text(),(root/"results"/second["run_id"]/"workspace/solution.py").read_text())
                self.assertFalse((root/"results"/first["run_id"]/"workspace/test_average.py").exists())
    def test_timeout_saved(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            import shutil
            shutil.copytree(runner.ROOT/"tasks",root/"tasks")
            a=argparse.Namespace(task="T001",effort="high",model="fake",codex="fake",execute=True,timeout=.2,isolation_confirmed=True,allow_host_evaluation=False)
            with patch.object(runner,"ROOT",root),patch.object(runner,"cli_command",return_value=[sys.executable,"-c","import sys,time; print('fake') if '--version' in sys.argv else time.sleep(5)"]):
                row=runner.run(a,1)
                self.assertEqual(row["execution_status"],"timeout")
                self.assertTrue((root/"results"/row["run_id"]/"metrics.json").exists())
    def test_http_preview_and_model_access_failure(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            import shutil
            shutil.copytree(runner.ROOT/"tasks",root/"tasks")
            a=argparse.Namespace(task="T001",effort="low",model="unavailable",codex="fake",execute=False,timeout=2,isolation_confirmed=True,allow_host_evaluation=True,http_only=True)
            event=json.dumps({"type":"turn.failed","error":{"message":"model_not_found"}})
            script="import sys; print("+repr(event)+"); sys.exit(1)"
            with patch.object(runner,"ROOT",root),patch.object(runner,"cli_command",return_value=[sys.executable,"-c",script]):
                preview=runner.run(a,1)
                self.assertIn("model_providers.openai-http.supports_websockets=false",preview["command"])
                self.assertIn("--ignore-user-config",preview["command"])
                a.execute=True
                with patch.object(runner,"evaluate") as evaluator:
                    result=runner.run(a,1)
                    evaluator.assert_not_called()
                self.assertEqual(result["failure_category"],"model_access")
                self.assertEqual(result["evaluation_status"],"blocked_model_access")
                self.assertIsNone(result["task_success"])
                self.assertTrue(result["trace_errors"])
    def test_policy_denial_and_reasoning_alias(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            import shutil
            shutil.copytree(runner.ROOT/"tasks",root/"tasks")
            a=argparse.Namespace(task="T001",effort="low",model="fake",codex="fake",execute=False,timeout=2,isolation_confirmed=True,allow_host_evaluation=False,http_only=True,windows_sandbox="elevated")
            event=json.dumps({"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":4,"reasoning_output_tokens":2}})
            script="import sys; print("+repr(event)+"); print('exec_command rejected: blocked by policy',file=sys.stderr)"
            with patch.object(runner,"ROOT",root),patch.object(runner,"cli_command",return_value=[sys.executable,"-c",script]):
                self.assertIn('windows.sandbox="elevated"',runner.run(a,1)["command"])
                a.execute=True
                result=runner.run(a,1)
                self.assertEqual(result["failure_category"],"policy_blocked")
                self.assertEqual(result["reasoning_tokens"],2)
                self.assertEqual(result["tool_call_count"],0)
                self.assertTrue(result["policy_denials"])
    def test_analysis_excludes_synthetic_and_missing(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"runs.csv"
            p.write_text("reasoning_effort,data_kind,task_success,input_tokens,output_tokens,duration_seconds,tool_call_count\nlow,real,True,10,2,3,1\nlow,real,,,,,\nlow,synthetic,False,100,100,100,100\n",encoding="utf-8")
            r=summarize(p)["low"]
            self.assertEqual(r["n"],2);self.assertEqual(r["evaluated_n"],1)
            self.assertEqual(r["success_rate"],1);self.assertEqual(r["mean_total_tokens"],12)
if __name__=="__main__": unittest.main()
