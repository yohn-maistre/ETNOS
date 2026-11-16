// Propose seed pages as an enrolled agent. Each page becomes a hidden draft that a
// steward reviews. Request keys are kept beside the input so a rerun never doubles a page.
// Usage: ETNOS_ORIGIN=https://example.org ETNOS_KEY_FILE=/path/key.json ETNOS_DEPLOYMENT=<id> \
//   node --experimental-strip-types scripts/propose-wiki-pages.ts seed/wiki/pages/saireri.json [slug ...]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { connectAgent } from "../src/agent-client.ts";

type SeedPage = { slug: string; title: string; text: string; citations: string[]; basis: { source: number; text: string }[] };
const [file, ...only] = process.argv.slice(2);
const { ETNOS_ORIGIN: origin, ETNOS_KEY_FILE: keyFile, ETNOS_DEPLOYMENT: deploymentId } = process.env;
if (!file || !origin || !keyFile || !deploymentId) throw new Error("Set ETNOS_ORIGIN, ETNOS_KEY_FILE, ETNOS_DEPLOYMENT and name a pages file");
const receiptsFile = file.replace(/\.json$/, ".receipts.json"),
  receipts: Record<string, { requestKey: string; proposalId?: string; pageId?: string }> = existsSync(receiptsFile) ? JSON.parse(readFileSync(receiptsFile, "utf8")) : {};
const client = await connectAgent({ origin, keyFile, deploymentId, scope: "public:read agent:self wiki:propose" });
const data = (r: any) => r.structuredContent?.data ?? r;
const grants = data(await client.callTool({ name: "etnos_my_grants", arguments: {} })),
  mandate = (grants.editorial ?? []).find((m: any) => !m.revoked && m.expires > Date.now());
// The agent switch (wiki proposals on) needs no mandate id; an older editorial mandate still works.
if (!mandate && !grants.switch?.wiki) throw new Error("Turn on wiki proposals in the agent's switch first.");
for (const page of JSON.parse(readFileSync(file, "utf8")) as SeedPage[]) {
  if (only.length && !only.includes(page.slug)) continue;
  if (receipts[page.slug]?.proposalId) { console.log("done", page.slug); continue; }
  const requestKey = (receipts[page.slug] ??= { requestKey: randomUUID() }).requestKey;
  writeFileSync(receiptsFile, JSON.stringify(receipts, null, 1));
  const r: any = await client.callTool({
    name: "etnos_propose_page",
    arguments: { title: page.title, text: page.text, citations: page.citations, basis: page.basis, language: "id", perspective: "Disusun Aksara dari kalimat sumber yang tercantum", ...(mandate ? { editorialMandateId: mandate.id } : {}), requestKey },
  });
  if (r.isError) { console.log("FAIL", page.slug, JSON.stringify(r.content).slice(0, 200)); if (/budget/i.test(JSON.stringify(r.content))) break; continue; }
  const result = data(r);
  receipts[page.slug] = { requestKey, proposalId: result.id, pageId: result.pageId };
  writeFileSync(receiptsFile, JSON.stringify(receipts, null, 1));
  console.log("proposed", page.slug, result.pageId, result.checks?.ok ? "checks ok" : JSON.stringify(result.checks));
}
await client.close?.();
