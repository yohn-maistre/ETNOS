import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request } from 'node:http'
import { Etnos } from '../src/store.ts'
import { COLLECTION, canonical, validateRecord, type Publisher, type PublicRecord } from '../src/transport.ts'
import { server } from '../src/http.ts'

class Pds implements Publisher {
  records = new Map<string,{record:unknown;cid:string}>()
  writes = 0; failAfterWrite = false; failRead = false
  readonly did: string
  constructor(did: string) { this.did=did }
  async put(key: string, record: PublicRecord) {
    this.writes++
    if (this.records.has(key)) throw Error('InvalidSwap')
    const value = { record:structuredClone(record), cid:`cid-${this.writes}` }
    this.records.set(key,value)
    if (this.failAfterWrite) throw Error('Lost acknowledgment')
    return { cid:value.cid }
  }
  async read(key: string) { if(this.failRead) throw Error('Offline'); return this.records.get(key) ?? null }
  async remove(key: string, cid: string) { assert.equal(this.records.get(key)?.cid,cid); this.records.delete(key) }
}
function fixture() {
  let now = Date.parse('2026-10-31T00:00:00Z')
  const s = new Etnos(':memory:','http://127.0.0.1:7342',()=>now)
  const alice = s.provision('did:web:alice.example','Alice')
  const bob = s.provision('did:web:bob.example','Bob')
  const agent = s.provision('did:web:agent.example','Lab assistant',alice.actor.id)
  const pub = s.createCommunity(alice.actor.id,'Public square','Ordinary conversation','public',true,'open','atproto')
  const hidden = s.createCommunity(alice.actor.id,'Hidden circle','Private description','hidden-private')
  return { s, alice, bob, agent, pub, hidden, advance:(n:number)=>{now+=n} }
}
test('hidden existence, private content and search are excluded before projection',()=>{
  const {s,alice,bob,pub,hidden}=fixture()
  const secret=s.createPost(alice.actor.id,hidden.id,'Sensitive history')
  s.createPost(alice.actor.id,pub.id,'Public history')
  assert.deepEqual(s.listCommunities().map(x=>x.id),[pub.id])
  assert.equal(s.feed(undefined,'Sensitive').length,0)
  assert.equal(s.feed(bob.actor.id,'Sensitive').length,0)
  assert.throws(()=>s.getPost(bob.actor.id,secret.id),/Not found/)
  assert.equal(s.feed(alice.actor.id,'Sensitive').length,1)
  s.setMember(alice.actor.id,hidden.id,bob.actor.id,true)
  assert.equal(s.feed(bob.actor.id,'Sensitive').length,1)
  s.setMember(alice.actor.id,hidden.id,bob.actor.id,false)
  assert.equal(s.feed(bob.actor.id,'Sensitive').length,0)
  assert.throws(()=>s.join(bob.actor.id,hidden.id),/Not found/)
  assert.equal(s.jobs(alice.actor.id).filter(x=>x.post_id===secret.id).length,0)
  assert.equal(secret.uri,null)
  s.close()
})
test('membership cannot self-escalate or rejoin after removal; moderators cannot remove owner',()=>{
  const {s,alice,bob,pub}=fixture()
  s.join(bob.actor.id,pub.id)
  assert.throws(()=>s.setMember(bob.actor.id,pub.id,bob.actor.id,true,'moderator'),/steward/)
  s.setMember(alice.actor.id,pub.id,bob.actor.id,true,'moderator')
  assert.throws(()=>s.setMember(bob.actor.id,pub.id,alice.actor.id,false),/Owner/)
  s.setMember(alice.actor.id,pub.id,bob.actor.id,false)
  assert.throws(()=>s.join(bob.actor.id,pub.id),/already exists/)
  s.close()
})
test('cross-community replies cannot carry private references into public records',()=>{
  const {s,alice,pub,hidden}=fixture()
  const privatePost=s.createPost(alice.actor.id,hidden.id,'secret')
  assert.throws(()=>s.createPost(alice.actor.id,pub.id,'Quote',privatePost.id),/Not found/)
  assert.equal(s.feed().length,0)
  s.close()
})
test('agents require separate community admission and operator mandate; budgets survive new mandates',()=>{
  const {s,alice,bob,agent,pub,advance}=fixture()
  assert.throws(()=>s.createPost(agent.actor.id,pub.id,'Hi'),/Not found/)
  s.setMember(alice.actor.id,pub.id,agent.actor.id,true)
  assert.throws(()=>s.createPost(agent.actor.id,pub.id,'Hi'),/mandate/)
  assert.throws(()=>s.mandate(bob.actor.id,agent.actor.id,pub.id,'Answer',s.clock()+10000),/operator/)
  const m=s.mandate(alice.actor.id,agent.actor.id,pub.id,'Public FAQ',s.clock()+10000,1)
  s.createPost(agent.actor.id,pub.id,'Answer',undefined,m)
  const newer=s.mandate(alice.actor.id,agent.actor.id,pub.id,'Public FAQ',s.clock()+10000,1)
  assert.throws(()=>s.createPost(agent.actor.id,pub.id,'Again',undefined,newer),/budget/)
  advance(10001)
  assert.throws(()=>s.createPost(agent.actor.id,pub.id,'Expired',undefined,m),/mandate/)
  assert.throws(()=>s.setMember(alice.actor.id,pub.id,agent.actor.id,true,'moderator'),/Human/)
  s.close()
})
test('queued agent work rechecks revocation before any network call',async()=>{
  const {s,alice,agent,pub}=fixture()
  s.setMember(alice.actor.id,pub.id,agent.actor.id,true)
  const m=s.mandate(alice.actor.id,agent.actor.id,pub.id,'Answer',s.clock()+10000)
  s.createPost(agent.actor.id,pub.id,'A sourced answer',undefined,m)
  s.revokeMandate(alice.actor.id,m)
  const pds=new Pds(agent.actor.did)
  await assert.rejects(s.deliver(agent.actor.id,s.jobs(agent.actor.id)[0].id,pds),/mandate/)
  assert.equal(pds.writes,0)
  s.close()
})
test('custodian review binds exact derivative; exported record carries neither original nor private IDs',()=>{
  const {s,alice,bob,pub}=fixture()
  const bytes=Buffer.from([0xff,0x00,0x41,0x0a])
  const source=s.createSource(alice.actor.id,bytes)
  assert.deepEqual(Buffer.from(s.source(alice.actor.id,source).bytes),bytes)
  assert.throws(()=>s.source(bob.actor.id,source),/Not found/)
  const rid=s.draftRelease(alice.actor.id,source,pub.id,alice.actor.id,'Approved public explanation')
  assert.throws(()=>s.publishRelease(alice.actor.id,rid),/no longer authorized/)
  assert.throws(()=>s.approveRelease(alice.actor.id,rid,'wrong'),/no longer matches/)
  assert.throws(()=>s.approveRelease(bob.actor.id,rid,s.release(alice.actor.id,rid).digest),/Not found/)
  s.approveRelease(alice.actor.id,rid,s.release(alice.actor.id,rid).digest)
  const p=s.publishRelease(alice.actor.id,rid)
  assert.equal(s.publishRelease(alice.actor.id,rid).id,p.id)
  const job=s.jobs(alice.actor.id)[0]
  assert.equal(job.record.includes(source),false)
  assert.equal(job.record.includes(rid),false)
  assert.equal(job.record.includes(s.source(alice.actor.id,source).digest),false)
  assert.equal(JSON.stringify(s.feed()).includes(rid),false)
  assert.equal(JSON.stringify(s.getPost(undefined,p.id)).includes('release_id'),false)
  validateRecord(JSON.parse(job.record))
  s.withdrawSource(alice.actor.id,source)
  assert.equal(s.feed().length,0)
  assert.equal(s.jobs(alice.actor.id)[0].state,'cancelled')
  assert.throws(()=>s.publishRelease(alice.actor.id,rid),/no longer authorized/)
  s.close()
})
test('business mutation and outbox commit atomically',()=>{
  const {s,alice,pub}=fixture()
  s.db.exec("CREATE TRIGGER reject_queue BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT,'queue failure'); END")
  assert.throws(()=>s.createPost(alice.actor.id,pub.id,'Should roll back'),/queue failure/)
  assert.equal(s.feed().length,0)
  s.close()
})
test('lost remote acknowledgment reconciles without duplicate delivery or overwriting an edited record',async()=>{
  const {s,alice,pub}=fixture()
  s.createPost(alice.actor.id,pub.id,'Durable public post')
  const job=s.jobs(alice.actor.id)[0], pds=new Pds(alice.actor.did)
  pds.failAfterWrite=true
  assert.equal((await s.deliver(alice.actor.id,job.id,pds)).state,'uncertain')
  await assert.rejects(s.deliver(alice.actor.id,job.id,pds),/reconciliation/)
  pds.failRead=true
  await assert.rejects(s.reconcile(alice.actor.id,job.id,pds),/Offline/)
  assert.equal(s.jobs(alice.actor.id)[0].state,'uncertain')
  pds.failRead=false
  // Different property order is not a conflicting record.
  const original=pds.records.get(job.rkey)!
  original.record=Object.fromEntries(Object.entries(original.record as object).reverse())
  assert.equal((await s.reconcile(alice.actor.id,job.id,pds)).state,'delivered')
  assert.equal(pds.writes,1)
  s.close()
})
test('withdrawal during a lost/in-flight delivery waits for reconciliation before deleting',async()=>{
  const {s,alice,pub}=fixture()
  const sid=s.createSource(alice.actor.id,Buffer.from('Private original'))
  const rid=s.draftRelease(alice.actor.id,sid,pub.id,alice.actor.id,'Public derivative')
  s.approveRelease(alice.actor.id,rid,s.release(alice.actor.id,rid).digest)
  s.publishRelease(alice.actor.id,rid)
  const job=s.jobs(alice.actor.id)[0], pds=new Pds(alice.actor.did)
  let finish!:()=>void
  const delay=new Promise<void>(resolve=>{finish=resolve})
  const oldPut=pds.put.bind(pds)
  pds.put=async(key,record)=>{await delay;return oldPut(key,record)}
  const delivering=s.deliver(alice.actor.id,job.id,pds)
  s.withdrawSource(alice.actor.id,sid)
  const deletion=s.jobs(alice.actor.id).find(j=>j.operation==='delete')!
  await assert.rejects(s.deliver(alice.actor.id,deletion.id,pds),/Reconcile original/)
  finish(); await delivering
  assert.equal(s.feed().length,0)
  assert.equal((await s.deliver(alice.actor.id,deletion.id,pds)).state,'delivered')
  assert.equal(pds.records.size,0)
  s.close()
})
test('an absent read after interrupted delivery is not proof a withdrawn post can never arrive',async()=>{
  const {s,alice,pub}=fixture()
  const sid=s.createSource(alice.actor.id,Buffer.from('Original'))
  const rid=s.draftRelease(alice.actor.id,sid,pub.id,alice.actor.id,'Public text')
  s.approveRelease(alice.actor.id,rid,s.release(alice.actor.id,rid).digest);s.publishRelease(alice.actor.id,rid)
  const job=s.jobs(alice.actor.id)[0], pds=new Pds(alice.actor.did)
  s.run("UPDATE outbox SET state='sending' WHERE id=?",job.id)
  s.recoverInterrupted();s.withdrawSource(alice.actor.id,sid)
  assert.equal((await s.reconcile(alice.actor.id,job.id,pds)).state,'uncertain')
  pds.records.set(job.rkey,{record:JSON.parse(job.record),cid:'late-cid'})
  assert.equal((await s.reconcile(alice.actor.id,job.id,pds)).state,'delivered')
  const deletion=s.jobs(alice.actor.id).find(j=>j.operation==='delete')!
  await s.deliver(alice.actor.id,deletion.id,pds)
  assert.equal(pds.records.size,0)
  s.close()
})
test('remote edits conflict; a publisher cannot write another actor repository',async()=>{
  const {s,alice,bob,pub}=fixture()
  s.createPost(alice.actor.id,pub.id,'Original')
  const job=s.jobs(alice.actor.id)[0], pds=new Pds(alice.actor.did)
  await assert.rejects(s.deliver(alice.actor.id,job.id,new Pds(bob.actor.did)),/identity mismatch/)
  s.run("UPDATE outbox SET state='uncertain' WHERE id=?",job.id)
  pds.records.set(job.rkey,{record:{text:'Externally changed'},cid:'other'})
  await assert.rejects(s.reconcile(alice.actor.id,job.id,pds),/differs/)
  assert.equal(pds.writes,0)
  s.close()
})
test('public replies wait for parent publication',async()=>{
  const {s,alice,pub}=fixture(), pds=new Pds(alice.actor.did)
  const parent=s.createPost(alice.actor.id,pub.id,'Parent')
  const child=s.createPost(alice.actor.id,pub.id,'Reply',parent.id)
  const jobs=s.jobs(alice.actor.id)
  await assert.rejects(s.deliver(alice.actor.id,jobs.find(j=>j.post_id===child.id)!.id,pds),/Parent publication/)
  await s.deliver(alice.actor.id,jobs.find(j=>j.post_id===parent.id)!.id,pds)
  await s.deliver(alice.actor.id,jobs.find(j=>j.post_id===child.id)!.id,pds)
  assert.equal(pds.records.size,2)
  s.close()
})
test('community moderation hides another author contribution without granting PDS deletion authority',async()=>{
  const {s,alice,bob,pub}=fixture()
  s.join(bob.actor.id,pub.id)
  const post=s.createPost(bob.actor.id,pub.id,'An ordinary contribution'),pds=new Pds(bob.actor.did)
  const job=s.jobs(bob.actor.id)[0]
  await s.deliver(bob.actor.id,job.id,pds)
  s.hidePost(alice.actor.id,post.id)
  assert.equal(s.feed().length,0)
  assert.equal(pds.records.size,1)
  assert.equal(s.jobs(bob.actor.id).some(j=>j.operation==='delete'),false)
  const pending=s.createPost(bob.actor.id,pub.id,'Not yet delivered')
  s.hidePost(alice.actor.id,pending.id)
  assert.equal(s.jobs(bob.actor.id).find(j=>j.post_id===pending.id)!.state,'cancelled')
  s.close()
})
test('canonical public schema rejects private metadata and malformed time',()=>{
  const record={$type:COLLECTION,text:'Public',community:'https://example.org/community/music',createdAt:new Date().toISOString(),actorKind:'human'}
  validateRecord(record)
  assert.throws(()=>validateRecord({...record,source_id:'private'}),/Unapproved/)
  assert.throws(()=>validateRecord({...record,createdAt:'yesterday'}))
  assert.equal(canonical({b:1,a:2}),canonical({a:2,b:1}))
})
test('source bytes and queued intent survive reopen; interrupted work is not auto-replayed',()=>{
  const dir=mkdtempSync(join(tmpdir(),'etnos-')),path=join(dir,'node.sqlite')
  try {
    let s=new Etnos(path)
    const owner=s.provision('did:web:owner.example','Owner')
    const c=s.createCommunity(owner.actor.id,'Community','Description','public',false,'approval','atproto')
    const sid=s.createSource(owner.actor.id,Buffer.from([0xff,0x12,0x00]))
    s.createPost(owner.actor.id,c.id,'Persistent post')
    s.run("UPDATE outbox SET state='sending'");s.close()
    s=new Etnos(path);s.recoverInterrupted()
    assert.equal(s.authenticate(owner.token).id,owner.actor.id)
    assert.deepEqual(Buffer.from(s.source(owner.actor.id,sid).bytes),Buffer.from([0xff,0x12,0x00]))
    assert.equal(s.jobs(owner.actor.id)[0].state,'uncertain')
    s.close()
  } finally { rmSync(dir,{recursive:true,force:true}) }
})
test('HTTP rejects forged identity, foreign origin/host and unauthorized direct private reads',async()=>{
  const {s,alice,bob,hidden}=fixture()
  const secret=s.createPost(alice.actor.id,hidden.id,'Never public')
  const app=server(s)
  await new Promise<void>(resolve=>app.listen(0,'127.0.0.1',resolve))
  const address=app.address() as {port:number};s.base=`http://127.0.0.1:${address.port}`
  const call=(path:string,headers:Record<string,string>={})=>fetch(s.base+path,{headers})
  try {
    assert.equal((await call(`/v1/posts/${secret.id}`)).status,404)
    assert.equal((await call('/v1/me',{'authorization':`Bearer ${bob.actor.id}`})).status,401)
    assert.equal((await call('/v1/me',{'authorization':`Bearer ${bob.token}`})).status,200)
    assert.equal((await call('/v1/feed',{'origin':'https://evil.example'})).status,403)
    const foreignHost = await new Promise<number>(resolve=>{
      request(s.base+'/health',{headers:{host:'evil.example'}},response=>{response.resume();resolve(response.statusCode!)}).end()
    })
    assert.equal(foreignHost,400)
    const response=await call(`/v1/posts/${secret.id}`,{'authorization':`Bearer ${alice.token}`})
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
    const attack=await fetch(s.base+'/v1/communities/'+hidden.id+'/members',{method:'POST',headers:{'authorization':`Bearer ${bob.token}`,'content-type':'application/json'},body:JSON.stringify({actorId:bob.actor.id,active:true,role:'owner'})})
    assert.equal(attack.status,404)
  } finally { await new Promise<void>(resolve=>app.close(()=>resolve()));s.close() }
})
