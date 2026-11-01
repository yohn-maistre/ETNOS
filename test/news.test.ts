import {test} from 'node:test'
import assert from 'node:assert/strict'
import {publicNews} from '../src/news.ts'
test('news reads only the fixed published public feed and projects an allowlisted view',async()=>{
 let calls=0
 const fetcher:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'https://westpapua.watch/api/current?limit=6');assert.equal(options?.redirect,'error');assert.deepEqual(options?.headers,{accept:'application/json'});assert.ok(options?.signal);return Response.json({items:[{id:42,title:{id:'Kabar publik'},source_count:2,latest_report_at:'2026-11-01T10:00:00Z',image:{url:'https://tracking.example'},private_debug:'Never project'},{id:'../admin',title:{id:'Invalid'}},{id:42,title:{id:'Duplicate'}}]})}
 const r=await publicNews(fetcher),d=await r.json();assert.equal(calls,1);assert.equal(r.status,200);assert.equal(d.items.length,1);assert.equal(d.items[0].url,'https://westpapua.watch/story/?id=42');assert.equal(JSON.stringify(d).includes('Never project'),false);assert.equal(JSON.stringify(d).includes('tracking.example'),false);assert.match(r.headers.get('cache-control')!,/public/)
})
test('news failures, malformed responses and oversized streams fail small without exposing upstream errors',async()=>{
 for(const fetcher of [async()=>{throw Error('secret upstream detail')},async()=>new Response('offline',{status:500}),async()=>Response.json({items:'wrong'}),async()=>Response.json({items:[],padding:'x'.repeat(270000)})]){
  const r=await publicNews(fetcher as typeof fetch),d=await r.json();assert.equal(r.status,503);assert.deepEqual(d.items,[]);assert.equal(d.available,false);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(JSON.stringify(d).includes('secret'),false)
 }
})
