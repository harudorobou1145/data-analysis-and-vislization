"""Run meaningful offline controls and bind the receipt to frozen source hashes."""
from pathlib import Path
import sys
import unittest
import protocol as p
import runner as r

suite=unittest.defaultTestLoader.discover(str(p.HERE),pattern='test_topbench.py')
result=unittest.TextTestRunner(verbosity=2).run(suite)
if not result.wasSuccessful():raise SystemExit(1)
p.save(p.HERE/'validation.json',dict(passed=True,tests_run=result.testsRun,model_requests=0,
       checked_at=p.now(),script_sha256=r.fingerprints()))
print('Offline validation passed. No model API called.')
