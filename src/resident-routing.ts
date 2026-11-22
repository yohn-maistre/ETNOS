import {EtnosCore,Fault} from './core.ts'
import {AgentAccess} from './agent-access.ts'
import {publicSteward,text,hash,expected,transition,emit} from './commons.ts'
import type {ResidentConfig} from './resident.ts'

export type SitewideResident={id:number;agent_id:string;home_community_id:string;operator_id:string;enabled:number;coverage:string;revision:number;updated:number}
export type ResidentDestination={agent_id:string;community_id:string;posting_mandate_id:string;enabled:number;revision:number;updated:number}
export type ResidentUnavailableReason='requests-off'|'not-admitted-here'|'no-posting-mandate'|'budget'|'binding-changed'|'other'
/** Single place that classifies route failures; reasons never carry ids, counts or other private detail. */
export function unavailableReason(e:unknown):ResidentUnavailableReason{
 if(!(e instanceof Fault))return 'other'
 if(e.status===429)return 'budget'
 if(e.status===409&&e.message==='Conversation requests are not enabled')return 'requests-off'
 if(e.status===403&&e.message==='Current agent mandate required')return 'no-posting-mandate'
 if(e.status===403&&e.message==='Sitewide binding changed')return 'binding-changed'
 if(e.status===403&&e.message==='Destination has not enabled this steward')return 'not-admitted-here'
 if(e.status===404)return 'not-admitted-here'
 return 'other'
}
export type ResidentRoute={config:ResidentConfig;communityId:string;postingMandateId:string;scope:'community'|'sitewide';globalRevision:number;routeRevision:number;coverage:string[];choiceKey:string}
/** Explicit participation over existing roles, admission and mandates; never a superuser flag. */
export class ResidentRouting {
 readonly store:EtnosCore
 readonly access:AgentAccess
 constructor(store:EtnosCore,access:AgentAccess){this.store=store;this.access=access}
 config(id:string){const c=this.store.get<ResidentConfig>('SELECT * FROM resident_configs WHERE community_id=?',id);if(!c)throw new Fault(404,'Resident is not configured');return c}
 global(){return this.store.get<SitewideResident>('SELECT * FROM resident_sitewide WHERE id=1')??null}
 assertBase(c:ResidentConfig){
  const s=this.store;publicSteward(s,c.operator_id,c.community_id)
  if(!c.enabled)throw new Fault(409,'Resident is paused')
  const r=this.access.assertCurrent(c.agent_id),a=s.actor(c.agent_id),room=s.community(c.community_id)
  if(r.community_id!==c.community_id||r.family!=='aksara'||r.role==='guest'||a.operator_id!==c.operator_id)throw new Fault(403,'Current resident operator and registration required')
  if(!room.automation||room.publication!=='local')throw new Fault(403,'Public local agent participation required')
  s.requireMember(c.agent_id,c.community_id)
 }
 private coverage(ids:string[]){return [...new Set(ids)].filter(id=>this.store.get<{visibility:string}>('SELECT visibility FROM communities WHERE id=?',id)?.visibility==='public').sort()}
 private stop(agentId:string,reason:string){this.store.run("UPDATE resident_jobs SET state='cancelled',generation=generation+1,lease_until=NULL,error=?,updated=? WHERE agent_id=? AND state IN ('queued','running')",reason,this.store.clock(),agentId)}
 globalInfo(actorId:string){
  this.access.groups.nodeSteward(actorId);const row=this.global()
  if(!row)return {binding:null}
  if(this.store.get<{visibility:string}>('SELECT visibility FROM communities WHERE id=?',row.home_community_id)?.visibility!=='public')return {binding:null}
  // A formerly public coverage scope can become private without leaking it here.
  return {binding:{...row,coverage:this.coverage(JSON.parse(row.coverage) as string[])}}
 }
 participation(actorId:string,communityId:string){
  publicSteward(this.store,actorId,communityId)
  const global=this.global(),home=global?this.store.get<{visibility:string}>('SELECT visibility FROM communities WHERE id=?',global.home_community_id):null
  if(!global||home?.visibility!=='public')return {sitewide:null,destination:null}
  const a=this.store.actor(global.agent_id),row=this.store.get<ResidentDestination>('SELECT * FROM resident_destinations WHERE agent_id=? AND community_id=?',a.id,communityId)
  const grant=row?this.store.get<{expires:number;revoked:number;hourly_limit:number}>('SELECT expires,revoked,hourly_limit FROM mandates WHERE id=?',row.posting_mandate_id):null
  return {sitewide:{agentId:a.id,name:a.name,homeCommunityId:global.home_community_id,operatorId:global.operator_id,enabled:!!global.enabled},destination:row?{enabled:!!row.enabled,revision:row.revision,expires:grant&&!grant.revoked?grant.expires:null,hourlyLimit:grant?.hourly_limit??null}:null}
 }
 setGlobal(actorId:string,b:Record<string,unknown>){
  const agentId=text(b.agentId,100),home=text(b.homeCommunityId,100)
  if(typeof b.enabled!=='boolean'||!Array.isArray(b.coverage)||b.coverage.length>16||b.coverage.some(x=>typeof x!=='string'||x.length>100))throw new Fault(400,'Choose a bounded public coverage set')
  const coverage=b.enabled?[...new Set([home,...b.coverage as string[]])].sort():[]
  if(coverage.length>16)throw new Fault(400,'Choose at most sixteen public coverage communities')
  return transition(this.store,actorId,b.requestKey,'resident.sitewide',{agentId,home,enabled:b.enabled,coverage,revision:b.revision??0},()=>{
   this.access.groups.nodeSteward(actorId)
   if(b.enabled){if(this.store.actor(agentId).operator_id!==actorId)throw new Fault(403,'Resident operator required');const c=this.config(home);if(c.agent_id!==agentId)throw new Fault(409,'Choose the configured home resident');this.assertBase(c);if(this.access.assertCurrent(agentId).group_id)throw new Fault(409,'The sitewide steward is distinct from a group representative');if(this.coverage(coverage).length!==coverage.length)throw new Fault(400,'Choose existing public coverage communities')}
   else {const prior=this.global();if(!prior||prior.agent_id!==agentId||prior.home_community_id!==home)throw new Fault(404,'Not found')}
  },()=>{
   const prior=this.global();expected(b.revision??0,prior?.revision??0)
   this.store.run('INSERT INTO resident_sitewide VALUES(1,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET agent_id=excluded.agent_id,home_community_id=excluded.home_community_id,operator_id=excluded.operator_id,enabled=excluded.enabled,coverage=excluded.coverage,revision=excluded.revision,updated=excluded.updated',agentId,home,b.enabled?actorId:prior!.operator_id,Number(b.enabled),JSON.stringify(coverage),(prior?.revision??0)+1,this.store.clock())
   if(prior)this.stop(prior.agent_id,'Sitewide participation policy changed')
   this.stop(agentId,'Sitewide participation policy changed')
   this.store.audit(actorId,'resident.sitewide.configure',agentId)
   return this.globalInfo(actorId)
  })
 }
 setDestination(actorId:string,b:Record<string,unknown>){
  const agentId=text(b.agentId,100),communityId=text(b.communityId,100)
  if(typeof b.enabled!=='boolean')throw new Fault(400,'Choose whether this participation is enabled')
  const prior=()=>this.store.get<ResidentDestination>('SELECT * FROM resident_destinations WHERE agent_id=? AND community_id=?',agentId,communityId)
  const mandate=b.postingMandateId?text(b.postingMandateId,100):''
  const issue=b.issueGrant===true,admit=b.admitAgent===true,hours=Number(b.durationHours??24),limit=Number(b.hourlyLimit??3)
  if(admit&&(!issue||!b.enabled))throw new Fault(400,'Admission requires an explicit enabled reply grant')
  if(issue&&(!b.enabled||mandate||!Number.isInteger(hours)||hours<1||hours>24||!Number.isInteger(limit)||limit<1||limit>3))throw new Fault(400,'Choose a 1–24 hour grant with 1–3 replies per hour')
  return transition(this.store,actorId,b.requestKey,'resident.destination',{agentId,communityId,mandate,issue,admit,hours,limit,enabled:b.enabled,revision:b.revision??0},()=>{
   this.store.requireSteward(actorId,communityId)
   if(b.enabled){const global=this.global();if(!global?.enabled||global.agent_id!==agentId||global.operator_id!==actorId)throw new Fault(403,'Current sitewide operator required');this.access.groups.nodeSteward(actorId);const c=this.config(global.home_community_id);this.assertBase(c);publicSteward(this.store,actorId,communityId);const target=this.store.community(communityId);if(target.publication!=='local'||!target.automation)throw new Fault(409,'Choose an agent-enabled local-publication community');if(issue){if(!admit)this.store.requireMember(agentId,communityId)}else this.store.checkWrite(agentId,communityId,mandate,false)}
   else if(!prior())throw new Fault(404,'Not found')
  },()=>{
   const current=prior();expected(b.revision??0,current?.revision??0)
   if(admit&&!this.store.membership(agentId,communityId))this.store.setMember(actorId,communityId,agentId,true)
   const selected=issue?this.store.mandate(actorId,agentId,communityId,'Sitewide steward: sourced public thread replies',this.store.clock()+hours*3600000,limit):mandate||current!.posting_mandate_id
   this.store.run('INSERT INTO resident_destinations VALUES(?,?,?,?,?,?) ON CONFLICT(agent_id,community_id) DO UPDATE SET posting_mandate_id=excluded.posting_mandate_id,enabled=excluded.enabled,revision=excluded.revision,updated=excluded.updated',agentId,communityId,selected,Number(b.enabled),(current?.revision??0)+1,this.store.clock())
   this.store.run("UPDATE resident_jobs SET state='cancelled',generation=generation+1,lease_until=NULL,error='Destination participation changed',updated=? WHERE agent_id=? AND community_id=? AND state IN ('queued','running')",this.store.clock(),agentId,communityId)
   emit(this.store,actorId,'resident.destination.configure',{kind:'agent-job',id:agentId,revision:(current?.revision??0)+1,communityId})
   return {agentId,communityId,enabled:b.enabled,revision:(current?.revision??0)+1}
  })
 }
 resolve(agentId:string,communityId:string):ResidentRoute {
  const s=this.store,target=s.community(communityId)
  if(target.visibility!=='public'||target.publication!=='local')throw new Fault(404,'Not found')
  const global=this.global(),local=s.get<ResidentConfig>('SELECT * FROM resident_configs WHERE community_id=? AND agent_id=?',communityId,agentId)
  let c:ResidentConfig,scope:'community'|'sitewide'='community',globalRevision=0,routeRevision=0,mandate='',coverage=[communityId]
  if(global?.enabled&&global.agent_id===agentId){
   this.access.groups.nodeSteward(global.operator_id);c=this.config(global.home_community_id)
   if(c.agent_id!==agentId||c.operator_id!==global.operator_id)throw new Fault(403,'Sitewide binding changed')
   scope='sitewide';globalRevision=global.revision;coverage=this.coverage([communityId,...JSON.parse(global.coverage) as string[]])
   if(communityId!==global.home_community_id){const route=s.get<ResidentDestination>('SELECT * FROM resident_destinations WHERE agent_id=? AND community_id=? AND enabled=1',agentId,communityId);if(!route)throw new Fault(403,'Destination has not enabled this steward');publicSteward(s,c.operator_id,communityId);routeRevision=route.revision;mandate=route.posting_mandate_id}else mandate=c.posting_mandate_id??''
  }else if(local){c=local;mandate=c.posting_mandate_id??''}
  else throw new Fault(404,'No eligible resident')
  this.assertBase(c)
  if(!c.mentions_enabled)throw new Fault(409,'Conversation requests are not enabled')
  s.checkWrite(agentId,communityId,mandate)
  const choiceKey=hash({agentId,communityId,config:c.revision,globalRevision,routeRevision,mandate,coverage})
  return {config:c,communityId,postingMandateId:mandate,scope,globalRevision,routeRevision,coverage,choiceKey}
 }
 choices(actorId:string,communityId:string){
  const s=this.store;this.access.assertHumanCurrent(actorId)
  const room=s.community(communityId);if(room.visibility!=='public'||room.publication!=='local')throw new Fault(404,'Not found');s.requireMember(actorId,communityId)
  let isNodeSteward=false;try{this.access.groups.nodeSteward(actorId);isNodeSteward=true}catch{/* ordinary viewer */}
  const local=s.get<ResidentConfig>('SELECT * FROM resident_configs WHERE community_id=?',communityId),global=this.global(),ids=[...new Set([local?.agent_id,global?.enabled?global.agent_id:undefined].filter((id):id is string=>!!id))]
  return ids.flatMap(id=>{
   const r=s.get<{community_id:string;family:string}>('SELECT community_id,family FROM agent_registrations WHERE agent_id=?',id),home=r?s.get<{visibility:string}>('SELECT visibility FROM communities WHERE id=?',r.community_id):null
   if(!r||r.family!=='aksara'||home?.visibility!=='public')return[]
   const a=s.actor(id),operator=a.operator_id?s.actor(a.operator_id):null;if(a.kind!=='agent'||!operator)return[]
   let route:ResidentRoute|undefined,reason:ResidentUnavailableReason|null=null;try{route=this.resolve(id,communityId)}catch(e){/* Public identity may be visible while its permission is unavailable. */reason=unavailableReason(e)}
   const mayDiagnose=a.operator_id===actorId||isNodeSteward
   return [{actor:{id:a.id,name:a.name},operator:{id:operator.id,name:operator.name},scope:route?.scope??(global?.enabled&&global.agent_id===id?'sitewide':'community'),available:!!route,reason:route||!mayDiagnose?null:reason,choiceKey:route?.choiceKey??null,description:route?'Pertanyaan dan jawaban terlihat di percakapan ini.':'Belum aktif untuk percakapan ini.'}]
  }).sort((a,b)=>Number(b.scope==='community')-Number(a.scope==='community')||a.actor.name.localeCompare(b.actor.name))
 }
}
