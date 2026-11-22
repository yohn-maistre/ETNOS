import {EtnosCore,Fault} from './core.ts'
import {Forum} from './forum.ts'
import {Groups} from './groups.ts'
import {transition,text,expected,readScope,emit} from './commons.ts'
import type {OfferingRow} from './offering-contract.ts'
import {activeRules,brokenRule} from './kios-rules.ts'

/** One canonical post plus commercial terms; no payment custody or agent commerce. */
export class Offerings {
 readonly store:EtnosCore
 constructor(store:EtnosCore){this.store=store}
 private terms(price:unknown,unit:unknown,expires:unknown,place:unknown){
  if(price!==null&&(!Number.isSafeInteger(price)||Number(price)<0||Number(price)>1_000_000_000_000))throw new Fault(400,'Use a whole IDR amount or leave price open')
  if(expires!==null&&(!Number.isSafeInteger(expires)||Number(expires)<=this.store.clock()||Number(expires)>this.store.clock()+90*86400000))throw new Fault(400,'Expiry must be in the next 90 days')
  const placeId=place===null?null:text(place,100)
  if(placeId&&!this.store.get("SELECT 1 FROM contexts WHERE id=? AND active=1 AND kind IN ('place','region')",placeId))throw new Fault(400,'Choose a current public place or region')
  return {price:price as number|null,unit:text(unit??'',60,true),expires:expires as number|null,placeId}
 }
 private author(actorId:string,id:string){const p=this.store.getPost(actorId,id);this.store.requireMember(actorId,p.community_id);if(this.store.actor(actorId).kind!=='human'||p.author_id!==actorId)throw new Fault(403,'Human author required');if(p.deleted||!p.offering)throw new Fault(404,'Not found');if(p.uri||this.store.community(p.community_id).publication!=='local')throw new Fault(409,'This offering has a separate publication lifecycle');return p}
 read(id:string,actorId?:string){const p=this.store.getPost(actorId,id);if(p.deleted||!p.offering||p.offering.status==='withdrawn')throw new Fault(404,'Not found');return p}
 list(actorId?:string,options:{communityId?:string;authorId?:string;kind?:string;includeClosed?:boolean}={}){
  if(options.communityId)readScope(this.store,options.communityId,actorId)
  if(options.kind&&!['offer','request'].includes(options.kind))throw new Fault(400,'Choose offers or requests')
  const ids=this.store.all<{post_id:string}>(`SELECT o.post_id FROM offerings o JOIN posts p ON p.id=o.post_id JOIN communities c ON c.id=p.community_id WHERE p.hidden=0 AND p.deleted=0 AND o.status!='withdrawn' AND ((? IS NULL AND c.visibility='public') OR p.community_id=?) AND (? IS NULL OR p.author_id=?) AND (? IS NULL OR o.kind=?) AND (?=1 OR (o.status='open' AND (o.expires IS NULL OR o.expires>?))) ORDER BY o.created DESC,o.post_id DESC LIMIT 50`,options.communityId??null,options.communityId??null,options.authorId??null,options.authorId??null,options.kind??null,options.kind??null,Number(!!options.includeClosed),this.store.clock())
  return {items:ids.map(r=>this.read(r.post_id,actorId)),pagination:'bounded-selection' as const}
 }
 create(actorId:string,b:Record<string,unknown>){
  if(b.agentMention!==undefined)throw new Fault(400,'Ask Aksara in a discussion post or reply, separately from an offering')
  const communityId=text(b.communityId,100)
  if(b.currency!==undefined&&b.currency!=='IDR')throw new Fault(400,'This deployment currently supports IDR terms')
  const result=transition(this.store,actorId,b.requestKey,'offering.create',{...b,requestKey:undefined},()=>{
   this.store.requireMember(actorId,communityId);if(this.store.actor(actorId).kind!=='human')throw new Fault(403,'A posting mandate does not authorize commerce')
   if(this.store.community(communityId).publication!=='local')throw new Fault(409,'Offerings require a local-publication community until AT lifecycle interop is qualified')
  },()=>{
   if(!['offer','request'].includes(String(b.kind))||b.parentId!==undefined)throw new Fault(400,'Choose an offer or request as a new post')
   if(b.status!==undefined&&b.status!=='open')throw new Fault(400,'A new offering starts open')
   const content=(b.content??{}) as Record<string,unknown>;if(content.poll||content.event)throw new Fault(400,'An offering cannot also be a poll or event')
   // Kios house rules: a plain keyword check on every offer and request; people report what it misses.
   if(brokenRule(activeRules(this.store),typeof b.text==='string'?b.text:'',typeof content.title==='string'?content.title:'',typeof b.unit==='string'?b.unit:''))throw new Fault(422,'This listing breaks a Kios house rule')
   if(b.durationDays!==undefined&&(!Number.isSafeInteger(b.durationDays)||Number(b.durationDays)<1||Number(b.durationDays)>90||b.expiresAt!==undefined))throw new Fault(400,'Choose 1–90 days or an explicit expiry')
   const expires=b.durationDays===undefined?b.expiresAt??null:this.store.clock()+Number(b.durationDays)*86400000
   const terms=this.terms(b.price??null,b.unit??'',expires,b.placeContextId??null),s=this.store
   if(s.get<{n:number}>("SELECT count(*) n FROM offerings o JOIN posts p ON p.id=o.post_id WHERE p.author_id=? AND p.deleted=0 AND o.status IN ('open','paused') AND (o.expires IS NULL OR o.expires>?)",actorId,s.clock())!.n>=40)throw new Fault(429,'Active offering limit reached')
   if(s.get('SELECT 1 FROM post_requests WHERE actor_id=? AND request_key=?',actorId,String(b.requestKey)))throw new Fault(409,'This request key already belongs to another post')
   const post=new Forum(s).create(actorId,{...b,communityId},new Groups(s)),now=s.clock()
   s.run("INSERT INTO offerings VALUES(?,?,?,?, 'open',?,?,1,?,?)",post.id,String(b.kind),terms.price,terms.unit,terms.expires,terms.placeId,now,now)
   this.snapshot(actorId,post.id);emit(s,actorId,'offering.create',{kind:'offering',id:post.id,revision:1,communityId});return {id:post.id}
  })
  return this.read(result.id,actorId)
 }
 private snapshot(actorId:string,id:string){const o=this.store.get<OfferingRow>('SELECT * FROM offerings WHERE post_id=?',id)!;this.store.run('INSERT INTO offering_history VALUES(?,?,?,?,?)',id,o.revision,actorId,JSON.stringify(o),this.store.clock())}
 update(actorId:string,id:string,b:Record<string,unknown>){
  if(b.currency!==undefined&&b.currency!=='IDR')throw new Fault(400,'This deployment currently supports IDR terms')
  if(Object.keys(b).some(k=>!['revision','requestKey','price','unit','status','expiresAt','placeContextId','currency'].includes(k)))throw new Fault(400,'Unknown offering update field')
  const result=transition(this.store,actorId,b.requestKey,'offering.update',{id,...b,requestKey:undefined},()=>{this.author(actorId,id)},()=>{
   const s=this.store,p=this.author(actorId,id),o=s.get<OfferingRow>('SELECT * FROM offerings WHERE post_id=?',id)!;expected(b.revision,o.revision)
   if(s.get<{n:number}>('SELECT count(*) n FROM offering_history WHERE post_id=? AND created>?',id,s.clock()-3600000)!.n>=60)throw new Fault(429,'Wait before changing this offering again')
   const status=b.status??o.status;if(!['open','paused','fulfilled','withdrawn'].includes(String(status)))throw new Fault(400,'Invalid offering status')
   if(typeof b.unit==='string'&&brokenRule(activeRules(this.store),b.unit))throw new Fault(422,'This listing breaks a Kios house rule')
   // Status-only transitions may close an already expired item without extending it.
   const terms=this.terms(b.price===undefined?o.price:b.price,b.unit??o.unit,b.expiresAt===undefined?(o.expires!==null&&o.expires<=s.clock()?null:o.expires):b.expiresAt,b.placeContextId===undefined?o.place_context_id:b.placeContextId)
   const expires=b.expiresAt===undefined?o.expires:terms.expires
   if(status==='open'&&expires!==null&&expires<=s.clock())throw new Fault(409,'Extend the expiry before reopening this offering')
   s.run('UPDATE offerings SET price=?,unit=?,status=?,expires=?,place_context_id=?,revision=revision+1,updated=? WHERE post_id=?',terms.price,terms.unit,String(status),expires,terms.placeId,s.clock(),id)
   this.snapshot(actorId,id);s.invalidatePublicContext(p.community_id);s.audit(actorId,'offering.update',id);emit(s,actorId,'offering.update',{kind:'offering',id,revision:o.revision+1,communityId:p.community_id})
   if(status==='withdrawn')new Forum(s).delete(actorId,id,p.revision)
   return {id,status:String(status)}
  })
  return result.status==='withdrawn'?result:this.read(id,actorId)
 }
}
