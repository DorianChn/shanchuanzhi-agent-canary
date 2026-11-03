"""Negative acceptance tests use copied synthetic logs; never execute tools/models."""
import copy, json, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path

root = Path(__file__).resolve().parent.parent
original = root/'security-lab/evidence/2026-10-11T12-49-47-521Z'

class AcceptanceRegression(unittest.TestCase):
    def reject(self, mutate):
        with tempfile.TemporaryDirectory(prefix='canary-assurance-negative-') as temporary:
            fixture = Path(temporary)/'raw'
            shutil.copytree(original, fixture)
            source = fixture/'results.json'
            data = json.loads(source.read_text(encoding='utf-8'))
            mutate(data)
            source.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
            output = Path(temporary)/'report.json'
            result = subprocess.run([sys.executable,str(root/'security-lab/verify-acceptance.py'),
                '--results='+str(source),'--output='+str(output)],cwd=root,capture_output=True,text=True)
            self.assertTrue(output.exists(), result.stderr)
            report = json.loads(output.read_text(encoding='utf-8'))
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(report['consistencyStatus'],'FAILED')
            self.assertFalse(any(c['status']=='VERIFIED' or c['maximumSupportedLevel']=='E3' for c in report['claims']))

    def test_changed_source_hash_cannot_keep_verified_claim(self):
        self.reject(lambda d:d['sourceHashes'].__setitem__('src/runtime/gateway.ts','0'*64))
    def test_invalid_chain_cannot_keep_verified_claim(self):
        self.reject(lambda d:next(t for t in d['trials'] if t['arm']=='F')['evidence'][0].__setitem__('event_digest','0'*64))
    def test_missing_observation_cannot_be_assumed_zero(self):
        self.reject(lambda d:next(t for t in d['trials'] if t['arm']=='F')['sideEffects'].pop('victimChanged'))
    def test_effect_label_cannot_override_actual_sink_count(self):
        self.reject(lambda d:next(t for t in d['trials'] if t['arm']=='F' and t['attack'])['sideEffects'].__setitem__('sinkRequests',1))
    def test_failed_network_positive_control_cannot_certify_absence(self):
        self.reject(lambda d:next(t for t in d['trials'] if t['arm']=='A' and t['scenario']=='N04_NETWORK-R1').__setitem__('success',False))
    def test_simulation_cannot_be_certified_as_real_model(self):
        self.reject(lambda d:d.__setitem__('mode','DETERMINISTIC_SIMULATION'))

    def test_existing_report_or_raw_input_is_never_overwritten(self):
        with tempfile.TemporaryDirectory(prefix='canary-preserve-output-') as temporary:
            output=Path(temporary)/'existing.json'
            output.write_bytes(b'PRESERVE_EXISTING_DATA')
            result=subprocess.run([sys.executable,str(root/'security-lab/verify-acceptance.py'),
                '--results='+str(original/'results.json'),'--output='+str(output)],cwd=root,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(output.read_bytes(),b'PRESERVE_EXISTING_DATA')

if __name__=='__main__':unittest.main()
