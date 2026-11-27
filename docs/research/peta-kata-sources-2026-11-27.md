# Wordlist sources for Peta Kata (27 November 2026)

Peta Kata (*Peta Kata*, the word map in the Ensiklopedia) now shows a basic wordlist for 187 of the 256 languages in the Tanah Papua catalogue. This note records which published datasets were checked, under which licence, what was imported and what was left out. The import script is `scripts/kamus/build-wordlists.py`; its output is `seed/kamus/tanah-papua-wordlists.json`.

## What was imported

Three datasets allow display with attribution (CC BY 4.0), so they were imported. Languages are matched to the catalogue by Glottocode.

| Dataset | Licence | Citation | Tanah Papua languages | Forms kept |
| --- | --- | --- | --- | --- |
| TransNewGuinea.org, Lexibank CLDF release (`lexibank/transnewguineaorg`) | CC BY 4.0 | Greenhill, Simon J. (2015). TransNewGuinea.org: An Online Database of New Guinea Languages. PLoS ONE 10.10: e0141563. | 185 | 12,133 |
| Austronesian Basic Vocabulary Database, Lexibank CLDF release (`lexibank/abvd`) | CC BY 4.0 | Greenhill, S.J., Blust, R. & Gray, R.D. (2008). The Austronesian Basic Vocabulary Database: From Bioinformatics to Lexomics. Evolutionary Bioinformatics 4: 271-283. | 13 (2 not in TNG) | 1,007 |
| Berry & Berry 1987, Lexibank CLDF release (`lexibank/berrywestpapuan`) | CC BY 4.0 | Berry, Christine and Berry, Keith (1987). A survey of some West Papuan Phylum languages. Workpapers in Indonesian Languages and Cultures 4: 25-80. | 7 (all also in TNG) | 661 |

The result is **187 languages × 100 concepts**: 13,801 forms filling 10,471 language-concept pairs. Coverage is uneven, because most lists come from the Voorhoeve (1975) checklist of about 40 words.

| Concepts with at least one form | Languages |
| --- | --- |
| 90 to 100 | 15 |
| 60 to 89 | 71 |
| 30 to 59 | 81 |
| 1 to 29 | 20 |

The other 69 catalogue languages have no form in these datasets. They appear on the map as faint points with a note, and nothing is filled in for them.

## How each form is kept

- The form is copied exactly as the dataset's `Form` column gives it; the dataset's `Value` is kept as well when it differs.
- Each form keeps its dataset, the dataset's row identifier, the dataset's own concept name, the variety (when the dataset lists a dialect or a differently named variety) and the original publication (from the dataset's `sources.bib`, or for ABVD from the contributor's source note).
- Loanwords marked in the dataset are left out. At most three spellings are kept per language and concept, with the variety named as in Glottolog first.
- Every imported word is shown as *dari daftar kata terbitan, belum diperiksa penutur*. The same lists are also seeds for the Kamus, so a language community can load them with *Muat kata dari sumber* and its members can confirm or correct each word through the word cards and Periksa.

## The concept list

The 100 concepts are the ones that these datasets record for the most Tanah Papua languages, with *babi*, *kasuari*, *sagu*, *sungai* and *buaya* kept in because they matter on the island. Concepts are identified by their Concepticon ID. Where a concept is on the Leipzig-Jakarta list, its Indonesian label is the prompt from `seed/kamus/leipzig-jakarta-100.json`. The other Indonesian labels were written for ETNOS on 27 November 2026; they name the concept and are not translations of any form.

## Checked and left out

| Dataset | Licence | Why it was left out |
| --- | --- | --- |
| Papuan Voices, Lexibank CLDF release (`lexibank/papuanvoices`); Sawaki, Y. et al. (2020) | CC BY-NC 4.0 | Non-commercial. It covers 11 Tanah Papua languages with recordings. It could be shown on this free service with a clear licence label, but it would have to stay out of anything paid, so it is left out until the owner decides. |
| The typology of sound symbolism (`lexibank/johanssonsoundsymbolic`); Erben Johansson et al. (2020) | CC BY 4.0 | A compilation drawn from other wordlists, mostly the same sources as TNG, so it would add duplicates with second-hand citations. |
| Joo phonosemantic (`lexibank/joophonosemantic`) | CC BY 4.0 | Two Tanah Papua languages, both already in TNG, on a short list of sound-symbolism concepts. |
| Intercontinental Dictionary Series (`lexibank/ids`) and World Loanword Database (`lexibank/wold`) | CC BY 4.0 | No Tanah Papua language by Glottocode. |
| Steltenpool (1969), Ekagi-Dutch-English-Indonesian Dictionary | CC BY-NC 3.0 | Not used for the map. It stays only in the Ekari Kamus seed (`seed/kamus/ekari.json`), where it was before, labelled and kept out of anything paid. |
| D-PLACE | CC BY-NC | Not a wordlist; not used. |

The licences were read from each repository's `LICENSE` and `metadata.json` on 27 November 2026. Languages were counted against the Lexibank² language table (`lexibank/lexibank-analysed`, CC BY 4.0) and then against each dataset's own `languages.csv`.

## Rebuilding

```sh
mkdir -p /tmp/etnos-src/tng /tmp/etnos-src/abvd /tmp/etnos-src/berrywestpapuan
cd /tmp/etnos-src
for f in forms parameters languages; do
  curl -sSL -o tng/$f.csv https://raw.githubusercontent.com/lexibank/transnewguineaorg/master/cldf/$f.csv
  curl -sSL -o abvd/$f.csv https://raw.githubusercontent.com/lexibank/abvd/master/cldf/$f.csv
  curl -sSL -o berrywestpapuan/$f.csv https://raw.githubusercontent.com/lexibank/berrywestpapuan/main/cldf/$f.csv
done
curl -sSL -o tng/sources.bib https://raw.githubusercontent.com/lexibank/transnewguineaorg/master/cldf/sources.bib
curl -sSL -o abvd/sources.bib https://raw.githubusercontent.com/lexibank/abvd/master/cldf/sources.bib
curl -sSL -o abvd/contributions.csv https://raw.githubusercontent.com/lexibank/abvd/master/cldf/contributions.csv
curl -sSL -o berrywestpapuan/sources.bib https://raw.githubusercontent.com/lexibank/berrywestpapuan/main/cldf/sources.bib
cd -   # back to the repository root
python3 -I scripts/kamus/build-wordlists.py /tmp/etnos-src seed/kamus/tanah-papua-wordlists.json
```

The upstream repositories change over time, so a rebuild on a later day can give slightly different counts. The script itself is deterministic: the same inputs give the same file.
