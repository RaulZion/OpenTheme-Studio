import copy
import json
import unittest
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / 'contracts' / 'theme.schema.json').read_text(encoding='utf-8'))
SAMPLE = json.loads((ROOT / 'contracts' / 'sample.theme.json').read_text(encoding='utf-8'))

class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Draft202012Validator.check_schema(SCHEMA)
        cls.validator = Draft202012Validator(SCHEMA)

    def test_starter_fixture_is_valid(self):
        self.validator.validate(SAMPLE)

    def test_reject_invalid_inputs(self):
        cases = [
            ('missing_token', ('tokens','accent'), None),
            ('bad_color', ('tokens','accent'), 'url(https://bad.example/x)'),
            ('blank_name', ('name',), '  \t  '),
            ('control_char_name', ('name',), 'hello\x01world'),
            ('unsafe_id', ('projectId',), '../danger'),
            ('unsupported_mode', ('mode',), 'auto'),
            ('unknown_role', ('tokens','hacked'), '#000000'),
            ('unsafe_override_key', ('appOverrides','obsidian','../../x'), '#000000'),
            ('unsafe_app_id', ('appOverrides','../x'), {'--x':'#000000'}),
            ('override_css_injection', ('appOverrides','obsidian','--background-primary'), 'red; background:url(http://x)')
        ]
        for name, keys, value in cases:
            with self.subTest(name=name):
                obj=copy.deepcopy(SAMPLE)
                target=obj
                for key in keys[:-1]:
                    target=target[key]
                if value is None:
                    target.pop(keys[-1])
                else:
                    target[keys[-1]]=value
                self.assertFalse(self.validator.is_valid(obj))

    def test_target_matrix_has_unique_versions_and_official_sources(self):
        obj=json.loads((ROOT/'contracts'/'targets.json').read_text(encoding='utf-8'))
        self.assertEqual([t['id'] for t in obj['g1']], ['vscode', 'obsidian'])
        for t in obj['g1'] + obj['g2ResearchOnly']:
            self.assertEqual(t['installedTestStatus'], 'not-run')
            self.assertTrue(t['source'].startswith('https://'))

if __name__ == '__main__':
    unittest.main()
