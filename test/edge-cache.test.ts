import test from 'node:test'
import assert from 'node:assert/strict'
import {cachedPublicApi,publicCacheTtl,type CacheStore} from '../src/edge-cache.ts'

const ORIGIN='https://etnos.space'

function memCache():CacheStore & {size:()=>number}{
 const map=new Map<string,Response>()
 return {
  async match(key:Request){
   const hit=map.get(key.url)
   return hit?hit.clone():undefined
  },
  async put(key:Request,res:Response){
   map.set(key.url,res.clone())
  },
  size:()=>map.size,
 }
}

test('edge cache: caches anonymous allowlisted GET reads and serves HIT on repeat',async()=>{
 const cache=memCache()
 let calls=0
 const upstream=async()=>Response.json({ok:true,n:++calls})

 const r1=await cachedPublicApi(new Request(ORIGIN+'/v1/entri/danau-tigi'),cache,upstream)
 assert.equal(r1.status,200)
 assert.equal(r1.headers.get('x-etnos-edge-cache'),'MISS')
 // The edge copy carries the TTL; the browser is told not to store anything.
 assert.equal(r1.headers.get('cache-control'),'no-store')
 assert.match((await cache.match(new Request(ORIGIN+'/v1/entri/danau-tigi')))?.headers.get('cache-control')??'',/s-maxage=90/)
 assert.deepEqual(await r1.json(),{ok:true,n:1})
 assert.equal(calls,1)
 assert.equal(cache.size(),1)

 const r2=await cachedPublicApi(new Request(ORIGIN+'/v1/entri/danau-tigi'),cache,upstream)
 assert.equal(r2.status,200)
 assert.equal(r2.headers.get('x-etnos-edge-cache'),'HIT')
 assert.equal(r2.headers.get('cache-control'),'no-store')
 assert.deepEqual(await r2.json(),{ok:true,n:1})
 assert.equal(calls,1)
})

test('edge cache: authenticated requests (Cookie or Authorization) NEVER hit or populate cache',async()=>{
 const cache=memCache()
 let calls=0
 const upstream=async(req:Request)=>{
  calls++
  const authed=req.headers.has('cookie')||req.headers.has('authorization')
  return Response.json({authed,calls})
 }

 // Seed anonymous entry first
 const anon=await cachedPublicApi(new Request(ORIGIN+'/v1/feed/page'),cache,upstream)
 assert.deepEqual(await anon.json(),{authed:false,calls:1})

 // Authenticated with Cookie bypasses cached anonymous entry completely
 const withCookie=await cachedPublicApi(new Request(ORIGIN+'/v1/feed/page',{headers:{cookie:'etnos_session=secret'}}),cache,upstream)
 assert.equal(withCookie.headers.get('x-etnos-edge-cache'),null)
 assert.deepEqual(await withCookie.json(),{authed:true,calls:2})

 // Authenticated with Bearer Authorization bypasses cached anonymous entry completely
 const withAuth=await cachedPublicApi(new Request(ORIGIN+'/v1/feed/page',{headers:{authorization:'Bearer tok'}}),cache,upstream)
 assert.equal(withAuth.headers.get('x-etnos-edge-cache'),null)
 assert.deepEqual(await withAuth.json(),{authed:true,calls:3})

 // Authenticated request to an uncached URL NEVER populates the cache
 const withAuthNew=await cachedPublicApi(new Request(ORIGIN+'/v1/peta-kata?concept=air',{headers:{cookie:'etnos_session=secret'}}),cache,upstream)
 assert.deepEqual(await withAuthNew.json(),{authed:true,calls:4})
 assert.equal(cache.size(),1)
})

test('edge cache: non-allowlisted routes, POSTs, errors, and Set-Cookie responses are never cached',async()=>{
 const cache=memCache()
 assert.equal(publicCacheTtl(new Request(ORIGIN+'/v1/me')),null)
 assert.equal(publicCacheTtl(new Request(ORIGIN+'/v1/dm/threads')),null)
 assert.equal(publicCacheTtl(new Request(ORIGIN+'/v1/communities/abc/posts')),null)
 assert.equal(publicCacheTtl(new Request(ORIGIN+'/v1/entri',{method:'POST'})),null)
 assert.equal(publicCacheTtl(new Request(ORIGIN+'/v1/peta-kata/bahasa/west2594')),90)
 assert.equal(publicCacheTtl(new Request(ORIGIN+'/v1/peta-kata/bahasa/../me')),null)

 const errRes=await cachedPublicApi(new Request(ORIGIN+'/v1/aksara/jadwal'),cache,async()=>new Response('err',{status:500}))
 assert.equal(errRes.status,500)
 assert.equal(cache.size(),0)

 const cookieRes=await cachedPublicApi(new Request(ORIGIN+'/v1/aksara/jadwal'),cache,async()=>new Response('{"ok":true}',{status:200,headers:{'set-cookie':'a=b'}}))
 assert.equal(cookieRes.status,200)
 assert.equal(cache.size(),0)
})
