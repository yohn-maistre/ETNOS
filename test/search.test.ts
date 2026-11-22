import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Search} from '../src/search.ts'
import {Groups} from '../src/groups.ts'
import {Wiki} from '../src/wiki.ts'
import {Forum} from '../src/forum.ts'
import {api} from '../src/api.ts'
function fixture() {
 const s=new Etnos(':memory:','https://search.example'),a=s.provision('did:web:giyaibo.example','giyaibo.bsky.social'),b=s.provision('did:web:protected.example','Protected participant'),o=s.provision('did:web:outside.example','Outside'),q=new Search(s),g=new Groups(s,{stewardDid:a.actor.did}),w=new Wiki(s)
 const c=s.createCommunity(a.actor.id,'Mee public','Mee conversation','public'),h=s.createCommunity(b.actor.id,'Secret Mee','Private Mee','hidden-private'),l=s.createCommunity(b.actor.id,'Listed Mee','Admission required','listed-private')
 s.setMember(b.actor.id,h.id,a.actor.id,true)
 const p=s.createPost(a.actor.id,c.id,'Mee public story'),secret=s.createPost(b.actor.id,h.id,'Mee secret narrative')
 return {s,a,b,o,q,g,w,c,h,l,p,secret}
}
test('unified discovery searches identities, contexts, community and accepted wiki without leaking private records',()=>{
 const{s,a,b,o,q,g,w,c,h,l,p,secret}=fixture();try{
 const context=g.createContext(a.actor.id,{slug:'mee',title:'Mee',kind:'language',description:'Public language context',language:'id',aliases:['Ekagi']})
 const pub=g.create(a.actor.id,'Mee public institution','Public profile','institution','public'),hidden=g.create(b.actor.id,'Secret Mee council','Hidden affiliation','institution','hidden-private')
 const page=w.create(a.actor.id,c.id,'Language overview'),draft=w.propose(a.actor.id,page.id,null,'Mee accepted language record',[],'id','Synthetic public review');w.decide(a.actor.id,draft.id,draft.digest,true)
 w.propose(a.actor.id,page.id,w.read(page.id).revision_id,'Hidden proposal keyword',[],'id','Synthetic draft')
 const publicResults=q.query(undefined,'Mee'),serialized=JSON.stringify(publicResults)
 assert.ok(publicResults.posts.some(x=>x.id===p.id));assert.ok(publicResults.contexts.some(x=>x.id===context.id));assert.ok(publicResults.groups.some(x=>x.id===pub.id));assert.ok(publicResults.wiki.some(x=>x.id===page.id));assert.ok(publicResults.communities.some(x=>x.id===l.id))
 for(const value of [h.id,secret.id,hidden.id,b.actor.did,'Hidden proposal'])assert.equal(serialized.includes(value),false)
 assert.equal(q.query(o.actor.id,'Hidden proposal').wiki.length,0)
 assert.equal(q.query(undefined,'@GIYAIBO').people[0].id,a.actor.id)
 assert.equal(q.query(a.actor.id,a.actor.did).people[0].id,a.actor.id)
 assert.ok(q.query(a.actor.id,'Mee').posts.some(x=>x.id===secret.id))
 s.setMember(b.actor.id,h.id,a.actor.id,false)
 assert.equal(JSON.stringify(q.query(a.actor.id,'Mee')).includes(secret.id),false)
 assert.throws(()=>q.profile(a.actor.id,b.actor.id),/Not found/)
 }finally{s.close()}
})
test('profile feed is author-filtered and keyset-paged independently of the current home page',()=>{
 const{s,a,b,q,c}=fixture();try{
 const first=s.createPost(a.actor.id,c.id,'Older author post')
 s.setMember(a.actor.id,c.id,b.actor.id,true)
 for(let i=0;i<35;i++)s.createPost(b.actor.id,c.id,'Other post '+i)
 const page=s.feedPage(undefined,{authorId:a.actor.id,limit:1})
 assert.equal(page.items.length,1);assert.equal(page.items[0].author_id,a.actor.id);assert.ok(page.nextCursor)
 const next=s.feedPage(undefined,{authorId:a.actor.id,limit:1,cursor:page.nextCursor!})
 assert.notEqual(page.items[0].id,next.items[0].id)
 assert.equal(q.profile(undefined,a.actor.id).name,a.actor.name)
 assert.ok([page.items[0].id,next.items[0].id].includes(first.id))
 }finally{s.close()}
})
test('hidden and deleted posts no longer serve as public identity discovery proof',()=>{
 const{s,a,b,q,c,p}=fixture();try{
 new Forum(s).delete(a.actor.id,p.id,1)
 assert.equal(q.query(undefined,'giyaibo').people.length,0)
 assert.throws(()=>q.profile(undefined,a.actor.id),/Not found/)
 assert.equal(q.profile(a.actor.id,a.actor.id).id,a.actor.id)
 const post=s.createPost(a.actor.id,c.id,'Visible');new Forum(s).moderate(a.actor.id,post.id,{action:'hide',reason:'Review'})
 assert.equal(q.query(undefined,'giyaibo').people.length,0)
 assert.throws(()=>q.profile(undefined,b.actor.id),/Not found/)
 }finally{s.close()}
})
test('search HTTP is anonymous-readable, bounded, literal for wildcard input, and no-store',async()=>{
 const{s,a,p}=fixture();try{
 const handler=api(s),r=await handler(new Request(s.base+'/v1/search?q=giyaibo'))
 assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).people[0].id,a.actor.id)
 assert.equal((await handler(new Request(s.base+'/v1/search?q='+ 'x'.repeat(101)))).status,400)
 assert.equal((await handler(new Request(s.base+'/v1/search?q=%25_'))).status,200)
 const page=await (await handler(new Request(s.base+'/v1/feed/page?author='+a.actor.id))).json();assert.equal(page.items[0].id,p.id)
 }finally{s.close()}
})
test('following is local, private to the caller, idempotent, and never grants private access',async()=>{
 const{s,a,b,o,q,c,h,p,secret}=fixture();try{
 const {Social}=await import('../src/social.ts'),social=new Social(s)
 s.setMember(a.actor.id,c.id,b.actor.id,true);s.createPost(b.actor.id,c.id,'Public participant')
 social.follow(o.actor.id,a.actor.id,true);social.follow(o.actor.id,a.actor.id,true)
 assert.equal(social.following(o.actor.id).length,1);assert.equal(social.following(a.actor.id).length,0)
 assert.throws(()=>social.follow(a.actor.id,a.actor.id,true),/another/)
 const feed=s.feedPage(o.actor.id,{followingId:o.actor.id});assert.deepEqual(feed.items.map(x=>x.id),[p.id]);assert.equal(JSON.stringify(feed).includes(secret.id),false)
 social.follow(o.actor.id,b.actor.id,true);assert.equal(social.following(o.actor.id).length,2)
 assert.equal(s.feedPage(o.actor.id,{followingId:o.actor.id}).items.some(x=>x.id===secret.id),false)
 assert.equal(q.query(o.actor.id,'').people[0].id!==o.actor.id,true)
 const handler=api(s);assert.equal((await handler(new Request(s.base+'/v1/following'))).status,401);assert.equal((await handler(new Request(s.base+'/v1/feed/page?following=true'))).status,401)
 const publicProfile=await (await handler(new Request(s.base+'/v1/actors/'+a.actor.id))).text();assert.equal(publicProfile.includes(o.actor.id),false);assert.equal(publicProfile.includes('follower'),false)
 social.follow(o.actor.id,a.actor.id,false);assert.equal(social.following(o.actor.id).length,1)
 }finally{s.close()}
})
