# Many ETNOS, one shared language: scaling past Tanah Papua

*21 November 2026. A thinking document after the owner asked whether ETNOS should be one appview for all indigenous peoples of the archipelago, Melanesia, Polynesia or the Pacific. Proposal only; nothing here is built.*

## 1. The question

Could someone pick Aotearoa and Papua and see everything nicely? And is "one place for all indigenous peoples" a good product thesis at all, given that Mukurtu, Local Contexts, FirstVoices, Living Dictionaries, Te Hiku's Papa Reo and others already exist?

## 2. Recommendation: many homes and one shared language, not one home

**Do not build one appview for everyone.** Build ETNOS as software that each people or region runs as its own home, with its own name and governance. Then give every ETNOS the same *language*: AT Protocol lexicons and global identifiers. A cross-region view becomes a lens that reads what each home chooses to publish. It never becomes a home that absorbs them.

Why not one appview:

1. **Who governs it?** One operator for every people recreates the problem ETNOS exists to fix: someone else decides about your knowledge. Federation answers governance. Each home is governed by its own people, and the shared parts are only what each one publishes.
2. **Density beats breadth.** Social products live or die on whether your people are there (Nextdoor, local Facebook groups, Instagram communities). A pan-Pacific feed is empty for everyone in year one. A Papua home with 300 active people is alive.
3. **The words are political.** In Indonesia, the state does not use "indigenous peoples" as a legal category. Its word is *masyarakat (hukum) adat*, and AMAN carries the struggle for recognition. A platform that groups Papua with PNG, Vanuatu and the Solomons under "Melanesia" touches regional politics: the Melanesian Spearhead Group and West Papuan representation. That can put users at risk, and the operator too. A federated design lets each home choose its own frame instead of us choosing it for them.
4. **Others already archive.** Mukurtu and Local Contexts handle collections and labels, and FirstVoices and Living Dictionaries handle languages. ETNOS's wedge is the living loop:
   - social talk becomes checked knowledge (the Kamus, the Ensiklopedia);
   - the community holds it (AT Protocol, self-hosting);
   - Aksara helps.

   That loop is portable. Being the place everything lives is not.

## 3. What makes "Papua + Aotearoa" work anyway: shared identifiers

Cross-region views work when entries carry the same global keys, and ETNOS entries already carry most of them:

| Kind | Global key | Example of a cross view |
| --- | --- | --- |
| Living things | GBIF taxon key | *Ipomoea batatas*: *kūmara* in Māori next to its names in Dani and Mee, each from that community's own checked Kamus |
| Languages | Glottolog code | Austronesian Biak and Māori side by side, with Papuan Ekari next to them |
| Concepts | Concepticon ID (the Kamus core list already uses Tadmor-2009-100) | "rain", "taro", "canoe" across fifty community dictionaries: a **living word atlas of the Pacific**, built by speakers and owned by each community |
| Places and landforms | Wikidata QID, GeoNames | Lakes, volcanoes, reefs |
| Peoples and lembaga | Wikidata QID, where they want one | Exchange between organisations (Te Hiku with a Papuan language group) |

**The word atlas is the strongest idea here.** Lexibank and CLDF do comparative word lists for linguists from old sources. A community-checked, living, consented version does not exist. It falls out of Kamus entries linked to Concepticon IDs, at no extra cost.

## 4. Information architecture at scale

The scope switcher already reads "Tanah Papua" and narrows to a region or kampung. Generalise it in three steps:

1. **Scope inside one home**, built today: region, regency, kampung.
2. **A set of homes**, the lens: "Papua + Aotearoa". The kind grid stays the same (Tempat, Bahasa, Makhluk hidup…).
   - An entry with the same global key in both homes opens as one page with one tab per home: "Di Tanah Papua", "In Aotearoa".
   - Each home's text stays in its own voice and language, never merged into one narrative. This is the two-voices rule from the lembaga page, applied between peoples.
3. **A public index across homes:** search, the word atlas, a map. It reads only public records each home publishes, and it shows each home's labels (Local Contexts TK and BC). It holds no accounts and no private data, so anyone, including any home, can run it.

## 5. A path that grows without overreaching

| Stage | What | Partners to talk to |
| --- | --- | --- |
| 1, now | ETNOS for Tanah Papua, alive with real communities (Mee first) | Komunitas Sastra Papua, UNCEN, Balai Bahasa Papua, Kamus Mee |
| 2 | ETNOS installable by another region of the archipelago: `strata.yaml` (P6), a seeding catalogue per region, an operator's guide | AMAN, which links thousands of masyarakat adat communities; BRWA, which maps wilayah adat |
| 3 | Shared lexicons published, a cross-home index, the word atlas | Concepticon and CLDF maintainers; Local Contexts |
| 4 | The Pacific: homes run by Pacific organisations on their own terms | Te Hiku Media (data sovereignty peers), Pacific universities |

Each stage stands on its own. If stage 2 never happens, Papua still has its home.

## 6. Risks to name honestly

- **Politics.**
  - The cross-home lens must never present homes as a political bloc.
  - Each home chooses whether to join the index.
  - The operator of a home in Indonesia stays within Indonesian law (PSE registration, #43), and the interface tells users plainly what is public.
- **Government closeness.** A provincial government partnership can open doors and funding. If government appears to steer a platform for masyarakat adat, though, people's trust in it can break. Partnerships should be written so a lembaga's or government's account is one voice among others, as the two-voices rule already does.
- **Scope creep.** The archipelago and the Pacific are a direction for the deck and for funders. The build stays on Papua until stage 1 is alive.
