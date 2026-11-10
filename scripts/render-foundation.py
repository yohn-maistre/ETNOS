"""Render the readable feature index from canonical JSON. No runtime side effects."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "docs" / "foundation"
data = json.loads((root / "feature-ledger.json").read_text())
features = data["features"]
lines = [
    "# Complete feature ledger\n",
    "Reviewed 11 November 2026. Every entry is in scope; status describes actual evidence, not priority. "
    "See [build order and gates](execution-plan.md), [source edition](living-commons.md) and "
    "[canonical JSON](feature-ledger.json). No new runtime capability is claimed by this planning checkpoint.\n",
    "| ID | Capability | Stream | Current state | Dependencies |",
    "| --- | --- | --- | --- | --- |",
]
for f in features:
    lines.append(f'| [{f["id"]}](#{f["id"].lower()}) | {f["title"]} | {f["workstream"]} | '
                 f'{f["status"]} | {", ".join(f["depends_on"]) or "Existing baseline"} |')
lines.append("")
for f in features:
    lines.extend([
        f'<a id="{f["id"].lower()}"></a>\n',
        f'## {f["id"]} — {f["title"]}\n',
        f'**{f["status"]} · Stream {f["workstream"]} · Source sections '
        f'{", ".join(map(str, f["source_sections"]))} · Decisions {", ".join(f["decisions"])}**\n',
        f'Current evidence: {f["current_evidence"]}.\n',
        f'Acceptance: {f["acceptance"]}.\n',
        f'Release gate: {f["release_gate"]}.\n',
        f'Dependencies: {", ".join(f["depends_on"]) or "existing baseline"}. '
        'Completion evidence: ' + ("; ".join(f["completion_evidence"]) or "not yet recorded") + '.\n',
    ])
(root / "feature-ledger.md").write_text("\n".join(lines))
