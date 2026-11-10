"""Check preservation, source coverage and feature dependency consistency."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "docs" / "foundation"
source = json.loads((root / "source-paragraphs.json").read_text())
manifest = json.loads((root / "source-manifest.json").read_text())
edition = (root / "living-commons.md").read_text()
assert len(source) == manifest["paragraphs"] == 672
sections = {int(m[1]) for style, value in source
            if style == "Heading2" and (m := re.match(r"^(\d+)\. ", value))}
assert sections == set(range(1, 31)), sections
for number, (style, value) in enumerate(source, 1):
    assert f"source-block:{number:04d}" in edition or f'id="source-{number:04d}"' in edition
    if style != "table":
        assert value in edition, f"Source text lost at block {number}"
decisions = json.loads((root / "decision-ledger.json").read_text())
assert decisions["source_sha256"] == manifest["sha256"]
originals = decisions["original_decisions"]
assert [d["id"] for d in originals] == [f"D{i:02d}" for i in range(1, 39)]
for d in originals:
    assert source[d["source_block"] - 1][1] == d["original_text"]
ledger = json.loads((root / "feature-ledger.json").read_text())
features = ledger["features"]
ids = {f["id"] for f in features}
assert len(ids) == len(features) == 72
assert {s for f in features for s in f["source_sections"]} == sections
decision_ids = {d["id"] for d in originals}
for f in features:
    assert f["status"] in ledger["status_meanings"]
    assert f["workstream"] in "ABCDEFG"
    assert set(f["depends_on"]) <= ids and f["id"] not in f["depends_on"]
    assert set(f["decisions"]) <= decision_ids and f["decisions"]
    for key in ("current_evidence", "acceptance", "release_gate", "target"):
        assert f[key], (f["id"], key)
    if f["status"] == "qualified":
        assert f["completion_evidence"], f["id"]
visiting, done = set(), set()
by_id = {f["id"]: f for f in features}
def visit(key):
    assert key not in visiting, f"Dependency cycle at {key}"
    if key in done:
        return
    visiting.add(key)
    for dep in by_id[key]["depends_on"]:
        visit(dep)
    visiting.remove(key)
    done.add(key)
for key in ids:
    visit(key)
print(f"Foundation intact: {len(source)} blocks, {len(sections)} sections, "
      f"{len(originals)} decisions, {len(features)} features; dependencies acyclic.")
