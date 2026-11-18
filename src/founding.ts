import {randomBytes,createHash} from 'node:crypto'
import {Fault,type StrataCore,type Community} from './core.ts'

/** Starting a community takes two people. The founder gets a waiting room only they can see and a link
 * to send (on WhatsApp, say). The room opens when one more person accepts, and lapses after 14 days.
 *
 * While forming, the community is stored as hidden-private with invite-only admission, so every read path
 * that already hides private communities hides it too. The visibility and admission the founder chose wait
 * in founding_visibility and founding_admission and take effect when the room opens.
 *
 * The link is a bearer token shown once; only its hash is kept. It works until 14 days after founding, also
 * after the room opened (a link sent to a WhatsApp group reaches several people), unless the founder replaces
 * or withdraws it, and only while its issuer is still a steward. */
export const FORMING_DAYS=14
const FORMING_MS=FORMING_DAYS*86400000,MAX_FORMING=3
const hash=(token:string)=>createHash('sha256').update(token).digest('hex')
type Forming=Community&{forming_until:number|null;founding_visibility:Community['visibility']|null;founding_admission:Community['admission']|null}
type Link={hash:string;community_id:string;issuer_id:string;created:number;expires:number;revoked:number}

export class Founding{
 private store:StrataCore
 constructor(store:StrataCore){this.store=store}
 private row(communityId:string){return this.store.get<Forming>('SELECT * FROM communities WHERE id=?',communityId)}
 /** Forming state as the founder sees it; null for a community that is open. */
 static state(c:Partial<Forming>,now:number){
  if(c.forming_until==null||!c.founding_visibility)return null
  return {until:c.forming_until,lapsed:c.forming_until<=now,visibility:c.founding_visibility,admission:c.founding_admission??'invite'}
 }
 found(actorId:string,b:{title:string;description:string;visibility:Community['visibility'];admission?:Community['admission']}){
  const s=this.store
  const visibility=b.visibility,admission=b.admission??(visibility==='public'?'open':'invite')
  if(!['public','listed-private','hidden-private'].includes(visibility))throw new Fault(400,'Invalid visibility')
  if(!['open','approval','invite'].includes(admission)||(visibility!=='public'&&admission==='open')||(visibility==='hidden-private'&&admission!=='invite'))throw new Fault(400,'Invalid admission policy')
  return s.tx(()=>{
   const now=s.clock()
   const forming=s.get<{n:number}>("SELECT COUNT(*) n FROM communities c JOIN memberships m ON m.community_id=c.id AND m.actor_id=? AND m.role='owner' WHERE c.forming_until>?",actorId,now)!.n
   if(forming>=MAX_FORMING)throw new Fault(409,'Wait for one of your new communities to open first')
   const c=s.createCommunity(actorId,b.title,b.description,'hidden-private',false,'invite')
   s.run('UPDATE communities SET forming_until=?,founding_visibility=?,founding_admission=? WHERE id=?',now+FORMING_MS,visibility,admission,c.id)
   s.audit(actorId,'community.found',c.id)
   return {...this.view(c.id),...this.issue(actorId,c.id)}
  })
 }
 view(communityId:string){const c=this.row(communityId)!;return {...c,forming:Founding.state(c,this.store.clock())}}
 private issue(actorId:string,communityId:string){
  const s=this.store,c=this.row(communityId)!
  s.run('UPDATE founding_links SET revoked=1 WHERE community_id=?',communityId)
  const token=randomBytes(32).toString('base64url'),created=s.clock()
  // A link never outlives the founding window, so one sent late cannot open a room after it lapsed.
  const expires=c.forming_until??created
  s.run('INSERT INTO founding_links(hash,community_id,issuer_id,created,expires,revoked) VALUES(?,?,?,?,?,0)',hash(token),communityId,actorId,created,expires)
  return {token,expires}
 }
 /** A fresh link for the waiting room. The previous one stops working. */
 renew(actorId:string,communityId:string){
  const s=this.store
  return s.tx(()=>{
   s.requireSteward(actorId,communityId)
   const state=Founding.state(this.row(communityId)!,s.clock())
   if(!state)throw new Fault(409,'This community is already open')
   if(state.lapsed)throw new Fault(410,'This community did not open in time')
   s.audit(actorId,'founding.link',communityId)
   return this.issue(actorId,communityId)
  })
 }
 /** The link stops working. While the room is still forming, the founder also gives up on it: it lapses now
  * and nothing becomes visible. After it opened, only the link stops; the community stays as it is. */
 withdraw(actorId:string,communityId:string){
  const s=this.store
  return s.tx(()=>{
   s.requireSteward(actorId,communityId)
   const state=Founding.state(this.row(communityId)!,s.clock())
   s.run('UPDATE founding_links SET revoked=1 WHERE community_id=?',communityId)
   if(state&&!state.lapsed)s.run('UPDATE communities SET forming_until=? WHERE id=?',s.clock(),communityId)
   s.audit(actorId,'founding.withdraw',communityId)
   return this.view(communityId)
  })
 }
 /** A valid link, checked at use time: not revoked, not expired, and its issuer still stewards the room. */
 private link(token:unknown){
  const s=this.store
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Fault(404,'Not found')
  const l=s.get<Link>('SELECT * FROM founding_links WHERE hash=?',hash(token))
  if(!l||l.revoked||l.expires<=s.clock())throw new Fault(404,'Not found')
  const m=s.membership(l.issuer_id,l.community_id)
  if(!m||!['owner','moderator'].includes(m.role))throw new Fault(404,'Not found')
  const c=this.row(l.community_id)!,state=Founding.state(c,s.clock())
  if(state?.lapsed)throw new Fault(404,'Not found')
  return {l,c,state}
 }
 /** What the person holding the link may see before accepting: the name, the description and who sent it. */
 preview(token:unknown,actorId?:string){
  const {l,c,state}=this.link(token),issuer=this.store.actor(l.issuer_id)
  return {community:{id:c.id,title:c.title,description:c.description,visibility:state?.visibility??c.visibility},founder:{name:issuer.name},forming:!!state,expires:l.expires,member:!!(actorId&&this.store.membership(actorId,c.id))}
 }
 accept(actorId:string,token:unknown){
  const s=this.store
  return s.tx(()=>{
   const {c,state}=this.link(token)
   if(s.actor(actorId).kind!=='human')throw new Fault(403,'A person must accept')
   if(s.get('SELECT 1 FROM memberships WHERE community_id=? AND actor_id=?',c.id,actorId))throw new Fault(409,'Membership already exists; contact a steward')
   s.run("INSERT INTO memberships VALUES(?,?,'member',1)",c.id,actorId)
   s.audit(actorId,'founding.accept',c.id)
   // The second person opens the room and the founder's choices take effect. Read and written inside
   // this transaction, so two people accepting at once open it only once.
   if(state)s.openIfReady(actorId,c.id)
   return this.view(c.id)
  })
 }
}
