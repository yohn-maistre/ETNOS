/** ETNOS-owned hosting boundary around the attributed Cirrus/official-AT foundation. */
import app, { getAccountDO } from "./upstream/index";
import type { PDSEnv } from "./upstream/types";
export {
  AccountDurableObject,
  SpaceDurableObject,
  SpaceIndexDurableObject,
} from "./upstream/index";
const json = (status: number, error: string, message: string) =>
  Response.json(
    { error, message },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
export default {
  async fetch(
    request: Request,
    env: PDSEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin !== "https://" + env.PDS_HOSTNAME)
      return json(400, "InvalidRequest", "Unexpected host");
    if (url.pathname === "/health")
      return Response.json({
        service: "etnos-pds",
        stage: "experimental",
        accountsPerDeployment: 1,
        publicRepository: true,
        spaces: env.SPACES_ENABLED === "true",
        proxy: false,
        signup: false,
      });
    if (request.headers.has("atproto-proxy"))
      return json(400, "InvalidRequest", "Service proxy is not enabled");
    if (url.pathname === "/xrpc/com.atproto.server.createAccount")
      return json(
        403,
        "RegistrationClosed",
        "Accounts are provisioned by the node operator",
      );
    const authAttempt =
      request.method === "POST" &&
      (url.pathname.startsWith("/oauth/") ||
        url.pathname === "/xrpc/com.atproto.server.createSession" ||
        url.pathname.startsWith("/passkey/"));
    if (authAttempt) {
      const material = new TextEncoder().encode(
        env.JWT_SECRET +
          ":" +
          Math.floor(Date.now() / 600000) +
          ":" +
          (request.headers.get("cf-connecting-ip") ?? "unavailable"),
      );
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", material)),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (!(await getAccountDO(env).consumeAuthBudget(digest, Date.now()))) {
        const r = json(429, "RateLimitExceeded", "Try again later");
        r.headers.set("retry-after", "600");
        return r;
      }
    }
    if (
      url.pathname === "/xrpc/com.atproto.repo.importRepo" &&
      request.method === "POST"
    ) {
      using repo = await getAccountDO(env).repo();
      if ((await repo.getActive()) || (await repo.countRecords()) > 0)
        return json(
          409,
          "MigrationNotReady",
          "Import requires an inactive empty account; existing records are never overwritten by this profile",
        );
    }
    const limit =
      url.pathname === "/xrpc/com.atproto.repo.uploadBlob"
        ? 5 * 1024 * 1024
        : url.pathname === "/xrpc/com.atproto.repo.importRepo"
          ? 16 * 1024 * 1024
          : 256 * 1024;
    if (
      request.headers.get("content-encoding") &&
      request.headers.get("content-encoding") !== "identity"
    )
      return json(
        415,
        "InvalidRequest",
        "Compressed request bodies are not supported",
      );
    if (Number(request.headers.get("content-length")) > limit)
      return json(413, "PayloadTooLarge", "Request exceeds this host limit");
    let exceeded = false,
      received = 0;
    if (request.body) {
      const stream = request.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            received += chunk.byteLength;
            if (received > limit) {
              exceeded = true;
              controller.error(new Error("Body limit"));
            } else controller.enqueue(chunk);
          },
        }),
      );
      request = new Request(request, {
        body: stream,
        duplex: "half",
      } as RequestInit);
    }
    try {
      const response = await app.fetch(request, env, ctx);
      if (exceeded)
        return json(413, "PayloadTooLarge", "Request exceeds this host limit");
      if (response.status === 101) return response; // Preserve WebSocket upgrades.
      const headers = new Headers(response.headers);
      headers.set("x-content-type-options", "nosniff");
      headers.set("referrer-policy", "no-referrer");
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return exceeded
        ? json(413, "PayloadTooLarge", "Request exceeds this host limit")
        : json(503, "Unavailable", "PDS temporarily unavailable");
    }
  },
} satisfies ExportedHandler<PDSEnv>;
