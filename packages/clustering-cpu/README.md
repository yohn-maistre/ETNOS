# Optional public e-means CPU batch

This package runs the **actual upstream `faiss.contrib.e_means.NumpyEmeans`**, pinned to Faiss 1.16.0. It does not reimplement k-means under another name. NumPy/CPU only; no GPU, model API, vector database, server or paid container is required. Strata's normal Worker requests never import or spawn this Python process.

Create an operator-controlled environment:

```sh
python3 -m venv .strata/e-means-venv
.strata/e-means-venv/bin/python -m pip install -r packages/clustering-cpu/requirements.txt
```

Use an authenticated human community steward to `GET /v1/clustering/snapshot?community=COMMUNITY_ID`. This returns at most 100 currently published public discovery items with active current source evidence and `open` or `excerpt-permitted` rights. Link-only sources and all private scopes are excluded. Source policy is not automatic permission to send content to a third-party embedding service: the operator must separately verify processing rights. This batch expects **already approved locally prepared embeddings** and makes no network calls.

Prepare an input JSON file with:

```json
{
  "snapshot": {"communityId":"from-api","readSetHash":"from-api","items":[]},
  "embedding": {"model":"actual-model-name","revision":"actual-version-or-digest","dimensions":384,"normalization":"l2","processing":"local-approved-public"},
  "vectors": [],
  "clusters": 4,
  "seed": 1234,
  "epochs": 5
}
```

Use the complete unmodified snapshot object and one finite vector per item in exactly its order; the empty arrays above illustrate the shape and **are not a runnable corpus**. The batch requires 2–100 rows, dimension 1–1024, at most 32 clusters, 1–20 epochs and 2 MB input. Keep snapshots/embeddings out of source control. This is an explicit bounded batch, not an automatic external embedding upload.

```sh
umask 077
.strata/e-means-venv/bin/python packages/clustering-cpu/emeans.py < /private/path/input.json > /private/path/receipt.json
```

The receipt contains actual implementation versions, float32 vector digest, model/preprocessing identifiers, seed/epochs/derived upstream recipe, centroids and **nearest final-centroid assignments**, obtained with `assign` after `train`. This distinction matters because upstream last-epoch training labels may differ from final-centroid labels. Elapsed time is measured locally; no general performance or semantic-quality claim follows from it.

POST `{communityId,receipt,requestKey}` to `/v1/clustering/runs` as the current steward. Engine import is transactional, body-bound/idempotent, source-snapshot checked and capped at 12 new runs per community/day. Imports are operator attestations, not cryptographic proof that an arbitrary remote machine ran this program. `GET /v1/discovery/related/ITEM_ID` offers at most eight currently public candidates sharing a label. Any changed snapshot invalidates the index until refit/import. This does not merge source identities, publish Wiki acceptance, modify a region/language or grant authority.

Qualification:

```sh
STRATA_EMEANS_PYTHON="$PWD/.strata/e-means-venv/bin/python" node --test test/clustering.test.ts
```

The optional real-native test fits numerical synthetic vectors and imports the result through the actual engine. It qualifies numerical plumbing and source/access boundaries, **not multilingual embeddings, semantic quality, actual hosted CPU operations or a live news clustering corpus**. Normal engine tests do not require Python/Faiss; they skip only that native test and retain boundary tests. Retain explicit navigation and bounded lexical discovery when the optional index is unavailable.

Upstream: [Faiss e-means documentation](https://github.com/facebookresearch/faiss/tree/v1.16.0/contrib/e_means), [Faiss 1.16.0](https://github.com/facebookresearch/faiss/releases/tag/v1.16.0), [paper](https://arxiv.org/abs/2611.09501). Credit Swann Bessa, Pierre-Emmanuel Mazaré, Gergely Szilvasy, Hugo Touvron, David Picard, Matthijs Douze and Hervé Jégou. Faiss is MIT licensed; the wrapper follows this repository's AGPL-3.0-only license. No upstream implementation is vendored here.

## No-model lexical starting point

If an approved embedding model is not installed, this package also includes a transparent local baseline: Unicode-normalized word and character n-grams, corpus TF-IDF weights and a versioned 512-dimensional signed hash. It needs only Python's standard library. It is **lexical similarity**, not a cross-language semantic model and not a substitute for source/event review. It does not infer place, ethnicity or language identity.

```sh
python3 packages/clustering-cpu/embed_public.py < /private/path/snapshot.json | .strata/e-means-venv/bin/python packages/clustering-cpu/emeans.py > /private/path/receipt.json
```

This makes the real CPU adapter usable immediately without downloading a language model or sending text to a cloud service. The exported receipt still records which lexical embedding produced the assignments. Replace this preprocessing with a qualified versioned multilingual embedding when available; do not compare or merge incompatible vector spaces.
