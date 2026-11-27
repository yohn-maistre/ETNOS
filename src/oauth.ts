import {createHash,randomBytes,timingSafeEqual} from 'node:crypto'
import {Buffer} from 'node:buffer'
import {NodeOAuthClient,JoseKey,type NodeSavedState,type NodeSavedSession,type RuntimeLock,type Fetch} from '@atproto/oauth-client-node'
import {Agent} from '@atproto/api'
import {DidResolverCommon,DidPlcMethod,DidWebMethod} from '@atproto-labs/did-resolver'
import {EtnosCore,Fault,type Actor} from './core.ts'
import {json,body as readBody} from './api.ts'
import {signGrant,linkKeyBytes} from '../packages/pds/src/host/link-grant.ts'
import {PushCenter,pushInput,type PushInput} from './push.ts'

const SESSION_COOKIE='__Host-strata',FLOW_COOKIE='__Host-strata_flow'
const token=()=>randomBytes(32).toString('base64url')
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y)}
function cookie(request:Request,name:string){
  const values=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='))
  return values.length===1?values[0].slice(name.length+1):''
}
const setCookie=(name:string,value:string,age:number)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`
type Saved={sealed:string;expires:number}
type BrowserSession={hash:string;actor_id:string;csrf:string;created:number;expires:number;revoked:number}
export type OAuthConfiguration={origin:string;privateJwk:string;sealKey:string;stewardDid:string;allowedHosts:string[];collection?:string;publishingEnabled?:boolean;enrollmentMode?:'open'|'invite'|'closed';clientName?:string;accountHost?:string
  /** Shared with the identity host (its NODE_LINK_KEY): lets one invitation link also make a host account. */
  hostLinkKey?:string
  /** Web push is configured: someone asking for an invitation may ask to hear back by notification. */
  pushEnabled?:boolean}
type EnrollmentInvite={id:string;hash:string;issuer_id:string;created:number;expires:number;revoked:number;used_by:string|null;used_at:number|null;uses:number;max_uses:number}
type InviteRequest={id:string;name:string;contact:string;reason:string;created:number;state:'pending'|'approved';decided:number|null;invitation_id:string|null}
/** Free text from a visitor: no control characters, trimmed, bounded. */
function plain(value:unknown,max:number){return typeof value==='string'?value.replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'').replace(/[ \t]+/g,' ').trim().slice(0,max):''}
type FlowContext={browser:string;returnTo:string;enroll?:'open'|'invite'|'host';inviteHash?:string;did?:string}
function returnPath(value:unknown){
  if(value===undefined)return '/'
  if(typeof value!=='string'||value.length>1024||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20\x7f]/.test(value))throw new Fault(400,'Invalid return destination')
  const url=new URL(value,'https://local.invalid')
  if(url.origin!=='https://local.invalid'||/^\/(auth|oauth|login)(\/|$)/.test(url.pathname))throw new Fault(400,'Invalid return destination')
  return url.pathname+url.search+url.hash
}
function flowContext(appState:string):FlowContext{
  // Existing ten-minute login flows survive a rolling deployment.
  if(/^[a-f0-9]{64}$/.test(appState))return{browser:appState,returnTo:'/'}
  return JSON.parse(appState) as FlowContext
}

/** No arbitrary discovery destinations: hosted providers are explicitly allowed.
 * Standard SDK discovery still verifies DID/issuer. Each redirect is independently
 * checked, credentials never follow across origins, and response bodies are bounded.
 */
export function providerFetch(hosts:string[],underlying:typeof globalThis.fetch=globalThis.fetch):Fetch {
  const allowed=new Set(hosts)
  return async(input,init)=>{
    // Workerd does not implement redirect:error. Preserve its reject semantics
    // ourselves while constructing only supported native Request values.
    const wanted=init?.redirect??(input instanceof Request?input.redirect:'follow')
    let request=new Request(input,{...init,redirect:wanted==='error'?'manual':wanted})
    for(let hop=0;hop<4;hop++){
      const url=new URL(request.url)
      const permitted=allowed.has(url.hostname)||([...allowed].some(host=>host.startsWith('.') && url.hostname.endsWith(host)))
      if(url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443') || !permitted)throw Error('Provider endpoint is not enabled for this deployment')
      const response=await underlying(new Request(request,{redirect:'manual',signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)])}))
      if(response.status>=300 && response.status<400){
        const location=response.headers.get('location');await response.body?.cancel()
        if(wanted!=='follow' || !location || request.method!=='GET')throw Error('Provider redirect rejected')
        const target=new URL(location,url)
        if(target.origin!==url.origin)throw Error('Cross-origin provider redirect rejected')
        request=new Request(target,{headers:request.headers,redirect:'follow',signal:request.signal});continue
      }
      const max=2*1024*1024,reader=response.body?.getReader(),parts:Uint8Array[]=[];let size=0
      if(reader){try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Provider response too large')}parts.push(value)}}finally{reader.releaseLock()}}
      return new Response(size?Buffer.concat(parts):null,{status:response.status,statusText:response.statusText,headers:response.headers})
    }
    throw Error('Too many provider redirects')
  }
}

// SDK DID methods wrap fetch with native Request before the supplied fetch is
// reached. Override only that protected transport seam for workerd. All DID
// parsing, document validation and bidirectional identity checks remain upstream.
class EdgePlcMethod extends DidPlcMethod {
  protected override readonly fetch:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>
  constructor(fetch:Fetch){super({fetch});this.fetch=(input,init)=>fetch.call(globalThis,input,init)}
}
class EdgeWebMethod extends DidWebMethod {
  protected override readonly fetch:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>
  constructor(fetch:Fetch){super({fetch,allowHttp:false});this.fetch=(input,init)=>fetch.call(globalThis,input,init)}
}
class EdgeDidResolver extends DidResolverCommon {
  constructor(fetch:Fetch){
    super({fetch,allowHttp:false})
    const plc=new EdgePlcMethod(fetch),web=new EdgeWebMethod(fetch)
    this.methods.set('plc',{resolve:(did,options)=>plc.resolve(did as `did:plc:${string}`,options)})
    this.methods.set('web',{resolve:(did,options)=>web.resolve(did as `did:web:${string}`,options)})
  }
}

/** Credentials are sealed with a dedicated deployment key, separate from signing.
 * The hosting operator remains trusted; this is not user-held E2EE. */
export class OAuthRecords {
  private store:EtnosCore
  private key:Promise<CryptoKey>
  constructor(store:EtnosCore,sealKey:string){
    this.store=store
    const bytes=Buffer.from(sealKey,'base64url')
    if(bytes.length!==32)throw Error('A 32-byte OAuth storage key is required')
    this.key=crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt'])
  }
  async set(kind:'state'|'session',key:string,value:unknown){
    const iv=crypto.getRandomValues(new Uint8Array(12)),aad=new TextEncoder().encode(kind+':'+key)
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await this.key,new TextEncoder().encode(JSON.stringify(value)))
    const sealed=Buffer.concat([iv,new Uint8Array(ciphertext)]).toString('base64url'),expires=this.store.clock()+(kind==='state'?600000:30*86400000)
    this.store.run('INSERT INTO oauth_records VALUES(?,?,?,?) ON CONFLICT(kind,key) DO UPDATE SET sealed=excluded.sealed,expires=excluded.expires',kind,key,sealed,expires)
  }
  async get<T>(kind:'state'|'session',key:string,take=false):Promise<T|undefined>{
    const saved=this.store.tx(()=>{
      const row=this.store.get<Saved>('SELECT sealed,expires FROM oauth_records WHERE kind=? AND key=?',kind,key)
      if(take || (row && row.expires<=this.store.clock()))this.del(kind,key)
      return row && row.expires>this.store.clock()?row:undefined
    })
    if(!saved)return undefined
    const bytes=Buffer.from(saved.sealed,'base64url')
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(0,12),additionalData:new TextEncoder().encode(kind+':'+key)},await this.key,bytes.subarray(12))
    return JSON.parse(new TextDecoder().decode(clear)) as T
  }
  del(kind:'state'|'session',key:string){this.store.run('DELETE FROM oauth_records WHERE kind=? AND key=?',kind,key)}
  cleanup(){this.store.run('DELETE FROM oauth_records WHERE expires<=?',this.store.clock());this.store.run('DELETE FROM browser_sessions WHERE expires<=? OR revoked=1',this.store.clock())}
}

export class BrowserAuth {
  private store:EtnosCore
  private config:OAuthConfiguration
  readonly records:OAuthRecords
  readonly client:NodeOAuthClient
  /** Request-side push only (subscribe, forget, queue); the node's PushCenter sends. */
  private push:PushCenter
  private constructor(store:EtnosCore,config:OAuthConfiguration,records:OAuthRecords,client:NodeOAuthClient){this.store=store;this.config=config;this.records=records;this.client=client;this.push=new PushCenter(store,()=>null)}
  static async create(store:EtnosCore,config:OAuthConfiguration,fetcher?:Fetch){
    if(new URL(config.origin).protocol!=='https:' || new URL(config.origin).origin!==store.base)throw Error('OAuth requires the canonical HTTPS origin')
    const records=new OAuthRecords(store,config.sealKey),key=await JoseKey.fromJWK(config.privateJwk,'strata-signing-1')
    const locks=new Map<string,Promise<unknown>>()
    const requestLock:RuntimeLock=async(name,fn)=>{
      const prior=locks.get(name)??Promise.resolve()
      let release!:()=>void;const own=new Promise<void>(resolve=>{release=resolve})
      const tail=prior.catch(()=>{}).then(()=>own);locks.set(name,tail)
      await prior.catch(()=>{})
      try{return await fn()}finally{release();if(locks.get(name)===tail)locks.delete(name)}
    }
    const scopes='atproto'+(config.publishingEnabled && config.collection?' repo:'+config.collection:'')
    const fetch=providerFetch(config.allowedHosts,fetcher)
    const client=new NodeOAuthClient({
      clientMetadata:{client_id:config.origin+'/oauth/client-metadata.json',client_name:config.clientName??'ETNOS',client_uri:config.origin,
        redirect_uris:[config.origin+'/auth/callback'],grant_types:['authorization_code','refresh_token'],response_types:['code'],
        scope:scopes,application_type:'web',token_endpoint_auth_method:'private_key_jwt',token_endpoint_auth_signing_alg:'ES256',
        dpop_bound_access_tokens:true,jwks_uri:config.origin+'/oauth/jwks.json'},
      keyset:[key],handleResolver:'https://bsky.social',didResolver:new EdgeDidResolver(fetch),fetch,
      stateStore:{set:(key,value)=>records.set('state',key,value),get:key=>records.get<NodeSavedState>('state',key,true),del:async key=>records.del('state',key)},
      sessionStore:{set:(key,value)=>records.set('session',key,value),get:key=>records.get<NodeSavedSession>('session',key),del:async key=>records.del('session',key)},
      runtimeImplementation:{requestLock,createKey:algs=>{if(!algs.includes('ES256'))throw Error('Provider must support ES256 DPoP');return JoseKey.generate(['ES256'])},
        getRandomValues:length=>crypto.getRandomValues(new Uint8Array(length)),
        digest:async(bytes,algorithm)=>new Uint8Array(await crypto.subtle.digest(algorithm.name.replace('sha','SHA-'),bytes))},
    })
    const inst=new BrowserAuth(store,config,records,client)
    inst.syncBootstrappedSpaces()
    return inst
  }
  private allowed(did:string){return !!this.config.stewardDid && (did===this.config.stewardDid || !!this.store.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',did))}
  private enrollmentMode(){return this.config.enrollmentMode??'invite'}
  /** Whether a DID document names this node's own identity host as its PDS. */
  private onOwnHost(doc:{service?:unknown}){
    const host=this.accountHost();if(!host)return false
    const services=Array.isArray(doc.service)?doc.service as {id?:string;serviceEndpoint?:unknown}[]:[]
    return services.some(x=>typeof x.id==='string'&&x.id.endsWith('#atproto_pds')&&typeof x.serviceEndpoint==='string'&&x.serviceEndpoint.replace(/\/+$/,'')===host)
  }
  private accountHost(){
    const host=this.config.accountHost
    if(!host)return undefined
    const url=new URL(host)
    if(url.protocol!=='https:'||url.origin!==host||!this.config.allowedHosts.includes(url.hostname))throw new Fault(503,'Account host is misconfigured')
    return url.origin
  }
  private enrollmentSteward(){
    const actor=this.store.get<Actor>("SELECT * FROM actors WHERE did=? AND kind='human'",this.config.stewardDid)
    if(!actor)throw new Fault(503,'Enrollment is being configured')
    return actor
  }
  private invite(inviteHash:string){
    const invite=this.store.get<EnrollmentInvite>('SELECT * FROM enrollment_invitations WHERE hash=?',inviteHash)
    if(!invite||invite.revoked||invite.uses>=invite.max_uses||invite.expires<=this.store.clock())throw new Fault(403,'Invitation is invalid, expired or already used')
    return invite
  }
  /** The address an invitation link opens. The code rides in the query only until the page reads it. */
  inviteUrl(invitation:string){return this.config.origin+'/gabung?kode='+invitation}
  /** A grant the identity host accepts in place of its own invite code, for this one invitation. */
  private async hostGrant(invite:EnrollmentInvite){
    if(!this.hostLinks())return undefined
    const now=this.store.clock()
    return signGrant(this.config.hostLinkKey!,{kind:'invite',id:invite.id,slots:invite.max_uses,inviteExpires:invite.expires,expires:Math.min(invite.expires,now+3600000)})
  }
  private hostLinks(){return !!this.accountHost()&&!!linkKeyBytes(this.config.hostLinkKey)}
  /** Make one invitation link: 1 to 30 days, 1 to 20 uses. The code is shown once; only its hash is kept. */
  createInvitation(issuerId:string,days:unknown=7,uses:unknown=1){
    if(!Number.isInteger(days)||Number(days)<1||Number(days)>30)throw new Fault(400,'Choose 1 to 30 days')
    if(!Number.isInteger(uses)||Number(uses)<1||Number(uses)>20)throw new Fault(400,'Choose 1 to 20 uses')
    const invitation=token(),id=crypto.randomUUID(),now=this.store.clock(),expires=now+Number(days)*86400000
    this.store.tx(()=>{
      const active=this.store.get<{n:number}>('SELECT count(*) n FROM enrollment_invitations WHERE revoked=0 AND uses<max_uses AND expires>?',now)!.n
      if(active>=50)throw new Fault(429,'Revoke an unused invitation before creating another')
      this.store.run('INSERT INTO enrollment_invitations(id,hash,issuer_id,created,expires,max_uses) VALUES(?,?,?,?,?,?)',id,hash(invitation),issuerId,now,expires,Number(uses))
      this.store.audit(issuerId,'enrollment.invite.create',id)
    })
    return {id,invitation,expires,maxUses:Number(uses),url:this.inviteUrl(invitation)}
  }
  /** Requests for an invitation: one budget per address per hour, and a ceiling on the whole queue. */
  private requestLimit(request:Request){
    const window=Math.floor(this.store.clock()/3600000),key=hash('request:'+window+':'+(request.headers.get('cf-connecting-ip')??'local'))
    this.store.run('DELETE FROM invite_request_buckets WHERE window<?',window)
    const count=this.store.get<{count:number}>('SELECT count FROM invite_request_buckets WHERE key=?',key)?.count??0
    if(count>=3)throw new Fault(429,'Terlalu banyak permintaan dari jaringan ini. Coba lagi dalam satu jam.')
    const pending=this.store.get<{n:number}>("SELECT count(*) n FROM invite_requests WHERE state='pending'")!.n
    if(pending>=300)throw new Fault(429,'Antrean permintaan sedang penuh. Coba lagi besok.')
    this.store.run('INSERT INTO invite_request_buckets VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1',key,window)
  }
  private steward(request:Request){
    this.writeGuard(request);const current=this.session(request)!
    if(current.actor.did!==this.config.stewardDid)throw new Fault(403,'Node steward required')
    return current
  }
  /** Reads need the steward's session only: a browser sends no Origin or confirmation header on a plain GET,
   * and the session cookie (SameSite=Lax) is not sent with another site's fetch. */
  private readSteward(request:Request){
    const current=this.session(request)
    if(!current)throw new Fault(401,'Authentication required')
    if(current.actor.did!==this.config.stewardDid)throw new Fault(403,'Node steward required')
    return current
  }
  private session(request:Request){
    const sid=cookie(request,SESSION_COOKIE)
    if(!/^[A-Za-z0-9_-]{43}$/.test(sid))return undefined
    const session=this.store.get<BrowserSession>('SELECT * FROM browser_sessions WHERE hash=? AND revoked=0 AND expires>?',hash(sid),this.store.clock())
    if(!session)return undefined
    const actor=this.store.actor(session.actor_id)
    return this.allowed(actor.did)?{session,actor}:undefined
  }
  principal(request:Request):Actor|undefined{
    // Production never accepts local fixture bearer credentials.
    if(request.headers.has('authorization'))throw new Fault(401,'Use the application session')
    return this.session(request)?.actor
  }
  writeGuard(request:Request){
    if(request.headers.get('origin')!==this.config.origin)throw new Fault(403,'Origin not allowed')
    const current=this.session(request)
    if(!current)throw new Fault(401,'Authentication required')
    // x-strata-csrf: the header's name before the rename, still sent by a page loaded from the previous release.
    if(!equal(request.headers.get('x-etnos-csrf')??request.headers.get('x-strata-csrf')??'',current.session.csrf))throw new Fault(403,'Request confirmation required')
  }
  private limit(request:Request){
    const window=Math.floor(this.store.clock()/600000),key=hash('auth:'+window+':'+(request.headers.get('cf-connecting-ip')??'local'))
    this.store.tx(()=>{
      this.store.run('DELETE FROM auth_buckets WHERE window<?',window-1)
      const total=this.store.get<{count:number}>('SELECT sum(count) AS count FROM auth_buckets WHERE window=?',window)?.count??0
      if(total>=100)throw new Fault(429,'Sign-in is busy; try later')
      const count=this.store.get<{count:number}>('SELECT count FROM auth_buckets WHERE key=?',key)?.count??0
      if(count>=10)throw new Fault(429,'Too many sign-in attempts; try later')
      this.store.run('INSERT INTO auth_buckets VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1',key,window)
    })
  }
  async route(request:Request):Promise<Response|undefined>{
    const path=new URL(request.url).pathname
    if(path==='/oauth/client-metadata.json' && request.method==='GET')return json(200,this.client.clientMetadata)
    if(path==='/oauth/jwks.json' && request.method==='GET')return json(200,this.client.jwks)
    if(!path.startsWith('/auth/'))return undefined
    try{
      if(path==='/auth/options' && request.method==='GET')return json(200,{provider:'bluesky',enrollment:this.config.stewardDid?this.enrollmentMode():'closed',accountHost:this.accountHost()??null,hostInvites:this.hostLinks()})
      // The /gabung page asks whether its link still works before showing the ways to join. Nothing else is told.
      if(path==='/auth/invite-check' && request.method==='POST'){
        if(request.headers.get('origin')!==this.config.origin)throw new Fault(403,'Origin not allowed')
        this.limit(request)
        const body=await readBody(request,1000)
        if(typeof body.invitation!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.invitation))return json(200,{valid:false})
        try{const invite=this.invite(hash(body.invitation));return json(200,{valid:true,expires:invite.expires})}catch{return json(200,{valid:false})}
      }
      if(path==='/auth/invite-requests' && request.method==='POST'){
        if(request.headers.get('origin')!==this.config.origin)throw new Fault(403,'Origin not allowed')
        if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new Fault(415,'JSON required')
        if(this.enrollmentMode()==='open')throw new Fault(409,'Pendaftaran sedang terbuka. Kamu bisa langsung bergabung.')
        const body=await readBody(request,4000)
        const name=plain(body.name,80),contact=plain(body.contact,160),reason=plain(body.reason,600)
        if(!name||!contact)throw new Fault(400,'Isi nama dan cara menghubungimu.')
        // An optional browser subscription, used once to say that the request was approved.
        let push:PushInput|undefined
        if(this.config.pushEnabled&&body.push!==undefined){try{push=pushInput(body.push)}catch{push=undefined}}
        const id=crypto.randomUUID()
        this.store.tx(()=>{
          this.requestLimit(request)
          this.store.run('INSERT INTO invite_requests(id,name,contact,reason,created) VALUES(?,?,?,?,?)',id,name,contact,reason,this.store.clock())
        })
        if(push)this.push.subscribe({requestId:id},push)
        return json(200,{ok:true,notify:!!push})
      }
      if(path==='/auth/invite-requests' && request.method==='GET'){
        this.readSteward(request)
        // Decided requests leave the queue after 30 days.
        this.store.run("DELETE FROM invite_requests WHERE state='approved' AND decided<?",this.store.clock()-30*86400000)
        this.store.run('DELETE FROM push_subscriptions WHERE request_id IS NOT NULL AND request_id NOT IN (SELECT id FROM invite_requests)')
        return json(200,{requests:this.store.all<InviteRequest>("SELECT id,name,contact,reason,created,state,decided,invitation_id FROM invite_requests ORDER BY state='approved',created DESC LIMIT 200")})
      }
      const decide=/^\/auth\/invite-requests\/([0-9a-f-]{36})\/(approve|decline)$/.exec(path)
      if(decide && request.method==='POST'){
        const current=this.steward(request),[,id,action]=decide
        const row=this.store.get<InviteRequest>('SELECT * FROM invite_requests WHERE id=?',id)
        if(!row)throw new Fault(404,'Permintaan tidak ditemukan.')
        if(action==='decline'){
          this.store.tx(()=>{this.push.forgetRequest(id);this.store.run('DELETE FROM invite_requests WHERE id=?',id);this.store.audit(current.actor.id,'enrollment.request.decline',id)})
          return json(200,{removed:true})
        }
        if(row.state!=='pending')throw new Fault(409,'Permintaan ini sudah disetujui.')
        const made=this.createInvitation(current.actor.id,14,1)
        this.store.tx(()=>{
          this.store.run("UPDATE invite_requests SET state='approved',decided=?,invitation_id=? WHERE id=? AND state='pending'",this.store.clock(),made.id,id)
          this.store.audit(current.actor.id,'enrollment.request.approve',id)
          this.push.queueInviteApproved(id)
        })
        return json(200,made)
      }
      if(path==='/auth/me' && request.method==='GET'){
        const current=this.session(request)
        return json(200,current?{actor:{id:current.actor.id,did:current.actor.did,name:current.actor.name,kind:current.actor.kind},csrf:current.session.csrf,expires:current.session.expires,steward:current.actor.did===this.config.stewardDid}:{actor:null,csrf:null,steward:false})
      }
      if(path==='/auth/start' && request.method==='POST'){
        if(request.headers.get('origin')!==this.config.origin)throw new Fault(403,'Origin not allowed')
        this.limit(request);this.records.cleanup()
        if(!this.config.stewardDid)throw new Fault(503,'Steward identity has not been configured')
        if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new Fault(415,'JSON required')
        const body=await readBody(request,1000)
        const context:FlowContext={browser:'',returnTo:returnPath(body.returnTo)}
        let target:string
        if(body.mode==='signup'){
          if(this.enrollmentMode()==='closed')throw new Fault(403,'Registration is closed')
          this.enrollmentSteward()
          if(typeof body.invitation==='string' && body.invitation){
            if(!/^[A-Za-z0-9_-]{43}$/.test(body.invitation))throw new Fault(403,'Invitation is invalid, expired or already used')
            context.inviteHash=hash(body.invitation);this.invite(context.inviteHash);context.enroll='invite'
          }else{
            if(this.enrollmentMode()!=='open')throw new Fault(403,'An ETNOS invitation code is required')
            context.enroll='open'
          }
          if(typeof body.handle==='string' && body.handle){
            // An account that already exists (for example one just created on the
            // node's own identity host) enrolls with this invitation.
            if(body.handle.length>253||!body.handle.includes('.'))throw new Fault(400,'Enter your full AT handle')
            const identity=await this.client.identityResolver.resolve(body.handle)
            context.did=identity.did;target=identity.did
          }else if(body.provider==='host'){
            // The node's own identity host, configured, never taken from request input.
            const host=this.accountHost()
            if(!host)throw new Fault(400,'This node has no account host')
            target=host
          }else{
            // A fixed provider, not an arbitrary discovery URL from request input.
            // Its OAuth UI offers account creation and existing-account sign-in.
            target='https://bsky.social'
          }
        }else{
          if(body.mode!==undefined && body.mode!=='login')throw new Fault(400,'Invalid sign-in mode')
          if(typeof body.handle!=='string'||body.handle.length>253||!body.handle.includes('.'))throw new Fault(400,'Enter your full AT handle')
          const identity=await this.client.identityResolver.resolve(body.handle)
          // An account made on this node's own identity host already passed that host's invitation, so it enrolls
          // on first sign-in. Accounts elsewhere still need an ETNOS invitation through sign-up.
          if(!this.allowed(identity.did)){
            if(this.enrollmentMode()==='closed'||!this.onOwnHost(identity.didDoc))throw new Fault(403,'Join ETNOS first to enroll this account')
            context.enroll='host'
          }
          context.did=identity.did;target=identity.did
        }
        const flow=token(),scope=body.mode!=='signup' && body.publishing===true && this.config.publishingEnabled?this.client.clientMetadata.scope:'atproto'
        context.browser=hash(flow)
        // On the node's own host, a sign-up opens the host's sign-up page instead of its sign-in page.
        const url=await this.client.authorize(target,{state:JSON.stringify(context),scope,...(body.mode==='signup'&&body.provider==='host'&&!body.handle?{prompt:'create' as const}:{})})
        // On the node's own host, the same invitation link also makes the account there: the host's sign-up form
        // receives a signed grant for this invitation in place of its own invite code (packages/pds link-grant.ts).
        if(body.mode==='signup'&&body.provider==='host'&&!body.handle&&context.inviteHash){
          const grant=await this.hostGrant(this.invite(context.inviteHash))
          if(grant)url.searchParams.set('kode',grant)
        }
        const response=json(200,{authorizationUrl:url.href});response.headers.append('set-cookie',setCookie(FLOW_COOKIE,flow,600));return response
      }
      if(path==='/auth/callback' && request.method==='GET'){
        const params=new URL(request.url).searchParams,state=params.get('state'),flow=cookie(request,FLOW_COOKIE)
        if(!state||state.length>200||!flow)throw new Fault(400,'Sign-in session expired')
        const saved=await this.records.get<NodeSavedState>('state',state)
        if(!saved?.appState)throw new Fault(403,'Sign-in confirmation failed')
        const context=flowContext(saved.appState)
        if(!equal(context.browser,hash(flow)))throw new Fault(403,'Sign-in confirmation failed')
        const {session}=await this.client.callback(params)
        let sid:string,actor:Actor
        try{
          if(context.did && context.did!==session.did)throw new Fault(403,'Account did not match sign-in')
          const identity=await this.client.identityResolver.resolve(session.did)
          sid=token();const csrf=token(),now=this.store.clock()
          actor=this.store.tx(()=>{
            // Recheck enrollment after ALL discovery/token I/O, in the same
            // transaction that consumes the invite and creates the local session.
            let invitation:EnrollmentInvite|undefined
            if(context.enroll){
              if(this.enrollmentMode()==='closed')throw new Fault(403,'Registration is closed')
              if(context.enroll==='invite')invitation=this.invite(context.inviteHash??'')
              else if(context.enroll==='host'){if(!this.onOwnHost(identity.didDoc))throw new Fault(403,'Join ETNOS first to enroll this account')}
              else if(this.enrollmentMode()!=='open')throw new Fault(403,'Registration now requires an invitation')
            }else if(!this.allowed(session.did))throw new Fault(403,'Enrollment is by invitation')
            let person=this.store.get<Actor>('SELECT * FROM actors WHERE did=?',session.did)
            // Existing enrollment removal must not become self-reversible simply
            // because new-account registration is open. A steward can reinstate.
            if(person && !this.allowed(session.did) && (context.enroll==='open'||context.enroll==='host'))throw new Fault(403,'Account enrollment is inactive; contact the steward')
            if(!person){const id=crypto.randomUUID();this.store.run("INSERT INTO actors VALUES(?,?,?,'human',NULL)",id,session.did,identity.handle);person=this.store.actor(id)}
            if(person.kind!=='human')throw new Fault(403,'Service actors cannot use human enrollment')
            if(!this.allowed(session.did)){
              const steward=this.enrollmentSteward()
              this.store.run('INSERT INTO enrollment_allowlist VALUES(?,?)',session.did,steward.id)
              if(invitation){
                this.store.run('UPDATE enrollment_invitations SET uses=uses+1,used_by=COALESCE(used_by,?),used_at=? WHERE id=?',person.id,now,invitation.id)
                this.store.run('INSERT OR IGNORE INTO enrollment_invitation_uses VALUES(?,?,?)',invitation.id,person.id,now)
              }
              this.store.audit(person.id,'enrollment.join',person.id)
            }
            this.store.run('UPDATE browser_sessions SET revoked=1 WHERE actor_id=?',person.id)
            this.store.run('INSERT INTO browser_sessions VALUES(?,?,?,?,?,0)',hash(sid),person.id,csrf,now,now+86400000)
            this.store.audit(person.id,'session.open',person.id);return person
          })
        }catch(error){
          // A provider may already have created the account. Revoke this app's
          // grant on failed local enrollment; never retry remote account creation.
          try{await this.client.revoke(session.did)}catch{/* Local denial still applies. */}
          this.records.del('session',session.did);throw error
        }
        if(actor.did===this.config.stewardDid)this.bootstrap(actor.id)
        this.joinDefaultSquare(actor.id)
        const response=new Response(null,{status:303,headers:{location:returnPath(context.returnTo), 'cache-control':'no-store','referrer-policy':'no-referrer'}})
        response.headers.append('set-cookie',setCookie(SESSION_COOKIE,sid,86400));response.headers.append('set-cookie',setCookie(FLOW_COOKIE,'',0));return response
      }
      if(path==='/auth/logout' && request.method==='POST'){
        this.writeGuard(request);const current=this.session(request)!
        this.store.run('UPDATE browser_sessions SET revoked=1 WHERE hash=?',current.session.hash)
        try{await this.client.revoke(current.actor.did)}catch{/* Local revocation applies even while the provider is offline. */}
        this.records.del('session',current.actor.did)
        const response=json(200,{ok:true});response.headers.append('set-cookie',setCookie(SESSION_COOKIE,'',0));return response
      }
      if(path==='/auth/invite' && request.method==='POST'){
        this.writeGuard(request);const current=this.session(request)!
        if(current.actor.did!==this.config.stewardDid)throw new Fault(403,'Node steward required')
        const body=await readBody(request,1000)
        if(typeof body.handle!=='string'||body.handle.length>253)throw new Fault(400,'Full AT handle required')
        const identity=await this.client.identityResolver.resolve(body.handle)
        // Recheck local session after discovery I/O; invitation grants enrollment,
        // never community or institutional permissions.
        this.writeGuard(request)
        this.store.tx(()=>{this.store.run('INSERT OR IGNORE INTO enrollment_allowlist VALUES(?,?)',identity.did,current.actor.id);this.store.audit(current.actor.id,'enrollment.invite',identity.did)})
        return json(200,{handle:identity.handle,did:identity.did})
      }
      // A one-time password reset link for a person on the node's own identity host who lost the recovery code.
      // The host checks the signature, the account and that the link is used once (packages/pds link-grant.ts).
      if(path==='/auth/host-reset-links' && request.method==='POST'){
        const current=this.steward(request)
        if(!this.hostLinks())throw new Fault(409,'Tautan pemulihan memerlukan kunci bersama dengan server akun.')
        const body=await readBody(request,1000)
        const handle=typeof body.handle==='string'?body.handle.trim().toLowerCase().replace(/^@/,''):''
        if(!/^[a-z0-9.-]{3,253}$/.test(handle)||!handle.includes('.'))throw new Fault(400,'Tulis nama akun lengkap, misalnya nama.etnos.space.')
        const id=crypto.randomUUID(),expires=this.store.clock()+86400000
        const grant=await signGrant(this.config.hostLinkKey!,{kind:'reset',id,handle,expires})
        this.store.audit(current.actor.id,'account.reset-link',handle)
        return json(200,{url:this.accountHost()+'/akun/pulihkan?tautan='+grant,expires,handle})
      }
      if(path==='/auth/enrollment-invites' || /^\/auth\/enrollment-invites\/[0-9a-f-]{36}\/revoke$/.test(path)){
        const current=request.method==='GET'?this.readSteward(request):this.steward(request)
        if(path==='/auth/enrollment-invites' && request.method==='GET')return json(200,{invitations:this.store.all('SELECT id,created,expires,revoked,used_at,uses,max_uses AS maxUses FROM enrollment_invitations ORDER BY created DESC,id DESC LIMIT 50')})
        if(request.method!=='POST')throw new Fault(405,'Method not allowed')
        const body=await readBody(request,1000);this.writeGuard(request)
        if(path.endsWith('/revoke')){
          const id=path.split('/')[3]
          this.store.tx(()=>{this.store.run('UPDATE enrollment_invitations SET revoked=1 WHERE id=?',id);this.store.audit(current.actor.id,'enrollment.invite.revoke',id)})
          return json(200,{ok:true})
        }
        return json(200,this.createInvitation(current.actor.id,body.days??7,body.uses??1))
      }
      throw new Fault(404,'Not found')
    }catch(error){
      if(path==='/auth/callback')return new Response(null,{status:303,headers:{location:'/login?error=authentication_failed','cache-control':'no-store','referrer-policy':'no-referrer','set-cookie':setCookie(FLOW_COOKIE,'',0)}})
      return json(error instanceof Fault?error.status:400,{error:error instanceof Fault?error.message:'Sign-in could not be completed'})
    }
  }
  private syncBootstrappedSpaces(){
    const square=this.store.get<{community_id:string}>("SELECT community_id FROM starter_spaces WHERE slug='square'")
    if(!square)return
    const owner=this.store.get<{actor_id:string}>("SELECT actor_id FROM memberships WHERE community_id=? AND role='owner' AND active=1 LIMIT 1",square.community_id)
    if(owner)this.bootstrap(owner.actor_id)
  }
  private joinDefaultSquare(actorId:string){
    this.store.tx(()=>{
      const square=this.store.get<{community_id:string}>("SELECT s.community_id FROM starter_spaces s JOIN communities c ON c.id=s.community_id WHERE s.slug='square' AND c.visibility='public' AND c.admission='open' AND COALESCE(c.archived,0)=0")
      if(!square)return
      if(this.store.get('SELECT 1 FROM memberships WHERE community_id=? AND actor_id=?',square.community_id,actorId))return
      this.store.run("INSERT INTO memberships VALUES(?,?,'member',1)",square.community_id,actorId)
      this.store.audit(actorId,'community.auto_join',square.community_id)
    })
  }
  private bootstrap(actorId:string){
    const spaces=[
      ['square','Alun-Alun','Percakapan sehari-hari dan ruang umum untuk semua anggota.'],
      ['questions','Tanya & Bantu','Pertanyaan umum, saling bantu, dan penjelasan sederhana untuk pemula.'],
      ['ama','Tanya Langsung','Sesi tanya jawab langsung bersama narasumber, praktisi, dan tokoh lapangan.'],
      ['opportunities','Peluang & Karier','Beasiswa, lowongan kerja, pelatihan, dan kesempatan kolaborasi.'],
      ['creative','Karya & Kreatif','Musik, foto, tulisan, desain, dan proyek buatan anggota.'],
      ['notices','Kabar & Diskusi','Berita daerah, kegiatan, dan diskusi isu terkini di Tanah Papua.'],
      ['market','Pasar & Titip','Produk lokal, jasa, barang bekas, dan titip barang antarkota.'],
    ]
    for(const[slug,title,description]of spaces)this.store.tx(()=>{
      if(this.store.get('SELECT 1 FROM starter_spaces WHERE slug=?',slug))return
      const id=crypto.randomUUID()
      this.store.run("INSERT INTO communities(id,title,description,visibility,automation,admission,publication) VALUES(?,?,?,'public',0,'open','local')",id,title,description)
      this.store.run("INSERT INTO memberships VALUES(?,?,'owner',1)",id,actorId)
      this.store.run('INSERT INTO starter_spaces VALUES(?,?)',slug,id);this.store.audit(actorId,'community.bootstrap',id)
    })
  }
  operatorAllowed(actorId:string){return this.allowed(this.store.actor(actorId).did)}
  async agent(request:Request){
    this.writeGuard(request);const actor=this.principal(request)
    if(!actor)throw new Fault(401,'Authentication required')
    return new Agent(await this.client.restore(actor.did))
  }
}
