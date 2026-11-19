// Writes a workerd configuration for running the identity host without Cloudflare: the same
// bundle (dist-host/worker.js, or a production build), SQLite-backed Durable Objects on local
// disk, and the directory in DirectoryDurableObject instead of D1.
//
//   node scripts/selfhost-config.mjs --bundle dist/worker.js --storage /data --port 8080 \
//        --vars vars.json --config-dir . > config.capnp
//   workerd serve config.capnp --experimental
//
// vars.json holds the host settings (PDS_HOSTNAME, HANDLE_DOMAIN, PLC_URL, ESCROW_ROTATION_KEY,
// ACCOUNT_KEK_V1, OPERATOR_TOKEN, ...). Keep it readable by the service user only. `--plc` is
// for tests: it sends every outbound request to one local address instead of the Internet.
// TLS is terminated in front of workerd (for example by Caddy), which sets X-Forwarded-Proto.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { relative, resolve } from "node:path";

const quote = (s) => JSON.stringify(String(s));

export function selfHostConfig({ bundle, storage, port, vars, plc, compatibilityDate = "2026-10-23", address = "127.0.0.1", configDir = "." }) {
	// Cap'n Proto reads an absolute embed path against its import roots, so embed relative to the config file.
	const embedded = relative(resolve(configDir), resolve(bundle));
	const bindings = Object.entries(vars)
		.filter(([, v]) => v !== undefined && v !== null)
		.map(([k, v]) => `    (name = ${quote(k)}, text = ${quote(v)}),`)
		.join("\n");
	const outbound = plc
		? `    (name = "outbound", external = (address = ${quote(plc)}, http = ())),`
		: `    (name = "outbound", network = (allow = ["public"], tlsOptions = (trustBrowserCas = true))),`;
	return `using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "pds", worker = .pds),
${outbound}
    (name = "storage", disk = (path = ${quote(storage)}, writable = true)),
  ],
  sockets = [
    (name = "http", address = ${quote(`${address}:${port}`)}, http = (forwardedProtoHeader = "X-Forwarded-Proto"), service = "pds"),
  ],
);

const pds :Workerd.Worker = (
  modules = [(name = "worker.js", esModule = embed ${quote(embedded)})],
  compatibilityDate = ${quote(compatibilityDate)},
  bindings = [
${bindings}
    (name = "ACCOUNT", durableObjectNamespace = "HostedAccountDurableObject"),
    (name = "AUTH_HUB", durableObjectNamespace = "AuthHubDurableObject"),
    (name = "DIRECTORY_DO", durableObjectNamespace = "DirectoryDurableObject"),
    (name = "SPACES", durableObjectNamespace = "HostedSpaceDurableObject"),
    (name = "SPACES_INDEX", durableObjectNamespace = "HostedSpaceIndexDurableObject"),
  ],
  durableObjectNamespaces = [
    (className = "HostedAccountDurableObject", uniqueKey = "strata-pds-account", enableSql = true),
    (className = "AuthHubDurableObject", uniqueKey = "strata-pds-auth-hub", enableSql = true),
    (className = "DirectoryDurableObject", uniqueKey = "strata-pds-directory", enableSql = true),
    (className = "HostedSpaceDurableObject", uniqueKey = "strata-pds-spaces", enableSql = true),
    (className = "HostedSpaceIndexDurableObject", uniqueKey = "strata-pds-spaces-index", enableSql = true),
  ],
  durableObjectStorage = (localDisk = "storage"),
  globalOutbound = "outbound",
);
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	const arg = (name, fallback) => {
		const i = process.argv.indexOf(name);
		return i > 0 ? process.argv[i + 1] : fallback;
	};
	process.stdout.write(
		selfHostConfig({
			bundle: arg("--bundle", "dist/worker.js"),
			storage: arg("--storage", "/data"),
			port: arg("--port", "8080"),
			address: arg("--address", "0.0.0.0"),
			vars: JSON.parse(readFileSync(arg("--vars", "vars.json"), "utf8")),
			plc: arg("--plc"),
			configDir: arg("--config-dir", "."),
		}),
	);
}
