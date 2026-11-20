import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {api} from '../src/api.ts'
import {Wiki} from '../src/wiki.ts'
import {Groups} from '../src/groups.ts'
import {resolveShare,shareTags,articleHTML,articleLD} from '../src/share.ts'
test('sharing reads only anonymous public views; protected identities, groups and wiki drafts stay generic',async()=>{
 const s=new Strata(':memory:','https://etnos.space'),owner=s.provision('did:web:sharing-owner.example','Public author'),secret=s.provision('did:web:sharing-secret.example','Secret person'),publicRoom=s.createCommunity(owner.actor.id,'Public room','Public description','public'),hidden=s.createCommunity(secret.actor.id,'Secret room','Secret description','hidden-private'),listed=s.createCommunity(secret.actor.id,'Listed private','Private description','listed-private'),g=new Groups(s),w=new Wiki(s),handler=api(s)
 const privatePost=s.createPost(secret.actor.id,hidden.id,'SECRET PRIVATE TEXT'),publicPost=s.createPost(owner.actor.id,publicRoom.id,'A **public** conversation'),group=g.create(secret.actor.id,'SECRET GROUP','Private','collective','hidden-private'),draft=w.createDraft(owner.actor.id,publicRoom.id,'SECRET DRAFT',{text:'Working text',citations:[],language:'id',perspective:'Author'})
 const read=async(path:string)=>{const r=await handler(new Request(s.base+path));if(!r.ok)throw Error();return r.json()},news=async()=>null
 try{
  for(const path of ['/square/'+privatePost.id,'/people/'+secret.actor.id,'/groups/'+group.id,'/wiki/'+draft.id,'/communities/'+hidden.id,'/communities/'+listed.id,'/messages','/find','/not-real']){
   const card=await resolveShare(path,read,news);assert.equal(card.title,'ETNOS',path);assert.equal(card.index,false,path);assert.equal(card.path,'/');assert.doesNotMatch(JSON.stringify(card),/SECRET|Secret|Private/)
  }
  const card=await resolveShare('/square/'+publicPost.id,read,news);assert.equal(card.title,'A public conversation');assert.equal(card.index,true);assert.equal(card.type,'article')
  assert.equal((await resolveShare('/people/'+owner.actor.id,read,news)).title,'Public author')
  const proposal=w.proposals(owner.actor.id,draft.id)[0];w.decide(owner.actor.id,proposal.id,proposal.digest,true);assert.equal((await resolveShare('/wiki/'+draft.id,read,news)).title,'SECRET DRAFT')
  s.hidePost(owner.actor.id,publicPost.id);assert.equal((await resolveShare('/square/'+publicPost.id,read,news)).index,false)
 }finally{s.close()}
})
test('sharing bounds metadata, escapes injected markup, honors warnings and pins public image ports',async()=>{
 const id='a'.repeat(36),community={visibility:'public'},base={id,community_id:'public',text:'Hidden spoiler',author:{name:'Writer'},content:{warning:'Spoiler'},media:[{url:'/v1/media/'+id,alt:'Spoiler'}]},news=async()=>null
 const warning=await resolveShare('/square/'+id,async path=>path.includes('communities')?community:base,news);assert.equal(warning.image,'/share/default.jpg');assert.doesNotMatch(JSON.stringify(warning),/Hidden spoiler/)
 const video=await resolveShare('/square/'+id,async path=>path.includes('communities')?community:{...base,media:[],content:{url:'https://youtu.be/ZWp5904RkJY'}},news);assert.equal(video.image,'/v1/video-preview/youtube/ZWp5904RkJY/image')
 const card=await resolveShare('/news/42',async()=>null,async()=>({id:'42',title:'Public news',summary:'x'.repeat(2000),image:'/v1/news/42/image?asset='+'a'.repeat(24),imageCredit:'Publisher'}));assert.equal(card.description.length,240);assert.ok(card.image.endsWith('a'.repeat(24)))
 const invalid=await resolveShare('/news/42',async()=>null,async()=>({id:'42',title:'News',image:'https://evil.example/image'}));assert.equal(invalid.image,'/share/news.jpg','an outside image is refused; the Kabar card is used')
 const html=shareTags({...card,title:'"><script>alert(1)</script>',description:'& " \' <'},'https://etnos.space');assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/og:url" content="https:\/\/etnos.space\/news\/42"/)
})
test('wiki text for crawlers is escaped, keeps headings and sources, and marks unreviewed pages', () => {
  const article = { title: 'Paniai <b>', text: '## Letak\n\nDanau Paniai [1] <script>x</script>\n\nBaris **dua**.', citations: ['https://id.wikipedia.org/wiki/Paniai?a="b"'], updated: 0, reviewed: false }
  const html = articleHTML(article)
  assert.match(html, /^<article data-prerender><h1>Paniai &lt;b&gt;<\/h1><p>Belum ditinjau\./)
  assert.match(html, /<h3>Letak<\/h3>/)
  assert.ok(!html.includes('<script>'))
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /<p>Baris dua\.<\/p>/)
  assert.match(html, /href="https:\/\/id\.wikipedia\.org\/wiki\/Paniai\?a=&quot;b&quot;"/)
  const ld = articleLD({ ...article, title: '</script><script>alert(1)' }, 'https://etnos.space/wiki/x')
  assert.ok(!ld.slice(0, -9).includes('</script>'))
  assert.equal(JSON.parse(ld.replace(/^<script type="application\/ld\+json">|<\/script>$/g, '')).headline, '</script><script>alert(1)')
})
