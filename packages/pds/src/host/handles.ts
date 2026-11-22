/**
 * Handle rules for the identity host (plan §2.2 rule 6). One DNS label under
 * the host's handle domain, lowercase ASCII letters, digits and hyphens, 3 to
 * 20 characters, no hyphen at either end, never a reserved name.
 *
 * One list for the whole name space: <name>.etnos.space is both an AT handle and, once the owner switches it on,
 * the address of a lembaga's Situs (src/situs-dispatch.ts in the ETNOS app imports this file). A name reserved
 * here can be neither.
 */

export const RESERVED_LABELS = new Set([
	"www", "pds", "api", "admin", "mail", "app", "status", "etnos", "strata", "aksara",
	"auth", "login", "masuk", "daftar", "gabung", "akun", "oauth", "help", "bantuan",
	"support", "root", "system", "steward", "operator", "official", "resmi", "test",
	"dev", "staging", "static", "cdn", "assets", "media", "blob", "blobs", "relay",
	"plc", "did", "handle", "ns", "ns1", "ns2", "smtp", "imap", "ftp", "localhost",
	// Situs and the app's own sections (docs/plan/one-page-system-2026-11-21.md §8).
	"situs", "wiki", "kios", "lembaga", "komunitas", "kabar", "news", "studio", "mcp", "agents", "agen",
	"docs", "blog", "preview", "beta", "demo", "identity", "host", "email", "webmail", "autoconfig",
	"autodiscover", "pesan", "jelajah", "beranda",
]);

const LABEL = /^[a-z0-9](?:[a-z0-9-]{1,18})[a-z0-9]$/;

export type HandleCheck = { ok: true; label: string; handle: string } | { ok: false; reason: string };

/** Accept either a bare label or a full handle under the domain; return the canonical handle. */
export function checkHandle(input: string, domain: string): HandleCheck {
	const raw = input.trim().toLowerCase().replace(/^@/, "");
	const suffix = "." + domain.toLowerCase();
	const label = raw.endsWith(suffix) ? raw.slice(0, -suffix.length) : raw;
	if (label.includes(".")) return { ok: false, reason: "Nama hanya boleh satu bagian, tanpa titik." };
	if (label.length < 3 || label.length > 20) return { ok: false, reason: "Nama harus 3 sampai 20 karakter." };
	if (!LABEL.test(label)) return { ok: false, reason: "Nama hanya boleh huruf kecil, angka dan tanda hubung, dan tidak diawali atau diakhiri tanda hubung." };
	if (label.includes("--")) return { ok: false, reason: "Nama tidak boleh memuat dua tanda hubung berturut-turut." };
	if (RESERVED_LABELS.has(label)) return { ok: false, reason: "Nama ini dipakai oleh sistem. Pilih nama lain." };
	return { ok: true, label, handle: label + suffix };
}

/** For an incoming Host header: the handle label if the host is a first-level name under the domain, else null. */
export function labelForHost(host: string, domain: string): string | null {
	const h = host.toLowerCase().replace(/:\d+$/, "");
	const suffix = "." + domain.toLowerCase();
	if (!h.endsWith(suffix)) return null;
	const label = h.slice(0, -suffix.length);
	return LABEL.test(label) && !label.includes(".") ? label : null;
}
