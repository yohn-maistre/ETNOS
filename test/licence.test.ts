import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Kamus} from '../src/kamus.ts'
import {PetaKata} from '../src/peta-kata.ts'
import {kamusLexicon} from '../src/kamus-data.ts'
import {forSale,kamusCsv,kamusCldf,type KamusExport} from '../src/kamus-export.ts'
import {isNonCommercial,paidSafe,forPaidOutput,assertPaidSafe,NC_LABEL} from '../src/licence.ts'
import wordlists from '../seed/kamus/tanah-papua-wordlists.json' with {type:'json'}

type WL={datasets:{key:string;licence:string;nonCommercial?:boolean}[];languages:Record<string,{forms:(string|number)[][]}>}
const wl=wordlists as unknown as WL

test('NonCommercial licences are recognised in every spelling the sources use',()=>{
 for(const l of ['CC BY-NC 4.0','CC BY-NC 3.0','CC-BY-NC-4.0','CC BY-NC-SA 4.0','Attribution-NonCommercial 4.0 International'])assert.equal(isNonCommercial(l),true,l)
 for(const l of ['CC BY 4.0','CC BY-SA 4.0','CC0 1.0','Public domain'])assert.equal(isNonCommercial(l),false,l)
 assert.equal(paidSafe(''),false,'a row without a licence never goes into a paid output')
 assert.equal(NC_LABEL,'CC BY-NC 4.0 · tidak untuk penggunaan komersial')
})

test('Papuan Voices is in the wordlists as a NonCommercial dataset and every one of its forms points at it',()=>{
 const pv=wl.datasets.findIndex(d=>d.key==='papuanvoices')
 assert.ok(pv>=0)
 assert.equal(wl.datasets[pv]!.licence,'CC BY-NC 4.0')
 assert.equal(wl.datasets[pv]!.nonCommercial,true)
 for(const d of wl.datasets)if(d.key!=='papuanvoices')assert.equal(isNonCommercial(d.licence),false,d.key)
 const forms=Object.values(wl.languages).flatMap(l=>l.forms).filter(f=>f[2]===pv)
 assert.ok(forms.length>500)
})

test('Peta Kata words carry their licence, and Papuan Voices words are marked nc',()=>{
 const s=new Etnos(':memory:','https://forum.example')
 try{
  const peta=new PetaKata(s,kamusLexicon())
  const biak=peta.languageWords('biak1248')!
  const pv=biak.words.filter(w=>w.dataset==='papuanvoices'),open=biak.words.filter(w=>w.dataset!=='papuanvoices')
  assert.ok(pv.length&&open.length)
  for(const w of pv){assert.equal(w.licence,'CC BY-NC 4.0');assert.equal(w.nc,true)}
  for(const w of open){assert.equal(w.licence,'CC BY 4.0');assert.equal(w.nc,undefined)}
  // A paid output built from these words keeps only the open ones.
  assert.deepEqual(forPaidOutput(biak.words).map(w=>w.row),open.map(w=>w.row))
  assert.throws(()=>assertPaidSafe('situs-berbayar',biak.words),/may not be used in anything paid/)
 }finally{s.close()}
})

test('a Kamus seeded from Papuan Voices keeps the NC licence on each entry, and an export for sale leaves those entries out',()=>{
 let opId=''
 const s=new Etnos(':memory:','https://forum.example'),k=new Kamus(s,kamusLexicon(),{operator:id=>id===opId})
 try{
  const a=s.provision('did:web:owner.example','Owner');opId=a.actor.id
  const room=s.createCommunity(a.actor.id,'Biak (fixture)','Ruang bahasa uji','public',true)
  k.setSettings(a.actor.id,room.id,{language:'biak1248'})
  k.importSeed(a.actor.id,room.id)
  const rows=s.all<{source:string;licence:string}>('SELECT source,licence FROM kamus_entries WHERE community_id=?',room.id)
  const pv=rows.filter(r=>r.source==='seed:papuanvoices')
  assert.ok(pv.length>0)
  for(const r of pv)assert.equal(r.licence,'CC BY-NC 4.0')
  for(const r of rows.filter(r=>r.source!=='seed:papuanvoices'))assert.equal(r.licence,'CC BY 4.0')
 }finally{s.close()}
 const row=(licence:string,headword:string)=>({id:headword,headword,variants:[],forms:[],gloss:'air',definition:'',wordClass:'benda',domain:'',dialect:'',examples:[],source:'seed:x',licence,status:'checked',sensitive:false})
 const x:KamusExport={language:'biak1248',languageName:'Biak',community:'Biak (fixture)',rows:[row('CC BY 4.0','war'),row('CC BY-NC 4.0','wararf'),row('CC BY-NC 3.0','ekagi'),row('','tanpa')]}
 const sale=forSale(x)
 assert.deepEqual(sale.rows.map(r=>r.headword),['war'])
 assert.ok(!kamusCsv(sale,'https://etnos.example').includes('wararf'))
 const free=new TextDecoder().decode(kamusCldf(x,'https://etnos.example','2026-11-27'))
 assert.match(free,/NonCommercial licence \(CC BY-NC 4\.0, CC BY-NC 3\.0\)/)
 const paid=new TextDecoder().decode(kamusCldf(sale,'https://etnos.example','2026-11-27'))
 assert.ok(!paid.includes('wararf')&&!paid.includes('ekagi'))
 assert.match(paid,/meant to be offered for sale/)
})
