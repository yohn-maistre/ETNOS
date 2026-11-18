export type SqlUsage={statements:number;rowsRead:number;rowsWritten:number}

/**
 * Free-tier metering for one node.
 *
 * Every request and alarm adds its SQL rows read and written to a daily total.
 * Totals are kept in memory and saved to the Durable Object's key-value store
 * at most once every five minutes, so metering costs about 300 writes a day.
 * One log line per request carries only the route shape (ids and queries
 * removed), the status, wall time and rows. No actor, content or query text.
 */

export const FREE_TIER={requests:100000,rowsRead:5000000,rowsWritten:100000} as const

const WORDS=new Set(('accept actors admit agents aliases ambient approve auth bookmark bookmarks cancel capabilities catalogue choices close clustering '+
  'communities config confirm contacts contexts decide delete deployments desk device discover discovery dm drafts edit editorial-mandates feed follow following '+
  'gaps grants group-memberships groups growing hide history image invitations items jobs join knowledge link-preview mandates me media members '+
  'memberships messages moderate moderation news notifications oauth offerings ops outbox page parents people poll posts profile promote proposals '+
  'publish quakes read refresh reject related releases replies report reports request-sponsorship requests resident resume review revoke '+
  'revoke-invitations rsvp run runs search settings setup shelf sitewide snapshot sources spaces sponsorship start state studio suggestions suspend '+
  'switch threads time timeline topics trail usage v1 video-preview vimeo vote wiki wiki-live wiki-policy wiki-proposals wiki-revisions '+
  'wiki-unreviewed withdraw work work-consent work-grants work-results youtube callback login logout client-metadata.json jwks.json health').split(' '))

/** "/v1/communities/abc/posts?x=1" → "/v1/communities/:id/posts". Never keeps ids, slugs or queries. */
export function routeShape(pathname:string){
  const parts=pathname.split('/').filter(Boolean).slice(0,5)
  return '/'+parts.map(p=>WORDS.has(p)?p:':id').join('/')
}

type Totals={requests:number;alarms:number;rowsRead:number;rowsWritten:number;statements:number;errors:number;routes:Record<string,{n:number;read:number;written:number}>}
const empty=():Totals=>({requests:0,alarms:0,rowsRead:0,rowsWritten:0,statements:0,errors:0,routes:{}})
type Kv={get<T>(key:string):T|undefined;put<T>(key:string,value:T):void;list<T>(options?:{prefix?:string}):Iterable<[string,T]>}
export type Mark={t:number;read:number;written:number;statements:number}

export class Meter{
  private day=''
  private totals=empty()
  private saved=0
  private seen={read:0,written:0,statements:0}
  private usage:SqlUsage
  private kv:Kv|undefined
  private clock:()=>number
  private log:(line:string)=>void
  constructor(usage:SqlUsage,kv:Kv|undefined,clock:()=>number,log:(line:string)=>void=line=>console.log(line)){this.usage=usage;this.kv=kv;this.clock=clock;this.log=log}
  start():Mark{return {t:this.clock(),read:this.usage.rowsRead,written:this.usage.rowsWritten,statements:this.usage.statements}}
  finish(mark:Mark,method:string,route:string,status:number){
    const read=this.usage.rowsRead-mark.read,written=this.usage.rowsWritten-mark.written,statements=this.usage.statements-mark.statements,now=this.clock()
    this.log(JSON.stringify({event:'strata.request',method,route,status,ms:now-mark.t,rowsRead:read,rowsWritten:written,statements}))
    const day=new Date(now).toISOString().slice(0,10)
    if(day!==this.day){this.save(true);this.day=day;this.totals=this.load(day)}
    const t=this.totals
    if(method==='ALARM')t.alarms++;else t.requests++
    if(status>=500)t.errors++
    // Daily totals come from the global counters: requests interleave inside the
    // node, so summing per-request deltas would count shared rows twice. The
    // per-route split below is approximate under concurrency for the same reason.
    t.rowsRead+=this.usage.rowsRead-this.seen.read;t.rowsWritten+=this.usage.rowsWritten-this.seen.written;t.statements+=this.usage.statements-this.seen.statements
    this.seen={read:this.usage.rowsRead,written:this.usage.rowsWritten,statements:this.usage.statements}
    const key=method+' '+route,r=t.routes[key]??={n:0,read:0,written:0}
    r.n++;r.read+=read;r.written+=written
    if(now-this.saved>=300000)this.save()
  }
  private load(day:string){try{return this.kv?.get<Totals>('usage:'+day)??empty()}catch{return empty()}}
  private save(force=false){
    if(!this.day||!this.kv)return
    if(!force&&this.clock()-this.saved<300000)return
    try{this.kv.put('usage:'+this.day,this.totals);this.saved=this.clock()}catch{/* metering must never break a request */}
  }
  /** Last 14 days, today first, with each total as a share of the Workers Free daily limit. */
  report(){
    this.save(true)
    const days:[string,Totals][]=[]
    try{for(const [key,value] of this.kv?.list<Totals>({prefix:'usage:'})??[])days.push([key.slice(6),value])}catch{/* empty report */}
    if(this.day&&!days.some(([d])=>d===this.day))days.push([this.day,this.totals])
    days.sort((a,b)=>b[0].localeCompare(a[0]))
    const share=(n:number,limit:number)=>Math.round(n/limit*1000)/10
    return {limits:FREE_TIER,note:'Durable Object requests and SQL rows only. Worker CPU time and static files are not counted here.',
      days:days.slice(0,14).map(([day,t])=>({day,requests:t.requests,alarms:t.alarms,errors:t.errors,rowsRead:t.rowsRead,rowsWritten:t.rowsWritten,
        percent:{requests:share(t.requests+t.alarms,FREE_TIER.requests),rowsRead:share(t.rowsRead,FREE_TIER.rowsRead),rowsWritten:share(t.rowsWritten,FREE_TIER.rowsWritten)},
        heaviest:Object.entries(t.routes).sort((a,b)=>b[1].read-a[1].read).slice(0,12).map(([route,r])=>({route,...r}))}))}
  }
}
