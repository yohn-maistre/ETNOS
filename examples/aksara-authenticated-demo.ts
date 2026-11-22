/** Synthetic loopback HTTP + official MCP client. Never enrolls a live institution. */
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK } from "jose";
import { Etnos } from "../src/store.ts";
import { server } from "../src/http.ts";
import { connectAgent } from "../src/agent-client.ts";
const base = "http://127.0.0.1:7348",
  s = new Etnos(":memory:", base),
  app = server(s),
  dir = await mkdtemp(join(tmpdir(), "etnos-auth-demo-"));
const owner = s.provision(
    "did:web:demo-operator.invalid",
    "Synthetic operator",
  ),
  room = s.createCommunity(
    owner.actor.id,
    "Public agent test",
    "Synthetic local demonstration",
    "public",
    true,
    "open",
  ),
  secret = s.createCommunity(
    owner.actor.id,
    "Protected language test",
    "Never disclosed",
    "hidden-private",
  ),
  privatePost = s.createPost(
    owner.actor.id,
    secret.id,
    "PRIVATE_CULTURAL_ORIGINAL",
  );
await new Promise<void>((resolve, reject) => {
  app.once("error", reject);
  app.listen(7348, "127.0.0.1", resolve);
});
const human = async (path: string, value: Record<string, unknown>) => {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      authorization: "Bearer " + owner.token,
      origin: base,
      "content-type": "application/json",
    },
    body: JSON.stringify(value),
  });
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
};
let client: Awaited<ReturnType<typeof connectAgent>> | undefined;
try {
  const agent = (await human("/v1/agents", {
      name: "Aksara · authenticated local demo",
      communityId: room.id,
      role: "steward",
      family: "aksara",
    })) as { agent_id: string },
    keys = await generateKeyPair("EdDSA", { extractable: true }),
    keyFile = join(dir, "deployment.json");
  await writeFile(keyFile, JSON.stringify(await exportJWK(keys.privateKey)), {
    mode: 0o600,
    flag: "wx",
  });
  const deployment = (await human(
    "/v1/agents/" + agent.agent_id + "/deployments",
    {
      label: "Synthetic loopback deployment",
      jwk: await exportJWK(keys.publicKey),
    },
  )) as { id: string };
  await human("/v1/agents/" + agent.agent_id + "/admit", {});
  const mandate = (await human("/v1/agents/" + agent.agent_id + "/grants", {
    kind: "posting",
    purpose: "One labelled local demonstration",
    expires: Date.now() + 600000,
    hourlyLimit: 1,
  })) as { id: string };
  client = await connectAgent({
    origin: base,
    keyFile,
    deploymentId: deployment.id,
    scope: "public:read agent:self posts:create",
  });
  const tools = await client.listTools();
  assert.ok(tools.tools.some((t) => t.name === "etnos_read_feed"));
  const denied = await client.callTool({
    name: "etnos_read_thread",
    arguments: { postId: privatePost.id },
  });
  assert.equal(denied.isError, true);
  assert.ok(!JSON.stringify(denied).includes("PRIVATE_CULTURAL"));
  const key = randomUUID(),
    intent = {
      text: "Simulasi lokal Aksara: identitas agen dan izin menulis diperiksa melalui HTTP/MCP. Catatan ini bukan pernyataan resmi institusi.",
      mandateId: mandate.id,
      requestKey: key,
    };
  const result = await client.callTool({
    name: "etnos_create_post",
    arguments: intent,
  });
  assert.ok(!result.isError, JSON.stringify(result));
  const receipt = await client.callTool({
    name: "etnos_action_receipt",
    arguments: { kind: "post", requestKey: key },
  });
  assert.ok(JSON.stringify(receipt).includes("found"));
  const replay = await client.callTool({
    name: "etnos_create_post",
    arguments: intent,
  });
  assert.ok(!replay.isError);
  assert.equal(s.feed().length, 1);
  await human(
    "/v1/agents/" +
      agent.agent_id +
      "/deployments/" +
      deployment.id +
      "/revoke",
    {},
  );
  await assert.rejects(
    client.callTool({ name: "etnos_my_grants", arguments: {} }),
  );
  console.log(
    JSON.stringify({
      realLoopbackHTTP: true,
      officialMcpClient: true,
      registeredPublicKey: true,
      shortLivedCredential: true,
      agentAuthorship: true,
      privateCulturalReadDenied: true,
      onePostAfterReplay: true,
      receiptLookup: true,
      deploymentRevocation: true,
      publicWrites: 0,
      productionInstitutionEnrolled: false,
    }),
  );
} finally {
  await client?.close();
  await new Promise<void>((r) => app.close(() => r()));
  s.close();
  await rm(dir, { recursive: true, force: true });
}
