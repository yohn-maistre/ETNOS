// Test-only entrypoint. This class and its provisioning RPCs MUST NOT be deployed.
import {Buffer} from 'node:buffer'
import worker, { StrataNode } from '../src/worker.ts'
import { StrataCore } from '../src/core.ts'
import { CloudflareDatabase } from '../src/cloudflare-database.ts'
import type { Publisher, PublicRecord } from '../src/transport.ts'
import {Groups} from '../src/groups.ts'
import {PublicWork} from '../src/public-work.ts'
import {Wiki} from '../src/wiki.ts'
import type {Binding} from '../src/database.ts'
import {Forum} from '../src/forum.ts'
import {Activity} from '../src/activity.ts'
import {DirectMessages} from '../src/dm.ts'
import {fixture,issuer} from './oauth-fixture.ts'

export class TestNode extends StrataNode {
  private core() { return new StrataCore(new CloudflareDatabase(this.ctx.storage),this.env.STRATA_ORIGIN) }
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
    const voted=forum.poll(a.actor.id,poll.id,0).poll!.total===1
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
    return JSON.stringify({voted,lockDenied,deleted,roots:count,replies:150,iterations:50,queriesPerFeed:queryCount,p50Ms:samples[25],p95Ms:samples[47]})
  }
  async authContract(){
    const{auth,state}=await fixture(this.core())
    const start=await auth.route(new Request(this.env.STRATA_ORIGIN+'/auth/start',{method:'POST',headers:{origin:this.env.STRATA_ORIGIN,'content-type':'application/json'},body:JSON.stringify({handle:'member.example'})}))
    if(start?.status!==200)return JSON.stringify({start:start?.status})
    const flow=start.headers.getSetCookie().find(x=>x.startsWith('__Host-strata_flow='))!.split(';')[0]
    const callback=await auth.route(new Request(this.env.STRATA_ORIGIN+'/auth/callback?state='+state()+'&code=fixture&iss='+encodeURIComponent(issuer),{headers:{cookie:flow}}))
    return JSON.stringify({start:start.status,callback:callback?.status,location:callback?.headers.get('location'),hasCookie:callback?.headers.getSetCookie().some(x=>x.startsWith('__Host-strata='))})
  }
}

export default worker
