import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {Resident} from '../src/resident.ts'
import {AgentAccess} from '../src/agent-access.ts'

function fixture(){
 const s=new Etnos(':memory:','https://limits.example.org'),owner=s.provision('did:web:limits-owner.example','Synthetic operator'),room=s.createCommunity(owner.actor.id,'Public room','Synthetic','public',true,'open'),access=new AgentAccess(s),r=new Resident(s,access,{label:'synthetic',draft:async()=>({text:'x',model:'synthetic'})}),a=access.enroll(owner.actor.id,{communityId:room.id,name:'Synthetic Aksara',role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id)
 const grant=s.mandate(owner.actor.id,a.agent_id,room.id,'Public conversation',s.clock()+86400000)
 const configure=(extra:Record<string,unknown>)=>r.configure(owner.actor.id,{communityId:room.id,agentId:a.agent_id,postingMandateId:grant,enabled:true,requestKey:randomUUID(),...extra})
 return {s,owner,room,r,a,configure}
}

test('resident limits allow 1-24 jobs a day and a 15 minute interval, with defaults of 8 and 120',()=>{
 const f=fixture();try{
  const first=f.configure({}).config!;assert.equal(first.daily_limit,8);assert.equal(first.interval_minutes,120)
  let revision=first.revision
  for(const [dailyLimit,intervalMinutes] of [[24,15],[1,10080],[12,15]]){
   const c=f.configure({dailyLimit,intervalMinutes,revision}).config!;revision=c.revision;assert.equal(c.daily_limit,dailyLimit);assert.equal(c.interval_minutes,intervalMinutes)
  }
  for(const bad of [{dailyLimit:25},{dailyLimit:0},{dailyLimit:1.5},{intervalMinutes:14},{intervalMinutes:10081},{intervalMinutes:0}])assert.throws(()=>f.configure({...bad,revision}),/1–24 tugas per hari dan jarak tinjauan minimal 15 menit/,JSON.stringify(bad))
 }finally{f.s.close()}
})

test('the daily budget still stops enqueueing at the configured limit and one job stays pending',()=>{
 const f=fixture();try{
  f.configure({dailyLimit:2,intervalMinutes:15})
  const one=f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID())
  assert.throws(()=>f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID()),/already pending/)
  f.r.cancel(f.owner.actor.id,one.id);f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID())
  assert.throws(()=>f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID()),/already pending|budget/)
 }finally{f.s.close()}
})

test('guided setup turns mentions on by default and keeps the explicit switch',()=>{
 const s=new Etnos(':memory:','https://setup-mentions.example.org'),owner=s.provision('did:web:setup-owner.example','Synthetic operator'),r=new Resident(s,new AgentAccess(s),{label:'synthetic',draft:async()=>({text:'x',model:'synthetic'})})
 try{
  const on=s.createCommunity(owner.actor.id,'Mentions on','Synthetic','public',true,'open'),off=s.createCommunity(owner.actor.id,'Mentions off','Synthetic','public',true,'open')
  const a=r.setup(owner.actor.id,{communityId:on.id,consent:true,requestKey:randomUUID()}),b=r.setup(owner.actor.id,{communityId:off.id,consent:true,mentionsEnabled:false,requestKey:randomUUID()})
  assert.equal(a.config!.mentions_enabled,1);assert.equal(b.config!.mentions_enabled,0);assert.equal(a.config!.daily_limit,8);assert.equal(a.config!.interval_minutes,120)
 }finally{s.close()}
})
