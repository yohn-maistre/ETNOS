# Community dictionary (*Kamus komunitas*): a dictionary and grammar built from published sources and from how people talk

19 November 2026, morning. Design research; no code changed. *Renamed 19 November from "Bahasa Tumbuh" under the naming rule (`../naming.md`). Where a language belongs to a people, the dictionary lives in that people's space: see `../platform-2026-11-19.md` §4.* This is the **northstar** the owner asked for after the multiplex session: cleaner and more ambitious than a set of features. It absorbs "Perbandingan kosakata" from `epistemic-multiplex-2026-11-19.md` §17 and becomes the first build after the multi-identity PDS. Marks: *(proposal)*, *(not measured)*, *(to verify)*, *(rencana)*. Nothing here is built. Sources are at the end.

## 1. The northstar

**Every language community on Strata gets a dictionary and a grammar that grow from how its people already talk.** The dictionary is seeded from everything that has been published, it is owned and governed by the community, and it powers the community's own small models.

People do not have to do lexicography. They chat, post and send voice notes in their language rooms, as they would anyway. The system:
- notices words it has not seen;
- proposes what they mean and how they are built, using the published record and open models;
- gathers evidence from how different speakers use each word;
- asks a person only when a single tap would settle something.

The dictionary, a grammar sketch and an annotated corpus accumulate as a side effect of conversation. In the owner's words: *"people shouldn't have to do work, they just talk, and a dictionary gets filled."*

## 2. What the owner asked

From 19 November, lightly edited:

- The flagships so far read like UI features; we need a whole purpose.
- People should not have to do work. They just talk, and a dictionary gets filled.
- We may need a pathway to train a generalisable starting point (something like an NER model), or use strong small local LLMs to identify words, tags and parts of speech. How well do they do on low-resource languages like ours?
- Each language community should have its own living dictionary, growing from the seeded public dataset, and not only a dictionary but grammar rules too.
- Should it be a private community? Today a language is a kind of topic.
- Seed from TransNewGuinea.org (CC BY 4.0), and contact its maintainers about collaboration. Look at what Living Dictionaries does.
- Use OpenUI for composed cards (decision, section 12).
- The multi-identity PDS is the priority, so people can log in and post.

## 3. Why this is the right northstar

**The record is thin, old and outside the community.**
- TransNewGuinea.org, the largest open database of New Guinea wordlists, holds **41 words of Ekari, all from Voorhoeve (1975)**. Its home page reported 1,364 languages and 176,149 lexical items on 19 November.
- The largest Ekari dictionary is Steltenpool's *Ekagi-Dutch-English-Indonesian Dictionary* (1969). It holds about 4,000 roots and verb derivatives, uses the Tigi dialect as standard, and marks Paniai, Kamu and Mapija variants. It is **open access on OAPEN under CC BY-NC 3.0**.
- Doble's *Kapauku-Malayan-Dutch-English Dictionary* (1960, about 2,000 roots) and Drabbe's grammar (1952) remain under publisher copyright.
- Nothing in this record was written by the community, and none of it is in today's spelling or today's speech.

**Open technology has just reached this point, but not quite Ekari.**
- Meta's Omnilingual ASR covers Papuan Malay and two Dani languages (Western Dani, Mid Grand Valley Dani). **Ekari is not in its supported list** as read on 19 November. Its zero-shot model can still take a handful of paired examples at inference time.
- GlotLID (1,900+ languages) does not list Ekari either, as far as we saw.
- On Indonesian regional languages, LoraxBench found **no clear lead for region-specific models over general multilingual ones**, and a visible drop from Indonesian to low-resource languages.

**Daily use is thin where diversity is richest.** Badan Bahasa counts about 428 languages in Tanah Papua. Reported BPS data puts Provinsi Papua second-lowest nationally for daily regional-language use (framing doc §4.2; *to verify against the BPS table*).

**The research says this is now feasible, with people in the loop:**
- **Learning a Papuan language from a book.** MTOB (ICLR 2024) asked models to translate Kalamang, a language of the Karas Islands in West Papua, using only a grammar book, a wordlist of 2,531 words and about 400 example sentences. The best model reached 44.7 and 45.8 chrF, against 51.6 and 57.0 for a human using the same materials. Grammar helped most when given in long context rather than retrieved in snippets.
- **Glossing by in-context learning.** Ginn et al. (2024) found that LLMs prompted with well-chosen examples beat a standard trained transformer on interlinear glossing with no training at all. Even an 8B open model that runs on a laptop was competitive, though trained state-of-the-art systems still did better.
- **Segmentation and glossing together.** PolyGloss (2026) jointly predicts morpheme boundaries and glosses, beats open LLMs on both, and adapts to a new language with LoRA.
- **A dictionary the model reads from.** CWoMP (EMNLP 2026) glosses by retrieving from a **mutable lexicon**: people add entries and results improve without retraining, and it cannot invent morphemes. GlossAssist logs every accept, reject and edit and feeds accepted entries straight back into that lexicon.
- **Hybrid pipelines.** A small neural tagger plus LLM post-correction cut annotation work for a low-resource Turkic language. Retrieval-chosen examples beat random ones, and gains grow roughly with the logarithm of the number of examples.
- **Grammar drafting.** LLMs drafted coherent grammar rules for Moklen from bilingual dictionaries and parallel sentences, with a risk of English grammatical bias.
- **Speech from a spoken dictionary.** About 40 minutes of short word recordings gave usable ASR (under 50% word error) for Manx, replicated for Cornish.

None of these systems turns a community's everyday conversation into a living, community-owned dictionary and grammar, seeded from the published record and governed by protocol. That combination is the contribution.

## 4. How it works *(proposal)*

```
 Seed ──► Listen ──► Analyse ──► Gather evidence ──► Ask little ──► Publish ──► Learn
 (published  (room talk,  (match, segment,  (speakers, contexts,  (one-tap     (room chooses)  (room-owned
  record)     voice notes)  gloss, tag)       dialects, sources)    cards)                       small models)
```

1. **Seed** the public language page from the published record (section 7). Each entry is a *jejak* witness with its source, page and licence.
2. **Listen** to a language room, only if the room has turned on *Izin pengolahan mesin* (section 6). Text posts are tokenised. Voice notes are transcribed where a model can (Whisper for Indonesian and Papuan Malay, Omnilingual for Dani and others), and otherwise wait for "bantu tulis" by members.
3. **Analyse.**
   - Known words are matched to the lexicon across spelling and dialect variants. Steltenpool's older spelling writes *j* where today's writes *y*.
   - Unknown words become candidates. A model proposes a segmentation, a gloss and a part of speech, prompted with retrieved examples from the room and the seed, plus the grammar sketch in long context (the MTOB and in-context glossing approaches).
   - Once there are enough confirmed examples, a joint segment-and-gloss model (PolyGloss with LoRA) takes over from prompting, reading from a mutable lexicon (CWoMP) so new entries help at once.
4. **Gather evidence instead of asking for work.** A candidate's confidence grows from signals that cost people nothing:
   - more independent speakers use the word;
   - it appears in consistent contexts;
   - it matches a seeded entry;
   - its form fits known morphology;
   - it is used by speakers from one dialect area. The speaker's chosen place is used only as an aggregate; never inferred about a person.
5. **Ask little.** When one tap would settle something, the room's *Soal hari ini* (Jadwal Aksara) asks a few members: *"Apakah 'X' artinya Y?"*, or *"Rekam kata ini?"*. There is a small daily cap per room. Answers are evidence, not chores.
6. **Publish.** Entries live in the room. Its stewards choose what goes to the public language page, where it shows as *tuturan* with attribution, beside the published record. Several rooms (dialects, diaspora) can publish variants of the same word side by side, with their provenance.
7. **Learn.** The room's accepted entries, its glossed sentences and its voice clips form a corpus the room owns. With its *training permission*, that corpus can tune a small model the room also owns (section 8).

**The grammar grows the same way.**
- Frequent affixes and their contexts form a morpheme inventory.
- A model drafts **grammar notes** ("Akhiran *-tega*: tampaknya lampau, orang pertama; 12 contoh di ruang ini; bandingkan Steltenpool 1969"), each with examples as witnesses.
- Members confirm or correct, and the sketch grows section by section.
- Grambank and WALS features for the language give the skeleton and a cross-check.
- Drafts are marked *tafsir* until a person accepts them, and the English-bias caveat from the Moklen study is shown beside them.

## 5. Where it lives: public page, rooms, published entries

The owner asked whether a dictionary should be a private community, given that a language is currently a kind of topic. **Three layers** *(proposal)*:

| Layer | What it is | Who sees it | In the model |
| --- | --- | --- | --- |
| **Language page** | The language as an entity (class *Bahasa dan Kata*), with its seeded dictionary from published sources and the entries rooms have published | Everyone | Entity with *jejak* and published *tuturan* assertions |
| **Room dictionary** | Each language room's own living dictionary, grammar sketch and corpus, growing from its talk | Room members (rooms can be listed-private or hidden-private) | Assertions with voice *tuturan*, protocol of the room |
| **Published entry** | A room's chosen entries, shown on the language page with attribution and voice | Everyone | Assertion copied as an approved public derivative; the custodial original stays in the room (AGENTS.md rule) |

So the language stays a public entity (today's context kind *language*), and the living dictionary belongs to rooms. This keeps the showcase plan's decision that no room is "the official one" (§7), lets dialect and diaspora rooms grow their own, and lets the public page show a word's variants with their sources.

## 6. The privacy question this raises

The showcase plan §7 says that what is said privately never enters search, export, the map, the cache **or any model**. A dictionary that grows from private talk needs a model to read that talk. Proposed resolution *(owner decision)*:

- **A room permission, *Izin pengolahan mesin*, off by default.** Turned on by the room's stewards, it lets machines read the room's posts and voice notes **only to build that room's dictionary**. It is separate from training permission and from publishing.
- **Where the model runs.**
  - For public rooms: Workers AI, as Aksara does now.
  - For private rooms: a local model on a machine the community trusts (the Aksara Node path) by default. Workers AI only if the stewards choose it, after we have confirmed the provider's data-retention terms *(to verify)*.
- **Outputs stay in the room**, and withdrawal of a post removes the evidence it contributed.
- §7's rule stays true for everything else: search, export, the map, the cache and Aksara's public work never see private rooms.

## 7. Seeding *(proposal)*

| Source | Covers | Licence | How we use it |
| --- | --- | --- | --- |
| **TransNewGuinea.org** (Lexibank CLDF release) | Wordlists for New Guinea languages, with cognate sets | CC BY 4.0 | Import for every catalogue language with a Glottocode match; words become *jejak* entries with source and page. The data is on GitHub and Zenodo, so the import can run in our workspace |
| **Steltenpool 1969** (OAPEN) | About 4,000 Ekari roots and derivatives, with Dutch, English and Indonesian glosses and dialect marks | CC BY-NC 3.0 | Parse the open PDF into entries (model-assisted, with spot checks). Entries carry the NC licence, so they are shown and used only non-commercially, and are excluded from any commercial product or paid export |
| **Doble 1960; Drabbe 1952; Doble 1987** | Dictionary and grammars | Publisher copyright | Cite and link; no bulk import. Short attributed quotes only (UU 28/2014, Art. 41(b) principle, framing doc §8) |
| Glottolog, Grambank, WALS, PHOIBLE | Language identity, grammar features, sound inventory | CC BY | Grammar-sketch skeleton; orthography and ASR hints |
| Concepticon, CLICS | Standard concepts; colexification networks | CC BY | Link senses to concepts; compare how languages group meanings |

Ekari would start with **41 + about 4,000** published entries before anyone speaks. Every one is marked as published, with its year, so the gap between record and speech is visible from day one.

## 8. Models and sovereignty

**What we would test first** *(benchmark, section 9)*:
- Prompted LLMs: Gemma 4 26B (already Aksara's model on Workers AI), a small Gemma 4 or Qwen 3 that runs on a laptop, SEA-LION v4 and Sahabat-AI. Each is tested with and without the seed and grammar context.
- Glossing models: PolyGloss with LoRA; a CWoMP-style retrieval glosser over the room's lexicon.
- Speech: Omnilingual's 300M CTC model on a CPU for Papuan Malay and Dani; its zero-shot model with the room's own confirmed clips for Ekari.

**What the room owns:**
- its lexicon;
- its glossed corpus;
- its voice clips;
- the in-context exemplar set;
- any adapter (LoRA) tuned on them.

All of it is small, exportable (CLDF, LIFT for FieldWorks, Wikidata Lexemes, a Living Dictionaries import), revocable and governed by the room's protocol. This is the owner's "sovereign model for internal use" made concrete: *small sovereign heads on big open bodies* (multiplex §17.1), applied to language.

**The flywheel:**
1. Talk produces entries.
2. Entries recorded by voice become a spoken dictionary.
3. A spoken dictionary is enough to bootstrap ASR (the Manx result).
4. ASR transcribes more voice notes.
5. More voice notes produce more entries.

## 9. Research

**A small benchmark from the published record** *(proposal)*. Built from openly licensed seed only:
- gloss a word;
- tag its part of speech;
- segment a verb form;
- translate a short example.

Each task is scored with and without the grammar sketch, MTOB-style. The test set is withheld and kept out of public crawls to avoid contamination, as MTOB did. It is published only if the community agrees.

**Research questions:**
1. How well do small open models identify, gloss and segment words in a Papuan language from its published record alone, and how fast do they improve as a community's room grows?
2. How far has everyday speech moved from the 1969 record (new words, lost words, spelling, loans from Indonesian)?
3. Can a dictionary and grammar sketch reach useful coverage **without asking speakers to do lexicography**, measured as entries per tap?
4. How do dialect and diaspora rooms differ in vocabulary, and what does that say about the language's vitality?

Each of these is publishable, with Papuan co-authors by their choice.

## 10. What else this makes possible

- **Learn mode.** Spaced-repetition cards from the room's own words and voices, for young people and diaspora members recovering a language they hear but do not speak.
- **Spelling and keyboard.** A shared orthography helper (Steltenpool's *j* and today's *y*, tone marks only where meaning changes), decided by the room, not by us.
- **Place names.** Toponyms from rooms link to the map, and landscape words feed Istilah lahan dan citra satelit (multiplex §17.2). Words for land and the land itself meet.
- **Cognates.** TransNewGuinea.org's cognate sets show how Ekari relates to Moni, Wolani and the other Paniai Lakes languages, as a page people can explore.
- **Translation, later.** With a grammar sketch and enough glossed sentences, MTOB-style translation between Ekari and Indonesian becomes testable. It is not promised.
- **Jadwal Aksara.** *Kata* cards play published, voiced words. *Soal hari ini* asks the one-tap questions. *Hari ini di wiki* counts new words by room.
- **Excluded by policy:** kinship terms stay out of the public layer (repository rule), and nothing is inferred about any person.

## 11. Collaboration *(proposal)*

- **TransNewGuinea.org's maintainers** (University of Auckland). Ask for input on the import, and offer, with speakers' consent, attributed corrections and new words back to the database and to Lexibank. The owner will reach out after the proposal.
- **Living Dictionaries** (Living Tongues Institute). It has 846+ community dictionaries, audio from named speakers, public or unlisted dictionaries (not private by default), and an API with per-dictionary read and write keys that agents can use. We do not rebuild it. Strata's dictionary is fed by conversation and governed by room protocol, which Living Dictionaries is not designed for. A room that wants a public Living Dictionary can sync its published entries there through that API.
- **AT Protocol.** Once proven, the lexeme and voice-post records can be offered as community lexicons (multiplex §10.3).

## 12. Composed cards: OpenUI *(decided 19 November)*

The owner's decision: use **OpenUI** rather than our own spec, to minimise fragile custom code.

- **What it is:** OpenUI (Thesys, MIT licence, about 15,000 GitHub stars).
  - The model writes **OpenUI Lang**, a compact streaming format, using only components we register with zod schemas.
  - The library generates the system prompt from those components.
  - The parser and renderer do not depend on any hosted service.
- **Svelte:** `@openuidev/svelte-lang` (MIT, Svelte 5, zod 3.25 or 4) gives `defineComponent`, `createLibrary`, prompt generation and a streaming `Renderer`. It supports OpenUI Lang 0.5. Version 1.0 features need the React renderer for now.
- **How Strata uses it:**
  - The catalogue's primitives become OpenUI components.
  - Aksara writes OpenUI Lang, and the server validates it with `@openuidev/lang-core`'s parser before storing it as a versioned view.
  - The browser renders it with `Renderer`.
  - Data still comes from our own viewer-checked resolvers, so components receive query parameters, never private data. This keeps the composed-views safety rules.
  - No OpenUI Cloud or gateway.

## 13. Build plan *(estimates of the agent's working time; not measured)*

After Run 2 (multi-identity PDS), which the owner set as the priority:

| Step | What | Time |
| --- | --- | --- |
| 1 | Import TransNewGuinea.org (CLDF) for catalogue languages; language page dictionary block | 1 day |
| 2 | Parse Steltenpool 1969 into entries with licence tags; spot-check 100 entries with a speaker | 1–2 days |
| 3 | Room dictionary tables (lexeme, form, sense, example, audio, morpheme, grammar note) with protocol, withdrawal and access tests | 1.5 days |
| 4 | *Izin pengolahan mesin* permission; extraction job over room posts and voice-note transcripts; evidence scoring | 1.5–2 days |
| 5 | One-tap questions through Jadwal Aksara's *Soal hari ini*; publish-to-page flow | 1 day |
| 6 | Grammar notes (affix inventory, drafted notes with examples) | 1 day |
| 7 | Benchmark harness on the seed; first comparison of 3–4 models | 1 day |

About 8–10 days. Steps 1–3 are proposal-visible if started straight after the PDS. Steps 4–7 make the showcase demo (18–19 December):
1. a Mee room chats in mixed Indonesian and Ekari;
2. its dictionary panel shows "kata baru minggu ini" with evidence;
3. one tap confirms a word;
4. a grammar note appears with its examples;
5. the public Ekari page shows 41 words, then about 4,000, then the room's voiced additions.

## 14. How it fits the rest

- **Knowledge model:** lexemes and senses are *Bahasa dan Kata* entities. Seed entries are *jejak*, room entries *tuturan*, drafted glosses and grammar notes *tafsir*. The multiplex can now show, per language, published voices against living speech.
- **Five lenses:** vitality gets real data (words still used, by how many speakers, in which rooms). Demand shows which words people look up. Gaps are concepts with no recorded word.
- **Rationale threads:** this is the strongest single carrier of threads 1 (written about us), 2 (sovereignty), 5 (living knowledge) and 8 (portable). Every catalogued language can grow the same way.
- **Laws:**
  - UU 24/2009 (regional governments protect regional languages);
  - UU 2/2021 (Otsus Papua), Article 58 (the province fosters Papuan languages);
  - UU 5/2017 (language is one of the ten OPK);
  - Permendikdasmen 22/2026 (local content in schools).

## 15. Open questions for the owner

1. *Izin pengolahan mesin*: may a private room's talk be read by a model at all, and if so, local only, or Workers AI after checking its retention terms?
2. Steltenpool's CC BY-NC entries: acceptable on a platform that also has a business model, if they are kept out of anything paid?
3. Which room goes first? A Mee room with the owner and two or three speakers, or a Papuan Malay room where ASR already works?
4. Should published words carry the speaker's name, a handle, or only the room's name by default? *(Recommended: the speaker chooses.)*
5. Name: settled as *Kamus komunitas* under the naming rule (`../naming.md`).

## 16. Sources

Read 19 November 2026.

- TransNewGuinea.org: <https://transnewguinea.org/>; Ekari: <https://transnewguinea.org/language/ekari>; Greenhill (2015), *PLOS ONE*: <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0141563>; CLDF release v3.2 (CC BY 4.0): <https://zenodo.org/records/14162587>; Lexibank contribution: <https://lexibank.clld.org/contributions/transnewguineaorg>
- Steltenpool (1969) on OAPEN (CC BY-NC 3.0): <https://library.oapen.org/handle/20.500.12657/32178>; PDF foreword: <https://library.oapen.org/bitstream/handle/20.500.12657/32178/613432.pdf>
- Doble (1960), Springer: <https://link.springer.com/book/10.1007/978-94-015-3396-6>; WALS sources for Ekari: <https://wals.info/languoid/lect/wals_code_eka>; Grambank Ekari: <https://grambank.clld.org/languages/ekar1243>; OLAC resources for Ekari: <http://olac.ldc.upenn.edu/language/ekg>; New Guinea World, Ekagi: <https://newguineaworld.linguistik.uzh.ch/families/trans-new-guinea/west-papuan-highlands/paniai-lakes/central-paniai-lakes/ekagi>
- MTOB: Tanzer et al. (ICLR 2024): <https://proceedings.iclr.cc/paper_files/paper/2024/file/52d63f9e4b81f866bf69fb3c834aad47-Paper-Conference.pdf>; follow-up (2025): <https://arxiv.org/abs/2508.06665>
- In-context glossing: Ginn, Hulden and Palmer (2024): <https://par.nsf.gov/servlets/purl/10651189>; GlossLM (2024): <https://aclanthology.org/2024.emnlp-main.683/>; PolyGloss (2026): <https://arxiv.org/abs/2601.10925>; CWoMP (2026): <https://aclanthology.org/2026.emnlp-main.675.pdf>; GlossAssist (2026): <https://arxiv.org/html/2606.04367>; hybrid neural–LLM glossing (2026): <https://aclanthology.org/2026.fieldmatters-1.3/>; SIGMORPHON 2023 shared task: <https://github.com/sigmorphon/2023glossingST>
- Grammar drafting with LLMs (Moklen, COLING 2025): <https://aclanthology.org/2025.coling-main.681/>; morphological segmentation for Bribri (2025): <https://aclanthology.org/2025.americasnlp-1.7/>; computational methods for documentation (Annual Review, 2026): <https://www.annualreviews.org/content/journals/10.1146/annurev-linguistics-031522-101514>
- Spoken dictionary to ASR (Manx, Cornish): <https://arxiv.org/abs/2510.04832>
- Omnilingual ASR language list: <https://github.com/facebookresearch/omnilingual-asr/blob/main/src/omnilingual_asr/models/wav2vec2_llama/lang_ids.py>; list with names: <https://github.com/soniqo/speech-swift/blob/main/docs/models/omnilingual-asr.md>; GlotLID: <https://github.com/cisnlp/GlotLID>
- LoraxBench (EMNLP 2025): <https://aclanthology.org/2025.emnlp-main.881.pdf>; SEA-HELM leaderboard: <http://leaderboard.sea-lion.ai/>; Komodo: <https://arxiv.org/html/2403.09362v2>
- Living Dictionaries: <https://livingdictionaries.app/>, about and API: <https://livingdictionaries.app/about>, FAQ: <https://livingdictionaries.app/faq>, code: <https://github.com/livingtongues/living-dictionaries>
- OpenUI: <https://github.com/thesysdev/openui/>, <https://www.openui.com/>, `@openuidev/svelte-lang`: <https://www.npmjs.com/package/@openuidev/svelte-lang>, OpenUI Lang overview: <https://github.com/thesysdev/openui/blob/main/docs/content/docs/openui-lang/overview.mdx>
- In this repository: `epistemic-multiplex-2026-11-19.md` (§9, §10, §17), `aksara-living-program-2026-11-18.md`, `aksara-composed-views-2026-11-18.md`, `../showcase-plan-2026-11-17.md` (§7, §25), `../framing-and-impact-2026-11-17.md`.


## Build status, 20 November

Built as Kamus komunitas v1 (`src/kamus.ts`, `src/kamus-data.ts`, `apps/web/src/KamusTab.svelte`, tests in `test/kamus.test.ts`).

- Stewards turn machine reading on (off by default) and choose the language. Only human stewards can.
- "Muat kata dari sumber" loads the seed (Ekari: TransNewGuinea.org CC BY 4.0, Steltenpool 1969 CC BY-NC 3.0) with source, page and licence on each entry.
- "Cari kata baru" counts words in visible posts by people, never agents. Indonesian, Papuan Malay and English are skipped, with words shared with the seed decided per sentence. A new word needs two uses. Evidence is recounted each time, and a hidden or deleted post stops showing at once.
- "Minta Aksara mengusulkan arti" sends up to five candidates with example sentences to the node's model and turns the answers into Periksa cards written by the community's Aksara (20 a day). Members answer; the entry follows the card. Every gate is checked before any text leaves for the model: steward, machine reading on, public community, Aksara active.
- Private communities: no hosted model reads them (owner decision, 20 November). Seed and counting still work there.
- Not built yet: a member writing a meaning by hand from the Kamus page (Periksa propose exists in the API), audio, per-dialect entries, export.
