// One simulated day for N people against real workerd SQLite, metered by the node.
// Usage: npm run test:worker (builds the harness), then
//   node scripts/load-day.mjs [people=30] [wikiPages=200] [posts=2000]
// Prints requests and SQL rows against the Workers Free daily limits.
// The day is deliberately heavy: everyone is an active participant.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const args=process.argv.slice(2),oldClient=args.includes('--old-client'),[people=30,pages=200,posts=2000]=args.filter(a=>!a.startsWith('--')).map(Number)
const origin='https://strata.example'
const dir=await mkdtemp(join(tmpdir(),'strata-load-'))
const mf=new Miniflare(convertV4MiniflareOptions({name:'strata-load-only',modules:true,scriptPath:'.wrangler/test/worker-harness.js',
  compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],bindings:{STRATA_ORIGIN:origin,STRATA_NODE:'load'},
  durableObjects:{STRATA:{className:'TestNode',useSQLite:true}},resourcePersistencePath:dir}))
let requests=0
const call=async(path,token,body)=>{requests++;const r=await mf.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',
  headers:{...(token?{authorization:`Bearer ${token}`}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();return {status:r.status,json:async()=>JSON.parse(text)}}
try{
  const ns=await mf.getDurableObjectNamespace('STRATA'),stub=ns.getByName('load')
  const t0=Date.now(),seed=JSON.parse(await stub.seedScale(people,pages,posts));if(seed.error)throw new Error(seed.error)
  console.log('seeded',seed.counts,'in',Date.now()-t0,'ms')
  const wiki=await(await mf.dispatchFetch(origin+'/v1/wiki')).json()
  const before=(await(await call('/v1/ops/usage')).json()).days[0]??{requests:0,rowsRead:0,rowsWritten:0}
  // Every screen in the web app runs load(): these eight calls, then the page's own reads.
  // Calls run one at a time so each request's rows are its own (the node interleaves concurrent requests).
  // New client (default): shared lists about once a minute (every third screen) and after a write;
  // the feed only on screens that show it. --old-client: every screen reloads all eight.
  let screens=0,dirty=true
  const screen=async(token,feed,extra=[])=>{
    const shared=oldClient||dirty||screens++%3===0;dirty=false
    await call('/auth/me',token)
    if(shared)for(const p of ['/v1/communities','/v1/wiki','/v1/memberships','/v1/capabilities','/v1/following','/v1/notifications'])await call(p,token)
    if(oldClient||feed)await call('/v1/feed/page?'+(feed||'roots=true&limit=30'),token)
    for(const p of extra)await call(p,token)}
  const write=async(...a)=>{dirty=true;return call(...a)}
  const day=async(u,i)=>{
    for(let visit=0;visit<6;visit++){
      const room=seed.rooms[(i+visit)%5],ri=(i*13+visit*7)%seed.roots.length,root=seed.roots[ri],rootRoom=seed.rootRooms[ri],page=wiki[(i*5+visit)%wiki.length]
      await screen(u.token,'roots=true&limit=30')
      await screen(u.token,'roots=true&limit=30&community='+room)
      await screen(u.token,'roots=true&limit=30&following=true')
      for(let k=0;k<3;k++){const id=seed.roots[(i*31+visit*11+k*17)%seed.roots.length];await screen(u.token,'',['/v1/posts/'+id,'/v1/posts/'+id+'/replies'])}
      for(let k=0;k<2;k++){const p=wiki[(i*3+visit*5+k)%wiki.length];await screen(u.token,'',['/v1/wiki/'+p.id,'/v1/wiki/'+p.id+'/history'])}
      await screen(u.token,'q=sintetis&roots=true&limit=30',['/v1/search?q=sintetis'])
      // Writes across the day: 3 posts, 6 replies, 15 votes, 2 bookmarks.
      if(visit<3)await write('/v1/posts',u.token,{communityId:room,text:'Pos peserta '+i+' kunjungan '+visit})
      await write('/v1/posts',u.token,{communityId:rootRoom,text:'Balasan '+i+'-'+visit,parentId:root})
      for(let k=0;k<(visit<3?3:2);k++)await write(`/v1/posts/${seed.roots[(i*7+visit*3+k)%seed.roots.length]}/vote`,u.token,{value:1})
      if(visit<2)await write(`/v1/posts/${root}/bookmark`,u.token,{save:true})
      void page
    }
  }
  const t1=Date.now();for(const [i,u] of seed.users.entries())await day(u,i)
  const report=(await(await call('/v1/ops/usage')).json()),today=report.days[0]
  const used={requests:today.requests-before.requests,rowsRead:today.rowsRead-before.rowsRead,rowsWritten:today.rowsWritten-before.rowsWritten}
  const pct=(n,l)=>(n/l*100).toFixed(1)+'%'
  console.log(`\n${people} people, one heavy day, ${oldClient?'old':'new'} client, ${Date.now()-t1} ms wall`)
  console.log('Durable Object requests',used.requests,pct(used.requests,report.limits.requests),'(Worker requests about the same plus page loads)')
  console.log('SQL rows read          ',used.rowsRead,pct(used.rowsRead,report.limits.rowsRead))
  console.log('SQL rows written       ',used.rowsWritten,pct(used.rowsWritten,report.limits.rowsWritten))
  console.log('errors (5xx)           ',today.errors)
  console.log('\nheaviest routes by rows read');for(const r of today.heaviest)console.log(String(r.read).padStart(10),String(r.n).padStart(6),'calls',String(Math.round(r.read/r.n)).padStart(6),'rows/call',r.route)
}finally{await mf.dispose();await rm(dir,{recursive:true,force:true})}
