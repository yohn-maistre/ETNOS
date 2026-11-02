/** Fixed-provider public video cards. Never fetch the caller's URL or any player bytes. */
const policy={'cache-control':'public, max-age=3600, s-maxage=86400','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
export function videoIdentity(provider:string,id:string){return provider==='youtube'&&/^[\w-]{11}$/.test(id)||provider==='vimeo'&&/^\d{6,12}$/.test(id)}
async function bytes(response:Response,max:number){
 if(!response.body)throw Error('empty')
 const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>max){await reader.cancel();throw Error('size')}parts.push(part.value)}}finally{reader.releaseLock()}
 const output=new Uint8Array(size);let offset=0;for(const p of parts){output.set(p,offset);offset+=p.length}return output
}
async function metadata(provider:string,id:string,fetcher:typeof fetch){
 const url=provider==='youtube'?'https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+id)+'&format=json':'https://vimeo.com/api/oembed.json?url='+encodeURIComponent('https://vimeo.com/'+id)
 const response=await fetcher(url,{redirect:'error',credentials:'omit',headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)})
 if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('unavailable')
 const data=JSON.parse(new TextDecoder().decode(await bytes(response,32768)))
 let image:string|null=null
 if(provider==='youtube')image='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
 else{try{const u=new URL(data.thumbnail_url);if(u.protocol==='https:'&&u.hostname==='i.vimeocdn.com'&&!u.port&&!u.username&&!u.password)image=u.href}catch{/* no arbitrary proxy */}}
 return {title:typeof data.title==='string'?data.title.trim().slice(0,300):'',image}
}
export async function publicVideo(provider:string,id:string,image=false,fetcher:typeof fetch=fetch){
 if(!videoIdentity(provider,id))return new Response(null,{status:404})
 try{
  const data=image&&provider==='youtube'?{title:'',image:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'}:await metadata(provider,id,fetcher)
  if(!image)return Response.json({title:data.title||'Video',provider:provider==='youtube'?'YouTube':'Vimeo',image:data.image?'/v1/video-preview/'+provider+'/'+id+'/image':null},{headers:policy})
  if(!data.image)return new Response(null,{status:404})
  const response=await fetcher(data.image,{redirect:'error',credentials:'omit',headers:{accept:'image/jpeg,image/png,image/webp'},signal:AbortSignal.timeout(6000)})
  const type=response.headers.get('content-type')?.split(';')[0].trim()
  if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(type??''))throw Error('image')
  const body=await bytes(response,1048576)
  const valid=type==='image/jpeg'?body[0]===255&&body[1]===216&&body[2]===255:type==='image/png'?body.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':new TextDecoder().decode(body.slice(0,4))==='RIFF'&&new TextDecoder().decode(body.slice(8,12))==='WEBP'
  if(!valid)throw Error('image')
  return new Response(body,{headers:{...policy,'content-type':type!,'content-security-policy':"default-src 'none'"}})
 }catch{
  return image?new Response(null,{status:404,headers:{'cache-control':'no-store'}}):Response.json({title:provider==='youtube'?'Video YouTube':'Video Vimeo',provider:provider==='youtube'?'YouTube':'Vimeo',image:provider==='youtube'?'/v1/video-preview/youtube/'+id+'/image':null},{headers:{...policy,'cache-control':'public, max-age=60'}})
 }
}
