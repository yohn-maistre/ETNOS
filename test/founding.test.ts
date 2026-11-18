import test from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Founding,FORMING_DAYS} from '../src/founding.ts'
import {Groups} from '../src/groups.ts'
import {api} from '../src/api.ts'

function world(){
 let now=Date.parse('2026-11-18T00:00:00Z')
 const s=new Strata(':memory:','https://founding.example.org',()=>now)
 const founder=s.provision('did:web:founder.example','Founder'),friend=s.provision('did:web:friend.example','Friend'),third=s.provision('did:web:third.example','Third'),outsider=s.provision('did:web:outsider.example','Outsider')
 return {s,founder,friend,third,outsider,f:new Founding(s),advance:(ms:number)=>{now+=ms}}
}
const day=86400000

test('a new community waits, unseen, until a second person accepts the link; then the founder\'s choices apply',async()=>{
 const w=world()
 try{
  const started=w.f.found(w.founder.actor.id,{title:'Pemuda Kampung Fixture',description:'Ruang menunggu fixture',visibility:'public',admission:'open'})
  assert.equal(started.visibility,'hidden-private');assert.equal(started.forming?.visibility,'public');assert.equal(started.forming?.lapsed,false)
  assert.equal(started.forming?.until,Date.parse('2026-11-18T00:00:00Z')+FORMING_DAYS*day)
  // Only the founder sees it: not in listings, not readable, not joinable, posts stay inside.
  assert.ok(w.s.listCommunities(w.founder.actor.id).some(c=>c.id===started.id))
  assert.ok(!w.s.listCommunities(w.outsider.actor.id).some(c=>c.id===started.id))
  assert.ok(!w.s.listCommunities().some(c=>c.id===started.id))
  assert.throws(()=>w.s.join(w.outsider.actor.id,started.id),/Not found/)
  const early=w.s.createPost(w.founder.actor.id,started.id,'Catatan pertama fixture')
  assert.throws(()=>w.s.getPost(w.outsider.actor.id,early.id),/Not found/)
  const handler=api(w.s)
  for(const path of ['/v1/communities/'+started.id,'/v1/communities','/v1/feed'])
   {const text=await (await handler(new Request(w.s.base+path))).text();assert.equal(text.includes('Pemuda Kampung Fixture'),false,path);assert.equal(text.includes('Catatan pertama fixture'),false,path)}
  // The link shows who sent it and what it is, before signing in, through the body only.
  const preview=await handler(new Request(w.s.base+'/v1/founding/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:started.token})}))
  assert.equal(preview.status,200);const shown=await preview.json() as {community:{title:string;visibility:string};founder:{name:string};forming:boolean}
  assert.equal(shown.community.title,'Pemuda Kampung Fixture');assert.equal(shown.community.visibility,'public');assert.equal(shown.founder.name,'Founder');assert.equal(shown.forming,true)
  assert.equal((await handler(new Request(w.s.base+'/v1/founding/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'x'.repeat(43)})}))).status,404)
  // The founder accepting their own link changes nothing.
  assert.throws(()=>w.f.accept(w.founder.actor.id,started.token),/already exists/)
  const opened=w.f.accept(w.friend.actor.id,started.token)
  assert.equal(opened.visibility,'public');assert.equal(opened.admission,'open');assert.equal(opened.forming,null)
  assert.ok(w.s.listCommunities().some(c=>c.id===started.id))
  assert.equal(w.s.getPost(w.outsider.actor.id,early.id).text,'Catatan pertama fixture')
  // The link sent to a group keeps working for the others until the window ends; opening happened once.
  w.f.accept(w.third.actor.id,started.token)
  assert.equal(w.s.all("SELECT 1 FROM audit WHERE action='community.open' AND target=?",started.id).length,1)
  assert.throws(()=>w.f.renew(w.founder.actor.id,started.id),/already open/)
 }finally{w.s.close()}
})

test('labels chosen at founding wait with the room and show once it opens',()=>{
 const w=world()
 try{
  const g=new Groups(w.s,{stewardDid:w.founder.actor.did}),place=g.createContext(w.founder.actor.id,{slug:'fixture-place',title:'Fixture place',kind:'place',description:'Synthetic',language:'id',aliases:[]})
  const room=w.f.found(w.founder.actor.id,{title:'Labelled',description:'Synthetic',visibility:'public'})
  g.labelCommunity(w.founder.actor.id,room.id,place.id)
  assert.deepEqual(g.communityContexts(room.id),[]);assert.equal(g.communitiesIn(place.id).length,0)
  w.f.accept(w.friend.actor.id,room.token)
  assert.equal(g.communityContexts(room.id).length,1);assert.equal(g.communitiesIn(place.id).length,1)
  // A community founded as hidden stays unlabelled.
  const hidden=w.f.found(w.founder.actor.id,{title:'Hidden',description:'Synthetic',visibility:'hidden-private'})
  assert.throws(()=>g.labelCommunity(w.founder.actor.id,hidden.id,place.id),/Hidden communities/)
 }finally{w.s.close()}
})

test('an unopened room lapses after 14 days: the link dies and nothing more can be posted',()=>{
 const w=world()
 try{
  const room=w.f.found(w.founder.actor.id,{title:'Lapses',description:'Synthetic',visibility:'listed-private',admission:'approval'})
  w.advance(FORMING_DAYS*day)
  assert.throws(()=>w.f.preview(room.token),/Not found/)
  assert.throws(()=>w.f.accept(w.friend.actor.id,room.token),/Not found/)
  assert.throws(()=>w.s.createPost(w.founder.actor.id,room.id,'Too late'),/did not open/)
  assert.throws(()=>w.f.renew(w.founder.actor.id,room.id),/did not open in time/)
  assert.equal(w.f.view(room.id).forming?.lapsed,true);assert.equal(w.f.view(room.id).visibility,'hidden-private')
  // Another way in does not reopen a lapsed room.
  w.s.setMember(w.founder.actor.id,room.id,w.friend.actor.id,true)
  assert.equal(w.f.view(room.id).visibility,'hidden-private')
 }finally{w.s.close()}
})

test('the founder can withdraw: the link stops and the room never opens',()=>{
 const w=world()
 try{
  const room=w.f.found(w.founder.actor.id,{title:'Withdrawn',description:'Synthetic',visibility:'public'})
  const renewed=w.f.renew(w.founder.actor.id,room.id)
  assert.throws(()=>w.f.accept(w.friend.actor.id,room.token),/Not found/) // replaced
  assert.throws(()=>w.f.withdraw(w.friend.actor.id,room.id),/Not found|steward/)
  w.f.withdraw(w.founder.actor.id,room.id)
  assert.throws(()=>w.f.accept(w.friend.actor.id,renewed.token),/Not found/)
  assert.equal(w.f.view(room.id).forming?.lapsed,true)
  assert.ok(!w.s.listCommunities(w.friend.actor.id).some(c=>c.id===room.id))
 }finally{w.s.close()}
})

test('agents cannot open a room, a founder keeps at most three waiting, and other ways in also open it',()=>{
 const w=world()
 try{
  const agent=w.s.provision('did:web:agent.example','Agent fixture',w.founder.actor.id)
  const room=w.f.found(w.founder.actor.id,{title:'One',description:'Synthetic',visibility:'public'})
  assert.throws(()=>w.f.accept(agent.actor.id,room.token),/person must accept/)
  assert.equal(w.f.view(room.id).visibility,'hidden-private')
  w.f.found(w.founder.actor.id,{title:'Two',description:'Synthetic',visibility:'public'});w.f.found(w.founder.actor.id,{title:'Three',description:'Synthetic',visibility:'public'})
  assert.throws(()=>w.f.found(w.founder.actor.id,{title:'Four',description:'Synthetic',visibility:'public'}),/Wait for one/)
  assert.throws(()=>w.f.found(w.founder.actor.id,{title:'Bad',description:'Synthetic',visibility:'hidden-private',admission:'open'}),/admission/)
  // A direct invitation counts as the second person too.
  const invite=w.s.inviteMember(w.founder.actor.id,room.id,w.friend.actor.id,Date.parse('2026-11-18T12:00:00Z'))
  w.s.acceptInvitation(w.friend.actor.id,invite.token)
  assert.equal(w.f.view(room.id).visibility,'public')
  assert.ok(w.f.found(w.founder.actor.id,{title:'Four',description:'Synthetic',visibility:'public'}).id)
 }finally{w.s.close()}
})
