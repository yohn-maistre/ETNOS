/** Export of a community's checked Kamus: one CSV, or a CLDF Dictionary (https://cldf.clld.org) in a zip with
 * entries, senses and examples. Every row keeps its source and licence. Rows from Steltenpool 1969 are CC BY-NC,
 * so the README in the zip says that the export may not be used in anything paid while those rows are in it. */
type Row={id:string;headword:string;variants:string[];forms:string[];gloss:string;definition:string;wordClass:string;domain:string;dialect:string;examples:{postId:string;text:string}[];source:string;licence:string;status:string;sensitive:boolean}
export type KamusExport={language:string;languageName:string;community:string;rows:Row[]}

const cell=(v:unknown)=>{const t=String(v??'');return /[",\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t}
const csv=(head:string[],rows:unknown[][])=>[head,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n'
const POS:Record<string,string>={benda:'noun',kerja:'verb',sifat:'adjective',lainnya:'other'}

export function kamusCsv(x:KamusExport,base:string){
 return csv(['kata','tulisan_lain','bentuk','arti','definisi','kelas_kata','ranah','dialek','contoh','tautan_contoh','sumber','lisensi','status','jangan_disebarkan'],
  x.rows.map(r=>[r.headword,r.variants.join('; '),r.forms.join('; '),r.gloss,r.definition,r.wordClass,r.domain,r.dialect,r.examples.map(e=>e.text).join(' | '),r.examples.map(e=>base+'/square/'+e.postId).join(' '),r.source,r.licence,r.status,r.sensitive?'ya':'']))
}

/** The CLDF Dictionary module: EntryTable, SenseTable and ExampleTable, linked by ids. */
export function kamusCldf(x:KamusExport,base:string,today:string){
 const entries=new Map<string,{id:string;headword:string;variants:Set<string>;forms:Set<string>;wordClass:string;dialect:string;source:Set<string>;licence:Set<string>;sensitive:boolean}>()
 const senses:unknown[][]=[],examples:unknown[][]=[]
 for(const r of x.rows){
  const key=r.headword.toLowerCase()
  const e=entries.get(key)??{id:'e'+(entries.size+1),headword:r.headword,variants:new Set<string>(),forms:new Set<string>(),wordClass:r.wordClass,dialect:r.dialect,source:new Set<string>(),licence:new Set<string>(),sensitive:false}
  r.variants.forEach(v=>e.variants.add(v));r.forms.forEach(v=>e.forms.add(v));e.source.add(r.source);if(r.licence)e.licence.add(r.licence);e.sensitive||=r.sensitive;if(!e.wordClass)e.wordClass=r.wordClass
  entries.set(key,e)
  const sid='s'+(senses.length+1)
  senses.push([sid,e.id,r.gloss,r.definition,r.domain,r.source,r.licence])
  for(const ex of r.examples)examples.push(['x'+(examples.length+1),x.language,ex.text,'',sid,base+'/square/'+ex.postId])
 }
 const files:Record<string,string>={
  'entries.csv':csv(['ID','Language_ID','Headword','Part_Of_Speech','Variants','Forms','Dialect','Source','Licence','Sensitive'],[...entries.values()].map(e=>[e.id,x.language,e.headword,POS[e.wordClass]??'',[...e.variants].join(';'),[...e.forms].join(';'),e.dialect,[...e.source].join(';'),[...e.licence].join(';'),e.sensitive?'true':''])),
  'senses.csv':csv(['ID','Entry_ID','Description','Definition','Domain','Source','Licence'],senses),
  'examples.csv':csv(['ID','Language_ID','Primary_Text','Translated_Text','Sense_IDs','Source_URL'],examples),
  'languages.csv':csv(['ID','Name','Glottocode'],[[x.language,x.languageName,/^[a-z]{4}\d{4}$/.test(x.language)?x.language:'']]),
  'Dictionary-metadata.json':JSON.stringify({
   '@context':['http://www.w3.org/ns/csvw',{'@language':'en'}],
   'dc:conformsTo':'http://cldf.clld.org/v1.0/terms.rdf#Dictionary',
   'dc:title':`Kamus ${x.languageName}, ${x.community}`,
   'dc:created':today,
   'dc:description':'Checked entries of a community dictionary on ETNOS. Each sense keeps its source and licence.',
   tables:[
    {url:'entries.csv','dc:conformsTo':'http://cldf.clld.org/v1.0/terms.rdf#EntryTable',tableSchema:{columns:[{name:'ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#id'},{name:'Language_ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#languageReference'},{name:'Headword',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#headword'},{name:'Part_Of_Speech',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#partOfSpeech'},{name:'Variants',separator:';'},{name:'Forms',separator:';'},{name:'Dialect'},{name:'Source',separator:';'},{name:'Licence',separator:';'},{name:'Sensitive'}],primaryKey:['ID']}},
    {url:'senses.csv','dc:conformsTo':'http://cldf.clld.org/v1.0/terms.rdf#SenseTable',tableSchema:{columns:[{name:'ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#id'},{name:'Entry_ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#entryReference'},{name:'Description',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#description'},{name:'Definition'},{name:'Domain'},{name:'Source'},{name:'Licence'}],primaryKey:['ID']}},
    {url:'examples.csv','dc:conformsTo':'http://cldf.clld.org/v1.0/terms.rdf#ExampleTable',tableSchema:{columns:[{name:'ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#id'},{name:'Language_ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#languageReference'},{name:'Primary_Text',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#primaryText'},{name:'Translated_Text',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#translatedText'},{name:'Sense_IDs',separator:';'},{name:'Source_URL'}],primaryKey:['ID']}},
    {url:'languages.csv','dc:conformsTo':'http://cldf.clld.org/v1.0/terms.rdf#LanguageTable',tableSchema:{columns:[{name:'ID',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#id'},{name:'Name',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#name'},{name:'Glottocode',propertyUrl:'http://cldf.clld.org/v1.0/terms.rdf#glottocode'}],primaryKey:['ID']}},
   ],
  },null,1),
  'README.txt':[`Kamus ${x.languageName}, ${x.community}. Exported ${today}.`,'',
   'These are the checked entries of a community dictionary. Each sense keeps its source and licence in the Source and Licence columns.',
   'Senses from Steltenpool (1969) are licensed CC BY-NC 3.0. While they are in this export, it may not be used in anything paid.',
   'Senses written by members belong to the community that wrote them. Ask its stewards before reusing them elsewhere.',
   'Rows marked Sensitive were marked "Jangan disebarkan" by a steward. Keep them within the community.',''].join('\r\n'),
 }
 return zip(files)
}

// A zip with stored (uncompressed) files, enough for a few CSV files and no dependency.
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})()
function crc32(b:Uint8Array){let c=0xffffffff;for(const x of b)c=CRC[(c^x)&0xff]^(c>>>8);return (c^0xffffffff)>>>0}
export function zip(files:Record<string,string>){
 const enc=new TextEncoder(),parts:Uint8Array[]=[],central:Uint8Array[]=[]
 let offset=0
 for(const [name,text] of Object.entries(files)){
  const data=enc.encode(text),fname=enc.encode(name),crc=crc32(data)
  const local=new DataView(new ArrayBuffer(30))
  local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,0x0800,true);local.setUint16(8,0,true)
  local.setUint32(14,crc,true);local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);local.setUint16(26,fname.length,true)
  parts.push(new Uint8Array(local.buffer),fname,data)
  const c=new DataView(new ArrayBuffer(46))
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true)
  c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,fname.length,true);c.setUint32(42,offset,true)
  central.push(new Uint8Array(c.buffer),fname)
  offset+=30+fname.length+data.length
 }
 const size=central.reduce((n,b)=>n+b.length,0),end=new DataView(new ArrayBuffer(22))
 end.setUint32(0,0x06054b50,true);end.setUint16(8,Object.keys(files).length,true);end.setUint16(10,Object.keys(files).length,true);end.setUint32(12,size,true);end.setUint32(16,offset,true)
 const all=[...parts,...central,new Uint8Array(end.buffer)],out=new Uint8Array(all.reduce((n,b)=>n+b.length,0))
 let at=0;for(const b of all){out.set(b,at);at+=b.length}
 return out
}
