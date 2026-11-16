import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Strata } from "../src/store.ts";
import { AgentAccess } from "../src/agent-access.ts";
import { Forum } from "../src/forum.ts";
import { Desk, verifyQuotes, checkDraft, checkPage, parseNumbered, runDesk, type DeskModel } from "../src/desk.ts";

const source =
  "Synthetic field note for tests. In a long season of hunger there lived a poor family in the valley. " +
  "The mother was called Sarila and the three daughters were Anu, Bima and Coro. " +
  "A small boy named Talo was born and from him came sweet potato, taro and shell money. " +
  "People accused Talo of wanting to rule and they killed him. " +
  "After that the season of hunger never returned, and one pig became Mount Dorana. " +
  "The researchers disapproved the method used in 1998.";

test("only word-for-word, whole-word spans of the source survive as facts", () => {
  const { kept, dropped } = verifyQuotes(source, [
    "The mother was called Sarila and the three daughters were Anu, Bima and Coro.",
    "the   mother was called sarila and the three daughters were Anu, Bima and Coro",
    "The mother was called Marta and the three daughters were Anu, Bima and Coro.",
    "approved the method used in 1998",
    "in 1998",
    "“After that the season of hunger never returned, and one pig became Mount Dorana.”",
  ]);
  assert.deepEqual(kept.map((f) => f.n), [1, 2]);
  assert.equal(dropped.length, 3, "invented name, partial word and too-short quote are dropped; a repeat is skipped");
  assert.deepEqual(parseNumbered("Here:\n1. First copied sentence\n2) Second one\n- third item\nnoise"), ["First copied sentence", "Second one", "third item"]);
});

test("a draft may only use names and numbers that the fact sheet contains", () => {
  const facts = verifyQuotes(source, [
    "A small boy named Talo was born and from him came sweet potato, taro and shell money.",
    "People accused Talo of wanting to rule and they killed him.",
  ]).kept;
  assert.ok(checkDraft("A boy was born. People called him Talo. [1]\n\nThen people killed Talo. [2]", facts).ok);
  const invented = checkDraft("A boy was born in 1650. His uncle Marek fed him. [1]", facts);
  assert.equal(invented.ok, false);
  assert.deepEqual(invented.unknown.sort(), ["1650", "Marek"]);
  assert.equal(checkDraft("People killed Talo.", facts).uncited, 1);
  assert.ok(checkDraft("People killed Talo. [2]\n\nHow is this story told where you live?", facts).ok, "the closing question needs no citation");
  assert.equal(checkDraft("People killed Talo. [2]\n\nDid his uncle Marek know?", facts).ok, false, "a closing question cannot carry a new name");
  assert.equal(checkDraft("People killed Talo. [7]", facts).uncited, 1, "a citation must point at a real fact");
});

test("the run drops unverified quotes and asks once more when the draft invents a name", async () => {
  const calls: string[] = [];
  const model: DeskModel = async (messages) => {
    const user = messages[1]!.content;
    calls.push(user);
    const text = user.includes("<document>")
      ? "1. A small boy named Talo was born and from him came sweet potato, taro and shell money.\n2. People accused Talo of wanting to rule and they killed him.\n3. After that the season of hunger never returned, and one pig became Mount Dorana.\n4. Talo was secretly a king from Java."
      : user.includes("Write it again")
        ? "A boy named Talo was born. [1]\n\nPeople killed Talo, and the hunger never returned. [2,3]"
        : "A boy named Talo was born in Wamena. [1]\n\nPeople killed Talo. [2]";
    return { text, inputTokens: 10, outputTokens: 5 };
  };
  const run = await runDesk(model, { kind: "cerita", source });
  assert.equal(run.facts.length, 3);
  assert.equal(run.dropped.length, 1);
  assert.equal(run.attempts, 2);
  assert.ok(run.check.ok);
  assert.ok(!calls[1]!.includes("king from Java"), "the writer never sees an unverified sentence");
  assert.ok(!calls[1]!.includes("Synthetic field note"), "the writer never sees the raw source");
  assert.equal(run.inputTokens, 30);
});

function fixture(model?: DeskModel) {
  let now = Date.now();
  const s = new Strata(":memory:", "https://strata.example", () => now),
    owner = s.provision("did:web:owner.example", "Owner"),
    member = s.provision("did:web:member.example", "Member"),
    room = s.createCommunity(owner.actor.id, "Public test", "Public local", "public", true, "open"),
    hidden = s.createCommunity(owner.actor.id, "Private language space", "NEVER DISCLOSE", "hidden-private", true);
  s.join(member.actor.id, room.id);
  const access = new AgentAccess(s),
    agent = access.enroll(owner.actor.id, { name: "Aksara local test", communityId: room.id, role: "steward", family: "aksara" });
  access.admit(owner.actor.id, agent.actor.id);
  const mandate = access.grant(owner.actor.id, agent.actor.id, { kind: "posting", purpose: "Test desk", expires: now + 600000, hourlyLimit: 5 });
  const input = () => ({ kind: "cerita" as const, title: "Synthetic note", url: "https://source.example/note", holder: "Test holder", text: source.padEnd(220, " ."), requestKey: randomUUID() });
  return { s, owner, member, room, hidden, access, agent, mandate, input, desk: new Desk(s, model), tick: (ms: number) => (now += ms) };
}
const good: DeskModel = async (m) => ({
  text: m[1]!.content.includes("<document>")
    ? "1. A small boy named Talo was born and from him came sweet potato, taro and shell money.\n2. People accused Talo of wanting to rule and they killed him.\n3. After that the season of hunger never returned, and one pig became Mount Dorana."
    : "A boy named Talo was born. [1]\n\nPeople killed Talo. The hunger never returned. [2,3]",
  inputTokens: 1,
  outputTokens: 1,
});

test("a desk draft needs a current mandate, never posts, and waits for a human steward", async () => {
  const f = fixture(good);
  await assert.rejects(f.desk.draft(f.agent.actor.id, f.room.id, "missing", f.input()), /mandate/);
  await assert.rejects(f.desk.draft(f.member.actor.id, f.hidden.id, f.mandate.id, f.input()));
  const before = f.s.get<{ n: number }>("SELECT count(*) n FROM posts")!.n,
    input = f.input(),
    d = await f.desk.draft(f.agent.actor.id, f.room.id, f.mandate.id, input);
  assert.equal(d.state, "draft");
  assert.equal(d.source.state, "proposed");
  assert.equal(d.facts.length, 3);
  assert.equal(f.s.get<{ n: number }>("SELECT count(*) n FROM posts")!.n, before, "drafting never posts");
  assert.ok(!JSON.stringify(d).includes("Synthetic field note"), "the stored source text is not echoed back");
  assert.equal((await f.desk.draft(f.agent.actor.id, f.room.id, f.mandate.id, input)).id, d.id, "replay returns the same draft");
  assert.throws(() => f.desk.list(f.member.actor.id, f.room.id), /steward/);
  assert.throws(() => f.desk.review(f.member.actor.id, d.id, { state: "released" }), /steward/);
  assert.throws(() => f.desk.review(f.agent.actor.id, d.id, { state: "released" }));
  const released = f.desk.review(f.owner.actor.id, d.id, { state: "released", draft: "Edited by the steward." });
  assert.equal(released.draft, "Edited by the steward.");
  assert.equal(released.source.state, "accepted");
  assert.equal(f.desk.list(f.owner.actor.id, f.room.id).length, 1);
  f.s.revokeMandate(f.owner.actor.id, f.mandate.id);
  await assert.rejects(f.desk.draft(f.agent.actor.id, f.room.id, f.mandate.id, input), /mandate/, "replay still needs current authority");
});

test("withdrawing a source erases its text and retires its drafts", async () => {
  const f = fixture(good),
    d = await f.desk.draft(f.agent.actor.id, f.room.id, f.mandate.id, f.input());
  assert.throws(() => f.desk.withdraw(f.member.actor.id, d.source.id), /steward/);
  f.desk.withdraw(f.owner.actor.id, d.source.id);
  assert.equal(f.s.get<{ text: string }>("SELECT text FROM desk_shelf WHERE id=?", d.source.id)!.text, "");
  const after = f.desk.list(f.owner.actor.id, f.room.id)[0]!;
  assert.equal(after.state, "rejected");
  assert.equal(after.draft, "");
  assert.deepEqual(after.facts, []);
  await assert.rejects(f.desk.draft(f.agent.actor.id, f.room.id, f.mandate.id, f.input()), /withdrawn/);
});

test("a host without a desk model refuses; a failing draft is kept as failed", async () => {
  await assert.rejects(fixture().desk.draft("x", "y", "z", { kind: "cerita", title: "t", url: "https://e.example", holder: "h", text: "t", requestKey: randomUUID() }), /No desk model/);
  const f = fixture(async (m) => ({ text: m[1]!.content.includes("<document>") ? "1. This sentence is not in the source at all, truly." : "x", inputTokens: 1, outputTokens: 1 }));
  assert.equal((await f.desk.draft(f.agent.actor.id, f.room.id, f.mandate.id, f.input())).state, "failed");
});

test("a steward may edit or delete an agent's post; members and other authors may not", () => {
  const f = fixture(),
    forum = new Forum(f.s),
    post = f.s.createPost(f.agent.actor.id, f.room.id, "Synthetic agent post", undefined, f.mandate.id),
    human = f.s.createPost(f.member.actor.id, f.room.id, "Synthetic member post");
  assert.equal(f.s.getPost(f.owner.actor.id, post.id).permissions.edit, true);
  assert.equal(f.s.getPost(f.member.actor.id, post.id).permissions.edit, false);
  assert.equal(f.s.getPost(f.owner.actor.id, human.id).permissions.edit, false, "a steward still cannot rewrite a person's post");
  assert.throws(() => forum.edit(f.member.actor.id, post.id, { text: "Hijacked", revision: 1 }), /steward/);
  assert.throws(() => forum.edit(f.owner.actor.id, human.id, { text: "Rewritten", revision: 1 }), /Author required/);
  const edited = forum.edit(f.owner.actor.id, post.id, { text: "Corrected by the steward", revision: 1 });
  assert.equal(edited.text, "Corrected by the steward");
  assert.equal(edited.author.kind, "agent", "authorship does not move to the steward");
  assert.ok(f.s.get("SELECT 1 FROM audit WHERE actor_id=? AND action='post.edit' AND target=?", f.owner.actor.id, post.id));
  assert.equal(forum.delete(f.owner.actor.id, post.id, 2).deleted, true);
});

test("page check accepts a figure in the other number format and known Indonesian forms, and still catches new ones", () => {
  const basis = [{ source: 1, text: "The regency covers 6,077.4 km2 and its Austronesian speakers number 70,000 on New Guinea." }];
  const fine = checkPage("## Letak\n\nLuas kabupaten ini 6.077,4 km2. Penuturnya 70.000 orang dari rumpun Austronesia di Pulau Nugini [1].", basis, 1);
  assert.deepEqual(fine, { ok: true, unknown: [], uncited: 0, unsupported: [] });
  const wrong = checkPage("Luasnya 6.077,5 km2 menurut Zeta [1].\n\nTanpa rujukan.\n\nRujukan kosong [2].", basis, 2);
  assert.deepEqual(wrong.unknown.sort(), ["6.077,5", "Zeta"]);
  assert.equal(wrong.uncited, 1);
  assert.deepEqual(wrong.unsupported, [2]);
});

test("page check accepts an outlet name found in a cited address", () => {
  const basis = [{ source: 1, text: "Lima warga tewas dalam peristiwa itu." }];
  assert.equal(checkPage("Menurut Kompas, lima warga tewas [1].", basis, 1, ["https://nasional.kompas.com/read/2020/x"]).ok, true);
  assert.deepEqual(checkPage("Menurut Tempo, lima warga tewas [1].", basis, 1, ["https://nasional.kompas.com/read/2020/x"]).unknown, ["Tempo"]);
});
