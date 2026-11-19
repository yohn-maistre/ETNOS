import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Strata} from '../src/store.ts'
import {Groups} from '../src/groups.ts'
import {KnowledgeModel,type KnowledgeSeed} from '../src/knowledge-model.ts'
import shipped from '../src/catalogues/tanah-papua-knowledge-seed.json' with {type:'json'}

const script=new URL('../scripts/observatory/build-knowledge-portal.ts',import.meta.url).pathname
const build=(args:string[])=>execFileSync(process.execPath,['--disable-warning=ExperimentalWarning',script,...args],{encoding:'utf8'})

test('static observatory files hold only commons witnesses and are the same on every build',()=>{
 const dir=mkdtempSync(join(tmpdir(),'portal-'))
 const s=new Strata(':memory:','https://portal.example.org')
 try{
  const steward=s.provision('did:web:steward.example','Steward'),host=s.provision('did:web:host.example','Host'),member=s.provision('did:web:member.example','Member')
  const m=new KnowledgeModel(s,new Groups(s,{stewardDid:steward.actor.did}))
  m.importSeed(steward.actor.id,shipped as KnowledgeSeed)
  const room=s.createCommunity(host.actor.id,'Open room','Synthetic','public');s.setMember(host.actor.id,room.id,member.actor.id,true)
  // A public, accepted statement resting on a teller's post: live in the API, never in a static file.
  const post=s.createPost(member.actor.id,room.id,'Kalimat uji dari penutur tentang Danau Paniai.')
  const w=m.citePost(host.actor.id,{postId:post.id,requestKey:'cite-000001'})
  const a=m.proposeAssertion(member.actor.id,{communityId:room.id,subject:'danau-paniai',predicate:'berada-di',object:'mee-pago',support:[w.excerpts[0]!.id],layer:'tuturan',requestKey:'assert-00001'})
  m.reviewAssertion(host.actor.id,a.id,{decision:'accept',revision:a.revision,requestKey:'review-00001'})
  const exported=m.graph(undefined,{publicOnly:true,excerpts:true})
  assert.ok(JSON.stringify(exported).includes('Kalimat uji dari penutur'))
  writeFileSync(join(dir,'export.json'),JSON.stringify(exported))
  build(['--from',join(dir,'export.json'),'--out',join(dir,'a')])
  const files=['graph.json','excerpts.json'].map(f=>readFileSync(join(dir,'a',f),'utf8')).join('\n')
  assert.ok(!files.includes('Kalimat uji dari penutur'))
  assert.ok(!files.includes(post.id)&&!files.includes('penutur":1'))
  const g=JSON.parse(readFileSync(join(dir,'a','graph.json'),'utf8'))
  assert.ok(!g.statements.some((x:{source:string;predicate:string;target:string})=>x.source==='danau-paniai'&&x.predicate==='berada-di'&&x.target==='mee-pago'))
  assert.ok(g.nodes.every((n:{gaps:string[]})=>n.gaps.includes('belum-ada-penutur')))
  assert.ok(g.questions.every((q:{status:string})=>q.status==='saran'))
  assert.ok(g.nullModel.z>3)
  // Same input, same files.
  build(['--from',join(dir,'export.json'),'--out',join(dir,'b')])
  for(const f of ['graph.json','excerpts.json'])assert.equal(readFileSync(join(dir,'a',f),'utf8'),readFileSync(join(dir,'b',f),'utf8'))
  // Two fresh imports of the shipped seed (new database ids each time) give the same files too.
  build(['--out',join(dir,'c')]);build(['--out',join(dir,'d')])
  for(const f of ['graph.json','excerpts.json'])assert.equal(readFileSync(join(dir,'c',f),'utf8'),readFileSync(join(dir,'d',f),'utf8'))
 }finally{s.close();rmSync(dir,{recursive:true,force:true})}
})
