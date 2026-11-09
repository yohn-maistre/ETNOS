import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Wiki} from '../src/wiki.ts'
import {Groups} from '../src/groups.ts'
import {Search} from '../src/search.ts'
import {Activity} from '../src/activity.ts'
import {Media} from '../src/media.ts'
import {Forum} from '../src/forum.ts'
import {api} from '../src/api.ts'
import {image} from './media-fixture.ts'
test('wiki accountability projects only exact accepted participants and keeps draft contributors restricted',async()=>{
 const s=new Strata(':memory:'),owner=s.provision('did:web:wiki-owner.example','Public reviewer'),peer=s.provision('did:web:wiki-peer.example','Contributor'),stranger=s.provision('did:web:wiki-other.example','Unrelated private person'),w=new Wiki(s),c=s.createCommunity(owner.actor.id,'Public','Public','public')
 try {
  s.setMember(owner.actor.id,c.id,peer.actor.id,true)
  const p=w.createDraft(owner.actor.id,c.id,'Accountable page',{text:'First',citations:[],language:'id',perspective:'Free-text attribution'})
  const first=w.proposals(owner.actor.id,p.id)[0];w.decide(owner.actor.id,first.id,first.digest,true)
  const draft=w.propose(peer.actor.id,p.id,w.read(p.id).revision_id,'Changed',[],'id','A different attribution')
  assert.deepEqual(w.proposals(owner.actor.id,p.id).find(x=>x.id===draft.id)?.author,{id:peer.actor.id,name:'Contributor',kind:'human'})
  assert.throws(()=>w.proposals(stranger.actor.id,p.id))
  assert.equal(w.read(p.id).revision?.text,'First')
  w.decide(owner.actor.id,draft.id,draft.digest,true)
  const revision=w.read(p.id).revision!
  assert.deepEqual(revision.author,{id:peer.actor.id,name:'Contributor',kind:'human'})
  assert.deepEqual(revision.reviewer,{id:owner.actor.id,name:'Public reviewer',kind:'human'})
  assert.equal('did' in revision.author,false)
  assert.equal(JSON.stringify(w.read(p.id)).includes('Unrelated private person'),false)
  assert.equal(w.history(p.id)[0].reviewer?.id,owner.actor.id)
 }finally{s.close()}
})
test('atomic wiki drafts hide identity, title and history until reviewed; failed creation leaves no page',async()=>{
 const s=new Strata(':memory:','https://next.example'),a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:reader.example','Reader'),w=new Wiki(s),c=s.createCommunity(a.actor.id,'Public','Public','public')
 try{
  const body={text:'Private working prose',citations:[],language:'mee',perspective:'Community attribution'}
  const page=w.createDraft(a.actor.id,c.id,'Unpublished Tambeyau title',body)
  const key=crypto.randomUUID(),replayed=w.createDraft(a.actor.id,c.id,'Another draft',body,key)
  assert.equal(w.createDraft(a.actor.id,c.id,'Another draft',body,key).id,replayed.id)
  assert.throws(()=>w.createDraft(a.actor.id,c.id,'Changed',body,key),/another wiki draft/)
  // Keep this test's single-page assertions focused on the reviewed page below.
  s.run('DELETE FROM wiki_requests WHERE page_id=?',replayed.id);s.run('DELETE FROM wiki_proposals WHERE page_id=?',replayed.id);s.run('DELETE FROM wiki_pages WHERE id=?',replayed.id)
  assert.equal(w.all().length,0);assert.equal(w.list(c.id).length,0);assert.equal(w.all(a.actor.id)[0].id,page.id)
  assert.throws(()=>w.read(page.id),/Not found/);assert.throws(()=>w.read(page.id,b.actor.id),/Not found/)
  assert.equal(new Search(s).query(undefined,'Tambeyau').wiki.length,0)
  const handler=api(s)
  for(const suffix of ['', '/history'])assert.equal((await handler(new Request(s.base+'/v1/wiki/'+page.id+suffix))).status,404)
  const before=s.get<{n:number}>('SELECT count(*) n FROM wiki_pages')!.n
  assert.throws(()=>w.createDraft(a.actor.id,c.id,'Bad',{...body,citations:['file:///etc/passwd']}),/HTTPS/)
  assert.equal(s.get<{n:number}>('SELECT count(*) n FROM wiki_pages')!.n,before)
  const proposal=w.proposals(a.actor.id,page.id)[0]
  w.decide(a.actor.id,proposal.id,proposal.digest,true)
  assert.equal(w.read(page.id).revision?.text,body.text);assert.equal(w.all().length,1);assert.equal(new Search(s).query(undefined,'Tambeyau').wiki.length,1)
 }finally{s.close()}
})
test('wiki group restrictions recheck current contributors/reviewers and filter the activity inbox',()=>{
 const s=new Strata(':memory:'),a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:reviewer.example','Reviewer'),g=new Groups(s),w=new Wiki(s),c=s.createCommunity(a.actor.id,'Public','Public','public')
 try{
  s.setMember(a.actor.id,c.id,b.actor.id,true,'moderator')
  const group=g.create(a.actor.id,'Review council','Scope','collective','hidden-private')
  w.setPolicy(a.actor.id,c.id,group.id,group.id)
  const page=w.createDraft(a.actor.id,c.id,'Restricted draft',{text:'Draft',citations:[],language:'id',perspective:'Author'})
  const p=w.proposals(a.actor.id,page.id)[0]
  assert.throws(()=>w.propose(b.actor.id,page.id,null,'Other',[],'id','Other'),/contributor group/)
  assert.throws(()=>w.read(page.id,b.actor.id),/Not found/)
  assert.equal(w.all(b.actor.id).length,0);assert.equal(new Activity(s).list(b.actor.id).items.some(i=>i.kind==='wiki-review'),false)
  assert.throws(()=>w.decide(b.actor.id,p.id,p.digest,true),/reviewer group/)
  g.setMember(a.actor.id,group.id,b.actor.id,true)
  assert.equal(w.all(b.actor.id)[0].id,page.id);assert.ok(new Activity(s).list(b.actor.id).items.some(i=>i.kind==='wiki-review'))
  g.setMember(a.actor.id,group.id,b.actor.id,false)
  assert.throws(()=>w.decide(b.actor.id,p.id,p.digest,true),/reviewer group/)
  assert.equal(new Activity(s).list(b.actor.id).items.some(i=>i.kind==='wiki-review'),false)
  w.decide(a.actor.id,p.id,p.digest,true)
 }finally{s.close()}
})
test('inline document images must belong to the same attached post, preserve private reads and roll back failures',async()=>{
 const s=new Strata(':memory:'),a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:outside.example','Outside'),m=new Media(s),f=new Forum(s),g=new Groups(s),c=s.createCommunity(a.actor.id,'Private','Private','hidden-private'),other=s.createCommunity(a.actor.id,'Other','Other','public')
 try{
  const upload=m.upload(a.actor.id,c.id,image,'An ordinary preview'),foreign=m.upload(a.actor.id,other.id,image,'Other')
  const content={format:'markdown',inlineMedia:{version:1,ids:[upload.id]}}
  const before=s.get<{n:number}>('SELECT count(*) n FROM posts')!.n
  assert.throws(()=>f.create(a.actor.id,{communityId:c.id,text:'Image',content,mediaIds:[]},g),/attached/)
  assert.equal(s.get<{n:number}>('SELECT count(*) n FROM posts')!.n,before)
  assert.throws(()=>f.create(a.actor.id,{communityId:other.id,text:'Image',content,mediaIds:[upload.id]},g),/unavailable/)
  const post=f.create(a.actor.id,{communityId:c.id,text:'Before\n\n![Image](/v1/media/'+upload.id+')\n\nAfter',content,mediaIds:[upload.id]},g)
  assert.throws(()=>m.response(b.actor.id,upload.id),/Not found/)
  assert.throws(()=>f.edit(a.actor.id,post.id,{revision:1,text:'Changed',content:{format:'markdown',inlineMedia:{version:1,ids:[foreign.id]}}}),/attached/)
  assert.equal(s.getPost(a.actor.id,post.id).text.includes('After'),true)
  s.setMember(a.actor.id,c.id,b.actor.id,true);assert.equal(m.response(b.actor.id,upload.id).status,200)
  s.setMember(a.actor.id,c.id,b.actor.id,false);assert.throws(()=>m.response(b.actor.id,upload.id),/Not found/)
 }finally{s.close()}
})
