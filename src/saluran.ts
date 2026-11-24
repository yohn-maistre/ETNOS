/** Saluran: opt-in external knowledge channels that feed into Periksa or export W3C Web Annotations.
 *
 * Three rules hold everywhere:
 * 1. Opt-in per community, off by default; only human stewards flip a channel on or off.
 * 2. Private communities NEVER send photos to Pl@ntNet and NEVER appear in public W3C JSON-LD exports.
 * 3. Every external suggestion enters as an unverified Periksa card ('source' origin); members settle it. */
import {randomUUID} from 'node:crypto'
import {EtnosCore,Fault} from './core.ts'
import {Periksa,type Claim,type ClaimKind} from './periksa.ts'

export const USULAN_KINDS=['kata','tentang','entri-baru','nilai'] as const
export type UsulanJenis=typeof USULAN_KINDS[number]

export type UsulanInput={
 jenis:UsulanJenis
 subject:string
 statement:string
 source:string
 postId?:string
}

export type SaluranSettings={
 plantId:boolean
 kurasiBalik:boolean
 updated:number|null
}

export type MuseumAnnotation={
 id:string
 communityId:string
 communityTitle:string
 targetUri:string
 targetLabel:string
 author:{id:string;name:string}
 body:string
 localName:string
 language:string
 licence:string
 state:'active'|'withdrawn'
 created:number
 updated:number
}

type AnnotationRow={
 id:string;community_id:string;target_uri:string;target_label:string;author_id:string
 body:string;local_name:string;language:string;licence:string;state:'active'|'withdrawn'
 created:number;updated:number
}

export type IiifSummary={
 manifestUrl:string
 label:string
 attribution:string
 licence:string
 thumbnail:string|null
}

export type SaluranOptions={
 plantNetKey?:()=>Promise<string|undefined>|string|undefined
 fetcher?:typeof fetch
 origin?:string
}

const clean=(v:unknown,max:number,label:string)=>{
 if(typeof v!=='string')throw new Fault(400,label+' required')
 const s=v.replace(/\s+/g,' ').trim()
 if(!s)throw new Fault(400,label+' required')
 if(s.length>max)throw new Fault(400,label+' too long')
 return s
}

const optClean=(v:unknown,max:number)=>{
 if(v===undefined||v===null)return ''
 if(typeof v!=='string')throw new Fault(400,'Invalid text field')
 const s=v.replace(/\s+/g,' ').trim()
 if(s.length>max)throw new Fault(400,'Field too long')
 return s
}

export function safeExternalHttpsUrl(raw:unknown):string{
 if(typeof raw!=='string'||!raw.trim()||raw.length>2048)throw new Fault(400,'Valid https URL required')
 let u:URL
 try{u=new URL(raw.trim())}catch{throw new Fault(400,'Valid https URL required')}
 if(u.protocol!=='https:'||u.username||u.password)throw new Fault(400,'Only https URLs are allowed')
 const h=u.hostname.toLowerCase()
 if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h)||h.startsWith('[')||h.includes(':')){
  throw new Fault(400,'Private network URLs are not allowed')
 }
 return u.href
}

const USULAN_TO_CLAIM_KIND:Record<UsulanJenis,ClaimKind>={
 kata:'word',
 tentang:'other',
 'entri-baru':'wiki',
 nilai:'other',
}

function iiifText(v:unknown):string{
 if(typeof v==='string')return v.trim()
 if(Array.isArray(v))return v.map(iiifText).filter(Boolean).join(', ')
 if(v&&typeof v==='object'){
  const rec=v as Record<string,unknown>
  if('@value' in rec)return iiifText(rec['@value'])
  for(const k of ['id','in','en','none']){if(k in rec)return iiifText(rec[k])}
  const first=Object.values(rec)[0]
  if(first!==undefined)return iiifText(first)
 }
 return ''
}

export class Saluran{
 private store:EtnosCore
 private periksa:Periksa
 private opts:SaluranOptions
 constructor(store:EtnosCore,opts:SaluranOptions={}){
  this.store=store
  this.periksa=new Periksa(store)
  this.opts=opts
 }

 settings(actor:string|undefined,communityId:string):SaluranSettings{
  const c=this.store.community(communityId)
  if(!this.store.canRead(actor,c))throw new Fault(404,'Not found')
  const r=this.store.get<{plant_id:number;kurasi_balik:number;updated:number}>('SELECT plant_id,kurasi_balik,updated FROM saluran_settings WHERE community_id=?',communityId)
  return {plantId:!!r?.plant_id,kurasiBalik:!!r?.kurasi_balik,updated:r?.updated??null}
 }

 setSettings(actor:string,communityId:string,b:{plantId?:unknown;kurasiBalik?:unknown}):SaluranSettings{
  const s=this.store
  return s.tx(()=>{
   s.requireSteward(actor,communityId)
   if(s.actor(actor).kind!=='human')throw new Fault(403,'Human steward required')
   const c=s.community(communityId)
   const cur=s.get<{plant_id:number;kurasi_balik:number}>('SELECT plant_id,kurasi_balik FROM saluran_settings WHERE community_id=?',communityId)
   const nextPlant=typeof b.plantId==='boolean'?b.plantId:!!cur?.plant_id
   const nextKurasi=typeof b.kurasiBalik==='boolean'?b.kurasiBalik:!!cur?.kurasi_balik
   if(nextPlant&&c.visibility!=='public')throw new Fault(403,'Plant identification is only available for public communities')
   s.run(
    'INSERT INTO saluran_settings(community_id,plant_id,kurasi_balik,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(community_id) DO UPDATE SET plant_id=excluded.plant_id,kurasi_balik=excluded.kurasi_balik,updated=excluded.updated,updated_by=excluded.updated_by',
    communityId,nextPlant?1:0,nextKurasi?1:0,s.clock(),actor,
   )
   s.audit(actor,'saluran.settings',communityId)
   return this.settings(actor,communityId)
  })
 }

 /** Unified Usulan contract: turns an external channel suggestion into a Periksa card so members decide. */
 proposeUsulan(actor:string,communityId:string,input:UsulanInput):Claim{
  if(!USULAN_KINDS.includes(input.jenis))throw new Fault(400,'Unknown usulan kind')
  const subject=clean(input.subject,120,'Subject')
  const statement=clean(input.statement,500,'Statement')
  const source=clean(input.source,300,'Source')
  const kind=USULAN_TO_CLAIM_KIND[input.jenis]
  return this.periksa.propose(actor,communityId,{
   kind,
   subject,
   statement:`[${input.jenis}] ${statement}`,
   evidence:[{text:`Usulan saluran (${input.jenis})`,source,...(input.postId?{postId:input.postId}:{})}],
  },null,'source')
 }

 /** Opt-in Pl@ntNet plant identification on a public community photo. Strictly refuses private communities. */
 async identifyPlant(actor:string,communityId:string,b:{mediaId?:unknown;organ?:unknown}):Promise<{species:Array<{scientificName:string;commonNames:string[];score:number}>;claim:Claim|null}>{
  const s=this.store
  s.requireMember(actor,communityId)
  if(s.actor(actor).kind!=='human')throw new Fault(403,'Human member required')
  const c=s.community(communityId)
  if(c.visibility!=='public')throw new Fault(403,'Foto dari komunitas privat tidak dikirim ke layanan luar')
  const cfg=this.settings(actor,communityId)
  if(!cfg.plantId)throw new Fault(409,'Saluran identifikasi tumbuhan belum diaktifkan pengurus')

  const mediaId=clean(b.mediaId,80,'mediaId')
  const row=s.get<{id:string;community_id:string;post_id:string|null;bytes:Uint8Array}>('SELECT id,community_id,post_id,bytes FROM media WHERE id=? AND community_id=?',mediaId,communityId)
  if(!row)throw new Fault(404,'Media not found in this community')

  const key=await this.opts.plantNetKey?.()
  if(!key)throw new Fault(503,'Kunci API Pl@ntNet belum diatur di Studio')

  const organ=typeof b.organ==='string'&&['leaf','flower','fruit','bark','auto'].includes(b.organ)?b.organ:'auto'
  const form=new FormData()
  form.append('organs',organ)
  const copy=new Uint8Array(row.bytes)
  form.append('images',new Blob([copy],{type:'image/webp'}),'photo.webp')

  const fetcher=this.opts.fetcher??fetch
  const resp=await fetcher(`https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(key)}`,{
   method:'POST',
   body:form,
   signal:AbortSignal.timeout(15000),
  })
  if(!resp.ok)throw new Fault(502,`Pl@ntNet gagal (${resp.status})`)
  const data=await resp.json() as {results?:Array<{score?:number;species?:{scientificNameWithoutAuthor?:string;scientificName?:string;commonNames?:string[]}}>}
  const species=(data.results??[]).slice(0,3).map(r=>({
   scientificName:String(r.species?.scientificNameWithoutAuthor||r.species?.scientificName||'').trim(),
   commonNames:Array.isArray(r.species?.commonNames)?r.species!.commonNames.slice(0,3).map(x=>String(x)):[],
   score:Math.round((Number(r.score)||0)*1000)/1000,
  })).filter(x=>x.scientificName)

  if(!species.length)return {species:[],claim:null}
  const top=species[0]
  const pct=Math.round(top.score*100)
  const common=top.commonNames.length?` (${top.commonNames.join(', ')})`:''
  const claim=this.periksa.propose(actor,communityId,{
   kind:'name',
   subject:top.scientificName.slice(0,120),
   statement:`Usulan Pl@ntNet (${pct}%): ${top.scientificName}${common}. Apakah benar tumbuhan ini, dan apa nama daerahnya di sini?`,
   evidence:[{text:`Identifikasi otomatis Pl@ntNet untuk foto ${row.id} (keyakinan ${pct}%). Belum diverifikasi.`,source:'Pl@ntNet',...(row.post_id?{postId:row.post_id}:{})}],
  },null,'source')
  return {species,claim}
 }

 /** Inspect a public IIIF Presentation v2/v3 manifest for Kurasi Balik. */
 async inspectIiif(actor:string,manifestUrl:unknown):Promise<IiifSummary>{
  this.store.actor(actor)
  const url=safeExternalHttpsUrl(manifestUrl)
  const fetcher=this.opts.fetcher??fetch
  const resp=await fetcher(url,{headers:{accept:'application/ld+json, application/json'},redirect:'error',signal:AbortSignal.timeout(10000)})
  if(!resp.ok)throw new Fault(502,`Manifest IIIF tidak bisa dibaca (${resp.status})`)
  const text=await resp.text()
  if(text.length>500_000)throw new Fault(413,'Manifest IIIF terlalu besar')
  let json:Record<string,unknown>
  try{json=JSON.parse(text) as Record<string,unknown>}catch{throw new Fault(400,'Bukan dokumen JSON IIIF yang valid')}
  const label=iiifText(json.label).slice(0,200)||url
  const attribution=iiifText(json.attribution??json.requiredStatement).slice(0,300)
  const licence=iiifText(json.license??json.rights).slice(0,200)
  let thumbnail:string|null=null
  const thumb=json.thumbnail
  if(typeof thumb==='string'&&thumb.startsWith('https://'))thumbnail=thumb
  else if(Array.isArray(thumb)&&thumb[0]&&typeof (thumb[0] as Record<string,unknown>).id==='string'){
   const id=String((thumb[0] as Record<string,unknown>).id)
   if(id.startsWith('https://'))thumbnail=id
  }else if(thumb&&typeof thumb==='object'&&typeof (thumb as Record<string,unknown>)['@id']==='string'){
   const id=String((thumb as Record<string,unknown>)['@id'])
   if(id.startsWith('https://'))thumbnail=id
  }
  return {manifestUrl:url,label,attribution,licence,thumbnail}
 }

 private viewAnnotation(r:AnnotationRow):MuseumAnnotation{
  const a=this.store.actor(r.author_id)
  const c=this.store.community(r.community_id)
  return {
   id:r.id,
   communityId:r.community_id,
   communityTitle:c.title,
   targetUri:r.target_uri,
   targetLabel:r.target_label,
   author:{id:a.id,name:a.name},
   body:r.body,
   localName:r.local_name,
   language:r.language,
   licence:r.licence,
   state:r.state,
   created:r.created,
   updated:r.updated,
  }
 }

 /** Add a reciprocal community annotation on an external museum/archive IIIF object. */
 addAnnotation(actor:string,communityId:string,b:{targetUri?:unknown;targetLabel?:unknown;body?:unknown;localName?:unknown;language?:unknown;licence?:unknown}):MuseumAnnotation{
  const s=this.store
  return s.tx(()=>{
   s.requireMember(actor,communityId)
   if(s.actor(actor).kind!=='human')throw new Fault(403,'Human member required')
   const cfg=this.settings(actor,communityId)
   if(!cfg.kurasiBalik)throw new Fault(409,'Saluran Kurasi Balik belum diaktifkan pengurus')
   const targetUri=safeExternalHttpsUrl(b.targetUri)
   const targetLabel=clean(b.targetLabel,200,'targetLabel')
   const body=clean(b.body,2000,'body')
   const localName=optClean(b.localName,160)
   const language=optClean(b.language,80)
   const licence=optClean(b.licence,80)||'CC BY 4.0'
   const id=randomUUID(),now=s.clock()
   s.run(
    'INSERT INTO museum_annotations(id,community_id,target_uri,target_label,author_id,body,local_name,language,licence,state,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    id,communityId,targetUri,targetLabel,actor,body,localName,language,licence,'active',now,now,
   )
   s.audit(actor,'kurasi.add',id)
   const row=s.get<AnnotationRow>('SELECT * FROM museum_annotations WHERE id=?',id)!
   return this.viewAnnotation(row)
  })
 }

 listAnnotations(actor:string|undefined,communityId:string):MuseumAnnotation[]{
  const c=this.store.community(communityId)
  if(!this.store.canRead(actor,c))throw new Fault(404,'Not found')
  const rows=this.store.all<AnnotationRow>(
   "SELECT * FROM museum_annotations WHERE community_id=? AND state='active' ORDER BY created DESC LIMIT 200",
   communityId,
  )
  return rows.map(r=>this.viewAnnotation(r))
 }

 withdrawAnnotation(actor:string,id:string):MuseumAnnotation{
  const s=this.store
  return s.tx(()=>{
   const row=s.get<AnnotationRow>('SELECT * FROM museum_annotations WHERE id=?',id)
   if(!row)throw new Fault(404,'Not found')
   s.requireMember(actor,row.community_id)
   if(row.author_id!==actor)s.requireSteward(actor,row.community_id)
   s.run("UPDATE museum_annotations SET state='withdrawn',updated=? WHERE id=?",s.clock(),id)
   s.audit(actor,'kurasi.withdraw',id)
   return this.viewAnnotation(s.get<AnnotationRow>('SELECT * FROM museum_annotations WHERE id=?',id)!)
  })
 }

 /** Public W3C Web Annotation Data Model JSON-LD export. Strictly public communities + active rows only. */
 exportJsonLd(targetUri?:string){
  const origin=(this.opts.origin||'https://etnos.space').replace(/\/$/,'')
  const params:string[]=[]
  let sql="SELECT m.* FROM museum_annotations m JOIN communities c ON c.id=m.community_id WHERE m.state='active' AND c.visibility='public'"
  if(targetUri){
   const safe=safeExternalHttpsUrl(targetUri)
   sql+=' AND m.target_uri=?'
   params.push(safe)
  }
  sql+=' ORDER BY m.created DESC LIMIT 200'
  const rows=this.store.all<AnnotationRow>(sql,...params)
  return {
   '@context':'http://www.w3.org/ns/anno.jsonld',
   id:targetUri?`${origin}/v1/kurasi/annotations.jsonld?target=${encodeURIComponent(targetUri)}`:`${origin}/v1/kurasi/annotations.jsonld`,
   type:'AnnotationPage',
   items:rows.map(r=>{
    const v=this.viewAnnotation(r)
    return {
     id:`${origin}/v1/kurasi/${v.id}`,
     type:'Annotation',
     motivation:'commenting',
     created:new Date(v.created).toISOString(),
     creator:{type:'Person',name:v.author.name},
     generator:{type:'Organization',name:`${v.communityTitle} (ETNOS)`},
     rights:v.licence,
     target:{id:v.targetUri,type:'SpecificResource',title:v.targetLabel},
     body:{
      type:'TextualBody',
      value:v.localName?`${v.localName}${v.language?` (${v.language})`:''} — ${v.body}`:v.body,
      format:'text/plain',
      language:v.language||'id',
     },
    }
   }),
  }
 }
}
