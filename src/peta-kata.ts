/** Peta Kata: Live Spoken Word Atlas across Tanah Papua.
 *
 * Joins the 100 Leipzig-Jakarta core concepts (Tadmor 2009, Concepticon CC BY 4.0) with:
 * - Public, non-sensitive community Kamus entries (never private communities, never sensitive words)
 * - Public, non-restricted voice clip pronunciations attached to those Kamus headwords
 * - Published seed wordlists (clearly labelled with their written source & licence)
 * - Tanah Papua Glottolog language metadata (slug, glottocode, family) for atlas plotting. */
import conceptsFile from '../seed/kamus/leipzig-jakarta-100.json' with {type:'json'}
import tanahPapua from './catalogues/tanah-papua.json' with {type:'json'}
import {EtnosCore} from './core.ts'
import {norm,type KamusLexicon} from './kamus.ts'

export type AtlasConcept={
 n:number
 concepticon:number
 gloss:string
 english:string
 id:string
 wordClass:string
 count:number
 voiceCount:number
}

export type AtlasWord={
 id:string
 languageCode:string
 languageSlug:string|null
 languageName:string
 communityId:string|null
 communityTitle:string
 lemma:string
 gloss:string
 pos:string
 state:'checked'|'seed'|'proposed'
 source:string
 licence:string
 origin:'community'|'seed'
 voice:{id:string;url:string;durationMs:number;speaker:string}|null
}

type LangMeta={slug:string;title:string;glottocode:string;description:string}

const LANG_BY_CODE=new Map<string,LangMeta>()
for(const e of (tanahPapua.entries as Array<{slug:string;title:string;kind:string;description?:string;aliases?:string[]}>)){
 if(e.kind!=='language')continue
 const alias=(e.aliases??[]).find(a=>a.startsWith('glottocode:'))
 if(!alias)continue
 const code=alias.slice(11)
 LANG_BY_CODE.set(code,{slug:e.slug,title:e.title,glottocode:code,description:e.description??''})
}

const CONCEPTS=(conceptsFile.concepts as Array<{n:number;concepticon:number;gloss:string;english:string;id:string;class:string}>)

function glossMatches(gloss:string,terms:string[]):boolean{
 const g=gloss.toLowerCase()
 for(const t of terms){
  if(!t)continue
  // Match whole word or phrase boundary in gloss so "api" does not match "sapi" or "tapi"
  const escaped=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  if(new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`,'iu').test(g))return true
 }
 return false
}

export class PetaKata{
 private store:EtnosCore
 private lexicon:KamusLexicon
 constructor(store:EtnosCore,lexicon:KamusLexicon){
  this.store=store
  this.lexicon=lexicon
 }

 private publicEntries(){
  const rows=this.store.all<{
   id:string;community_id:string;community_title:string;lemma:string;norm:string;gloss:string
   pos:string;state:string;source:string;licence:string;language:string|null
  }>(`
   SELECT e.id,e.community_id,c.title community_title,e.lemma,e.norm,e.gloss,e.pos,
    CASE
     WHEN cl.state='checked' THEN 'checked'
     WHEN cl.state IN ('rejected','split','withdrawn') THEN cl.state
     ELSE e.state
    END state,
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
   WHERE c.visibility='public'
    AND e.sensitive=0
    AND e.gloss<>''
    AND (cl.state IS NULL OR cl.state IN ('open','checked'))
    AND e.state IN ('seed','proposed')
   ORDER BY CASE WHEN cl.state='checked' THEN 0 WHEN e.state='proposed' THEN 1 ELSE 2 END, e.updated DESC
   LIMIT 2000
  `)
  // Map public, non-restricted voice pronunciations keyed by (community_id + ":" + kamus_norm)
  const voices=this.store.all<{id:string;community_id:string;kamus_norm:string;duration_ms:number;speaker:string}>(`
   SELECT v.id,v.community_id,v.kamus_norm,v.duration_ms,v.speaker
   FROM voice_clips v
   JOIN communities c ON c.id=v.community_id
   WHERE c.visibility='public'
    AND v.kamus_norm IS NOT NULL AND v.kamus_norm<>''
    AND v.protocol<>'restricted'
   ORDER BY v.created DESC
  `)
  const voiceMap=new Map<string,{id:string;url:string;durationMs:number;speaker:string}>()
  for(const v of voices){
   const k=`${v.community_id}:${v.kamus_norm}`
   if(!voiceMap.has(k))voiceMap.set(k,{id:v.id,url:`/v1/voice/${v.id}`,durationMs:v.duration_ms,speaker:v.speaker})
  }
  return {rows,voiceMap}
 }

 concepts():{list:string;title:string;source:string;licence:string;concepts:AtlasConcept[]}{
  const {rows,voiceMap}=this.publicEntries()
  const list=CONCEPTS.map(c=>{
   const terms=[c.id.toLowerCase(),c.english.toLowerCase().replace(/^to\s+/,'')]
   const seenLang=new Set<string>()
   let voiceCount=0
   for(const r of rows){
    if(!r.language||!glossMatches(r.gloss,terms))continue
    seenLang.add(r.language)
    if(voiceMap.has(`${r.community_id}:${r.norm}`))voiceCount++
   }
   for(const [code,seed] of Object.entries(this.lexicon.seeds)){
    if(seenLang.has(code))continue
    if(seed.entries.some(e=>glossMatches(e.gloss_id||e.gloss_en||'',terms)))seenLang.add(code)
   }
   return {n:c.n,concepticon:c.concepticon,gloss:c.gloss,english:c.english,id:c.id,wordClass:c.class,count:seenLang.size,voiceCount}
  })
  return {list:conceptsFile.list,title:conceptsFile.title,source:conceptsFile.source,licence:conceptsFile.licence,concepts:list}
 }

 lookup(opts:{concept?:string;q?:string}):{concept:AtlasConcept|null;query:string;words:AtlasWord[]}{
  const rawConcept=(opts.concept??'').trim()
  const rawQuery=(opts.q??'').trim()
  let chosen:typeof CONCEPTS[number]|null=null
  if(rawConcept){
   const num=Number(rawConcept)
   chosen=CONCEPTS.find(c=>c.n===num||c.id.toLowerCase()===rawConcept.toLowerCase()||c.gloss.toLowerCase()===rawConcept.toLowerCase())??null
  }
  const terms=chosen
   ?[chosen.id.toLowerCase(),chosen.english.toLowerCase().replace(/^to\s+/,'')]
   :rawQuery?[rawQuery.toLowerCase()]:['air','water']
  if(!chosen&&!rawQuery)chosen=CONCEPTS.find(c=>c.id==='air')??CONCEPTS[0]

  const {rows,voiceMap}=this.publicEntries()
  const out:AtlasWord[]=[]
  const seenKey=new Set<string>()

  for(const r of rows){
   if(!r.language)continue
   const hit=glossMatches(r.gloss,terms)||(rawQuery&&r.norm.includes(norm(rawQuery)))
   if(!hit)continue
   const dedupe=`${r.language}:${r.norm}`
   if(seenKey.has(dedupe))continue
   seenKey.add(dedupe)
   const meta=LANG_BY_CODE.get(r.language)
   out.push({
    id:r.id,
    languageCode:r.language,
    languageSlug:meta?.slug??null,
    languageName:meta?.title??this.lexicon.seeds[r.language]?.language.name??r.language,
    communityId:r.community_id,
    communityTitle:r.community_title,
    lemma:r.lemma,
    gloss:r.gloss,
    pos:r.pos,
    state:r.state as 'checked'|'seed'|'proposed',
    source:r.source,
    licence:r.licence,
    origin:'community',
    voice:voiceMap.get(`${r.community_id}:${r.norm}`)??null,
   })
  }

  // Fill with published seed entries for languages not yet represented by community entries for this concept
  for(const [code,seed] of Object.entries(this.lexicon.seeds)){
   const meta=LANG_BY_CODE.get(code)
   let addedForLang=0
   for(const e of seed.entries){
    if(addedForLang>=2)break
    const lemma=(e.modern||e.lemma||'').trim()
    const gloss=(e.gloss_id||e.gloss_en||e.gloss_nl||'').trim()
    if(!lemma||!gloss)continue
    const n=norm(lemma)
    const hit=glossMatches(gloss,terms)||(rawQuery&&n.includes(norm(rawQuery)))
    if(!hit)continue
    const dedupe=`${code}:${n}`
    if(seenKey.has(dedupe))continue
    seenKey.add(dedupe)
    addedForLang++
    out.push({
     id:`seed:${code}:${n}`,
     languageCode:code,
     languageSlug:meta?.slug??null,
     languageName:meta?.title??seed.language.name,
     communityId:null,
     communityTitle:'Sumber tertulis',
     lemma,
     gloss,
     pos:e.pos??'',
     state:'seed',
     source:'seed:'+e.source,
     licence:seed.sources[e.source]?.licence??'',
     origin:'seed',
     voice:null,
    })
   }
  }

  // Sort: community entries with voice first, then checked community, then seed
  out.sort((a,b)=>{
   const score=(w:AtlasWord)=>(w.voice?0:2)+(w.origin==='community'?0:1)+(w.state==='checked'?0:0.5)
   return score(a)-score(b)||a.languageName.localeCompare(b.languageName,'id')
  })

  return {
   concept:chosen?{n:chosen.n,concepticon:chosen.concepticon,gloss:chosen.gloss,english:chosen.english,id:chosen.id,wordClass:chosen.class,count:out.length,voiceCount:out.filter(w=>w.voice).length}:null,
   query:rawQuery||(chosen?.id??''),
   words:out.slice(0,120),
  }
 }
}
