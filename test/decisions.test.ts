import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {Decisions,type DecisionInput,type DecisionProvider} from '../src/decisions.ts'
import {api} from '../src/api.ts'
const stories=[{id:'42',title:'Public reporting',publishedAt:null}]
const output=(p=.95,confidence=.95)=>({answers:{story:{choice:'s0',confidence,probabilities:{s0:p,none:1-p}},wiki:{noul:.9}}})
function fixture(){const s=new Etnos(':memory:','https://etnos.example'),owner=s.provision('did:web:decisions-owner.example','Owner'),member=s.provision('did:web:decisions-member.example','Member'),pub=s.createCommunity(owner.actor.id,'Public','Discussion','public',false,'open'),secret=s.createCommunity(owner.actor.id,'Hidden','Never','hidden-private'),post=s.createPost(owner.actor.id,pub.id,'Public evidence'),privatePost=s.createPost(owner.actor.id,secret.id,'PRIVATE ORIGINAL');s.join(member.actor.id,pub.id);return{s,owner,member,pub,secret,post,privatePost}}
test('decision API requires a human steward and public content before any provider call',async()=>{
 const f=fixture();let calls=0;const provider:DecisionProvider={news:async()=>{calls++;return stories},run:async()=>{calls++;return output()}},handler=api(f.s,{decisions:provider})
 const invoke=(id:string,token?:string)=>handler(new Request(f.s.base+'/v1/posts/'+id+'/suggestions',{method:'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},body:JSON.stringify({requestKey:randomUUID()})}))
 try{
  assert.equal((await invoke(f.post.id)).status,401);assert.equal((await invoke(f.post.id,f.member.token)).status,403);assert.equal((await invoke(f.privatePost.id,f.owner.token)).status,404);assert.equal(calls,0)
  const ok=await invoke(f.post.id,f.owner.token);assert.equal(ok.status,200);assert.equal((await ok.json()).story.id,'42');assert.equal(calls,2)
  assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM wiki_proposals')!.n,0);assert.equal(f.s.feed().length,1)
 }finally{f.s.close()}
})
test('decision replay is idempotent, concurrent attempts do not repeat inference, and budgets persist',async()=>{
 const f=fixture();let calls=0,finish!:(v:unknown)=>void;const provider:DecisionProvider={news:async()=>stories,run:async()=>{calls++;return new Promise(r=>finish=r)}},d=new Decisions(f.s,provider),key=randomUUID()
 try{
  const first=d.suggest(f.owner.actor.id,f.post.id,key);await new Promise(r=>setTimeout(r,0));assert.equal(calls,1)
  await assert.rejects(d.suggest(f.owner.actor.id,f.post.id,key),/pending or interrupted/);finish(output());const result=await first
  assert.equal((await d.suggest(f.owner.actor.id,f.post.id,key)).id,result.id);assert.equal(calls,1)
  const immediate=new Decisions(f.s,{news:async()=>stories,run:async()=>output()});for(let i=0;i<4;i++)await immediate.suggest(f.owner.actor.id,f.post.id,randomUUID());await assert.rejects(immediate.suggest(f.owner.actor.id,f.post.id,randomUUID()),/harian/)
  assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM decision_requests')!.n,5)
 }finally{f.s.close()}
})
test('decision output is constrained, abstains on uncertainty, and never accepts provider instructions',async()=>{
 const f=fixture();let input:DecisionInput|undefined
 try{
  const d=new Decisions(f.s,{news:async()=>stories,run:async q=>{input=q;return output(.95,.4)}});const r=await d.suggest(f.owner.actor.id,f.post.id,randomUUID());assert.equal(r.story,null);assert.equal(r.reviewRequired,true);assert.equal(r.confidence,.4);assert.ok(input?.questions.story.criteria?.none)
  const invalid=new Decisions(f.s,{news:async()=>stories,run:async()=>({answers:{story:{choice:'publish-private-source',confidence:1,probabilities:{'publish-private-source':1}},wiki:{noul:1}}})});await assert.rejects(invalid.suggest(f.owner.actor.id,f.post.id,randomUUID()),/Invalid decision/)
  assert.equal(f.s.get<{n:number}>("SELECT count(*) n FROM decision_requests WHERE state='failed'")!.n,1)
 }finally{f.s.close()}
})
test('current access and visibility are rechecked after async inference; failures cannot be silently retried',async()=>{
 const f=fixture();const mod=f.s.provision('did:web:decision-mod.example','Mod');f.s.setMember(f.owner.actor.id,f.pub.id,mod.actor.id,true,'moderator');let calls=0
 try{
  const revoked=new Decisions(f.s,{news:async()=>stories,run:async()=>{calls++;f.s.setMember(f.owner.actor.id,f.pub.id,mod.actor.id,false);return output()}}),key=randomUUID();await assert.rejects(revoked.suggest(mod.actor.id,f.post.id,key));assert.equal(calls,1)
  assert.equal(f.s.get<{n:number}>("SELECT count(*) n FROM decision_requests WHERE state='complete'")!.n,0)
  const hidden=new Decisions(f.s,{news:async()=>stories,run:async()=>{f.s.hidePost(f.owner.actor.id,f.post.id);return output()}});await assert.rejects(hidden.suggest(f.owner.actor.id,f.post.id,randomUUID()))
  const again=f.s.createPost(f.owner.actor.id,f.pub.id,'Fresh public');let attempts=0;const failing=new Decisions(f.s,{news:async()=>stories,run:async()=>{attempts++;throw Error('provider credential must not leak')}}),retry=randomUUID();await assert.rejects(failing.suggest(f.owner.actor.id,again.id,retry),/tidak diulang/);await assert.rejects(failing.suggest(f.owner.actor.id,again.id,retry),/ended/);assert.equal(attempts,1)
 }finally{f.s.close()}
})
