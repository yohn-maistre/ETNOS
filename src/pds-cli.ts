import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  capabilities,
  plan,
  estimate,
  resourceName,
  type HostingInput,
  type Usage,
} from "./pds-hosting.ts";
const args = process.argv.slice(2),
  command = args.shift() ?? "capabilities",
  options: Record<string, string | boolean> = {};
const allowed = new Set([
  "json",
  "write",
  "runtime",
  "hostname",
  "handle",
  "did",
  "accounts",
  "image",
  "origin",
  "directory",
  "manifest",
  "requests-per-day",
  "cpu-ms-per-request",
  "do-requests-per-day",
  "do-gb-seconds-per-month",
  "sql-gb-month",
  "rows-read-month",
  "rows-written-month",
  "r2-gb-month",
  "r2-class-a-month",
  "r2-class-b-month",
  "vps-usd-month",
  "node-watts",
  "electricity-usd-kwh",
]);
function output(value: unknown) {
  console.log(JSON.stringify(value, null, options.json ? undefined : 2));
}
try {
  while (args.length) {
    const flag = args.shift()!;
    if (
      !flag.startsWith("--") ||
      !allowed.has(flag.slice(2)) ||
      flag.slice(2) in options
    )
      throw Error("Unknown or duplicate flag: " + flag);
    const key = flag.slice(2);
    if (["json", "write"].includes(key)) options[key] = true;
    else {
      const value = args.shift();
      if (!value || value.startsWith("--"))
        throw Error("Value required: " + flag);
      options[key] = value;
    }
  }
  const str = (key: string) =>
    typeof options[key] === "string" ? (options[key] as string) : undefined;
  if (command === "capabilities") output(capabilities);
  else if (command === "cost") {
    const keys: Record<string, keyof Usage> = {
        "requests-per-day": "requestsPerDay",
        "cpu-ms-per-request": "cpuMsPerRequest",
        "do-requests-per-day": "doRequestsPerDay",
        "do-gb-seconds-per-month": "doGbSecondsPerMonth",
        "sql-gb-month": "sqlGbMonth",
        "rows-read-month": "rowsReadMonth",
        "rows-written-month": "rowsWrittenMonth",
        "r2-gb-month": "r2GbMonth",
        "r2-class-a-month": "r2ClassAMonth",
        "r2-class-b-month": "r2ClassBMonth",
        "vps-usd-month": "vpsUsdMonth",
        "node-watts": "nodeWatts",
        "electricity-usd-kwh": "electricityUsdKwh",
      },
      usage: Usage = {};
    for (const [flag, key] of Object.entries(keys))
      if (str(flag) !== undefined) usage[key] = Number(str(flag));
    output(estimate(usage));
  } else if (command === "doctor") {
    const path = resolve(str("manifest") ?? ".etnos-pds/manifest.json"),
      manifest = JSON.parse(readFileSync(path, "utf8"));
    if (manifest.version !== 1 || !manifest.input)
      throw Error("Unsupported manifest");
    const checked = plan(manifest.input);
    output({
      ok: true,
      manifest: path,
      plan: checked,
      productionQualified: false,
      checks: ["configuration shape", "runtime and host constraints"],
      notChecked: [
        "DNS",
        "TLS",
        "live provider",
        "secrets",
        "recovery",
        "interop",
      ],
    });
  } else if (command === "plan" || command === "init") {
    const input: HostingInput = {
        runtime: str("runtime") as HostingInput["runtime"],
        hostname: str("hostname"),
        handle: str("handle"),
        did: str("did"),
        accounts: str("accounts") === undefined ? 1 : Number(str("accounts")),
        image: str("image"),
        origin: str("origin"),
      },
      planned = plan(input);
    if (command === "plan") output(planned);
    else {
      if ((input.accounts ?? 1) !== 1 && input.runtime === "cloudflare")
        throw Error(
          "init creates one isolated account profile. Use plan --accounts for fleet sizing, then init separately per identity.",
        );
      const directory = resolve(str("directory") ?? ".etnos-pds"),
        files: Record<string, string> = {
          "manifest.json":
            JSON.stringify({ version: 1, input, plan: planned }, null, 2) +
            "\n",
        };
      if (input.runtime === "cloudflare") {
        const secretNames = [
          "AUTH_TOKEN",
          "SIGNING_KEY",
          "SIGNING_KEY_PUBLIC",
          "JWT_SECRET",
          "PASSWORD_HASH",
        ];
        const main = relative(
          directory,
          fileURLToPath(
            new URL("../packages/pds/src/worker.ts", import.meta.url),
          ),
        ).replaceAll("\\", "/");
        files["wrangler.jsonc"] =
          JSON.stringify(
            {
              name: resourceName(input.hostname!),
              main,
              compatibility_date: "2026-10-23",
              compatibility_flags: ["nodejs_compat"],
              workers_dev: false,
              preview_urls: false,
              vars: {
                DID: input.did,
                HANDLE: input.handle,
                PDS_HOSTNAME: input.hostname,
                RELAYS: "",
                SPACES_ENABLED: "false",
                INITIAL_ACTIVE: "true",
              },
              secrets: { required: secretNames },
              durable_objects: {
                bindings: [
                  { name: "ACCOUNT", class_name: "AccountDurableObject" },
                ],
              },
              migrations: [
                { tag: "v1", new_sqlite_classes: ["AccountDurableObject"] },
              ],
              r2_buckets: [
                {
                  binding: "BLOBS",
                  bucket_name: resourceName(input.hostname!) + "-blobs",
                },
              ],
              rules: [
                { type: "Text", globs: ["**/*.html"], fallthrough: true },
              ],
              observability: { enabled: false },
            },
            null,
            2,
          ) + "\n";
        files["README.md"] =
          "# ETNOS PDS profile\n\nExperimental; single-account. No identity, secret, bucket or deployment was created. Use the checkout that generated this profile. Install packages/pds dependencies on a capable machine. Provision a dedicated bucket; supply unique secrets with Wrangler secret put, bind stable HTTPS and verify handle/DID ownership. Do not deploy wrangler.test.jsonc. Run packages/pds qualification checks before inviting anyone. RELAYS is empty but public records remain readable. Keep private Aksara/corpus data outside the public repo.\n";
      } else if (input.runtime === "server") {
        if (!input.image)
          throw Error(
            "init server requires --image ghcr.io/bluesky-social/pds@sha256:<verified digest>",
          );
        files["compose.json"] =
          JSON.stringify(
            {
              services: {
                pds: {
                  image: input.image,
                  restart: "unless-stopped",
                  ports: ["127.0.0.1:2583:2583"],
                  env_file: ["./pds.env"],
                  volumes: ["./data:/pds"],
                  security_opt: ["no-new-privileges:true"],
                  cap_drop: ["ALL"],
                },
              },
            },
            null,
            2,
          ) + "\n";
        files["pds.env.example"] =
          "PDS_HOSTNAME=" +
          input.hostname +
          "\nPDS_PORT=2583\nPDS_DATA_DIRECTORY=/pds\nPDS_BLOBSTORE_DISK_LOCATION=/pds/blocks\nPDS_DID_PLC_URL=https://plc.directory\nPDS_INVITE_REQUIRED=1\nPDS_DISABLE_SSRF_PROTECTION=0\nPDS_CRAWLERS=\nLOG_ENABLED=0\nPDS_JWT_SECRET=\nPDS_DPOP_SECRET=\nPDS_ADMIN_PASSWORD=\nPDS_REPO_SIGNING_KEY_K256_PRIVATE_KEY_HEX=\nPDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX=\n";
        files["README.md"] =
          "# Official PDS server/node profile\n\nNo container or account has been started. Complete pds.env from the example with unique secrets; preserve mode 0600. Put a trusted HTTPS reverse proxy before localhost:2583, configure DNS, persistent storage and off-device encrypted backups. Verify the pinned official image and current upstream configuration. The service is multi-account and invite-only; forum enrollment is separate. Empty crawlers does not make public repositories private. Provision users with the official administrative flow; this profile does not create or migrate identities.\n";
      }
      if (options.write) {
        // Refuse existing destinations, including symlinks, rather than overwrite
        // credentials/configuration. Create the private parent before exclusive files.
        if (existsSync(directory))
          throw Error("Destination already exists; choose a new directory");
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        const actual = realpathSync(directory);
        for (const [name, content] of Object.entries(files))
          writeFileSync(resolve(actual, name), content, {
            flag: "wx",
            mode: 0o600,
          });
      }
      output({
        ok: true,
        written: !!options.write,
        directory,
        files: Object.keys(files),
        plan: planned,
        next: "No deployment occurred. Review the generated profile and complete secrets/DNS/qualification.",
      });
    }
  } else
    throw Error(
      "Unknown command. Use capabilities, plan, init, doctor or cost.",
    );
} catch (e) {
  console.error(
    JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : "PDS command failed",
    }),
  );
  process.exitCode = 1;
}
