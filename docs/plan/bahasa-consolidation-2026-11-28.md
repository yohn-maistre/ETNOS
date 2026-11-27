# One Bahasa index and one page per language (28 November 2026)

The owner asked on 27 November 2026 for the language page to become the home of that language's Kamus, and for the language surfaces that overlap to be merged into one map-first index and one page per language, with old addresses still working. This note records the audit, what was merged, and what was left as it was.

## The audit

Before this change a reader could reach words of a Tanah Papua language from six places, and each showed a different part of them.

| Surface | Address | What it showed |
| --- | --- | --- |
| Bahasa kind page | `/wiki/jenis/bahasa` | Every catalogue language as a row, with family circles and status pills, and a small atlas card that linked to Peta Kata. |
| Kamus kind page | `/wiki/jenis/kamus` | One row per community Kamus, including communities whose Kamus had no word yet. |
| Language entry | `/wiki/bahasa-ekari` and the like | The article and facts, a *Kata dasar* section from the published wordlists, and one section per community Kamus. |
| Community Kamus tab | `/communities/<id>?tab=kamus` | The community's own Kamus. It did not say which language it was for. |
| Peta Kata | `/peta-kata`, `/wiki/peta-kata` | The map of basic words across languages, the comparison table and Ruang makna. |
| Front page tile | `/wiki` | A Kamus count and a few recent words that linked to the community. |

So the published wordlist, the community Kamus and the Steltenpool seed for Ekari sat in three different places, and the Kamus list counted empty dictionaries.

## What changed

**One page per language, with a Kamus tab.** A language entry (`/wiki/<slug>`) gets a fifth tab, *Kamus*, between *Tentang* and *Percakapan*. It is the only kind with five tabs: DESIGN.md allows four, and the owner asked for the Kamus to live on the language page, so the tab was added for languages alone. The tab is `apps/web/src/LanguageKamus.svelte` and the address is `/wiki/<slug>?tab=kamus`. It shows, in this order:

1. A count line and one search box over every part below.
2. *Dari kamus komunitas*: entries from the Kamus of every public community whose language is this one, each with the community's name and its review state. Entries that a community imported from the shipped seed (source `seed:…`) are left out here, because the seed itself is shown below, so a word does not show twice. Private communities never appear: the entry index checks visibility when it is read.
3. *Kata dasar dari daftar terbitan*: the basic words from the published wordlists (12 concepts first, then *Tampilkan semua*, so the tab stays short on a phone; a search shows every match), marked *belum diperiksa penutur*, with Papuan Voices forms in italics under the CC BY-NC 4.0 label, and a link to the language in Peta Kata.
4. For Ekari, the Steltenpool 1969 seed, 12 entries first and then 50 at a time, searched and paged on the server (`GET /v1/peta-kata/bahasa/<code>/sumber`), with its CC BY-NC licence label.
5. *Kamus komunitas dalam bahasa ini*: links to each community's own Kamus tab.
6. The Local Contexts Notices of the datasets shown (see [decisions/local-contexts-2026-11-28.md](../decisions/local-contexts-2026-11-28.md)).

The *Tentang* tab no longer carries the *Kata dasar* section and the per-community Kamus sections. It has one short *Kamus* block with a count and a *Buka kamus* button that opens the tab.

**One Bahasa index, map first.** `/wiki/jenis/bahasa` is now `apps/web/src/BahasaIndex.svelte`. It opens with Peta Kata's own map (`PetaKataMap.svelte`), with every catalogue language at its Glottolog point: a filled point in its family colour where the language has words and a faint ring where it has none. A tap opens a card with *Halaman bahasa*, *Kamus* and *Di Peta Kata*. Under the map come three lens cards (Peta Kata, Ruang makna, Kamus), the family circles, the filters (*Ada kata* and the status pills) and every language as a row. The filters live in the address.

**The Kamus list becomes a language list.** `/wiki/jenis/kamus` shows the same index with only the languages that have words, and its address becomes `/wiki/jenis/bahasa?ada=kamus` without a reload. Each row links to the language page's Kamus tab. A community whose Kamus has no word is not listed as a dictionary anywhere: the entry index drops a Kamus with no entries, and `kamusLanguages` (the languages with published wordlists or a community Kamus with words) gives the count.

**The other surfaces point to the language page.**

- The community Kamus tab starts with a line that names its language and links to `/wiki/<slug>?tab=kamus`.
- In Peta Kata, the language card links *Kamus <name>* to the language page's Kamus tab.
- On the front page, the Kamus tile counts languages with words, a word links to its language's Kamus tab, and the foot link reads *Buka kamus semua bahasa*.

## Old addresses

| Address | Now |
| --- | --- |
| `/wiki/jenis/kamus` | The Bahasa index with `?ada=kamus`; the address is rewritten in place. Any other query (such as `?status=`) is kept. |
| `/wiki/<slug>` | Unchanged; opens on *Tentang*. |
| `/wiki/<slug>?tab=kamus` | New. On a kind other than a language the tab is not offered and the page opens on *Tentang*. |
| `/peta-kata`, `/wiki/peta-kata` | Unchanged. Peta Kata stays its own page, because the comparison table and Ruang makna need the full width. The index links to it. |
| `/communities/<id>?tab=kamus` | Now opens the Kamus tab. Before this change the `?tab=` part was ignored and the page opened on *Diskusi*, although the front page already linked this way. The community stays the place where its members write and review. |

## Counts that differ

The Bahasa index counted 258 language entries while Peta Kata counted 256 languages. The two extra entries were *Bahasa-bahasa Yapen* and *Rumpun bahasa Dani*, which the knowledge seed files with the class *bahasa* although they are groups of languages, with no Glottocode and no point on the map. Since 28 November the entry catalogue (`src/entri.ts`) files a *bahasa* thing whose name starts with *Rumpun bahasa*, *Bahasa-bahasa* or *Kelompok bahasa* as a *Kelompok bahasa*: its page stays at the same address, but the index counts it under `kelompok-bahasa`, it is left out of the families, and the Bahasa index links it in a line under the list. Both counts are now 256. No stored row changed, because the class *bahasa* is still right for these things.

## Not done

- Peta Kata and the Bahasa index still load the language list separately (`/v1/peta-kata/concepts` and `/v1/entri/index`). Both are edge-cached, so this costs little; merging them can wait.
- Only Ekari has a written seed (Steltenpool). Other languages show only the published wordlists and community entries.
