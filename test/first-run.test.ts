import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {api} from '../src/api.ts'
import {fixture,did,origin} from './oauth-fixture.ts'

// First run (W1): shown once per account, and suggestions name only public communities.
const sid='f'.repeat(43),csrf='first-run-csrf'
const req=(path:string,body?:unknown,headers:Record<string,string>={})=>new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{origin,cookie:'__Host-strata='+sid,...headers,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})})

test('the first-run screen is offered once to a new person and never to an agent',async()=>{
 const s=new Etnos(':memory:',origin),person=s.provision(did,'Orang baru (data uji)')
 const f=await fixture(s,{})
 try{
  s.run('INSERT INTO browser_sessions VALUES(?,?,?,?,?,0)',createHash('sha256').update(sid).digest('hex'),person.actor.id,csrf,s.clock(),s.clock()+86400000)
  const me=async()=>(await (await f.auth.route(req('/auth/me')))!.json() as {firstRun:boolean}).firstRun
  assert.equal(await me(),true)
  // Marking it needs the session's confirmation header.
  assert.equal((await f.auth.route(req('/auth/first-run',{})))!.status,403)
  assert.equal((await f.auth.route(req('/auth/first-run',{},{'x-etnos-csrf':csrf})))!.status,200)
  assert.equal(await me(),false)
  assert.equal((await f.auth.route(req('/auth/first-run',{},{'x-etnos-csrf':csrf})))!.status,200,'twice is harmless')
  s.run("UPDATE actors SET kind='agent' WHERE id=?",person.actor.id);s.run('DELETE FROM first_run_done')
  assert.equal(await me(),false,'agents never see it')
 }finally{s.close()}
})

test('suggestions: communities labelled with a place, its region or a language; never private ones; joined ones marked',async()=>{
 const s=new Etnos(':memory:',origin),owner=s.provision('did:plc:'+'o'.repeat(24),'Pemilik (data uji)'),person=s.provision('did:plc:'+'p'.repeat(24),'Orang (data uji)')
 const ctx=(slug:string,title:string,kind:string)=>{const id=crypto.randomUUID();s.run("INSERT INTO contexts(id,slug,title,kind,description,language,aliases,created) VALUES(?,?,?,?,'(data uji)','id','[]',?)",id,slug,title,kind,s.clock());return id}
 const region=ctx('wilayah-uji','Wilayah Uji','region'),place=ctx('kabupaten-uji','Kabupaten Uji','place'),language=ctx('bahasa-uji','Bahasa Uji','language')
 s.run('INSERT INTO context_parents VALUES(?,?,?,?)',place,region,owner.actor.id,s.clock())
 const label=(community:string,context:string,role='about')=>s.run('INSERT INTO community_contexts(community_id,context_id,issuer_id,created,role) VALUES(?,?,?,?,?)',community,context,owner.actor.id,s.clock(),role)
 const local=s.createCommunity(owner.actor.id,'Kampung uji (data uji)','Publik','public')
 const speakers=s.createCommunity(owner.actor.id,'Penutur uji (data uji)','Publik','public')
 const hidden=s.createCommunity(owner.actor.id,'Rahasia uji (data uji)','Privat','hidden-private')
 const listed=s.createCommunity(owner.actor.id,'Terdaftar uji (data uji)','Privat','listed-private')
 const general=s.createCommunity(owner.actor.id,'Umum uji (data uji)','Publik','public')
 label(local.id,place);label(hidden.id,place);label(listed.id,region);label(speakers.id,language,'language');label(local.id,language,'language')
 s.join(person.actor.id,local.id)
 const handler=api(s,{})
 const suggest=async(q:string,token?:string)=>(await handler(new Request(origin+'/v1/communities/suggest?contexts='+q,{headers:token?{authorization:'Bearer '+token}:{}}))).json() as Promise<{matched:{id:string;title:string;because:string[];joined:boolean}[];general:{id:string}[]}>
 try{
  const byRegion=await suggest('wilayah-uji',person.token)
  assert.deepEqual(byRegion.matched.map(c=>[c.title,c.because,c.joined]),[['Kampung uji (data uji)',['Wilayah Uji'],true]],'a region covers its regencies; private rooms never appear')
  const both=await suggest('kabupaten-uji,bahasa-uji,../x,TIDAK')
  assert.deepEqual(both.matched.map(c=>[c.title,c.because.sort()]).sort(),[['Kampung uji (data uji)',['Bahasa Uji','Kabupaten Uji']],['Penutur uji (data uji)',['Bahasa Uji']]])
  assert.ok(both.general.some(c=>c.id===general.id));assert.equal(both.general.some(c=>c.id===local.id),false,'a match is not repeated')
  const all=JSON.stringify(await suggest('kabupaten-uji,wilayah-uji,bahasa-uji'))
  assert.equal(all.includes(hidden.id)||all.includes('Rahasia')||all.includes(listed.id),false)
  assert.deepEqual((await suggest('')).matched,[])
 }finally{s.close()}
})
