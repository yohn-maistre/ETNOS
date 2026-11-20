# Kamus seed data

Seed data for the community dictionary (Kamus komunitas). Data only; no app code reads it yet. Built on 20 November 2026.

## Files

| File | What it holds |
| --- | --- |
| `ekari.json` | Published Ekari (Mee language, Glottocode `ekar1243`, ISO 639-3 `ekg`) entries from two sources. 2,905 entries. |
| `id-words.json` | Indonesian word forms (2,794) and Papuan Malay function words (30), so a word finder can tell Indonesian words from local-language words. |

## Sources and licences

| Source | Licence | Entries |
| --- | --- | --- |
| TransNewGuinea.org, Lexibank CLDF release (`lexibank/transnewguineaorg`, `cldf/`). Greenhill, S. J. (2015), PLoS ONE 10.10: e0141563. | CC BY 4.0 | 117 |
| Steltenpool, J. (1969), *Ekagi-Dutch-English-Indonesian Dictionary*, KITLV Verhandelingen 56. | CC BY-NC 3.0 | 2,788 (2,563 distinct headwords) |

**Steltenpool entries are non-commercial. Keep them out of anything paid** (paid tiers, paid exports, commercial products). Every Steltenpool entry has `"source": "steltenpool1969"`, so filtering them out is one line. Credit the author and the source wherever they are shown.

TNG entries: 41 come from Voorhoeve (1975, *Languages of Irian Jaya Checklist*) for the variety `ekari`, and 76 from Larson and Larson (1972, *Irian* 1) for the Paniai Lake dialect. TNG tells which in `tng_source` and `tng_variety`. The original reference is also spelled out under `sources.tng.originalSources`. `lemma` is the TNG `Form` exactly as given; where TNG's `Value` differs it is kept in `value_as_given`. `concept` is the Concepticon gloss; `gloss_en` is the TNG concept name.

## Steltenpool: how reliable

The PDF is a scanned book with OCR text in two columns. The parser (deterministic, no model) takes a headword entry when a line starts flush left in its column and looks like `headword [= variant (X)] [(X)]:`. Glosses are the Dutch, English and Indonesian parts split on ` - `. Glosses are copied as the OCR gave them; nothing was corrected, so OCR slips (`wOOaamaje`, `pat jul`, `meege· komen`) remain.

- `confidence: "high"` means the structure parsed cleanly: a plain headword and exactly three non-empty glosses, with no stray `:` or ` = ` inside and no dangling end. 1,870 entries. It does not promise the OCR is perfect; it can still hold a typo or, rarely, a few words of a neighbouring line.
- `confidence: "low"` means something did not fit: not three glosses, a cross-reference only (`zie/see/lihat`), an OCR-suspect headword, a sense cut off at a column break, or an empty entry. 918 entries. Where the text could not be split it is kept whole in `gloss_raw`.
- Not imported: indented sub-entries, phrases and examples under a headword. The book says about 4,000 roots and derivatives; this is 2,563 headwords, so the rest are missing or sit inside sub-entries.
- Numbered senses become separate entries with `sense: 1, 2, ...`.
- `page` is the printed page number of the book. The PDF has 8 front-matter pages, so printed page 5 is PDF page 13.
- `dialect` and `variants[].dialect` are the book's marks: P Panijai, K Kamu, M Mapija. The standard form is Tigi.
- `modern` is the headword with `j` written `y`, added only when the headword parsed cleanly. The printed headword stays in `lemma`. The OCR's middle dot in `aamai·i` is written as a hyphen.
- `pos` is set only where the Dutch gloss itself names a grammatical class (for example `achtervoegsel` becomes `suffix`).

## How it was built

The sources are not committed (the PDF is 27 MB). To rebuild:

```sh
# 1. TNG (CC BY 4.0): forms.csv, parameters.csv, languages.csv, sources.bib from the cldf/ folder
mkdir -p /tmp/kamus-src/tng && cd /tmp/kamus-src/tng
for f in forms parameters languages; do curl -sSLO https://raw.githubusercontent.com/lexibank/transnewguineaorg/master/cldf/$f.csv; done
curl -sSLO https://raw.githubusercontent.com/lexibank/transnewguineaorg/master/cldf/sources.bib

# 2. Steltenpool 1969 (CC BY-NC 3.0). Same book, Library of Congress open-access copy
#    (library.oapen.org/handle/20.500.12657/32178 refused us with HTTP 429 on build day)
mkdir -p /tmp/kamus-src/pdf && cd /tmp/kamus-src/pdf
curl -sSL -o steltenpool.pdf https://tile.loc.gov/storage-services/master/gdc/gdcebookspublic/20/19/66/75/00/2019667500/2019667500.pdf

# 3. From the repo root (needs poppler's pdftotext)
python3 -I scripts/kamus/parse-steltenpool.py /tmp/kamus-src/pdf/steltenpool.pdf /tmp/kamus-src/raw.json
python3 -I scripts/kamus/build-ekari.py /tmp/kamus-src/tng /tmp/kamus-src/raw.json seed/kamus/ekari.json
node scripts/kamus/build-id-words.mjs      # reads seed/kamus/ekari.json, so run it after the line above
```

## id-words.json

Built only from text already in this repo: `seed/wiki/**/*.json` (not the receipts and verify files), `src/catalogues/*.json`, visible strings in `apps/web/src/**/*.svelte`, and `docs/voice.md`; 274 files, listed in `from`. Text is split into letters (internal hyphens and apostrophes kept), lowercased, and a word is kept if seen at least twice. Left out: strings with digits; single letters; strings that read as English (more English than Indonesian function words); a short English function-word list; and anything that is also an Ekari lemma, modern spelling or variant (37 words, for example `ada`). `papuanMalay` is a hand-written list of Papuan Malay function words, kept apart from `indonesian`.

Not a clean dictionary: it comes from the repo's own texts, so it still holds some English technical terms (`canvas`, `footer`), Dutch place-name forms and Papuan place and people names that appear twice. Treat it as a hint for a word finder, not as a vocabulary.

## id-frequency.json

The 20,000 most frequent Indonesian word forms from FrequencyWords (`id_50k.txt`, built from OpenSubtitles 2018; code MIT, word lists CC BY-SA 4.0, https://github.com/hermitdave/FrequencyWords). Built by `node scripts/kamus/build-id-frequency.mjs /path/to/id_50k.txt`, keeping lowercase letter-only forms. Added on 20 November because `id-words.json` alone missed everyday words: on a test room, `pakai`, `mau`, `buka` and `tadi` were counted as Ekari.

Words that are also Ekari headwords (about 170, such as `ama`, `abu`, `ada`) stay in this list. The finder in `src/kamus.ts` decides them per sentence: such a word counts as Ekari only inside a sentence where at least half the words are not Indonesian, Papuan Malay or English. Elsewhere it is skipped.

## Import rules

`Kamus.importSeed` skips entries with no gloss and headwords that are not plain letters (OCR leftovers such as `.idaiga`). From the 2,905 Ekari entries, 2,750 load. Glosses from Steltenpool 1969 keep the pre-1972 spelling (`sedjenis`, `daunnja`) and OCR slips; the Kamus page says so.
