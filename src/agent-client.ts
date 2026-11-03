import { readFile, stat } from "node:fs/promises";
import { importJWK, SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
/** Optional host-side credential broker. Private keys/tokens never become tool arguments. */
export async function connectAgent(options: {
  origin: string;
  keyFile?: string;
  deploymentId?: string;
  scope?: string;
  fetcher?: typeof fetch;
}) {
  const origin = new URL(options.origin);
  if (
    origin.href !== origin.origin + "/" ||
    origin.username ||
    origin.password ||
    !(
      origin.protocol === "https:" ||
      (origin.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
    )
  )
    throw Error("An HTTPS origin or explicit loopback origin is required");
  if (!!options.keyFile !== !!options.deploymentId)
    throw Error(
      "Provide both the private key file and registered deployment ID",
    );
  const fetcher = options.fetcher ?? fetch;
  let signingKey: Awaited<ReturnType<typeof importJWK>> | undefined,
    access = "",
    until = 0,
    refresh: Promise<void> | undefined;
  if (options.keyFile) {
    const info = await stat(options.keyFile);
    if (process.platform !== "win32" && info.mode & 0o077)
      throw Error("Private key file must have mode 0600");
    const raw = JSON.parse(await readFile(options.keyFile, "utf8"));
    if (raw.kty !== "OKP" || raw.crv !== "Ed25519" || typeof raw.d !== "string")
      throw Error("Private Ed25519 JWK required");
    signingKey = await importJWK(raw, "EdDSA");
  }
  async function authenticate() {
    if (!signingKey) return;
    if (until > Date.now() + 15000) return;
    if (refresh) return refresh;
    refresh = (async () => {
      const assertion = await new SignJWT({ jti: randomUUID() })
        .setProtectedHeader({ alg: "EdDSA" })
        .setIssuer(options.deploymentId!)
        .setSubject(options.deploymentId!)
        .setAudience(origin.origin + "/agents/token")
        .setIssuedAt()
        .setExpirationTime("2m")
        .sign(signingKey!);
      const response = await fetcher(origin.origin + "/agents/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion,
          resource: origin.origin + "/mcp",
          scope: options.scope ?? "public:read agent:self",
        }),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw Error(
          "Deployment authentication denied (" +
            response.status +
            "); check enrollment and revocation",
        );
      const value = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };
      if (
        typeof value.access_token !== "string" ||
        value.access_token.length > 200 ||
        !Number.isFinite(value.expires_in) ||
        value.expires_in > 300 ||
        value.expires_in <= 0
      )
        throw Error("Invalid token response");
      access = value.access_token;
      until = Date.now() + value.expires_in * 1000;
    })().finally(() => {
      refresh = undefined;
    });
    return refresh;
  }
  const transport = new StreamableHTTPClientTransport(new URL("/mcp", origin), {
    fetch: async (input, init) => {
      const request = new Request(input, init);
      if (
        new URL(request.url).origin !== origin.origin ||
        new URL(request.url).pathname !== "/mcp"
      )
        throw Error("MCP credential forwarding blocked");
      await authenticate();
      const headers = new Headers(request.headers);
      headers.delete("cookie");
      headers.delete("authorization");
      if (access) headers.set("authorization", "Bearer " + access);
      // No automatic retry of a tool call after uncertain network or credential outcomes.
      return fetcher(
        new Request(request, {
          headers,
          redirect: "error",
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
        }),
      );
    },
  });
  const client = new Client({ name: "etnos-agent-client", version: "0.2.0" });
  await client.connect(transport);
  return client;
}
