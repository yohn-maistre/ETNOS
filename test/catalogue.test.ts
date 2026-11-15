import { test } from "node:test";
import assert from "node:assert/strict";
import { Strata } from "../src/store.ts";
import { Groups } from "../src/groups.ts";
import { api } from "../src/api.ts";
import { catalogue, catalogueSummary } from "../src/catalogue.ts";

const shipped = catalogue("tanah-papua").catalogue;

test("the Tanah Papua catalogue is consistent and keeps the live slugs", () => {
  const bySlug = new Map(shipped.entries.map((e) => [e.slug, e]));
  assert.equal(bySlug.size, shipped.entries.length, "slugs are unique");
  for (const e of shipped.entries) {
    assert.match(e.slug, /^[a-z0-9][a-z0-9-]{1,63}$/);
    assert.equal(e.language, "id");
    assert.ok(e.title.length <= 100 && e.description.length <= 2000 && e.aliases.length <= 20);
    for (const p of e.parents) assert.ok(bySlug.has(p), e.slug + " names a missing parent " + p);
  }
  const of = (kind: string, facet?: string) => shipped.entries.filter((e) => e.kind === kind && (facet === undefined || e.facet === facet));
  assert.equal(of("region", "customary-region").length, 7);
  assert.equal(of("region", "province").length, 6);
  assert.equal(of("place").length, 42);
  assert.equal(of("language").length, 256);
  assert.equal(bySlug.get("meepago")?.facet, "customary-region");
  assert.equal(bySlug.has("musik-reggae"), false);
  // Every regency or city sits under exactly one province and one reference region.
  for (const place of of("place")) {
    const kinds = place.parents.map((p) => bySlug.get(p)!.facet).sort();
    assert.deepEqual(kinds, ["customary-region", "province"], place.slug);
  }
  for (const r of of("region", "customary-region")) assert.match(r.description, /bukan batas tanah adat/);
  for (const l of of("language")) {
    assert.deepEqual(l.parents, []);
    assert.match(l.aliases[0], /^glottocode:[a-z]{4}\d{4}$/);
    assert.match(l.description, /Glottolog 5\.3/);
  }
  assert.ok(of("topic").filter((t) => t.parents.includes("lembaga")).length === 7);
  assert.ok(shipped.sources.some((s) => /Glottolog/.test(s.title) && s.license === "CC BY 4.0"));
  assert.ok(shipped.notes.length > 0);
  assert.throws(() => catalogue("elsewhere"), /Catalogue not found/);
  assert.equal(catalogueSummary().entries, shipped.entries.length);
});

test("catalogue import is steward-only, idempotent, and keeps existing ids, edits and attached records", async () => {
  const s = new Strata(":memory:", "https://strata.example", () => Date.parse("2026-11-15T00:00:00Z")),
    admin = s.provision("did:web:admin.example", "Node steward"),
    owner = s.provision("did:web:owner.example", "Group owner");
  const groups = new Groups(s, { stewardDid: admin.actor.did }),
    handler = api(s, { stewardDid: admin.actor.did, catalogue: "tanah-papua" }),
    post = (token: string) =>
      handler(new Request(s.base + "/v1/contexts/catalogue", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: "{}" }));
  try {
    // The live node already has these two contexts.
    const meepago = groups.createContext(admin.actor.id, { slug: "meepago", title: "Meepago", kind: "region", description: "Wilayah Adat Meepago (Papua Tengah)", language: "id", aliases: ["kabar:deiyai", "kabar:paniai", "kabar:dogiyai", "kabar:nabire"] });
    const reggae = groups.createContext(admin.actor.id, { slug: "musik-reggae", title: "Musik Reggae", kind: "topic", description: "Skibidipapap", language: "id", aliases: [] });
    const group = groups.create(owner.actor.id, "Synthetic council", "Synthetic public profile", "institution", "public");
    groups.attach(owner.actor.id, "group", group.id, meepago.id);
    groups.attach(owner.actor.id, "group", group.id, reggae.id);
    const attached = () => JSON.stringify(s.all("SELECT * FROM record_contexts ORDER BY record_id,context_id"));
    const records = attached(),
      reggaeRow = JSON.stringify(s.get("SELECT * FROM contexts WHERE id=?", reggae.id));

    assert.equal((await post(owner.token)).status, 403);
    assert.throws(() => groups.importCatalogue(owner.actor.id, shipped), /Node steward required/);
    assert.equal(s.get<{ n: number }>("SELECT count(*) n FROM contexts")!.n, 2);
    assert.equal(s.get<{ n: number }>("SELECT count(*) n FROM context_parents")!.n, 0);

    const first = await post(admin.token);
    assert.equal(first.status, 200);
    const counts = (await first.json()) as Record<string, unknown>;
    const links = shipped.entries.reduce((n, e) => n + e.parents.length, 0);
    assert.deepEqual(counts, { catalogue: "tanah-papua", created: shipped.entries.length - 1, updated: 1, linked: links, skipped: 0, refused: 0 });

    // The live Meepago keeps its id, title, description and news places, and gains parents' children and the missing aliases.
    const mp = groups.contextDetail("meepago");
    assert.equal(mp.id, meepago.id);
    assert.equal(mp.title, "Meepago");
    assert.equal(mp.description, "Wilayah Adat Meepago (Papua Tengah)");
    assert.equal(mp.facet, "customary-region");
    assert.deepEqual(mp.aliases.slice(0, 4), ["kabar:deiyai", "kabar:paniai", "kabar:dogiyai", "kabar:nabire"]);
    assert.ok(mp.aliases.includes("kabar:mimika") && mp.aliases.includes("kabar:intan-jaya"));
    assert.deepEqual(mp.children.map((c) => c.slug), ["deiyai", "dogiyai", "intan-jaya", "mimika", "nabire", "paniai"]);
    const nabire = groups.contextDetail("nabire");
    assert.deepEqual(nabire.parents.map((p) => p.slug).sort(), ["meepago", "papua-tengah"]);
    assert.deepEqual(nabire.newsPlaces, ["nabire", "kabupaten-nabire"]);
    assert.equal(groups.contextDetail("papua-tengah").childCount, 8);
    assert.equal(groups.contextDetail("lembaga").children.length, 7);
    assert.equal(groups.contexts().length, shipped.entries.length + 1);

    // A steward's own edits survive a second load; nothing else changes.
    s.run("UPDATE contexts SET title='Nabire (Wanggar)', description='Disunting pengelola' WHERE slug='nabire'");
    groups.setContextAliases(admin.actor.id, "papua", ["Provinsi Papua", "kabar:papua", "Tanah Tabi"]);
    const snapshot = () => JSON.stringify([s.all("SELECT * FROM contexts ORDER BY slug"), s.all("SELECT * FROM context_parents ORDER BY context_id,parent_id")]);
    const before = snapshot(),
      audits = s.all("SELECT * FROM audit WHERE action='context.catalogue'").length;
    assert.deepEqual(groups.importCatalogue(admin.actor.id, shipped), { created: 0, updated: 0, linked: 0, skipped: shipped.entries.length, refused: 0 });
    assert.equal(snapshot(), before);
    assert.equal(s.all("SELECT * FROM audit WHERE action='context.catalogue'").length, audits);
    assert.equal(groups.context("nabire").title, "Nabire (Wanggar)");
    assert.equal(groups.context("nabire").description, "Disunting pengelola");
    assert.ok(groups.context("papua").aliases.includes("Tanah Tabi"));

    // Records attached to contexts, and contexts outside the catalogue, are untouched.
    assert.equal(attached(), records);
    assert.equal(JSON.stringify(s.get("SELECT * FROM contexts WHERE id=?", reggae.id)), reggaeRow);

    // A retired context stays retired and its links are not recreated.
    s.run("UPDATE contexts SET active=0 WHERE slug='deiyai'");
    s.run("DELETE FROM context_parents WHERE context_id=(SELECT id FROM contexts WHERE slug='deiyai')");
    const again = groups.importCatalogue(admin.actor.id, shipped);
    assert.deepEqual([again.created, again.updated, again.linked, again.refused], [0, 0, 0, 2]);
    assert.equal(s.get<{ active: number }>("SELECT active FROM contexts WHERE slug='deiyai'")!.active, 0);
    assert.equal(groups.contextDetail("meepago").children.length, 5);

    const summary = (await (await handler(new Request(s.base + "/v1/contexts/catalogue"))).json()) as { name: string; entries: number };
    assert.deepEqual([summary.name, summary.entries], ["Tanah Papua", shipped.entries.length]);
    const unknown = api(s, { stewardDid: admin.actor.did, catalogue: "elsewhere" });
    assert.equal((await unknown(new Request(s.base + "/v1/contexts/catalogue"))).status, 404);
  } finally {
    s.close();
  }
});

test("a loop a steward made by hand is refused by the import, not repaired", () => {
  const s = new Strata(":memory:", "https://strata.example"),
    admin = s.provision("did:web:admin.example", "Node steward"),
    groups = new Groups(s, { stewardDid: admin.actor.did });
  try {
    const province = groups.createContext(admin.actor.id, { slug: "papua-tengah", title: "Papua Tengah", kind: "region", description: "Synthetic", language: "id", aliases: [] }),
      regency = groups.createContext(admin.actor.id, { slug: "nabire", title: "Nabire", kind: "place", description: "Synthetic", language: "id", aliases: [] });
    groups.linkContext(admin.actor.id, province.id, regency.id);
    const result = groups.importCatalogue(admin.actor.id, shipped);
    assert.equal(result.refused, 1);
    assert.deepEqual(groups.contextDetail("nabire").parents.map((p) => p.slug), ["meepago"]);
    assert.deepEqual(groups.contextDetail("papua-tengah").parents.map((p) => p.slug), ["nabire"]);
  } finally {
    s.close();
  }
});

test("an import replaces only a description it wrote earlier, never a steward's wording", () => {
  const s = new Strata(":memory:", "https://strata.example", () => Date.parse("2026-11-15T00:00:00Z")),
    admin = s.provision("did:web:admin.example", "Node steward"),
    groups = new Groups(s, { stewardDid: admin.actor.did });
  try {
    const entry = (slug: string, description: string, previous?: string[]) => ({ slug, title: slug, kind: "topic" as const, description, language: "id", aliases: [], parents: [], previous });
    const load = (entries: ReturnType<typeof entry>[]) => groups.importCatalogue(admin.actor.id, { name: "Synthetic", sources: [], notes: [], entries });
    load([entry("first", "Old wording"), entry("second", "Old wording")]);
    s.run("UPDATE contexts SET description='Steward wording' WHERE slug='second'");
    const counts = load([entry("first", "New wording", ["Old wording"]), entry("second", "New wording", ["Old wording"])]);
    assert.equal(groups.context("first").description, "New wording");
    assert.equal(groups.context("second").description, "Steward wording");
    assert.deepEqual([counts.updated, counts.skipped], [1, 1]);
    assert.equal(load([entry("first", "New wording", ["Old wording"])]).updated, 0);
  } finally {
    s.close();
  }
});

test("community kinds are shipped as labels with defaults a form can use", () => {
  const { catalogue: shipped } = catalogue();
  const kinds = catalogueSummary().communityKinds;
  assert.ok(kinds.length >= 8 && kinds.length <= 12);
  for (const k of kinds) {
    const e = shipped.entries.find((x) => x.slug === k.slug)!;
    assert.deepEqual([e.facet, e.parents], ["community-kind", ["jenis-komunitas"]], k.slug);
    assert.ok(k.examples.length > 0 && k.description.length > 0);
  }
  for (const e of shipped.entries) assert.doesNotMatch(e.description, /West Papua Watch/);
});

test("every shipped label belongs to a family that says what it was adapted from", async () => {
  const { catalogue: shipped } = catalogue();
  const { contextFamily } = await import("../src/catalogue.ts");
  for (const e of shipped.entries) assert.ok(contextFamily(e)?.basis, e.slug);
  assert.equal(contextFamily({ kind: "place", facet: "city" })?.key, "regency");
  assert.equal(contextFamily({ kind: "topic", facet: "unknown-facet" }), null);
  for (const f of catalogueSummary().families) for (const s of f.sources) assert.match(s.url, /^https:\/\//);
});
