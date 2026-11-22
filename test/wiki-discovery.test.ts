import test from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Wiki} from '../src/wiki.ts'
import {api} from '../src/api.ts'

test('Wiki discovery projects only accepted public revisions, never drafts or protected page metadata',async()=>{
 const s=new Etnos(':memory:','https://wiki-discovery.example.org'),owner=s.provision('did:web:wiki-reader.example','Human operator'),room=s.createCommunity(owner.actor.id,'Public knowledge','Public','public'),wiki=new Wiki(s)
 try{
  const page=wiki.create(owner.actor.id,room.id,'A public landscape'),proposal=wiki.propose(owner.actor.id,page.id,null,'## A section\n\nA [source-backed landscape](https://example.org/source) with **ordinary knowledge**.',['https://example.org/source'],'id','Community')
  wiki.decide(owner.actor.id,proposal.id,proposal.digest,true)
  const draft=wiki.createDraft(owner.actor.id,room.id,'Restricted draft title',{text:'Pending secret wording',citations:[],language:'id',perspective:'Draft'})
  wiki.propose(owner.actor.id,page.id,wiki.read(page.id).revision!.id,'Unaccepted replacement secret',[],'id','Pending')
  const hidden=s.createCommunity(owner.actor.id,'Protected fixture','Must not appear','public'),secret=wiki.create(owner.actor.id,hidden.id,'Protected page title'),p=wiki.propose(owner.actor.id,secret.id,null,'Protected body',[],'id','Protected')
  wiki.decide(owner.actor.id,p.id,p.digest,true)
  // Simulate a protected imported/migrated page: the public API cannot create one.
  s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?",hidden.id)
  const result=wiki.discover();assert.equal(result.length,1);assert.equal(result[0].id,page.id)
  assert.equal(result[0].excerpt,'A source-backed landscape with ordinary knowledge.');assert.equal(result[0].citationCount,1);assert.equal(result[0].sectionCount,1)
  const json=JSON.stringify(result);for(const forbidden of ['Restricted draft title','Pending secret wording','Unaccepted replacement secret','Protected page title','Protected body',draft.id,'author_id','proposal_id'])assert.equal(json.includes(forbidden),false)
  const response=await api(s)(new Request(s.base+'/v1/wiki/discover'))
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),result)
  s.run("UPDATE communities SET visibility='listed-private' WHERE id=?",room.id)
  assert.deepEqual(wiki.discover(),[])
 }finally{s.close()}
})
