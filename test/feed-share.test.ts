import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Ranking,spreadAgentPosts} from '../src/ranking.ts'

const isAgent=(x:string)=>x.startsWith('A')
const spread=(s:string)=>spreadAgentPosts(s.split(' '),isAgent).join(' ')

test('feed share rule holds agent posts back so none are adjacent and at most one in five',()=>{
 assert.equal(spread('A1 A2 H1 H2 H3 H4 H5 H6'),'A1 H1 H2 H3 H4 A2 H5 H6')
 assert.equal(spread('H1 A1 H2 A2 H3 H4 H5 H6 A3'),'H1 A1 H2 H3 H4 H5 A2 H6 A3')
 assert.equal(spread('H1 H2 H3'),'H1 H2 H3');assert.equal(spread('A1 H1'),'A1 H1')
 // Nothing is dropped and each kind keeps its own order.
 const input='A1 A2 A3 H1 A4 H2 H3 H4 H5 H6 H7 H8 H9 H10 H11 H12 H13 H14'.split(' '),out=spreadAgentPosts(input,isAgent)
 assert.deepEqual([...out].sort(),[...input].sort());assert.deepEqual(out.filter(isAgent),input.filter(isAgent));assert.deepEqual(out.filter(x=>!isAgent(x)),input.filter(x=>!isAgent(x)))
 for(let i=0;i<out.length;i++)if(isAgent(out[i]))for(let j=Math.max(0,i-4);j<i;j++)assert.equal(isAgent(out[j]),false,out.join(' '))
})

test('a feed that is only agent posts is left as it is, and leftover agent posts follow when people run out',()=>{
 assert.equal(spread('A1 A2 A3'),'A1 A2 A3')
 assert.equal(spread('A1 A2 A3 H1'),'A1 H1 A2 A3')
 assert.deepEqual(spreadAgentPosts([],isAgent),[])
 const mixed=Array.from({length:40},(_,i)=>i%3===0?'A'+i:'H'+i);assert.equal(spreadAgentPosts(mixed,isAgent).length,40)
})

test('public feeds and discovery apply the rule at read time without losing posts or the cursor',()=>{
 let now=Date.parse('2026-11-19T01:00:00Z');const s=new Etnos(':memory:','https://share.example.org',()=>now),owner=s.provision('did:web:share-owner.example','Synthetic operator'),person=s.provision('did:web:share-person.example','Synthetic person'),room=s.createCommunity(owner.actor.id,'Public room','Synthetic','public',true,'open')
 const access=new AgentAccess(s),a=access.enroll(owner.actor.id,{communityId:room.id,name:'Synthetic Aksara',role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id);const grant=s.mandate(owner.actor.id,a.agent_id,room.id,'Public posts',now+86400000,20)
 s.join(person.actor.id,room.id)
 try{
  // Oldest to newest: twelve people's posts, four agent posts in a row, then four people's posts.
  const made:string[]=[]
  for(const [who,n] of [['p',12],['a',4],['p',4]] as const)for(let i=0;i<n;i++){now+=1000;made.push(who==='a'?s.createPost(a.agent_id,room.id,'Agent post '+made.length,undefined,grant).id:s.createPost(person.actor.id,room.id,'Person post '+made.length).id)}
  const kinds=(items:{actorKind:string}[])=>items.map(p=>p.actorKind==='agent'?'A':'H').join('')
  const page=s.feedPage(undefined,{rootsOnly:true,limit:20});assert.equal(page.items.length,20);assert.deepEqual(page.items.map(p=>p.id).sort(),[...made].sort())
  assert.ok(!/AA/.test(kinds(page.items)),kinds(page.items))
  for(let i=0;i<20;i++)if(page.items[i].actorKind==='agent')assert.ok(!kinds(page.items.slice(Math.max(0,i-4),i)).includes('A'),kinds(page.items))
  // Paging still reaches every post once: held posts stay within their page.
  const first=s.feedPage(undefined,{rootsOnly:true,limit:10}),second=s.feedPage(undefined,{rootsOnly:true,limit:10,cursor:first.nextCursor!})
  assert.deepEqual([...first.items,...second.items].map(p=>p.id).sort(),[...made].sort())
  const legacy=s.feed();assert.equal(legacy.length,20);assert.ok(!/AA/.test(kinds(legacy)))
  const explored=new Ranking(s).explore({sort:'new',limit:20});assert.equal(explored.items.length,20);assert.ok(!/AA/.test(kinds(explored.items)),kinds(explored.items))
  // An agent's own page is only agent posts and is unchanged.
  const own=s.feedPage(undefined,{authorId:a.agent_id,limit:6});assert.equal(own.items.length,4);assert.ok(own.items.every((p,i)=>!i||p.created<=own.items[i-1].created))
 }finally{s.close()}
})
