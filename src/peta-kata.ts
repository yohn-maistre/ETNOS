/** Peta Kata: the words for one basic concept across the languages of Tanah Papua, on a map.
 *
 * Two kinds of words, always kept apart:
 * - Published wordlists (seed/kamus/tanah-papua-wordlists.json, built by scripts/kamus/build-wordlists.py from
 *   TransNewGuinea.org, ABVD and Berry & Berry 1987, all CC BY 4.0, and Papuan Voices, CC BY-NC 4.0). Each form
 *   keeps its dataset, licence, original publication, variety and dataset row. None of them has been checked by
 *   speakers yet. Papuan Voices forms carry `nc: true` and stay out of anything paid (src/licence.ts).
 * - Public, non-sensitive community Kamus entries (never private communities, never sensitive words), with their
 *   public voice clips. Their state comes from Periksa.
 *
 * Languages without data stay on the map as faint points; nothing is filled in for them. */
import wordlists from '../seed/kamus/tanah-papua-wordlists.json' with {type:'json'}
import tanahPapua from './catalogues/tanah-papua.json' with {type:'json'}
import {EtnosCore} from './core.ts'
import {norm,type KamusLexicon} from './kamus.ts'

type WordlistConcept={key:string;concepticon:number;id:string;english:string;leipzigJakarta:number|null}
type WordlistLanguage={slug:string;name:string;forms:(string|number)[][]}
type WordlistFile={datasets:{key:string;name:string;citation:string;url:string;licence:string;nonCommercial?:boolean}[];concepts:WordlistConcept[];refs:string[];varieties:string[];params:string[];languages:Record<string,WordlistLanguage>}
const WL=wordlists as unknown as WordlistFile

export type PetaConcept={key:string;id:string;english:string;concepticon:number;leipzigJakarta:number|null;count:number}
export type PetaLanguage={code:string;slug:string;name:string;glottologName:string;family:string;concepts:number;community:{id:string;title:string}|null}
/** One published form. `ref` indexes the response's refs table. */
export type PublishedWord={lang:string;concept:string;form:string;value?:string;dataset:string;licence:string;nc?:true;ref:number;variety?:string;param:string;row:string}
export type CommunityWord={id:string;lang:string;communityId:string;communityTitle:string;lemma:string;gloss:string;pos:string;state:'checked'|'seed'|'proposed';source:string;licence:string;voice:{id:string;url:string;durationMs:number;speaker:string}|null}

/** Glottolog's English name for languages that the catalogue lists by their own name. The catalogue calls
 * west2594 Lani (seed wiki page "Bahasa Lani", from id.wikipedia), which Glottolog lists as Western Dani. */
const GLOTTOLOG_NAMES:Record<string,string>={west2594:'Western Dani'}

type Meta={slug:string;title:string;family:string}
const META=new Map<string,Meta>()
for(const e of (tanahPapua.entries as Array<{slug:string;title:string;kind:string;description?:string;aliases?:string[]}>)){
 if(e.kind!=='language')continue
 const code=(e.aliases??[]).find(a=>a.startsWith('glottocode:'))?.slice(11)
 if(!code)continue
 const family=/^Rumpun (.+?) menurut Glottolog/.exec(e.description??'')?.[1]??''
 META.set(code,{slug:e.slug,title:e.title,family})
}

const CONCEPTS=WL.concepts
const CONCEPT_BY_KEY=new Map(CONCEPTS.map(c=>[c.key,c]))
const DATASETS=WL.datasets

// Indexes built once per isolate: forms by concept and by language.
let byConcept:Map<string,PublishedWord[]>|undefined,byLanguage:Map<string,PublishedWord[]>|undefined
function indexes(){
 if(byConcept&&byLanguage)return {byConcept,byLanguage}
 byConcept=new Map();byLanguage=new Map()
 for(const [code,l] of Object.entries(WL.languages)){
  const list:PublishedWord[]=[]
  for(const f of l.forms){
   const [ci,form,di,ri,vi,pi,row,value]=f as [number,string,number,number,number,number,string,string|undefined]
   const c=CONCEPTS[ci]!,d=DATASETS[di]!
   const w:PublishedWord={lang:code,concept:c.key,form,dataset:d.key,licence:d.licence,ref:ri,param:WL.params[pi]!,row}
   if(d.nonCommercial)w.nc=true
   if(value)w.value=value
   const v=WL.varieties[vi];if(v)w.variety=v
   list.push(w)
   const arr=byConcept.get(c.key)??[];arr.push(w);byConcept.set(c.key,arr)
  }
  byLanguage.set(code,list)
 }
 return {byConcept,byLanguage}
}

/** Find a concept by its key ("air"), its Indonesian label, its Concepticon ID or its Leipzig-Jakarta number
 * (older links use ?concept=4). */
export function findConcept(raw:string):WordlistConcept|null{
 const v=raw.trim().toLowerCase()
 if(!v)return null
 const direct=CONCEPT_BY_KEY.get(v)??CONCEPTS.find(c=>c.id.toLowerCase()===v||c.english.toLowerCase()===v)
 if(direct)return direct
 const n=Number(v)
 if(Number.isInteger(n))return CONCEPTS.find(c=>c.leipzigJakarta===n)??CONCEPTS.find(c=>c.concepticon===n)??null
 return null
}

/** Refs used by a set of words, renumbered so a response carries only its own. */
function withRefs(words:PublishedWord[]){
 const refs:string[]=[],at=new Map<number,number>()
 const out=words.map(w=>{let i=at.get(w.ref);if(i===undefined){i=refs.length;refs.push(WL.refs[w.ref]??'');at.set(w.ref,i)}return {...w,ref:i}})
 return {refs,words:out}
}

export class PetaKata{
 private store:EtnosCore
 private lexicon:KamusLexicon
 constructor(store:EtnosCore,lexicon:KamusLexicon){
  this.store=store
  this.lexicon=lexicon
 }

 /** Public, non-sensitive community entries with a language, newest first. */
 private communityEntries(){
  const rows=this.store.all<{
   id:string;community_id:string;community_title:string;lemma:string;norm:string;gloss:string
   pos:string;state:string;source:string;licence:string;language:string|null
  }>(`
   SELECT e.id,e.community_id,c.title community_title,e.lemma,e.norm,e.gloss,e.pos,
    CASE WHEN cl.state='checked' THEN 'checked' ELSE e.state END state,
    e.source,e.licence,
    COALESCE(NULLIF(ks.language,''), (
     SELECT substr(a.value,12) FROM community_contexts cc
     JOIN contexts ctx ON ctx.id=cc.context_id, json_each(ctx.aliases) a
     WHERE cc.community_id=c.id AND cc.role='language' AND ctx.kind='language' AND ctx.active=1
      AND a.value LIKE 'glottocode:%' LIMIT 1
    )) language
   FROM kamus_entries e
   JOIN communities c ON c.id=e.community_id
   LEFT JOIN kamus_settings ks ON ks.community_id=c.id
   LEFT JOIN claims cl ON cl.id=e.claim_id
   WHERE c.visibility='public' AND COALESCE(c.archived,0)=0
    AND e.sensitive=0
    AND e.gloss<>''
    AND (cl.state IS NULL OR cl.state IN ('open','checked'))
    AND e.state IN ('seed','proposed')
    AND e.source NOT LIKE 'seed:%'
   ORDER BY CASE WHEN cl.state='checked' THEN 0 ELSE 1 END, e.updated DESC
   LIMIT 2000
  `)
  const voices=this.store.all<{id:string;community_id:string;kamus_norm:string;duration_ms:number;speaker:string}>(`
   SELECT v.id,v.community_id,v.kamus_norm,v.duration_ms,v.speaker
   FROM voice_clips v
   JOIN communities c ON c.id=v.community_id
   WHERE c.visibility='public' AND COALESCE(c.archived,0)=0
    AND v.kamus_norm IS NOT NULL AND v.kamus_norm<>''
    AND v.protocol<>'restricted'
   ORDER BY v.created DESC
  `)
  const voiceMap=new Map<string,CommunityWord['voice']>()
  for(const v of voices){
   const k=`${v.community_id}:${v.kamus_norm}`
   if(!voiceMap.has(k))voiceMap.set(k,{id:v.id,url:`/v1/voice/${v.id}`,durationMs:v.duration_ms,speaker:v.speaker})
  }
  return rows.filter(r=>!!r.language).map(r=>({
   id:r.id,lang:r.language!,norm:r.norm,communityId:r.community_id,communityTitle:r.community_title,lemma:r.lemma,gloss:r.gloss,pos:r.pos,
   state:(r.state==='checked'?'checked':r.state==='proposed'?'proposed':'seed') as CommunityWord['state'],
   source:r.source,licence:r.licence,voice:voiceMap.get(`${r.community_id}:${r.norm}`)??null,
  }))
 }

 /** Public communities per language: the first one that writes in it, else the first one about it. */
 private communities(){
  const rows=this.store.all<{id:string;title:string;code:string;role:string}>(`
   SELECT c.id,c.title,substr(a.value,12) code,cc.role
   FROM community_contexts cc
   JOIN communities c ON c.id=cc.community_id
   JOIN contexts ctx ON ctx.id=cc.context_id, json_each(ctx.aliases) a
   WHERE c.visibility='public' AND COALESCE(c.archived,0)=0 AND ctx.kind='language' AND ctx.active=1
    AND a.value LIKE 'glottocode:%'
   ORDER BY CASE cc.role WHEN 'language' THEN 0 ELSE 1 END, cc.created
  `)
  const out=new Map<string,{id:string;title:string}>()
  for(const r of rows)if(!out.has(r.code))out.set(r.code,{id:r.id,title:r.title})
  return out
 }

 private language(code:string,communities:Map<string,{id:string;title:string}>,count:number):PetaLanguage{
  const m=META.get(code)
  const name=m?.title??WL.languages[code]?.name??this.lexicon.seeds[code]?.language.name??code
  return {code,slug:m?.slug??'',name,glottologName:GLOTTOLOG_NAMES[code]??name,family:m?.family??'',concepts:count,community:communities.get(code)??null}
 }

 /** The concept list with counts, every Tanah Papua language with how many concepts it has, and the datasets. */
 concepts(){
  const {byConcept,byLanguage}=indexes()
  const community=this.communityEntries()
  const communities=this.communities()
  const conceptLangs=new Map<string,Set<string>>()
  for(const [key,ws] of byConcept)conceptLangs.set(key,new Set(ws.map(w=>w.lang)))
  const langConcepts=new Map<string,Set<string>>()
  for(const [code,ws] of byLanguage)langConcepts.set(code,new Set(ws.map(w=>w.concept)))
  for(const e of community){
   for(const c of CONCEPTS){
    if(!glossMatches(e.gloss,[c.id,c.english]))continue
    const set=conceptLangs.get(c.key)??new Set();set.add(e.lang);conceptLangs.set(c.key,set)
    const ls=langConcepts.get(e.lang)??new Set();ls.add(c.key);langConcepts.set(e.lang,ls)
   }
  }
  const codes=new Set([...META.keys(),...langConcepts.keys()])
  return {
   title:'Daftar kata dasar bahasa-bahasa Tanah Papua',
   datasets:DATASETS,
   concepts:CONCEPTS.map(c=>({key:c.key,id:c.id,english:c.english,concepticon:c.concepticon,leipzigJakarta:c.leipzigJakarta,count:conceptLangs.get(c.key)?.size??0})),
   languages:[...codes].map(code=>this.language(code,communities,langConcepts.get(code)?.size??0)).sort((a,b)=>a.name.localeCompare(b.name,'id')),
  }
 }

 /** Words for one concept, or forms that start with a search text. */
 lookup(opts:{concept?:string;q?:string}){
  const {byConcept,byLanguage}=indexes()
  const q=norm((opts.q??'').trim()).slice(0,40)
  const concept=q?null:findConcept(opts.concept??'')??CONCEPT_BY_KEY.get('air')!
  let published:PublishedWord[]
  let community:(CommunityWord&{norm:string})[]
  const all=this.communityEntries()
  if(concept){
   published=byConcept.get(concept.key)??[]
   community=all.filter(e=>glossMatches(e.gloss,[concept.id,concept.english]))
  }else{
   published=[...byLanguage.values()].flat().filter(w=>norm(w.form).startsWith(q)).slice(0,200)
   community=all.filter(e=>e.norm.startsWith(q)||e.gloss.toLowerCase().includes(q)).slice(0,100)
  }
  const {refs,words}=withRefs(published)
  return {
   concept:concept?{key:concept.key,id:concept.id,english:concept.english,concepticon:concept.concepticon,leipzigJakarta:concept.leipzigJakarta}:null,
   query:q,
   refs,
   words,
   community:community.map(({norm:_n,...rest})=>rest),
  }
 }

 /** Everything one language has: published forms for every concept, and its public community entries. */
 languageWords(code:string){
  const {byLanguage}=indexes()
  if(!META.has(code)&&!byLanguage.has(code))return null
  const published=byLanguage.get(code)??[]
  const community=this.communityEntries().filter(e=>e.lang===code).slice(0,200)
  const {refs,words}=withRefs(published)
  return {language:this.language(code,this.communities(),new Set(published.map(w=>w.concept)).size),refs,words,community:community.map(({norm:_n,...rest})=>rest)}
 }
}

/** Whole-word match, so "api" does not match "sapi" and "air" does not match "darat (lawan air)" by accident
 * of a longer phrase: the gloss must be the term itself or start with it before a comma or bracket. */
function glossMatches(gloss:string,terms:string[]):boolean{
 const g=gloss.toLowerCase().trim()
 for(const raw of terms){
  const t=raw.toLowerCase().replace(/^to\s+/,'').trim()
  if(!t)continue
  if(g===t)return true
  if(g.startsWith(t)&&/^[\s,;(]/.test(g.slice(t.length)))return true
 }
 return false
}
