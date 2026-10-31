import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'

const origin='https://strata.example'
function runtime(persist) {
  return new Miniflare(convertV4MiniflareOptions({name:'strata-test-only',modules:true,scriptPath:'.wrangler/test/worker-harness.js',
    compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],
    bindings:{STRATA_ORIGIN:origin,STRATA_NODE:'preview'},
    durableObjects:{STRATA:{className:'TestNode',useSQLite:true}},
    resourcePersistencePath:persist,
  }))
}
function call(mf,path,token,body) {
  return mf.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',
    headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  })
}

test('actual workerd SQLite: access, admission, transaction rollback, bytes, outbox and restart',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'strata-worker-'))
  let mf=runtime(dir)
  try {
    const ns=await mf.getDurableObjectNamespace('STRATA'),stub=ns.getByName('preview')
    const f=JSON.parse(await stub.seed())
    assert.equal((await call(mf,'/health')).status,200)
    assert.equal((await (await call(mf,'/health')).json()).runtime,'cloudflare-durable-object')
    assert.equal((await call(mf,'/v1/me',f.member.actor.id)).status,401)
    assert.equal((await call(mf,`/v1/posts/${f.secret.id}`,f.outsider.token)).status,404)
    assert.equal(JSON.stringify(await(await call(mf,'/v1/communities')).json()).includes(f.hidden.id),false)
    assert.equal((await(await call(mf,'/v1/feed?q=Never',f.outsider.token)).json()).length,0)
    assert.equal((await call(mf,`/v1/sources/anything`,f.owner.token)).status,501)
    assert.equal((await mf.dispatchFetch(origin+'/v1/feed',{headers:{origin:'https://evil.example'}})).status,403)
    assert.equal((await mf.dispatchFetch('https://evil.example/health')).status,400)
    assert.equal((await call(mf,`/v1/communities/${f.pub.id}/join`,f.member.token,{})).status,403)
    assert.equal((await call(mf,`/v1/communities/${f.pub.id}/requests`,f.member.token,{message:'Please admit me'})).status,200)
    assert.equal((await call(mf,`/v1/communities/${f.pub.id}/requests`,f.outsider.token)).status,404)
    assert.equal((await call(mf,`/v1/communities/${f.pub.id}/decide`,f.owner.token,{actorId:f.member.actor.id,approve:true})).status,200)
    assert.equal((await call(mf,'/v1/posts',f.member.token,{communityId:f.pub.id,text:'Admitted contribution'})).status,200)
    const invite=await(await call(mf,`/v1/communities/${f.hidden.id}/invitations`,f.owner.token,{actorId:f.member.actor.id,expires:Date.now()+60000})).json()
    assert.equal((await call(mf,'/v1/invitations/accept',f.outsider.token,{token:invite.token})).status,404)
    assert.equal((await call(mf,'/v1/invitations/accept',f.member.token,{token:invite.token})).status,200)
    assert.equal((await call(mf,'/v1/invitations/accept',f.member.token,{token:invite.token})).status,404)
    assert.equal((await call(mf,`/v1/posts/${f.secret.id}`,f.member.token)).status,200)
    await stub.remove(f.owner.actor.id,f.hidden.id,f.member.actor.id)
    assert.equal((await call(mf,`/v1/posts/${f.secret.id}`,f.member.token)).status,404)
    const voted=await(await call(mf,`/v1/posts/${f.publicPost.id}/vote`,f.member.token,{value:1})).json()
    assert.equal(voted.score,1)
    assert.equal((await call(mf,`/v1/posts/${f.publicPost.id}/bookmark`,f.member.token,{save:true})).status,200)
    assert.equal((await(await call(mf,'/v1/bookmarks',f.member.token)).json()).length,1)
    assert.equal((await(await call(mf,'/v1/feed/page?limit=1')).json()).items.length,1)
    const page=await(await call(mf,`/v1/communities/${f.pub.id}/wiki`,f.owner.token,{title:'Public knowledge'})).json()
    const proposal=await(await call(mf,`/v1/wiki/${page.id}/proposals`,f.member.token,{baseRevision:null,text:'Reviewed finding',citations:['https://evidence.example/report'],language:'id',perspective:'Community account'})).json()
    assert.equal((await(await call(mf,`/v1/wiki/${page.id}`)).json()).revision,null)
    assert.equal((await call(mf,`/v1/wiki-proposals/${proposal.id}`)).status,401)
    assert.equal((await call(mf,`/v1/wiki-proposals/${proposal.id}/decide`,f.owner.token,{digest:proposal.digest,accept:true})).status,200)
    const accepted=await(await call(mf,`/v1/wiki/${page.id}`)).json()
    assert.equal(accepted.revision.text,'Reviewed finding')
    assert.equal(JSON.stringify(accepted).includes(proposal.id),false)
    assert.equal((await(await call(mf,'/v1/capabilities')).json()).auth.atOAuth,false)
    assert.deepEqual(JSON.parse(await stub.durableContract()),{failed:true,rolledBack:true,preserved:[255,0,65,10],redacted:true})
    assert.deepEqual(JSON.parse(await stub.uncertainContract()),{before:'uncertain',after:'delivered',writes:1})
    const other=ns.getByName('independent-node')
    const separate=JSON.parse(await other.seed())
    assert.notEqual(separate.owner.actor.id,f.owner.actor.id)
    const oauth=ns.getByName('oauth-node')
    assert.deepEqual(JSON.parse(await oauth.authContract()),{start:200,callback:303,location:'/',hasCookie:true})
    await stub.interrupt()
    await mf.dispose()
    mf=runtime(dir)
    assert.equal((await call(mf,'/v1/me',f.owner.token)).status,200)
    const jobs=await(await call(mf,'/v1/outbox',f.owner.token)).json()
    assert.equal(jobs.some(j=>j.state==='sending'),false)
    assert.equal(jobs.some(j=>j.state==='uncertain'),true)
    assert.equal((await call(mf,`/v1/posts/${f.secret.id}`,f.owner.token)).status,200)
  } finally { await mf.dispose();await rm(dir,{recursive:true,force:true}) }
})
