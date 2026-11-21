/** Kamus in posts (docs/plan/one-page-system-2026-11-21.md §10, docs/research/language-from-nothing-2026-11-21.md).
 *
 * Talk in a community becomes a dictionary that the community owns. Every step here produces a question for a
 * member, never a published fact, and no model reads anything:
 * - Words in a post are matched to the community's Kamus (headword, tulisan lain, then one suffix off).
 * - With the community's permission to count words in its posts (`machine_reading`, off by default), words used
 *   three or more times by two or more people that the Kamus lacks become questions, and Artinya pairs (a post and
 *   its Indonesian translation) are aligned by a Dice count to suggest a meaning and a word class.
 * - Kata hari ini asks for the local word for a concept of the Leipzig-Jakarta list; picture questions ask for the
 *   local name of a species from the Penampil.
 * - Answers go into Periksa claims. A claim settles at the community's quorum (`claim_settings`), so one answer
 *   never decides anything. Word classes follow the same quorum, counted per member.
 *
 * Privacy: everything is read with the community's own read rule, membership is checked at use time, and example
 * sentences are re-checked against their posts when read, so a deleted or hidden post stops counting at once. Only
 * a public community's checked picture answers ever leave it, as a species' local name (`localNames`). */
import {randomUUID} from 'node:crypto'
import {StrataCore,Fault} from './core.ts'
import {Periksa,type Evidence} from './periksa.ts'
import {Kamus,norm as kamusNorm,type KamusLexicon} from './kamus.ts'
import {tokenize,matchWord,stripSuffix,chooseUnderlines,align,indonesianWords,guessClass,normWord,DEFAULT_SUFFIXES,WORD_CLASSES,CLASS_LABEL,type Token,type Candidate,type WordClass,type Pair} from './kamus-text.ts'
import type {ViewerRecord} from './entri.ts'

export type Concept={n:number;concepticon:number;gloss:string;english:string;id:string;class:WordClass}
export type ConceptList={list:string;title:string;source:string;url:string;licence:string;concepts:Concept[]}
type EntryRow={id:string;community_id:string;lemma:string;norm:string;gloss:string;pos:string;context:string;source:string;licence:string;page:number|null;state:string;claim_id:string|null;variants:string;definition:string;dialect:string;sensitive:number;created:number;updated:number}
type Ref={id:string;lemma:string;gloss:string;pos:string;context:string;source:string;licence:string;page:number|null;row:string;claimId:string|null;variants:{form:string;dialect:string}[];dialect:string;sensitive:boolean}
type Use={uses:number;authors:Set<string>;last:number;examples:{postId:string;text:string}[]}
type Heavy={version:string;at:number;forms:Map<string,Ref[]>;freq:Map<string,Use>|null;aligned:Map<string,{indonesian:string;dice:number;together:number;pairs:{postId:string;local:string;indonesian:string}[]}>}
type QRow={key:string;kind:'stem'|'align'|'concept'|'picture';form:string;entry_id:string|null;stem:string;suffix:string;gloss:string;word_class:string;subject:string;claim_id:string}
export type QuestionKind='entry'|'stem'|'align'|'frequent'
export type Question={key:string;kind:QuestionKind;form:string;text:string;gloss:string;stem:string;suffix:string;wordClass:WordClass|'';source:string;licence:string;claimId:string|null;weight:number}
type Light={claims:Map<string,string>;answered:Set<string>;skipped:Set<string>;byKey:Map<string,QRow>;stemForms:Map<string,string>;classes:Map<string,WordClass>}

const DAY=86400000,TTL=60000
const ENGLISH=new Set(['the','and','for','with','that','this','from','you','are','was','not','but','have','has','will','can','what','when','where','how','why','who','all','one','our','your','their','they','them','there','here','about','into','out','just','like','yes','okay'])
const SOURCE_LABEL:Record<string,string>={steltenpool1969:'Steltenpool 1969',tng:'TransNewGuinea.org',room:'Ditulis anggota',concept:'Jawaban anggota'}
const clean=(v:unknown,max:number)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):''
const sentencesOf=(t:string)=>t.replace(/\s+/g,' ').split(/(?<=[.!?…])\s+|\n+/).map(s=>s.trim()).filter(Boolean)
export const sourceLabel=(source:string)=>{const k=source.replace(/^seed:/,'');return SOURCE_LABEL[k]??k}

export class KamusAsk{
 private s:StrataCore
 private kamus:Kamus
 private periksa:Periksa
 private lexicon:KamusLexicon
 private concepts:ConceptList
 private species:ViewerRecord[]
 private cache=new Map<string,Heavy>()
 constructor(store:StrataCore,kamus:Kamus,lexicon:KamusLexicon,concepts:ConceptList,species:ViewerRecord[]){this.s=store;this.kamus=kamus;this.periksa=new Periksa(store);this.lexicon=lexicon;this.concepts=concepts;this.species=species.filter(r=>r.kind==='species'&&!!r.thumb)}

 /** The Kamus is on where the community has a language (today: its language label, or the operator's choice).
  * TODO(P3): switch this to the "Bahasa yang dipakai" field when it exists; this is the only place to change. */
 on(communityId:string){return !!this.kamus.settings(communityId).language}
 private readable(actor:string|undefined,communityId:string){if(!this.s.canRead(actor,this.s.community(communityId)))throw new Fault(404,'Not found')}
 private member(actor:string,communityId:string){this.s.requireMember(actor,communityId);if(this.s.actor(actor).kind!=='human')throw new Fault(403,'Human participant required');if(!this.on(communityId))throw new Fault(409,'This community has no Kamus')}
 private isMember(actor:string|undefined,communityId:string){return !!actor&&!!this.s.membership(actor,communityId)}
 private reading(communityId:string){return this.kamus.settings(communityId).machineReading}

 /** The suffixes the matcher strips: the steward's list, or the language's default. */
 suffixes(communityId:string){
  const row=this.s.get<{suffixes:string|null}>('SELECT suffixes FROM kamus_settings WHERE community_id=?',communityId)
  const lang=this.kamus.settings(communityId).language
  const list:string[]=row?.suffixes?JSON.parse(row.suffixes):(DEFAULT_SUFFIXES[lang]??[])
  // Each checked "Bentuk dari" answer shows which suffix was taken off; stewards see the ones not on the list yet.
  const learned=this.s.all<{suffix:string;n:number}>("SELECT q.suffix,COUNT(*) n FROM kamus_questions q JOIN claims c ON c.id=q.claim_id WHERE q.community_id=? AND q.kind='stem' AND c.state='checked' GROUP BY q.suffix",communityId).filter(r=>r.suffix&&!list.includes(r.suffix)).map(r=>({suffix:r.suffix,checked:r.n}))
  return {list,custom:!!row?.suffixes,learned}
 }
 setSuffixes(actor:string,communityId:string,b:{suffixes?:unknown}){
  const s=this.s;return s.tx(()=>{
   s.requireSteward(actor,communityId);if(s.actor(actor).kind!=='human')throw new Fault(403,'Human steward required')
   if(!Array.isArray(b.suffixes)||b.suffixes.length>40)throw new Fault(400,'Up to 40 suffixes')
   const list=[...new Set(b.suffixes.map(x=>normWord(String(x).trim().replace(/^-+/,''))))].filter(Boolean)
   if(list.some(x=>!/^\p{L}{1,8}$/u.test(x)))throw new Fault(400,'A suffix is one to eight letters')
   s.run('INSERT INTO kamus_settings(community_id,machine_reading,language,updated,updated_by,suffixes) VALUES(?,0,?,?,?,?) ON CONFLICT(community_id) DO UPDATE SET suffixes=excluded.suffixes,updated=excluded.updated,updated_by=excluded.updated_by',communityId,'',s.clock(),actor,JSON.stringify(list))
   s.audit(actor,'kamus.suffixes',communityId);this.cache.delete(communityId)
   return this.suffixes(communityId)
  })
 }

 // The part that is costly to build is kept for a minute and rebuilt when entries, posts or translations change.
 private heavy(communityId:string):Heavy{
  const s=this.s,v=[
   s.get<{n:number;u:number}>('SELECT COUNT(*) n,COALESCE(MAX(updated),0) u FROM kamus_entries WHERE community_id=?',communityId)!,
   s.get<{n:number;u:number}>('SELECT COUNT(*) n,COALESCE(MAX(COALESCE(updated,created)),0) u FROM posts WHERE community_id=? AND deleted=0 AND hidden=0',communityId)!,
   s.get<{n:number;u:number}>('SELECT COUNT(*) n,COALESCE(MAX(updated),0) u FROM kamus_artinya WHERE community_id=?',communityId)!,
  ]
  const reading=this.reading(communityId),version=JSON.stringify([v,reading,this.suffixes(communityId).list])
  const hit=this.cache.get(communityId)
  if(hit&&hit.version===version&&s.clock()-hit.at<TTL)return hit
  const forms=new Map<string,Ref[]>()
  for(const r of s.all<EntryRow>("SELECT * FROM kamus_entries WHERE community_id=? AND state<>'candidate'",communityId)){
   const ref:Ref={id:r.id,lemma:r.lemma,gloss:r.gloss,pos:r.pos,context:r.context,source:r.source,licence:r.licence,page:r.page,row:r.state,claimId:r.claim_id,variants:JSON.parse(r.variants||'[]'),dialect:r.dialect,sensitive:!!r.sensitive}
   for(const f of new Set([r.norm,...ref.variants.map(x=>kamusNorm(x.form))]))if(f)forms.set(f,[...(forms.get(f)??[]),ref])
  }
  let freq:Heavy['freq']=null
  const aligned:Heavy['aligned']=new Map()
  if(reading){
   freq=new Map()
   const posts=s.all<{id:string;author_id:string;text:string;created:number}>("SELECT p.id,p.author_id,p.text,p.created FROM posts p JOIN actors a ON a.id=p.author_id WHERE p.community_id=? AND p.deleted=0 AND p.hidden=0 AND a.kind='human' ORDER BY p.created DESC LIMIT 800",communityId)
   for(const p of posts){
    const tokens=tokenize(p.text),seen=new Set<string>()
    for(const t of tokens){
     if(t.skip||t.norm.length<3||seen.has(t.norm))continue
     seen.add(t.norm)
     const u=freq.get(t.norm)??{uses:0,authors:new Set<string>(),last:0,examples:[]}
     u.uses++;u.authors.add(p.author_id);u.last=Math.max(u.last,p.created)
     if(u.examples.length<3)u.examples.push({postId:p.id,text:sentenceAround(p.text,t).slice(0,240)})
     freq.set(t.norm,u)
    }
   }
   // Artinya pairs: the post's own local words against each translation's Indonesian words, by a Dice count.
   const pairs:(Pair&{postId:string;localText:string;idText:string})[]=[]
   for(const r of s.all<{post_id:string;text:string;ptext:string}>("SELECT t.post_id,t.text,p.text ptext FROM kamus_artinya t JOIN posts p ON p.id=t.post_id JOIN actors a ON a.id=t.author_id WHERE t.community_id=? AND p.deleted=0 AND p.hidden=0 AND a.kind='human' ORDER BY t.created DESC LIMIT 1000",communityId))
    pairs.push({postId:r.post_id,localText:r.ptext,idText:r.text,local:tokenize(r.ptext).filter(t=>!t.skip&&t.norm.length>=3&&!this.contact(t.norm)).map(t=>t.norm),indonesian:indonesianWords(r.text)})
   for(const a of align(pairs)){
    if(forms.has(a.local))continue
    aligned.set(a.local,{indonesian:a.indonesian,dice:a.dice,together:a.together,pairs:pairs.filter(p=>p.local.includes(a.local)&&p.indonesian.includes(a.indonesian)).slice(0,3).map(p=>({postId:p.postId,local:p.localText.slice(0,240),indonesian:p.idText.slice(0,240)}))})
   }
  }
  const h={version,at:s.clock(),forms,freq,aligned}
  this.cache.set(communityId,h)
  return h
 }
 private contact(n:string){return this.lexicon.contact.has(n)||ENGLISH.has(n)}

 private light(actor:string|undefined,communityId:string):Light{
  const s=this.s,claims=new Map<string,string>()
  for(const c of s.all<{id:string;state:string}>("SELECT id,state FROM claims WHERE community_id=? AND kind IN ('word','name')",communityId))claims.set(c.id,c.state)
  const answered=new Set<string>(actor?s.all<{claim_id:string}>('SELECT a.claim_id FROM claim_answers a JOIN claims c ON c.id=a.claim_id WHERE a.actor_id=? AND c.community_id=?',actor,communityId).map(r=>r.claim_id):[])
  // A member's own proposal is not a question for them either.
  if(actor)for(const r of s.all<{id:string}>("SELECT id FROM claims WHERE community_id=? AND proposer_id=? AND origin<>'source'",communityId,actor))answered.add(r.id)
  const skipped=new Set<string>(actor?s.all<{key:string}>('SELECT key FROM kamus_answers_skipped WHERE actor_id=? AND community_id=?',actor,communityId).map(r=>r.key):[])
  const byKey=new Map<string,QRow>(),stemForms=new Map<string,string>()
  for(const q of s.all<QRow>('SELECT * FROM kamus_questions WHERE community_id=?',communityId)){byKey.set(q.key,q);if(q.kind==='stem'&&claims.get(q.claim_id)==='checked'&&q.entry_id)stemForms.set(q.form,q.entry_id)}
  return {claims,answered,skipped,byKey,stemForms,classes:this.classes(communityId)}
 }
 /** A word's class is decided once as many members as the quorum chose it, and more chose it than any other. */
 private classes(communityId:string){
  const quorum=this.periksa.quorum(communityId),votes=new Map<string,Map<string,number>>(),out=new Map<string,WordClass>()
  for(const r of this.s.all<{norm:string;word_class:string;n:number}>('SELECT norm,word_class,COUNT(*) n FROM kamus_classes WHERE community_id=? GROUP BY norm,word_class',communityId)){const m=votes.get(r.norm)??new Map();m.set(r.word_class,r.n);votes.set(r.norm,m)}
  for(const [n,m] of votes){const sorted=[...m].sort((a,b)=>b[1]-a[1]);if(sorted[0][1]>=quorum&&(sorted.length<2||sorted[0][1]>sorted[1][1]))out.set(n,sorted[0][0] as WordClass)}
  return out
 }
 private refState(r:Ref,l:Light){return r.claimId?(l.claims.get(r.claimId)??'withdrawn'):r.row}

 /** What a word is to the Kamus right now: checked, an open question, or nothing yet. */
 private classify(norm:string,h:Heavy,l:Light,suffixes:string[],showSensitive:boolean){
  const refs=(h.forms.get(norm)??[]).filter(r=>showSensitive||!r.sensitive)
  const known=(n:string)=>(h.forms.get(n)??[]).some(r=>showSensitive||!r.sensitive)
  const checked=refs.find(r=>this.refState(r,l)==='checked')
  if(checked)return {state:'checked' as const,ref:checked,cls:l.classes.get(norm)??''}
  const stemEntry=l.stemForms.get(norm)
  if(stemEntry){const ref=[...h.forms.values()].flat().find(r=>r.id===stemEntry);if(ref&&(showSensitive||!ref.sensitive))return {state:'checked' as const,ref,cls:l.classes.get(norm)??l.classes.get(kamusNorm(ref.lemma))??''}}
  const open=refs.filter(r=>{const st=this.refState(r,l);return ['seed','proposed','open','split'].includes(st)||(st==='withdrawn'&&r.row==='seed')})
  // An entry with a meaning comes first; among those, one already being checked.
  const best=open.sort((a,b)=>Number(!!b.gloss)-Number(!!a.gloss)||Number(!!b.claimId)-Number(!!a.claimId))[0]
  if(best&&best.gloss)return {state:'entry' as const,ref:best}
  if(refs.length)return {state:'rejected' as const,ref:refs[0]}
  if(norm.length<3||this.contact(norm))return {state:'none' as const}
  const m=matchWord(norm,known,suffixes)
  if(m?.kind==='stem'){const ref=(h.forms.get(m.stem!)??[]).find(r=>!!r.gloss&&(showSensitive||!r.sensitive));if(ref)return {state:'stem' as const,ref,stem:m.stem!,suffix:m.suffix!}}
  const al=h.aligned.get(norm)
  if(al)return {state:'align' as const,align:al}
  const u=h.freq?.get(norm)
  if(u&&u.uses>=3&&u.authors.size>=2)return {state:'frequent' as const}
  return {state:'none' as const}
 }
 /** The open question about a word for this reader, or null. */
 private question(norm:string,form:string,h:Heavy,l:Light,suffixes:string[],showSensitive:boolean):Question|null{
  const c=this.classify(norm,h,l,suffixes,showSensitive),weight=h.freq?.get(norm)?.uses??0
  const closed=(claimId:string|null)=>!!claimId&&['checked','rejected'].includes(l.claims.get(claimId)??'')
  if(c.state==='entry'){
   const r=c.ref,claimId=r.claimId&&l.claims.get(r.claimId)!=='withdrawn'?r.claimId:null
   if(closed(claimId))return null
   return {key:'entry:'+r.id,kind:'entry',form,text:'Artinya '+r.gloss+'?',gloss:r.gloss,stem:'',suffix:'',wordClass:'',source:sourceLabel(r.source),licence:r.licence,claimId,weight}
  }
  if(c.state==='stem'){
   const key='stem:'+norm+':'+c.stem,q=l.byKey.get(key),claimId=q&&l.claims.get(q.claim_id)!=='withdrawn'?q.claim_id:null
   if(closed(claimId))return null
   return {key,kind:'stem',form,text:'Bentuk dari '+c.ref.lemma+'?',gloss:c.ref.gloss,stem:c.ref.lemma,suffix:c.suffix,wordClass:'',source:sourceLabel(c.ref.source),licence:c.ref.licence,claimId,weight}
  }
  if(c.state==='align'){
   const key='align:'+norm+':'+c.align.indonesian,q=l.byKey.get(key),claimId=q&&l.claims.get(q.claim_id)!=='withdrawn'?q.claim_id:null
   if(closed(claimId))return null
   const cls=guessClass(c.align.indonesian)
   return {key,kind:'align',form,text:'Artinya '+c.align.indonesian+'?'+(cls?' ('+CLASS_LABEL[cls]+')':''),gloss:c.align.indonesian,stem:'',suffix:'',wordClass:cls,source:'Dari terjemahan anggota',licence:'',claimId,weight}
  }
  if(c.state==='frequent')return {key:'frequent:'+norm,kind:'frequent',form,text:'Kata ini belum ada di kamus',gloss:'',stem:'',suffix:'',wordClass:'',source:'',licence:'',claimId:null,weight}
  return null
 }
 private openFor(q:Question|null,l:Light){return !!q&&!l.skipped.has(q.key)&&!(q.claimId&&l.answered.has(q.claimId))}

 /** Underlines and checked words for the posts a reader sees, from the server's own copy of each post. */
 annotate(actor:string|undefined,postIds:string[]){
  const out:Record<string,{u:[number,number,string,QuestionKind][];c:[number,number,string][];a:number}>={}
  const byCommunity=new Map<string,{id:string;text:string;tokens:Token[]}[]>()
  for(const id of [...new Set(postIds)].slice(0,60)){
   const p=this.s.get<{id:string;community_id:string;text:string;deleted:number;content:string;kind:string}>("SELECT p.id,p.community_id,p.text,p.deleted,p.content,a.kind FROM posts p JOIN actors a ON a.id=p.author_id WHERE p.id=? AND p.hidden=0",id)
   if(!p||p.deleted||p.kind!=='human')continue
   if(!this.s.canRead(actor,this.s.community(p.community_id))||!this.on(p.community_id))continue
   if((JSON.parse(p.content||'{}') as {format?:string}).format==='markdown')continue
   byCommunity.set(p.community_id,[...(byCommunity.get(p.community_id)??[]),{id:p.id,text:p.text,tokens:tokenize(p.text)}])
  }
  for(const [communityId,posts] of byCommunity){
   const h=this.heavy(communityId),l=this.light(actor,communityId),suffixes=this.suffixes(communityId).list,member=this.isMember(actor,communityId)
   const counts=new Map(this.s.all<{post_id:string;n:number}>(`SELECT post_id,COUNT(*) n FROM kamus_artinya WHERE post_id IN (${posts.map(()=>'?').join(',')}) GROUP BY post_id`,...posts.map(p=>p.id)).map(r=>[r.post_id,r.n]))
   for(const p of posts){
    const cands:Candidate[]=[],kinds=new Map<string,QuestionKind>(),checked:[number,number,string][]=[]
    for(const t of p.tokens){
     if(t.skip||t.norm.length<3)continue
     const c=this.classify(t.norm,h,l,suffixes,member)
     if(c.state==='checked'){checked.push([t.start,t.end,c.cls]);continue}
     // Visitors of a public community see checked words only; questions are for members.
     if(!member)continue
     const q=this.question(t.norm,t.text,h,l,suffixes,member)
     if(this.openFor(q,l)){cands.push({token:t,key:q!.key,weight:q!.weight});kinds.set(q!.key,q!.kind)}
    }
    out[p.id]={u:chooseUnderlines(cands).map(c=>[c.token.start,c.token.end,c.key,kinds.get(c.key)!]),c:checked,a:counts.get(p.id)??0}
   }
  }
  return out
 }

 /** Everything the word card shows for one word. */
 word(actor:string|undefined,communityId:string,form:string,postId?:string){
  this.readable(actor,communityId)
  if(!this.on(communityId))throw new Fault(409,'This community has no Kamus')
  const word=clean(form,60),n=kamusNorm(word)
  if(!n||!/^\p{L}/u.test(n))throw new Fault(400,'Word required')
  const h=this.heavy(communityId),l=this.light(actor,communityId),member=this.isMember(actor,communityId),suffixes=this.suffixes(communityId).list
  const set=this.kamus.settings(communityId),quorum=this.periksa.quorum(communityId)
  const c=this.classify(n,h,l,suffixes,member)
  const q=member?this.question(n,word,h,l,suffixes,member):null
  const senses=(h.forms.get(n)??[]).filter(r=>member||!r.sensitive).map(r=>this.sense(r,l)).filter(x=>member||x.state==='checked')
  const stemRef=c.state==='stem'?c.ref:c.state==='checked'&&!senses.length?c.ref:null
  const stem=stemRef?{stem:stemRef.lemma,suffix:c.state==='stem'?c.suffix:'',senses:(h.forms.get(kamusNorm(stemRef.lemma))??[]).filter(r=>member||!r.sensitive).map(r=>this.sense(r,l)).filter(x=>member||x.state==='checked')}:null
  const claim=q?.claimId?this.claimSummary(q.claimId,actor):null
  const votes=Object.fromEntries(WORD_CLASSES.map(k=>[k,0])) as Record<WordClass,number>
  for(const r of this.s.all<{word_class:WordClass;n:number}>('SELECT word_class,COUNT(*) n FROM kamus_classes WHERE community_id=? AND norm=? GROUP BY word_class',communityId,n))votes[r.word_class]=r.n
  const myClass=actor?this.s.get<{word_class:WordClass}>('SELECT word_class FROM kamus_classes WHERE community_id=? AND norm=? AND actor_id=?',communityId,n,actor)?.word_class??null:null
  const mine=actor&&member?this.s.get<{saved:number;gloss:string;word_class:string}>('SELECT saved,gloss,word_class FROM kamus_mine WHERE actor_id=? AND community_id=? AND norm=?',actor,communityId,n)??null:null
  const u=member?h.freq?.get(n):undefined
  const al=member?h.aligned.get(n):undefined
  return {
   form:word,norm:n,language:set.languageName,quorum,
   state:c.state==='checked'?'checked':q?'question':senses.length?'known':'new',
   question:q?{...q,claim,answered:!this.openFor(q,l)}:null,
   senses,stem,
   wordClass:l.classes.get(n)??null,classVotes:votes,myClass,
   aligned:al?{indonesian:al.indonesian,wordClass:guessClass(al.indonesian),together:al.together}:null,
   uses:u?{uses:u.uses,speakers:u.authors.size}:null,
   mine:mine?{saved:!!mine.saved,gloss:mine.gloss,wordClass:mine.word_class}:null,
   canAnswer:member&&!!actor&&this.s.actor(actor).kind==='human',
   postId:postId??null,
  }
 }
 private sense(r:Ref,l:Light){
  const st=this.refState(r,l)
  return {id:r.id,lemma:r.lemma,gloss:r.gloss,pos:r.pos,context:r.context,dialect:r.dialect,variants:r.variants,source:sourceLabel(r.source),licence:r.licence,page:r.page,state:st==='withdrawn'?(r.row==='seed'?'seed':'proposed'):st==='open'?'proposed':st,sensitive:r.sensitive}
 }
 private claimSummary(id:string,actor?:string){
  const c=this.s.get<{state:string;proposer_id:string;origin:string}>('SELECT state,proposer_id,origin FROM claims WHERE id=?',id);if(!c)return null
  const n=(a:string)=>this.s.get<{n:number}>('SELECT COUNT(*) n FROM claim_answers WHERE claim_id=? AND answer=?',id,a)!.n
  const mine=actor?this.s.get<{answer:string}>('SELECT answer FROM claim_answers WHERE claim_id=? AND actor_id=?',id,actor)?.answer??null:null
  return {id,state:c.state,yes:n('yes'),no:n('no'),mine,proposedByMe:!!actor&&c.proposer_id===actor&&c.origin!=='source'}
 }

 /** Evidence for a new claim: sentences from posts, each linked to its post so it disappears with it. */
 private evidence(communityId:string,norm:string,postId?:string):Evidence[]{
  const out:Evidence[]=[]
  if(postId){
   const p=this.s.get<{id:string;text:string}>('SELECT id,text FROM posts WHERE id=? AND community_id=? AND deleted=0 AND hidden=0',postId,communityId)
   const t=p&&tokenize(p.text).find(x=>x.norm===norm)
   if(p&&t)out.push({text:sentenceAround(p.text,t).slice(0,240),postId:p.id})
  }
  for(const e of this.heavy(communityId).freq?.get(norm)?.examples??[])if(out.length<3&&!out.some(x=>x.postId===e.postId))out.push({text:e.text,postId:e.postId})
  return out
 }
 private sourceEvidence(r:Ref):Evidence[]{
  if(!r.source.startsWith('seed:'))return []
  const page=r.page?', hlm. '+r.page:''
  return [{text:`Dari ${sourceLabel(r.source)}${page}: "${r.lemma}" artinya "${r.gloss}".`,source:`${sourceLabel(r.source)}${r.licence?', '+r.licence:''}`}]
 }

 /** One answer from the word card or the deck. Yes and no count toward the quorum; "skip" only stops the question
  * for this member; "other" says no and proposes the member's own meaning as a new entry. Never a fact by itself. */
 answer(actor:string,communityId:string,b:{key?:unknown;answer?:unknown;text?:unknown;wordClass?:unknown;postId?:unknown;form?:unknown}){
  const s=this.s;return s.tx(()=>{
   this.member(actor,communityId)
   const key=clean(b.key,200),answer=b.answer,postId=typeof b.postId==='string'?b.postId:undefined
   if(!['yes','no','skip','other',undefined].includes(answer as string))throw new Fault(400,'Invalid answer')
   const form=clean(b.form,60)||key.split(':')[1]||''
   if(b.wordClass!==undefined&&b.wordClass!==null){
    if(!(WORD_CLASSES as readonly string[]).includes(String(b.wordClass)))throw new Fault(400,'Invalid word class')
    const n=kamusNorm(form);if(!n)throw new Fault(400,'Word required')
    s.run('INSERT INTO kamus_classes VALUES(?,?,?,?,?) ON CONFLICT(community_id,norm,actor_id) DO UPDATE SET word_class=excluded.word_class,created=excluded.created',communityId,n,actor,String(b.wordClass),s.clock())
   }
   if(answer===undefined)return {ok:true,word:this.word(actor,communityId,form,postId)}
   if(!key)throw new Fault(400,'Question required')
   if(answer==='skip'){s.run('INSERT OR IGNORE INTO kamus_answers_skipped VALUES(?,?,?,?)',actor,communityId,key,s.clock());return {ok:true,word:this.word(actor,communityId,form,postId)}}
   if(answer==='other'||key.startsWith('frequent:')||key.startsWith('new:')){
    const text=clean(b.text,160);if(!text)throw new Fault(400,'Meaning required')
    const claimId=key.startsWith('frequent:')||key.startsWith('new:')?null:this.ensureClaim(actor,communityId,key,postId)
    if(claimId&&this.claimSummary(claimId,actor)?.proposedByMe===false)this.periksa.answer(actor,claimId,{answer:'no'})
    this.proposeMeaning(actor,communityId,form,text,{parentId:claimId,postId,wordClass:typeof b.wordClass==='string'?b.wordClass as WordClass:''})
    return {ok:true,word:this.word(actor,communityId,form,postId)}
   }
   const claimId=this.ensureClaim(actor,communityId,key,postId)
   this.periksa.answer(actor,claimId,{answer})
   this.cache.delete(communityId)
   return {ok:true,word:this.word(actor,communityId,form,postId)}
  })
 }
 /** The claim behind a question, made the first time anyone answers it. Two members answering at once meet the
  * same claim, because the key is looked up and written inside one transaction. */
 private ensureClaim(actor:string,communityId:string,key:string,postId?:string){
  const s=this.s,[kind,a,b2]=key.split(':')
  if(kind==='claim'){
   const c=s.get<{state:string}>("SELECT state FROM claims WHERE id=? AND community_id=? AND kind IN ('word','name')",a,communityId)
   if(!c||c.state==='withdrawn')throw new Fault(404,'Not found')
   return a
  }
  if(kind==='entry'){
   const r=s.get<EntryRow>('SELECT * FROM kamus_entries WHERE id=? AND community_id=?',a,communityId)
   if(!r||!r.gloss)throw new Fault(404,'Not found')
   if(r.sensitive&&!this.isMember(actor,communityId))throw new Fault(404,'Not found')
   if(r.claim_id&&s.get<{state:string}>('SELECT state FROM claims WHERE id=?',r.claim_id)?.state!=='withdrawn')return r.claim_id
   // A member's meaning that was withdrawn stays withdrawn; only a written source's meaning is asked again.
   if(!r.source.startsWith('seed:'))throw new Fault(409,'This question is no longer open')
   const ref=this.heavy(communityId).forms.get(r.norm)?.find(x=>x.id===r.id)
   const claim=this.periksa.propose(actor,communityId,{kind:'word',subject:r.lemma,statement:`"${r.lemma}" artinya "${r.gloss}".`,evidence:[...(ref?this.sourceEvidence(ref):[]),...this.evidence(communityId,r.norm,postId)].slice(0,5)},null,'source')
   s.run("UPDATE kamus_entries SET claim_id=?,updated=? WHERE id=?",claim.id,s.clock(),r.id)
   return claim.id
  }
  const existing=s.get<QRow>('SELECT * FROM kamus_questions WHERE community_id=? AND key=?',communityId,key)
  if(existing&&s.get<{state:string}>('SELECT state FROM claims WHERE id=?',existing.claim_id)?.state!=='withdrawn')return existing.claim_id
  const h=this.heavy(communityId),suffixes=this.suffixes(communityId).list
  let claimId:string,row:Omit<QRow,'key'|'claim_id'>
  if(kind==='stem'){
   const known=(n:string)=>(h.forms.get(n)??[]).some(r=>!!r.gloss)
   const m=stripSuffix(a,suffixes,known)
   if(!m||m.stem!==b2||this.contact(a))throw new Fault(409,'This question is no longer open')
   const ref=(h.forms.get(m.stem)??[]).find(r=>!!r.gloss)!
   claimId=this.periksa.propose(actor,communityId,{kind:'word',subject:a,statement:`"${a}" adalah bentuk dari "${ref.lemma}" ("${ref.gloss}"), dengan akhiran -${m.suffix}.`,evidence:[...this.sourceEvidence(ref),...this.evidence(communityId,a,postId)].slice(0,5)},null,'source').id
   row={kind:'stem',form:a,entry_id:ref.id,stem:ref.lemma,suffix:m.suffix,gloss:ref.gloss,word_class:'',subject:''}
  }else if(kind==='align'){
   const al=h.aligned.get(a)
   if(!al||al.indonesian!==b2)throw new Fault(409,'This question is no longer open')
   const cls=guessClass(al.indonesian)
   claimId=this.periksa.propose(actor,communityId,{kind:'word',subject:a,statement:`"${a}" artinya "${al.indonesian}"${cls?' ('+CLASS_LABEL[cls]+')':''}. Tebakan ini dihitung dari ${al.together} posting yang punya terjemahan.`,evidence:al.pairs.map(p=>({text:p.local+' / '+p.indonesian,postId:p.postId}))},null,'source').id
   row={kind:'align',form:a,entry_id:null,stem:'',suffix:'',gloss:al.indonesian,word_class:cls,subject:''}
  }else throw new Fault(400,'Unknown question')
  if(existing)s.run('UPDATE kamus_questions SET claim_id=? WHERE id=?',claimId,(existing as QRow&{id:string}).id)
  else s.run('INSERT INTO kamus_questions(id,community_id,key,kind,form,entry_id,stem,suffix,gloss,word_class,subject,claim_id,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),communityId,key,row.kind,row.form,row.entry_id,row.stem,row.suffix,row.gloss,row.word_class,row.subject,claimId,s.clock())
  return claimId
 }
 /** A member's own meaning becomes an entry with its own claim. If someone already proposed the same meaning for
  * the same word, this counts as agreeing with it instead. */
 private proposeMeaning(actor:string,communityId:string,form:string,gloss:string,o:{parentId?:string|null;postId?:string;wordClass?:WordClass|'';source?:string;context?:string;kind?:'word'|'name';statement?:string;question?:{kind:'concept'|'picture';subject:string}}){
  const s=this.s,n=kamusNorm(form)
  if(!n||!/^\p{L}[\p{L}\p{M}'’ -]*$/u.test(n)||n.length>40)throw new Fault(400,'A word is required')
  const same=s.get<{id:string;claim_id:string}>("SELECT e.id,e.claim_id FROM kamus_entries e JOIN claims c ON c.id=e.claim_id WHERE e.community_id=? AND e.norm=? AND lower(e.gloss)=lower(?) AND c.state NOT IN ('withdrawn')",communityId,n,gloss)
  if(same){const c=this.claimSummary(same.claim_id,actor);if(c&&!c.proposedByMe&&c.state!=='withdrawn')this.periksa.answer(actor,same.claim_id,{answer:'yes'});return same.claim_id}
  const claim=this.periksa.propose(actor,communityId,{kind:o.kind??'word',subject:form,statement:o.statement??`"${form}" artinya "${gloss}".`,evidence:this.evidence(communityId,n,o.postId)},o.parentId??null)
  const id=randomUUID()
  s.run('INSERT INTO kamus_entries(id,community_id,lemma,norm,gloss,pos,context,source,licence,page,state,claim_id,uses,speakers,examples,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,communityId,form,n,gloss,o.wordClass?CLASS_LABEL[o.wordClass]:'',o.context??'Lainnya',o.source??'room','',null,'proposed',claim.id,0,0,'[]',s.clock(),s.clock())
  if(o.question)s.run('INSERT INTO kamus_questions(id,community_id,key,kind,form,entry_id,stem,suffix,gloss,word_class,subject,claim_id,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),communityId,o.question.kind+':'+o.question.subject+':'+n,o.question.kind,n,id,'','',gloss,o.wordClass??'',o.question.subject,claim.id,s.clock())
  this.cache.delete(communityId)
  return claim.id
 }

 /** The open questions for this member, for the notice card and the deck. */
 questions(actor:string,communityId:string,limit=20){
  this.member(actor,communityId)
  const h=this.heavy(communityId),l=this.light(actor,communityId),suffixes=this.suffixes(communityId).list,week=this.s.clock()-7*DAY
  const seen=new Set<string>(),open:(Question&{recent:boolean;examples:{postId:string;text:string}[]})[]=[]
  for(const [n,u] of h.freq??[]){
   const q=this.question(n,n,h,l,suffixes,true)
   if(!q||!this.openFor(q,l)||seen.has(q.key))continue
   seen.add(q.key);open.push({...q,recent:u.last>=week,examples:u.examples.filter(e=>!!this.s.get('SELECT 1 FROM posts WHERE id=? AND deleted=0 AND hidden=0',e.postId))})
  }
  open.sort((a,b)=>b.weight-a.weight||a.form.localeCompare(b.form))
  // Answers others gave to Kata hari ini, picture questions and written meanings wait in the deck too.
  const claims=this.periksa.queue(actor,communityId).claims.filter(c=>c.kind==='word'||c.kind==='name')
  const linked=new Set(open.map(q=>q.claimId).filter(Boolean))
  const cards=[...open.slice(0,limit).map(q=>({...q,claim:q.claimId?this.claimSummary(q.claimId,actor):null})),
   ...claims.filter(c=>!linked.has(c.id)).slice(0,limit).map(c=>({key:'claim:'+c.id,kind:'claim' as const,form:c.subject,text:c.statement,gloss:'',stem:'',suffix:'',wordClass:'' as const,source:c.origin==='source'?(c.evidence.find(e=>e.source)?.source??''):'Diusulkan oleh '+c.proposer.name,licence:'',claimId:c.id,weight:0,recent:true,examples:c.evidence.filter(e=>e.postId).map(e=>({postId:e.postId!,text:e.text})),claim:this.claimSummary(c.id,actor)}))]
  return {reading:!!h.freq,open:open.length,week:open.filter(q=>q.recent).length,claims:claims.length,quorum:this.periksa.quorum(communityId),cards:cards.slice(0,limit)}
 }

 /** Kata saya: a member's own glossary for this community. Private to them and read only while they can still read
  * the community. */
 mine(actor:string,communityId:string){
  this.readable(actor,communityId);if(!this.isMember(actor,communityId))throw new Fault(404,'Not found')
  const h=this.heavy(communityId),l=this.light(actor,communityId),suffixes=this.suffixes(communityId).list
  return this.s.all<{norm:string;form:string;gloss:string;word_class:string;post_id:string|null;saved:number;updated:number}>('SELECT norm,form,gloss,word_class,post_id,saved,updated FROM kamus_mine WHERE actor_id=? AND community_id=? ORDER BY saved DESC,updated DESC LIMIT 400',actor,communityId).map(r=>{
   const c=this.classify(r.norm,h,l,suffixes,true),post=r.post_id?this.s.get<{id:string;text:string}>('SELECT id,text FROM posts WHERE id=? AND deleted=0 AND hidden=0',r.post_id):undefined
   const t=post&&tokenize(post.text).find(x=>x.norm===r.norm)
   return {norm:r.norm,form:r.form,gloss:r.gloss,wordClass:r.word_class,saved:!!r.saved,updated:r.updated,kamus:c.state==='checked'?{gloss:c.ref.gloss,wordClass:c.cls}:null,example:post&&t?{postId:post.id,text:sentenceAround(post.text,t).slice(0,200)}:null}
  })
 }
 saveMine(actor:string,communityId:string,b:{form?:unknown;postId?:unknown;saved?:unknown;gloss?:unknown;wordClass?:unknown;remove?:unknown}){
  const s=this.s;return s.tx(()=>{
   this.member(actor,communityId)
   const form=clean(b.form,60),n=kamusNorm(form);if(!n)throw new Fault(400,'Word required')
   if(b.remove===true){s.run('DELETE FROM kamus_mine WHERE actor_id=? AND community_id=? AND norm=?',actor,communityId,n);return {ok:true}}
   const cls=b.wordClass===undefined?undefined:String(b.wordClass??'')
   if(cls&&!(WORD_CLASSES as readonly string[]).includes(cls))throw new Fault(400,'Invalid word class')
   const postId=typeof b.postId==='string'&&s.get('SELECT 1 FROM posts WHERE id=? AND community_id=?',b.postId,communityId)?b.postId:null
   const prev=s.get<{gloss:string;word_class:string;saved:number;post_id:string|null}>('SELECT gloss,word_class,saved,post_id FROM kamus_mine WHERE actor_id=? AND community_id=? AND norm=?',actor,communityId,n)
   const row={gloss:b.gloss===undefined?prev?.gloss??'':clean(b.gloss,160),cls:cls??prev?.word_class??'',saved:b.saved===undefined?prev?.saved??0:b.saved===true?1:0,post:postId??prev?.post_id??null}
   s.run('INSERT INTO kamus_mine VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(actor_id,community_id,norm) DO UPDATE SET form=excluded.form,gloss=excluded.gloss,word_class=excluded.word_class,post_id=excluded.post_id,saved=excluded.saved,updated=excluded.updated',actor,communityId,n,form,row.gloss,row.cls,row.post,row.saved,s.clock(),s.clock())
   return {ok:true,saved:!!row.saved}
  })
 }

 /** Artinya: Indonesian translations of a post. The author writes one in the composer; any member can add one to
  * someone else's post. A translation is edited by its writer and removed by its writer, the post's author or a
  * steward. */
 private post(actor:string|undefined,postId:string){
  const p=this.s.get<{id:string;community_id:string;author_id:string;deleted:number}>('SELECT id,community_id,author_id,deleted FROM posts WHERE id=? AND hidden=0',postId)
  if(!p||p.deleted||!this.s.canRead(actor,this.s.community(p.community_id)))throw new Fault(404,'Not found')
  return p
 }
 artinya(actor:string|undefined,postId:string){
  const p=this.post(actor,postId),steward=!!actor&&['owner','moderator'].includes(this.s.membership(actor,p.community_id)?.role??'')
  return this.s.all<{id:string;author_id:string;text:string;created:number;updated:number}>('SELECT id,author_id,text,created,updated FROM kamus_artinya WHERE post_id=? ORDER BY (author_id=?) DESC,created',postId,p.author_id).map(r=>{
   const a=this.s.actor(r.author_id)
   return {id:r.id,author:{id:a.id,name:a.name},byPostAuthor:r.author_id===p.author_id,text:r.text,created:r.created,updated:r.updated,canEdit:actor===r.author_id,canRemove:!!actor&&(actor===r.author_id||actor===p.author_id||steward)}
  })
 }
 setArtinya(actor:string,postId:string,text:unknown){
  const s=this.s;return s.tx(()=>{
   const p=this.post(actor,postId);this.member(actor,p.community_id)
   const t=typeof text==='string'?text.trim():'';if(!t)throw new Fault(400,'Translation required');if(t.length>4000)throw new Fault(400,'Translation too long')
   const prev=s.get<{id:string}>('SELECT id FROM kamus_artinya WHERE post_id=? AND author_id=?',postId,actor)
   if(prev)s.run('UPDATE kamus_artinya SET text=?,updated=? WHERE id=?',t,s.clock(),prev.id)
   else{
    if(s.get<{n:number}>('SELECT COUNT(*) n FROM kamus_artinya WHERE author_id=? AND created>?',actor,s.clock()-60000)!.n>=20)throw new Fault(429,'Please wait before adding more')
    s.run('INSERT INTO kamus_artinya VALUES(?,?,?,?,?,?,?)',randomUUID(),postId,p.community_id,actor,t,s.clock(),s.clock())
   }
   this.cache.delete(p.community_id)
   return this.artinya(actor,postId)
  })
 }
 removeArtinya(actor:string,postId:string,b:{authorId?:unknown}){
  const s=this.s;return s.tx(()=>{
   const p=this.post(actor,postId);s.requireMember(actor,p.community_id)
   const author=typeof b.authorId==='string'?b.authorId:actor
   if(author!==actor&&actor!==p.author_id)s.requireSteward(actor,p.community_id)
   s.run('DELETE FROM kamus_artinya WHERE post_id=? AND author_id=?',postId,author)
   if(author!==actor)s.audit(actor,'kamus.artinya.remove',postId)
   this.cache.delete(p.community_id)
   return this.artinya(actor,postId)
  })
 }

 private day(){return Math.floor(this.s.clock()/DAY)}
 private answersFor(communityId:string,kind:'concept'|'picture',subject:string,actor:string){
  return this.s.all<{claim_id:string;form:string}>('SELECT claim_id,form FROM kamus_questions WHERE community_id=? AND kind=? AND subject=?',communityId,kind,subject).map(r=>({claimId:r.claim_id,form:this.s.get<{subject:string}>('SELECT subject FROM claims WHERE id=?',r.claim_id)?.subject??r.form,...this.claimSummary(r.claim_id,actor)!})).filter(a=>a.state!=='withdrawn')
 }
 /** Kata hari ini and today's picture question for this community, the same for every member on one day. */
 today(actor:string,communityId:string){
  this.member(actor,communityId)
  const set=this.kamus.settings(communityId),day=this.day()
  const settled=(kind:'concept'|'picture')=>new Set(this.s.all<{subject:string}>("SELECT q.subject FROM kamus_questions q JOIN claims c ON c.id=q.claim_id WHERE q.community_id=? AND q.kind=? AND c.state='checked'",communityId,kind).map(r=>r.subject))
  const doneC=settled('concept'),concepts=this.concepts.concepts.filter(c=>!doneC.has(String(c.n)))
  const concept=concepts.length?concepts[day%concepts.length]:null
  const doneP=settled('picture'),species=this.species.filter(r=>!doneP.has(r.id))
  const sp=species.length?species[day%species.length]:null
  return {
   language:set.languageName,
   concept:concept?{n:concept.n,prompt:concept.id,english:concept.english,wordClass:concept.class,source:'Leipzig-Jakarta (Concepticon '+this.concepts.list+'), '+this.concepts.licence,answers:this.answersFor(communityId,'concept',String(concept.n),actor)}:null,
   picture:sp?{slug:sp.id,title:sp.title,scientific:sp.subtitle,thumb:sp.thumb,entry:sp.entry?.slug??sp.id,kind:taxonWord(sp),answers:this.answersFor(communityId,'picture',sp.id,actor)}:null,
   publicNames:this.s.community(communityId).visibility==='public',
  }
 }
 /** An answer to Kata hari ini or a picture question. The same word from two members counts as agreement. */
 answerToday(actor:string,communityId:string,b:{concept?:unknown;species?:unknown;text?:unknown}){
  const s=this.s;return s.tx(()=>{
   this.member(actor,communityId)
   const text=clean(b.text,40);if(!text)throw new Fault(400,'A word is required')
   const lang=this.kamus.settings(communityId).languageName||'daerah'
   if(b.concept!==undefined){
    const c=this.concepts.concepts.find(x=>x.n===Number(b.concept));if(!c)throw new Fault(404,'Not found')
    const prior=s.get<{claim_id:string}>('SELECT claim_id FROM kamus_questions WHERE community_id=? AND key=?',communityId,'concept:'+c.n+':'+kamusNorm(text))
    if(prior&&this.claimSummary(prior.claim_id,actor)?.state!=='withdrawn'){const cs=this.claimSummary(prior.claim_id,actor)!;if(!cs.proposedByMe)this.periksa.answer(actor,prior.claim_id,{answer:'yes'})}
    else this.proposeMeaning(actor,communityId,text,c.id,{wordClass:c.class,source:'concept',statement:`"${text}" artinya "${c.id}" dalam bahasa ${lang}.`,question:{kind:'concept',subject:String(c.n)}})
    return this.today(actor,communityId)
   }
   const sp=this.species.find(r=>r.id===b.species);if(!sp)throw new Fault(404,'Not found')
   const prior=s.get<{claim_id:string}>('SELECT claim_id FROM kamus_questions WHERE community_id=? AND key=?',communityId,'picture:'+sp.id+':'+kamusNorm(text))
   if(prior&&this.claimSummary(prior.claim_id,actor)?.state!=='withdrawn'){const cs=this.claimSummary(prior.claim_id,actor)!;if(!cs.proposedByMe)this.periksa.answer(actor,prior.claim_id,{answer:'yes'})}
   else this.proposeMeaning(actor,communityId,text,sp.title,{wordClass:'benda',source:'concept',context:'Alam',kind:'name',statement:`"${text}" adalah nama ${sp.title.toLowerCase()} dalam bahasa ${lang}.`,question:{kind:'picture',subject:sp.id}})
   return this.today(actor,communityId)
  })
 }
 /** A steward marks an entry as not to be shared (Jangan disebarkan): it stays with members, even in a public
  * community, and never becomes a species' local name. */
 setSensitive(actor:string,communityId:string,entryId:string,b:{sensitive?:unknown}){
  const s=this.s;return s.tx(()=>{
   s.requireSteward(actor,communityId);if(s.actor(actor).kind!=='human')throw new Fault(403,'Human steward required')
   if(typeof b.sensitive!=='boolean')throw new Fault(400,'Boolean required')
   if(!s.get('SELECT 1 FROM kamus_entries WHERE id=? AND community_id=?',entryId,communityId))throw new Fault(404,'Not found')
   s.run('UPDATE kamus_entries SET sensitive=?,updated=? WHERE id=?',b.sensitive?1:0,s.clock(),entryId)
   s.audit(actor,b.sensitive?'kamus.sensitive.on':'kamus.sensitive.off',entryId);this.cache.delete(communityId)
   return {sensitive:b.sensitive}
  })
 }
 /** Checked local names of a species, only from public communities and never from an entry marked sensitive. */
 localNames(slug:string){
  return this.s.all<{subject:string;community_id:string;title:string}>("SELECT c.subject,q.community_id,m.title FROM kamus_questions q JOIN claims c ON c.id=q.claim_id JOIN communities m ON m.id=q.community_id LEFT JOIN kamus_entries e ON e.id=q.entry_id WHERE q.kind='picture' AND q.subject=? AND c.state='checked' AND m.visibility='public' AND COALESCE(e.sensitive,0)=0 ORDER BY c.settled",slug)
   .filter(r=>this.on(r.community_id)).map(r=>({name:r.subject,language:this.kamus.settings(r.community_id).languageName,community:{id:r.community_id,title:r.title}}))
 }

 /** The checked Kamus for stewards: one row per sense, with spellings, forms, examples, source and licence. */
 exportRows(actor:string,communityId:string){
  this.s.requireSteward(actor,communityId);if(this.s.actor(actor).kind!=='human')throw new Fault(403,'Human steward required')
  const l=this.light(actor,communityId),set=this.kamus.settings(communityId)
  const forms=new Map<string,string[]>();for(const [f,id] of l.stemForms)forms.set(id,[...(forms.get(id)??[]),f])
  const rows=this.s.all<EntryRow>('SELECT * FROM kamus_entries WHERE community_id=? AND claim_id IS NOT NULL ORDER BY norm,created',communityId).filter(r=>l.claims.get(r.claim_id!)==='checked')
  return {language:set.language,languageName:set.languageName,community:this.s.community(communityId).title,rows:rows.map(r=>{
   const claim=this.s.get<{evidence:string}>('SELECT evidence FROM claims WHERE id=?',r.claim_id!)!
   const examples=(JSON.parse(claim.evidence) as Evidence[]).filter(e=>e.postId&&!!this.s.get('SELECT 1 FROM posts WHERE id=? AND deleted=0 AND hidden=0',e.postId))
   return {id:r.id,headword:r.lemma,variants:(JSON.parse(r.variants||'[]') as {form:string}[]).map(v=>v.form),forms:forms.get(r.id)??[],gloss:r.gloss,definition:r.definition,wordClass:l.classes.get(r.norm)??'',domain:r.context,dialect:r.dialect,examples:examples.map(e=>({postId:e.postId!,text:e.text})),source:sourceLabel(r.source),licence:r.licence||(r.source.startsWith('seed:')?'':'Komunitas'),status:'diperiksa',sensitive:!!r.sensitive}
  })}
 }
}

/** The sentence of a post that holds a token, for an example. */
export function sentenceAround(text:string,t:Token){
 let start=0
 for(const sentence of sentencesOf(text)){const at=text.indexOf(sentence,start);if(at<0)continue;if(t.start>=at&&t.start<at+sentence.length)return sentence;start=at+sentence.length}
 return text.slice(Math.max(0,t.start-80),t.end+80).trim()
}
function taxonWord(r:ViewerRecord){
 const t=r.taxonomy??[]
 if(t.some(x=>x.name==='Aves'))return 'burung'
 if(t.some(x=>x.name==='Lepidoptera'))return 'kupu-kupu'
 if(t.some(x=>x.name==='Mammalia'))return 'hewan'
 if(t.some(x=>x.name==='Plantae'))return 'tumbuhan'
 return 'makhluk'
}
