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
:root{color-scheme:light dark;--background:#faf9f6;--foreground:#262329;--card:#fff;--muted:#f1eeea;--muted-foreground:#69636b;--border:#dedbd6;--input:#c5c0ba;--ring:#6430ab;--destructive:#b4283e;--primary:#262329;--primary-foreground:#faf9f6;--radius:.625rem;--input-bg:transparent;--input-bg-disabled:color-mix(in oklab,#c5c0ba 50%,transparent);--invalid-ring:color-mix(in oklab,#b4283e 20%,transparent);--invalid-border:#b4283e;--shadow-xs:0 1px 2px 0 rgb(0 0 0/.05)}
@media (prefers-color-scheme:dark){:root{--background:#151516;--foreground:#f0ede7;--card:#1c1c1e;--muted:#222224;--muted-foreground:#aaa6ae;--border:#343337;--input:#545159;--ring:#a98be0;--destructive:#ff9b9e;--primary:#f0ede7;--primary-foreground:#151516;--input-bg:color-mix(in oklab,#545159 30%,transparent);--input-bg-disabled:color-mix(in oklab,#545159 80%,transparent);--invalid-ring:color-mix(in oklab,#ff9b9e 40%,transparent);--invalid-border:color-mix(in oklab,#ff9b9e 50%,transparent)}}
*{box-sizing:border-box;border-color:var(--border)}
html{background:var(--background)}
body{margin:0;min-height:100dvh;display:flex;flex-direction:column;font:15px/1.5 "Geist","Geist Variable","Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--background);color:var(--foreground);-webkit-font-smoothing:antialiased}
.top,main,.foot{width:100%;max-width:24rem;margin-inline:auto;padding-inline:1rem}
.top{padding-top:2.5rem}
.mark{font-size:1.9rem;font-weight:700;letter-spacing:-.04em;line-height:1;color:var(--foreground)}
.mark b{color:var(--ring)}
main{flex:1;padding-top:1.5rem;padding-bottom:1.5rem}
p{margin:0}
form{margin:0}
a{color:inherit;text-decoration:underline;text-underline-offset:4px}
a:hover{color:var(--primary)}
a:focus-visible{outline:2px solid var(--ring);outline-offset:2px;border-radius:2px}
.card{display:flex;flex-direction:column;gap:1rem;overflow:hidden;padding-block:1rem;border-radius:.875rem;background:var(--card);color:var(--foreground);font-size:.875rem;line-height:1.25rem;box-shadow:0 0 0 1px color-mix(in oklab,var(--foreground) 10%,transparent)}
.card:has(.card-footer){padding-bottom:0}
.card-header{display:grid;gap:.25rem;padding-inline:1rem}
.card-title{margin:0;font-size:1.25rem;line-height:1.375;font-weight:500}
.card-desc{color:var(--muted-foreground);font-size:.875rem;line-height:1.25rem}
.card-content{display:flex;flex-direction:column;gap:1.25rem;padding-inline:1rem}
.card-footer{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem;padding:1rem;border-top:1px solid var(--border);background:color-mix(in oklab,var(--muted) 50%,transparent);color:var(--muted-foreground)}
.field{display:flex;flex-direction:column;gap:.5rem;width:100%;margin:0}
.field.row{flex-direction:row;align-items:center}
.label{display:flex;align-items:center;gap:.5rem;width:fit-content;font-size:.875rem;line-height:1;font-weight:500;user-select:none}
.row .label{line-height:1.375}
.desc{color:var(--muted-foreground);font-size:.875rem;line-height:1.5;font-weight:400;text-align:left}
.desc a:hover{color:var(--primary)}
.err{color:var(--destructive);font-size:.875rem;font-weight:400}
.input{display:block;width:100%;min-width:0;height:2.25rem;padding:.25rem .625rem;border:1px solid var(--input);border-radius:var(--radius);background:var(--input-bg);color:var(--foreground);font:inherit;font-size:16px;line-height:1.5;box-shadow:var(--shadow-xs);outline:0;transition:color .15s,box-shadow .15s,border-color .15s}
@media (min-width:768px){.input{font-size:.875rem}}
.input::placeholder{color:var(--muted-foreground);opacity:1}
.input:focus-visible{border-color:var(--ring);box-shadow:var(--shadow-xs),0 0 0 3px color-mix(in oklab,var(--ring) 50%,transparent)}
.input[aria-invalid=true],.input:user-invalid{border-color:var(--invalid-border);box-shadow:var(--shadow-xs),0 0 0 3px var(--invalid-ring)}
.input:disabled{pointer-events:none;cursor:not-allowed;opacity:.5;background:var(--input-bg-disabled)}
.suffix{display:flex;align-items:center;gap:.5rem}.suffix span{color:var(--muted-foreground);white-space:nowrap}
.check{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:1rem;height:1rem;margin:0;border:1px solid var(--input);border-radius:4px;background:var(--input-bg);outline:0;transition:color .15s,box-shadow .15s,border-color .15s}
.check:checked{background:var(--primary);border-color:var(--primary)}
.check:checked::after{content:"";position:absolute;left:4.5px;top:1.5px;width:4px;height:8px;border:solid var(--primary-foreground);border-width:0 1.75px 1.75px 0;transform:rotate(45deg)}
.check:focus-visible{border-color:var(--ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--ring) 50%,transparent)}
.check:user-invalid{border-color:var(--invalid-border);box-shadow:0 0 0 3px var(--invalid-ring)}
.btn,button{display:inline-flex;align-items:center;justify-content:center;gap:.375rem;width:100%;height:2.25rem;padding:0 .625rem;border:1px solid transparent;border-radius:var(--radius);background:var(--primary);background-clip:padding-box;color:var(--primary-foreground);font:inherit;font-size:.875rem;line-height:1.25rem;font-weight:500;white-space:nowrap;text-align:center;text-decoration:none;cursor:pointer;user-select:none;outline:0;transition:all .15s}
.btn:hover,button:hover{background:color-mix(in oklab,var(--primary) 90%,transparent);color:var(--primary-foreground)}
.btn:active,button:active{transform:translateY(1px)}
.btn:focus-visible,button:focus-visible{border-color:var(--ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--ring) 50%,transparent)}
button:disabled,.btn[aria-disabled=true]{pointer-events:none;opacity:.5}
.btn.outline,button.outline,button.account{border-color:var(--border);background:var(--card);color:var(--foreground);box-shadow:var(--shadow-xs)}
@media (prefers-color-scheme:dark){.btn.outline,button.outline,button.account{border-color:var(--input);background:var(--input-bg)}}
.btn.outline:hover,button.outline:hover,button.account:hover{background:var(--muted);color:var(--foreground)}
button.link{width:auto;height:auto;padding:0;border:0;border-radius:2px;background:none;color:var(--primary);font-weight:400;box-shadow:none;text-underline-offset:4px;white-space:normal;text-align:left}
button.link:hover{background:none;color:var(--primary);text-decoration:underline}
button.link:focus-visible{box-shadow:0 0 0 3px color-mix(in oklab,var(--ring) 50%,transparent)}
.sep{display:flex;align-items:center;gap:.75rem;color:var(--muted-foreground);font-size:.875rem;line-height:1.25rem}
.sep::before,.sep::after{content:"";flex:1;height:1px;background:var(--border)}
.box{display:flex;flex-direction:column;gap:.5rem;padding:.75rem;border:1px solid var(--border);border-radius:var(--radius);background:color-mix(in oklab,var(--muted) 50%,transparent)}
.box ul{margin:0;padding-left:1.1rem}
.box li+li{margin-top:.25rem}
.stack{display:flex;flex-direction:column;gap:.5rem;margin:0}
.stack.form{gap:1.25rem}
.btn.wrap{white-space:normal;height:auto;min-height:2.25rem;padding-block:.5rem}
.code{margin:0;font:600 1.05rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;overflow-wrap:anywhere;user-select:all}
.foot{padding-bottom:2.5rem;color:var(--muted-foreground);font-size:.8125rem;line-height:1.5}
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

const errorBox = (error?: string) => (error ? `<p class="err" role="alert">${esc(error)}</p>` : "");

/** One shadcn-style card: header, content and an optional footer. */
function card(title: string, description: string, content: string, footer = ""): string {
	return `<div class="card"><div class="card-header"><h1 class="card-title">${esc(title)}</h1>${description ? `<p class="card-desc">${description}</p>` : ""}</div>${content ? `<div class="card-content">${content}</div>` : ""}${footer ? `<div class="card-footer">${footer}</div>` : ""}</div>`;
}

export function homePage(name: string, domain: string): Response {
	return page(
		`Akun ${name}`,
		card(
			`Penyedia akun ${name}`,
			`Server ini menyimpan akun AT Protocol dengan nama di bawah ${esc(domain)}. Akun hanya bisa dibuat dengan kode undangan dari pengurus. Server ini sedang diuji oleh kelompok kecil.`,
			`<a class="btn" href="/akun/baru">Buat akun</a>`,
		),
	);
}

export interface SignupValues {
	minAge?: number;
	code?: string;
	label?: string;
	error?: string;
}

/** The authorize page of a pending sign-in, optionally with one extra query flag. */
export const flowLink = (ctx: OAuthPageContext, flag = "") =>
	`/oauth/authorize?client_id=${encodeURIComponent(ctx.clientId)}&request_uri=${encodeURIComponent(ctx.requestUri)}${flag ? "&" + flag : ""}`;

/** The sign-up form. Inside a sign-in flow it carries the flow, so a new account continues straight to consent. */
export function signupPage(name: string, domain: string, values: SignupValues, status = 200, flow?: OAuthPageContext): Response {
	return page(
		`Buat akun ${name}`,
		card(
			`Buat akun ${name}`,
			`Akun ini adalah identitas AT Protocol yang disimpan oleh ${esc(name)}. ${esc(name)} menyimpan kunci akunmu dan bisa diminta memindahkannya ke penyedia lain.`,
			`${errorBox(values.error)}
<form class="stack form" method="post" action="/akun/baru">${flow ? hidden(flow) : ""}
${
	values.code?.startsWith("ig1.")
		? `<input type="hidden" name="code" value="${esc(values.code)}"><p class="desc">Kode undangan sudah terisi dari tautan undanganmu.</p>`
		: `<div class="field"><label class="label" for="code">Kode undangan</label>
<input class="input" id="code" name="code" type="text" autocomplete="off" required maxlength="100" value="${esc(values.code)}"></div>`
}
<div class="field"><label class="label" for="label">Nama akun</label>
<div class="suffix"><input class="input" id="label" name="label" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="20" pattern="[a-z0-9-]{3,20}" value="${esc(values.label)}"><span>.${esc(domain)}</span></div>
<p class="desc">Huruf kecil, angka dan tanda hubung, 3 sampai 20 karakter.</p></div>
<div class="field"><label class="label" for="password">Kata sandi</label>
<input class="input" id="password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="256">
<p class="desc">Minimal 8 karakter.</p></div>
<div class="field"><label class="label" for="password2">Ulangi kata sandi</label>
<input class="input" id="password2" name="password2" type="password" autocomplete="new-password" required minlength="8" maxlength="256"></div>
<div class="field row"><input class="check" id="age" type="checkbox" name="age" value="${values.minAge ?? 18}" required><label class="label" for="age">Saya berusia ${values.minAge ?? 18} tahun atau lebih.</label></div>
<button type="submit">Buat akun</button>
</form>`,
			flow ? `<p>Sudah punya akun? <a href="${esc(flowLink(flow, "masuk=1"))}">Masuk</a></p>` : "",
		),
		status,
	);
}

/** The one-time recovery code, shown once after sign-up or after a password is reset. */
function recoveryBox(code: string): string {
	return `<div class="box"><p><strong>Kode pemulihan</strong></p><p class="code">${esc(code)}</p>
<p class="desc">Catat kode ini di kertas atau simpan di tempat yang aman. Kode ini hanya ditampilkan sekali. Jika kamu lupa kata sandi, nama akun dan kode ini dipakai untuk membuat kata sandi baru.</p></div>`;
}

export function signupDonePage(name: string, handle: string, signinUrl: string | null, code: string): Response {
	const link = signinUrl ? `<a class="btn wrap" href="${esc(signinUrl)}">Saya sudah menyimpan kode ini, masuk ke ${esc(name)}</a>` : "";
	return page(
		"Akun sudah dibuat",
		card(
			"Akunmu sudah dibuat",
			"",
			`<p>Nama akunmu <strong>${esc(handle)}</strong>.</p>
${recoveryBox(code)}
<p class="desc">Simpan kata sandimu di tempat yang aman. Pengurus tidak bisa melihat kata sandimu.</p>
${link}`,
		),
	);
}

/** After sign-up inside an app's sign-in: the code first, then on to consent. */
export function signupRecoveryPage(handle: string, code: string, continueHref: string, cookie: string): Response {
	const response = page(
		"Akun sudah dibuat",
		card(
			"Akunmu sudah dibuat",
			"",
			`<p>Nama akunmu <strong>${esc(handle)}</strong>.</p>
${recoveryBox(code)}
<a class="btn wrap" href="${esc(continueHref)}">Saya sudah menyimpan kode ini, lanjutkan</a>`,
		),
	);
	response.headers.append("set-cookie", cookie);
	return response;
}

export interface RecoverValues {
	handle?: string;
	error?: string;
}

const newPasswordFields = `<div class="field"><label class="label" for="password">Kata sandi baru</label>
<input class="input" id="password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="256">
<p class="desc">Minimal 8 karakter.</p></div>
<div class="field"><label class="label" for="password2">Ulangi kata sandi baru</label>
<input class="input" id="password2" name="password2" type="password" autocomplete="new-password" required minlength="8" maxlength="256"></div>`;

/** Reset a forgotten password with the account name and the recovery code. */
export function recoverPage(name: string, domain: string, values: RecoverValues, status = 200): Response {
	return page(
		`Pulihkan akun ${name}`,
		card(
			"Pulihkan akun",
			`Tulis nama akun dan kode pemulihan yang kamu simpan saat membuat akun, lalu buat kata sandi baru.`,
			`${errorBox(values.error)}
<form class="stack form" method="post" action="/akun/pulihkan">
<div class="field"><label class="label" for="handle">Nama akun</label>
<input class="input" id="handle" name="handle" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="253" placeholder="nama.${esc(domain)}" value="${esc(values.handle)}"></div>
<div class="field"><label class="label" for="code">Kode pemulihan</label>
<input class="input" id="code" name="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required maxlength="64" placeholder="XXXXX-XXXXX-XXXXX-XXXXX"></div>
${newPasswordFields}
<button type="submit">Simpan kata sandi baru</button>
</form>`,
			`<p>Tidak punya kode pemulihan? Minta tautan pemulihan kepada pengelola ${esc(name)}.</p>`,
		),
		status,
	);
}

/** Reset with a link that the operator made for one account. */
export function resetLinkPage(name: string, handle: string, link: string, error?: string, status = 200): Response {
	return page(
		`Pulihkan akun ${name}`,
		card(
			"Buat kata sandi baru",
			`Untuk akun <strong>${esc(handle)}</strong>. Tautan ini hanya dapat dipakai sekali.`,
			`${errorBox(error)}
<form class="stack form" method="post" action="/akun/pulihkan">
<input type="hidden" name="tautan" value="${esc(link)}">
${newPasswordFields}
<button type="submit">Simpan kata sandi baru</button>
</form>`,
		),
		status,
	);
}

export function recoveredPage(name: string, handle: string, code: string, signinUrl: string | null): Response {
	const link = signinUrl ? `<a class="btn wrap" href="${esc(signinUrl)}">Saya sudah menyimpan kode ini, masuk ke ${esc(name)}</a>` : "";
	return page(
		"Kata sandi baru disimpan",
		card(
			"Kata sandi baru sudah disimpan",
			"",
			`<p>Akun <strong>${esc(handle)}</strong> sekarang memakai kata sandi baru. Semua sesi lama sudah keluar.</p>
${recoveryBox(code)}
<p class="desc">Kode pemulihan yang lama tidak berlaku lagi.</p>
${link}`,
		),
	);
}

export function messagePage(title: string, text: string, status: number): Response {
	return page(title, card(title, esc(text), ""), status);
}

/** Plain descriptions of OAuth scopes, one line each. */
export function describeScope(scope: string): string[] {
	const lines: string[] = [];
	for (const part of scope.split(/\s+/).filter(Boolean)) {
		if (part === "atproto") lines.push("Mengenali akunmu, yaitu nama akun dan DID.");
		else if (part.startsWith("repo:")) lines.push(`Menulis catatan jenis ${part.slice(5).split("?")[0]} di akunmu.`);
		else if (part === "transition:generic") lines.push("Membaca dan menulis semua catatan di akunmu.");
		else if (part === "transition:email") lines.push("Melihat alamat email akunmu.");
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
	const list = accounts ? `<div class="stack">${accounts}</div><div class="sep" role="separator">atau</div>` : "";
	return page(
		`Masuk ke ${ctx.clientName}`,
		card(
			`Masuk ke ${ctx.clientName}`,
			`Pilih akun ${esc(name)} yang ingin kamu pakai.`,
			`${errorBox(error)}
${list}
<form class="stack form" method="post" action="/oauth/select">${hidden(ctx)}
<div class="field"><label class="label" for="handle">Nama akun</label>
<input class="input" id="handle" name="handle" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="253" placeholder="nama.${esc(domain)}"></div>
<button type="submit">Lanjut</button>
</form>`,
			`<p>Belum punya akun? <a href="${esc(flowLink(ctx, "buat=1"))}">Buat akun</a> dengan kode undangan dari pengurus.</p>`,
		),
		status,
	);
}

export function consentPage(ctx: OAuthPageContext, handle: string, error?: string, status = 200): Response {
	const scopes = describeScope(ctx.scope).map((line) => `<li>${esc(line)}</li>`).join("");
	return page(
		`Masuk ke ${ctx.clientName}`,
		card(
			`Masuk ke ${ctx.clientName}`,
			`Masuk sebagai <strong>${esc(handle)}</strong>.`,
			`<div class="box"><p>${esc(ctx.clientName)} meminta izin untuk hal berikut.</p><ul>${scopes}</ul><p class="desc">${esc(ctx.clientId)}</p></div>
${errorBox(error)}
<form class="stack form" method="post" action="/oauth/authorize">${hidden(ctx)}
<input type="hidden" name="action" value="approve">
<div class="field"><label class="label" for="password">Kata sandi</label>
<input class="input" id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"></div>
<button type="submit">Izinkan</button>
</form>
<form method="post" action="/oauth/authorize">${hidden(ctx)}<input type="hidden" name="action" value="deny"><button class="outline" type="submit">Tolak</button></form>`,
			`<form method="post" action="/oauth/select">${hidden(ctx)}<input type="hidden" name="other" value="1"><button class="link" type="submit">Pakai akun lain</button></form><p>Lupa kata sandi? <a href="/akun/pulihkan">Pulihkan akun</a></p>`,
		),
		status,
	);
}
