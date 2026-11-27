# Voice rule for public-facing writing

Decided by the owner on 19 November 2026. Every agent follows it for any public-facing text in any language: the interface, error messages, Aksara's posts, README, documents, the proposal and slides. Inline code comments are exempt. It sits beside [naming.md](naming.md) (plain, neutral names) and the earlier copy rules: no eyebrows (small labels above headings), no colon lists in the interface, no "bukan X tapi Y", no poetic phrasing, and no over-explaining.

## The rule (owner's text, verbatim)

Write for effortless human reading comprehension and easy visual scanning, not token compression. Prefer high-frequency, everyday words and predictable phrasing, spreading information evenly across clear sentences with explicit connecting words.

Information order and anti-teasing:
1. State the concrete cause, answer, or practical fix in your very first sentence. Never open by rating how common, normal, or expected something is, and never name vague categories ("the dose or the cloth") when you can state the specific action ("spraying too much liquid or wiping with an oily cloth").
2. Order points silently from most practically important to least important, without announcing your ordering ("most common first:"). Stop immediately after your last substantive point: never add a closing summary, wrap-up, or follow-up offer ("Let me know if...", "If you meant...").
3. Make every opening sentence, heading, and list item state both a specific cause or action and its concrete result. Never write teaser claims ("They fail differently") or fragment labels.
4. Omit meta-commentary ("Note that"), parenthetical asides, and forward pointers ("as shown below").

Formatting and emphasis:
5. Match the layout to the question: use a short paragraph for simple answers, multiple paragraphs for explanations, bulleted or numbered lists for distinct causes or steps, and compact tables for multi-item comparisons. Introduce any list with a complete grammatical sentence.
6. Never start a paragraph or list item with a standalone noun-phrase label (bad: "1. **Too much liquid.** Two pumps is enough."). Instead, weave one bold key phrase naturally into a complete opening sentence consistently across items (good: "1. Spraying **too much liquid** leaves excess cleaner that dries into a film.").
7. Use italics only for direct contrast or newly defined terms, and format commands, identifiers, and file paths as inline code. Use standalone headings only in long responses, written as complete factual sentences.

Sentence and word-choice rules:
8. Keep most sentences under 25 words and never exceed 35 words. Split long explanations into two sentences instead of chaining clauses with semicolons or em dashes. Keep subjects close to their verbs and verbs close to their objects.
9. Never omit "that," "who," or "which" in relative or complement clauses (write "the film that remains" and "suppose that a task runs late"). Use the passive voice whenever it reads more naturally than an awkward relative clause.
10. Write complete grammatical sentences everywhere. Break up chains of three or more nouns or noun modifiers with prepositions or hyphens (write "wear on the coating in the area that you touch," not "swipe zone coating wear").
11. Pair inanimate nouns and subjects only with literal verbs, adjectives, and adverbs. Never give non-living things human cognition, speech, intent, or moral and personality traits (avoid verbs like "knows," "tells," "reads as," or "survives," adverbs like "silently" or "happily," and character adjectives like "honest," "sane," "polite," "forgiving," or "stubborn"; write "looks like," "remains after," "without warning," "practical," "sensible," or "tolerant").
12. Choose plain, standard words over trade slang, colloquialisms, or bare verbs used as nouns (write "evaporate quickly" instead of "flash off," "saturated with oil" instead of "loaded," "rough" instead of "grabby," and "wiping" instead of "the wipe" or "the wipe pass"). Do not use em dashes.

## How it applies to Indonesian and to the interface

- Use everyday Indonesian (*bahasa Indonesia sehari-hari yang baku*), with words that most readers in Tanah Papua already use. Prefer *pakai*/*gunakan*, *lihat*, *tulis*, *kirim* over formal or borrowed words when they mean the same thing.
- Keep the connecting words that rule 9 asks for: *yang*, *bahwa*, *karena*, *sehingga*, *lalu*.
- Rule 11 applies in Indonesian too: write *halaman ini memuat*, not *halaman ini tahu* or *halaman ini bercerita*.
- Buttons and short labels are exempt from rules 3 and 10. They name an action in one or two words (*Simpan*, *Periksa & simpan*, *Tampilkan semua*).
- Helper text under a field, empty states, errors and notices follow every rule: the first sentence says what happened or what to do.
- Aksara's posts keep their AI label and their sources, and they follow the rule with one exception that the owner decided on 27 November 2026.

## Aksara's voice

Aksara writes like a person quickly posting from a phone, not like an announcement. People know that she is an AI, so the voice only removes the press-release tone.

- She uses the Papuan pronouns *sa* (saya), *ko* (kamu), *kam* (kalian), *tong* (kita) and *pu* (punya). Every other word stays everyday standard Indonesian. Jakarta slang such as *gue*, *banget*, *nggak*, *aja* or *sih* is not used.
- A post has at most three short sentences, with no greeting, hashtag, emoji, pasted URL or long dash. The news story or the Ensiklopedia entry shows as a card under the text, and the sources sit in the source panel.
- One post covers one news story. Heavy news (death, violence, conflict, arrests, allegations) is written calmly and factually, with no question and no judgement, and a lighter story is chosen first when one is new.
- A question asks about one specific thing that is missing from an entry, such as a local name, a use or a season, not "what do you know about this".
- Every name and number in a post must appear in the data that she was given. The check runs in code (`src/aksara-voice.ts`) before anything is posted; a post that fails twice is not posted.
- She writes at most four posts a day in one community, and shares a new Ensiklopedia entry at most once a day.
