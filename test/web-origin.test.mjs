import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
const canonical='https://etnos.space', legacy='https://strata-preview.giyaibo.workers.dev'
test('actual web Worker: canonical API, recovery-only legacy surface, no legacy writes or callback credential forwarding',async()=>{
 const newsRequests=[]
 const mf=new Miniflare(convertV4MiniflareOptions({name:'strata-origin-test-only',modules:true,scriptPath:'.wrangler/web-test/web-worker.js',compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],bindings:{STRATA_ORIGIN:canonical,STRATA_NODE:'test-only',STRATA_AUTH_MODE:'atproto',STRATA_OAUTH_HOSTS:'bsky.social',STRATA_STEWARD_DID:'',STRATA_PUBLISHING_ENABLED:'false',STRATA_COLLECTION:'org.example.strata.post'},durableObjects:{STRATA:{className:'StrataNode',useSQLite:true}},serviceBindings:{WATCH_NEWS:async req=>{newsRequests.push({url:req.url,cookie:req.headers.get('cookie'),authorization:req.headers.get('authorization')});return Response.json({items:[{id:42,title:{id:'Synthetic public news'},source_count:1}]})},ASSETS:async()=>new Response('<html>recovery fixture</html>',{headers:{'content-type':'text/html'}})}}))
 try {
  const fetch=(url,init)=>mf.dispatchFetch(url,{redirect:'manual',...init})
  assert.equal((await fetch(canonical+'/health')).status,200)
  const news=await fetch(canonical+'/v1/news?privateQuery=never-forward',{headers:{cookie:'private-cookie',authorization:'Bearer never-forward'}})
  assert.equal(news.status,200);assert.equal((await news.json()).items[0].title,'Synthetic public news')
  assert.deepEqual(newsRequests,[{url:'https://watch.internal/current?limit=12',cookie:null,authorization:null}])
  assert.equal((await fetch('https://evil.example/health')).status,400)
  const moved=await fetch(legacy+'/explore?q=mee');assert.equal(moved.status,302);assert.equal(moved.headers.get('location'),canonical+'/explore?q=mee')
  const callback=await fetch(legacy+'/auth/callback?code=secret-code&state=secret-state');assert.equal(callback.headers.get('location'),canonical+'/login');assert.equal(callback.headers.get('referrer-policy'),'no-referrer')
  const write=await fetch(legacy+'/v1/posts',{method:'POST',body:'{}'});assert.equal(write.status,405);assert.equal(write.headers.has('location'),false)
  const recovery=await fetch(legacy+'/recover-messages');assert.equal(recovery.status,200);assert.match(recovery.headers.get('content-security-policy'),/connect-src 'none'/);assert.equal(recovery.headers.get('cache-control'),'no-store')
  assert.equal((await fetch(legacy+'/assets/recovery-abcd.js')).status,200)
  assert.equal((await fetch(legacy+'/unknown-recovery')).status,302)
 }finally{await mf.dispose()}
})
