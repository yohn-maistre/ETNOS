import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
const canonical='https://etnos.space', legacy='https://strata-preview.giyaibo.workers.dev'
test('actual web Worker: canonical API, recovery-only legacy surface, no legacy writes or callback credential forwarding',async()=>{
 const newsRequests=[], outbound=[]
 const mf=new Miniflare(convertV4MiniflareOptions({name:'strata-origin-test-only',modules:true,scriptPath:'.wrangler/web-test/web-worker.js',compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],bindings:{STRATA_ORIGIN:canonical,STRATA_NODE:'test-only',STRATA_AUTH_MODE:'atproto',STRATA_OAUTH_HOSTS:'bsky.social',STRATA_STEWARD_DID:'',STRATA_PUBLISHING_ENABLED:'false',STRATA_COLLECTION:'org.example.strata.post'},durableObjects:{STRATA:{className:'StrataNode',useSQLite:true}},outboundService:async req=>{outbound.push({url:req.url,cookie:req.headers.get('cookie'),authorization:req.headers.get('authorization')});if(new URL(req.url).hostname==='github.com')return new Response('<meta property="og:title" content="Runtime repository"><meta property="og:image" content="https://opengraph.githubassets.com/x">',{headers:{'content-type':'text/html'}});if(new URL(req.url).hostname==='opengraph.githubassets.com')return new Response(new Uint8Array([255,216,255,1]),{headers:{'content-type':'image/jpeg'}});if(new URL(req.url).hostname==='www.youtube.com')return Response.json({title:'Runtime video title'});if(['img.antaranews.com','i.ytimg.com'].includes(new URL(req.url).hostname))return new Response(new Uint8Array([255,216,255,1]),{headers:{'content-type':'image/jpeg'}});return new Response(null,{status:503})},serviceBindings:{WATCH_NEWS:async req=>{if(new URL(req.url).pathname==='/development/42')return Response.json({development:{id:42,status:'published',title_id:'Story',summary_id:'Summary'},articles:[{title:'Source',publisher:'ANTARA',canonical_url:'https://www.antaranews.com/story',image_url:'https://img.antaranews.com/image.jpg'}],places:[]});newsRequests.push({url:req.url,cookie:req.headers.get('cookie'),authorization:req.headers.get('authorization')});return Response.json({items:[{id:42,title:{id:new URL(req.url).searchParams.get('desk')||'Synthetic public news'},source_count:1}]})},ASSETS:async()=>new Response('<html><head><title>ETNOS</title><meta name="description" content="Generic"></head><body>recovery fixture</body></html>',{headers:{'content-type':'text/html'}})}}))
 try {
  const fetch=(url,init)=>mf.dispatchFetch(url,{redirect:'manual',...init})
  assert.equal((await fetch(canonical+'/health')).status,200)
  const news=await fetch(canonical+'/v1/news?privateQuery=never-forward',{headers:{cookie:'private-cookie',authorization:'Bearer never-forward'}})
  assert.equal(news.status,200);assert.equal((await news.json()).items[0].title,'Synthetic public news')
  assert.deepEqual(newsRequests,[{url:'https://watch.internal/current?limit=12',cookie:null,authorization:null}])
  const land=await fetch(canonical+'/v1/news?desk=land&limit=6&privateQuery=never-forward');assert.equal((await land.json()).items[0].title,'land')
  const politics=await fetch(canonical+'/v1/news?limit=6&desk=politics');assert.equal((await politics.json()).items[0].title,'politics')
  assert.equal(newsRequests.length,3);assert.ok(newsRequests.every(r=>!r.url.includes('never-forward')&&r.cookie===null&&r.authorization===null))
  const video=await fetch(canonical+'/v1/video-preview/youtube/ZWp5904RkJY',{headers:{cookie:'do-not-forward',authorization:'Bearer private'}});assert.equal(video.status,200);assert.equal((await video.json()).title,'Runtime video title')
  const cover=await fetch(canonical+'/v1/video-preview/youtube/ZWp5904RkJY/image');assert.equal(cover.status,200);assert.equal(cover.headers.get('content-type'),'image/jpeg')
  const photo=await fetch(canonical+'/v1/news/42/image',{headers:{cookie:'do-not-forward',authorization:'Bearer private'}});assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/jpeg')
  assert.equal(outbound.length,3);assert.ok(outbound.every(r=>r.cookie===null&&r.authorization===null));assert.ok(outbound[0].url.startsWith('https://www.youtube.com/oembed?'));assert.equal(outbound[1].url,'https://i.ytimg.com/vi/ZWp5904RkJY/hqdefault.jpg')
  const link=await fetch(canonical+'/v1/link-preview?url='+encodeURIComponent('https://github.com/example/repo?token=never-forward'),{headers:{cookie:'private',authorization:'Bearer private'}});assert.equal(link.status,200);assert.equal((await link.json()).title,'Runtime repository')
  const linkCover=await fetch(canonical+'/v1/link-preview/image?url='+encodeURIComponent('https://github.com/example/repo'));assert.equal(linkCover.status,200)
  assert.ok(outbound.every(r=>r.cookie===null&&r.authorization===null&&!r.url.includes('never-forward')))
  const shared=await fetch(canonical+'/news/42?private=never-forward',{headers:{cookie:'private-cookie',authorization:'Bearer private'}});const sharedHTML=await shared.text();assert.match(sharedHTML,/<title>Story · ETNOS<\/title>/);assert.match(sharedHTML,/property="og:title" content="Story"/);assert.match(sharedHTML,/name="twitter:card" content="summary_large_image"/);assert.match(sharedHTML,/property="og:image" content="https:\/\/etnos.space\/v1\/news\/42\/image\?asset=[a-f0-9]{24}"/);assert.doesNotMatch(sharedHTML,/never-forward/);assert.equal(shared.headers.get('cache-control'),'no-store')
  const protectedHTML=await (await fetch(canonical+'/messages?to=secret',{headers:{cookie:'private-cookie'}})).text();assert.match(protectedHTML,/noindex, nofollow/);assert.doesNotMatch(protectedHTML,/secret/)
  assert.equal((await fetch('https://evil.example/health')).status,400)
  const moved=await fetch(legacy+'/explore?q=mee');assert.equal(moved.status,302);assert.equal(moved.headers.get('location'),canonical+'/explore?q=mee')
  const callback=await fetch(legacy+'/auth/callback?code=secret-code&state=secret-state');assert.equal(callback.headers.get('location'),canonical+'/login');assert.equal(callback.headers.get('referrer-policy'),'no-referrer')
  const write=await fetch(legacy+'/v1/posts',{method:'POST',body:'{}'});assert.equal(write.status,405);assert.equal(write.headers.has('location'),false)
  const recovery=await fetch(legacy+'/recover-messages');assert.equal(recovery.status,200);assert.match(recovery.headers.get('content-security-policy'),/connect-src 'none'/);assert.equal(recovery.headers.get('cache-control'),'no-store')
  assert.equal((await fetch(legacy+'/assets/recovery-abcd.js')).status,200)
  assert.equal((await fetch(legacy+'/unknown-recovery')).status,302)
 }finally{await mf.dispose()}
})
