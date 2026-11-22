import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Periksa,settle,QUEUE_SIZE} from '../src/periksa.ts'

function fixture(visibility:'public'|'hidden-private'='hidden-private'){
 const s=new Etnos(':memory:','https://forum.example'),p=new Periksa(s)
 const a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:b.example','Budi'),c=s.provision('did:web:c.example','Citra'),d=s.provision('did:web:d.example','Dani'),o=s.provision('did:web:outsider.example','Outside')
 const room=s.createCommunity(a.actor.id,'Mee','Ruang bahasa',visibility)
 for(const m of [b,c,d])s.setMember(a.actor.id,room.id,m.actor.id,true)
 return {s,p,a:a.actor.id,b:b.actor.id,c:c.actor.id,d:d.actor.id,o:o.actor.id,room:room.id}
}
const claim={kind:'sense',subject:'ugee',statement:'Ugee artinya ubi jalar, dipakai di kebun.',evidence:[{text:'Ugee naitai.',source:'Steltenpool 1969'}]}

test('settle: quorum decides, both sides at quorum is a split',()=>{
 assert.equal(settle(1,0,2),'open');assert.equal(settle(2,1,2),'checked');assert.equal(settle(0,2,2),'rejected');assert.equal(settle(2,2,2),'split')
})

test('private claims stay with members; outsiders and non-members see nothing',()=>{
 const {s,p,b,o,room}=fixture();try{
  const x=p.propose(b,room,claim)
  assert.throws(()=>p.list(o,room),/Not found/);assert.throws(()=>p.list(undefined,room),/Not found/)
  assert.throws(()=>p.queue(o,room));assert.throws(()=>p.answer(o,x.id,{answer:'yes'}))
  assert.throws(()=>p.propose(o,room,claim))
  assert.equal(p.list(b,room).length,1)
 }finally{s.close()}
})

test('a public community shows its claims to anyone, but only members answer',()=>{
 const {s,p,b,o,room}=fixture('public');try{
  const x=p.propose(b,room,claim)
  assert.equal(p.list(undefined,room).length,1);assert.equal(p.list(undefined,room)[0].mine,null)
  assert.throws(()=>p.answer(o,x.id,{answer:'yes'}))
 }finally{s.close()}
})

test('two members agree and the claim is checked; the proposer and agents cannot vote',()=>{
 const {s,p,a,b,c,d,room}=fixture();try{
  const x=p.propose(b,room,claim)
  assert.throws(()=>p.answer(b,x.id,{answer:'yes'}),/proposed/)
  const agent=s.provision('did:web:aksara.example','Aksara',a);s.setMember(a,room,agent.actor.id,true)
  assert.throws(()=>p.answer(agent.actor.id,x.id,{answer:'yes'}),/Human/)
  assert.throws(()=>p.propose(agent.actor.id,room,claim),/Human/)
  assert.equal(p.answer(c,x.id,{answer:'yes'}).claim.state,'open')
  const done=p.answer(d,x.id,{answer:'yes'}).claim;assert.equal(done.state,'checked');assert.equal(done.yes,2)
  assert.equal(p.queue(a,room).claims.length,0,'settled claims leave the queue')
 }finally{s.close()}
})

test('changing or taking back an answer moves the state both ways',()=>{
 const {s,p,b,c,d,room}=fixture();try{
  const x=p.propose(b,room,claim)
  p.answer(c,x.id,{answer:'yes'});assert.equal(p.answer(d,x.id,{answer:'yes'}).claim.state,'checked')
  assert.equal(p.answer(d,x.id,{answer:null}).claim.state,'open')
  assert.equal(p.answer(d,x.id,{answer:'no'}).claim.mine,'no')
 }finally{s.close()}
})

test('"Jawaban lain" records no and proposes the member\'s version with the same evidence',()=>{
 const {s,p,b,c,room}=fixture();try{
  const x=p.propose(b,room,claim)
  const r=p.answer(c,x.id,{answer:'other',text:'Ugee artinya keladi.'})
  assert.equal(r.claim.mine,'no');assert.equal(r.created!.parentId,x.id);assert.equal(r.created!.proposer.id,c);assert.deepEqual(r.created!.evidence,x.evidence)
  assert.throws(()=>p.answer(c,x.id,{answer:'other',text:'  '}),/required/)
 }finally{s.close()}
})

test('the queue skips my own and answered claims, and is capped',()=>{
 const {s,p,b,c,room}=fixture();try{
  const mine=p.propose(c,room,claim)
  for(let i=0;i<QUEUE_SIZE+3;i++)p.propose(b,room,{...claim,subject:'w'+i})
  const q=p.queue(c,room);assert.equal(q.claims.length,QUEUE_SIZE);assert.equal(q.waiting,QUEUE_SIZE+3);assert.ok(!q.claims.some(x=>x.id===mine.id))
  p.answer(c,q.claims[0].id,{answer:'yes'});assert.equal(p.queue(c,room).waiting,QUEUE_SIZE+2)
 }finally{s.close()}
})

test('withdrawal removes the claim and its answers; only the proposer or a steward can withdraw',()=>{
 const {s,p,a,b,c,d,room}=fixture();try{
  const x=p.propose(b,room,claim);p.answer(c,x.id,{answer:'yes'})
  assert.throws(()=>p.withdraw(d,x.id),/steward/)
  assert.equal(p.withdraw(b,x.id).state,'withdrawn')
  assert.equal(s.all('SELECT * FROM claim_answers WHERE claim_id=?',x.id).length,0)
  assert.equal(p.list(b,room).length,0);assert.throws(()=>p.answer(d,x.id,{answer:'yes'}),/withdrawn/)
  const y=p.propose(b,room,claim);assert.equal(p.withdraw(a,y.id).state,'withdrawn')
 }finally{s.close()}
})

test('a removed member can no longer read or answer',()=>{
 const {s,p,a,b,c,room}=fixture();try{
  const x=p.propose(b,room,claim);s.setMember(a,room,c,false)
  assert.throws(()=>p.list(c,room));assert.throws(()=>p.answer(c,x.id,{answer:'yes'}))
 }finally{s.close()}
})

test('stewards set the quorum and existing claims follow it',()=>{
 const {s,p,a,b,c,room}=fixture();try{
  const x=p.propose(b,room,claim);p.answer(c,x.id,{answer:'yes'})
  assert.throws(()=>p.setQuorum(b,room,1),/steward/);assert.throws(()=>p.setQuorum(a,room,0));assert.throws(()=>p.setQuorum(a,room,10))
  p.setQuorum(a,room,1);assert.equal(p.list(b,room)[0].state,'checked')
  p.setQuorum(a,room,3);assert.equal(p.list(b,room)[0].state,'open')
 }finally{s.close()}
})
