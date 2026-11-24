import {Fault} from './core.ts'
export type PostPeluang={category:'beasiswa'|'hibah'|'kerja'|'pelatihan';organizer:string;location:string;deadline?:number;applyUrl?:string}
export type PostBagasi={kind:'bawa'|'titip';from:string;to:string;departAt?:number;capacity:string}
export type PostContent={title?:string;url?:string;format?:'plain'|'markdown';warning?:string;inlineMedia?:{version:1;ids:string[]};poll?:{options:string[];closesAt:number};event?:{startsAt:number;endsAt?:number;location:string};peluang?:PostPeluang;bagasi?:PostBagasi;answer?:PostAnswer;sources?:PostSource[];season?:string}
/** A reply that answers a sourced post: something is wrong, or the writer knows more. */
export type PostAnswer='wrong'|'more'
/** A source the author names for the post. Shown as written; ETNOS does not claim to have checked it. */
export type PostSource={title:string;url?:string;quote?:string}
const short=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max)throw new Fault(400,'Invalid post field');return value.trim()}
const PELUANG_CATS=new Set(['beasiswa','hibah','kerja','pelatihan'])
export function contentInput(value:unknown,now:number):PostContent{
 if(value===undefined)return{}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Fault(400,'Invalid post content')
 const v=value as Record<string,unknown>,c:PostContent={}
 for(const key of Object.keys(v))if(!['title','url','format','warning','poll','event','peluang','bagasi','inlineMedia','answer','sources','season'].includes(key))throw new Fault(400,'Unknown post field')
 if(v.title!==undefined)c.title=short(v.title,180)
 if(v.warning!==undefined)c.warning=short(v.warning,160)
 if(v.format!==undefined){if(v.format!=='plain'&&v.format!=='markdown')throw new Fault(400,'Invalid text format');c.format=v.format}
 if(v.inlineMedia!==undefined){const m=v.inlineMedia as {version?:unknown;ids?:unknown};if(!m||m.version!==1||!Array.isArray(m.ids)||m.ids.length>4||m.ids.some(x=>typeof x!=='string'||!/^[-a-f0-9]{36}$/.test(x))||new Set(m.ids).size!==m.ids.length||c.format!=='markdown')throw new Fault(400,'Invalid inline image document');c.inlineMedia={version:1,ids:m.ids as string[]}}
 if(v.url!==undefined){const raw=short(v.url,2048);if(raw){let u:URL;try{u=new URL(raw)}catch{throw new Fault(400,'A complete http or https link is required')};if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Fault(400,'A complete http or https link is required');c.url=u.href}}
 if(v.poll!==undefined){const p=v.poll as {options?:unknown;closesAt?:unknown};if(!p||!Array.isArray(p.options)||p.options.length<2||p.options.length>6)throw new Fault(400,'A poll needs two to six options');const options=p.options.map(x=>short(x,100));if(options.some(x=>!x)||new Set(options.map(x=>x.normalize('NFKC').toLocaleLowerCase('en'))).size!==options.length)throw new Fault(400,'Poll options must be different');if(!Number.isSafeInteger(p.closesAt)||Number(p.closesAt)<=now||Number(p.closesAt)>now+30*86400000)throw new Fault(400,'Poll closing time must be within 30 days');c.poll={options,closesAt:Number(p.closesAt)}}
 if(v.event!==undefined){const e=v.event as {startsAt?:unknown;endsAt?:unknown;location?:unknown};if(!e||!Number.isSafeInteger(e.startsAt)||Number(e.startsAt)<0||Number(e.startsAt)>now+5*366*86400000)throw new Fault(400,'Invalid event time');if(e.endsAt!==undefined&&(!Number.isSafeInteger(e.endsAt)||Number(e.endsAt)<=Number(e.startsAt)))throw new Fault(400,'Event end must be after its start');c.event={startsAt:Number(e.startsAt),...(e.endsAt!==undefined?{endsAt:Number(e.endsAt)}:{}),location:short(e.location??'',200)}}
 if(v.peluang!==undefined){
  const p=v.peluang as Record<string,unknown>
  if(!p||typeof p!=='object'||Array.isArray(p))throw new Fault(400,'Invalid peluang')
  const category=String(p.category??'')
  if(!PELUANG_CATS.has(category))throw new Fault(400,'Invalid peluang category')
  const organizer=short(p.organizer??'',140),location=short(p.location??'',140)
  if(!organizer)throw new Fault(400,'Peluang organizer required')
  let deadline:number|undefined
  if(p.deadline!==undefined&&p.deadline!==null){if(!Number.isSafeInteger(p.deadline)||Number(p.deadline)<0||Number(p.deadline)>now+5*366*86400000)throw new Fault(400,'Invalid peluang deadline');deadline=Number(p.deadline)}
  const applyRaw=p.applyUrl===undefined?'':short(p.applyUrl,2048)
  c.peluang={category:category as PostPeluang['category'],organizer,location,...(deadline!==undefined?{deadline}:{}),...(applyRaw?{applyUrl:link(applyRaw)}:{})}
 }
 if(v.bagasi!==undefined){
  const b=v.bagasi as Record<string,unknown>
  if(!b||typeof b!=='object'||Array.isArray(b))throw new Fault(400,'Invalid bagasi')
  const kind=String(b.kind??'')
  if(kind!=='bawa'&&kind!=='titip')throw new Fault(400,'Invalid bagasi kind')
  const from=short(b.from??'',120),to=short(b.to??'',120),capacity=short(b.capacity??'',100)
  if(!from||!to)throw new Fault(400,'Bagasi origin and destination required')
  let departAt:number|undefined
  if(b.departAt!==undefined&&b.departAt!==null){if(!Number.isSafeInteger(b.departAt)||Number(b.departAt)<0||Number(b.departAt)>now+366*86400000)throw new Fault(400,'Invalid bagasi departure time');departAt=Number(b.departAt)}
  c.bagasi={kind,from,to,capacity,...(departAt!==undefined?{departAt}:{})}
 }
 if(v.answer!==undefined){if(v.answer!=='wrong'&&v.answer!=='more')throw new Fault(400,'Invalid answer');c.answer=v.answer}
 if(v.sources!==undefined)c.sources=sourcesInput(v.sources)
 // A season of the post's community; the caller checks that it belongs there and is still in use.
 if(v.season!==undefined){if(typeof v.season!=='string'||!/^[-a-f0-9]{36}$/.test(v.season))throw new Fault(400,'Invalid season');c.season=v.season}
 if([c.poll,c.event,c.peluang,c.bagasi].filter(Boolean).length>1)throw new Fault(400,'Choose one post card type')
 return c
}
function link(raw:string){let u:URL;try{u=new URL(raw)}catch{throw new Fault(400,'A complete http or https link is required')};if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Fault(400,'A complete http or https link is required');return u.href}
export function sourcesInput(value:unknown):PostSource[]{
 if(!Array.isArray(value)||value.length>8)throw new Fault(400,'Up to eight sources')
 return value.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['title','url','quote'].includes(k)))throw new Fault(400,'Invalid source')
  const v=item as Record<string,unknown>,title=short(v.title,300);if(!title)throw new Fault(400,'A source needs a title')
  const url=v.url===undefined?'':short(v.url,2048),quote=v.quote===undefined?'':short(v.quote,600)
  return {title,...(url?{url:link(url)}:{}),...(quote?{quote}:{})}
 })
}
export function contentOf(raw:string):PostContent{return JSON.parse(raw) as PostContent}
export function checkInlineMedia(content:PostContent,attached:string[]){if(content.inlineMedia?.ids.some(id=>!attached.includes(id)))throw new Fault(400,'Inline images must be attached to this post')}
