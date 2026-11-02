import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {api} from '../src/api.ts'
test('canonical-link discussions preserve current community visibility, revocation and paging',async()=>{
 const s=new Strata(':memory:','http://localhost:7788'),owner=s.provision('did:web:related-owner.example','Owner'),reader=s.provision('did:web:related-reader.example','Reader')
 try{
 const pub=s.createCommunity(owner.actor.id,'Public','Visible','public'),priv=s.createCommunity(owner.actor.id,'Hidden','Private','hidden-private')
 s.setMember(owner.actor.id,priv.id,reader.actor.id,true)
 const url='https://westpapua.watch/story/?id=42',create=(cid:string)=>s.createPost(owner.actor.id,cid,'A related discussion',undefined,undefined,{content:{url}})
 const one=create(pub.id),secret=create(priv.id);s.createPost(owner.actor.id,pub.id,'Other news',undefined,undefined,{content:{url:'https://westpapua.watch/story/?id=99'}})
 assert.deepEqual(s.feedPage(undefined,{linkUrls:[url]}).items.map(p=>p.id),[one.id])
 assert.equal(s.feedPage(reader.actor.id,{linkUrls:[url]}).items.length,2)
 s.setMember(owner.actor.id,priv.id,reader.actor.id,false)
 assert.deepEqual(s.feedPage(reader.actor.id,{linkUrls:[url]}).items.map(p=>p.id),[one.id]);assert.equal(s.feedPage(undefined,{linkUrls:[]}).items.length,0)
 assert.throws(()=>s.feedPage(undefined,{linkUrls:Array(17).fill(url)}))
 const handler=api(s),response=await handler(new Request('http://localhost:7788/v1/feed/page?'+new URLSearchParams({links:JSON.stringify([url]),limit:'1'})))
 assert.equal(response.status,200);const page=await response.json();assert.equal(page.items[0].id,one.id);assert.equal(JSON.stringify(page).includes(secret.id),false)
 const malformed=await handler(new Request('http://localhost:7788/v1/feed/page?links=invalid'));assert.equal(malformed.status,400)
 }finally{s.close()}
})
