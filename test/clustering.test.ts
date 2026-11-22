import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {Etnos} from '../src/store.ts'
import {Discovery} from '../src/discovery.ts'
import {Clustering} from '../src/clustering.ts'
import {api} from '../src/api.ts'
import {etnosEnv} from '../src/env.ts'
const emeansPython=etnosEnv(process.env).ETNOS_EMEANS_PYTHON

async function fixture(){
 let now=Date.now();const s=new Etnos(':memory:','https://cluster.example.org',()=>now),owner=s.provision('did:web:cluster-owner.example','Operator'),outsider=s.provision('did:web:cluster-outsider.example','Outsider'),c=s.createCommunity(owner.actor.id,'Public sources','Public','public'),d=new Discovery(s,async()=>new Response(JSON.stringify({version:'https://jsonfeed.org/version/1.1',items:Array.from({length:8},(_,i)=>({title:'Synthetic source '+i,url:'https://news.example.org/'+i,content_text:'Permitted synthetic excerpt '+i}))}),{headers:{'content-type':'application/feed+json'}}))
 const source=d.add(owner.actor.id,{communityId:c.id,title:'Open synthetic feed',url:'https://news.example.org/feed',rights:'open',requestKey:randomUUID()});await d.refresh(owner.actor.id,source.id)
 for(const item of d.items(owner.actor.id,c.id,true))d.decide(owner.actor.id,item.id,{revision:item.revision,state:'published',requestKey:randomUUID()})
 return {s,owner,outsider,c,d,source,clustering:new Clustering(s),advance:()=>{now+=86400001}}
}
function receipt(snapshot:ReturnType<Clustering['snapshot']>){return {version:1,backend:'faiss-numpy-emeans',backendVersion:'1.16.0',readSetHash:snapshot.readSetHash,communityId:snapshot.communityId,embedding:{model:'synthetic-two-dimensional',revision:'fixture-v1',dimensions:2,normalization:'none',processing:'local-approved-public'},vectorDigest:'a'.repeat(64),rowIds:snapshot.items.map(i=>i.id),clusters:2,centroids:[[0,0],[10,10]],labels:snapshot.items.map((_,i)=>i<4?0:1),distances:snapshot.items.map(()=>0),assignment:'nearest-final-centroid-squared-l2'}}

test('public clustering imports only current rights-filtered read-sets; revoked access cannot replay; malformed results fail atomically',async()=>{
 const f=await fixture();try{
  const snap=f.clustering.snapshot(f.owner.actor.id,f.c.id),r=receipt(snap),key=randomUUID(),b={communityId:f.c.id,receipt:r,requestKey:key}
  assert.equal(snap.items.length,8);assert.throws(()=>f.clustering.snapshot(f.outsider.actor.id,f.c.id))
  assert.throws(()=>f.clustering.accept(f.owner.actor.id,{...b,receipt:{...r,labels:[0]}}),/assignments/)
  assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM clustering_runs')!.n,0)
  const accepted=f.clustering.accept(f.owner.actor.id,b);assert.deepEqual(f.clustering.accept(f.owner.actor.id,b),accepted)
  assert.equal(f.clustering.related(snap.items[0].id).items.length,3)
  const handler=api(f.s);assert.equal((await handler(new Request(f.s.base+'/v1/clustering/snapshot?community='+f.c.id))).status,401)
  const projection=await handler(new Request(f.s.base+'/v1/discovery/related/'+snap.items[0].id));assert.equal(projection.status,200);assert.doesNotMatch(await projection.text(),/operator_id|vectorDigest|centroids|sourceId/)
  f.s.run("UPDATE memberships SET active=0 WHERE actor_id=? AND community_id=?",f.owner.actor.id,f.c.id);assert.throws(()=>f.clustering.accept(f.owner.actor.id,b));f.s.run("UPDATE memberships SET active=1 WHERE actor_id=? AND community_id=?",f.owner.actor.id,f.c.id)
  f.d.state(f.owner.actor.id,f.source.id,{revision:f.source.revision,state:'paused',requestKey:randomUUID()})
  assert.throws(()=>f.clustering.related(snap.items[0].id));assert.throws(()=>f.clustering.accept(f.owner.actor.id,{...b,requestKey:randomUUID()}),/read-set changed/)
 }finally{f.s.close()}
})
test('source-policy changes, private scopes and withdrawn public items never supply stale cluster suggestions',async()=>{
 const f=await fixture();try{
  const snap=f.clustering.snapshot(f.owner.actor.id,f.c.id);f.clustering.accept(f.owner.actor.id,{communityId:f.c.id,receipt:receipt(snap),requestKey:randomUUID()})
  const first=snap.items[0],second=snap.items[1];f.d.decide(f.owner.actor.id,second.id,{revision:second.revision,state:'withdrawn',requestKey:randomUUID()})
  assert.equal(f.clustering.related(first.id).available,false)
  f.s.run("UPDATE discovery_sources SET rights='link-only' WHERE id=?",f.source.id);assert.equal(f.clustering.snapshot(f.owner.actor.id,f.c.id).items.length,0)
  f.s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?",f.c.id);assert.throws(()=>f.clustering.snapshot(f.owner.actor.id,f.c.id));assert.throws(()=>f.clustering.related(first.id))
 }finally{f.s.close()}
})
test('optional real Faiss CPU fit uses final-centroid assign and round-trips into the current public candidate index',{skip:!emeansPython},async()=>{
 const f=await fixture();try{
  const snapshot=f.clustering.snapshot(f.owner.actor.id,f.c.id),embedding={model:'synthetic-numerical-fixture',revision:'1',dimensions:2,normalization:'none',processing:'local-approved-public'},vectors=snapshot.items.map((_,i)=>i<4?[i*.01,0]:[10+i*.01,10])
  const child=spawnSync(emeansPython!,['packages/clustering-cpu/emeans.py'],{input:JSON.stringify({snapshot,embedding,vectors,clusters:2,seed:1234}),encoding:'utf8',timeout:30000,maxBuffer:200000})
  assert.equal(child.status,0,child.stderr);const r=JSON.parse(child.stdout)
  assert.equal(r.backendVersion,'1.16.0');assert.equal(r.rowIds.length,8);assert.equal(r.centroids.length,2);assert.equal(r.labels[0],r.labels[3]);assert.equal(r.labels[4],r.labels[7]);assert.notEqual(r.labels[0],r.labels[4])
  const result=f.clustering.accept(f.owner.actor.id,{communityId:f.c.id,receipt:r,requestKey:randomUUID()});assert.equal(result.items,8);assert.equal(f.clustering.related(snapshot.items[0].id).items.length,3)
 }finally{f.s.close()}
})
