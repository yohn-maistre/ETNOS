import test from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Groups} from '../src/groups.ts'
import {api} from '../src/api.ts'

test('Sedang dibicarakan counts only public, visible posts, by thread label or community label, inside the window',async()=>{
 let now=Date.parse('2026-11-18T00:00:00Z')
 const s=new Strata(':memory:','https://talked.example.org',()=>now)
 try{
  const steward=s.provision('did:web:steward.example','Steward'),friend=s.provision('did:web:friend.example','Friend')
  const g=new Groups(s,{stewardDid:steward.actor.did})
  const ctx=(slug:string,kind:'place'|'topic')=>g.createContext(steward.actor.id,{slug,title:slug,kind,description:'Synthetic',language:'id',aliases:[]})
  const nabire=ctx('fixture-nabire','place'),music=ctx('fixture-music','topic'),quiet=ctx('fixture-quiet','place')
  const open=s.createCommunity(steward.actor.id,'Open room','Synthetic','public')
  const musicRoom=s.createCommunity(steward.actor.id,'Music room','Synthetic','public')
  const secret=s.createCommunity(steward.actor.id,'Secret room','Synthetic','listed-private')
  s.join(friend.actor.id,open.id)
  g.labelCommunity(steward.actor.id,musicRoom.id,music.id)
  // An old thread outside the window.
  const old=s.createPost(steward.actor.id,open.id,'Old Nabire thread');g.attach(steward.actor.id,'post',old.id,nabire.id)
  now+=10*86400000
  // A labelled thread with replies, the busiest for Nabire.
  const busy=s.createPost(steward.actor.id,open.id,'Pasar malam di Nabire');g.attach(steward.actor.id,'post',busy.id,nabire.id)
  s.createPost(friend.actor.id,open.id,'Saya ikut',busy.id);s.createPost(friend.actor.id,open.id,'Jam berapa?',busy.id)
  const second=s.createPost(friend.actor.id,open.id,'Hujan di Nabire');g.attach(friend.actor.id,'post',second.id,nabire.id)
  // A post in a community labelled Music counts for Music without its own label.
  s.createPost(steward.actor.id,musicRoom.id,'Latihan suling malam ini')
  // Never counted: a private community's post (even with a stored label), a hidden thread, a reply under it.
  const hiddenPost=s.createPost(steward.actor.id,secret.id,'SECRET Nabire plan')
  s.run("INSERT INTO record_contexts VALUES('post',?,?,?,?)",hiddenPost.id,nabire.id,steward.actor.id,now)
  s.run("INSERT INTO community_contexts(community_id,context_id,issuer_id,created) VALUES(?,?,?,?)",secret.id,quiet.id,steward.actor.id,now)
  const removed=s.createPost(steward.actor.id,open.id,'REMOVED Nabire thread');g.attach(steward.actor.id,'post',removed.id,nabire.id)
  s.createPost(friend.actor.id,open.id,'REMOVED reply',removed.id)
  s.hidePost(steward.actor.id,removed.id)

  const result=g.talked(7)
  assert.equal(result.days,7)
  assert.deepEqual(result.items.map(i=>i.context.slug),['fixture-nabire','fixture-music'])
  const n=result.items[0]
  assert.equal(n.threads,2);assert.equal(n.posts,4);assert.equal(n.people,2)
  assert.equal(n.lead?.id,busy.id);assert.equal(n.lead?.title,'Pasar malam di Nabire')
  assert.equal(result.items[1].posts,1)
  // Over HTTP, nothing private or removed leaks into the response.
  const body=await (await api(s)(new Request(s.base+'/v1/contexts/talked?days=30'))).text()
  for(const word of ['SECRET','REMOVED','fixture-quiet'])assert.equal(body.includes(word),false,word)
  // The window is clamped; a quiet week returns nothing rather than old news.
  now+=60*86400000
  assert.deepEqual(g.talked(7).items,[])
  assert.equal(g.talked(1000).days,90)
 }finally{s.close()}
})
