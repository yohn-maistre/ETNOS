/**
 * Server-rendered pages of the identity host, in plain Indonesian. No
 * scripts; every value is escaped. Copy follows docs/naming.md.
 */

export const PAGE_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self' https:; frame-ancestors 'none'; base-uri 'none'";

export function esc(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

const STYLE = `
:root{color-scheme:light dark;--bg:#faf9f6;--fg:#262329;--card:#fff;--muted:#69636b;--line:#dedbd6;--brand:#6430ab;--btn:#262329;--btn-fg:#faf9f6;--soft:#f1eee9;--err:#fbe9e5;--err-line:#d9a092}
@media (prefers-color-scheme:dark){:root{--bg:#151516;--fg:#f0ede7;--card:#1c1c1e;--muted:#aaa6ae;--line:#2e2d31;--brand:#a98be0;--btn:#f0ede7;--btn-fg:#151516;--soft:#232226;--err:#3a2320;--err-line:#7a4338}}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;min-height:100dvh;font:16px/1.55 "Geist","Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased}
.top{max-width:27rem;margin:0 auto;padding:2.5rem 1.25rem 0}
.mark{font-size:1.9rem;font-weight:700;letter-spacing:-.04em;line-height:1;color:var(--fg)}
.mark b{color:var(--brand)}
main{max-width:27rem;margin:0 auto;padding:1.75rem 1.25rem 2rem}
h1{font-size:1.6rem;line-height:1.2;letter-spacing:-.015em;margin:0 0 .6rem}
p{margin:0 0 1rem}
.muted{color:var(--muted);font-size:.93rem}
form{margin:0 0 1rem}
label{display:block;font-weight:600;font-size:.95rem;margin:1.1rem 0 .35rem}
input[type=text],input[type=password]{width:100%;min-height:2.9rem;padding:.7rem .85rem;border:1px solid var(--line);border-radius:.75rem;font:inherit;background:var(--card);color:var(--fg)}
input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.suffix{display:flex;align-items:center;gap:.4rem}.suffix span{color:var(--muted);white-space:nowrap}
.check{display:flex;gap:.55rem;align-items:flex-start;font-weight:400}
button,.button{display:inline-block;width:100%;margin-top:1.1rem;min-height:2.9rem;padding:.75rem 1rem;border:0;border-radius:.75rem;background:var(--btn);color:var(--btn-fg);font:inherit;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}
button.secondary{background:var(--soft);color:var(--fg)}
.account{background:var(--card);color:var(--fg);border:1px solid var(--line);text-align:left}
.error{background:var(--err);border:1px solid var(--err-line);border-radius:.75rem;padding:.75rem .85rem;margin:0 0 1rem}
.box{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:.85rem;margin:0 0 1rem}
ul{padding-left:1.2rem;margin:0 0 1rem}
a{color:var(--fg);text-underline-offset:3px}
.foot{max-width:27rem;margin:0 auto;padding:0 1.25rem 2.5rem;color:var(--muted);font-size:.85rem}
`;

export function page(title: string, body: string, status = 200): Response {
	const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${STYLE}</style></head><body><header class="top"><span class="mark">etnos<b>.</b></span></header><main>${body}</main><footer class="foot">Server akun ETNOS. Akunmu memakai AT Protocol, jadi bisa dipakai di aplikasi lain dan dipindahkan.</footer></body></html>`;
	return new Response(html, {
		status,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"content-security-policy": PAGE_CSP,
			"cache-control": "no-store",
			"x-frame-options": "DENY",
			// same-origin keeps the Origin header on this host's own form posts, which the CSRF checks read.
			"referrer-policy": "same-origin",
		},
	});
}

const errorBox = (error?: string) => (error ? `<div class="error" role="alert">${esc(error)}</div>` : "");

export function homePage(name: string, domain: string): Response {
	return page(
		`Akun ${name}`,
		`<h1>Penyedia akun ${esc(name)}</h1>
<p>Server ini menyimpan akun AT Protocol dengan nama di bawah ${esc(domain)}. Akun hanya bisa dibuat dengan kode undangan dari pengurus. Server ini sedang diuji oleh kelompok kecil.</p>
<p><a class="button" href="/akun/baru">Buat akun</a></p>`,
	);
}

export interface SignupValues {
	code?: string;
	label?: string;
	error?: string;
}

export function signupPage(name: string, domain: string, values: SignupValues, status = 200): Response {
	return page(
		`Buat akun ${name}`,
		`<h1>Buat akun ${esc(name)}</h1>
<p>Akun ini adalah identitas AT Protocol yang disimpan oleh ${esc(name)}. ${esc(name)} menyimpan kunci akun Anda dan dapat diminta memindahkannya ke penyedia lain.</p>
${errorBox(values.error)}
<form method="post" action="/akun/baru">
<label for="code">Kode undangan</label>
<input id="code" name="code" type="text" autocomplete="off" required maxlength="100" value="${esc(values.code)}">
<label for="label">Nama akun</label>
<div class="suffix"><input id="label" name="label" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="20" pattern="[a-z0-9-]{3,20}" value="${esc(values.label)}"><span>.${esc(domain)}</span></div>
<p class="muted">Huruf kecil, angka dan tanda hubung, 3 sampai 20 karakter.</p>
<label for="password">Kata sandi</label>
<input id="password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="256">
<p class="muted">Minimal 8 karakter.</p>
<label for="password2">Ulangi kata sandi</label>
<input id="password2" name="password2" type="password" autocomplete="new-password" required minlength="8" maxlength="256">
<label class="check"><input type="checkbox" name="age" value="16" required> Saya berusia 16 tahun atau lebih.</label>
<button type="submit">Buat akun</button>
</form>`,
		status,
	);
}

export function signupDonePage(name: string, handle: string, signinUrl: string | null): Response {
	const link = signinUrl
		? `<p><a class="button" href="${esc(signinUrl)}">Masuk ke ${esc(name)}</a></p>`
		: "";
	return page(
		"Akun sudah dibuat",
		`<h1>Akun Anda sudah dibuat</h1>
<p>Nama akun Anda <strong>${esc(handle)}</strong>.</p>
<p>Simpan kata sandi Anda di tempat yang aman. Pengurus tidak bisa melihat kata sandi Anda.</p>
${link}`,
	);
}

export function messagePage(title: string, text: string, status: number): Response {
	return page(title, `<h1>${esc(title)}</h1><p>${esc(text)}</p>`, status);
}

/** Plain descriptions of OAuth scopes, one line each. */
export function describeScope(scope: string): string[] {
	const lines: string[] = [];
	for (const part of scope.split(/\s+/).filter(Boolean)) {
		if (part === "atproto") lines.push("Mengenali akun Anda, yaitu nama akun dan DID.");
		else if (part.startsWith("repo:")) lines.push(`Menulis catatan jenis ${part.slice(5).split("?")[0]} di akun Anda.`);
		else if (part === "transition:generic") lines.push("Membaca dan menulis semua catatan di akun Anda.");
		else if (part === "transition:email") lines.push("Melihat alamat email akun Anda.");
		else lines.push(`Izin teknis ${part}.`);
	}
	return lines;
}

export interface OAuthPageContext {
	clientName: string;
	clientId: string;
	requestUri: string;
	scope: string;
}

const hidden = (ctx: OAuthPageContext) =>
	`<input type="hidden" name="client_id" value="${esc(ctx.clientId)}"><input type="hidden" name="request_uri" value="${esc(ctx.requestUri)}">`;

export function selectorPage(name: string, domain: string, ctx: OAuthPageContext, remembered: string[], error?: string, status = 200): Response {
	const accounts = remembered
		.map(
			(handle) =>
				`<form method="post" action="/oauth/select">${hidden(ctx)}<input type="hidden" name="handle" value="${esc(handle)}"><button class="account" type="submit">${esc(handle)}</button></form>`,
		)
		.join("");
	return page(
		`Masuk ke ${ctx.clientName}`,
		`<h1>Masuk ke ${esc(ctx.clientName)}</h1>
<p>Pilih akun ${esc(name)} yang ingin Anda pakai.</p>
${errorBox(error)}
${accounts}
<form method="post" action="/oauth/select">${hidden(ctx)}
<label for="handle">Nama akun</label>
<input id="handle" name="handle" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="253" placeholder="nama.${esc(domain)}">
<button type="submit">Lanjut</button>
</form>
<p class="muted">Belum punya akun? Akun dibuat dengan kode undangan dari pengurus di <a href="/akun/baru">halaman pembuatan akun</a>.</p>`,
		status,
	);
}

export function consentPage(ctx: OAuthPageContext, handle: string, error?: string, status = 200): Response {
	const scopes = describeScope(ctx.scope).map((line) => `<li>${esc(line)}</li>`).join("");
	return page(
		`Masuk ke ${ctx.clientName}`,
		`<h1>Masuk ke ${esc(ctx.clientName)}</h1>
<p>Masuk sebagai <strong>${esc(handle)}</strong>.</p>
<div class="box"><p>${esc(ctx.clientName)} meminta izin untuk hal berikut.</p><ul>${scopes}</ul><p class="muted">${esc(ctx.clientId)}</p></div>
${errorBox(error)}
<form method="post" action="/oauth/authorize">${hidden(ctx)}
<input type="hidden" name="action" value="approve">
<label for="password">Kata sandi</label>
<input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256">
<button type="submit">Izinkan</button>
</form>
<form method="post" action="/oauth/authorize">${hidden(ctx)}<input type="hidden" name="action" value="deny"><button class="secondary" type="submit">Tolak</button></form>
<form method="post" action="/oauth/select">${hidden(ctx)}<input type="hidden" name="other" value="1"><button class="secondary" type="submit">Pakai akun lain</button></form>`,
		status,
	);
}
