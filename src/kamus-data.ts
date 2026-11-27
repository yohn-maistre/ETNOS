// The lexicon the Kamus finder works from: Indonesian and Papuan Malay words to skip, and a seed per language
// keyed by glottocode. Sources and licences travel with each seed (see seed/kamus/README.md).
// The Indonesian list joins words from this repo's own texts with the 20,000 most frequent Indonesian word forms
// (FrequencyWords, CC BY-SA 4.0). Papuan Malay forms are listed by hand.
// Steltenpool 1969 is CC BY-NC: fine for this non-commercial service, never for anything paid.
import ekari from '../seed/kamus/ekari.json' with {type:'json'}
import idWords from '../seed/kamus/id-words.json' with {type:'json'}
import idFrequency from '../seed/kamus/id-frequency.json' with {type:'json'}
import wordlists from '../seed/kamus/tanah-papua-wordlists.json' with {type:'json'}
import type {KamusLexicon,SeedSet} from './kamus.ts'

// Everyday Papuan Malay forms missing from both lists.
const PAPUAN_MALAY=['pace','mace','ade','kaka','tete','nene','sodara','sampe','skarang','skali','bilang','kitong','kam','tong','dia','sapa','ini','itu']
type Wordlists={datasets:{key:string;name:string;citation:string;url:string;licence:string}[];concepts:{key:string;id:string;english:string}[];params:string[];languages:Record<string,{name:string;forms:(string|number)[][]}>}

/** Basic wordlists of the other Tanah Papua languages (seed/kamus/tanah-papua-wordlists.json, CC BY 4.0), as
 * seeds a language community can load into its Kamus and then check. The meaning is the concept's Indonesian
 * label; the dataset's own concept name stays in gloss_en. Ekari keeps its own, larger seed. */
function wordlistSeeds(skip:Set<string>):Record<string,SeedSet>{
 const w=wordlists as unknown as Wordlists,out:Record<string,SeedSet>={}
 const sources=Object.fromEntries(w.datasets.map(d=>[d.key,{licence:d.licence,citation:d.citation,url:d.url,note:'dari daftar kata terbitan, belum diperiksa penutur'}]))
 for(const [code,l] of Object.entries(w.languages)){
  if(skip.has(code)||!l.forms.length)continue
  out[code]={language:{name:l.name,glottocode:code},sources,entries:l.forms.map(f=>({lemma:String(f[1]),gloss_id:w.concepts[Number(f[0])]!.id,gloss_en:w.params[Number(f[5])],source:w.datasets[Number(f[2])]!.key,concept:w.concepts[Number(f[0])]!.key,confidence:'high' as const}))}
 }
 return out
}

let cached:KamusLexicon|undefined
export function kamusLexicon():KamusLexicon{
 return cached??=({contact:new Set([...idWords.indonesian,...idFrequency.words,...idWords.papuanMalay,...PAPUAN_MALAY].map(w=>w.toLowerCase())),seeds:{...wordlistSeeds(new Set([ekari.language.glottocode])),[ekari.language.glottocode]:ekari as unknown as SeedSet}})
}
