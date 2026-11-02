import {Fault} from './core.ts'
export type PostContent={title?:string;url?:string;format?:'plain'|'markdown';warning?:string;inlineMedia?:{version:1;ids:string[]};poll?:{options:string[];closesAt:number};event?:{startsAt:number;endsAt?:number;location:string}}
const short=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max)throw new Fault(400,'Invalid post field');return value.trim()}
export function contentInput(value:unknown,now:number):PostContent{
 if(value===undefined)return{}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Fault(400,'Invalid post content')
 const v=value as Record<string,unknown>,c:PostContent={}
 for(const key of Object.keys(v))if(!['title','url','format','warning','poll','event','inlineMedia'].includes(key))throw new Fault(400,'Unknown post field')
 if(v.title!==undefined)c.title=short(v.title,180)
 if(v.warning!==undefined)c.warning=short(v.warning,160)
 if(v.format!==undefined){if(v.format!=='plain'&&v.format!=='markdown')throw new Fault(400,'Invalid text format');c.format=v.format}
 if(v.inlineMedia!==undefined){const m=v.inlineMedia as {version?:unknown;ids?:unknown};if(!m||m.version!==1||!Array.isArray(m.ids)||m.ids.length>4||m.ids.some(x=>typeof x!=='string'||!/^[-a-f0-9]{36}$/.test(x))||new Set(m.ids).size!==m.ids.length||c.format!=='markdown')throw new Fault(400,'Invalid inline image document');c.inlineMedia={version:1,ids:m.ids as string[]}}
 if(v.url!==undefined){const raw=short(v.url,2048);if(raw){let u:URL;try{u=new URL(raw)}catch{throw new Fault(400,'A complete http or https link is required')};if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Fault(400,'A complete http or https link is required');c.url=u.href}}
 if(v.poll!==undefined){const p=v.poll as {options?:unknown;closesAt?:unknown};if(!p||!Array.isArray(p.options)||p.options.length<2||p.options.length>6)throw new Fault(400,'A poll needs two to six options');const options=p.options.map(x=>short(x,100));if(options.some(x=>!x)||new Set(options.map(x=>x.normalize('NFKC').toLocaleLowerCase('en'))).size!==options.length)throw new Fault(400,'Poll options must be different');if(!Number.isSafeInteger(p.closesAt)||Number(p.closesAt)<=now||Number(p.closesAt)>now+30*86400000)throw new Fault(400,'Poll closing time must be within 30 days');c.poll={options,closesAt:Number(p.closesAt)}}
 if(v.event!==undefined){const e=v.event as {startsAt?:unknown;endsAt?:unknown;location?:unknown};if(!e||!Number.isSafeInteger(e.startsAt)||Number(e.startsAt)<0||Number(e.startsAt)>now+5*366*86400000)throw new Fault(400,'Invalid event time');if(e.endsAt!==undefined&&(!Number.isSafeInteger(e.endsAt)||Number(e.endsAt)<=Number(e.startsAt)))throw new Fault(400,'Event end must be after its start');c.event={startsAt:Number(e.startsAt),...(e.endsAt!==undefined?{endsAt:Number(e.endsAt)}:{}),location:short(e.location??'',200)}}
 if(c.poll&&c.event)throw new Fault(400,'Choose a poll or an event')
 return c
}
export function contentOf(raw:string):PostContent{return JSON.parse(raw) as PostContent}
export function checkInlineMedia(content:PostContent,attached:string[]){if(content.inlineMedia?.ids.some(id=>!attached.includes(id)))throw new Fault(400,'Inline images must be attached to this post')}
