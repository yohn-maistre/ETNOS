// Makes a VAPID key pair for web push (src/web-push.ts) and prints the two Worker secret commands.
// The private key is printed once to this terminal only; put it straight into the Worker secret and never commit it.
//   node scripts/vapid-keys.mjs
import { webcrypto as crypto } from "node:crypto";

const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKey = Buffer.from(await crypto.subtle.exportKey("raw", pair.publicKey)).toString("base64url");
const privateKey = (await crypto.subtle.exportKey("jwk", pair.privateKey)).d;
console.log("ETNOS_VAPID_PUBLIC_KEY  " + publicKey);
console.log("ETNOS_VAPID_PRIVATE_KEY " + privateKey);
console.log("\nnpx wrangler secret put ETNOS_VAPID_PUBLIC_KEY --config wrangler.web.jsonc");
console.log("npx wrangler secret put ETNOS_VAPID_PRIVATE_KEY --config wrangler.web.jsonc");
