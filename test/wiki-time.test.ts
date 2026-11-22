import test from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Wiki} from '../src/wiki.ts'
import {api} from '../src/api.ts'

function world(){
 const s=new Etnos(':memory:','https://wiki-time.example.org',()=>Date.parse('2026-11-15T00:00:00Z')),owner=s.provision('did:web:time-owner.example','Owner'),other=s.provision('did:web:time-other.example','Other'),wiki=new Wiki(s)
 const page=(communityId:string,title:string,body:string)=>{const w=wiki.create(owner.actor.id,communityId,title),p=wiki.propose(owner.actor.id,w.id,null,body,[],'id','Synthetic');wiki.decide(owner.actor.id,p.id,p.digest,true);return w}
 return {s,owner,other,wiki,page}
}

test('a reviewer sets the period a page is about, and the timeline orders by it',()=>{
 const w=world()
 try{
  const room=w.s.createCommunity(w.owner.actor.id,'Public','Synthetic','public'),old=w.page(room.id,'Older','Older body'),recent=w.page(room.id,'Recent','Recent body'),undated=w.page(room.id,'Undated','Undated body')
  assert.equal(w.wiki.read(old.id).time,null)
  w.wiki.setTime(w.owner.actor.id,old.id,{from:1855,to:1855,precision:'year',note:''})
  w.wiki.setTime(w.owner.actor.id,recent.id,{from:1960,to:1969,precision:'decade',note:'Synthetic note'})
  assert.deepEqual(w.wiki.read(recent.id).time,{from:1960,to:1969,precision:'decade',note:'Synthetic note'})
  const line=w.wiki.timeline()
  assert.deepEqual(line.map(x=>x.title),['Recent','Older']);assert.equal(line[0].excerpt,'Recent body')
  assert.deepEqual(Object.keys(line[0]).sort(),['community_id','excerpt','from','id','note','precision','title','to'])
  assert.ok(!JSON.stringify(line).includes(undated.id))
  w.wiki.setTime(w.owner.actor.id,old.id,{from:-40000,to:-30000,precision:'deep',note:''}) // replaces
  assert.equal(w.wiki.timeline()[1].from,-40000)
  w.wiki.setTime(w.owner.actor.id,old.id,null)
  assert.equal(w.wiki.timeline().length,1)
  for(const bad of [{from:1970,to:1960,precision:'year',note:''},{from:1.5,to:2,precision:'year',note:''},{from:2000,to:2027,precision:'year',note:''},{from:1,to:2,precision:'era',note:''},{from:1,to:2,precision:'year',note:'x'.repeat(201)}])
   assert.throws(()=>w.wiki.setTime(w.owner.actor.id,recent.id,bad),/Invalid period/)
 }finally{w.s.close()}
})

test('only a reviewer may set a period, and nothing from a private or draft page reaches the timeline',async()=>{
 const w=world()
 try{
  const room=w.s.createCommunity(w.owner.actor.id,'Public','Synthetic','public',false,'open'),page=w.page(room.id,'Open page','Open body')
  const closed=w.s.createCommunity(w.owner.actor.id,'Protected fixture','Synthetic','public'),secret=w.page(closed.id,'Protected page title','Protected body')
  w.wiki.setTime(w.owner.actor.id,secret.id,{from:1900,to:1900,precision:'year',note:'Protected note'})
  // Simulate a community that became private after the period was set.
  w.s.run("UPDATE communities SET visibility='listed-private' WHERE id=?",closed.id)
  const draft=w.wiki.createDraft(w.owner.actor.id,room.id,'Restricted draft title',{text:'Pending secret wording',citations:[],language:'id',perspective:'Draft'})
  w.s.run("INSERT INTO record_times VALUES('wiki',?,1800,1800,'year','Draft note',?,0)",draft.id,w.owner.actor.id)
  w.s.join(w.other.actor.id,room.id)
  assert.throws(()=>w.wiki.setTime(w.other.actor.id,page.id,{from:1900,to:1900,precision:'year',note:''}),/Not found/)
  assert.deepEqual(w.wiki.timeline(),[])
  w.wiki.setTime(w.owner.actor.id,page.id,{from:1900,to:1900,precision:'year',note:''})
  const handler=api(w.s),response=await handler(new Request(w.s.base+'/v1/wiki/timeline')),json=await response.text()
  assert.equal(response.status,200);assert.equal(JSON.parse(json).length,1)
  for(const forbidden of ['Protected page title','Protected body','Protected note','Restricted draft title','Pending secret wording','Draft note',secret.id,draft.id])assert.equal(json.includes(forbidden),false,forbidden)
  const denied=await handler(new Request(w.s.base+'/v1/wiki/'+page.id+'/time',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({from:1,to:2,precision:'year'})}))
  assert.equal(denied.status,401)
 }finally{w.s.close()}
})
