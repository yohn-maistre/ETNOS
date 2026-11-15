import test from 'node:test'
import assert from 'node:assert/strict'
import {publicLiterature,literatureQuery} from '../src/literature.ts'
import {catalogue} from '../src/catalogue.ts'

const c=catalogue('tanah-papua').catalogue

test('a label search adds the area, uses catalogue terms, and skips labels that are not subjects',()=>{
 assert.equal(literatureQuery({slug:'nabire',title:'Nabire',kind:'place',facet:'regency'},c),'("Nabire") AND (Papua OR "Irian Jaya" OR "West New Guinea" OR "Dutch New Guinea") NOT "Papua New Guinea"')
 assert.equal(literatureQuery({slug:'papua-tengah',title:'Papua Tengah',kind:'region',facet:'province'},c),'"Papua Tengah"')
 assert.match(literatureQuery({slug:'kesehatan',title:'Kesehatan',kind:'topic'},c)!,/^\(health OR kesehatan\) AND \(Papua/)
 assert.match(literatureQuery({slug:'x',title:'Mee (Ekagi) "x"',kind:'language'},c)!,/^\("Mee Ekagi x" AND \(language OR bahasa\)\) AND/)
 for(const label of [{slug:'komunitas-tanya',title:'Tanya jawab',kind:'topic',facet:'community-kind'},{slug:'lsm',title:'LSM',kind:'topic',facet:'institution-kind'},{slug:'ranah-budaya',title:'Ranah budaya',kind:'topic',facet:'cultural-domain'},{slug:'hobi-diy',title:'Hobi',kind:'topic'}])assert.equal(literatureQuery(label,c),null)
 for(const slug of Object.keys(c.literature!.terms!))assert.ok(c.entries.some(e=>e.slug===slug),slug)
})

test('the key goes to OpenAlex in a header only and rows are cleaned',async()=>{
 const calls:{url:string;auth:string|null}[]=[]
 const fetcher=(async(url:string|URL|Request,init?:RequestInit)=>{calls.push({url:String(url),auth:new Headers(init?.headers).get('authorization')})
  return Response.json({meta:{count:41},results:[
   {id:'https://openalex.org/W1',doi:'https://doi.org/10.1/x',display_name:' A <i>synthetic</i>  title ',publication_year:2019,authorships:[1,2,3,4].map(n=>({author:{display_name:'Author '+n}})),primary_location:{source:{display_name:'Synthetic Journal'}},open_access:{is_oa:true},cited_by_count:7},
   {id:'javascript:alert(1)',display_name:'Bad link'},{display_name:'',id:'https://openalex.org/W3'},null]})}) as typeof fetch
 const response=await publicLiterature('"Nabire"','synthetic-key',fetcher),raw=await response.text(),body=JSON.parse(raw)
 assert.equal(response.status,200);assert.equal(calls.length,1)
 assert.ok(calls[0].url.startsWith('https://api.openalex.org/works?'));assert.ok(!calls[0].url.includes('synthetic-key'));assert.equal(calls[0].auth,'Bearer synthetic-key')
 assert.ok(!raw.includes('synthetic-key'))
 assert.equal(body.total,41);assert.equal(body.source.name,'OpenAlex')
 assert.deepEqual(body.items,[{title:'A synthetic title',year:2019,authors:['Author 1','Author 2','Author 3'],moreAuthors:1,venue:'Synthetic Journal',url:'https://doi.org/10.1/x',open:true,cited:7}])
})

test('without a key or an answer nothing is invented or cached',async()=>{
 let called=0
 const none=await publicLiterature('"x"',undefined,(async()=>{called++;return Response.json({})}) as typeof fetch)
 assert.equal(none.status,503);assert.equal(called,0);assert.equal(none.headers.get('cache-control'),'no-store')
 for(const fetcher of [async()=>new Response('no',{status:403}),async()=>Response.json({results:'x'}),async()=>{throw Error('down')}]){
  const r=await publicLiterature('"x"','k',fetcher as typeof fetch);assert.equal(r.status,503);assert.deepEqual((await r.json() as {items:unknown[]}).items,[])
 }
})
