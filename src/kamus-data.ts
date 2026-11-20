// The lexicon the Kamus finder works from: Indonesian and Papuan Malay words to skip, and a seed per language
// keyed by glottocode. Sources and licences travel with each seed (see seed/kamus/README.md).
// The Indonesian list joins words from this repo's own texts with the 20,000 most frequent Indonesian word forms
// (FrequencyWords, CC BY-SA 4.0). Papuan Malay forms are listed by hand.
// Steltenpool 1969 is CC BY-NC: fine for this non-commercial service, never for anything paid.
import ekari from '../seed/kamus/ekari.json' with {type:'json'}
import idWords from '../seed/kamus/id-words.json' with {type:'json'}
import idFrequency from '../seed/kamus/id-frequency.json' with {type:'json'}
import type {KamusLexicon,SeedSet} from './kamus.ts'

// Everyday Papuan Malay forms missing from both lists.
const PAPUAN_MALAY=['pace','mace','ade','kaka','tete','nene','sodara','sampe','skarang','skali','bilang','kitong','kam','tong','dia','sapa','ini','itu']
let cached:KamusLexicon|undefined
export function kamusLexicon():KamusLexicon{
 return cached??=({contact:new Set([...idWords.indonesian,...idFrequency.words,...idWords.papuanMalay,...PAPUAN_MALAY].map(w=>w.toLowerCase())),seeds:{[ekari.language.glottocode]:ekari as unknown as SeedSet}})
}
