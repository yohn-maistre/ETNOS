// Test-only entrypoint. This class and its provisioning RPCs MUST NOT be deployed.
import {Buffer} from 'node:buffer'
import worker, { StrataNode } from '../src/worker.ts'
import { EtnosCore } from '../src/core.ts'
import { CloudflareDatabase } from '../src/cloudflare-database.ts'
import type { Publisher, PublicRecord } from '../src/transport.ts'
import {Groups} from '../src/groups.ts'
import {PublicWork} from '../src/public-work.ts'
import {Wiki} from '../src/wiki.ts'
import type {Binding} from '../src/database.ts'
import {Forum} from '../src/forum.ts'
import {Activity} from '../src/activity.ts'
import {DirectMessages} from '../src/dm.ts'
import {fixture,issuer,did} from './oauth-fixture.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Resident} from '../src/resident.ts'
import {Discovery,sourceFetcher} from '../src/discovery.ts'
import {api} from '../src/api.ts'
import {migrations} from '../src/schema.ts'

export class TestNode extends StrataNode {
  private core() { return new EtnosCore(new CloudflareDatabase(this.ctx.storage),this.config.ETNOS_ORIGIN) }
  async residentMigrationContract(){
    // Dedicated test-only DO: discard the constructor's fresh schema before
    // installing the populated v26 fixture. Never available in a deployed class.
    await this.ctx.storage.deleteAll()
    const db=new CloudflareDatabase(this.ctx.storage)
    db.transaction(()=>{
      db.exec('CREATE TABLE strata_migrations(version INTEGER PRIMARY KEY)')
      for(let i=0;i<26;i++){db.exec(migrations[i]);db.run('INSERT INTO strata_migrations VALUES(?)',i+1)}
      db.run("INSERT INTO actors(id,did,name,kind) VALUES('owner','did:web:upgrade-owner.example','Synthetic owner','human')");db.run("INSERT INTO actors(id,did,name,kind,operator_id) VALUES('agent','did:web:upgrade-agent.example','Synthetic agent','agent','owner')");db.run("INSERT INTO communities(id,title,description,visibility) VALUES('home','Synthetic home','Synthetic','public')")
      for(const [id,model] of [['hosted','pi:old'],['index','model-free:source-index']])db.run("INSERT INTO resident_jobs(id,community_id,agent_id,operator_id,config_revision,skill,request_key,state,generation,checkpoint,evidence,created,updated,model) VALUES(?,'home','agent','owner',1,'source-digest',?,'queued',0,'queued','[]',1,1,?)",id,id,model)
      db.run("INSERT INTO resident_inference_calls VALUES('receipt','hosted',1,'once',1,'reserved')")
    })
    const s=this.core();let foreignKey=false;try{s.run("DELETE FROM resident_jobs WHERE id='hosted'")}catch{foreignKey=true}
    return JSON.stringify({version:s.get<{n:number}>('SELECT MAX(version) n FROM strata_migrations')!.n,jobs:s.get<{n:number}>('SELECT count(*) n FROM resident_jobs')!.n,hosted:s.get<{inference_started:number}>("SELECT inference_started FROM resident_jobs WHERE id='hosted'")!.inference_started,index:s.get<{inference_started:number}>("SELECT inference_started FROM resident_jobs WHERE id='index'")!.inference_started,receipts:s.get<{n:number}>('SELECT count(*) n FROM resident_inference_calls')!.n,foreignKey})
  }
  async residentQuestionContract(){
    const s=this.core(),owner=s.provision('did:web:workerd-question.example','Synthetic question operator'),home=s.createCommunity(owner.actor.id,'Public reference home','Synthetic','public',true,'open'),target=s.createCommunity(owner.actor.id,'Public question room','Synthetic','public',true,'open'),access=new AgentAccess(s,{stewardDid:owner.actor.did}),agent=access.enroll(owner.actor.id,{communityId:home.id,name:'Synthetic global Aksara',role:'steward',family:'aksara'})
    access.admit(owner.actor.id,agent.agent_id);let calls=0
    const provider={label:'synthetic-workerd-question',draft:async(input:import('../src/resident-contract.ts').ResidentInput)=>{calls++;return {text:'A synthetic answer through actual workerd.',model:'synthetic-workerd-question',questionReceipt:{postId:input.question!.postId,revision:input.question!.revision}}}},resident=new Resident(s,access,provider),grant=s.mandate(owner.actor.id,agent.agent_id,home.id,'Synthetic questions',s.clock()+86400000)
    resident.configure(owner.actor.id,{communityId:home.id,agentId:agent.agent_id,postingMandateId:grant,enabled:true,mentionsEnabled:true,requestKey:crypto.randomUUID()})
    const d=new Discovery(s,sourceFetcher(['https://reference.example.org'],async()=>new Response('<rss><channel><item><title>Synthetic current reference</title><link>https://reference.example.org/report</link></item></channel></rss>',{headers:{'content-type':'application/rss+xml'}}))),source=d.add(owner.actor.id,{communityId:home.id,title:'Synthetic reference',url:'https://reference.example.org/rss',mode:'news',requestKey:crypto.randomUUID()});await d.refresh(owner.actor.id,source.id)
    resident.routing.setGlobal(owner.actor.id,{agentId:agent.agent_id,homeCommunityId:home.id,coverage:[home.id],enabled:true,revision:0,requestKey:crypto.randomUUID()})
    resident.routing.setDestination(owner.actor.id,{agentId:agent.agent_id,communityId:target.id,enabled:true,issueGrant:true,admitAgent:true,durationHours:1,hourlyLimit:2,revision:0,requestKey:crypto.randomUUID()})
    const handler=api(s,{agentAccess:access,residentProvider:provider}),choice=resident.routing.choices(owner.actor.id,target.id)[0],body={communityId:target.id,text:'What does this public source say?',requestKey:crypto.randomUUID(),agentMention:{actorId:agent.agent_id,choiceKey:choice.choiceKey}},call=()=>handler(new Request(s.base+'/v1/posts',{method:'POST',headers:{authorization:'Bearer '+owner.token,'content-type':'application/json',origin:s.base},body:JSON.stringify(body)}))
    s.db.exec("CREATE TRIGGER synthetic_question_failure BEFORE INSERT ON resident_job_inputs BEGIN SELECT RAISE(ABORT,'Synthetic failure'); END")
    const failed=await call(),rolledBack=failed.status===500&&s.all('SELECT id FROM posts').length===0&&s.all('SELECT id FROM resident_jobs').length===0&&s.all('SELECT * FROM post_requests').length===0
    s.db.exec('DROP TRIGGER synthetic_question_failure');const response=await call(),question=await response.json() as {id:string},retry=await call(),id=s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',question.id)!.job_id,result=await resident.run(id)
    const child=s.get<{id:string;parent_id:string;community_id:string}>('SELECT id,parent_id,community_id FROM posts WHERE author_id=?',agent.agent_id)!,status=resident.questions.statuses(question.id)
    s.hidePost(owner.actor.id,child.id);const hiddenAnswer=resident.questions.statuses(question.id)[0]
    return JSON.stringify({rolledBack,created:response.status,retry:retry.status,oneJob:s.all('SELECT id FROM resident_jobs').length===1,calls,state:result.state,actualChild:child.parent_id===question.id&&child.community_id===target.id,answered:status[0].state==='answered',hiddenAnswerOmitted:hiddenAnswer.state==='unavailable'&&hiddenAnswer.replyId===null,explicitAdmission:!!s.membership(agent.agent_id,target.id)})
  }
  /** Profiling only: statements above a row threshold for one request. */
  async traceRequest(path:string,token?:string,body?:unknown,min=50){
    const seen:{sql:string;read:number;written:number}[]=[]
    this.database.trace=(sql,read,written)=>{if(read>=min||written>=min)seen.push({sql:sql.replace(/\s+/g,' ').slice(0,240),read,written})}
    try{await this.request(new Request(this.config.ETNOS_ORIGIN+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}))}
    finally{this.database.trace=undefined}
    return JSON.stringify(seen)
  }
  /** Load-test fixture at showcase scale: synthetic people, rooms, posts and wiki pages. Test-only. */
  seedScale(people:number,pages:number,posts:number) {try{return this.seedScaleInner(people,pages,posts)}catch(e){return JSON.stringify({error:String(e instanceof Error?e.stack:e)})}}
  private seedScaleInner(people:number,pages:number,posts:number) {
    const s=this.core(),wiki=new Wiki(s),body='Teks sintetis untuk uji beban. '.repeat(90)
    const owner=s.provision('did:web:load-owner.example','Load owner')
    const rooms=['Beranda','Tanya & bantu','Budaya & bahasa','Kabar komunitas','Bahasa Mee','Koordinasi'].map((t,i)=>s.createCommunity(owner.actor.id,t,'Sintetis',i===5?'listed-private':'public',false,i===5?'invite':'open'))
    const open=rooms.slice(0,5)
    for(const r of open)wiki.setLive(owner.actor.id,r.id,true)
    for(let i=0;i<pages;i++)wiki.createDraft(owner.actor.id,open[i%open.length].id,'Halaman sintetis '+i,{text:body,citations:['https://example.org/sumber/'+i],language:'id',perspective:'Ringkasan umum'})
    const users=Array.from({length:people},(_,i)=>s.provision(`did:web:load-${i}.example`,'Peserta '+i))
    for(const u of users)for(const r of open)s.join(u.actor.id,r.id)
    const roots:{id:string;room:string}[]=[]
    for(let i=0;i<posts;i++){
      const u=users[i%people],parent=i%3===0||!roots.length?undefined:roots[(i*7)%roots.length]
      const room=parent?.room??open[i%open.length].id
      const p=s.createPost(u.actor.id,room,'Pos sintetis nomor '+i+'. '+'Isi percakapan. '.repeat(12),parent?.id)
      if(!parent)roots.push({id:p.id,room})
    }
    const counts=Object.fromEntries(['posts','wiki_pages','wiki_revisions','actors','memberships'].map(t=>[t,s.get<{n:number}>('SELECT count(*) n FROM '+t)!.n]))
    return JSON.stringify({rooms:rooms.map(r=>r.id),users:users.map(u=>({id:u.actor.id,token:u.token})),roots:roots.map(r=>r.id),rootRooms:roots.map(r=>r.room),counts})
  }
  seed() {
    const s=this.core()
    const owner=s.provision('did:web:owner.example','Owner')
    const member=s.provision('did:web:member.example','Member')
    const outsider=s.provision('did:web:outsider.example','Outsider')
    const pub=s.createCommunity(owner.actor.id,'Square','Public discussion','public',false,'approval','atproto')
    const hidden=s.createCommunity(owner.actor.id,'Private circle','Protected','hidden-private')
    const publicPost=s.createPost(owner.actor.id,pub.id,'Hello public')
    const secret=s.createPost(owner.actor.id,hidden.id,'Never public')
    return JSON.stringify({owner,member,outsider,pub,hidden,publicPost,secret})
  }
  durableContract() {
    const s=this.core(), owner=s.get<{id:string}>('SELECT id FROM actors LIMIT 1')!
    const community=s.createCommunity(owner.id,'Contract','Description','public',false,'approval','atproto')
    s.db.exec("CREATE TRIGGER reject_queue BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT,'queue failure'); END")
    let failed=false
    try { s.createPost(owner.id,community.id,'Must roll back') } catch { failed=true }
    s.db.exec('DROP TRIGGER reject_queue')
    const rolledBack=!s.get('SELECT 1 FROM posts WHERE community_id=?',community.id)
    const bytes=new Uint8Array([0xff,0,65,10])
    const source=s.createSource(owner.id,bytes)
    const preserved=Array.from(s.source(owner.id,source).bytes)
    const release=s.draftRelease(owner.id,source,community.id,owner.id,'Approved derivative')
    s.approveRelease(owner.id,release,s.release(owner.id,release).digest)
    const post=s.publishRelease(owner.id,release)
    const serialized=JSON.stringify(s.getPost(undefined,post.id))
    return JSON.stringify({failed,rolledBack,preserved,redacted:!serialized.includes(release)&&!serialized.includes(source)})
  }
  async uncertainContract() {
    const s=this.core(), owner=s.get<{id:string;did:string}>('SELECT id,did FROM actors LIMIT 1')!
    const community=s.createCommunity(owner.id,'Delivery','Description','public',false,'approval','atproto')
    const post=s.createPost(owner.id,community.id,'Lost acknowledgement')
    const job=s.jobs(owner.id).find(j=>j.post_id===post.id)!
    let stored: {record:PublicRecord;cid:string} | null=null, writes=0
    const publisher: Publisher={did:owner.did,
      async put(_key,record){writes++;stored={record,cid:'synthetic-cid'};throw Error('Lost ack')},
      async read(){return stored},async remove(){throw Error('Unexpected delete')},
    }
    const before=(await s.deliver(owner.id,job.id,publisher)).state
    const after=(await s.reconcile(owner.id,job.id,publisher)).state
    return JSON.stringify({before,after,writes})
  }
  remove(actorId: string, communityId: string, target: string) { this.core().setMember(actorId,communityId,target,false) }
  interrupt() { const s=this.core();s.run("UPDATE outbox SET state='sending' WHERE state='pending'") }
  governanceContract(){
    const s=this.core(),owner=s.provision('did:web:governance.example','Synthetic governor'),member=s.provision('did:web:group-member.example','Synthetic member')
    const groups=new Groups(s,{stewardDid:owner.actor.did}),work=new PublicWork(s,groups),wiki=new Wiki(s)
    const group=groups.create(owner.actor.id,'Synthetic institution','Only contract data','institution','public')
    const pub=groups.createSpace(owner.actor.id,group.id,{title:'Public space',description:'Synthetic',visibility:'public',automation:true})
    const hidden=groups.createSpace(owner.actor.id,group.id,{title:'Hidden space',description:'Synthetic',visibility:'hidden-private'})
    groups.setMember(owner.actor.id,group.id,member.actor.id,true)
    const hiddenOmitted=!JSON.stringify(groups.read(undefined,group.id)).includes(hidden.id)
    const separateAdmission=!s.membership(member.actor.id,hidden.id)
    groups.requestSponsorship(owner.actor.id,group.id);groups.recognize(owner.actor.id,group.id,true)
    const item=work.create(owner.actor.id,{groupId:group.id,communityId:pub.id,title:'Synthetic work',description:'Only contract data',requestKey:crypto.randomUUID()})
    const result=work.proposeResult(owner.actor.id,item.id,'Approved public result',[])
    const completed=work.acceptResult(owner.actor.id,result.id,result.digest,1)
    const privateProposalOmitted=!JSON.stringify(completed).includes(result.id)
    let rolledBack=false;const before=s.all('SELECT * FROM audit').length
    try{s.tx(()=>{s.audit(owner.actor.id,'outer.start','test');try{s.tx(()=>{s.audit(owner.actor.id,'inner.write','test');throw Error('Synthetic failure')})}catch{/* Must still abort the unit. */}})}catch{rolledBack=s.all('SELECT * FROM audit').length===before}
    const agent=s.provision('did:web:worker-editor.example','Synthetic editor',owner.actor.id);s.setMember(owner.actor.id,pub.id,agent.actor.id,true)
    const page=wiki.create(owner.actor.id,pub.id,'Synthetic knowledge'),grant=wiki.grant(owner.actor.id,agent.actor.id,pub.id,'Only public drafts',Date.now()+60000)
    const draft=wiki.propose(agent.actor.id,page.id,null,'Agent proposal',[],'id','Declared perspective',grant.id)
    const hiddenDraft=wiki.read(page.id).revision===null;wiki.decide(owner.actor.id,draft.id,draft.digest,true)
    const activity=new Activity(s),root=s.createPost(owner.actor.id,hidden.id,'Private thread')
    s.setMember(owner.actor.id,hidden.id,member.actor.id,true);s.createPost(member.actor.id,hidden.id,'Private reply',root.id)
    const inbox=activity.list(owner.actor.id),notice=inbox.items.find(i=>i.kind==='reply')!
    const activityRead=activity.markRead(owner.actor.id,[notice.id]).items.find(i=>i.id===notice.id)?.read===true
    const activityPrivate=!JSON.stringify(activity.list(agent.actor.id)).includes(hidden.title)
    return JSON.stringify({hiddenOmitted,separateAdmission,state:completed.state,privateProposalOmitted,rolledBack,hiddenDraft,activityRead,activityPrivate,agentAuthor:wiki.read(page.id).revision?.authorKind})
  }
  dmContract(){
    const s=this.core(),dm=new DirectMessages(s),a=s.provision('did:web:dm-a.example','Synthetic sender'),b=s.provision('did:web:dm-b.example','Synthetic recipient'),outsider=s.provision('did:web:dm-outside.example','Outside')
    const forum=s.createCommunity(a.actor.id,'Synthetic forum','Only contract data','public');s.setMember(a.actor.id,forum.id,b.actor.id,true)
    const key=Buffer.alloc(33,2).toString('base64'),opaque=Buffer.from('Synthetic ciphertext fixture only').toString('base64')
    for(const user of[a,b])dm.register(user.actor.id,{deviceId:crypto.randomUUID(),signatureKey:key,packages:[{id:crypto.randomUUID(),data:opaque}]})
    const t=dm.reserve(a.actor.id,b.actor.id,dm.device(a.actor.id)!.id,crypto.randomUUID());dm.start(a.actor.id,t.id,dm.device(a.actor.id)!.id,opaque);dm.decide(b.actor.id,t.id,dm.device(b.actor.id)!.id,true)
    const clientId=crypto.randomUUID(),sent=dm.send(a.actor.id,t.id,dm.device(a.actor.id)!.id,clientId,opaque),replayed=dm.send(a.actor.id,t.id,dm.device(a.actor.id)!.id,clientId,opaque)
    let isolated=false;try{dm.messages(outsider.actor.id,t.id)}catch{isolated=true}
    const notice=new Activity(s).list(b.actor.id).items[0].kind;dm.close(b.actor.id,t.id,true)
    let blocked=false;try{dm.send(a.actor.id,t.id,dm.device(a.actor.id)!.id,crypto.randomUUID(),opaque)}catch{blocked=true}
    return JSON.stringify({isolated,idempotent:sent.id===replayed.id,notice,blocked,outbox:s.jobs(a.actor.id).length})
  }
  forumContract(){
    const s=this.core(),a=s.provision('did:web:forum-bench.example','Synthetic forum owner'),c=s.createCommunity(a.actor.id,'Synthetic forum','Synthetic only','public'),forum=new Forum(s)
    const poll=s.createPost(a.actor.id,c.id,'Poll',undefined,undefined,{content:{poll:{options:['Morning','Evening'],closesAt:s.clock()+86400000}}})
    const voted=forum.poll(a.actor.id,poll.id,0).poll!.myVote===0
    forum.moderate(a.actor.id,poll.id,{action:'lock',reason:'Synthetic check'})
    let lockDenied=false;try{s.createPost(a.actor.id,c.id,'No reply',poll.id)}catch{lockDenied=true}
    const edited=forum.edit(a.actor.id,poll.id,{revision:1,text:'Updated',content:{title:'New title'}})
    const deleted=forum.delete(a.actor.id,poll.id,edited.revision).deleted
    for(let i=0;i<30;i++){const p=s.createPost(a.actor.id,c.id,'Synthetic post '+i);for(let j=0;j<5;j++)s.createPost(a.actor.id,c.id,'Synthetic reply',p.id)}
    let queries=0;const get=s.db.get.bind(s.db),all=s.db.all.bind(s.db)
    s.db.get=<T>(sql:string,...args:Binding[])=>{queries++;return get<T>(sql,...args)}
    s.db.all=<T>(sql:string,...args:Binding[])=>{queries++;return all<T>(sql,...args)}
    const samples:number[]=[];let queryCount=0,count=0
    for(let i=0;i<50;i++){queries=0;const start=performance.now(),feed=s.feedPage(undefined,{limit:30,rootsOnly:true});samples.push(performance.now()-start);queryCount=queries;count=feed.items.length}
    samples.sort((a,b)=>a-b)
    queries=0;s.feedPage(undefined,{limit:1,rootsOnly:true});const queriesForSinglePost=queries
    return JSON.stringify({voted,lockDenied,deleted,roots:count,replies:150,iterations:50,queriesPerFeed:queryCount,queriesForSinglePost,p50Ms:samples[25],p95Ms:samples[47]})
  }
  async authContract(){
    const{auth,state}=await fixture(this.core())
    const start=await auth.route(new Request(this.config.ETNOS_ORIGIN+'/auth/start',{method:'POST',headers:{origin:this.config.ETNOS_ORIGIN,'content-type':'application/json'},body:JSON.stringify({handle:'member.example'})}))
    if(start?.status!==200)return JSON.stringify({start:start?.status})
    const flow=start.headers.getSetCookie().find(x=>x.startsWith('__Host-strata_flow='))!.split(';')[0]
    const callback=await auth.route(new Request(this.config.ETNOS_ORIGIN+'/auth/callback?state='+state()+'&code=fixture&iss='+encodeURIComponent(issuer),{headers:{cookie:flow}}))
    return JSON.stringify({start:start.status,callback:callback?.status,location:callback?.headers.get('location'),hasCookie:callback?.headers.getSetCookie().some(x=>x.startsWith('__Host-strata='))})
  }
  async signupContract(){
    const s=this.core(),owner=s.provision(did,'Fixture steward'),newcomer='did:plc:zzzzzzzzzzzzzzzzzzzzzzzz'
    const hidden=s.createCommunity(owner.actor.id,'Protected language','Private','hidden-private')
    const {auth,state,parameters}=await fixture(s,{enrollmentMode:'open'},newcomer,'new.bsky.social',newcomer)
    const start=(await auth.route(new Request(this.config.ETNOS_ORIGIN+'/auth/start',{method:'POST',headers:{origin:this.config.ETNOS_ORIGIN,'content-type':'application/json'},body:JSON.stringify({mode:'signup',returnTo:'/communities?welcome=1'})})))!
    if(start.status!==200)return JSON.stringify({start:start.status})
    const flow=start.headers.getSetCookie().find(x=>x.startsWith('__Host-strata_flow='))!.split(';')[0]
    const callback=(await auth.route(new Request(this.config.ETNOS_ORIGIN+'/auth/callback?state='+state()+'&code=fixture&iss='+encodeURIComponent(issuer),{headers:{cookie:flow}})))!
    const cookie=callback.headers.getSetCookie().find(x=>x.startsWith('__Host-strata='))!.split(';')[0]
    const actor=auth.principal(new Request(this.config.ETNOS_ORIGIN+'/auth/me',{headers:{cookie}}))!
    return JSON.stringify({start:start.status,location:callback.headers.get('location'),noLoginHint:!parameters().has('login_hint'),verified:actor.did===newcomer,
      memberships:s.all('SELECT 1 FROM memberships WHERE actor_id=?',actor.id).length,hiddenOmitted:!s.listCommunities(actor.id).some(c=>c.id===hidden.id),schema:s.get<{version:number}>('SELECT max(version) version FROM strata_migrations')!.version})
  }
}

export default worker
