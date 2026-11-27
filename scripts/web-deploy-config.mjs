// Writes wrangler.web.deploy.jsonc: wrangler.web.jsonc without the service bindings named on the
// command line. `wrangler deploy` fails when a service binding names a Worker that does not exist in
// the account, and a fresh Cloudflare account has neither `westpapua-watch-engine` (WATCH_NEWS) nor,
// until the owner deploys it, `strata-resident-pi` (RESIDENT_PI). The code reads public news without
// WATCH_NEWS and runs without the resident. The deploy workflow calls this when the repository
// variable ETNOS_OMIT_SERVICES lists binding names (docs/ops/cutover-2026-11-28.md).
//
//   node scripts/web-deploy-config.mjs "WATCH_NEWS RESIDENT_PI"
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** JSON with comments to JSON: drops // and block comments outside strings, and trailing commas. */
export function stripJsonc(text) {
	let out = "", i = 0, inString = false;
	while (i < text.length) {
		const c = text[i], next = text[i + 1];
		if (inString) {
			out += c;
			if (c === "\\") out += text[++i] ?? "";
			else if (c === '"') inString = false;
			i++;
		} else if (c === '"') {
			inString = true;
			out += c;
			i++;
		} else if (c === "/" && next === "/") {
			while (i < text.length && text[i] !== "\n") i++;
		} else if (c === "/" && next === "*") {
			i = text.indexOf("*/", i + 2);
			if (i < 0) throw new Error("Unclosed comment");
			i += 2;
		} else {
			out += c;
			i++;
		}
	}
	return out.replace(/,(\s*[}\]])/g, "$1");
}

/** The config without the named service bindings. Refuses a name that is not bound, so a typo fails the deploy. */
export function withoutServices(config, names) {
	const services = config.services ?? [];
	for (const name of names) if (!services.some((s) => s.binding === name)) throw new Error(`No service binding named ${name}`);
	const kept = services.filter((s) => !names.includes(s.binding));
	const out = { ...config };
	if (kept.length) out.services = kept;
	else delete out.services;
	return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	const names = (process.argv[2] ?? "").split(/[\s,]+/).filter(Boolean);
	if (!names.length) throw new Error("Name at least one service binding");
	const config = JSON.parse(stripJsonc(readFileSync("wrangler.web.jsonc", "utf8")));
	writeFileSync("wrangler.web.deploy.jsonc", JSON.stringify(withoutServices(config, names), null, 2) + "\n");
	console.log(`wrangler.web.deploy.jsonc: without ${names.join(", ")}`);
}
