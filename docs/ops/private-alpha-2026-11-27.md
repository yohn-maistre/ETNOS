# Private alpha on etnos.space (27 November 2026)

The owner chose a private alpha of 10 to 20 invited people, with a wider opening after the move to a new Cloudflare account ([fresh-cloudflare-migration.md](fresh-cloudflare-migration.md)). This page records what was built for it, the decisions behind it, and every setting that the owner must create. Newer sections are added below as the work lands.

## 1. Invite gate

`ETNOS_ENROLLMENT_MODE` (still read as `STRATA_ENROLLMENT_MODE` in `wrangler.web.jsonc`) is now `invite`. Everything public stays readable without an account.

**One link, both ways in.** The operator makes an invitation link in Studio, tab *Undangan* (`/studio/undangan`). A link looks like `https://etnos.space/gabung?kode=…`, lasts 1 to 30 days and can be used by 1 to 20 people. The node keeps only the SHA-256 of the code, and the page drops the code from the address bar after reading it. The page `/gabung` offers two ways in:

- **A new account on the ETNOS identity host.** The node checks its own invitation, then sends the person to the host's sign-up page with a *signed grant* in place of the host's own invite code (`packages/pds/src/host/link-grant.ts`). The grant names the invitation and its use count. The host turns each use into an ordinary invite row (`grant:<id>:<n>`), so a link for n people makes at most n host accounts, and each row is used once, exactly like a code from `POST /admin/invites`. Grants expire after one hour or when the invitation expires, whichever is first.
- **An existing Bluesky account** (or a new one made at bsky.social). This is the node's existing enrollment path: the invitation is checked at the start and consumed in the same transaction that enrols the person at the callback.

Neither path is weaker than before. The node still consumes its invitation once per enrolled person, and the host still uses each invite row once. A person who abandons the host flow after the account was made has used a host slot but not a node use; that account still enrols on its first sign-in, because accounts on the node's own host already passed the host's invitation (the rule from 20 November). The worst case for a link for n people is therefore n host accounts plus n Bluesky enrolments, never more. A revoked invitation stops new grants at once; a grant already issued keeps working on the host for at most one hour.

**Requests.** Where a visitor would sign up without a code, the page shows *Minta undangan* with a name, a free-text contact and a short reason. Requests are stored in `invite_requests`, which no public route, search, notification, count or export reads. Each network address may send three requests an hour, and the queue holds at most 300 pending requests. In Studio, *Setujui* makes a one-person link valid for 14 days for the operator to copy and send; *Tolak* deletes the request. Approved requests leave the queue after 30 days. No email is sent.

**What the owner must create.** For the host path to use the same link, one shared secret must exist on both Workers, with the same value (32 random bytes, base64url):

| Worker | Secret name |
| --- | --- |
| `strata-preview` (web) | `ETNOS_IDENTITY_HOST_LINK_KEY` |
| `etnos-identity-host` | `NODE_LINK_KEY` |

Make the value with `node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))'` and set it with `npx wrangler secret put … --config <config>`. Without the secret the invite gate still works: `/gabung` then offers the Bluesky way only, and the host's sign-up form needs a code from `POST /admin/invites` as before.

Tests: `test/invite-gate.test.ts` (outsiders refused on every path, use counts, expiry, revocation, the grant, and requests absent from public paths) and `packages/pds/test/host-links.test.mjs` (grant slots, forged, expired and reset grants, and a host without the key).
