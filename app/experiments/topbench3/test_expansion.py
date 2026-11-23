"""Offline sampling/protocol controls for the additional 60-case batch."""
from collections import Counter
import unittest

import protocol as p
import runner as r
import expand60 as extension


class ExpansionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest, cls.prompts, cls.cases = extension.validate()
        cls.base = p.load(r.plan_path(extension.BASE))

    def test_new_cases_are_nonoverlapping_and_balanced(self):
        self.assertEqual(len(self.cases), 60)
        self.assertFalse(set(self.cases) & {c['source_task_id'] for c in self.base['cases']})
        cells = Counter((c['privacy_domain'],c['difficulty']) for c in self.manifest['cases'])
        self.assertEqual(len(cells),20)
        self.assertEqual(set(cells.values()),{3})

    def test_condition_matrix_and_global_task_aliases(self):
        self.assertEqual(len(self.manifest['matrix']),180)
        self.assertEqual(len({c['combination_id'] for c in self.manifest['matrix']}),180)
        self.assertFalse({c['task_id'] for c in self.manifest['cases']} & {c['task_id'] for c in self.base['cases']})
        for c in self.manifest['cases']:
            self.assertEqual({r['strategy'] for r in self.manifest['matrix'] if r['source_task_id']==c['source_task_id']},{'baseline','tnm','cbd'})

    def test_model_protocol_judges_and_templates_unchanged(self):
        for key in ('model','reasoning_effort','base_url','protocol','max_output_tokens','request_timeout_seconds','workers','judge_model','judge_reasoning_effort','automatic_retries'):
            self.assertEqual(self.manifest['config'][key],self.base['config'][key])
        self.assertEqual(p.digest(p.canonical(self.prompts)),self.base['prompt_sha256'])


if __name__=='__main__':
    unittest.main(verbosity=2)
