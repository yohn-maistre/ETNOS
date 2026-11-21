import {createHash,randomUUID} from 'node:crypto'
import {brokenRule} from './kios-rules.ts'
import {StrataCore,Fault,type Post} from './core.ts'
import {contentInput,contentOf,checkInlineMedia} from './post-content.ts'
import {checkSeason} from './seasons.ts'
import {Groups,strings} from './groups.ts'

/** Local forum lifecycle. Public PDS mutation requires its own qualified workflow. */
export class Forum {
 private store:StrataCore
 constructor(store:StrataCore){this.store=store}
 create(actor:string,b:Record<string,unknown>,groups:Groups){
  const s=this.store
  if(typeof b.communityId!=='string'||typeof b.text!=='string')throw new Fault(400,'Community and text required')
  const community=b.communityId,text=b.text,key=b.requestKey
  if(key!==undefined&&(typeof key!=='string'||!/^[a-f0-9-]{36}$/.test(key)))throw new Fault(400,'Invalid request key')
  const input:unknown[]=[community,text,b.parentId??null,b.mandateId??null,b.content??{},b.mediaIds??[],b.contextIds??[]]
  if(b.agentMention!==undefined){
   const mention=b.agentMention as Record<string,unknown>
   if(s.actor(actor).kind!=='human'||!key||!mention||typeof mention!=='object'||Array.isArray(mention)||Object.keys(mention).some(k=>!['actorId','choiceKey'].includes(k))||typeof mention.actorId!=='string'||mention.actorId.length>100||typeof mention.choiceKey!=='string'||!/^[a-f0-9]{64}$/.test(mention.choiceKey))throw new Fault(400,'Choose one available Aksara identity for this question')
   // Preserve historical request digests when no explicit agent request exists.
   input.push(['agent-reply',mention.actorId,mention.choiceKey])
  }
  const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex')
  return s.tx(()=>{
   // A replay still needs current membership, not only knowledge of its key.
   s.requireMember(actor,community)
   if(key){const previous=s.get<{digest:string;post_id:string}>('SELECT digest,post_id FROM post_requests WHERE actor_id=? AND request_key=?',actor,key);if(previous){if(previous.digest!==digest)throw new Fault(409,'This request already contains a different post');return s.getPost(actor,previous.post_id)}}
   if(s.get<{n:number}>('SELECT COUNT(*) n FROM posts WHERE author_id=? AND created>?',actor,s.clock()-60000)!.n>=20)throw new Fault(429,'Please wait before posting again')
   for(const field of ['parentId','mandateId'])if(b[field]!==undefined&&typeof b[field]!=='string')throw new Fault(400,'Invalid post field')
   const post=s.createPost(actor,community,text,b.parentId as string|undefined,b.mandateId as string|undefined,{content:b.content,mediaIds:strings(b.mediaIds??[])})
   for(const id of strings(b.contextIds??[]))groups.attach(actor,'post',post.id,id)
   if(key)s.run('INSERT INTO post_requests VALUES(?,?,?,?)',actor,key,digest,post.id)
   return s.getPost(actor,post.id)
  })
 }
 private editable(actor:string,id:string,revision:unknown){
  const s=this.store,p=s.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0',id)
  if(!p)throw new Fault(404,'Not found')
  s.requireMember(actor,p.community_id)
  // A person edits their own post. A steward may also correct or remove an agent's post; the audit names who did.
  if(s.actor(actor).kind!=='human')throw new Fault(403,'Author required')
  if(p.author_id!==actor){if(s.actor(p.author_id).kind!=='agent')throw new Fault(403,'Author required');s.requireSteward(actor,p.community_id)}
  if(p.uri||p.release_id)throw new Fault(409,'This post has a separate publication lifecycle')
  if(p.deleted)throw new Fault(409,'Post already deleted')
  if(revision!==p.revision)throw new Fault(409,'Post changed; reload before editing')
  return p
 }
 edit(actor:string,id:string,b:Record<string,unknown>){
  const s=this.store
  return s.tx(()=>{
   const p=this.editable(actor,id,b.revision),old=contentOf(p.content)
   if(typeof b.text!=='string'||b.text.length>20000)throw new Fault(400,'Invalid post text')
   const raw=b.content??{}
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['title','url','format','warning','inlineMedia','sources','season'].includes(k)))throw new Fault(400,'Edit only text, title, link, warning, sources or season')
   // An edit that does not mention the season keeps it; null removes it; a new one must be in use in this community.
   const {season:seasonPatch,...patch}=raw as Record<string,unknown>
   const season=seasonPatch===undefined?old.season:seasonPatch===null?undefined:contentInput({season:seasonPatch},s.clock()).season
   if(season&&season!==old.season)checkSeason(s,p.community_id,season)
   const c={...contentInput(patch,s.clock()),...(old.answer?{answer:old.answer}:{}),...(old.poll?{poll:old.poll}:{}),...(old.event?{event:old.event}:{}),...(season?{season}:{})}
   checkInlineMedia(c,s.all<{id:string}>('SELECT id FROM media WHERE post_id=?',id).map(m=>m.id))
   if(!b.text.trim()&&!c.title&&!c.url&&!c.poll&&!c.event&&!s.get('SELECT 1 FROM media WHERE post_id=?',id))throw new Fault(400,'Add text, a link or media')
   // An offer or request keeps to the Kios house rules after an edit too (src/kios-rules.ts).
   if(s.get('SELECT 1 FROM offerings WHERE post_id=?',id)&&brokenRule(b.text,c.title))throw new Fault(422,'This listing breaks a Kios house rule')
   s.run('UPDATE posts SET text=?,content=?,revision=revision+1,updated=? WHERE id=?',b.text.trim(),JSON.stringify(c),s.clock(),id)
   s.invalidatePublicContext(p.community_id)
   s.audit(actor,'post.edit',id);return s.getPost(actor,id)
  })
 }
 delete(actor:string,id:string,revision:unknown){
  const s=this.store
  return s.tx(()=>{
   const p=this.editable(actor,id,revision)
   s.run("UPDATE posts SET text='',content='{}',deleted=1,pinned=0,revision=revision+1,updated=? WHERE id=?",s.clock(),id)
   for(const table of ['media','poll_votes','event_responses','votes','bookmarks','post_confirmations'])s.run(`DELETE FROM ${table} WHERE post_id=?`,id)
   s.run("DELETE FROM record_contexts WHERE record_kind='post' AND record_id=?",id)
   s.run('DELETE FROM post_entries WHERE post_id=?',id)
   s.invalidatePublicContext(p.community_id)
   s.audit(actor,'post.delete',id);return s.getPost(actor,id)
  })
 }
 moderate(actor:string,id:string,b:Record<string,unknown>){
  const s=this.store
  return s.tx(()=>{
   const p=s.get<Post>('SELECT * FROM posts WHERE id=?',id);if(!p)throw new Fault(404,'Not found')
   s.requireSteward(actor,p.community_id)
   const action=b.action,reason=b.reason
   if(!['hide','restore','lock','unlock','pin','unpin'].includes(String(action))||typeof reason!=='string'||!reason.trim()||reason.length>500)throw new Fault(400,'Action and short reason required')
   if(p.deleted)throw new Fault(409,'Post deleted by author')
   if(action==='restore'&&p.release_id)throw new Fault(409,'Use the protected release lifecycle')
   if(['lock','unlock','pin','unpin'].includes(String(action))&&p.parent_id)throw new Fault(400,'Choose the opening post')
   if(action==='hide')s.hidePost(actor,id)
   else if(action==='restore')s.run('UPDATE posts SET hidden=0 WHERE id=?',id)
   else if(action==='lock'||action==='unlock')s.run('UPDATE posts SET locked=? WHERE id=?',Number(action==='lock'),id)
   else s.run('UPDATE posts SET pinned=? WHERE id=?',Number(action==='pin'),id)
   if(action!=='hide')s.invalidatePublicContext(p.community_id)
   s.run('INSERT INTO moderation_events VALUES(?,?,?,?,?,?,?)',randomUUID(),p.community_id,id,actor,String(action),reason.trim(),s.clock())
   s.audit(actor,'moderation.'+action,id);return{ok:true}
  })
 }
 moderation(actor:string,cid:string){
  const s=this.store;s.requireSteward(actor,cid)
  return{posts:s.all('SELECT id,text,content,hidden,locked,pinned,created FROM posts WHERE community_id=? AND deleted=0 AND (hidden=1 OR locked=1 OR pinned=1) ORDER BY created DESC LIMIT 100',cid),events:s.all('SELECT post_id,action,reason,created FROM moderation_events WHERE community_id=? ORDER BY created DESC LIMIT 100',cid)}
 }
 private participant(actor:string,id:string){
  const s=this.store,p=s.getPost(actor,id);s.requireMember(actor,p.community_id)
  if(s.actor(actor).kind!=='human')throw new Fault(403,'Human participant required')
  if(p.deleted||s.get<{locked:number}>('SELECT locked FROM posts WHERE id=?',p.rootId)?.locked)throw new Fault(409,'This conversation is closed')
  return p
 }
 poll(actor:string,id:string,choice:unknown){
  const s=this.store;return s.tx(()=>{
   const p=this.participant(actor,id)
   if(!p.poll||p.poll.closed)throw new Fault(409,'Poll closed')
   if(choice===null)s.run('DELETE FROM poll_votes WHERE post_id=? AND actor_id=?',id,actor)
   else{if(!Number.isInteger(choice)||Number(choice)<0||Number(choice)>=p.poll.options.length)throw new Fault(400,'Invalid poll option');s.run('INSERT INTO poll_votes VALUES(?,?,?,?) ON CONFLICT(post_id,actor_id) DO UPDATE SET choice=excluded.choice,created=excluded.created',id,actor,Number(choice),s.clock())}
   return s.getPost(actor,id)
  })
 }
 /** "Benar": a member confirms a post by an agent. One per person; sending false withdraws it. */
 confirm(actor:string,id:string,value:unknown){
  const s=this.store;return s.tx(()=>{
   const p=this.participant(actor,id)
   if(p.author.kind!=='agent')throw new Fault(409,'Only agent posts take answers')
   if(typeof value!=='boolean')throw new Fault(400,'Invalid answer')
   if(value)s.run('INSERT INTO post_confirmations VALUES(?,?,?) ON CONFLICT(post_id,actor_id) DO NOTHING',id,actor,s.clock())
   else s.run('DELETE FROM post_confirmations WHERE post_id=? AND actor_id=?',id,actor)
   return s.getPost(actor,id)
  })
 }
 rsvp(actor:string,id:string,response:unknown){
  const s=this.store;return s.tx(()=>{
   const p=this.participant(actor,id)
   if(!p.event)throw new Fault(404,'Not found')
   if(response===null)s.run('DELETE FROM event_responses WHERE post_id=? AND actor_id=?',id,actor)
   else{if(response!=='going'&&response!=='interested')throw new Fault(400,'Invalid response');s.run('INSERT INTO event_responses VALUES(?,?,?,?) ON CONFLICT(post_id,actor_id) DO UPDATE SET response=excluded.response,created=excluded.created',id,actor,response,s.clock())}
   return s.getPost(actor,id)
  })
 }
}
