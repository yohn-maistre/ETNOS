# Outside review of the platform (17 November)

A one-time review the owner asked for: an advisor model was given the plan-of-record documents, the code and the live site, and asked to criticise the whole platform (model, knowledge organisation, places, social architecture, agents, flows, data, sequencing, ethics). It did not change anything. Its report follows unedited after the notes below.

## Checked before recording

- **One storage object for everything**: confirmed. `src/worker.ts:90` routes every request to one Durable Object (`ETNOS_NODE`); private and public rows are separated by query.
- **No sensitivity or protocol field**: confirmed. `src/schema.ts` has none.
- **Every room needs approval to post**: confirmed on the live site: Beranda, Tanya & bantu, Budaya & bahasa, Kabar komunitas and Pemberitahuan are `approval`, Koordinasi daerah `invite`.
- **Shell pages titled "ETNOS"**: partly wrong. The server rewrites titles and adds page text for wiki pages; it was doubling the suffix ("· ETNOS · ETNOS"), fixed the same day.

## Where we agree, and where we do not yet

Taken as written: open admission on the public rooms; Dasar and Koreksi on Aksara posts before more agents; a sensitivity flag in the schema before more seed goes live; a `place_claims` table for whole / part / contested instead of soft fields first; kampung as a search gazetteer that becomes a label on first use; one short "ETNOS on 4 December" page that README, Tentang and the deck copy from; WhatsApp as the distribution layer.

For the owner to decide, because the review argues against earlier decisions: one Aksara with a region line instead of an account per region; catalogue-only for sacred material of peoples with no steward from that people (surface-first stays for Mee material under the owner's standing); collapsing the taxonomies into one working scheme with crosswalks; the cut list for the showcase; dropping market slots from the pitch.

---

# ETNOS: advisor review

17 November 2026. Based on the plan-of-record docs, a read of `src/` and `apps/web/src/`, the seed, and the public endpoints of etnos.space today.

## Verdict

The strong part is real and rare: sentence-level provenance (verified sentences, Dasar, receipts), an honest agent gate, a founder with standing, and a refusal to fake people. The biggest risk is not technical. It is that the plan is growing much faster than the place. The docs run to about 179,000 words for an engine of about 8,500 lines; the agent model was replaced four times in one day (desks, team, by place, switch, all still in `plan/direction-2026-11-16.md`); and there are three different "orders of work" (`direction`, `knowledge-map-design` §10, `etnos-model` §7), none sized to 17 days. Meanwhile the live site has 16 posts by two authors (the founder and Aksara), six communities that all require approval to post in, two of them with placeholder descriptions ("Geng", "Hen tecahi yo onomi tmar ni hanased"), and 367 labels with nothing attached to any of them. ETNOS is at present a knowledge-organisation project presented as a social app. With 30% of the rubric on consistency, the gap between documents and site is the thing most likely to cost you, and the absence of a second human is the thing most likely to kill the pilot.

## Ten recommendations, ranked

**1. Get ten real people in before building anything else on the map.**
- Why: `etnos-model` §2 says a deployment is "full of content and empty of fake people". Judges and visitors will read that as empty. `/v1/feed` shows one human author.
- First step: the founder recruits 10 Mee speakers by name this week into one room, and one of them corrects one Aksara sentence so that the Koreksi → variant loop is shown with a real person.
- Stop: treating seeded content as the cold-start answer. Content gets a first visit; only people get a second.

**2. Fix sign-in. It is the widest break in every flow.**
- Why: `direction` "Accounts and private data" requires an existing AT account (bsky.social and others), and the code has only `atproto` or locally provisioned credentials (`src/api.ts:105`). Almost nobody in Paniai has a Bluesky account. Then `/v1/communities` shows every room, Beranda included, on `admission: approval`, so a new member still cannot post.
- First step: open admission on Beranda and Tanya & bantu (already in your own "fix before judges look" list), and one account path that needs no prior AT account: an invitation link from a steward that provisions the account.
- Stop: assuming AT identity is a user benefit at pilot. It is an architecture benefit. Hide it.

**3. Make WhatsApp the distribution layer, by design.**
- Why: in all the plan-of-record docs WhatsApp appears only as a share-card size. For this population it is where conversation already is, and ETNOS will not move it.
- Division of labour: WhatsApp carries talk; ETNOS is the link people paste into the group, the page that stays, and the thing that gets printed.
- First step: every page and post readable without sign-in, light on a weak connection, with a correct preview card; the weekly bulletin as one image and one PDF to forward; one ETNOS WhatsApp Channel; a "Kirim lewat WA" number where a steward enters, with consent, what elders send as voice notes.
- Stop: measuring success by posts on ETNOS. Measure links opened from WhatsApp and corrections received.

**4. Keep agents in the slow layers. One Aksara, not seven.**
- Why: `direction` "Aksara by place" names the risk itself ("seven agents talking in an empty room reads as a bot site") and then recommends seven accounts. Your own metaphor is groundwater; groundwater is not seen at the surface.
- Rule: Aksara writes wiki pages, Kabar lines and the weekly summary. In Percakapan it posts one pagi post a day for the whole site and answers when mentioned. The region is a line on the post, not an account.
- Also stop Aksara offering its own reading of a story. The live Koyeidaba post has one ("Itu bacaan Aksara saja"). Readings are for signed people (`direction`, Cerita).
- First step: ship Dasar and Koreksi on agent posts (missing per `open-work` item 3). That is the legibility that matters.

**5. Split the ethics stance by standing, not by publication status.**
- Why: "surface first" (`sources-and-sensitive-material`, owner decision) is defensible for Mee material, because the founder has standing to decide. It does not transfer to Saireri, La Pago or Ha Anim. A Mee-founded platform surfacing another people's published sacred material before anyone from that people is present is the outside decision the doc says it wants to avoid. The same file still contains the earlier, stricter table and its "Why this line" paragraph, so it argues both positions.
- Rule: for a people with no steward from that people, sacred and restricted published material is catalogue-only (the doc's original second row). Surface-first applies where a steward with standing has said so, and the page names who.
- Missing in code: I found no sensitivity, protocol or "Jangan disebarkan" field in `src/schema.ts`. The safeguard the stance depends on is not built. Build the flag before publishing more seed.
- This must be a per-deployment policy, not an engine default. In Aotearoa, surface-first would end the conversation.

**6. Write a threat model for conflict material and for the people who use the site.**
- Why: place agents posting current conflict events unheld (`direction`, "Three risk levels", revised) puts an automated account on the most dangerous topic in Papua, under Indonesian law, operated by one named person. The docs cover attribution; they do not cover who is exposed.
- First step: one page answering: what is logged about readers and members, who can be compelled to hand it over, what a takedown request gets, whether members can be pseudonymous, and who the legal operator is. Conflict material stays on wiki pages with attribution; Aksara does not post it into the feed.
- Stop: private language spaces and declared languages until this is written. A list of who speaks what, in one database, is sensitive data.

**7. Model place claims as a table now; skip soft fields.**
- Why: `etnos-model` §4.2 needs whole/part/contested with sources and dates. The schema has `context_parents(context_id, parent_id, issuer_id, created)` and `contexts.kind IN ('place','region','topic','language')`. There is nowhere to put a claim. "Continuum, not tree" (§4.1a) is at the moment only a drawing idea.
- First step: a `place_claims` table (place, region, state, source, claimant, date) and Nabire's page with its "Beda versi" section and two chips. On the map, plain reference outlines with hatching.
- Kampung: do not seed every kampung as a label. `src/groups.ts:364` caps at 1,000 rows and the free plan counts rows read. Seed down to distrik; ship kampung as a search-only gazetteer; a kampung becomes a label the first time someone attaches something. "Usulkan tempat" is then the same action.
- Stop: soft density fields. They look like a claim about territory that no source makes, which is worse than a labelled reference outline.

**8. Collapse the knowledge organisation to what is stored.**
- Why: four axes (`direction`, Labels) plus six coordinates (`knowledge-map-design` §1) plus four parallel taxonomies is three systems. Voice and basis are properties of a source, not of an item. Time belongs to pages and claims, and `record_times` only accepts wiki records. Classifying every item four times with a small model, with receipts, will not happen on a free tier and nobody will check it.
- Rule: one working topic scheme (the fourteen ranah). UU 5/2017 objects and Western disciplines are crosswalk tables from that scheme, not separate classifications. The lens switch still works and costs nothing. See the table below.
- Keep the UU 5/2017 crosswalk visible: it is what a dinas kebudayaan and the judges recognise.

**9. Decide the data boundary before the pilot.**
- Why: the brief says Durable Objects per community. The code has one: `env.STRATA.getByName(env.ETNOS_NODE)` (`src/worker.ts:90`), one SQLite database holding public posts, private communities and DM envelopes. Public/private separation is by row and by query. `knowledge-map-design` §9 ("private items live in their community's own index") describes a system that does not exist.
- This is fine for a pilot of public material. It is the one thing that is expensive to change once private spaces hold real speech.
- First step: either move private communities to their own object before any language space opens, or say plainly in Tentang that private spaces are not offered yet. Do the second for December.

**10. Freeze the plan and make one page the truth.**
- Why: `docs/README.md` says start with `direction`; the foundation is now `etnos-model`; `direction` contains "Desks", "Aksara as a team" and "Aksara by place" in sequence, each revising the last, plus "a person reviews before it is published" beside "review sources, not posts" beside "wiki pages go live before review". A judge who reads two sections will find a contradiction.
- First step: one two-page document, "What ETNOS is on 4 December", from which README, Tentang and the deck are copied. Everything else moves to `docs/history/`.
- Stop: writing research documents until the showcase.

## The model, simplified

The six layers are a good story and a good place-page view. They are not six primitives. Tempat is an axis and the scope, not a layer of content. Ingatan and Pengetahuan are the same record type (a page) with a different kind. People, time and protocol are missing and matter more than the sixth layer.

| Thing | What it is in data | Shown as |
| --- | --- | --- |
| Post, news story, work item, page | Four record types, each with a pace | The "layers" on a place or community page |
| Source and verified sentence | What a page or agent post rests on; carries voice, date recorded, protocol | Dasar |
| Place, people/language, topic | Three label facets on any record | Scope, chips, filters |
| Kind | A field on the record (cerita, kabar, tanya) | A filter |
| Time | A range on pages and claims ("when it is about") | Timeline |
| Claim | A sourced, dated statement, with a state (whole, part, contested) | Beda versi; place chips |
| Person | Account, plus roles granted by a community (teller, steward) | Signed readings, review marks |
| Protocol | A community's rule on an item or source; only that community sets it | Notice on the item, travels with shares |
| Community, organisation | Membership and authority | Rooms; verified pages |
| Aksara | An actor with a switch, bound to sources | A labelled author, mostly in pages |

Six map coordinates become: three facets, one kind, one time range, and two things read from the source. Other taxonomies are crosswalks.

## Flows that break

- **First-time visitor** from a WhatsApp link: the two pages I fetched (`/`, `/wiki`) return a shell titled "ETNOS". The preview and the first screen on a slow connection decide whether they stay.
- **First sign-in**: needs an AT account; then every room needs approval; the approver is the founder.
- **Kid finding a new district**: no distrik in the catalogue, list capped at 1,000, "Usulkan tempat" not built, and a proposal waits for a steward who does not exist for that region.
- **Teacher**: needs something printable and reviewed. The bulletin is not built, and "live before review" pages written by a small model are not something a teacher can hand out. Give a "ditinjau" filter and a print layout.
- **Researcher**: needs a stable citation. Live pages change; cite by revision, and get the dataset DOI (an owner action still open).
- **Church or school claiming itself**: no form or mark. Do the first five by hand; do not build the flow yet.
- **Operator in Kalimantan or Aotearoa**: packs are described (`etnos-model` §4.5) but do not exist as files, and setup is not built. Do not claim it; show the Papua catalogue file as the first pack.

## For the showcase

**Cut or defer:** soft-field regions; live cursors and agents on the map; seven place agents; the item index with classifier and receipts; embeddings and live placement; the taxonomy switcher; year pages; all biocultural features; open calls; organisation claim flow; kampung seeding; onboarding cards; Aksara Node, Spaces and one-click deploy as anything but a roadmap slide; further engravings; Bacaan terpandu; language spaces beyond naming the Mee pilot as planned.

**Must have:**
1. One place done to full depth: Nabire and Mee Pago. Place page with the contested chips and "Beda versi", two or three cerita with Dasar, the layers view.
2. Real people: ten members, real replies, one correction that became a variant.
3. Open rooms, placeholder text gone, labels attached to the seed pages so the 367 labels are not all empty.
4. Dasar and Koreksi on Aksara posts.
5. A share card and a readable page for every link, and the printed weekly bulletin on the table at the booth.
6. The Mee Pago state-of-knowledge report, even if assembled partly by hand. It is the business model made visible: the thing a dinas, a church or a grant-maker would pay a hosted deployment for. Pasar slots (`product-shape`, Market) are not a credible revenue line at this scale; drop them from the pitch.
7. README, Tentang and deck saying the same thing.

The one thing that most convinces: a Mee elder's correction to a published account, visible on the page with her name and the source it corrected, and the same page printed on A4. That is cultural roots, feasibility and the product in one image.

## Questions only the founder can answer

1. Who, by name, are the first ten people, and who is the second steward? If the founder is ill for a month in January, who approves anything?
2. For which peoples do you have standing to decide what is surfaced, and who will you ask for the others before their material goes live, not after?
3. Koyeidaba is described as sacred in its source and is already posted. Is the kepala suku conversation going to happen before the showcase, and what will you do if the answer is "take it down"?
4. What happens when the first legal or security request arrives about a member or a conflict page? Who is the legal operator?
5. Is the January pilot one room of Mee speakers, or Tanah Papua? The plan is written for the second; the resources fit the first.
6. Who pays after the free tier, and for what? Which one institution would sign a hosting agreement in 2027?
7. Do people in your own family's WhatsApp groups want a new place to talk, or a place where what they already say is kept? The answer decides whether ETNOS is a social app or an archive with a front door, and the roadmap is very different for each.

---

# Second round (17 November, night)

The reviewer read `plan/showcase-plan-2026-11-17.md`, its build order, the accounts research and `src/oauth.ts`, after the owner's answers. Condensed here; what the plan adopted is marked in the plan itself.

**Problems left, ranked.**

1. The build order did not deliver the walk first: Cerita with variants, the language room and share cards sat behind measurement, kampung, seven agents and labelling. Make "walk complete" the 21 November milestone.
2. Private rooms lead, and everything still sits in one Durable Object. Put each private room in its own object before real speech goes in, or at least a negative test for every leak path (search, map, export, MCP, cache, model calls, media URLs). Say in the room that the operator can technically read it.
3. Tanya warga beside election data, with about 30 respondents, can be brigaded, can expose respondents, and can read as a political instrument to culture judges. For the showcase: a person opens each survey, the culture lead approves topics, topics are services and culture, a minimum of 20 answers, answers not linkable to accounts; the Data tab ships population, schools, health and languages; elections and budgets after the showcase. Keep the Musrenbang summary.
4. Automatic labels: models attach place (regency at most) and topic only, never a people or language label on a member's post. Tell members public posts go to a free model tier that may use them. The threat-model page is still owed.
5. Seeding all seven: name who answers "Jangan disebarkan" and how fast; put the owner's reasoning on Tentang in his words; mark unreviewed pages "ditulis dari sumber terbitan; belum ditinjau orang dari wilayah ini".
6. Kampung search as a static file searched in the browser (zero rows read); pay $5 for Workers Paid now and still measure what Free would carry.
7. No big refactors in the week people arrive: renames once through one strings file on day one; freeze navigation on 21 November; Studio and the page merge after the proposal.
8. Consistency: this is the fifth document that "wins"; the README still points to direction. Write the one paragraph last and claim only what is live on upload day.

**Accounts.** The official PDS on a small server is right and is the whole answer this year: invite codes in a sign-up link on etnos.space, crawling off, PDS data and PLC rotation keys backed up off the machine from day one. With publishing off, the client asks only for `atproto`, so a serverless host needs handle resolution, OAuth server metadata, PAR, authorise, token with DPoP and refresh rotation, JWKS, revocation, account creation with invites and password reset; no repo, sync, firehose or blobs (check whether ETNOS reads a profile or session after sign-in). Caveats: that is an identity host, not a PDS (accounts cannot use the Bluesky app; calling it "a PDS" is a consistency risk); Spaces needs a real PDS; did:plc genesis and key custody are irreversible. Advice: no serverless build before the proposal; a roadmap slide, and a throwaway demo after 26 November if there is time.

**Build order.** One writer owns schema migrations (they are a positional list). Lead: sign-in, private boundary, agent write path, schema. Helpers: batch and leaf work. Walk complete by Saturday 21 November; breadth and the proposal 22–25; the rest 26 November to 2 December; freeze 2 December, rehearse the 3rd.

**Language rooms.** Language as its own axis is right. Fixes: several rooms per language named by their people ("Mee · Tigi", "Mee · perantau Jogja") so no room is the official one; a request to open shows publicly for a few days first; a room with one keeper stops admitting; member lists visible to members only; voice clips behind authenticated URLs, deletable by their maker, exported to keepers if a room closes; varieties without a Glottolog code allowed. On stage, use a demo room with consenting members, since showing a private room contradicts its rule.

**Seven Aksara.** One name and mark; region as the place line; one profile with seven voices. In the all-Papua feed, seven morning posts collapse into one card ("Aksara menulis di 7 wilayah hari ini"); in a region's scope only that voice. Never two Aksara items in a row, at most one in five. No agent-to-agent replies at the showcase. Every post ends with a question and the Sumber line; unanswered posts fold after two days. No first-person cultural voice; "Aksara adalah program, bukan orang". A new deployment starts with one Aksara; a voice turns on when its scope has seeded pages and a named human steward.

**Framing.** Use the judges' own law: Cerita is tradisi lisan and Ruang bahasa is bahasa, two of the ten objects of UU 5/2017. First sentence about Papuans recording, discussing and using their own culture every day; then the proof (a named person's correction kept beside the published account); then sources shown and an assistant that helps; then an open engine other regions can deploy, with the state-of-knowledge report as input to a regency's PPKD. Surveys and government data out of the headline. Close on the printed correction.

**Questions for the owner.** (1) Which three named people besides the owner moderate and answer "Jangan disebarkan" from 21 November, and within how many hours? (2) Pay about $10 a month now (Workers Paid and a small server)? (3) Are the culture lead and the activist partner comfortable with surveys on public issues under ETNOS's name before the showcase, and who approves topics? (4) Do the creators invite their followers before or after the showcase? (5) Accept saying in every private room that the operator can technically read it until Spaces, and who besides the owner holds identity keys and backups?

## What I make of the second round

I agree with almost all of it. Points I would weigh differently:

- **The serverless identity host.** The owner asked for it explicitly. I agree with the reviewer that it must not be what real people's identities depend on before the proposal, and that it should be called an identity host until it holds repos. I would still start it after the walk is complete (from about 22 November) with throwaway identities, so the showcase can show ETNOS deploying without a server, rather than leave it as a slide.
- **Labels on posts.** Labelling a post with a people is not labelling a person, but on a member's post about their family it effectively tags them, so I accept the narrower rule.
- **Politics.** The owner wanted politics in. The reviewer's version keeps the feature and moves elections and budgets after the showcase; that is the owner's call (question 3).
