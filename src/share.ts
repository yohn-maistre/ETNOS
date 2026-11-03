/** Public sharing projection. Callers provide anonymous, bounded reads only. */
export type Share = {title:string;description:string;path:string;image:string;imageAlt:string;type:'website'|'article';index:boolean}
const description='Percakapan, pengetahuan dan kerja bersama.'
export const defaultShare=():Share=>({title:'ETNOS',description,path:'/',image:'/share/default.png',imageAlt:'ETNOS — '+description,type:'website',index:false})
export function previewText(value:unknown,max=240){return String(value??'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[#*_`~>|]/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
const uuid=/^[a-f0-9-]{36}$/
type Read=(path:string)=>Promise<any>
const pages:Record<string,[string,string]>={
 '/':['ETNOS',description],'/explore':['Jelajah ETNOS','Temukan percakapan, kabar, komunitas dan pengetahuan bersama.'],
 '/news':['Kabar · ETNOS','Kabar Papua, sumber liputan dan percakapan terkait.'],'/communities':['Komunitas · ETNOS','Temukan ruang percakapan dan organisasi.'],
 '/groups':['Organisasi · ETNOS','Ruang dan karya bersama dari organisasi.'],'/wiki':['Pengetahuan bersama · ETNOS','Tempat, cerita dan pengetahuan yang ditinjau bersama.'],
 '/voices':['Suara komunitas · ETNOS','Pertanyaan, jajak pendapat dan tindak lanjut komunitas.'],'/work':['Kerja publik · ETNOS','Karya, laporan dan tindak lanjut yang disponsori.'],'/board':['Lajur · ETNOS','Jelajahi percakapan dalam beberapa linimasa.'],
}
function videoCover(raw:unknown){try{const u=new URL(String(raw));if(u.protocol!=='https:'||u.username||u.password||u.port)return null;let id='';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})$/)?.[1]||'';if(u.hostname==='youtu.be')id=u.pathname.slice(1);if(/^[\w-]{11}$/.test(id))return '/v1/video-preview/youtube/'+id+'/image';if(['vimeo.com','www.vimeo.com'].includes(u.hostname)&&/^\/\d{6,12}$/.test(u.pathname))return '/v1/video-preview/vimeo'+u.pathname+'/image'}catch{}return null}
export async function resolveShare(path:string,read:Read,news:(id:string)=>Promise<any>):Promise<Share>{
 const fallback=defaultShare(),p=path.replace(/\/$/,'')||'/',route=p.split('/').slice(1)
 if(pages[p])return {...fallback,title:pages[p][0],description:pages[p][1],path:p,index:true}
 if(route.length!==2)return fallback
 const [kind,id]=route
 try{
  let title='',body='',image=fallback.image,imageAlt=fallback.imageAlt,type:Share['type']='website'
  if(kind==='news'&&/^\d{1,12}$/.test(id)){
   const story=await news(id);if(!story?.title||story.id!==id) return fallback
   title=story.title;body=story.summary;type='article'
   if(typeof story.image==='string'&&new RegExp('^/v1/news/'+id+'/image\\?asset=[a-f0-9]{24}$').test(story.image)){image=story.image;imageAlt=title+(story.imageCredit?' · '+story.imageCredit:'')}
  }else if(kind==='square'&&uuid.test(id)){
   const post=await read('/v1/posts/'+id);if(post.deleted||post.hidden)return fallback
   const community=await read('/v1/communities/'+post.community_id);if(community.visibility!=='public')return fallback
   type='article'
   if(post.content?.warning){title='Posting dengan peringatan konten';body='Buka ETNOS untuk membaca posting ini.'}
   else{title=post.content?.title||previewText(post.text,140)||'Posting oleh '+post.author.name;body=post.text
    const media=post.media?.find((m:any)=>typeof m.url==='string'&&/^\/v1\/media\/[a-f0-9-]{36}$/.test(m.url));if(media){image=media.url;imageAlt=media.alt||title}else{image=videoCover(post.content?.url)||image;imageAlt=title}}
  }else if(kind==='people'&&uuid.test(id)){
   const actor=await read('/v1/actors/'+id);title=actor.name;body=actor.bio||'Posting dan percakapan di ETNOS.'
  }else if(kind==='communities'&&uuid.test(id)){
   const c=await read('/v1/communities/'+id);if(c.visibility!=='public')return fallback;title=c.title;body=c.description
  }else if(kind==='groups'&&uuid.test(id)){
   const g=await read('/v1/groups/'+id);if(g.visibility!=='public')return fallback;title=g.title;body=g.description
  }else if(kind==='contexts'&&/^[-a-z0-9]{1,100}$/.test(id)){
   const c=await read('/v1/contexts/'+id);title=c.title;body=c.description
  }else if(kind==='work'&&uuid.test(id)){
   const w=await read('/v1/work/'+id);title=w.title;body=w.description
  }else if(kind==='wiki'&&uuid.test(id)){
   const w=await read('/v1/wiki/'+id);if(!w.revision)return fallback;title=w.title;body=w.revision.text;type='article'
  }else return fallback
  if(!title)return fallback
  return {title:previewText(title,200),description:previewText(body)||description,path:p,image,imageAlt:previewText(imageAlt,300),type,index:true}
 }catch{return fallback}
}
export const escapeMeta=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function shareTags(meta:Share,origin:string){
 const canonical=new URL(meta.path,origin).href,image=new URL(meta.image,origin).href
 const tags:Record<string,string>={'og:site_name':'ETNOS','og:locale':'id_ID','og:type':meta.type,'og:title':meta.title,'og:description':meta.description,'og:url':canonical,'og:image':image,'og:image:secure_url':image,'og:image:alt':meta.imageAlt}
 const twitter:Record<string,string>={'twitter:card':'summary_large_image','twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':image,'twitter:image:alt':meta.imageAlt}
 return `<meta name="description" content="${escapeMeta(meta.description)}"><link rel="canonical" href="${escapeMeta(canonical)}">`+Object.entries(tags).map(([key,value])=>`<meta property="${key}" content="${escapeMeta(value)}">`).join('')+Object.entries(twitter).map(([key,value])=>`<meta name="${key}" content="${escapeMeta(value)}">`).join('')+(!meta.index?'<meta name="robots" content="noindex, nofollow">':'')+(meta.image==='/share/default.png'?'<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">':'')
}
