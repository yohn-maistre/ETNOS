import type {EtnosCore} from './core.ts'
import {hash,key} from './commons.ts'
import type {ResidentSkill} from './resident-contract.ts'
import type {ResidentConfig,ResidentJob} from './resident.ts'
import shipped from '../seed/jadwal-aksara.json' with {type:'json'}

/** Jadwal Aksara: named posting slots at local times. The file only chooses
 * when a skill may run. Every run still goes through the ordinary job path, so
 * mandates, the daily budget, the one-pending-job rule and the model budget apply. */
export const jadwalSkills=['source-digest','research-question','knowledge-draft','kabar-harian','riset-ensiklopedia','usulan-periksa','pertanyaan-harian'] as const satisfies readonly ResidentSkill[]
export type JadwalSlot={id:string;at:string;skill:typeof jadwalSkills[number];label:string;/** ISO weekdays, 1 = Monday to 7 = Sunday. Every day when absent. */days?:number[]}
export type Jadwal={version:1;timezone:string;slots:JadwalSlot[]}
export type SlotState='menunggu'|'berjalan'|'selesai'|'diam'|'dilewati'

const bad=(message:string)=>new Error('Jadwal Aksara tidak valid: '+message)
/** Throws on a bad time, an unknown skill, an unknown timezone, a repeated id or an unexpected field. */
export function parseJadwal(value:unknown):Jadwal{
 const o=value as Record<string,unknown>
 if(!o||typeof o!=='object'||Array.isArray(o))throw bad('berkas harus berupa objek')
 if(o.version!==1)throw bad('versi harus 1')
 if(typeof o.timezone!=='string')throw bad('zona waktu wajib')
 try{new Intl.DateTimeFormat('en',{timeZone:o.timezone})}catch{throw bad('zona waktu tidak dikenal')}
 if(!Array.isArray(o.slots)||o.slots.length>24)throw bad('isi paling banyak 24 slot')
 const ids=new Set<string>(),slots=o.slots.map((raw:unknown):JadwalSlot=>{
  const s=raw as Record<string,unknown>
  if(!s||typeof s!=='object'||Array.isArray(s))throw bad('slot harus berupa objek')
  for(const k of Object.keys(s))if(!['id','at','skill','label','days'].includes(k))throw bad('kolom tidak dikenal '+k)
  if(typeof s.id!=='string'||!/^[a-z0-9-]{1,24}$/.test(s.id))throw bad('id slot harus huruf kecil, angka atau tanda hubung, paling banyak 24 karakter')
  if(ids.has(s.id))throw bad('id slot ganda '+s.id);ids.add(s.id)
  if(typeof s.at!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.at))throw bad('jam slot '+s.id+' harus HH:MM')
  if(!(jadwalSkills as readonly unknown[]).includes(s.skill))throw bad('keterampilan tidak dikenal pada slot '+s.id)
  if(typeof s.label!=='string'||!s.label.trim()||s.label.length>60)throw bad('label slot '+s.id+' wajib, paling banyak 60 karakter')
  let days:number[]|undefined
  if(s.days!==undefined){
   if(!Array.isArray(s.days)||!s.days.length||s.days.some(d=>!Number.isInteger(d)||d<1||d>7)||new Set(s.days).size!==s.days.length)throw bad('hari slot '+s.id+' harus angka 1 sampai 7 tanpa ulang')
   days=[...s.days as number[]].sort((a,b)=>a-b)
  }
  return {id:s.id,at:s.at,skill:s.skill as JadwalSlot['skill'],label:s.label.trim(),...(days?{days}:{})}
 })
 return {version:1,timezone:o.timezone,slots:slots.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id))}
}
/** The schedule shipped with the deployment, validated once when the module loads. */
export const defaultJadwal=parseJadwal(shipped)

const formatters=new Map<string,Intl.DateTimeFormat>()
const weekdays:Record<string,number>={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}
/** Calendar date, minutes since local midnight and ISO weekday at an instant in a timezone. */
export function localTime(ms:number,timezone:string){
 let f=formatters.get(timezone);if(!f){f=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short'});formatters.set(timezone,f)}
 const p:Record<string,string>={};for(const x of f.formatToParts(ms))p[x.type]=x.value
 return {date:`${p.year}-${p.month}-${p.day}`,minutes:(Number(p.hour)%24)*60+Number(p.minute),weekday:weekdays[p.weekday],year:Number(p.year),month:Number(p.month),day:Number(p.day)}
}
const minutesOf=(at:string)=>Number(at.slice(0,2))*60+Number(at.slice(3))
/** The instant a local date and time occur, using the zone's offset at that moment. */
export function localInstant(date:string,at:string,timezone:string){
 const guess=Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7))-1,Number(date.slice(8)),Number(at.slice(0,2)),Number(at.slice(3)))
 const offset=(t:number)=>{const l=localTime(t,timezone);return Date.UTC(l.year,l.month-1,l.day,Math.floor(l.minutes/60),l.minutes%60)-Math.floor(t/60000)*60000}
 return guess-offset(guess-offset(guess))
}
const runsOn=(slot:JadwalSlot,weekday:number)=>!slot.days||slot.days.includes(weekday)
/** Request key of a slot's run for one community on one local day. The community
 * part keeps two communities with one operator apart. */
export const slotRequestKey=(slotId:string,date:string,communityId:string)=>`jadwal:${slotId}:${date}:${hash(communityId).slice(0,16)}`

export class JadwalRunner{
 readonly store:EtnosCore;readonly jadwal:Jadwal;private readonly authorize:(c:ResidentConfig,skill:ResidentSkill)=>void
 /** `authorize` throws when the current mandates no longer allow the skill. */
 constructor(store:EtnosCore,authorize:(c:ResidentConfig,skill:ResidentSkill)=>void,jadwal:Jadwal=defaultJadwal){this.store=store;this.authorize=authorize;this.jadwal=jadwal}
 /** Slots whose local time has passed today. */
 due(now:number){const t=localTime(now,this.jadwal.timezone);return {date:t.date,slots:this.jadwal.slots.filter(s=>runsOn(s,t.weekday)&&minutesOf(s.at)<=t.minutes)}}
 /** The job a slot already made for this community today, in any state. */
 job(c:ResidentConfig,slotId:string,date:string){
  return this.store.get<ResidentJob>('SELECT * FROM resident_jobs WHERE community_id=? AND request_key=?',c.community_id,key(c.operator_id+':'+slotRequestKey(slotId,date,c.community_id)))
 }
 /** Why a due slot has no job. A pending job or a not yet due slot is not a skip: the slot retries. */
 skipReason(c:ResidentConfig,slot:JadwalSlot):'budget'|'authority'|null{
  const s=this.store
  if(s.get<{n:number}>('SELECT count(*) n FROM resident_jobs WHERE agent_id=? AND created>?',c.agent_id,s.clock()-86400000)!.n>=c.daily_limit)return 'budget'
  try{this.authorize(c,slot.skill)}catch{return 'authority'}
  return null
 }
 /** Record of one slot today: ran with a job, still waiting, skipped with a reason, or abstained. */
 day(c:ResidentConfig,now:number){
  const t=localTime(now,this.jadwal.timezone)
  return this.jadwal.slots.filter(s=>runsOn(s,t.weekday)).map(slot=>{
   const job=this.job(c,slot.id,t.date)
   let state:SlotState,reason:string|null=null
   if(job){
    if(job.state==='queued'||job.state==='running')state='berjalan'
    else if(job.state==='succeeded')state='selesai'
    else if(job.state==='abstained'&&job.error!=='Current authority refused scheduled work')state='diam'
    else{state='dilewati';reason=job.error??job.state}
   }else if(minutesOf(slot.at)>t.minutes)state='menunggu'
   else{reason=this.skipReason(c,slot);state=reason?'dilewati':'menunggu'}
   return {slot,state,reason,job:job??null}
  })
 }
 /** The next instant a slot becomes due or a due slot is worth trying again. */
 nextWake(c:ResidentConfig,now:number){
  const t=localTime(now,this.jadwal.timezone);let next:number|null=null
  for(const row of this.day(c,now)){
   if(row.job||(row.state==='dilewati'&&row.reason==='authority'))continue
   const at=minutesOf(row.slot.at)>t.minutes?localInstant(t.date,row.slot.at,this.jadwal.timezone):now+600000
   next=next===null?at:Math.min(next,at)
  }
  if(next===null)next=localInstant(localTime(now+86400000,this.jadwal.timezone).date,'00:00',this.jadwal.timezone)
  return next
 }
}
