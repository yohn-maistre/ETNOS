import unittest
import numpy as np
from emeans import run
from embed_public import prepare

class NumericalContract(unittest.TestCase):
    def payload(self):
        return {'snapshot': {'communityId': 'synthetic', 'readSetHash': 'a' * 64, 'items': [{'id': str(i), 'title': 'Lake water grass' if i < 4 else 'Music guitar dance', 'summary': 'A synthetic public source.'} for i in range(8)]}, 'embedding': {'model': 'synthetic', 'revision': '1', 'dimensions': 2, 'normalization': 'none', 'processing': 'local-approved-public'}, 'vectors': [[0, i * .01] if i < 4 else [10, 10 + i * .01] for i in range(8)], 'clusters': 2}
    def test_exact_final_assignment(self):
        p = self.payload(); r = run(p)
        distance = ((np.array(p['vectors'])[:, None, :] - np.array(r['centroids'])[None, :, :]) ** 2).sum(axis=2)
        self.assertEqual(distance.argmin(axis=1).tolist(), r['labels'])
        np.testing.assert_allclose(distance.min(axis=1), r['distances'], atol=1e-4)
    def test_rejects_nonfinite_and_shape_mismatch(self):
        p = self.payload(); p['vectors'][0][0] = float('nan')
        with self.assertRaises(ValueError): run(p)
        p = self.payload(); p['vectors'].pop()
        with self.assertRaises(ValueError): run(p)
    def test_local_lexical_pipeline_is_deterministic_and_usable(self):
        p = self.payload(); a = prepare(p['snapshot']); b = prepare(p['snapshot'])
        self.assertEqual(a, b)
        r = run({**a, 'clusters': 2})
        self.assertEqual(r['labels'][0], r['labels'][3])
        self.assertEqual(r['labels'][4], r['labels'][7])
        self.assertNotEqual(r['labels'][0], r['labels'][4])

if __name__ == '__main__': unittest.main()
