import { createHash } from "node:crypto";
/** Operator planning contract. Public PDS hosting never grants Strata membership. */
export type Runtime = "cloudflare" | "server" | "external";
export type HostingInput = {
  runtime: Runtime;
  hostname?: string;
  handle?: string;
  did?: string;
  accounts?: number;
  image?: string;
  origin?: string;
};
export const capabilities = {
  version: 1,
  service: "strata-pds",
  stage: "experimental",
  commands: ["capabilities", "plan", "init", "cost", "doctor"],
  runtimes: ["cloudflare", "server", "external"],
  machineReadable: true,
  automaticDeployment: false,
  automaticDidCreation: false,
  automaticAccountMigration: false,
  publicRepositories: true,
  privateVaultProvided: false,
  serverlessImplementation:
    "in-repository Cirrus-derived Worker with official AT repo/crypto libraries",
  serverImplementation: "official PDS container profile",
  cloudflareAccountsPerWorker: 1,
  spacesDefault: false,
  signup: "operator-provisioned; no public registration endpoint",
};
export function hostname(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 253 ||
    value !== value.toLowerCase() ||
    !value.includes(".") ||
    !value
      .split(".")
      .every((s) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(s)) ||
    /^\d+(\.\d+){3}$/.test(value)
  )
    throw Error("A lowercase public DNS hostname is required");
  return value;
}
export function resourceName(host: string) {
  const value = hostname(host);
  return (
    "strata-pds-" +
    value.replaceAll(".", "-").slice(0, 28).replace(/-+$/, "") +
    "-" +
    createHash("sha256").update(value).digest("hex").slice(0, 16)
  );
}
export function plan(input: HostingInput) {
  if (!["cloudflare", "server", "external"].includes(input.runtime))
    throw Error("Select cloudflare, server or external");
  const accounts = input.accounts ?? 1;
  if (!Number.isSafeInteger(accounts) || accounts < 1 || accounts > 1000)
    throw Error("accounts must be an integer between 1 and 1000");
  if (input.runtime === "external") {
    const origin = new URL(input.origin ?? "");
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw Error("External PDS origin must be a bare HTTPS origin");
    hostname(origin.hostname);
    return {
      version: 1,
      runtime: input.runtime,
      accounts,
      origin: origin.origin,
      resources: [],
      actions: [
        "Qualify provider DNS/HTTPS and OAuth endpoints",
        "Add provider to Strata OAuth allowlist after qualification",
        "Keep forum enrollment invitation-controlled",
      ],
      warnings: ["No new hosting is created; public AT records remain public"],
    };
  }
  const host = hostname(input.hostname);
  if (input.runtime === "cloudflare") {
    const handle = hostname(input.handle);
    if (
      typeof input.did !== "string" ||
      input.did.length > 2048 ||
      !/^did:(?:plc:[a-z2-7]{24}|web:[A-Za-z0-9._:%-]+)$/.test(input.did)
    )
      throw Error(
        "Supply an existing verified DID or explicit did:web hostname; this command does not register a DID",
      );
    if (input.did.startsWith("did:web:") && input.did !== "did:web:" + host)
      throw Error("This profile serves did:web only for its own hostname");
    return {
      version: 1,
      runtime: input.runtime,
      accounts,
      hostname: host,
      handle,
      did: input.did,
      resources: [
        { type: "worker", count: accounts },
        { type: "sqlite-durable-object-account", count: accounts },
        { type: "r2-blob-store", count: accounts },
      ],
      signup: "closed",
      publicRepo: true,
      proxy: false,
      relayNotification: false,
      spaces: false,
      actions: [
        "Generate one isolated profile per account; do not reuse keys",
        "Provision a dedicated R2 bucket and account DO namespace",
        "Install unique signing/session/password-hash secrets without printing them",
        "Bind a stable HTTPS hostname and verify DID/handle ownership",
        "Run OAuth, export/restore and isolation qualification before enrollment",
      ],
      warnings:
        accounts > 1
          ? [
              "This profile configures one identity only; accounts describes the required fleet size, not multi-user support",
              "Twenty Workers share account-level quotas",
            ]
          : ["Single-account experimental hosting; no live identity created"],
    };
  }
  if (
    input.image &&
    !/^ghcr\.io\/bluesky-social\/pds@sha256:[a-f0-9]{64}$/.test(input.image)
  )
    throw Error("Pin the official PDS image by sha256 digest");
  return {
    version: 1,
    runtime: input.runtime,
    accounts,
    hostname: host,
    image: input.image ?? null,
    resources: [
      { type: "persistent-server", count: 1 },
      { type: "sqlite-and-filesystem-volume", count: 1 },
    ],
    actions: [
      "Resolve and pin an official PDS image digest",
      "Provide stable public HTTPS and persistent storage",
      "Configure unique secrets, invite-only registration and backups",
      "Create accounts through the official administrative API and qualify OAuth",
    ],
    warnings: [
      "The server profile runs the official PDS, not Cloudflare Durable Objects",
      "A community node must remain reachable for its hosted identity services; ETNOS cannot substitute for an offline PDS",
      "No RAM or performance guarantee is implied by a VM recommendation",
    ],
  };
}
export type Usage = {
  requestsPerDay?: number;
  cpuMsPerRequest?: number;
  doRequestsPerDay?: number;
  doGbSecondsPerMonth?: number;
  sqlGbMonth?: number;
  rowsReadMonth?: number;
  rowsWrittenMonth?: number;
  r2GbMonth?: number;
  r2ClassAMonth?: number;
  r2ClassBMonth?: number;
  vpsUsdMonth?: number;
  nodeWatts?: number;
  electricityUsdKwh?: number;
};
export function estimate(input: Usage = {}) {
  const u = {
    requestsPerDay: 20000,
    cpuMsPerRequest: 2,
    doRequestsPerDay: 20000,
    doGbSecondsPerMonth: 6000,
    sqlGbMonth: 0.2,
    rowsReadMonth: 10000000,
    rowsWrittenMonth: 100000,
    r2GbMonth: 2,
    r2ClassAMonth: 10000,
    r2ClassBMonth: 100000,
    vpsUsdMonth: 5,
    nodeWatts: 10,
    electricityUsdKwh: 0.1,
    ...input,
  };
  for (const [k, v] of Object.entries(u))
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e15)
      throw Error(k + " must be a finite nonnegative number");
  const excess = (v: number, allowance: number, unit: number, rate: number) =>
    Math.ceil(Math.max(0, v - allowance) / unit) * rate;
  const parts = {
    accountMinimum: 5,
    workerRequests: excess(u.requestsPerDay * 30, 10000000, 1000000, 0.3),
    workerCpu: excess(
      u.requestsPerDay * 30 * u.cpuMsPerRequest,
      30000000,
      1000000,
      0.02,
    ),
    doRequests: excess(u.doRequestsPerDay * 30, 1000000, 1000000, 0.15),
    doDuration: excess(u.doGbSecondsPerMonth, 400000, 1000000, 12.5),
    sqlStorage: excess(u.sqlGbMonth, 5, 1, 0.2),
    sqlReads: excess(u.rowsReadMonth, 25000000000, 1000000, 0.001),
    sqlWrites: excess(u.rowsWrittenMonth, 50000000, 1000000, 1),
    r2Storage: excess(u.r2GbMonth, 10, 1, 0.015),
    r2ClassA: excess(u.r2ClassAMonth, 1000000, 1000000, 4.5),
    r2ClassB: excess(u.r2ClassBMonth, 10000000, 1000000, 0.36),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    version: 1,
    currency: "USD",
    periodDays: 30,
    assumptions: u,
    cloudflarePaid: {
      parts,
      estimatedAccountTotal: Math.round(total * 1000) / 1000,
      incrementalIfAlreadyPaidAndWithinAllSharedAllowances: 0,
    },
    server: {
      assumedVpsMonthly: u.vpsUsdMonth,
      existingNodeElectricityMonthly:
        (u.nodeWatts / 1000) * 24 * 30 * u.electricityUsdKwh,
    },
    freeTier: {
      possibleToEvaluate: true,
      qualified: false,
      requestsPerDayLimit: 100000,
      cpuPerInvocationLimitMs: 10,
    },
    warnings: [
      "Planning estimate, not a bill or measured capacity",
      "Allowances are account-wide and may already be consumed by WPW/forum/other services; incremental zero is conditional",
      "CPU average cannot establish compliance with a per-invocation Free CPU limit; bcrypt, signing and imports need measurement",
      "DO duration uses allocated memory and wall-clock time; hibernating sockets reduce billable duration",
      "Billable units are conservatively rounded up; taxes, mail, backups, bandwidth on servers, hardware, relay amplification and AI inference are excluded",
      "One registered user does not correspond to one request; public sync may dominate",
    ],
    sources: [
      "https://developers.cloudflare.com/workers/platform/pricing/",
      "https://developers.cloudflare.com/durable-objects/platform/pricing/",
      "https://developers.cloudflare.com/r2/pricing/",
    ],
    pricingChecked: "2026-11-01",
  };
}
