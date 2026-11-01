/** Optional public-news port. No forum credentials, content or queries cross this boundary. */
export type NewsItem={id:string;title:string;url:string;publishedAt:string|null;sourceCount:number}
export type NewsFeed={source:{name:string;url:string};items:NewsItem[];available:boolean}
const source={name:'West Papua Watch',url:'https://westpapua.watch/news/'}
const unavailable=(state='unavailable')=>Response.json({source,items:[],available:false} satisfies NewsFeed,{status:503,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-etnos-news-state':state}})
export async function publicNews(fetcher:typeof fetch=fetch) {
  let stage='fetch'
  try {
    const response=await fetcher('https://westpapua.watch/api/current?limit=6',{headers:{accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)})
    if(!response.ok)return unavailable('upstream-'+response.status)
    if(!response.headers.get('content-type')?.includes('json')||!response.body)return unavailable('format')
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0
    try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>262144){await reader.cancel();return unavailable('size')}chunks.push(part.value)}}finally{reader.releaseLock()}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    stage='parse'
    const data=JSON.parse(new TextDecoder().decode(bytes))
    if(!Array.isArray(data.items))return unavailable('shape')
    const items:NewsItem[]=[],seen=new Set<string>()
    for(const record of data.items.slice(0,12)){
      const id=String(record?.id??''),title=record?.title?.id||record?.title?.en
      if(!/^\d{1,12}$/.test(id)||typeof title!=='string'||!title.trim()||seen.has(id))continue
      seen.add(id)
      const date=Date.parse(record.latest_report_at??'')
      items.push({id,title:title.trim().slice(0,300),url:'https://westpapua.watch/story/?id='+id,publishedAt:Number.isFinite(date)?new Date(date).toISOString():null,sourceCount:Number.isSafeInteger(record.source_count)&&record.source_count>0?Math.min(record.source_count,10000):0})
      if(items.length===6)break
    }
    return Response.json({source,items,available:true} satisfies NewsFeed,{headers:{'cache-control':'public, max-age=60, s-maxage=300','x-content-type-options':'nosniff'}})
  } catch { return unavailable(stage) }
}
