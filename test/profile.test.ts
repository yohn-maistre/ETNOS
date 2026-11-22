import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Search} from '../src/search.ts'
import {api} from '../src/api.ts'
import {updateProfile} from '../src/profile.ts'
test('optional profile fields preserve discovery boundaries and cannot edit another actor or grant membership',async()=>{
 const s=new Etnos(':memory:'),a=s.provision('did:web:profile.example','Profile'),o=s.provision('did:web:outsider.example','Outside'),q=new Search(s)
 try{
  updateProfile(s,a.actor.id,{bio:'A voluntary biography',location:'Mee',website:'https://example.org/'})
  assert.equal(q.profile(a.actor.id,a.actor.id).bio,'A voluntary biography');assert.throws(()=>q.profile(o.actor.id,a.actor.id),/Not found/)
  assert.equal(q.query(undefined,'biography').people.length,0)
  const c=s.createCommunity(a.actor.id,'Public','Public','public');s.createPost(a.actor.id,c.id,'A public contribution')
  assert.equal(q.profile(undefined,a.actor.id).location,'Mee')
  const handler=api(s)
  const response=await handler(new Request(s.base+'/v1/profile',{method:'POST',headers:{authorization:'Bearer '+o.token,'content-type':'application/json'},body:JSON.stringify({actorId:a.actor.id,bio:'Spoof',website:'',location:''})}))
  assert.equal(response.status,400);assert.equal(q.profile(undefined,a.actor.id).bio,'A voluntary biography')
  assert.throws(()=>updateProfile(s,a.actor.id,{bio:'Safe',location:'',website:'javascript:alert(1)'}),/HTTPS/)
  assert.throws(()=>updateProfile(s,a.actor.id,{bio:'Safe',location:'',website:'https://user:pass@example.org'}),/HTTPS/)
  assert.equal(s.membership(o.actor.id,c.id),undefined)
 }finally{s.close()}
})
