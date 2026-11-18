import test from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Seasons} from '../src/seasons.ts'
import {Forum} from '../src/forum.ts'
import {api} from '../src/api.ts'

function world(){
 const s=new Strata(':memory:','https://seasons.example.org',()=>Date.parse('2026-11-18T00:00:00Z'))
 const owner=s.provision('did:web:season-owner.example','Owner'),member=s.provision('did:web:season-member.example','Member'),outsider=s.provision('did:web:season-outsider.example','Outsider')
 return {s,owner,member,outsider,seasons:new Seasons(s),forum:new Forum(s)}
}

test('stewards name a community\'s seasons; members may not; names stay distinct and at most twelve',()=>{
 const w=world()
 try{
  const room=w.s.createCommunity(w.owner.actor.id,'Kampung','Synthetic','public',false,'open');w.s.join(w.member.actor.id,room.id)
  const wind=w.seasons.add(w.owner.actor.id,room.id,{name:'  Musim angin   barat ',note:'Synthetic note'})
  assert.equal(wind.name,'Musim angin barat');assert.equal(wind.archived,false)
  assert.throws(()=>w.seasons.add(w.member.actor.id,room.id,{name:'Musim ikan'}),/steward/)
  assert.throws(()=>w.seasons.add(w.owner.actor.id,room.id,{name:'musim ANGIN barat'}),/already exists/)
  assert.throws(()=>w.seasons.add(w.owner.actor.id,room.id,{name:''}),/needs a name/)
  assert.throws(()=>w.seasons.add(w.owner.actor.id,room.id,{name:'x'.repeat(61)}),/Invalid season name/)
  for(let i=1;i<12;i++)w.seasons.add(w.owner.actor.id,room.id,{name:'Musim '+i})
  assert.throws(()=>w.seasons.add(w.owner.actor.id,room.id,{name:'Musim 13'}),/at most twelve/)
  assert.equal(w.seasons.list(room.id).length,12)
  // A steward who steps down loses the right at once.
  w.s.setMember(w.owner.actor.id,room.id,w.member.actor.id,true,'moderator')
  w.seasons.update(w.member.actor.id,room.id,wind.id,{note:''})
  w.s.setMember(w.owner.actor.id,room.id,w.member.actor.id,true,'member')
  assert.throws(()=>w.seasons.update(w.member.actor.id,room.id,wind.id,{note:'Again'}),/steward/)
 }finally{w.s.close()}
})

test('a post carries a season of its own community only, and a retired season stays on old posts',()=>{
 const w=world()
 try{
  const room=w.s.createCommunity(w.owner.actor.id,'Kampung','Synthetic','public',false,'open'),other=w.s.createCommunity(w.owner.actor.id,'Lain','Synthetic','public',false,'open')
  w.s.join(w.member.actor.id,room.id)
  const harvest=w.seasons.add(w.owner.actor.id,room.id,{name:'Musim panen'}),foreign=w.seasons.add(w.owner.actor.id,other.id,{name:'Musim lain'})
  const post=w.s.createPost(w.member.actor.id,room.id,'Ubi sudah besar',undefined,undefined,{content:{season:harvest.id}})
  assert.deepEqual(post.season,{id:harvest.id,name:'Musim panen'})
  assert.throws(()=>w.s.createPost(w.member.actor.id,room.id,'Salah musim',undefined,undefined,{content:{season:foreign.id}}),/season of this community/)
  assert.throws(()=>w.s.createPost(w.member.actor.id,room.id,'Bukan id',undefined,undefined,{content:{season:'panen'}}),/Invalid season/)
  assert.equal(w.s.createPost(w.member.actor.id,room.id,'Tanpa musim').season,null)
  // Retiring keeps the name on what already carries it and stops new use.
  w.seasons.update(w.owner.actor.id,room.id,harvest.id,{archived:true})
  assert.deepEqual(w.s.getPost(w.member.actor.id,post.id).season,{id:harvest.id,name:'Musim panen'})
  assert.throws(()=>w.s.createPost(w.member.actor.id,room.id,'Baru',undefined,undefined,{content:{season:harvest.id}}),/season of this community/)
  assert.equal(w.seasons.list(room.id).at(-1)!.archived,true)
  // An edit that does not mention the season keeps it, even a retired one; null removes it.
  const kept=w.forum.edit(w.member.actor.id,post.id,{text:'Ubi sudah besar sekali',revision:post.revision,content:{}})
  assert.equal(kept.season?.id,harvest.id)
  assert.throws(()=>w.forum.edit(w.member.actor.id,post.id,{text:'x',revision:kept.revision,content:{season:foreign.id}}),/season of this community/)
  const cleared=w.forum.edit(w.member.actor.id,post.id,{text:'Ubi sudah besar sekali',revision:kept.revision,content:{season:null}})
  assert.equal(cleared.season,null)
  // Deleting the post removes the season with the rest of its content.
  const tagged=w.s.createPost(w.member.actor.id,room.id,'Hapus nanti',undefined,undefined,{content:{season:w.seasons.add(w.owner.actor.id,room.id,{name:'Musim hujan'}).id}})
  w.forum.delete(w.member.actor.id,tagged.id,tagged.revision)
  assert.equal(w.s.getPost(w.member.actor.id,tagged.id).season,null)
 }finally{w.s.close()}
})

test('seasons of a private community stay inside it',async()=>{
 const w=world()
 try{
  const closed=w.s.createCommunity(w.owner.actor.id,'Ruang marga','Synthetic','listed-private')
  w.seasons.add(w.owner.actor.id,closed.id,{name:'Musim rahasia',note:'Catatan dalam'})
  assert.throws(()=>w.seasons.list(closed.id,w.outsider.actor.id),/Not found/)
  assert.throws(()=>w.seasons.list(closed.id),/Not found/)
  assert.equal(w.seasons.list(closed.id,w.owner.actor.id).length,1)
  const handler=api(w.s),response=await handler(new Request(w.s.base+'/v1/communities/'+closed.id+'/seasons')),body=await response.text()
  assert.equal(response.status,404);assert.equal(body.includes('Musim rahasia'),false);assert.equal(body.includes('Catatan dalam'),false)
  const denied=await handler(new Request(w.s.base+'/v1/communities/'+closed.id+'/seasons',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Masuk'})}))
  assert.equal(denied.status,401)
 }finally{w.s.close()}
})
