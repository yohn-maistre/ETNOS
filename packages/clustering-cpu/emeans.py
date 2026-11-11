#!/usr/bin/env python3
"""Bounded local CPU batch. Input/output are JSON; no network, database or credentials."""
import hashlib
import json
import math
import sys
import time


def run(payload):
    import faiss
    import numpy as np
    from faiss.contrib.e_means import NumpyEmeans
    if faiss.__version__ != '1.16.0':
        raise ValueError('Use pinned faiss-cpu 1.16.0')
    snapshot = payload['snapshot']
    read_set = snapshot['readSetHash']
    if len(read_set) != 64 or any(c not in '0123456789abcdef' for c in read_set):
        raise ValueError('Invalid public read-set receipt')
    rows = snapshot['items']
    if not 2 <= len(rows) <= 100:
        raise ValueError('A batch needs 2–100 approved public items')
    ids = [r['id'] for r in rows]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate item identifiers')
    embedding = payload['embedding']
    if not all(isinstance(embedding.get(k), str) and 0 < len(embedding[k]) <= 160 for k in ['model', 'revision']):
        raise ValueError('Versioned embedding model required')
    if embedding.get('normalization') not in ['none', 'l2'] or embedding.get('processing') != 'local-approved-public':
        raise ValueError('Explicit local approved-public processing required')
    vectors = payload['vectors']
    if not isinstance(vectors, list) or len(vectors) != len(rows):
        raise ValueError('Vectors must match the snapshot order exactly')
    d = embedding['dimensions']
    if type(d) is not int or not 1 <= d <= 1024:
        raise ValueError('Invalid dimensions')
    if any(not isinstance(v, list) or len(v) != d or any(type(x) not in [int, float] or not math.isfinite(x) or abs(x) > 1e10 for x in v) for v in vectors):
        raise ValueError('Finite bounded vectors of one dimension required')
    x = np.asarray(vectors, dtype='float32', order='C')
    if embedding['normalization'] == 'l2':
        norms = np.linalg.norm(x, axis=1)
        if np.any(norms == 0):
            raise ValueError('Cannot normalize a zero vector')
        x /= norms[:, None]
    k = payload.get('clusters', min(8, max(2, len(rows) // 4)))
    epochs = payload.get('epochs', 5)
    seed = payload.get('seed', 1234)
    if type(k) is not int or not 1 <= k <= min(32, len(rows)) or type(seed) is not int or not 0 <= seed <= 2147483647:
        raise ValueError('Invalid cluster count or seed')
    if type(epochs) not in [int, float] or not math.isfinite(epochs) or not 1 <= epochs <= 20:
        raise ValueError('Use 1–20 epochs')
    faiss.omp_set_num_threads(1)
    started = time.monotonic()
    model = NumpyEmeans(d, k, nepochs=epochs, seed=seed, verbose=False)
    centroids, _last_epoch_labels = model.train(x)
    # Upstream last-epoch labels need not match the final centroids.
    distances, labels = model.assign(x)
    if not np.all(np.isfinite(centroids)) or not np.all(np.isfinite(distances)):
        raise ValueError('Non-finite fit result')
    digest = hashlib.sha256(x.astype('<f4', copy=False).tobytes()).hexdigest()
    def plain(v):
        if isinstance(v, dict): return {str(k): plain(x) for k, x in v.items()}
        if isinstance(v, (tuple, list)): return [plain(x) for x in v]
        if isinstance(v, np.generic): return v.item()
        return v
    return {
        'version': 1, 'backend': 'faiss-numpy-emeans', 'backendVersion': faiss.__version__,
        'numpyVersion': np.__version__, 'readSetHash': read_set, 'communityId': snapshot['communityId'],
        'embedding': embedding, 'vectorDigest': digest, 'rowIds': ids,
        'clusters': k, 'seed': seed, 'epochs': epochs, 'recipe': plain(model.recipe),
        'centroids': centroids.tolist(), 'labels': labels.reshape(-1).tolist(),
        'distances': np.maximum(0, distances.reshape(-1)).tolist(),
        'elapsedMs': round((time.monotonic() - started) * 1000, 3),
        'assignment': 'nearest-final-centroid-squared-l2',
    }

if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Batch exceeds 2 MB')
        result = run(json.loads(raw))
        json.dump(result, sys.stdout, allow_nan=False, separators=(',', ':'))
        sys.stdout.write('\n')
    except Exception as error:
        print(type(error).__name__ + ': ' + str(error), file=sys.stderr)
        sys.exit(1)
