import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Strata,LocalDatabase} from '../src/store.ts'
import {schema} from '../src/schema.ts'
import {Social} from '../src/social.ts'
import {Wiki} from '../src/wiki.ts'
import {api} from '../src/api.ts'

function fixture() {
  let now=Date.parse('2026-11-01T00:00:00Z')
  const s=new Strata(':memory:','https://strata.example',()=>now)
  const owner=s.provision('did:web:owner.example','Owner'),member=s.provision('did:web:member.example','Member'),outsider=s.provision('did:web:outsider.example','Outsider')
  const pub=s.createCommunity(owner.actor.id,'Square','Public','public')
  const hidden=s.createCommunity(owner.actor.id,'Hidden','Protected','hidden-private')
  return {s,owner,member,outsider,pub,hidden,advance:(n:number)=>{now+=n}}
}

test('public readability is separate from approval, agent admission and outward publication',()=>{
  const {s,owner,member,pub,hidden}=fixture()
  try {
    const post=s.createPost(owner.actor.id,pub.id,'Local public')
    assert.equal(post.publicationState,'local');assert.equal(post.uri,null);assert.equal(s.jobs(owner.actor.id).length,0)
    assert.throws(()=>s.join(member.actor.id,pub.id),/Admission/)
    s.requestJoin(member.actor.id,pub.id,'Please admit me')
    assert.throws(()=>s.joinRequests(member.actor.id,pub.id),/Not found/)
    assert.equal(s.joinRequests(owner.actor.id,pub.id).length,1)
    s.decideJoin(owner.actor.id,pub.id,member.actor.id,true)
    s.createPost(member.actor.id,pub.id,'Admitted')
    assert.throws(()=>s.decideJoin(owner.actor.id,pub.id,member.actor.id,true),/Not found/)
    s.setMember(owner.actor.id,pub.id,member.actor.id,false)
    assert.throws(()=>s.requestJoin(member.actor.id,pub.id,'Again'),/existing membership/)
    assert.throws(()=>s.createCommunity(owner.actor.id,'Invalid','Private','hidden-private',false,'invite','atproto'),/cannot publish/)
    assert.throws(()=>s.requestJoin(member.actor.id,hidden.id,'Probe'),/Not found/)
    const open=s.createCommunity(owner.actor.id,'Open','Public','public',true,'open')
    const agent=s.provision('did:web:agent.example','Agent',owner.actor.id)
    assert.throws(()=>s.join(agent.actor.id,open.id),/steward admission/)
  } finally {s.close()}
})

test('invitations bind recipient, expire, resist replay and are invalidated on removal or issuer demotion',()=>{
  const {s,owner,member,outsider,hidden,advance}=fixture()
  try {
    const invite=s.inviteMember(owner.actor.id,hidden.id,member.actor.id,s.clock()+1000)
    assert.equal(JSON.stringify(s.all('SELECT * FROM invitations')).includes(invite.token),false)
    assert.throws(()=>s.acceptInvitation(outsider.actor.id,invite.token),/Not found/)
    s.acceptInvitation(member.actor.id,invite.token)
    assert.throws(()=>s.acceptInvitation(member.actor.id,invite.token),/Not found/)
    s.setMember(owner.actor.id,hidden.id,member.actor.id,false)
    const revoked=s.inviteMember(owner.actor.id,hidden.id,member.actor.id,s.clock()+1000)
    s.revokeInvitations(owner.actor.id,hidden.id,member.actor.id)
    assert.throws(()=>s.acceptInvitation(member.actor.id,revoked.token),/Not found/)
    const expired=s.inviteMember(owner.actor.id,hidden.id,member.actor.id,s.clock()+1000)
    advance(1001);assert.throws(()=>s.acceptInvitation(member.actor.id,expired.token),/Not found/)
    s.setMember(owner.actor.id,hidden.id,member.actor.id,true,'moderator')
    const issued=s.inviteMember(member.actor.id,hidden.id,outsider.actor.id,s.clock()+1000)
    s.setMember(owner.actor.id,hidden.id,member.actor.id,true,'member')
    s.setMember(owner.actor.id,hidden.id,member.actor.id,true,'moderator')
    assert.throws(()=>s.acceptInvitation(outsider.actor.id,issued.token),/Not found/)
  } finally {s.close()}
})

test('votes are one per human; bookmark lists recheck access and never expose another person collection',()=>{
  const {s,owner,member,pub,hidden}=fixture(),social=new Social(s)
  try {
    s.setMember(owner.actor.id,pub.id,member.actor.id,true)
    s.setMember(owner.actor.id,hidden.id,member.actor.id,true)
    const p=s.createPost(owner.actor.id,pub.id,'Public'),secret=s.createPost(owner.actor.id,hidden.id,'Secret')
    assert.equal(social.vote(member.actor.id,p.id,1).score,1)
    assert.equal(social.vote(member.actor.id,p.id,1).score,1)
    assert.equal(social.vote(member.actor.id,p.id,-1).score,-1)
    assert.equal(social.vote(member.actor.id,p.id,0).score,0)
    const agent=s.provision('did:web:agent.example','Agent',owner.actor.id)
    s.setMember(owner.actor.id,pub.id,agent.actor.id,true)
    assert.throws(()=>social.vote(agent.actor.id,p.id,1),/cannot vote/)
    social.bookmark(member.actor.id,secret.id,true)
    assert.equal(social.bookmarks(owner.actor.id).length,0)
    assert.equal(social.bookmarks(member.actor.id).length,1)
    s.setMember(owner.actor.id,hidden.id,member.actor.id,false)
    assert.equal(social.bookmarks(member.actor.id).length,0)
    assert.equal(s.getPost(undefined,p.id).bookmarked,false)
  } finally {s.close()}
})

test('reports stay with community stewards and decisions cannot be overwritten or confer PDS deletion',()=>{
  const {s,owner,member,outsider,pub}=fixture(),social=new Social(s)
  try {
    s.setMember(owner.actor.id,pub.id,member.actor.id,true)
    const p=s.createPost(member.actor.id,pub.id,'Review this')
    const report=social.report(outsider.actor.id,p.id,'Concern')
    assert.throws(()=>social.reports(outsider.actor.id,pub.id),/Not found/)
    assert.equal(JSON.stringify(social.reports(owner.actor.id,pub.id)).includes(outsider.actor.id),false)
    assert.throws(()=>social.decideReport(member.actor.id,report.id,'resolved','No'),/steward/)
    social.decideReport(owner.actor.id,report.id,'resolved','Reviewed with author')
    assert.throws(()=>social.decideReport(owner.actor.id,report.id,'dismissed','Rewrite'),/already decided/)
    assert.equal(s.getPost(undefined,p.id).id,p.id)
    assert.equal(s.jobs(member.actor.id).length,0)
  } finally {s.close()}
})

test('keyset pagination filters permissions before limits, handles tied clocks, and topics cannot expose private associations',()=>{
  const {s,owner,member,pub,hidden}=fixture(),social=new Social(s)
  try {
    for(let i=0;i<7;i++) {s.createPost(owner.actor.id,pub.id,'Visible '+i);s.createPost(owner.actor.id,hidden.id,'Hidden '+i)}
    const topic=social.addTopic(owner.actor.id,pub.id,'Environment')
    assert.throws(()=>social.addTopic(owner.actor.id,hidden.id,'Hidden association'),/Public topics/)
    assert.equal(social.topics().length,1)
    let cursor:string|undefined;const ids:string[]=[]
    do {
      const page=s.feedPage(member.actor.id,{topicId:topic.id,limit:2,cursor})
      ids.push(...page.items.map(p=>p.id));cursor=page.nextCursor??undefined
    } while(cursor)
    assert.equal(ids.length,7);assert.equal(new Set(ids).size,7)
    const page=s.feedPage(owner.actor.id,{communityId:hidden.id,limit:2})
    assert.throws(()=>s.feedPage(member.actor.id,{communityId:hidden.id,cursor:page.nextCursor!}),/Not found/)
    assert.throws(()=>s.feedPage(undefined,{cursor:'garbage'}),/Invalid cursor/)
    assert.throws(()=>s.feedPage(undefined,{limit:0}),/Limit/)
  } finally {s.close()}
})

test('Wiki acceptance binds digest and exact base; pending drafts and private proposal IDs stay out of public views',()=>{
  const {s,owner,member,outsider,pub,hidden}=fixture(),wiki=new Wiki(s)
  try {
    s.setMember(owner.actor.id,pub.id,member.actor.id,true)
    assert.throws(()=>wiki.create(owner.actor.id,hidden.id,'Private archive'),/stays in Aksara/)
    const page=wiki.create(owner.actor.id,pub.id,'River history')
    const a=wiki.propose(member.actor.id,page.id,null,'First perspective',['https://evidence.example/report'],'id','Community account')
    const b=wiki.propose(member.actor.id,page.id,null,'Another draft',[],'en','Research account')
    assert.equal(wiki.read(page.id).revision,null)
    assert.throws(()=>wiki.proposal(outsider.actor.id,a.id),/Not found/)
    assert.throws(()=>wiki.decide(member.actor.id,a.id,a.digest,true),/steward/)
    assert.throws(()=>wiki.decide(owner.actor.id,a.id,'wrong',true),/no longer matches/)
    const accepted=wiki.decide(owner.actor.id,a.id,a.digest,true)
    assert.equal(wiki.read(page.id).revision?.text,'First perspective')
    assert.equal(JSON.stringify(wiki.read(page.id)).includes(a.id),false)
    assert.equal(JSON.stringify(wiki.history(page.id)).includes(a.id),false)
    assert.throws(()=>wiki.decide(owner.actor.id,b.id,b.digest,true),/new base/)
    const c=wiki.propose(member.actor.id,page.id,accepted.revisionId,'Correction',[],'id','Corrected account')
    s.setMember(owner.actor.id,pub.id,member.actor.id,false)
    assert.throws(()=>wiki.decide(owner.actor.id,c.id,c.digest,true),/Not found/)
    assert.equal(wiki.history(page.id).length,1)
    const agent=s.provision('did:web:agent.example','Agent',owner.actor.id)
    s.setMember(owner.actor.id,pub.id,agent.actor.id,true)
    assert.throws(()=>wiki.propose(agent.actor.id,page.id,accepted.revisionId,'Bot edit',[],'id','Bot'),/posting mandates/)
  } finally {s.close()}
})

test('legacy v1 database migrates without exposing old sources or replaying previous automatic publication',()=>{
  const dir=mkdtempSync(join(tmpdir(),'strata-migration-')),file=join(dir,'legacy.sqlite')
  try {
    const db=new LocalDatabase(file);db.exec(schema)
    db.run("INSERT INTO actors VALUES('old','did:web:old.example','Old','human',NULL)")
    db.run("INSERT INTO communities VALUES('public','Square','Old public','public',0)")
    db.run("INSERT INTO memberships VALUES('public','old','owner',1)")
    db.run("INSERT INTO posts VALUES('post','old','public',NULL,'Prior intent',1,0,NULL,NULL,'at://did:web:old.example/org.example.strata.post/post')")
    db.run("INSERT INTO outbox(id,post_id,operation,state,repo,rkey,record) VALUES('job','post','put','pending','did:web:old.example','post','{}')")
    db.close()
    const s=new Strata(file)
    assert.equal(s.community('public').admission,'approval')
    assert.equal(s.community('public').publication,'local')
    assert.equal(s.jobs('old')[0].state,'cancelled')
    assert.equal(s.getPost(undefined,'post').text,'Prior intent')
    s.close()
    const again=new Strata(file);assert.equal(again.get<{n:number}>('SELECT COUNT(*) n FROM strata_migrations')!.n,16);again.close()
  } finally {rmSync(dir,{recursive:true,force:true})}
})

test('shared Fetch API bounds bodies and rechecks credentials after awaiting a body',async()=>{
  const {s,owner,pub}=fixture(),handle=api(s)
  try {
    const large=await handle(new Request(s.base+'/v1/posts',{method:'POST',headers:{authorization:`Bearer ${owner.token}`,'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(1500001)})}))
    assert.equal(large.status,413)
    const authenticate=s.authenticate.bind(s);let checks=0
    s.authenticate=(token:string)=>{checks++;return authenticate(token)}
    const stream=new ReadableStream<Uint8Array>({pull(controller){
      s.run('UPDATE credentials SET revoked=1 WHERE actor_id=?',owner.actor.id)
      controller.enqueue(new TextEncoder().encode(JSON.stringify({communityId:pub.id,text:'Revoked'})));controller.close()
    }})
    const init:RequestInit&{duplex:'half'}={method:'POST',headers:{authorization:`Bearer ${owner.token}`,'content-type':'application/json'},body:stream,duplex:'half'}
    assert.equal((await handle(new Request(s.base+'/v1/posts',init))).status,401)
    assert.equal(checks,2)
    assert.equal(s.feed().length,0)
  } finally {s.close()}
})

test('thread roots are stable across nested replies and private threads never enter public projections',async()=>{
  const{s,owner,outsider,pub,hidden}=fixture()
  try{
    const root=s.createPost(owner.actor.id,pub.id,'Public root')
    const reply=s.createPost(owner.actor.id,pub.id,'First reply',root.id)
    const nested=s.createPost(owner.actor.id,pub.id,'Nested reply',reply.id)
    const secret=s.createPost(owner.actor.id,hidden.id,'Protected root')
    s.createPost(owner.actor.id,hidden.id,'Protected reply',secret.id)
    assert.equal(reply.rootId,root.id);assert.equal(nested.rootId,root.id)
    assert.equal(s.getPost(undefined,root.id).replies,2)
    assert.deepEqual(s.feedPage(undefined,{rootsOnly:true}).items.map(p=>p.id),[root.id])
    assert.equal(s.feedPage(undefined,{rootId:root.id}).items.length,2)
    assert.throws(()=>s.feedPage(outsider.actor.id,{rootId:secret.id}),/Not found/)
    const handler=api(s)
    assert.equal((await handler(new Request(s.base+'/v1/posts/'+secret.id+'/replies'))).status,404)
    const thread=await(await handler(new Request(s.base+'/v1/posts/'+nested.id+'/replies'))).json()
    assert.equal(thread.items.length,0)
    const branch=await(await handler(new Request(s.base+'/v1/posts/'+reply.id+'/replies'))).json()
    assert.deepEqual(branch.items.map((p:{id:string})=>p.id),[nested.id])
    const all=await(await handler(new Request(s.base+'/v1/posts/'+root.id+'/replies'))).json()
    assert.equal(all.items.length,2)
    assert.equal(JSON.stringify(thread).includes('operator_id'),false)
    assert.equal(JSON.stringify(thread).includes('Protected'),false)
    s.hidePost(owner.actor.id,root.id)
    assert.equal((await handler(new Request(s.base+'/v1/posts/'+nested.id+'/replies'))).status,404)
  }finally{s.close()}
})
