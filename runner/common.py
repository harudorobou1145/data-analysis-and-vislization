import csv
import json
from pathlib import Path
RUN_FIELDS = "run_id task_id task_type task_difficulty model reasoning_effort repeat_index start_time end_time duration_seconds input_tokens output_tokens reasoning_tokens tool_call_count command_execution_count file_change_count test_execution_count test_passed test_total test_pass_rate task_success execution_status cli_exit_code agent_completed evaluation_status data_kind".split()
EVENT_FIELDS = "run_id event_index timestamp relative_time_seconds event_type item_id item_type tool_name status exit_code duration_seconds command error".split()
MESSAGE_FIELDS = "run_id message_id turn_id role content timestamp message_type".split()
def save_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
def csv_write(path, rows, fields):
    with Path(path).open("w", newline="", encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction="ignore"); w.writeheader(); w.writerows(rows)
