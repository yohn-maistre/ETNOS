import test from 'node:test'
import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {Etnos} from '../src/store.ts'
import {api} from '../src/api.ts'
import {contentInput} from '../src/post-content.ts'
import {safeExternalHttpsUrl} from '../src/saluran.ts'
import {kamusLexicon} from '../src/kamus-data.ts'
import {image as TINY_WEBP} from './media-fixture.ts'

const ORIGIN='https://etnos.test'

function jsonReq(method:string,path:string,token?:string,body?:unknown){
 const headers:Record<string,string>={origin:ORIGIN}
 if(token)headers.authorization='Bearer '+token
 if(body!==undefined)headers['content-type']='application/json'
 return new Request(ORIGIN+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined})
}

const OGG_BYTES=Buffer.concat([Buffer.from('OggS\x00\x02'),Buffer.alloc(22,0),Buffer.from('OpusHead')]).toString('base64')

test('Saluran: Usulan contract, Pl@ntNet private refusal, and Kurasi Balik W3C JSON-LD isolation',async()=>{
 const store=new Etnos(':memory:',ORIGIN)
 try{
  const steward=store.provision('did:web:steward.example','Pengurus')
  const member=store.provision('did:web:member.example','Anggota')
  const pub=store.createCommunity(steward.actor.id,'Flora Nabire','Komunitas tumbuhan','public')
  const priv=store.createCommunity(steward.actor.id,'Arsip Privat','Tertutup','hidden-private')
  store.setMember(steward.actor.id,pub.id,member.actor.id,true,'member')
  store.setMember(steward.actor.id,priv.id,member.actor.id,true,'member')
  const sTok=steward.token
  const mTok=member.token

  let plantNetCalls=0
  const fakeFetch:typeof fetch=async(input)=>{
   const u=typeof input==='string'?input:input instanceof URL?input.href:input.url
   if(u.includes('plantnet.org')){
    plantNetCalls++
    return Response.json({results:[{score:0.87,species:{scientificNameWithoutAuthor:'Pandanus conoideus',commonNames:['Buah merah']}}]})
   }
   if(u.includes('museum.example/manifest.json')){
    return Response.json({
     '@context':'http://iiif.io/api/presentation/3/context.json',
     label:{en:['Noken dari Danau Paniai (1939)']},
     attribution:'Tropenmuseum',
     rights:'https://creativecommons.org/licenses/by/4.0/',
     thumbnail:[{id:'https://museum.example/thumb.jpg'}],
    })
   }
   return new Response('not found',{status:404})
  }

  const handler=api(store,{plantNetKey:()=>'test-plantnet-key-1234',saluranFetcher:fakeFetch,stewardDid:'did:web:steward.example'})

  // Default saluran settings are OFF
  const defRes=await handler(jsonReq('GET',`/v1/communities/${pub.id}/saluran`,mTok))
  assert.equal(defRes.status,200)
  assert.deepEqual(await defRes.json(),{plantId:false,kurasiBalik:false,updated:null})

  // Steward cannot enable Pl@ntNet on a private community
  const privEnable=await handler(jsonReq('POST',`/v1/communities/${priv.id}/saluran`,sTok,{plantId:true}))
  assert.equal(privEnable.status,403)

  // Non-steward cannot change settings
  const nonSteward=await handler(jsonReq('POST',`/v1/communities/${pub.id}/saluran`,mTok,{plantId:true}))
  assert.equal(nonSteward.status,403)

  // Steward enables both channels on public community and kurasiBalik only on private community
  assert.equal((await handler(jsonReq('POST',`/v1/communities/${pub.id}/saluran`,sTok,{plantId:true,kurasiBalik:true}))).status,200)
  assert.equal((await handler(jsonReq('POST',`/v1/communities/${priv.id}/saluran`,sTok,{kurasiBalik:true}))).status,200)

  // Usulan contract creates Periksa card with source origin
  const usulanRes=await handler(jsonReq('POST',`/v1/communities/${pub.id}/saluran/usulan`,mTok,{
   jenis:'kata',
   subject:'kuansu',
   statement:'Nama buah merah dalam bahasa setempat di Lembah Baliem.',
   source:'Catatan lapangan',
  }))
  assert.equal(usulanRes.status,200)
  const usulan=await usulanRes.json() as {kind:string;origin:string;statement:string}
  assert.equal(usulan.kind,'word')
  assert.equal(usulan.origin,'source')
  assert.ok(usulan.statement.startsWith('[kata]'))

  // Upload public photo and run Pl@ntNet -> creates Periksa card
  const upPub=await handler(jsonReq('POST','/v1/media',mTok,{communityId:pub.id,bytes:TINY_WEBP,alt:'Buah merah'}))
  assert.equal(upPub.status,200)
  const pubMedia=await upPub.json() as {id:string}
  const idRes=await handler(jsonReq('POST',`/v1/communities/${pub.id}/saluran/plant-id`,mTok,{mediaId:pubMedia.id,organ:'fruit'}))
  assert.equal(idRes.status,200)
  const idBody=await idRes.json() as {species:{scientificName:string}[];claim:{subject:string;origin:string;statement:string}}
  assert.equal(idBody.species[0].scientificName,'Pandanus conoideus')
  assert.equal(idBody.claim.subject,'Pandanus conoideus')
  assert.equal(idBody.claim.origin,'source')
  assert.ok(idBody.claim.statement.includes('Buah merah'))
  assert.equal(plantNetCalls,1)

  // Private photo upload NEVER leaves to Pl@ntNet
  const upPriv=await handler(jsonReq('POST','/v1/media',mTok,{communityId:priv.id,bytes:TINY_WEBP,alt:'Rahasia'}))
  assert.equal(upPriv.status,200)
  const privMedia=await upPriv.json() as {id:string}
  const privId=await handler(jsonReq('POST',`/v1/communities/${priv.id}/saluran/plant-id`,mTok,{mediaId:privMedia.id}))
  assert.equal(privId.status,403)
  assert.equal(plantNetCalls,1)

  // IIIF inspect parses v3 manifest and blocks private IPs
  const iiifRes=await handler(jsonReq('POST','/v1/saluran/iiif-inspect',mTok,{manifestUrl:'https://museum.example/manifest.json'}))
  assert.equal(iiifRes.status,200)
  const iiif=await iiifRes.json() as {label:string;thumbnail:string|null}
  assert.equal(iiif.label,'Noken dari Danau Paniai (1939)')
  assert.equal(iiif.thumbnail,'https://museum.example/thumb.jpg')
  assert.throws(()=>safeExternalHttpsUrl('https://127.0.0.1/manifest.json'))
  assert.throws(()=>safeExternalHttpsUrl('http://museum.example/manifest.json'))

  // Kurasi Balik annotations: add on public and private communities
  const targetUri='https://museum.example/object/1939-noken'
  const pubAnnoRes=await handler(jsonReq('POST',`/v1/communities/${pub.id}/kurasi`,mTok,{
   targetUri,
   targetLabel:'Noken Danau Paniai',
   body:'Anyaman kulit kayu genemo untuk membawa hasil kebun, bukan tas upacara.',
   localName:'Agia',
   language:'ekari',
  }))
  assert.equal(pubAnnoRes.status,200)
  const pubAnno=await pubAnnoRes.json() as {id:string}

  const privAnnoRes=await handler(jsonReq('POST',`/v1/communities/${priv.id}/kurasi`,mTok,{
   targetUri,
   targetLabel:'Noken Danau Paniai',
   body:'Catatan internal tertutup keluarga.',
  }))
  assert.equal(privAnnoRes.status,200)

  // W3C JSON-LD export returns ONLY public active annotations, NEVER private community notes
  const ldRes=await handler(jsonReq('GET',`/v1/kurasi/annotations.jsonld?target=${encodeURIComponent(targetUri)}`))
  assert.equal(ldRes.status,200)
  assert.ok(ldRes.headers.get('content-type')?.includes('application/ld+json'))
  const ld=await ldRes.json() as {'@context':string;type:string;items:{id:string;body:{value:string}}[]}
  assert.equal(ld['@context'],'http://www.w3.org/ns/anno.jsonld')
  assert.equal(ld.type,'AnnotationPage')
  assert.equal(ld.items.length,1)
  assert.ok(ld.items[0].body.value.includes('Agia'))
  assert.ok(!JSON.stringify(ld).includes('Catatan internal'))

  // Withdrawing public annotation removes it from JSON-LD export immediately
  assert.equal((await handler(jsonReq('POST',`/v1/kurasi/${pubAnno.id}/withdraw`,mTok,{}))).status,200)
  const ldAfter=await (await handler(jsonReq('GET',`/v1/kurasi/annotations.jsonld?target=${encodeURIComponent(targetUri)}`))).json() as {items:unknown[]}
  assert.equal(ldAfter.items.length,0)
 }finally{store.close()}
})

test('Peta Kata: joins public non-sensitive Kamus + voice clips and isolates private/sensitive/restricted data',async()=>{
 const store=new Etnos(':memory:',ORIGIN)
 try{
  const steward=store.provision('did:web:steward.example','Pengurus')
  const pub=store.createCommunity(steward.actor.id,'Bahasa Ekari','Komunitas bahasa Ekari','public')
  const priv=store.createCommunity(steward.actor.id,'Bahasa Rahasia','Privat','hidden-private')
  const sTok=steward.token
  const handler=api(store,{stewardDid:'did:web:steward.example'})

  // Set language via operator kamus settings on both public and private communities
  assert.equal((await handler(jsonReq('POST',`/v1/communities/${pub.id}/kamus/settings`,sTok,{language:'ekar1243'}))).status,200)
  assert.equal((await handler(jsonReq('POST',`/v1/communities/${priv.id}/kamus/settings`,sTok,{language:'ekar1243'}))).status,200)

  // Insert entries: public normal, public sensitive, and private normal
  const now=store.clock()
  store.run(
   "INSERT INTO kamus_entries(id,community_id,lemma,norm,gloss,pos,context,source,licence,page,state,claim_id,uses,speakers,examples,created,updated,sensitive) VALUES(?,?,?,?,?,?,?,?,?,NULL,'proposed',NULL,1,1,'[]',?,?,?)",
   'e-pub',pub.id,'uwo','uwo','air, sungai','benda','Alam','room','',now,now,0,
  )
  store.run(
   "INSERT INTO kamus_entries(id,community_id,lemma,norm,gloss,pos,context,source,licence,page,state,claim_id,uses,speakers,examples,created,updated,sensitive) VALUES(?,?,?,?,?,?,?,?,?,NULL,'proposed',NULL,1,1,'[]',?,?,?)",
   'e-sens',pub.id,'sakralair','sakralair','air suci rahasia','benda','Adat','room','',now,now,1,
  )
  store.run(
   "INSERT INTO kamus_entries(id,community_id,lemma,norm,gloss,pos,context,source,licence,page,state,claim_id,uses,speakers,examples,created,updated,sensitive) VALUES(?,?,?,?,?,?,?,?,?,NULL,'proposed',NULL,1,1,'[]',?,?,?)",
   'e-priv',priv.id,'warprivat','warprivat','air privat','benda','Alam','room','',now,now,0,
  )

  // Attach public voice clip to 'uwo'
  const clipRes=await handler(jsonReq('POST','/v1/voice',sTok,{communityId:pub.id,bytes:OGG_BYTES,durationMs:1800,speaker:'Mama Yuliana',protocol:'public'}))
  assert.equal(clipRes.status,200)
  const clip=await clipRes.json() as {id:string}
  assert.equal((await handler(jsonReq('POST',`/v1/communities/${pub.id}/kamus/voice`,sTok,{word:'uwo',clipId:clip.id}))).status,200)

  // Query Peta Kata anonymously for concept 'air'
  const conceptsRes=await handler(jsonReq('GET','/v1/peta-kata/concepts'))
  assert.equal(conceptsRes.status,200)
  const conceptsBody=await conceptsRes.json() as {concepts:{id:string;count:number}[]}
  assert.equal(conceptsBody.concepts.length,100)

  const lookupRes=await handler(jsonReq('GET','/v1/peta-kata?concept=air'))
  assert.equal(lookupRes.status,200)
  const lookup=await lookupRes.json() as {community:{lemma:string;lang:string;voice:{id:string}|null}[];words:{lang:string;form:string;dataset:string;ref:number}[];refs:string[]}
  const uwo=lookup.community.find(w=>w.lemma==='uwo')
  assert.ok(uwo,'public word uwo should appear')
  assert.equal(uwo.lang,'ekar1243')
  assert.equal(uwo.voice?.id,clip.id)
  assert.ok(!lookup.community.some(w=>w.lemma==='sakralair'),'sensitive word must never appear in Peta Kata')
  assert.ok(!lookup.community.some(w=>w.lemma==='warprivat'),'private community word must never appear in Peta Kata')
  assert.ok(!lookup.words.some(w=>w.form==='sakralair'||w.form==='warprivat'))
  // Published forms carry their dataset and original publication.
  assert.ok(lookup.words.length>100)
  for(const w of lookup.words){assert.ok(['tng','abvd','berry1987'].includes(w.dataset));assert.equal(typeof lookup.refs[w.ref],'string')}
 }finally{store.close()}
})

test('Peta Kata: published wordlists by concept and language, honest coverage, licensed datasets only',async()=>{
 const store=new Etnos(':memory:',ORIGIN)
 try{
  const handler=api(store)
  const concepts=await (await handler(jsonReq('GET','/v1/peta-kata/concepts'))).json() as {datasets:{key:string;licence:string}[];concepts:{key:string;count:number}[];languages:{code:string;name:string;glottologName:string;concepts:number}[]}
  assert.deepEqual(concepts.datasets.map(d=>d.licence),['CC BY 4.0','CC BY 4.0','CC BY 4.0'])
  assert.equal(concepts.languages.length,256)
  const empty=concepts.languages.filter(l=>l.concepts===0)
  assert.ok(empty.length>0&&empty.length<256,'languages without data stay listed with zero concepts')
  assert.equal(concepts.languages.find(l=>l.code==='west2594')?.name,'Lani')
  assert.equal(concepts.languages.find(l=>l.code==='west2594')?.glottologName,'Western Dani')
  const babi=await (await handler(jsonReq('GET','/v1/peta-kata?concept=babi'))).json() as {concept:{key:string};words:{lang:string}[]}
  assert.equal(babi.concept.key,'babi')
  const langs=new Set(babi.words.map(w=>w.lang))
  for(const l of empty)assert.ok(!langs.has(l.code),'no word is shown for a language without data')
  // Old links with a Leipzig-Jakarta number still work.
  assert.equal(((await (await handler(jsonReq('GET','/v1/peta-kata?concept=4'))).json()) as {concept:{key:string}}).concept.key,'air')
  const lani=await (await handler(jsonReq('GET','/v1/peta-kata/bahasa/west2594'))).json() as {language:{name:string};words:{concept:string;form:string}[]}
  assert.ok(lani.words.some(w=>w.concept==='air'))
  assert.equal((await handler(jsonReq('GET','/v1/peta-kata/bahasa/abcd1234'))).status,404)
 }finally{store.close()}
})

test('Kamus seeds include the published wordlists, marked as not yet checked by speakers',()=>{
 const seeds=kamusLexicon().seeds
 assert.ok(Object.keys(seeds).length>150)
 const lani=seeds.west2594!
 assert.ok(lani.entries.some(e=>e.gloss_id==='air'&&e.source==='tng'))
 assert.equal(lani.sources.tng?.licence,'CC BY 4.0')
 assert.match(lani.sources.tng?.note??'',/belum diperiksa penutur/)
 assert.ok(seeds.ekar1243!.sources.steltenpool1969,'Ekari keeps its own seed')
})

test('PostContent: validates peluang and bagasi fields and enforces mutual exclusivity',()=>{
 const now=Date.now()
 const pl=contentInput({peluang:{category:'beasiswa',organizer:'LPDP Papua',location:'Jayapura',deadline:now+86400000,applyUrl:'https://beasiswa.example/daftar'}},now)
 assert.equal(pl.peluang?.category,'beasiswa')
 assert.equal(pl.peluang?.organizer,'LPDP Papua')

 const bg=contentInput({bagasi:{kind:'bawa',from:'Jayapura',to:'Wamena',departAt:now+86400000,capacity:'5 kg'}},now)
 assert.equal(bg.bagasi?.kind,'bawa')
 assert.equal(bg.bagasi?.to,'Wamena')

 assert.throws(()=>contentInput({peluang:{category:'invalid',organizer:'X',location:''}},now))
 assert.throws(()=>contentInput({bagasi:{kind:'bawa',from:'Jayapura',to:'',capacity:''}},now))
 assert.throws(()=>contentInput({peluang:{category:'hibah',organizer:'Y',location:''},bagasi:{kind:'titip',from:'A',to:'B',capacity:''}},now))
})
