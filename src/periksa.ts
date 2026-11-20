/** Periksa: members check claims one card at a time. A claim is any short statement about the community's
 * knowledge (a word's meaning, a grammar note, a place name, a date). It settles when enough members agree,
 * and a split result stays visible as a split instead of failing. Claims never leave their community. */
import {randomUUID} from 'node:crypto'
import {StrataCore,Fault} from './core.ts'

export const CLAIM_KINDS=['word','sense','grammar','name','place','date','wiki','other'] as const
export type ClaimKind=typeof CLAIM_KINDS[number]
export type ClaimState='open'|'checked'|'rejected'|'split'|'withdrawn'
export type Evidence={text:string;source?:string}
export type Claim={id:string;communityId:string;kind:ClaimKind;subject:string;statement:string;evidence:Evidence[];proposer:{id:string;name:string;kind:string};parentId:string|null;state:ClaimState;yes:number;no:number;mine:'yes'|'no'|null;created:number}
type Row={id:string;community_id:string;kind:ClaimKind;subject:string;statement:string;evidence:string;proposer_id:string;parent_id:string|null;state:ClaimState;created:number}

export const DEFAULT_QUORUM=2
export const QUEUE_SIZE=10
const text=(v:unknown,max:number,label:string)=>{if(typeof v!=='string'||!v.trim())throw new Fault(400,label+' required');const t=v.replace(/\s+/g,' ').trim();if(t.length>max)throw new Fault(400,label+' too long');return t}

/** The state that follows from the answers. Only a withdrawn claim ignores them. */
export function settle(yes:number,no:number,quorum:number):Exclude<ClaimState,'withdrawn'>{
 if(yes>=quorum&&no>=quorum)return 'split'
 if(yes>=quorum)return 'checked'
 if(no>=quorum)return 'rejected'
 return 'open'
}

export class Periksa{
 private store:StrataCore
 constructor(store:StrataCore){this.store=store}
 quorum(communityId:string){return this.store.get<{quorum:number}>('SELECT quorum FROM claim_settings WHERE community_id=?',communityId)?.quorum??DEFAULT_QUORUM}
 private human(actor:string){if(this.store.actor(actor).kind!=='human')throw new Fault(403,'Human participant required')}
 private row(id:string){return this.store.get<Row>('SELECT * FROM claims WHERE id=?',id)??(()=>{throw new Fault(404,'Not found')})()}
 private view(r:Row,actor?:string):Claim{
  const s=this.store,count=(a:string)=>s.get<{n:number}>('SELECT COUNT(*) n FROM claim_answers WHERE claim_id=? AND answer=?',r.id,a)!.n
  const p=s.actor(r.proposer_id),mine=actor?s.get<{answer:'yes'|'no'}>('SELECT answer FROM claim_answers WHERE claim_id=? AND actor_id=?',r.id,actor)?.answer??null:null
  return {id:r.id,communityId:r.community_id,kind:r.kind,subject:r.subject,statement:r.statement,evidence:JSON.parse(r.evidence),proposer:{id:p.id,name:p.name,kind:p.kind},parentId:r.parent_id,state:r.state,yes:count('yes'),no:count('no'),mine,created:r.created}
 }
 /** A claim is read with its community: members of a private one, anyone for a public one. */
 private readable(actor:string|undefined,communityId:string){if(!this.store.canRead(actor,this.store.community(communityId)))throw new Fault(404,'Not found')}

 propose(actor:string,communityId:string,b:{kind?:unknown;subject?:unknown;statement?:unknown;evidence?:unknown},parentId:string|null=null):Claim{
  const s=this.store;return s.tx(()=>{
   s.requireMember(actor,communityId);this.human(actor)
   if(!CLAIM_KINDS.includes(b.kind as ClaimKind))throw new Fault(400,'Invalid claim kind')
   const evidence=(Array.isArray(b.evidence)?b.evidence:[]).slice(0,5).map(e=>({text:text((e as Evidence)?.text,500,'Evidence'),...(typeof (e as Evidence)?.source==='string'&&(e as Evidence).source!.trim()?{source:text((e as Evidence).source,300,'Source')}:{})}))
   const id=randomUUID()
   s.run('INSERT INTO claims VALUES(?,?,?,?,?,?,?,?,?,?,NULL)',id,communityId,b.kind as ClaimKind,text(b.subject,120,'Subject'),text(b.statement,500,'Statement'),JSON.stringify(evidence),actor,parentId,'open',s.clock())
   return this.view(this.row(id),actor)
  })
 }
 /** Aksara proposes a card only while it may act in this community (an active switch or mandate, checked now),
  * at most 20 a day. Its cards are labelled as AI by their author and never count as answers. */
 proposeAsAgent(agent:string,communityId:string,b:{kind?:unknown;subject?:unknown;statement?:unknown;evidence?:unknown}):Claim{
  const s=this.store;return s.tx(()=>{
   if(s.actor(agent).kind!=='agent')throw new Fault(403,'Agent required')
   s.checkWrite(agent,communityId,s.get<{id:string}>('SELECT id FROM mandates WHERE agent_id=? AND community_id=? AND revoked=0 AND expires>? ORDER BY expires DESC',agent,communityId,s.clock())?.id??null,false)
   const today=s.get<{n:number}>('SELECT COUNT(*) n FROM claims WHERE proposer_id=? AND community_id=? AND created>?',agent,communityId,s.clock()-86400000)!.n
   if(today>=20)throw new Fault(429,'Agent budget exceeded')
   if(!CLAIM_KINDS.includes(b.kind as ClaimKind))throw new Fault(400,'Invalid claim kind')
   const evidence=(Array.isArray(b.evidence)?b.evidence:[]).slice(0,5).map(e=>({text:text((e as Evidence)?.text,500,'Evidence')}))
   const id=randomUUID()
   s.run('INSERT INTO claims VALUES(?,?,?,?,?,?,?,?,?,?,NULL)',id,communityId,b.kind as ClaimKind,text(b.subject,120,'Subject'),text(b.statement,500,'Statement'),JSON.stringify(evidence),agent,null,'open',s.clock())
   return this.view(this.row(id),agent)
  })
 }
 /** The next cards for this member: open, not theirs, not yet answered. Oldest first, so nothing waits forever. */
 queue(actor:string,communityId:string){
  const s=this.store;s.requireMember(actor,communityId);this.human(actor)
  const rows=s.all<Row>(`SELECT c.* FROM claims c WHERE c.community_id=? AND c.state='open' AND c.proposer_id<>? AND NOT EXISTS(SELECT 1 FROM claim_answers a WHERE a.claim_id=c.id AND a.actor_id=?) ORDER BY c.created LIMIT ?`,communityId,actor,actor,QUEUE_SIZE)
  const waiting=s.get<{n:number}>(`SELECT COUNT(*) n FROM claims c WHERE c.community_id=? AND c.state='open' AND c.proposer_id<>? AND NOT EXISTS(SELECT 1 FROM claim_answers a WHERE a.claim_id=c.id AND a.actor_id=?)`,communityId,actor,actor)!.n
  return {quorum:this.quorum(communityId),waiting,claims:rows.map(r=>this.view(r,actor))}
 }
 list(actor:string|undefined,communityId:string,state?:string){
  this.readable(actor,communityId)
  if(state!==undefined&&!['open','checked','rejected','split'].includes(state))throw new Fault(400,'Invalid state')
  const rows=state?this.store.all<Row>('SELECT * FROM claims WHERE community_id=? AND state=? ORDER BY created DESC LIMIT 200',communityId,state):this.store.all<Row>("SELECT * FROM claims WHERE community_id=? AND state<>'withdrawn' ORDER BY created DESC LIMIT 200",communityId)
  return rows.map(r=>this.view(r,actor))
 }
 /** yes or no records an answer; null takes it back; "other" records no and proposes the member's own version. */
 answer(actor:string,id:string,b:{answer?:unknown;text?:unknown}){
  const s=this.store;return s.tx(()=>{
   const r=this.row(id);s.requireMember(actor,r.community_id);this.human(actor)
   if(r.state==='withdrawn')throw new Fault(409,'This claim was withdrawn')
   if(r.proposer_id===actor)throw new Fault(409,'You proposed this claim')
   let created:Claim|null=null
   if(b.answer===null)s.run('DELETE FROM claim_answers WHERE claim_id=? AND actor_id=?',id,actor)
   else{
    const value=b.answer==='other'?'no':b.answer
    if(value!=='yes'&&value!=='no')throw new Fault(400,'Invalid answer')
    if(b.answer==='other')created=this.propose(actor,r.community_id,{kind:r.kind,subject:r.subject,statement:b.text,evidence:JSON.parse(r.evidence)},r.id)
    s.run('INSERT INTO claim_answers VALUES(?,?,?,?) ON CONFLICT(claim_id,actor_id) DO UPDATE SET answer=excluded.answer,created=excluded.created',id,actor,value,s.clock())
   }
   const n=(a:string)=>s.get<{n:number}>('SELECT COUNT(*) n FROM claim_answers WHERE claim_id=? AND answer=?',id,a)!.n
   const next=settle(n('yes'),n('no'),this.quorum(r.community_id))
   if(next!==r.state)s.run('UPDATE claims SET state=?,settled=? WHERE id=?',next,next==='open'?null:s.clock(),id)
   return {claim:this.view(this.row(id),actor),created}
  })
 }
 /** The proposer or a steward withdraws a claim; it leaves every queue and list. */
 withdraw(actor:string,id:string){
  const s=this.store;return s.tx(()=>{
   const r=this.row(id);s.requireMember(actor,r.community_id)
   if(r.proposer_id!==actor)s.requireSteward(actor,r.community_id)
   s.run("UPDATE claims SET state='withdrawn',settled=? WHERE id=?",s.clock(),id)
   s.run('DELETE FROM claim_answers WHERE claim_id=?',id)
   return this.view(this.row(id),actor)
  })
 }
 setQuorum(actor:string,communityId:string,quorum:unknown){
  const s=this.store;return s.tx(()=>{
   s.requireSteward(actor,communityId)
   if(!Number.isInteger(quorum)||Number(quorum)<1||Number(quorum)>9)throw new Fault(400,'Quorum must be 1 to 9')
   s.run('INSERT INTO claim_settings VALUES(?,?) ON CONFLICT(community_id) DO UPDATE SET quorum=excluded.quorum',communityId,Number(quorum))
   // A new quorum applies to every claim at once, so a claim never keeps a state the current rule would not give it.
   for(const c of s.all<{id:string;state:ClaimState}>("SELECT id,state FROM claims WHERE community_id=? AND state<>'withdrawn'",communityId)){
    const n=(a:string)=>s.get<{n:number}>('SELECT COUNT(*) n FROM claim_answers WHERE claim_id=? AND answer=?',c.id,a)!.n,next=settle(n('yes'),n('no'),Number(quorum))
    if(next!==c.state)s.run('UPDATE claims SET state=?,settled=? WHERE id=?',next,next==='open'?null:s.clock(),c.id)
   }
   return {quorum}
  })
 }
}
