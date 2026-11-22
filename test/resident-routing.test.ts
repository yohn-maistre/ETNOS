import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Resident} from '../src/resident.ts'
import {ResidentRouting,unavailableReason} from '../src/resident-routing.ts'
import {Fault} from '../src/core.ts'
function fixture(){let now=Date.now();const s=new Etnos(':memory:','https://commons.example.org',()=>now),owner=s.provision('did:web:routing-owner.example','Synthetic operator'),other=s.provision('did:web:routing-member.example','Synthetic neighbor'),access=new AgentAccess(s,{stewardDid:owner.actor.did}),r=new Resident(s,access),routes=new ResidentRouting(s,access),home=s.createCommunity(owner.actor.id,'Public home','Synthetic','public',true,'open'),target=s.createCommunity(owner.actor.id,'Public destination','Synthetic','public',true,'open'),hidden=s.createCommunity(owner.actor.id,'Protected room','Synthetic','hidden-private',true);s.join(other.actor.id,target.id)
 const configure=(communityId:string,name:string)=>{const a=access.enroll(owner.actor.id,{communityId,name,role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id);const mandate=s.mandate(owner.actor.id,a.agent_id,communityId,'Public conversation',now+86400000);r.configure(owner.actor.id,{communityId,agentId:a.agent_id,postingMandateId:mandate,enabled:true,mentionsEnabled:true,dailyLimit:5,requestKey:randomUUID()});return a.agent_id}
 const site=configure(home.id,'Aksara ETNOS'),local=configure(target.id,'Aksara community')
 const globalBody={agentId:site,homeCommunityId:home.id,coverage:[home.id],enabled:true,revision:0,requestKey:randomUUID()}
 return {s,owner,other,access,r,routes,home,target,hidden,site,local,globalBody,advance:()=>{now+=86400001}}
}
test('sitewide and community choices retain distinct identities and require actual destination admission and grants',()=>{
 const f=fixture();try{const {s,owner,routes,site,home,target,local,other}=f
  routes.setGlobal(owner.actor.id,f.globalBody)
  const homeChoices=routes.choices(owner.actor.id,home.id);assert.equal(homeChoices.length,1);assert.equal(homeChoices[0].scope,'sitewide')
  const before=routes.choices(other.actor.id,target.id);assert.equal(before.length,2);assert.equal(before.find(c=>c.actor.id===local)!.available,true);assert.equal(before.find(c=>c.actor.id===site)!.available,false)
  assert.throws(()=>routes.resolve(site,target.id),/Destination/)
  assert.throws(()=>routes.setDestination(owner.actor.id,{agentId:site,communityId:target.id,postingMandateId:'missing',enabled:true,revision:0,requestKey:randomUUID()}))
  s.setMember(owner.actor.id,target.id,site,true);const grant=s.mandate(owner.actor.id,site,target.id,'Public scoped replies',s.clock()+86400000),body={agentId:site,communityId:target.id,postingMandateId:grant,enabled:true,revision:0,requestKey:randomUUID()}
  const result=routes.setDestination(owner.actor.id,body);assert.deepEqual(routes.setDestination(owner.actor.id,body),result)
  const after=routes.choices(other.actor.id,target.id);assert.equal(after.filter(c=>c.available).length,2);assert.equal(new Set(after.map(c=>c.actor.id)).size,2);assert.doesNotMatch(JSON.stringify(after),/posting_mandate_id|postingMandateId|runtime_ticket|coverage/)
  const route=routes.resolve(site,target.id);assert.equal(route.config.community_id,home.id);assert.equal(route.postingMandateId,grant);assert.deepEqual(route.coverage.sort(),[home.id,target.id].sort())
  s.revokeMandate(owner.actor.id,grant);assert.equal(routes.choices(other.actor.id,target.id).find(c=>c.actor.id===site)!.available,false)
 }finally{f.s.close()}
})
test('routing refuses hidden scopes, wrong operators, stale edits, lost authority, disabled automation and expired grants',()=>{
 const f=fixture();try{const {s,owner,other,routes,target,site,hidden}=f
  assert.throws(()=>routes.setGlobal(other.actor.id,f.globalBody),/steward/)
  assert.throws(()=>routes.setGlobal(owner.actor.id,{...f.globalBody,coverage:[hidden.id]}),/public coverage/)
  routes.setGlobal(owner.actor.id,f.globalBody)
  assert.throws(()=>routes.setGlobal(owner.actor.id,{...f.globalBody,requestKey:randomUUID()}),/changed/)
  assert.throws(()=>routes.choices(owner.actor.id,hidden.id),/Not found/)
  assert.throws(()=>routes.choices(other.actor.id,f.home.id))
  s.setMember(owner.actor.id,target.id,site,true);const grant=s.mandate(owner.actor.id,site,target.id,'Public scoped replies',s.clock()+86400000)
  routes.setDestination(owner.actor.id,{agentId:site,communityId:target.id,postingMandateId:grant,enabled:true,revision:0,requestKey:randomUUID()})
  s.run('UPDATE communities SET automation=0 WHERE id=?',target.id);assert.throws(()=>routes.resolve(site,target.id),/mandate/);s.run('UPDATE communities SET automation=1 WHERE id=?',target.id)
  s.setMember(owner.actor.id,target.id,site,false);assert.throws(()=>routes.resolve(site,target.id));s.setMember(owner.actor.id,target.id,site,true)
  f.advance();assert.throws(()=>routes.resolve(site,target.id),/mandate/)
 }finally{f.s.close()}
})
test('explicit destination admission and grant are atomic, body-bound and remain separate from public identity projection',()=>{
 const f=fixture();try{const {s,owner,other,routes,site,target}=f;routes.setGlobal(owner.actor.id,f.globalBody)
  const body={agentId:site,communityId:target.id,enabled:true,issueGrant:true,admitAgent:true,durationHours:24,hourlyLimit:3,revision:0,requestKey:randomUUID()},before=s.all('SELECT id FROM mandates').length
  assert.throws(()=>routes.setDestination(owner.actor.id,{...body,admitAgent:false}),/Not found/);assert.equal(s.membership(site,target.id),undefined)
  s.db.exec("CREATE TRIGGER synthetic_destination_failure BEFORE INSERT ON resident_destinations BEGIN SELECT RAISE(ABORT,'Synthetic late failure'); END")
  assert.throws(()=>routes.setDestination(owner.actor.id,body));assert.equal(s.membership(site,target.id),undefined);assert.equal(s.all('SELECT id FROM mandates').length,before)
  s.db.exec('DROP TRIGGER synthetic_destination_failure');const result=routes.setDestination(owner.actor.id,body);assert.deepEqual(routes.setDestination(owner.actor.id,body),result);assert.equal(s.all('SELECT id FROM mandates').length,before+1);assert.equal(s.membership(site,target.id)!.active,1)
  assert.throws(()=>routes.setDestination(owner.actor.id,{...body,hourlyLimit:2}),/another change/i)
  const info=routes.participation(owner.actor.id,target.id);assert.equal(info.destination!.hourlyLimit,3);assert.equal(info.destination!.expires,s.clock()+86400000);assert.doesNotMatch(JSON.stringify(info),/posting_mandate|ticket|coverage/);assert.throws(()=>routes.participation(other.actor.id,target.id),/steward/)
 }finally{f.s.close()}
})
test('unavailable reasons are classified centrally and shown only to the operator or node steward',()=>{
 const f=fixture();try{const {s,owner,other,routes,r,target,local,site}=f
  assert.equal(unavailableReason(new Fault(409,'Conversation requests are not enabled')),'requests-off')
  assert.equal(unavailableReason(new Fault(403,'Current agent mandate required')),'no-posting-mandate')
  assert.equal(unavailableReason(new Fault(429,'Agent budget exceeded')),'budget')
  assert.equal(unavailableReason(new Fault(403,'Sitewide binding changed')),'binding-changed')
  assert.equal(unavailableReason(new Fault(403,'Destination has not enabled this steward')),'not-admitted-here')
  assert.equal(unavailableReason(new Error('x')),'other')
  const pick=(viewer:string)=>routes.choices(viewer,target.id).find(c=>c.actor.id===local)!
  assert.equal(pick(owner.actor.id).available,true);assert.equal(pick(owner.actor.id).reason,null)
  // sitewide steward not enabled at this destination
  routes.setGlobal(owner.actor.id,f.globalBody)
  assert.equal(routes.choices(owner.actor.id,target.id).find(c=>c.actor.id===site)!.reason,'not-admitted-here');assert.equal(routes.choices(other.actor.id,target.id).find(c=>c.actor.id===site)!.reason,null)
  const cfg=routes.config(target.id)
  r.configure(owner.actor.id,{communityId:target.id,agentId:local,postingMandateId:cfg.posting_mandate_id,enabled:true,mentionsEnabled:false,dailyLimit:5,revision:cfg.revision,requestKey:randomUUID()})
  assert.equal(pick(owner.actor.id).reason,'requests-off');assert.equal(pick(other.actor.id).reason,null);assert.equal(pick(other.actor.id).available,false)
  r.configure(owner.actor.id,{communityId:target.id,agentId:local,postingMandateId:cfg.posting_mandate_id,enabled:true,mentionsEnabled:true,dailyLimit:5,revision:cfg.revision+1,requestKey:randomUUID()})
  f.advance()
  assert.equal(pick(owner.actor.id).reason,'no-posting-mandate');assert.equal(pick(other.actor.id).reason,null)
  assert.doesNotMatch(JSON.stringify(pick(other.actor.id)),/mandate|budget/i)
 }finally{f.s.close()}
})
