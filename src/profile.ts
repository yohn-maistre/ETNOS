import {Fault,type StrataCore} from './core.ts'
export function updateProfile(s:StrataCore,actorId:string,value:Record<string,unknown>){
 return s.tx(()=>{
  if(s.actor(actorId).kind!=='human')throw new Fault(403,'Human profile owner required')
  if(Object.keys(value).some(k=>!['bio','website','location'].includes(k)))throw new Fault(400,'Edit only bio, website or location')
  function text(key:string,max:number){const v=value[key];if(typeof v!=='string'||v.length>max)throw new Fault(400,'Invalid profile '+key);return v.trim()}
  const bio=text('bio',600),location=text('location',100);let website=text('website',2048)
  if(website){let u:URL;try{u=new URL(website)}catch{throw new Fault(400,'A complete HTTPS website is required')};if(u.protocol!=='https:'||u.username||u.password)throw new Fault(400,'A complete HTTPS website is required');website=u.href}
  s.run('INSERT INTO actor_profiles VALUES(?,?,?,?) ON CONFLICT(actor_id) DO UPDATE SET bio=excluded.bio,website=excluded.website,location=excluded.location',actorId,bio,website,location);s.audit(actorId,'profile.update',actorId)
  return {bio,website,location}
 })
}
