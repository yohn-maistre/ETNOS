import {randomUUID} from 'node:crypto'
import {StrataCore,Fault,type Post} from './core.ts'

function text(value:string,max:number) { if(typeof value!=='string' || !value.trim() || value.length>max) throw new Fault(400,'Invalid input');return value.trim() }
export class Social {
  private store: StrataCore
  constructor(store:StrataCore) { this.store=store }
  people(actorId:string,query:string){
    this.store.actor(actorId)
    if(typeof query!=='string'||query.trim().length<2||query.length>100)return[]
    return this.store.all<{id:string;name:string;did:string;kind:string}>(`SELECT a.id,a.name,a.did,a.kind FROM actors a WHERE a.id!=? AND instr(lower(a.name),lower(?))>0 AND (EXISTS(SELECT 1 FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.author_id=a.id AND p.hidden=0 AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))) OR EXISTS(SELECT 1 FROM wiki_pages w JOIN wiki_revisions r ON r.id=w.revision_id JOIN communities c ON c.id=w.community_id WHERE r.author_id=a.id AND c.visibility='public')) ORDER BY a.name,a.id LIMIT 20`,actorId,query.trim(),actorId)
  }
  vote(actorId:string,postId:string,value:number) {
    const s=this.store
    return s.tx(()=>{
      const post=s.getPost(actorId,postId)
      s.requireMember(actorId,post.community_id)
      if(s.actor(actorId).kind!=='human') throw new Fault(403,'Agents cannot vote')
      if(![-1,0,1].includes(value)) throw new Fault(400,'Invalid vote')
      if(value===0) s.run('DELETE FROM votes WHERE post_id=? AND actor_id=?',postId,actorId)
      else s.run('INSERT INTO votes VALUES(?,?,?) ON CONFLICT(post_id,actor_id) DO UPDATE SET value=excluded.value',postId,actorId,value)
      return s.getPost(actorId,postId)
    })
  }
  bookmark(actorId:string,postId:string,save:boolean) {
    const s=this.store
    return s.tx(()=>{
      s.actor(actorId);s.getPost(actorId,postId)
      if(save) s.run('INSERT OR IGNORE INTO bookmarks VALUES(?,?,?)',postId,actorId,s.clock())
      else s.run('DELETE FROM bookmarks WHERE post_id=? AND actor_id=?',postId,actorId)
      return {saved:save}
    })
  }
  bookmarks(actorId:string) {
    const s=this.store;s.actor(actorId)
    const rows=s.all<{id:string}>(`SELECT p.id FROM bookmarks b JOIN posts p ON p.id=b.post_id JOIN communities c ON c.id=p.community_id
      WHERE b.actor_id=? AND p.hidden=0 AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
      ORDER BY b.created DESC,p.id DESC LIMIT 100`,actorId,actorId)
    return rows.map(p=>s.getPost(actorId,p.id))
  }
  report(actorId:string,postId:string,reason:string) {
    const s=this.store
    return s.tx(()=>{
      s.actor(actorId);s.getPost(actorId,postId)
      if(s.actor(actorId).kind!=='human') throw new Fault(403,'Human reporter required')
      if(s.get('SELECT 1 FROM reports WHERE post_id=? AND reporter_id=?',postId,actorId)) throw new Fault(409,'Report already submitted')
      const id=randomUUID()
      s.run("INSERT INTO reports(id,post_id,reporter_id,reason,state,created) VALUES(?,?,?,?,'open',?)",id,postId,actorId,text(reason,2000),s.clock())
      s.audit(actorId,'report.create',postId)
      return {id,state:'open'}
    })
  }
  reports(actorId:string,communityId:string) {
    const s=this.store;s.requireSteward(actorId,communityId)
    return s.all<{id:string;post_id:string;reason:string;state:string;created:number}>(`SELECT r.id,r.post_id,r.reason,r.state,r.created FROM reports r JOIN posts p ON p.id=r.post_id
      WHERE p.community_id=? ORDER BY r.created DESC,r.id LIMIT 100`,communityId)
  }
  decideReport(actorId:string,reportId:string,state:'resolved'|'dismissed',decision:string) {
    const s=this.store
    s.tx(()=>{
      const report=s.get<{post_id:string;state:string}>('SELECT post_id,state FROM reports WHERE id=?',reportId)
      if(!report) throw new Fault(404,'Not found')
      const post=s.get<Post>('SELECT * FROM posts WHERE id=?',report.post_id)!
      s.requireSteward(actorId,post.community_id)
      if(report.state!=='open') throw new Fault(409,'Report already decided')
      if(!['resolved','dismissed'].includes(state)) throw new Fault(400,'Invalid decision')
      s.run('UPDATE reports SET state=?,decision=?,reviewer_id=? WHERE id=?',state,text(decision,2000),actorId,reportId)
      s.audit(actorId,'report.'+state,report.post_id)
    })
  }
  addTopic(actorId:string,communityId:string,title:string) {
    const s=this.store
    return s.tx(()=>{
      s.requireSteward(actorId,communityId)
      if(s.community(communityId).visibility!=='public') throw new Fault(400,'Public topics require a public community')
      const value=text(title,100),normalized=value.normalize('NFKC').toLocaleLowerCase('en-US')
      let topic=s.get<{id:string;title:string}>('SELECT id,title FROM topics WHERE normalized=?',normalized)
      if(!topic) {topic={id:randomUUID(),title:value};s.run('INSERT INTO topics VALUES(?,?,?)',topic.id,topic.title,normalized)}
      s.run('INSERT OR IGNORE INTO community_topics VALUES(?,?)',communityId,topic.id)
      s.audit(actorId,'topic.attach',communityId)
      return topic
    })
  }
  topics() { return this.store.all<{id:string;title:string}>('SELECT id,title FROM topics ORDER BY normalized LIMIT 100') }
}
