"""Archive ONLY demonstrable WinError 10013 pre-connect failures, no APIs.

Refuses recovery if any response, nonselection stage or other error exists.
All original request/status files and the ledger are retained in the incident.
"""
import shutil
from collections import Counter

import protocol as p
import runner as r
from expand60 import EXPERIMENT


def recover():
    root = r.cohort(EXPERIMENT).resolve()
    destination = root / 'transport_incidents/socket_block_001'
    with p.controller_lock():
        assert not destination.exists(), 'Incident already archived'
        states = list(root.glob('attempts/*/stages/*/state.json'))
        statuses = list(root.glob('attempts/*/stages/*/attempts/*/status.json'))
        assert states and statuses
        assert not list(root.glob('attempts/*/stages/*/attempts/*/response.json'))
        assert all(f.parent.name == 'selection' for f in states)
        for path in states + statuses:
            value = p.load(path)
            assert value['status'] == 'failed' and '[WinError 10013]' in value.get('error', ''), str(path)
        ledger = [line for line in (root/'http_attempts.jsonl').read_text(encoding='utf-8').splitlines() if line]
        assert len(ledger) == len(statuses)
        targets = [(root / name, destination / name) for name in ('runs', 'attempts', 'http_attempts.jsonl')]
        # Validate resolved absolute paths before any directory move on Windows.
        for source, target in targets:
            assert source.resolve().is_relative_to(root) and target.resolve().is_relative_to(root)
            assert source.exists() and not target.exists()
        destination.mkdir(parents=True)
        p.save(destination/'incident.json', dict(reason='Windows sandbox socket access denied before connection',
            error='WinError 10013', run_records=len(states), blocked_local_attempts=len(statuses),
            provider_responses=0, original_evidence_preserved=True,
            notes='No answer or judge existed. Classified as infrastructure failures, never as model outcomes.'))
        for source, target in targets:
            shutil.move(str(source), str(target))
        print(f'Archived {len(states)} local failures / {len(statuses)} blocked socket attempts. No model API called.')


if __name__ == '__main__':
    recover()
