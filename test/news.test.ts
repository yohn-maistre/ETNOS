import {test} from 'node:test'
import assert from 'node:assert/strict'
import {publicNews,publicStory,publicNewsImage} from '../src/news.ts'
test('news projects only bounded published fields with same-origin image references',async()=>{
 let calls=0
 const fetcher:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'https://westpapua.watch/api/current?limit=12');assert.equal(options?.redirect,'error');assert.deepEqual(options?.headers,{accept:'application/json'});assert.ok(options?.signal);return Response.json({items:[{id:42,title:{id:'Kabar publik'},source_count:2,latest_report_at:'2026-11-01T10:00:00Z',image:{url:'https://tracking.example'},private_debug:'Never project'},{id:'../admin',title:{id:'Invalid'}},{id:42,title:{id:'Duplicate'}},{id:43,title:{en:'Public second'},image:{url:'https://img.antaranews.com/image.jpg',rights_status:'attributed_external',credit:'ANTARA'}}]})}
 const r=await publicNews(fetcher),d=await r.json();assert.equal(calls,1);assert.equal(r.status,200);assert.equal(d.items.length,2);assert.equal(d.items[0].url,'https://westpapua.watch/story/?id=42');assert.equal(JSON.stringify(d).includes('Never project'),false);assert.equal(JSON.stringify(d).includes('tracking.example'),false);assert.equal(d.items[1].image,'/v1/news/43/image');assert.match(r.headers.get('cache-control')!,/public/)
})
test('news failures, malformed responses and oversized streams fail small',async()=>{
 for(const fetcher of [async()=>{throw Error('secret upstream detail')},async()=>new Response('offline',{status:500}),async()=>Response.json({items:'wrong'}),async()=>Response.json({items:[],padding:'x'.repeat(530000)})]){
  const r=await publicNews(fetcher as typeof fetch),d=await r.json();assert.equal(r.status,503);assert.deepEqual(d.items,[]);assert.equal(d.available,false);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(JSON.stringify(d).includes('secret'),false)
 }
})
const detail=(image='https://img.antaranews.com/image.jpg')=>({development:{id:42,status:'published',title_id:'Judul',summary_id:'Ringkasan',editorial_dispatch_id:'never-project'},synthesis:{key_points:{id:['Poin']}},places:[{name:'Puncak',latitude:-3.6,longitude:137.5}],articles:[{title:'Sumber',publisher:'ANTARA',canonical_url:'https://www.antaranews.com/story',packet_summary:'Kutipan singkat',image_url:image,image_credit:'ANTARA'},{title:'unsafe',canonical_url:'javascript:alert(1)'}]})
test('native news detail excludes editorial internals, invalid sources and unpublished stories',async()=>{
 const response=await publicStory('42',async()=>Response.json(detail())),d=await response.json();assert.equal(d.title,'Judul');assert.equal(d.sources.length,1);assert.deepEqual(d.keyPoints,['Poin']);assert.equal(d.places[0].latitude,-3.6);assert.equal(JSON.stringify(d).includes('never-project'),false)
 assert.equal((await publicStory('../admin')).status,404)
 const unpublished=detail();unpublished.development.status='draft';assert.equal((await publicStory('42',async()=>Response.json(unpublished))).status,404)
 assert.equal((await publicStory('99',async()=>Response.json(detail()))).status,404)
})
test('news image port cannot proxy arbitrary hosts, redirects, HTML, oversized or mismatched bytes',async()=>{
 let calls=0
 const imageFetch:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'https://img.antaranews.com/image.jpg');assert.equal(options?.redirect,'error');assert.equal(options?.credentials,'omit');return new Response(new Uint8Array([255,216,255,1]),{headers:{'content-type':'image/jpeg'}})}
 const result=await publicNewsImage('42',async()=>Response.json(detail()),imageFetch);assert.equal(result.status,200);assert.equal(calls,1);assert.equal(result.headers.get('content-type'),'image/jpeg')
 for(const url of ['http://127.0.0.1/admin','https://localhost/private','https://img.antaranews.com.evil.example/x','https://user:pass@img.antaranews.com/x','https://img.antaranews.com:444/x']) assert.equal((await publicNewsImage('42',async()=>Response.json(detail(url)),imageFetch)).status,404)
 assert.equal(calls,1)
 for(const r of [new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}}),new Response('<html>wrong</html>',{headers:{'content-type':'image/jpeg'}}),new Response(new Uint8Array(2097153),{headers:{'content-type':'image/jpeg'}})])assert.equal((await publicNewsImage('42',async()=>Response.json(detail()),async()=>r)).status,404)
})
