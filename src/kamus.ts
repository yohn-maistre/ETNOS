/** Kamus komunitas: a community's dictionary that grows from how its members talk.
 *
 * Three steps, each with its own boundary:
 * 1. Seed. Stewards load published wordlists (TransNewGuinea.org, Steltenpool 1969) as entries that carry their
 *    source, page and licence.
 * 2. Find. With the community's machine-reading permission on (off by default, public and private alike), a plain
 *    count over members' posts finds words that are not Indonesian or Papuan Malay, matches them to the seed and
 *    keeps up to three example sentences. No model reads the posts in this step. Agents' own posts never count.
 * 3. Propose. The community's Aksara (an agent with an active switch or mandate there) asks a model for a likely
 *    meaning, word class and context of use for the strongest candidates, and each answer becomes a Periksa card.
 *    Members decide; an entry's state is read from its card, so answers show at once.
 *
 * Nothing here leaves the community: entries are read with the community's own read rule, and example sentences
 * are re-checked against their posts at read time, so a deleted or hidden post stops counting at once. */
import {randomUUID} from 'node:crypto'
import {StrataCore,Fault} from './core.ts'
import {Periksa,type Claim} from './periksa.ts'

export const KAMUS_CONTEXTS=['Kebun','Hutan','Rumah','Adat','Tubuh','Alam','Keluarga','Gereja','Jual beli','Lainnya'] as const
export type KamusContext=typeof KAMUS_CONTEXTS[number]
export type SeedEntry={lemma:string;modern?:string;gloss_id?:string;gloss_en?:string;gloss_nl?:string;gloss_raw?:string;pos?:string;dialect?:string;source:string;page?:number;concept?:string;confidence?:'high'|'low'}
export type SeedSet={language:{name:string;glottocode:string;iso?:string};sources:Record<string,{licence:string;citation?:string;url?:string;note?:string}>;entries:SeedEntry[]}
/** Words the finder treats as the contact languages (Indonesian, Papuan Malay), plus the seeds it can load. */
export type KamusLexicon={contact:Set<string>;seeds:Record<string,SeedSet>}
export type Example={postId:string;text:string}
export type KamusEntry={id:string;lemma:string;gloss:string;pos:string;context:string;source:string;licence:string;page:number|null;state:'seed'|'candidate'|'proposed'|'checked'|'rejected'|'split';uses:number;speakers:number;examples:Example[];claimId:string|null;updated:number}
type Row={id:string;community_id:string;lemma:string;norm:string;gloss:string;pos:string;context:string;source:string;licence:string;page:number|null;state:string;claim_id:string|null;uses:number;speakers:number;examples:string;created:number;updated:number}

/** Lowercase, apostrophes and hyphens kept inside words, j spelled y as in today's Ekari orthography. */
export const norm=(w:string)=>w.toLowerCase().normalize('NFC').replace(/^[-']+|[-']+$/g,'')
const words=(t:string)=>(t.match(/[\p{L}][\p{L}'-]*/gu)??[]).map(norm).filter(w=>w.length>=3&&w.length<=40)
const sentences=(t:string)=>t.replace(/\s+/g,' ').split(/(?<=[.!?…])\s+|\n+/).map(s=>s.trim()).filter(Boolean)
const ENGLISH=new Set(['the','and','for','with','that','this','from','you','are','was','not','but','have','has','will','can','what','when','where','how','why','who','all','one','our','your','their','they','them','there','here','about','into','out','just','like','yes','okay','http','https','www','com'])

/** Character trigram score: how much more a word looks like the seed language than like the contact languages.
 * Positive leans to the seed. Plain counts, explainable, no model. */
export function trigramScore(word:string,seedGrams:Map<string,number>,contactGrams:Map<string,number>){
 const w='^'+word+'$';let s=0,n=0
 for(let i=0;i+3<=w.length;i++){const g=w.slice(i,i+3),a=(seedGrams.get(g)??0)+0.5,b=(contactGrams.get(g)??0)+0.5;s+=Math.log(a/b);n++}
 return n?s/n:0
}
function grams(list:Iterable<string>){const m=new Map<string,number>();let total=0;for(const x of list){const w='^'+x+'$';for(let i=0;i+3<=w.length;i++){m.set(w.slice(i,i+3),(m.get(w.slice(i,i+3))??0)+1);total++}}for(const [k,v] of m)m.set(k,v/Math.max(1,total)*1000);return m}

export class Kamus{
 private store:StrataCore
 private periksa:Periksa
 private lexicon:KamusLexicon
 constructor(store:StrataCore,lexicon:KamusLexicon){this.store=store;this.periksa=new Periksa(store);this.lexicon=lexicon}

 settings(communityId:string){
  const r=this.store.get<{machine_reading:number;language:string}>('SELECT machine_reading,language FROM kamus_settings WHERE community_id=?',communityId)
  return {machineReading:!!r?.machine_reading,language:r?.language??''}
 }
 /** Stewards turn machine reading on or off and choose the language the seed comes from. */
 setSettings(actor:string,communityId:string,b:{machineReading?:unknown;language?:unknown}){
  const s=this.store;return s.tx(()=>{
   s.requireSteward(actor,communityId);if(s.actor(actor).kind!=='human')throw new Fault(403,'Human steward required')
   const cur=this.settings(communityId)
   const on=typeof b.machineReading==='boolean'?b.machineReading:cur.machineReading
   const lang=typeof b.language==='string'?b.language.trim():cur.language
   if(lang&&!this.lexicon.seeds[lang])throw new Fault(400,'Unknown language')
   s.run('INSERT INTO kamus_settings(community_id,machine_reading,language,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(community_id) DO UPDATE SET machine_reading=excluded.machine_reading,language=excluded.language,updated=excluded.updated,updated_by=excluded.updated_by',communityId,on?1:0,lang,s.clock(),actor)
   s.audit(actor,on?'kamus.reading.on':'kamus.reading.off',communityId)
   return this.settings(communityId)
  })
 }
 private readable(actor:string|undefined,communityId:string){if(!this.store.canRead(actor,this.store.community(communityId)))throw new Fault(404,'Not found')}

 /** Load the chosen language's seed. Entries already present are kept; the call can run again safely. */
 importSeed(actor:string,communityId:string){
  const s=this.store;return s.tx(()=>{
   s.requireSteward(actor,communityId);if(s.actor(actor).kind!=='human')throw new Fault(403,'Human steward required')
   const lang=this.settings(communityId).language,set=this.lexicon.seeds[lang]
   if(!set)throw new Fault(409,'Choose a language first')
   let added=0
   for(const e of set.entries){
    // Scanned sources carry stray dots and empty senses; an entry needs a clean headword and some meaning.
    const lemma=(e.modern||e.lemma).trim().replace(/^[.·,;:]+/,''),gloss=(e.gloss_id||e.gloss_en||e.gloss_nl||e.gloss_raw||'').trim()
    if(!lemma||!gloss||!/^-?[\p{L}][\p{L}'-]*$/u.test(lemma))continue
    const n=norm(lemma),src=e.source,exists=s.get('SELECT 1 FROM kamus_entries WHERE community_id=? AND norm=? AND source=? AND gloss=?',communityId,n,'seed:'+src,gloss)
    if(exists)continue
    s.run('INSERT INTO kamus_entries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),communityId,lemma,n,gloss,e.pos??'','', 'seed:'+src,set.sources[src]?.licence??'',e.page??null,'seed',null,0,0,'[]',s.clock(),s.clock())
    added++
   }
   s.audit(actor,'kamus.seed',communityId)
   return {added,total:set.entries.length}
  })
 }

 /** Count the words members use. Runs only with machine reading on; reads only this community's visible posts by
 * people. Room evidence is recounted from scratch each time, so a removed post stops counting. */
 scan(actor:string,communityId:string,limit=800){
  const s=this.store;return s.tx(()=>{
   s.requireSteward(actor,communityId)
   if(!this.settings(communityId).machineReading)throw new Fault(409,'Machine reading is off for this community')
   const lang=this.settings(communityId).language,seed=this.lexicon.seeds[lang]
   const posts=s.all<{id:string;author_id:string;text:string}>(`SELECT p.id,p.author_id,p.text FROM posts p JOIN actors a ON a.id=p.author_id WHERE p.community_id=? AND p.deleted=0 AND p.hidden=0 AND a.kind='human' ORDER BY p.created DESC LIMIT ?`,communityId,limit)
   const seen=new Map<string,{uses:number;authors:Set<string>;examples:Example[]}>()
   const seedNorms=new Set((seed?.entries??[]).map(e=>norm(e.modern||e.lemma)))
   for(const p of posts){
    for(const sentence of sentences(p.text)){
     // A word that is also Indonesian or English (Ekari "ama", Indonesian "ama") counts only inside a sentence
     // that is mostly in the local language; otherwise contact-language words are skipped.
     const ws=words(sentence),foreign=(w:string)=>this.lexicon.contact.has(w)||ENGLISH.has(w)
     const local=ws.filter(w=>!foreign(w)).length>=Math.max(2,ws.length/2)
     for(const w of new Set(ws)){
      if(/\d/.test(w))continue
      if(foreign(w)&&!(local&&seedNorms.has(w)))continue
      const e=seen.get(w)??{uses:0,authors:new Set<string>(),examples:[]}
      e.uses++;e.authors.add(p.author_id);if(e.examples.length<3&&!e.examples.some(x=>x.postId===p.id))e.examples.push({postId:p.id,text:sentence.slice(0,240)})
      seen.set(w,e)
     }
    }
   }
   const seedGrams=grams((seed?.entries??[]).map(e=>norm(e.modern||e.lemma))),contactGrams=grams(this.lexicon.contact)
   s.run("UPDATE kamus_entries SET uses=0,speakers=0,examples='[]' WHERE community_id=?",communityId)
   let matched=0,candidates=0
   for(const [w,e] of seen){
    const rows=s.all<Row>('SELECT * FROM kamus_entries WHERE community_id=? AND norm=?',communityId,w)
    if(rows.length){for(const r of rows)s.run('UPDATE kamus_entries SET uses=?,speakers=?,examples=?,updated=? WHERE id=?',e.uses,e.authors.size,JSON.stringify(e.examples),s.clock(),r.id);matched++;continue}
    // A new word needs two uses, or one use that looks clearly like the seed language. The trigram test is
    // used only when the seed is large enough to say something (200 entries or more).
    const judged=(seed?.entries.length??0)>=200,score=judged?trigramScore(w,seedGrams,contactGrams):0
    if(e.uses<2&&score<0.6)continue
    if(judged&&score<-0.2)continue
    s.run('INSERT INTO kamus_entries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),communityId,w,w,'','','','room','',null,'candidate',null,e.uses,e.authors.size,JSON.stringify(e.examples),s.clock(),s.clock())
    candidates++
   }
   // Candidates nobody uses any more, and that never became a card, are removed.
   s.run("DELETE FROM kamus_entries WHERE community_id=? AND state='candidate' AND claim_id IS NULL AND uses=0",communityId)
   s.audit(actor,'kamus.scan',communityId)
   return {posts:posts.length,matched,candidates}
  })
 }

 /** The strongest candidates for the model to describe, with their evidence. */
 candidatesForGloss(communityId:string,max=5){
  return this.store.all<Row>("SELECT * FROM kamus_entries WHERE community_id=? AND state='candidate' AND (claim_id IS NULL OR claim_id IN (SELECT id FROM claims WHERE state='withdrawn')) ORDER BY speakers DESC,uses DESC,created LIMIT ?",communityId,max).map(r=>this.view(r))
 }
 /** The agent that may act for this community: one with an active switch or mandate here. */
 aksara(communityId:string){
  const rows=this.store.all<{agent_id:string}>('SELECT agent_id FROM agent_switches WHERE community_id=? AND enabled=1',communityId)
  for(const r of rows)if(this.store.activeSwitch(r.agent_id,communityId,'posts'))return r.agent_id
  const m=this.store.get<{agent_id:string}>('SELECT agent_id FROM mandates WHERE community_id=? AND revoked=0 AND expires>? ORDER BY expires DESC',communityId,this.store.clock())
  return m?.agent_id??null
 }
 /** Owner decision (20 November): a hosted model never reads a private community. Until a community runs a
  * model on a machine it trusts (Aksara Node), only public communities get model descriptions. */
 modelAllowed(communityId:string){return this.store.community(communityId).visibility==='public'}
 /** Turn model descriptions into Periksa cards written by the community's Aksara. */
 applyGlosses(actor:string,communityId:string,glosses:{id:string;gloss:string;pos:string;context:string;isName?:boolean}[]){
  const s=this.store;return s.tx(()=>{
   s.requireSteward(actor,communityId)
   if(!this.settings(communityId).machineReading)throw new Fault(409,'Machine reading is off for this community')
   if(!this.modelAllowed(communityId))throw new Fault(409,'A hosted model may not read a private community')
   const agent=this.aksara(communityId);if(!agent)throw new Fault(409,'Aksara is not active in this community')
   const out:Claim[]=[]
   for(const g of glosses){
    const r=s.get<Row>("SELECT * FROM kamus_entries WHERE id=? AND community_id=? AND state='candidate' AND (claim_id IS NULL OR claim_id IN (SELECT id FROM claims WHERE state='withdrawn'))",g.id,communityId);if(!r)continue
    const gloss=g.gloss.replace(/\s+/g,' ').trim().slice(0,160),pos=g.pos.replace(/\s+/g,' ').trim().slice(0,40)
    const context=(KAMUS_CONTEXTS as readonly string[]).includes(g.context)?g.context:'Lainnya'
    if(!gloss)continue
    const statement=g.isName?`"${r.lemma}" tampaknya sebuah nama (${gloss}).`:`"${r.lemma}" kemungkinan artinya "${gloss}"${pos?' ('+pos+')':''}, dipakai dalam konteks ${context.toLowerCase()}.`
    const evidence=(JSON.parse(r.examples) as Example[]).slice(0,3).map(e=>({text:e.text}))
    const claim=this.periksa.proposeAsAgent(agent,communityId,{kind:g.isName?'name':'word',subject:r.lemma,statement,evidence})
    s.run("UPDATE kamus_entries SET gloss=?,pos=?,context=?,state='proposed',claim_id=?,updated=? WHERE id=?",gloss,pos,context,claim.id,s.clock(),r.id)
    out.push(claim)
   }
   return {proposed:out.length}
  })
 }

 /** A member writes a meaning for a word found in conversation. It becomes a Periksa card like Aksara's, so other
  * members decide. No model is involved, so this works in private communities too. */
 proposeMeaning(actor:string,communityId:string,entryId:string,b:{gloss?:unknown;pos?:unknown;context?:unknown}){
  const s=this.store;return s.tx(()=>{
   s.requireMember(actor,communityId)
   const r=s.get<Row>(`SELECT * FROM kamus_entries WHERE id=? AND community_id=? AND state IN ('candidate','proposed')`,entryId,communityId)
   if(!r)throw new Fault(404,'Not found')
   if(r.claim_id&&s.get<{state:string}>('SELECT state FROM claims WHERE id=?',r.claim_id)?.state!=='withdrawn')throw new Fault(409,'This word already has a meaning being checked')
   const gloss=String(b.gloss??'').replace(/\s+/g,' ').trim().slice(0,160),pos=String(b.pos??'').replace(/\s+/g,' ').trim().slice(0,40)
   const context=(KAMUS_CONTEXTS as readonly string[]).includes(String(b.context))?String(b.context):'Lainnya'
   if(!gloss)throw new Fault(400,'Meaning required')
   const evidence=(JSON.parse(r.examples) as Example[]).slice(0,3).map(e=>({text:e.text}))
   const claim=this.periksa.propose(actor,communityId,{kind:'word',subject:r.lemma,statement:`"${r.lemma}" artinya "${gloss}"${pos?' ('+pos+')':''}, dipakai dalam konteks ${context.toLowerCase()}.`,evidence})
   s.run("UPDATE kamus_entries SET gloss=?,pos=?,context=?,state='proposed',claim_id=?,updated=? WHERE id=?",gloss,pos,context,claim.id,s.clock(),r.id)
   return this.view(s.get<Row>('SELECT * FROM kamus_entries WHERE id=?',r.id)!)
  })
 }
 private visibleExamples(raw:string){
  const list=JSON.parse(raw) as Example[]
  return list.filter(e=>!!this.store.get("SELECT 1 FROM posts WHERE id=? AND deleted=0 AND hidden=0",e.postId))
 }
 private view(r:Row):KamusEntry{
  let state=r.state as KamusEntry['state']
  if(r.claim_id){const c=this.store.get<{state:string}>('SELECT state FROM claims WHERE id=?',r.claim_id);state=c?.state==='checked'?'checked':c?.state==='rejected'?'rejected':c?.state==='split'?'split':c?.state==='withdrawn'?'candidate':'proposed'}
  const examples=this.visibleExamples(r.examples)
  return {id:r.id,lemma:r.lemma,gloss:r.gloss,pos:r.pos,context:r.context,source:r.source,licence:r.licence,page:r.page,state,uses:examples.length?r.uses:0,speakers:examples.length?r.speakers:0,examples,claimId:r.claim_id,updated:r.updated}
 }
 /** The dictionary, read with its community's read rule. */
 list(actor:string|undefined,communityId:string,o:{q?:string;state?:string;context?:string;limit?:number}={}){
  this.readable(actor,communityId)
  const q=o.q?norm(o.q).slice(0,40):''
  const where=['community_id=?'],args:(string|number)[]=[communityId]
  if(q){where.push('(norm LIKE ? OR lower(gloss) LIKE ?)');args.push(q+'%','%'+q+'%')}
  if(o.state==='seed'||o.state==='candidate'){where.push('state=? AND claim_id IS NULL');args.push(o.state)}
  else if(o.state){where.push('claim_id IS NOT NULL')}
  if(o.context){where.push('context=?');args.push(o.context)}
  const limit=Math.max(0,Math.min(400,Math.trunc(o.limit??400)||0))
  const rows=this.store.all<Row>(`SELECT * FROM kamus_entries WHERE ${where.join(' AND ')} ORDER BY (claim_id IS NULL),(uses=0),uses DESC,norm LIMIT ?`,...args,limit)
  let entries=rows.map(r=>this.view(r))
  if(o.state&&o.state!=='seed'&&o.state!=='candidate')entries=entries.filter(e=>e.state===o.state)
  const counts:Record<string,number>={}
  for(const r of this.store.all<{state:string;n:number}>('SELECT state,COUNT(*) n FROM kamus_entries WHERE community_id=? GROUP BY state',communityId))counts[r.state]=r.n
  const languages=Object.entries(this.lexicon.seeds).map(([id,v])=>({id,name:v.language.name,sources:Object.fromEntries(Object.entries(v.sources).map(([k,x])=>[k,{citation:x.citation??k,licence:x.licence,url:x.url??null}]))}))
  return {settings:this.settings(communityId),contexts:KAMUS_CONTEXTS,languages,counts,entries}
 }
}

/** The prompt that asks a model to describe candidate words. The answer must be JSON in a fixed shape. */
export function glossPrompt(language:string,items:{id:string;lemma:string;examples:Example[]}[]){
 return [
  {role:'system' as const,content:`Kamu membantu komunitas penutur bahasa ${language} menyusun kamus. Untuk setiap kata, usulkan arti dalam bahasa Indonesia (singkat, satu sampai empat kata), kelas kata (kata benda, kata kerja, kata sifat, kata keterangan, kata tugas, atau nama), dan konteks pemakaian dari daftar ini: ${KAMUS_CONTEXTS.join(', ')}. Tandai isName true bila kata itu nama orang, marga, tempat, tumbuhan atau hewan tertentu. Bila tidak yakin, tetap usulkan tebakan terbaik; anggota komunitas akan memeriksanya. Jawab hanya dengan JSON: {"items":[{"id":"...","gloss":"...","pos":"...","context":"...","isName":false}]}`},
  {role:'user' as const,content:JSON.stringify(items.map(i=>({id:i.id,kata:i.lemma,contoh:i.examples.map(e=>e.text)})))},
 ]
}
/** Read the model's answer; anything not in the expected shape is dropped. */
export function parseGlosses(text:string,ids:Set<string>){
 const m=text.match(/\{[\s\S]*\}/);if(!m)return []
 let data:unknown;try{data=JSON.parse(m[0])}catch{return []}
 const items=(data as {items?:unknown})?.items;if(!Array.isArray(items))return []
 return items.flatMap(x=>{const o=x as Record<string,unknown>;return typeof o?.id==='string'&&ids.has(o.id)&&typeof o.gloss==='string'?[{id:o.id,gloss:o.gloss,pos:typeof o.pos==='string'?o.pos:'',context:typeof o.context==='string'?o.context:'Lainnya',isName:o.isName===true}]:[]})
}
