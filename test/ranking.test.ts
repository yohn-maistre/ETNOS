import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Ranking,discussionRank,type RankCandidate} from '../src/ranking.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {api} from '../src/api.ts'
const hour=3600000
const candidate=(patch:Partial<RankCandidate>={}):RankCandidate=>({id:'a',author_id:'a',community_id:'c',created:0,score:0,humanReplies:0,latestReply:0,activeAuthors:1,...patch})
test('transparent ranking favors freshness, caps votes/replies, and bounds activity resurrection',()=>{
 const now=100*hour
 assert.ok(discussionRank(candidate({created:99*hour}),'balanced',now)>discussionRank(candidate({created:0,score:50}),'balanced',now))
 assert.equal(discussionRank(candidate({score:50,humanReplies:8}),'active',now),discussionRank(candidate({score:10000,humanReplies:10000}),'active',now))
 assert.equal(discussionRank(candidate({latestReply:now}),'active',now),discussionRank(candidate({latestReply:48*hour}),'active',now))
 assert.ok(discussionRank(candidate({activeAuthors:1}),'balanced',now)>discussionRank(candidate({activeAuthors:100}),'balanced',now))
})
test('public discovery excludes hidden/private/deleted/warned roots, preserves newest order and softly diversifies',async()=>{
 let now=Date.now();const s=new Etnos(':memory:','https://rank.example.org',()=>now),a=s.provision('did:web:rank-owner.example','One'),b=s.provision('did:web:rank-other.example','Two'),c=s.createCommunity(a.actor.id,'Public','Public','public'),d=s.createCommunity(b.actor.id,'Other public','Public','public'),hidden=s.createCommunity(a.actor.id,'Hidden','Secret','hidden-private'),rank=new Ranking(s)
 try{
  const other=s.createPost(b.actor.id,d.id,'A different neighbor');now+=hour
  for(let i=0;i<5;i++){s.createPost(a.actor.id,c.id,'Public post '+i);now++}
  s.createPost(a.actor.id,c.id,'Warning body',undefined,undefined,{content:{format:'plain',warning:'Sensitive fixture'}})
  const secret=s.createPost(a.actor.id,hidden.id,'Protected language source title'),moderated=s.createPost(a.actor.id,c.id,'Hidden moderation wording'),deleted=s.createPost(a.actor.id,c.id,'Deleted wording')
  s.run('UPDATE posts SET hidden=1 WHERE id=?',moderated.id);s.run('UPDATE posts SET deleted=1 WHERE id=?',deleted.id)
  const balanced=rank.explore({limit:4});assert.equal(balanced.items.length,4);assert.ok(balanced.items.some(p=>p.id===other.id));assert.equal(balanced.personalized,false)
  const json=JSON.stringify(balanced);for(const value of [secret.id,'Protected language','Hidden moderation wording','Deleted wording'])assert.equal(json.includes(value),false)
  const newest=rank.explore({sort:'new',limit:5});assert.ok(newest.items.every((p,i)=>!i||p.created<=newest.items[i-1].created))
  assert.throws(()=>rank.explore({communityId:hidden.id}));assert.throws(()=>rank.explore({sort:'rage'}));assert.throws(()=>rank.explore({limit:25}))
  const res=await api(s)(new Request(s.base+'/v1/discovery/posts?sort=active&limit=4'));assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store')
  s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?",c.id);assert.ok(rank.explore().items.every(p=>p.community_id!==c.id))
 }finally{s.close()}
})
test('reply features count distinct non-author humans and never agent chatter or hidden replies',()=>{
 const s=new Etnos(':memory:'),a=s.provision('did:web:rank-root.example','Author'),b=s.provision('did:web:rank-replier.example','Reply'),c=s.createCommunity(a.actor.id,'Public','Public','public',true,'open')
 try{
  s.join(b.actor.id,c.id);const root=s.createPost(a.actor.id,c.id,'Root')
  for(let i=0;i<5;i++)s.createPost(b.actor.id,c.id,'One human repeated '+i,root.id)
  s.createPost(a.actor.id,c.id,'Self reply',root.id)
  const access=new AgentAccess(s),agent=access.enroll(a.actor.id,{communityId:c.id,name:'Synthetic agent',family:'aksara',role:'worker'});access.admit(a.actor.id,agent.agent_id);const mandate=s.mandate(a.actor.id,agent.agent_id,c.id,'Synthetic replies',s.clock()+hour);s.createPost(agent.agent_id,c.id,'Agent chatter',root.id,mandate)
  const result=new Ranking(s).explore({sort:'active'});assert.equal(result.items.length,1);assert.equal(result.items[0].discovery.reason,'Percakapan aktif')
  s.run('UPDATE posts SET hidden=1 WHERE parent_id IS NOT NULL AND author_id!=?',agent.agent_id);assert.equal(new Ranking(s).explore({sort:'active'}).items[0].discovery.reason,'Baru dibagikan')
 }finally{s.close()}
})
