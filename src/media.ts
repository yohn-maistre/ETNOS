import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { Fault, type EtnosCore } from './core.ts'

// Deliberately bounded preview store. Originals belong in a custodial store.
export const MEDIA_MAX_BYTES=512*1024
const DAY=86400000
export type MediaView={id:string;url:string;alt:string;width:number;height:number}
type ImageRow={id:string;owner_id:string;community_id:string;post_id:string|null;bytes:Uint8Array;size:number;width:number;height:number;alt:string;created:number}
export function mediaViews(s:EtnosCore,postId:string):MediaView[]{
  return s.all<{id:string;alt:string;width:number;height:number}>('SELECT id,alt,width,height FROM media WHERE post_id=? ORDER BY position',postId).map(m=>({...m,url:'/v1/media/'+m.id}))
}
/** Accept only a static WebP image container, without metadata/animation chunks.
 * This validates framing, codec signature and dimensions, not a full codec decode.
 * Browser re-encoding removes original EXIF/GPS; never accept SVG or arbitrary MIME. */
export function inspectWebP(bytes:Uint8Array){
  const b=Buffer.from(bytes)
  const invalid=()=>{throw new Fault(400,'A static WebP image without metadata is required')}
  if(b.length<26||b.length>MEDIA_MAX_BYTES||b.toString('latin1',0,4)!=='RIFF'||b.toString('latin1',8,12)!=='WEBP'||b.readUInt32LE(4)!==b.length-8)invalid()
  let offset=12,width=0,height=0,images=0,extended=false,alpha=false,canvasWidth=0,canvasHeight=0
  while(offset<b.length){
    if(offset+8>b.length)invalid()
    const type=b.toString('latin1',offset,offset+4),length=b.readUInt32LE(offset+4),start=offset+8,end=start+length
    if(end>b.length||end+(length%2)>b.length)invalid()
    if(type==='VP8X'){
      if(offset!==12||length!==10||extended||b[start]&~0x10||b[start+1]||b[start+2]||b[start+3])invalid()
      extended=true;canvasWidth=b.readUIntLE(start+4,3)+1;canvasHeight=b.readUIntLE(start+7,3)+1
    }else if(type==='ALPH'){
      if(!extended||images||alpha||length<1)invalid();alpha=true
    }else if(type==='VP8 '){
      if(images++||length<10||b[start]&1||b[start+3]!==0x9d||b[start+4]!==1||b[start+5]!==0x2a)invalid()
      width=b.readUInt16LE(start+6)&0x3fff;height=b.readUInt16LE(start+8)&0x3fff
    }else if(type==='VP8L'){
      if(images++||alpha||length<5||b[start]!==0x2f||(b[start+4]&0xe0))invalid()
      const bits=b.readUInt32LE(start+1);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1
    }else invalid()
    offset=end+(length%2)
  }
  if(images!==1||!width||!height||width>2048||height>2048||width*height>4194304||(extended&&(canvasWidth!==width||canvasHeight!==height)))invalid()
  return{width,height}
}
export class Media{
  private s:EtnosCore
  constructor(s:EtnosCore){this.s=s}
  upload(actor:string,communityId:string,encoded:string,alt:string){
    return this.s.tx(()=>{
      this.s.requireMember(actor,communityId)
      if(this.s.actor(actor).kind!=='human')throw new Fault(403,'Human image uploads only')
      if(this.s.community(communityId).publication!=='local')throw new Fault(409,'AT image publishing is not enabled')
      if(encoded.length>Math.ceil(MEDIA_MAX_BYTES/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new Fault(400,'Invalid image encoding')
      const bytes=Buffer.from(encoded,'base64');if(bytes.toString('base64')!==encoded)throw new Fault(400,'Invalid image encoding')
      if(typeof alt!=='string'||alt.length>1000)throw new Fault(400,'Image description is too long')
      const dimensions=inspectWebP(bytes),now=this.s.clock()
      this.s.run('DELETE FROM media WHERE post_id IS NULL AND created<?',now-DAY)
      const usage=this.s.get<{size:number;n:number;hourly:number;drafts:number}>('SELECT COALESCE(SUM(size),0) size,COUNT(*) n,COALESCE(SUM(CASE WHEN created>? THEN 1 ELSE 0 END),0) hourly,COALESCE(SUM(CASE WHEN post_id IS NULL THEN 1 ELSE 0 END),0) drafts FROM media WHERE owner_id=? AND created>?',now-3600000,actor,now-DAY)!
      const total=this.s.get<{size:number;n:number}>('SELECT COALESCE(SUM(size),0) size,COUNT(*) n FROM media')!
      if(usage.n>=64||usage.hourly>=32||usage.drafts>=16||total.n>=5000)throw new Fault(429,'Preview image upload limit reached')
      if(usage.size+bytes.length>8*1024*1024||total.size+bytes.length>64*1024*1024)throw new Fault(429,'Preview image storage limit reached')
      const id=randomUUID()
      this.s.run('INSERT INTO media(id,owner_id,community_id,bytes,size,width,height,alt,created) VALUES(?,?,?,?,?,?,?,?,?)',id,actor,communityId,bytes,bytes.length,dimensions.width,dimensions.height,alt.trim(),now)
      return{id,url:'/v1/media/'+id,alt:alt.trim(),...dimensions}
    })
  }
  attach(actor:string,postId:string,ids:string[]){
    this.s.tx(()=>{
      const post=this.s.getPost(actor,postId)
      if(ids.length>4||new Set(ids).size!==ids.length)throw new Fault(400,'Choose up to four different images')
      if(!ids.length)return
      if(mediaViews(this.s,postId).length)throw new Fault(409,'Images already attached')
      if(post.author_id!==actor||this.s.actor(actor).kind!=='human'||post.uri)throw new Fault(403,'Local author image attachment required')
      this.s.requireMember(actor,post.community_id)
      for(const[id,position]of ids.map((id,i)=>[id,i] as const)){
        const draft=this.s.get<ImageRow>('SELECT * FROM media WHERE id=?',id)
        if(!draft||draft.owner_id!==actor||draft.community_id!==post.community_id||draft.post_id||this.s.clock()-draft.created>=DAY)throw new Fault(404,'Image unavailable')
        this.s.run('UPDATE media SET post_id=?,position=? WHERE id=?',postId,position,id)
      }
    })
  }
  response(actor:string|undefined,id:string){
    const m=this.s.get<ImageRow>('SELECT * FROM media WHERE id=?',id)
    if(!m)throw new Fault(404,'Not found')
    if(m.post_id)this.s.getPost(actor,m.post_id)
    else if(this.s.clock()-m.created>=DAY||!actor||actor!==m.owner_id||!this.s.canRead(actor,this.s.community(m.community_id)))throw new Fault(404,'Not found')
    return new Response(new Uint8Array(m.bytes),{headers:{'content-type':'image/webp','content-length':String(m.size),'cache-control':'no-store','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin','referrer-policy':'no-referrer'}})
  }
}
