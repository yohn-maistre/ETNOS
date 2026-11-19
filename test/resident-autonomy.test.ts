import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Strata} from '../src/store.ts'
import {Resident,residentBudget,keylessBudget} from '../src/resident.ts'
import {AgentAccess} from '../src/agent-access.ts'

const DAY=86400000
function fixture(){
 const s=new Strata(':memory:','https://autonomy.example.org'),owner=s.provision('did:web:autonomy-owner.example','Synthetic operator'),other=s.provision('did:web:autonomy-other.example','Synthetic steward')
 const room=s.createCommunity(owner.actor.id,'Public room','Synthetic','public',true,'open')
 const access=new AgentAccess(s),r=new Resident(s,access,{label:'synthetic',draft:async()=>({text:'x',model:'synthetic'})})
 return {s,owner,other,room,access,r}
}
const mandateExpiry=(s:Strata,id:string)=>(s.get<{expires:number}>('SELECT expires FROM mandates WHERE id=?',id)??s.get<{expires:number}>('SELECT expires FROM editorial_mandates WHERE id=?',id))?.expires

test('the keyless route keeps the small daily budget; a keyed node may raise it within bounds',()=>{
 assert.deepEqual(residentBudget({},false),keylessBudget)
 assert.deepEqual(residentBudget({STRATA_RESIDENT_DAILY_CALLS:'500'},false),keylessBudget)
 assert.deepEqual(residentBudget({},true),{modelCalls:200,toolCalls:1200})
 assert.deepEqual(residentBudget({STRATA_RESIDENT_DAILY_CALLS:'50'},true),{modelCalls:50,toolCalls:300})
 for(const bad of ['5','2001','1.5','lots',''])assert.equal(residentBudget({STRATA_RESIDENT_DAILY_CALLS:bad},true).modelCalls,200,bad)
})

test('guided setup grants 30-day mandates by default and accepts 1 or 7 days, nothing else',()=>{
 const f=fixture();try{
  const before=f.s.clock(),a=f.r.setup(f.owner.actor.id,{communityId:f.room.id,consent:true,requestKey:randomUUID()})
  const exp=mandateExpiry(f.s,a.config!.posting_mandate_id!)
  assert.ok(exp&&exp>=before+30*DAY&&exp<=f.s.clock()+30*DAY,'posting mandate lasts 30 days')
  assert.equal(mandateExpiry(f.s,a.config!.editorial_mandate_id!),exp)
  const room2=f.s.createCommunity(f.owner.actor.id,'Second room','Synthetic','public',true,'open')
  const b=f.r.setup(f.owner.actor.id,{communityId:room2.id,consent:true,days:7,requestKey:randomUUID()})
  assert.ok(mandateExpiry(f.s,b.config!.posting_mandate_id!)!<=f.s.clock()+7*DAY)
  const room3=f.s.createCommunity(f.owner.actor.id,'Third room','Synthetic','public',true,'open')
  for(const days of [0,2,31,365,'30x'])assert.throws(()=>f.r.setup(f.owner.actor.id,{communityId:room3.id,consent:true,days,requestKey:randomUUID()}),/1, 7 atau 30 hari/,String(days))
 }finally{f.s.close()}
})

test('renewal grants fresh mandates, points the configuration at them, and is idempotent per request key',()=>{
 const f=fixture();try{
  const a=f.r.setup(f.owner.actor.id,{communityId:f.room.id,consent:true,days:1,requestKey:randomUUID()})
  const key=randomUUID(),renewed=f.r.renew(f.owner.actor.id,{communityId:f.room.id,days:30,requestKey:key})
  assert.notEqual(renewed.config!.posting_mandate_id,a.config!.posting_mandate_id)
  assert.notEqual(renewed.config!.editorial_mandate_id,a.config!.editorial_mandate_id)
  assert.ok(mandateExpiry(f.s,renewed.config!.posting_mandate_id!)!>f.s.clock()+29*DAY)
  assert.equal(renewed.config!.daily_limit,a.config!.daily_limit);assert.equal(renewed.config!.mentions_enabled,a.config!.mentions_enabled)
  assert.equal(f.r.get(f.owner.actor.id,f.room.id).ready,true)
  const again=f.r.renew(f.owner.actor.id,{communityId:f.room.id,days:30,requestKey:key})
  assert.equal(again.config!.posting_mandate_id,renewed.config!.posting_mandate_id,'same request key, same grants')
  assert.equal(f.s.get<{n:number}>("SELECT count(*) n FROM mandates WHERE agent_id=?",a.agentId)!.n,2,'one posting grant from setup, one from renewal')
 }finally{f.s.close()}
})

test('only the resident operator can renew, and only where a resident exists',()=>{
 const f=fixture();try{
  assert.throws(()=>f.r.renew(f.owner.actor.id,{communityId:f.room.id,days:30,requestKey:randomUUID()}),/belum disiapkan/)
  f.r.setup(f.owner.actor.id,{communityId:f.room.id,consent:true,requestKey:randomUUID()})
  assert.throws(()=>f.r.renew(f.other.actor.id,{communityId:f.room.id,days:30,requestKey:randomUUID()}))
  assert.throws(()=>f.r.renew(f.owner.actor.id,{communityId:f.room.id,days:90,requestKey:randomUUID()}),/1, 7 atau 30 hari/)
 }finally{f.s.close()}
})

test('the model-call ceiling follows the budget set on the resident',()=>{
 const f=fixture();try{
  assert.deepEqual(f.r.budget,keylessBudget)
  f.r.budget=residentBudget({STRATA_RESIDENT_DAILY_CALLS:'40'},true)
  assert.equal(f.r.budget.modelCalls,40)
 }finally{f.s.close()}
})

test('one switch turns Aksara on in every public room the operator stewards, and pauses it again',()=>{
 const f=fixture();try{
  const second=f.s.createCommunity(f.owner.actor.id,'Second room','Synthetic','public',true,'open')
  f.s.createCommunity(f.owner.actor.id,'Private room','Synthetic','listed-private',true,'invite')
  const on=f.r.switchAll(f.owner.actor.id,{enabled:true,requestKey:randomUUID()})
  assert.deepEqual(on.results.map(r=>r.state).sort(),['aktif','aktif'],'two public rooms, the private one is never touched')
  const view=f.r.overview(f.owner.actor.id)
  assert.equal(view.communities.length,2);assert.ok(view.communities.every(c=>c.enabled&&c.ready&&c.mine))
  assert.ok(view.communities.every(c=>c.expires!>f.s.clock()+29*DAY))
  const off=f.r.switchAll(f.owner.actor.id,{enabled:false,requestKey:randomUUID()})
  assert.deepEqual(off.results.map(r=>r.state),['dijeda','dijeda'])
  assert.ok(f.r.overview(f.owner.actor.id).communities.every(c=>!c.enabled))
  const again=f.r.switchAll(f.owner.actor.id,{enabled:true,requestKey:randomUUID()})
  assert.deepEqual(again.results.map(r=>r.state),['aktif','aktif'],'paused residents come back with their settings')
  assert.equal(f.r.get(f.owner.actor.id,second.id).config!.daily_limit,8)
 }finally{f.s.close()}
})

test('the switch skips rooms where the operator is not the owner and agents are not yet allowed',()=>{
 const f=fixture();try{
  const theirs=f.s.createCommunity(f.other.actor.id,'Their room','Synthetic','public',false,'open')
  f.s.join(f.owner.actor.id,theirs.id)
  f.s.run("UPDATE memberships SET role='moderator' WHERE community_id=? AND actor_id=?",theirs.id,f.owner.actor.id)
  const on=f.r.switchAll(f.owner.actor.id,{enabled:true,requestKey:randomUUID()})
  const skipped=on.results.find(r=>r.id===theirs.id)!
  assert.equal(skipped.state,'dilewati');assert.match(skipped.reason!,/Pemilik komunitas/)
 }finally{f.s.close()}
})

test('a running resident renews its mandates when fewer than three days remain; a paused one does not',async()=>{
 const f=fixture();try{
  f.r.setup(f.owner.actor.id,{communityId:f.room.id,consent:true,requestKey:randomUUID()})
  const before=f.r.get(f.owner.actor.id,f.room.id).config!
  f.s.run('UPDATE mandates SET expires=? WHERE id=?',f.s.clock()+DAY,before.posting_mandate_id)
  await f.r.tick()
  const after=f.r.get(f.owner.actor.id,f.room.id).config!
  assert.notEqual(after.posting_mandate_id,before.posting_mandate_id)
  assert.ok(mandateExpiry(f.s,after.posting_mandate_id!)!>f.s.clock()+29*DAY)
  f.r.switchAll(f.owner.actor.id,{enabled:false,requestKey:randomUUID()})
  f.s.run('UPDATE mandates SET expires=? WHERE id=?',f.s.clock()+DAY,after.posting_mandate_id)
  await f.r.tick()
  assert.equal(f.r.get(f.owner.actor.id,f.room.id).config!.posting_mandate_id,after.posting_mandate_id,'paused: no renewal')
 }finally{f.s.close()}
})

test('a revoked mandate is never renewed automatically',async()=>{
 const f=fixture();try{
  f.r.setup(f.owner.actor.id,{communityId:f.room.id,consent:true,requestKey:randomUUID()})
  const c=f.r.get(f.owner.actor.id,f.room.id).config!
  f.s.run('UPDATE mandates SET expires=? WHERE id=?',f.s.clock()+DAY,c.posting_mandate_id)
  f.s.revokeMandate(f.owner.actor.id,c.posting_mandate_id!)
  await f.r.tick()
  assert.equal(f.r.get(f.owner.actor.id,f.room.id).config!.posting_mandate_id,c.posting_mandate_id)
 }finally{f.s.close()}
})
