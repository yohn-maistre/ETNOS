/**
 * The world model's coordinates and depth (docs/observatory/world-model-and-starter-data-2026-11-20.md §5.2–5.3).
 *
 * Every thing gets three coordinates, each stored with its basis (rule, model, measurement or person):
 * - size: the typical spatial extent, as a range in log10 metres;
 * - pace: how long the thing takes to change, cycle or happen, as a range in log10 seconds;
 * - level: its level of organisation, an Integrative Levels Classification (ILC2) main class, a to y,
 *   shown as one of seven colour bands.
 * Every statement gets a depth after Berkes' knowledge-practice-belief complex: apa (what it is),
 * cara (how it is done), aturan (who decides and by what rule) and makna (what it means).
 *
 * The rules below are deliberately coarse. They give a range, never a point, and they say which rule
 * was used, so a person can correct any value. Nothing here infers anything about persons: a person
 * gets no coordinates by rule.
 */
import places from './catalogues/tanah-papua-places.json' with {type:'json'}
import {Fault} from './core.ts'

export const ilcClasses='abcdefghijklmnopqrstuvwxy'
export const bands=[
 {key:'materi-langit',label:'Materi dan langit',classes:'abcdefgh'},
 {key:'batuan-bumi',label:'Batuan dan bumi',classes:'ij'},
 {key:'makhluk-hidup',label:'Makhluk hidup',classes:'klmn'},
 {key:'pikiran',label:'Pikiran',classes:'op'},
 {key:'bahasa-ritus',label:'Bahasa dan ritus',classes:'qr'},
 {key:'masyarakat-aturan',label:'Masyarakat dan aturan',classes:'stu'},
 {key:'buatan-pengetahuan',label:'Buatan dan pengetahuan',classes:'vwxy'},
] as const
export type BandKey=typeof bands[number]['key']
export const depths=['apa','cara','aturan','makna'] as const
export type Depth=typeof depths[number]
export const coordinateBases=['rule','model','measurement','person'] as const
export type CoordinateBasis=typeof coordinateBases[number]
export const depthBases=['rule','model','person'] as const

export const bandOf=(level:string|null|undefined):BandKey|null=>level?bands.find(b=>b.classes.includes(level))?.key??null:null

export type Range={lo:number;hi:number;basis:CoordinateBasis;note:string}
export type Level={code:string;band:BandKey;basis:CoordinateBasis;note:string}
export type World={size:Range|null;pace:Range|null;level:Level|null}

type PlaceRow={facet:string;areaKm2:number;latitude:number;longitude:number}
const placeIndex=(places as {places:Record<string,PlaceRow>}).places
/** A reference point and area for a catalogue place, from the simplified BIG outlines. */
export const placeOf=(contextSlug:string|null|undefined):PlaceRow|null=>contextSlug?placeIndex[contextSlug]??null:null

const YEAR=Math.log10(3.156e7)
const r1=(v:number)=>Math.round(v*100)/100
const range=(lo:number,hi:number,note:string):Range=>({lo:r1(lo),hi:r1(hi),basis:'rule',note})
const level=(code:string,note:string):Level=>({code,band:bandOf(code)!,basis:'rule',note})
const km2=(v:number)=>v.toLocaleString('id-ID',{maximumFractionDigits:0})

/** Kinds of named landforms recognised from the start of a title. */
const landforms:[RegExp,string,[number,number],[number,number],string][]=[
 [/^danau\b/i,'danau',[3.3,4.3],[10.5,12],'j'],
 [/^(gunung|puncak|pegunungan)\b/i,'gunung',[3.5,4.6],[13,14.5],'j'],
 [/^lembah\b/i,'lembah',[3.8,4.8],[12,13.5],'j'],
 [/^teluk\b/i,'teluk',[4.8,5.6],[11.5,13.5],'j'],
 [/^(sungai|kali)\b/i,'sungai',[4,5.8],[9,12],'j'],
 [/^(pulau|kepulauan)\b/i,'pulau',[3.5,5.5],[11,13.5],'j'],
]

/**
 * Coordinates by rule for one thing. `title` and `contextSlug` refine the rule for places; `slug` only
 * separates a language family from a single language.
 */
export function worldByRule(e:{slug:string;class:string;title:string;context_slug?:string|null}):World{
 const place=placeOf(e.context_slug)
 switch(e.class){
  case 'tempat':{
   if(place){
    // Size from the outline's area: the side of a square of the same area.
    const s=Math.log10(Math.sqrt(place.areaKm2*1e6)),areaNote=`Luas sekitar ${km2(place.areaKm2)} km² dari garis batas BIG yang disederhanakan.`
    if(place.facet==='customary-region')return {size:range(s-0.1,s+0.1,areaNote),pace:range(9.5,11,'Aturan untuk wilayah adat: berubah dalam ratusan sampai ribuan tahun.'),level:level('s','Aturan untuk wilayah adat: tingkat komunitas (ILC s).')}
    return {size:range(s-0.1,s+0.1,areaNote),pace:range(8.5,9.5,'Aturan untuk wilayah pemerintahan: batas dan namanya berubah dalam puluhan tahun.'),level:level('t','Aturan untuk wilayah pemerintahan: tingkat pemerintahan (ILC t).')}
   }
   const form=landforms.find(([re])=>re.test(e.title))
   if(form){const [,name,[s0,s1],[p0,p1],code]=form;return {size:range(s0,s1,`Aturan untuk ${name}: ukuran umum, belum diukur.`),pace:range(p0,p1,`Aturan untuk ${name}: lama berubah menurut ilmu kebumian, belum diukur.`),level:level(code,'Aturan untuk bentang alam: tingkat daratan (ILC j).')}}
   return {size:range(2,6,'Aturan umum untuk tempat: rentang lebar, belum diukur.'),pace:range(9,13,'Aturan umum untuk tempat: rentang lebar, belum diukur.'),level:level('j','Aturan umum untuk tempat: tingkat daratan (ILC j).')}
  }
  case 'bahasa':{
   const family=/^rumpun\b|^bahasa-bahasa\b/i.test(e.title)
   return family
    ?{size:range(4.5,5.8,'Aturan untuk rumpun bahasa: wilayah tutur gabungan, belum diukur.'),pace:range(10.5,12,'Aturan untuk rumpun bahasa: terpisah dalam ribuan tahun.'),level:level('q','Aturan untuk bahasa: tingkat bahasa (ILC q).')}
    :{size:range(3.5,5.5,'Aturan untuk bahasa: luas wilayah tutur, belum diukur.'),pace:range(10,11,'Aturan untuk bahasa: berubah jelas dalam beberapa ratus tahun.'),level:level('q','Aturan untuk bahasa: tingkat bahasa (ILC q).')}
  }
  case 'kelompok':return {size:range(3.5,5.5,'Aturan untuk masyarakat: luas wilayah yang didiami, belum diukur.'),pace:range(9.5,11,'Aturan untuk masyarakat: berubah dalam beberapa generasi sampai ratusan tahun.'),level:level('s','Aturan untuk masyarakat: tingkat komunitas (ILC s).')}
  case 'lembaga':return {size:range(3,5.5,'Aturan untuk lembaga: wilayah kerjanya, belum diukur.'),pace:range(9,10.5,'Aturan untuk lembaga: berubah dalam puluhan tahun.'),level:level('t','Aturan untuk lembaga: tingkat pemerintahan dan aturan (ILC t).')}
  case 'makhluk':return {size:range(-2,1.5,'Aturan umum untuk makhluk hidup: dari beberapa milimeter sampai puluhan meter.'),pace:range(6,9.5,'Aturan umum untuk makhluk hidup: satu generasi, dari bulan sampai puluhan tahun.'),level:level('m','Aturan untuk makhluk hidup: tingkat organisme (ILC m).')}
  case 'benda':return {size:range(-2,1,'Aturan umum untuk benda buatan: dari sentimeter sampai meter.'),pace:range(YEAR,10,'Aturan umum untuk benda buatan: dipakai dalam tahunan sampai ratusan tahun.'),level:level('w','Aturan untuk benda buatan: tingkat artefak (ILC w).')}
  case 'praktik':return {size:range(0,4,'Aturan umum untuk praktik: dari satu tempat kerja sampai satu lembah.'),pace:range(4.5,YEAR,'Aturan umum untuk praktik: dari beberapa jam sampai satu siklus tahunan.'),level:level('r','Aturan untuk praktik: tingkat ritus dan kebiasaan (ILC r). Teknologi (ILC v) juga mungkin.')}
  case 'peristiwa':return {size:range(1,5,'Aturan umum untuk peristiwa: rentang lebar, belum diukur.'),pace:range(3,YEAR,'Aturan umum untuk peristiwa: dari jam sampai satu tahun.'),level:level('s','Aturan untuk peristiwa: tingkat komunitas (ILC s).')}
  case 'musim':return {size:range(5,6.5,'Aturan untuk musim: cuaca satu wilayah.'),pace:range(7,YEAR+0.1,'Aturan untuk musim: satu siklus dalam satu tahun.'),level:level('g','Aturan untuk musim: tingkat udara dan air (ILC g).')}
  case 'cerita':return {size:null,pace:range(9.5,11,'Aturan untuk cerita: diwariskan dalam beberapa generasi sampai ratusan tahun.'),level:level('x','Aturan untuk cerita: tingkat karya (ILC x).')}
  case 'gagasan':return {size:null,pace:range(9.5,11.5,'Aturan untuk gagasan: berubah dalam generasi sampai ratusan tahun.'),level:level('y','Aturan untuk gagasan: tingkat pengetahuan (ILC y).')}
  default:return {size:null,pace:null,level:null}
 }
}

/** Depth by rule, from the predicate. Statements about knowledge itself (menurut, dibantah-oleh) get none. */
const depthOfPredicate:Record<string,Depth>={
 'berada-di':'apa','bagian-dari':'apa','berbatasan-dengan':'apa','di-hulu-dari':'apa','di-hilir-dari':'apa','di-atas-dari':'apa','di-bawah-dari':'apa',
 'mendiami':'apa','bertetangga-dengan':'apa','hidup-di':'apa','muncul-pada-musim':'apa','dibuat-dari':'apa',
 'disebut':'apa','berarti':'apa','nama-lain-dari':'apa','dituturkan-di':'apa','dituturkan-oleh':'apa','terjadi-di':'apa','terjadi-pada':'apa','sama-dengan':'apa',
 'dipakai-oleh':'cara','digunakan-untuk':'cara','dibuat-oleh':'cara','melibatkan':'cara','memakai':'cara','dilakukan-saat':'cara','dilakukan-oleh':'cara','diajarkan-melalui':'cara',
 'anggota-dari':'aturan','berkerabat-dengan':'aturan','dijaga-oleh':'aturan','dipegang-oleh':'aturan','hanya-untuk':'aturan',
 'diceritakan-dalam':'makna','menjelaskan-asal':'makna','mengubah':'makna',
}
export const depthByRule=(predicate:string):Depth|null=>depthOfPredicate[predicate]??null

/** A range a person may enter: two finite numbers in order, within the scale of the known world. */
export function checkRange(v:unknown,min:number,max:number):[number,number]|null{
 if(v===undefined||v===null)return null
 if(!Array.isArray(v)||v.length!==2||!v.every(x=>typeof x==='number'&&Number.isFinite(x)))throw new Fault(400,'Invalid range')
 const [lo,hi]=v as [number,number]
 if(lo>hi||lo<min||hi>max)throw new Fault(400,'Invalid range')
 return [r1(lo),r1(hi)]
}
