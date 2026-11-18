import test from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Groups} from '../src/groups.ts'
import {Wiki} from '../src/wiki.ts'
import {api} from '../src/api.ts'
import shipped from '../src/catalogues/tanah-papua-seed-labels.json' with {type:'json'}

function world(){
 const s=new Strata(':memory:','https://labels.example.org')
 const steward=s.provision('did:web:steward.example','Steward'),other=s.provision('did:web:other.example','Other steward')
 const g=new Groups(s,{stewardDid:steward.actor.did}),w=new Wiki(s)
 const room=s.createCommunity(steward.actor.id,'Public room','Synthetic','public')
 const otherRoom=s.createCommunity(other.actor.id,'Other public room','Synthetic','public')
 const region=g.createContext(steward.actor.id,{slug:'fixture-region',title:'Fixture region',kind:'region',description:'Synthetic',language:'id',aliases:[]})
 const place=g.createContext(steward.actor.id,{slug:'fixture-place',title:'Fixture place',kind:'place',description:'Synthetic',language:'id',aliases:[]})
 const publish=(actor:string,community:string,title:string)=>{const page=w.create(actor,community,title),p=w.propose(actor,page.id,null,'Synthetic accepted text',[],'id','Synthetic');w.decide(actor,p.id,p.digest,true);return page}
 return {s,g,w,steward,other,room,otherRoom,region,place,publish}
}
const links=(s:Strata,pageId:string)=>s.all<{context_id:string}>("SELECT context_id FROM record_contexts WHERE record_kind='wiki' AND record_id=?",pageId).map(r=>r.context_id).sort()

test('seed labels attach to published public pages by title, once, and only by the node steward',()=>{
 const x=world()
 try{
  const page=x.publish(x.steward.actor.id,x.room.id,'Kabupaten Fixture')
  const seed={pages:[{title:'Kabupaten Fixture',contexts:['fixture-region','fixture-place','not-a-context']},{title:'Page that does not exist',contexts:['fixture-region']}]}
  assert.throws(()=>x.g.applySeedLabels(x.other.actor.id,seed),/Node steward/)
  assert.deepEqual(links(x.s,page.id),[])
  const first=x.g.applySeedLabels(x.steward.actor.id,seed)
  assert.equal(first.added,2);assert.equal(first.present,0)
  assert.deepEqual(first.missingPages,['Page that does not exist']);assert.deepEqual(first.missingContexts,['not-a-context'])
  assert.deepEqual(links(x.s,page.id),[x.region.id,x.place.id].sort())
  // Running it again adds nothing.
  const again=x.g.applySeedLabels(x.steward.actor.id,seed)
  assert.equal(again.added,0);assert.equal(again.present,2)
  // The page now counts toward the place, so the place page and Jelajah have something to show.
  assert.equal(x.g.contexts().find(c=>c.id===x.place.id)?.indexed,1)
  assert.throws(()=>x.g.applySeedLabels(x.steward.actor.id,{pages:[{title:'x',contexts:'fixture-region'}]} as never),/Invalid seed labels/)
 }finally{x.s.close()}
})

test('seed labels never touch drafts, unpublished pages or pages in private communities',()=>{
 const x=world()
 try{
  const draft=x.w.createDraft(x.steward.actor.id,x.room.id,'Draft fixture',{text:'Not accepted',citations:[],language:'id',perspective:'Synthetic'})
  const bare=x.w.create(x.steward.actor.id,x.room.id,'Bare fixture')
  x.publish(x.other.actor.id,x.otherRoom.id,'Shared title fixture')
  // A private community cannot hold wiki pages at all; force one in to prove the query still refuses it.
  const hidden=x.s.createCommunity(x.steward.actor.id,'Hidden room','Synthetic','hidden-private')
  x.s.run("INSERT INTO wiki_pages(id,community_id,title,created) VALUES('hidden-page',?,?,?)",hidden.id,'Hidden fixture',Date.now())
  x.s.run("UPDATE wiki_pages SET revision_id=(SELECT revision_id FROM wiki_pages WHERE title='Shared title fixture') WHERE id='hidden-page'")
  const draftId=(draft as {pageId?:string;page?:{id:string};id:string}).page?.id??(draft as {id:string}).id
  const result=x.g.applySeedLabels(x.steward.actor.id,{pages:['Draft fixture','Bare fixture','Hidden fixture','Shared title fixture'].map(title=>({title,contexts:['fixture-region']}))})
  assert.deepEqual(result.missingPages.sort(),['Bare fixture','Draft fixture','Hidden fixture'])
  assert.equal(result.added,1)
  assert.deepEqual(links(x.s,'hidden-page'),[]);assert.deepEqual(links(x.s,bare.id),[]);assert.deepEqual(links(x.s,draftId),[])
 }finally{x.s.close()}
})

test('the shipped seed labels name real catalogue contexts and are reachable only over an authenticated POST',async()=>{
 const catalogue=(await import('../src/catalogues/tanah-papua.json',{with:{type:'json'}})).default as {entries:{slug:string}[]}
 const slugs=new Set(catalogue.entries.map(e=>e.slug))
 for(const page of (shipped as {pages:{title:string;contexts:string[]}[]}).pages)for(const c of page.contexts)assert.ok(slugs.has(c),page.title+' → '+c)
 const x=world()
 try{
  const res=await api(x.s)(new Request(x.s.base+'/v1/contexts/seed-labels',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}))
  assert.ok([401,403].includes(res.status),String(res.status))
 }finally{x.s.close()}
})
