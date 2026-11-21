# Collecting a language from nothing: what others learned, and what the Kamus takes from it

21 November 2026. The owner asked how people have built up an endangered language digitally from nothing, and which paradigms ETNOS can adapt for the Kamus interface and its machine pipeline. This shapes package P2 in [../plan/one-page-system-2026-11-21.md](../plan/one-page-system-2026-11-21.md) §10 and §13. Found with a web search on 21 Nov; nothing here is copied into the repository.

## Nine paradigms

| # | Paradigm | Who | What they found | What the Kamus takes |
| --- | --- | --- | --- | --- |
| 1 | **Oral first** | Aikuma and Basic Oral Language Documentation ([Bird et al. 2014](https://aclanthology.org/W14-2201.pdf); field trials in Papua New Guinea, Brazil, Nepal) | Many speakers talk better than they write, and spelling is not settled. A text-free interface let monolingual elders record. "A few dozen motivated people can create a hundred hours of recorded speech in a few weeks"; the bottleneck is meaning, not recording. | Voice is a first-class answer, not a garnish. Every card has *Jawab dengan suara*. Spellings are allowed to differ, and the Kamus groups them as *tulisan lain* instead of picking a winner. |
| 2 | **Respeaking and oral translation** | Aikuma: hold left to hear a phrase, hold right to speak its translation | The best person to tell a story (an elder) is often not the best to translate it (a younger bilingual). Splitting the roles scaled the work. | *Artinya* can be added by someone other than the author: "Tambahkan arti" on another member's post. Young bilinguals translate elders' posts, and each translation is evidence for the Kamus. |
| 3 | **Sparse transcription** | Bird 2020 and later ([Lane, Bettinson, Bird 2021](https://aclanthology.org/2021.dash-1.16.pdf); [Learning through transcription 2022](https://aclanthology.org/2022.computel-1.11.pdf)) | Do not transcribe everything. Grow a lexicon, spot known words in new material, and ask a speaker to confirm each spotting. Keep a personal glossary apart from the curated lexicon. Wrong spottings are useful learning prompts in their own right. | The underlined question in a post is a spotting waiting for confirmation. Two word lists: *Kata saya* (a member's own glossary, private to them) and the *Kamus komunitas* (checked by the community). A wrong guess costs one tap of *Bukan*, and the question format makes that honest. Mode belajar is "learning through transcription". |
| 4 | **Word lists at speed** | [Lingua Libre](https://commons.wikimedia.org/wiki/Commons:Lingua_Libre) (Wikimédia France) | Showing one word at a time and moving on when the speaker falls silent raised recording from about 80 to 1,200 words an hour. In May 2026 it imported Swadesh 110 and 207 lists for 2,342 languages from PanLex. It takes `?uselang=id`. | A *Rekam daftar* mode. A speaker reads a list (the core concept list, or the community's open words) and the recorder moves on by itself after each silence. Twenty minutes gives a few hundred pronunciations. |
| 5 | **A campaign between groups** | Te Hiku Media, Kōrero Māori ([MIT Technology Review 2022](https://www.technologyreview.com/2022/04/22/1050394/artificial-intelligence-for-the-people/)) | 2,500 people read 200,000 phrases (310 hours) in ten days. Kapa haka and waka ama teams competed for a NZ$5,000 prize. Trust came first: elders were asked before anyone was recorded, and the data sits under the Kaitiakitanga licence (guardianship, benefits return to the people, no use for surveillance). | *Lomba kata*: a time-boxed campaign between groups (sekolah, gereja, sanggar, asrama mahasiswa), counted per group, never per person. It fits Festival Tunas Bahasa Ibu. The Kamus gets its own plain terms, *Syarat kamus komunitas*: the community holds it, and no outside model trains on it without the community's decision. |
| 6 | **A community dictionary product** | [Living Dictionaries](https://livingdictionaries.app/faq) (Living Tongues Institute) | It has senses, part of speech, semantic domains, dialects, example sentences, named speakers with audio, and texts split into sentences with read-along audio. Managers and contributors have different powers. It prints the dictionary as a PDF, imports and exports anything, and offers an API with per-dictionary keys for agents. Their FAQ warns that unlisted is not private. | Our entry shape matches theirs and CLDF, so data moves both ways. ***Cetak kamus***: a printable PDF for schools and kampung with poor signal, which may matter more than any app feature in the highlands. Our interface also says plainly what is private and what is only unlisted. |
| 7 | **Labels from the community** | [Local Contexts](https://localcontexts.org/labels/about-the-labels/) TK and BC Labels | Communities mark material with provenance, protocol and permission labels (for example community use only, seasonal, secret or sacred). Platforms must show the label next to the content. | A Kamus entry or a Penampil item can carry a community label. It starts as our own sensitivity field (#26 *Jangan disebarkan*), mapped to TK labels, with Hub API integration later. Some words belong to rites and seasons; the Kamus must be able to hold them without publishing them. |
| 8 | **A language from one book** | MTOB ([Tanzer et al., ICLR 2024](https://arxiv.org/abs/2309.16575)): Kalamang, a language of the Karas Islands, Fakfak, in West Papua | A model given a grammar, a word list and about 400 sentence pairs translated roughly, still below a human who learned from the same book. Example sentences helped most, then the word list, then the grammar. With no materials the models invented Indonesian. | Parallel sentences are the most valuable thing a community can give, which is why *Artinya* matters. Aksara can draft glosses from the Kamus plus *Artinya* sentences, but only as questions, never as entries. For private communities it uses only the local model (owner's rule). A Papuan language is already the field's benchmark, which is worth one line in the proposal. |
| 9 | **Speech recognition from a handful of examples** | [Omnilingual ASR](https://github.com/facebookresearch/omnilingual-asr) (Meta FAIR, Nov 2025, open source) | 1,600+ languages, models from 300M to 7B parameters. The zero-shot model transcribes an unseen language from 1 to 10 paired clips of audio and text. It needs about 20 GB of GPU memory and is slower than real time. Whether Ekari is among its trained languages is still to check. | Every *Ucapkan* clip with its spelling is exactly such a pair. Later, on an Aksara Node with a GPU, voice notes in Mee can get draft transcripts, shown as suggestions. Nothing for the showcase. |

## Indonesia and Papua

- **Balai Bahasa Provinsi Papua** runs the national language revitalisation programme (RBD).
  - [It targeted ten Papuan languages in 2024](https://www.kompas.id/artikel/revitalisasi-bahasa-daerah-di-papua-dilakukan-melalui-komunitas-dan-pendidikan-formal), among them Sentani, Biak, Moi, Kamoro, Hatam and Baliem, and [Tehit, Kimaghima, Mairasi and Yaur in 2025](https://bbppapua.kemendikdasmen.go.id/storage/ppid/ppid_1760322146_68ec62626b451.pdf).
  - It works through communities and schools, and calls for digital dictionaries and learning apps.
  - It holds Festival Tunas Bahasa Ibu.
  - It runs [a dictionary portal](https://kamusbbpp.kemendikdasmen.go.id/).
  - It proposed 500 Papuan words for KBBI in 2024, Mee among them.
- **Universitas Muhammadiyah Papua** has [a prototype dictionary app](https://www.papuaterbit.id/2024/11/dosen-prodi-ilmu-komputer-um-papua.html) with about 5,000 words in Sentani, Moi, Tarfia and Tamer.
- **Sekolah Adat Papua** (Origenes Monim) teaches Sentani in 141 schools in Kabupaten Jayapura.
- **[Kamus Mee](https://kamus.mee-mana.online/)** is a community-run Mee dictionary (see [mee-text-sources-2026-11-21.md](mee-text-sources-2026-11-21.md)).

What this means:
- **The gap is the loop, not the word lists.** The state, campuses and individuals each make dictionaries, but none of them turns daily talk into checked words. ETNOS should present itself as that loop, and as a partner to Balai Bahasa and the schools, not a rival.
- **The Kamus can give back.** It can export what Balai Bahasa's inventory and vocabulary workshops (LKBD) need.

## What changes in the Kamus design (P2)

Additions to §10 of the one page system doc:

1. **Voice everywhere.**
   - Every card offers *Jawab dengan suara* next to typing.
   - The swipe deck plays the word when a clip exists.
   - *Rekam daftar* records a list quickly.
   - Clips need voice storage (#69). Until it exists, the buttons are hidden, never shown broken.
2. **Two lists.**
   - *Kata saya* is a member's own glossary: what they tapped, saved or guessed. It is private to them and never needs a check.
   - The *Kamus komunitas* holds checked entries.
   - An entry moves from one to the other through Periksa and the community's quorum (`claim_settings`, **built**).
3. **Entries shaped like Living Dictionaries and CLDF:**
   - the headword;
   - spellings (*tulisan lain*);
   - senses, each with a gloss, a definition, a word class and a domain;
   - examples linked to the posts they came from;
   - clips with a named speaker and their consent;
   - dialect;
   - source and licence per row;
   - status (*usulan*, *diperiksa*);
   - an optional community label.
4. **The pipeline, no learning first.** Every step produces a question for a person, never a published fact:
   1. Tokenise. Skip proper names and numbers.
   2. Match exact words, known spellings, then suffix-stripped forms. Each match becomes a question.
   3. Count frequent unknown words and ask about them.
   4. Align *Artinya* pairs by co-occurrence to get a candidate meaning and word class.
   5. Ask *Kata hari ini* from the core concept list.
   6. Ask picture questions from Penampil species, so the answer becomes a local name on the species entry.
5. **Models later, and only where the owner's rule allows:**
   - an MTOB-style gloss draft from the Kamus and *Artinya* sentences, by the local model only for private communities;
   - Omnilingual ASR drafts for voice notes on an Aksara Node.

   Both produce questions only.
6. **Ways to draw people in, all optional for a community:**
   - the notice card and the swipe deck;
   - *Lomba kata* between groups;
   - *Cetak kamus* as a PDF;
   - export as CSV or CLDF;
   - *Syarat kamus komunitas*.
7. **Honest privacy wording.** A Kamus in a public community is public. A Kamus in a private community is visible to members and technically to the operator, and the interface says so.

## Open checks

- Is Ekari (`ekar1243`, ISO `ekg`) among Omnilingual ASR's trained languages? The language CSV is in the repository's docs.
- Does PanLex hold Ekari entries? Its API did not answer from this container on 21 Nov.
- What licence does the Balai Bahasa dictionary portal use, and would Balai Bahasa Papua partner?
