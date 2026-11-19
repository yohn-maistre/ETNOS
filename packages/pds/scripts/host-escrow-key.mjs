// Generate the identity host's escrow rotation key on the owner's own machine.
// Writes the private key (hex) to the file named on the command line with mode
// 0600 and refuses to overwrite; prints only the public did:key, which goes into
// the host's ESCROW_ROTATION_KEY variable. Keep the private file offline (password
// manager and paper). Usage: node scripts/host-escrow-key.mjs <path>
import { writeFileSync } from "node:fs";
import { Secp256k1Keypair } from "@atproto/crypto";

const path = process.argv[2];
if (!path) {
	console.error("Usage: node scripts/host-escrow-key.mjs <path-for-private-key>");
	process.exit(2);
}
const key = await Secp256k1Keypair.create({ exportable: true });
const hex = Buffer.from(await key.export()).toString("hex");
writeFileSync(path, hex + "\n", { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ ESCROW_ROTATION_KEY: key.did(), privateKeyWrittenTo: path }));
