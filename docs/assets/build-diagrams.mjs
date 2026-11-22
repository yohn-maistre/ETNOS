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
  subgraph IN["What people already share"]
    P["A post or reply"]
    F["A plant or bird photo"]
    V["A voice note"]
    M["A 3D capture"]
  end
  P --> Q["A question back<br/>Is this word X? Is this Danau Tigi?"]
  F --> Q
  V --> Q
  M --> Q
  Q --> C["Members check it<br/>(Periksa)"]
  C --> K["Kamus komunitas"]
  C --> E["Ensiklopedia entry"]
  C --> T["Percakapan on<br/>an existing entry"]
  E --> S["Situs and the<br/>knowledge map"]`,
  'diagram-kinds': `flowchart LR
  A["Akun<br/>a person or Aksara"] -- "posts in" --> R["Ruang<br/>a community"]
  A -- "writes" --> J["Jejak<br/>posts, photos, sound"]
  J -- "tentang" --> E["Entri<br/>place, language, people,<br/>species, lembaga, word"]
  R -- "tentang / bahasa" --> E
  A -- "mengelola" --> E
  E -- "bagian dari" --> E`,
  'diagram-homes': `flowchart LR
  subgraph H1["ETNOS for Tanah Papua"]
    a1["Communities"] --- k1["Kamus and entries"]
  end
  subgraph H2["ETNOS for another region"]
    a2["Communities"] --- k2["Kamus and entries"]
  end
  k1 -- "public records only" --> X["Shared index<br/>GBIF, Glottolog,<br/>Concepticon, Wikidata keys"]
  k2 -- "public records only" --> X
  X --> W["A word atlas<br/>checked by speakers"]`,
  'diagram-architecture': `flowchart LR
  U["Web app<br/>Svelte 5"] --> W["Worker API<br/>Cloudflare Workers"]
  S["nama.etnos.space<br/>Situs"] --> W
  W --> N["ETNOS node<br/>SQLite Durable Object"]
  W --> R["Aksara runtime<br/>and model gateway"]
  W -. "OAuth sign-in" .-> I["Identity host (PDS)<br/>AT Protocol"]
  I --> A["One Durable Object<br/>per account"]
  I --> B["R2 blobs"]`,
  'diagram-loop-id': `flowchart LR
  subgraph IN["Yang sudah dibagikan orang"]
    P["Posting atau balasan"]
    F["Foto tumbuhan atau burung"]
    V["Pesan suara"]
    M["Hasil pindai 3D"]
  end
  P --> Q["Pertanyaan kembali<br/>Apakah ini kata X? Apakah ini Danau Tigi?"]
  F --> Q
  V --> Q
  M --> Q
  Q --> C["Anggota memeriksa<br/>(Periksa)"]
  C --> K["Kamus komunitas"]
  C --> E["Entri Ensiklopedia"]
  C --> T["Percakapan pada<br/>entri yang sudah ada"]
  E --> S["Situs dan<br/>peta pengetahuan"]`,
  'diagram-kinds-id': `flowchart LR
  A["Akun<br/>orang atau Aksara"] -- "memposting di" --> R["Ruang<br/>sebuah komunitas"]
  A -- "menulis" --> J["Jejak<br/>posting, foto, suara"]
  J -- "tentang" --> E["Entri<br/>tempat, bahasa, suku,<br/>spesies, lembaga, kata"]
  R -- "tentang / bahasa" --> E
  A -- "mengelola" --> E
  E -- "bagian dari" --> E`,
  'diagram-homes-id': `flowchart LR
  subgraph H1["ETNOS untuk Tanah Papua"]
    a1["Komunitas"] --- k1["Kamus dan entri"]
  end
  subgraph H2["ETNOS untuk wilayah lain"]
    a2["Komunitas"] --- k2["Kamus dan entri"]
  end
  k1 -- "hanya catatan publik" --> X["Indeks bersama<br/>kunci GBIF, Glottolog,<br/>Concepticon, Wikidata"]
  k2 -- "hanya catatan publik" --> X
  X --> W["Atlas kata<br/>yang diperiksa penutur"]`,
  'diagram-architecture-id': `flowchart LR
  U["Aplikasi web<br/>Svelte 5"] --> W["API Worker<br/>Cloudflare Workers"]
  S["nama.etnos.space<br/>Situs"] --> W
  W --> N["Node ETNOS<br/>Durable Object SQLite"]
  W --> R["Runtime Aksara<br/>dan gerbang model"]
  W -. "masuk lewat OAuth" .-> I["Host identitas (PDS)<br/>AT Protocol"]
  I --> A["Satu Durable Object<br/>per akun"]
  I --> B["Blob R2"]`,
};

for (const [name, src] of Object.entries(diagrams)) {
  for (const [mode, t] of Object.entries(themes)) {
    const vars = `--pele-bg:${t.bg};--pele-fg:${t.fg};--pele-muted:${t.muted};--pele-line:${t.line};--pele-surface:${t.surface};--pele-surface-alt:${t.alt};--pele-border:${t.border};--pele-accent:${t.accent};`;
    const svg = render(src).svg.replace('style="', `style="${vars}`);
    writeFileSync(join(out, `${name}-${mode}.svg`), svg + '\n');
  }
}
