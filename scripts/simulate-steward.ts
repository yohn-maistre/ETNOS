/** Isolated operator demo only. Never import into the public Worker. */
import {readFileSync,mkdirSync,writeFileSync,chmodSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {Discovery} from '../src/discovery.ts'
import {Resident,type ResidentProvider} from '../src/resident.ts'
import {Knowledge} from '../src/knowledge.ts'

export async function simulateSteward(database=':memory:',base='http://127.0.0.1:7351'){
 if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Simulation is loopback-only')
 let clock=Date.now();const s=new Etnos(database,base,()=>clock++)
 if(s.get<{n:number}>('SELECT count(*) n FROM actors')!.n){s.close();throw Error('Simulation requires an empty dedicated database; existing data was not changed')}
 try{
  const owner=s.provision('did:web:steward-demo.example','Operator · simulasi'),community=s.createCommunity(owner.actor.id,'Simulasi pengetahuan bersama','Contoh terisolasi; bukan komunitas atau persetujuan institusi nyata.','public',true,'open')
  const urls=['https://www.fieldmuseum.org/about/press/new-species-crocodile-discovered-museum-collections','https://reptile-database.reptarium.cz/Crocodylus/halli']
  const title='Crocodylus halli: buaya Nugini yang dikenali dari koleksi museum'
  const article=readFileSync(new URL('../examples/wiki/crocodylus-halli.md',import.meta.url),'utf8').split('\n## Sumber\n')[0].replace(/^# .*\n/,'').trim()
  const provider:ResidentProvider={label:'SIMULASI · sintesis rujukan publik terkurasi',draft:async()=>({text:article,model:'simulated:curated-reference-draft',inputTokens:0,outputTokens:0})}
  const r=new Resident(s,undefined,provider),setup=r.setup(owner.actor.id,{communityId:community.id,consent:true,includeSource:false,requestKey:randomUUID()}),config=setup.config!
  // Acquisition is deliberately a labelled fixture, not a claim these pages serve RSS.
  const d=new Discovery(s,async()=>Response.json({version:'https://jsonfeed.org/version/1.1',items:urls.map(url=>({url,title}))}))
  const source=d.add(owner.actor.id,{communityId:community.id,title:'SIMULASI · indeks rujukan terkurasi',url:urls[0],rights:'link-only',mode:'review',requestKey:randomUUID()})
  await d.refresh(owner.actor.id,source.id)
  for(const item of d.items(owner.actor.id,community.id,true).sort((a,b)=>urls.indexOf(b.url)-urls.indexOf(a.url)))d.decide(owner.actor.id,item.id,{revision:item.revision,state:'published',requestKey:randomUUID()})
  r.configure(owner.actor.id,{communityId:community.id,agentId:setup.agentId,postingMandateId:config.posting_mandate_id,editorialMandateId:config.editorial_mandate_id,announceKnowledge:true,enabled:true,revision:config.revision,requestKey:randomUUID()})
  const job=r.enqueue(owner.actor.id,community.id,'knowledge-draft',randomUUID()),result=await r.run(job.id)
  if(!('resultId' in result))throw Error('Simulation did not produce a note: '+JSON.stringify(result))
  const note=new Knowledge(s).read(result.resultId),announcement=s.feed().find(p=>p.author_id===setup.agentId)
  if(!announcement)throw Error('Missing native announcement')
  const duplicate=r.enqueue(owner.actor.id,community.id,'knowledge-draft',randomUUID()),dedup=await r.run(duplicate.id)
  return {s,owner,community,note,announcement,job:r.job(owner.actor.id,job.id),duplicate:dedup,disclosure:'Isolated simulation. Real cited references; emulated acquisition and curated simulated provider. No hosted model call or live public post.'}
 }catch(error){s.close();throw error}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 process.umask(0o077)
 const path=resolve(process.argv[2]??'.etnos/steward-demo.sqlite');mkdirSync(dirname(path),{recursive:true,mode:0o700})
 const demo=await simulateSteward(path);chmodSync(path,0o600)
 try{
  const receipt={disclosure:demo.disclosure,communityId:demo.community.id,noteId:demo.note.id,review:'provisional',postId:demo.announcement.id,provider:demo.job.model,sources:demo.note.citations,duplicateState:demo.duplicate.state}
  writeFileSync(path+'.receipt.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600})
  writeFileSync(path+'.wiki.md',demo.note.text+'\n',{mode:0o600});console.log(JSON.stringify(receipt))
 }finally{demo.s.close()}
}
