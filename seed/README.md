# ETNOS seed dataset: Mee Pago, Saireri and La Pago

Version 0.1, 16 November 2026. Published early on purpose: the point is that people can find, use and correct it.

## What is here

| Path | Contents |
| --- | --- |
| `wiki/<region>.json` | Source surveys: for each page, its sources, the licence as stated on each source, and sentences copied from it |
| `wiki/<region>.verify.json` | What the verifier kept and dropped when it re-read every source, and why |
| `wiki/pages/<region>.json` | 39 encyclopedia pages in Indonesian, written only from the verified sentences. Each page lists its citations and the sentences it rests on |
| `sources/<region>.json` | A catalogue of 105 further sources (expedition and mission records, ethnographies, archives, language work, human-rights reports), with where each is held, its access, licence as stated, and a short summary from its record |

Regions are customary regions (wilayah adat). They are reference regions, not boundaries of customary land.

## How it was made

1. Helper agents surveyed open sources per page and copied sentences.
2. `scripts/verify-wiki-seed.py` fetched every source again and kept only sentences found word for word in the live text.
3. Pages were written from kept sentences only. `scripts/check-wiki-pages.ts` checks that every name and number in a page appears in its sentences and every paragraph cites a source.
4. Conflict, displacement and published religious practice were added later from Wikipedia and from human-rights and news reports, each figure attributed to its source. Where sources disagree, all figures are given.

Nearly all page text rests on Wikipedia (Indonesian and English), which counts as one source in practice. Pages are imperfect and unreviewed by the communities they describe. Corrections are welcome, on ETNOS or as issues on this repository.

## Licence

- Page text and verified sentences from Wikipedia: CC BY-SA 4.0, as Wikipedia's text is. Attribution: the Wikipedia articles cited in each page, and ETNOS.
- Short sentences from other sources are quoted for reference, with their source named; their own terms apply.
- The source catalogue (records and summaries): CC BY-SA 4.0, ETNOS.

## Cite

ETNOS (2026). ETNOS seed dataset: Mee Pago, Saireri and La Pago, version 0.1. https://github.com/yohn-maistre/strata/tree/main/seed
