// Check seed pages against their basis the way the server does on proposal.
// Usage: node --experimental-strip-types scripts/check-wiki-pages.ts seed/wiki/pages/saireri.json
import { readFileSync } from "node:fs";
import { checkPage, type PageBasis } from "../src/desk.ts";

type SeedPage = { slug: string; title: string; text: string; citations: string[]; basis: PageBasis[] };
let failed = 0;
for (const file of process.argv.slice(2)) {
  for (const page of JSON.parse(readFileSync(file, "utf8")) as SeedPage[]) {
    const problems: string[] = [];
    if (!page.citations.length || page.citations.length > 10) problems.push("1 to 10 citations");
    if (!page.basis.length || page.basis.length > 80) problems.push("1 to 80 basis sentences");
    if (page.basis.some((b) => b.text.length > 700)) problems.push("basis sentence over 700 characters");
    if (page.text.length > 20000) problems.push("text over 20000 characters");
    const check = checkPage(page.text, page.basis, page.citations.length, page.citations);
    if (check.unknown.length) problems.push("not in basis: " + check.unknown.join(", "));
    if (check.uncited) problems.push(check.uncited + " paragraph(s) without citation");
    if (check.unsupported.length) problems.push("citation without basis: " + check.unsupported.join(", "));
    if (problems.length) failed++;
    console.log(`${problems.length ? "FAIL" : "ok  "} ${page.slug} (${page.text.split(/\s+/).length} words)${problems.map((p) => "\n     " + p).join("")}`);
  }
}
process.exit(failed ? 1 : 0);
