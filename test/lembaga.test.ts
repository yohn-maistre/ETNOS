import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Groups} from '../src/groups.ts'

test('a public lembaga page counts hidden private communities without naming them',()=>{
 const s=new Etnos(':memory:','https://etnos.example'),admin=s.provision('did:web:admin.example','Admin'),groups=new Groups(s,{stewardDid:admin.actor.did})
 try{
  const owner=s.provision('did:web:o.example','Owner'),member=s.provision('did:web:m.example','Member'),visitor=s.provision('did:web:v.example','Visitor')
  const g=groups.create(owner.actor.id,'Lembaga','Synthetic','institution','public')
  groups.createSpace(owner.actor.id,g.id,{title:'Terbuka',description:'x',visibility:'public'})
  groups.createSpace(owner.actor.id,g.id,{title:'Daftar',description:'x',visibility:'listed-private'})
  const h1=groups.createSpace(owner.actor.id,g.id,{title:'Rahasia satu',description:'x',visibility:'hidden-private'})
  groups.createSpace(owner.actor.id,g.id,{title:'Rahasia dua',description:'x',visibility:'hidden-private'})
  s.setMember(owner.actor.id,h1.id,member.actor.id,true)
  for(const reader of [undefined,visitor.actor.id]){
   const view=groups.read(reader,g.id)
   assert.equal(view.hiddenSpaces,2)
   assert.deepEqual(view.spaces.map(x=>x.title).sort(),['Daftar','Terbuka'])
   assert.ok(!JSON.stringify(view).includes('Rahasia'),'hidden names never appear')
  }
  const m=groups.read(member.actor.id,g.id);assert.equal(m.hiddenSpaces,1,'a member sees their own room listed, the other counted');assert.ok(m.spaces.some(x=>x.title==='Rahasia satu'))
  const hidden=groups.create(owner.actor.id,'Tersembunyi','Synthetic','collective','hidden-private')
  groups.createSpace(owner.actor.id,hidden.id,{title:'Rahasia tiga',description:'x',visibility:'hidden-private'})
  assert.equal(groups.read(owner.actor.id,hidden.id).hiddenSpaces,0,'a hidden lembaga shows no count')
 }finally{s.close()}
})
