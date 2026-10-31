// Test-only entrypoint. This class and its provisioning RPCs MUST NOT be deployed.
import worker, { StrataNode } from '../src/worker.ts'
import { StrataCore } from '../src/core.ts'
import { CloudflareDatabase } from '../src/cloudflare-database.ts'
import type { Publisher, PublicRecord } from '../src/transport.ts'

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
}

export default worker
