import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Meter,routeShape,FREE_TIER} from '../src/usage.ts'

test('route shapes keep only known route words, never ids, slugs or queries',()=>{
  assert.equal(routeShape('/v1/communities/c_8f3a/posts'),'/v1/communities/:id/posts')
  assert.equal(routeShape('/v1/wiki/suku-mee'),'/v1/wiki/:id')
  assert.equal(routeShape('/v1/posts/abc/replies/def/extra/more'),'/v1/posts/:id/replies/:id')
  assert.equal(routeShape('/v1/search'),'/v1/search')
  assert.equal(routeShape('/v1/actors/did:plc:secret/follow'),'/v1/actors/:id/follow')
})

test('the meter counts rows per request, logs no content and saves at most every five minutes',()=>{
  const usage={statements:0,rowsRead:0,rowsWritten:0},store=new Map<string,unknown>(),lines:string[]=[]
  let now=Date.UTC(2026,10,17,1),puts=0
  const kv={get:<T>(k:string)=>store.get(k) as T|undefined,put:<T>(k:string,v:T)=>{puts++;store.set(k,structuredClone(v))},list:<T>({prefix=''}={})=>[...store].filter(([k])=>k.startsWith(prefix)) as [string,T][]}
  const meter=new Meter(usage,kv,()=>now,l=>lines.push(l))
  usage.rowsRead=7 // rows before the first request (schema setup) belong to the day too
  for(let i=0;i<3;i++){const m=meter.start();usage.rowsRead+=40;usage.rowsWritten+=2;usage.statements+=5;now+=1000;meter.finish(m,'GET','/v1/feed',200)}
  assert.equal(puts,1)
  const m=meter.start();usage.rowsRead+=10;meter.finish(m,'ALARM','alarm',200)
  const r=meter.report(),today=r.days[0]
  assert.equal(today.day,'2026-11-17');assert.equal(today.requests,3);assert.equal(today.alarms,1)
  assert.equal(today.rowsRead,137);assert.equal(today.rowsWritten,6)
  assert.equal(today.percent.rowsRead,Math.round(130/FREE_TIER.rowsRead*1000)/10)
  assert.equal(today.heaviest[0].route,'GET /v1/feed')
  assert.deepEqual(JSON.parse(lines[0]),{event:'etnos.request',method:'GET',route:'/v1/feed',status:200,ms:1000,rowsRead:40,rowsWritten:2,statements:5})
  now=Date.UTC(2026,10,18,0,1);const n=meter.start();meter.finish(n,'GET','/v1/feed',503)
  const two=meter.report().days
  assert.deepEqual(two.map(d=>d.day),['2026-11-18','2026-11-17']);assert.equal(two[0].errors,1);assert.equal(two[1].requests,3)
})

test('overlapping requests are not counted twice in the daily total',()=>{
  const usage={statements:0,rowsRead:0,rowsWritten:0},meter=new Meter(usage,undefined,()=>Date.UTC(2026,10,17),()=>{})
  const a=meter.start();usage.rowsRead+=100;const b=meter.start();usage.rowsRead+=50
  meter.finish(a,'GET','/v1/feed',200);meter.finish(b,'GET','/v1/wiki',200)
  assert.equal(meter.report().days[0].rowsRead,150)
})
