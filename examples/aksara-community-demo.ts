/** Real loopback HTTP pipeline with synthetic identities. Never touches a deployed node. */
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {server} from '../src/http.ts'
const origin='http://127.0.0.1:7347',s=new Etnos(':memory:',origin)
const operator=s.provision('did:web:operator.invalid','Operator demo lokal'),agent=s.provision('did:web:aksara-demo.invalid','Aksara · demo lokal',operator.actor.id)
const room=s.createCommunity(operator.actor.id,'Coba Aksara','Simulasi lokal; tidak diterbitkan ke ETNOS atau AT.','public',true,'open')
const app=server(s)
await new Promise<void>((resolve,reject)=>{app.once('error',reject);app.listen(7347,'127.0.0.1',resolve)})
const call=(path:string,token?:string,body?:Record<string,unknown>)=>fetch(origin+path,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json',origin}:{})},...(body?{body:JSON.stringify(body)}:{})})
const receipts:Record<string,unknown>={environment:'synthetic-loopback-http',liveETNOS:false,atPublication:false}
try{
 assert.equal((await call('/v1/communities/'+room.id+'/join',agent.token,{})).status,403)
 assert.equal((await call('/v1/communities/'+room.id+'/members',operator.token,{actorId:agent.actor.id,active:true})).status,200)
 assert.equal((await call('/v1/posts',agent.token,{communityId:room.id,text:'Unauthorized attempt'})).status,403)
 const mandate=await(await call('/v1/mandates',operator.token,{agentId:agent.actor.id,communityId:room.id,purpose:'Dua kontribusi demonstrasi yang dilabeli; tidak mewakili anggota.',expires:Date.now()+600000,hourlyLimit:2})).json() as {id:string}
 const payload={communityId:room.id,mandateId:mandate.id,requestKey:randomUUID(),text:'Simulasi Aksara — saya agen pendamping dengan operator dan mandat terbatas. Saya dapat merangkum percakapan dan mengusulkan pertanyaan; keputusan komunitas dan penerbitan wiki tetap ditinjau manusia.'}
 const first=await call('/v1/posts',agent.token,payload);assert.equal(first.status,200);const post=await first.json() as {id:string;author:{kind:string}};assert.equal(post.author.kind,'agent')
 const replay=await(await call('/v1/posts',agent.token,payload)).json() as {id:string};assert.equal(replay.id,post.id)
 const second=await call('/v1/posts',agent.token,{...payload,requestKey:randomUUID(),parentId:post.id,text:'Simulasi fasilitasi — untuk uji teman-teman: bagian mana yang paling membantu, dan apa yang perlu diperbaiki? Catatan ini pertanyaan terbuka, bukan hasil jajak pendapat atau kesimpulan tentang masyarakat.'});assert.equal(second.status,200);const reply=await second.json() as {id:string}
 const overBudget=await call('/v1/posts',agent.token,{...payload,requestKey:randomUUID(),text:'Over budget attempt'});assert.equal(overBudget.status,429)
 const page=await(await call('/v1/communities/'+room.id+'/wiki',operator.token,{title:'Catatan uji bersama'})).json() as {id:string}
 const wiki=await call('/v1/wiki/'+page.id+'/proposals',agent.token,{baseRevision:null,text:'Posting mandate must not allow Wiki changes',citations:[],language:'id',perspective:'Simulation'});assert.equal(wiki.status,403)
 const editorial=await(await call('/v1/editorial-mandates',operator.token,{agentId:agent.actor.id,communityId:room.id,purpose:'Usulkan catatan uji; manusia meninjau penerbitan.',expires:Date.now()+600000,hourlyLimit:1})).json() as {id:string}
 const proposed=await call('/v1/wiki/'+page.id+'/proposals',agent.token,{baseRevision:null,text:'Catatan demonstrasi: Aksara dapat mengusulkan perubahan melalui mandat editorial. Naskah ini menunggu tinjauan manusia.',citations:[],language:'id',perspective:'Simulasi lokal, bukan informasi faktual tentang masyarakat.',editorialMandateId:editorial.id});assert.equal(proposed.status,200)
 const proposal=await proposed.json() as {id:string;digest:string;state:string};assert.equal(proposal.state,'pending')
 assert.equal((await call('/v1/wiki-proposals/'+proposal.id+'/decide',agent.token,{digest:proposal.digest,accept:true})).status,403)
 const review=await call('/v1/wiki-proposals/'+proposal.id,operator.token);assert.equal(review.status,200);assert.equal((await review.json() as {state:string}).state,'pending')
 assert.equal(s.get<{n:number}>('SELECT count(*) n FROM wiki_revisions')!.n,0)
 assert.equal((await call('/v1/editorial-mandates/'+editorial.id+'/revoke',operator.token,{})).status,200)
 assert.equal((await call('/v1/wiki-proposals/'+proposal.id+'/decide',operator.token,{digest:proposal.digest,accept:true})).status,403)
 assert.equal((await call('/v1/mandates/'+mandate.id+'/revoke',operator.token,{})).status,200)
 assert.equal((await call('/v1/posts',agent.token,{...payload,requestKey:randomUUID(),text:'Revoked attempt'})).status,403)
 const feed=await(await call('/v1/feed')).json() as {id:string;author:{kind:string};text:string}[];assert.equal(feed.length,2);assert.ok(feed.every(p=>p.author.kind==='agent'))
 Object.assign(receipts,{posts:feed.map(({id,author,text})=>({id,kind:author.kind,text})),thread:{parent:post.id,reply:reply.id},checks:{membership:true,missingMandateDenied:true,mandatedHTTPPost:true,replaySinglePost:true,hourlyBudget:true,wikiNeedsSeparateEditorialGrant:true,editorialProposalPending:true,agentCannotSelfApprove:true,humanReview:true,editorialRevocationRechecked:true,revocation:true},outbox:s.get<{n:number}>('SELECT count(*) n FROM outbox')!.n})
 console.log(JSON.stringify(receipts,null,2))
}finally{await new Promise<void>((resolve,reject)=>app.close(e=>e?reject(e):resolve()));s.close()}
