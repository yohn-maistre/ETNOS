import {createHash} from 'node:crypto'
import {EtnosCore,Fault} from './core.ts'
import {canonical} from './transport.ts'

export type ArtifactKind='post'|'offering'|'wiki'|'work'|'knowledge'|'news'|'source'|'agent-job'
export type ArtifactRef={kind:ArtifactKind;id:string;revision:number;communityId:string}
export const hash=(value:unknown)=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex')
export function text(value:unknown,max=2000,allowEmpty=false){
 if(typeof value!=='string'||value.length>max||(!allowEmpty&&!value.trim()))throw new Fault(400,'Invalid text')
 return value.trim()
}
export function key(value:unknown){const result=text(value,100);if(!/^[a-zA-Z0-9:_-]{8,100}$/.test(result))throw new Fault(400,'Invalid request key');return result}
export function expected(value:unknown,revision:number){if(!Number.isSafeInteger(value)||value!==revision)throw new Fault(409,'This item changed; reload before continuing')}
export function publicURL(value:unknown){
 const raw=text(value,2000);let u:URL
 try{u=new URL(raw)}catch{throw new Fault(400,'Public HTTPS URL required')}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^[\d.[\]:]+$/.test(u.hostname)||/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(u.hostname))throw new Fault(400,'Public HTTPS URL required')
 u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k)
 return u.href
}
export function citations(values:unknown):string[]{
 if(!Array.isArray(values)||values.length>20)throw new Fault(400,'At most 20 citations')
 return [...new Set(values.map(publicURL))]
}
export function readScope(s:EtnosCore,communityId:string,actorId?:string){
 const c=s.community(communityId);if(!s.canRead(actorId,c))throw new Fault(404,'Not found');return c
}
export function publicSteward(s:EtnosCore,actorId:string,communityId:string){
 if(s.community(communityId).visibility!=='public')throw new Fault(404,'Not found')
 s.requireSteward(actorId,communityId)
}
/** Caller performs current domain authorization *before* looking up a receipt.
 * Replayed bodies cannot change a completed request or bypass revoked access. */
export function transition<T>(s:EtnosCore,actorId:string,requestKey:unknown,action:string,input:unknown,authorize:()=>void,apply:()=>T):T{
 const k=key(requestKey),digest=hash({action,input})
 return s.tx(()=>{
  authorize()
  const prior=s.get<{action:string;digest:string;result:string}>('SELECT action,digest,result FROM commons_receipts WHERE actor_id=? AND request_key=?',actorId,k)
  if(prior){if(prior.action!==action||prior.digest!==digest)throw new Fault(409,'This request key was already used for another change');return JSON.parse(prior.result) as T}
  const result=apply();s.run('INSERT INTO commons_receipts VALUES(?,?,?,?,?,?)',actorId,k,action,digest,JSON.stringify(result),s.clock());return result
 })
}
/** Events carry identifiers only, never private body snapshots or credentials.
 * Their projection must still check the current domain and audience. */
export function emit(s:EtnosCore,actorId:string,kind:string,artifact:ArtifactRef){
 s.run('INSERT INTO commons_events(community_id,actor_id,kind,artifact_kind,artifact_id,revision,created) VALUES(?,?,?,?,?,?,?)',artifact.communityId,actorId,kind,artifact.kind,artifact.id,artifact.revision,s.clock())
 s.audit(actorId,kind,artifact.id)
}
/** Invalidate future runtime context after correction, withdrawal or policy change.
 * Epoch rotation keeps earlier transcripts/compactions out of new model context. */
export function invalidateContext(s:EtnosCore,communityId:string){s.invalidatePublicContext(communityId)}
export function contextEpoch(s:EtnosCore,communityId:string){return s.get<{epoch:number}>('SELECT epoch FROM community_context_epochs WHERE community_id=?',communityId)?.epoch??0}
