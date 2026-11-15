/** Ambient public data for a deployment's area. Nothing about a visitor crosses this boundary. */
export type Bounds={west:number;south:number;east:number;north:number}
export type Quake={at:string;magnitude:number;depthKm:number|null;latitude:number;longitude:number;where:string;felt:string}
const source={name:'BMKG',url:'https://www.bmkg.go.id/gempabumi/gempabumi-terkini'}
const feeds=['https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json','https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json']
const text=(x:unknown,max:number)=>typeof x==='string'?x.replace(/\s+/g,' ').trim().slice(0,max):''

function quake(row:unknown):Quake|null{
 if(!row||typeof row!=='object')return null
 const r=row as Record<string,unknown>,at=typeof r.DateTime==='string'?Date.parse(r.DateTime):NaN
 const [latitude,longitude]=text(r.Coordinates,40).split(',').map(Number),magnitude=Number(text(r.Magnitude,8)),depth=Number.parseFloat(text(r.Kedalaman,12))
 if(!Number.isFinite(at)||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!Number.isFinite(magnitude)||magnitude<0||magnitude>10)return null
 return {at:new Date(at).toISOString(),magnitude,depthKm:Number.isFinite(depth)&&depth>=0&&depth<1000?depth:null,latitude,longitude,where:text(r.Wilayah,160),felt:text(r.Dirasakan,200)}
}

/** Recent earthquakes inside the deployment's bounds, newest first. A feed that fails is skipped, not guessed. */
export async function publicQuakes(bounds:Bounds,fetcher:typeof fetch=fetch):Promise<Response>{
 const found=new Map<string,Quake>(),seen:string[]=[];let reached=0
 await Promise.all(feeds.map(async url=>{
  try{
   const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 (compatible; public-feed-reader)'},redirect:'manual',signal:AbortSignal.timeout(6000)})
   seen.push(String(response.status))
   if(!response.ok)return
   const body=await response.json() as {Infogempa?:{gempa?:unknown}},rows=body?.Infogempa?.gempa
   if(!Array.isArray(rows))return
   reached++
   for(const row of rows.slice(0,60)){
    const q=quake(row)
    if(!q||q.longitude<bounds.west||q.longitude>bounds.east||q.latitude<bounds.south||q.latitude>bounds.north)continue
    const earlier=found.get(q.at);found.set(q.at,earlier?{...earlier,felt:earlier.felt||q.felt}:q)
   }
  }catch(error){seen.push(error instanceof Error?error.name:'error')/* one feed down leaves the other */}
 }))
 const items=[...found.values()].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,12)
 return Response.json({source,available:reached>0,items},{status:reached?200:503,headers:{'cache-control':reached?'public, max-age=300, s-maxage=600':'no-store','x-content-type-options':'nosniff','x-upstream':seen.join(',')}})
}
