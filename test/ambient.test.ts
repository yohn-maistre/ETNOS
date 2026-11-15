import test from 'node:test'
import assert from 'node:assert/strict'
import {publicQuakes} from '../src/ambient.ts'

const bounds={west:128.6,south:-9.4,east:141.3,north:1.0}
const row=(DateTime:string,Coordinates:string,extra:Record<string,string>={})=>({DateTime,Coordinates,Magnitude:'5.1',Kedalaman:'10 km',Wilayah:'Synthetic place',...extra})

test('quakes are filtered to the deployment bounds, merged across feeds and ordered newest first',async()=>{
 const seen:string[]=[]
 const fetcher=(async(url:string|URL|Request)=>{seen.push(String(url))
  return String(url).includes('dirasakan')
   ?Response.json({Infogempa:{gempa:[row('2026-11-10T08:34:04+00:00','-3.50,135.50',{Dirasakan:'III Nabire'}),{DateTime:'broken'},null]}})
   :Response.json({Infogempa:{gempa:[row('2026-11-15T15:41:15+00:00','1.79,122.30'),row('2026-11-10T08:34:04+00:00','-3.50,135.50'),row('2026-11-12T01:00:00+00:00','-7.9,139.9',{Magnitude:'x'}),row('2026-11-14T01:00:00+00:00','-2.6,140.7',{Wilayah:'  A   long\n name '})]}})
 }) as typeof fetch
 const response=await publicQuakes(bounds,fetcher),body=await response.json() as {available:boolean;source:{name:string};items:Record<string,unknown>[]}
 assert.equal(response.status,200);assert.equal(seen.length,2);assert.ok(seen.every(u=>u.startsWith('https://data.bmkg.go.id/')))
 assert.equal(body.source.name,'BMKG');assert.equal(body.available,true)
 assert.deepEqual(body.items.map(i=>i.at),['2026-11-14T01:00:00.000Z','2026-11-10T08:34:04.000Z'])
 assert.deepEqual(body.items[1],{at:'2026-11-10T08:34:04.000Z',magnitude:5.1,depthKm:10,latitude:-3.5,longitude:135.5,where:'Synthetic place',felt:'III Nabire'})
 assert.equal(body.items[0].where,'A long name')
})

test('when no feed answers, nothing is invented and nothing is cached',async()=>{
 const response=await publicQuakes(bounds,(async()=>{throw Error('down')}) as typeof fetch)
 assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store')
 assert.deepEqual((await response.json() as {items:unknown[]}).items,[])
 const half=await publicQuakes(bounds,(async(url:string|URL|Request)=>String(url).includes('dirasakan')?new Response('nope',{status:500}):Response.json({Infogempa:{gempa:[]}})) as typeof fetch)
 assert.equal(half.status,200);assert.deepEqual((await half.json() as {items:unknown[]}).items,[])
})
