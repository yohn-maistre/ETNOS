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
*{box-sizing:border-box}
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f4ef;color:#1d1b16}
main{max-width:28rem;margin:0 auto;padding:2rem 1rem 3rem}
h1{font-size:1.4rem;line-height:1.25;margin:0 0 1rem}
p{margin:0 0 1rem}
.muted{color:#5d574b;font-size:.92rem}
form{margin:0 0 1rem}
label{display:block;font-weight:600;margin:1rem 0 .3rem}
input[type=text],input[type=password]{width:100%;padding:.7rem .8rem;border:1px solid #b9b2a3;border-radius:.5rem;font:inherit;background:#fff}
.suffix{display:flex;align-items:center;gap:.4rem}.suffix span{color:#5d574b;white-space:nowrap}
.check{display:flex;gap:.5rem;align-items:flex-start;font-weight:400}
button,.button{display:inline-block;width:100%;margin-top:1rem;padding:.75rem 1rem;border:0;border-radius:.5rem;background:#2f4a3a;color:#fff;font:inherit;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}
button.secondary{background:#e7e2d8;color:#1d1b16}
.account{background:#fff;color:#1d1b16;border:1px solid #b9b2a3;text-align:left}
.error{background:#fbe9e5;border:1px solid #d9a092;border-radius:.5rem;padding:.7rem .8rem;margin:0 0 1rem}
.box{background:#fff;border:1px solid #ddd6c8;border-radius:.5rem;padding:.8rem;margin:0 0 1rem}
ul{padding-left:1.2rem;margin:0 0 1rem}
a{color:#2f4a3a}
`;

export function page(title: string, body: string, status = 200): Response {
	const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;
	return new Response(html, {
		status,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"content-security-policy": PAGE_CSP,
			"cache-control": "no-store",
			"x-frame-options": "DENY",
			"referrer-policy": "no-referrer",
		},
	});
}

const errorBox = (error?: string) => (error ? `<div class="error" role="alert">${esc(error)}</div>` : "");

export function homePage(name: string, domain: string): Response {
	return page(
		`Akun ${name}`,
		`<h1>Penyedia akun ${esc(name)}</h1>
<p>Server ini menyimpan akun AT Protocol dengan nama di bawah ${esc(domain)}. Akun dibuat dengan kode undangan dari pengurus.</p>
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
