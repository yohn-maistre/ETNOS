import {randomUUID} from 'node:crypto'
import {StrataCore,Fault} from './core.ts'
import {Discovery} from './discovery.ts'
import {hash,publicSteward,text,transition} from './commons.ts'

/** Optional public candidate index. Cluster labels never establish identity or authority. */
export class Clustering {
 readonly store:StrataCore
 constructor(store:StrataCore){this.store=store}
 private publicItems(communityId:string){
  if(this.store.community(communityId).visibility!=='public')throw new Fault(404,'Not found')
  return new Discovery(this.store).items(undefined,communityId).map(i=>({...i,evidence:i.evidence.filter(e=>e.state==='active'&&e.sourceRevision===e.currentRevision&&e.rights!=='link-only')})).filter(i=>i.evidence.length).sort((a,b)=>a.id.localeCompare(b.id)).map(i=>({id:i.id,revision:i.revision,title:i.title,summary:i.summary,url:i.url,evidence:i.evidence.map(e=>({sourceId:e.sourceId,revision:e.sourceRevision,rights:e.rights})).sort((a,b)=>a.sourceId.localeCompare(b.sourceId))}))
 }
 private current(communityId:string){const items=this.publicItems(communityId);return {communityId,items,readSetHash:hash({communityId,items})}}
 private operator(actorId:string,communityId:string){publicSteward(this.store,actorId,communityId);if(this.store.actor(actorId).kind!=='human')throw new Fault(403,'Human operator required')}
 snapshot(actorId:string,communityId:string){this.operator(actorId,communityId);return this.current(communityId)}
 accept(actorId:string,b:Record<string,unknown>){
  const communityId=text(b.communityId,100),r=b.receipt as Record<string,unknown>|undefined
  if(!r||typeof r!=='object'||Array.isArray(r))throw new Fault(400,'CPU receipt required')
  return transition(this.store,actorId,b.requestKey,'clustering.accept',{communityId,receipt:r},()=>this.operator(actorId,communityId),()=>{
   const snapshot=this.current(communityId),n=snapshot.items.length,embedding=r.embedding as Record<string,unknown>|undefined
   if(r.readSetHash!==snapshot.readSetHash||r.communityId!==communityId)throw new Fault(409,'Public source read-set changed; export and fit again')
   const d=embedding?.dimensions,k=r.clusters
   if(r.version!==1||r.backend!=='faiss-numpy-emeans'||r.backendVersion!=='1.16.0'||r.assignment!=='nearest-final-centroid-squared-l2'||typeof r.vectorDigest!=='string'||!/^[a-f0-9]{64}$/.test(r.vectorDigest))throw new Fault(400,'Pinned e-means final-assignment receipt required')
   if(!embedding||typeof embedding.model!=='string'||!embedding.model.trim()||embedding.model.length>160||typeof embedding.revision!=='string'||!embedding.revision.trim()||embedding.revision.length>160||!['none','l2'].includes(String(embedding.normalization))||embedding.processing!=='local-approved-public'||!Number.isSafeInteger(d)||Number(d)<1||Number(d)>1024||!Number.isSafeInteger(k)||Number(k)<1||Number(k)>Math.min(32,n)||n<2)throw new Fault(400,'Invalid versioned public embedding recipe')
   if(!Array.isArray(r.rowIds)||r.rowIds.length!==n||r.rowIds.some((id,i)=>id!==snapshot.items[i].id)||!Array.isArray(r.labels)||r.labels.length!==n||r.labels.some(x=>!Number.isSafeInteger(x)||x<0||x>=Number(k))||!Array.isArray(r.distances)||r.distances.length!==n||r.distances.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0)||!Array.isArray(r.centroids)||r.centroids.length!==k||r.centroids.some(v=>!Array.isArray(v)||v.length!==d||v.some(x=>typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1e10)))throw new Fault(400,'Invalid bounded cluster assignments')
   const now=this.store.clock();if(this.store.get<{n:number}>('SELECT count(*) n FROM clustering_runs WHERE community_id=? AND created>?',communityId,now-86400000)!.n>=12)throw new Fault(429,'Daily clustering import budget reached')
   const id=randomUUID()
   this.store.run('INSERT INTO clustering_runs VALUES(?,?,?,?,?,?)',id,communityId,actorId,snapshot.readSetHash,JSON.stringify(r),now)
   for(let i=0;i<n;i++)this.store.run('INSERT INTO clustering_assignments VALUES(?,?,?,?,?)',id,snapshot.items[i].id,snapshot.items[i].revision,r.labels[i],r.distances[i])
   return {id,communityId,readSetHash:snapshot.readSetHash,items:n,backend:r.backend,embedding,created:now,qualification:'operator-imported CPU receipt; semantic grouping not certified'}
  })
 }
 related(itemId:string){
  const item=new Discovery(this.store).item(itemId),snapshot=this.current(item.community_id)
  const run=this.store.get<{id:string;read_set_hash:string;receipt:string}>('SELECT id,read_set_hash,receipt FROM clustering_runs WHERE community_id=? ORDER BY created DESC,id DESC LIMIT 1',item.community_id)
  if(!run||run.read_set_hash!==snapshot.readSetHash)return {available:false,reason:'No current public clustering receipt',items:[]}
  const assignment=this.store.get<{label:number}>('SELECT label FROM clustering_assignments WHERE run_id=? AND item_id=? AND item_revision=?',run.id,itemId,item.revision)
  if(!assignment)return {available:false,reason:'Item has no eligible public assignment',items:[]}
  const ids=this.store.all<{item_id:string}>('SELECT item_id FROM clustering_assignments WHERE run_id=? AND label=? AND item_id!=? ORDER BY distance,item_id LIMIT 8',run.id,assignment.label,itemId)
  const eligible=new Map(snapshot.items.map(x=>[x.id,x]));return {available:true,runId:run.id,reason:'Related public source candidates; shared e-means cluster',items:ids.flatMap(r=>{const v=eligible.get(r.item_id);return v?[{id:v.id,title:v.title,url:v.url,revision:v.revision}]:[]})}
 }
}
