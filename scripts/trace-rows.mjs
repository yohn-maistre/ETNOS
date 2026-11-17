// Lists SQL statements reading or writing 50+ rows for common routes at showcase scale.
// Usage: npm run test:worker (builds the harness), then node scripts/trace-rows.mjs
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
const origin='https://strata.example'
const mf=new Miniflare(convertV4MiniflareOptions({name:'t',modules:true,scriptPath:'.wrangler/test/worker-harness.js',compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],bindings:{STRATA_ORIGIN:origin,STRATA_NODE:'load'},durableObjects:{STRATA:{className:'TestNode',useSQLite:true}}}))
const stub=(await mf.getDurableObjectNamespace('STRATA')).getByName('load')
const seed=JSON.parse(await stub.seedScale(30,200,2000)),u=seed.users[0],root=seed.roots[5],room=seed.rootRooms[5]
const wiki=await(await mf.dispatchFetch(origin+'/v1/wiki')).json()
for(const [label,path,body] of [['vote',`/v1/posts/${root}/vote`,{value:1}],['post','/v1/posts',{communityId:room,text:'x'}],['replies',`/v1/posts/${root}/replies`],['feed','/v1/feed/page?roots=true&limit=30'],['notifications','/v1/notifications'],['wiki','/v1/wiki'],['memberships','/v1/memberships'],['search','/v1/search?q=sintetis'],['history',`/v1/wiki/${wiki[0].id}/history`]]){
  console.log('\n##',label);for(const s of JSON.parse(await stub.traceRequest(path,u.token,body)))console.log(String(s.read).padStart(6),String(s.written).padStart(4),s.sql)}
await mf.dispose()
