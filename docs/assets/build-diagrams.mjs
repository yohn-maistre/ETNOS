// Renders the README diagrams to SVG with pele (https://pele.run), a Mermaid renderer.
// Run from the repository root. Nothing is added to package.json.
//   mkdir -p /tmp/pele && cd /tmp/pele && npm init -y && DO_NOT_TRACK=1 npm i pele@1.13.0
//   NODE_PATH=/tmp/pele/node_modules node docs/assets/build-diagrams.mjs
// Each diagram is written twice (-light.svg and -dark.svg). The README picks one
// with a <picture> element, so that it follows the GitHub theme.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(process.env.NODE_PATH ? join(process.env.NODE_PATH, 'x.js') : import.meta.url);
const { render } = require('pele');
const out = dirname(fileURLToPath(import.meta.url));

const themes = {
  light: { bg: 'transparent', fg: '#1f2328', muted: '#59636e', line: '#59636e', surface: '#f6f8fa', alt: '#eaeef2', border: '#afb8c1', accent: '#0969da' },
  dark: { bg: 'transparent', fg: '#e6edf3', muted: '#9198a1', line: '#9198a1', surface: '#161b22', alt: '#21262d', border: '#3d444d', accent: '#4493f8' },
};

const diagrams = {
  'diagram-loop': `flowchart LR
  A["Talk in a community"] --> B["Aksara proposes words,<br/>meanings and notes"]
  B --> C["Members check<br/>each claim (Periksa)"]
  C --> D["The community<br/>publishes"]
  D --> E["Wiki with sources"]
  D --> F["Knowledge map"]`,
  'diagram-architecture': `flowchart LR
  U["Web app<br/>Svelte 5"] --> W["Worker API<br/>Cloudflare Workers"]
  W --> N["ETNOS node<br/>SQLite Durable Object"]
  W --> R["Aksara runtime<br/>and model gateway"]
  W -. "OAuth sign-in" .-> I["Identity host (PDS)<br/>AT Protocol"]
  I --> A["One Durable Object<br/>per account"]
  I --> B["R2 blobs"]`,
};

for (const [name, src] of Object.entries(diagrams)) {
  for (const [mode, t] of Object.entries(themes)) {
    const vars = `--pele-bg:${t.bg};--pele-fg:${t.fg};--pele-muted:${t.muted};--pele-line:${t.line};--pele-surface:${t.surface};--pele-surface-alt:${t.alt};--pele-border:${t.border};--pele-accent:${t.accent};`;
    const svg = render(src).svg.replace('style="', `style="${vars}`);
    writeFileSync(join(out, `${name}-${mode}.svg`), svg + '\n');
  }
}
