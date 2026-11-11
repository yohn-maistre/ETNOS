#!/usr/bin/env python3
"""Model-free local lexical baseline; not a multilingual semantic model."""
import hashlib
import json
import math
import re
import sys
import unicodedata
from collections import Counter


def prepare(snapshot):
    rows = snapshot['items']
    if not 2 <= len(rows) <= 100:
        raise ValueError('A public snapshot needs 2–100 rows')
    dimension = 512
    documents = []
    for row in rows:
        value = unicodedata.normalize('NFKC', row['title'] + ' ' + row['summary']).casefold()
        if len(value) > 5000:
            raise ValueError('Source preview is too large')
        words = re.findall(r'[^\W_]+', value, re.UNICODE)
        terms = ['w:' + word for word in words]
        for word in words:
            padded = '^' + word + '$'
            terms.extend('c:' + padded[i:i + size] for size in [3, 4, 5] for i in range(max(0, len(padded) - size + 1)))
        documents.append(Counter(terms))
    frequencies = Counter(term for document in documents for term in document)
    vectors = []
    for document in documents:
        vector = [0.0] * dimension
        for term, count in document.items():
            key = int.from_bytes(hashlib.blake2b(term.encode(), digest_size=8).digest(), 'little')
            weight = (1 + math.log(count)) * (1 + math.log((1 + len(rows)) / (1 + frequencies[term])))
            vector[key % dimension] += weight if key >> 63 else -weight
        norm = math.sqrt(sum(v * v for v in vector))
        if not norm:
            raise ValueError('Source has no lexical features')
        vectors.append([v / norm for v in vector])
    return {'snapshot': snapshot, 'embedding': {'model': 'strata-local-word-char-tfidf-hash', 'revision': 'v1-nfkc-blake2b512', 'dimensions': dimension, 'normalization': 'l2', 'processing': 'local-approved-public'}, 'vectors': vectors}

if __name__ == '__main__':
    try:
        data = sys.stdin.buffer.read(500001)
        if len(data) > 500000:
            raise ValueError('Snapshot exceeds 500 KB')
        json.dump(prepare(json.loads(data)), sys.stdout, allow_nan=False, separators=(',', ':'))
        sys.stdout.write('\n')
    except Exception as error:
        print(type(error).__name__ + ': ' + str(error), file=sys.stderr)
        sys.exit(1)
