// Builds one reference point and one area for every place in the Tanah Papua catalogue, from the
// simplified Badan Informasi Geospasial outlines that the site already ships for its maps.
//
//   node scripts/observatory/build-place-points.ts
//
// Output (the same JSON in two places):
//   src/catalogues/tanah-papua-places.json            read by the knowledge model's size rule
//   apps/web/public/observatory/places.json           read by the light locator maps and the observatory map
//
// A regency's point is the point inside its largest outline that lies farthest from the outline's edge,
// so it never falls in the sea or in a neighbour. A province or a customary reference region gets the
// area-weighted centre of its members, moved to the nearest member point when the centre falls outside.
// Points are rounded to 0.01 degree (about one kilometre). They mark an administrative area, not a site,
// and the outlines are generalised for display; they are not for delineating boundaries.
import {readFileSync,writeFileSync} from 'node:fs'

type Ring=[number,number][]
type Feature={properties:{kabupaten?:string;provinsi?:string};geometry:{type:'Polygon'|'MultiPolygon';coordinates:Ring[]|Ring[][]}}
const root=new URL('../../',import.meta.url).pathname
const geo=(f:string)=>JSON.parse(readFileSync(root+'apps/web/public/geo/'+f,'utf8')) as {features:Feature[]}
const catalogue=JSON.parse(readFileSync(root+'src/catalogues/tanah-papua.json','utf8')) as {entries:{slug:string;title:string;kind:string;facet?:string;parents:string[]}[]}
const PROVINCES=['Papua','Papua Barat','Papua Barat Daya','Papua Tengah','Papua Pegunungan','Papua Selatan']
const R=6371.0088

const polygons=(f:Feature):Ring[][]=>f.geometry.type==='Polygon'?[f.geometry.coordinates as Ring[]]:f.geometry.coordinates as Ring[][]
// Spherical ring area in km² (the formula used by d3-geo and turf for small rings).
function ringArea(ring:Ring){
 let s=0
 for(let i=0;i<ring.length-1;i++){const [l1,p1]=ring[i]!,[l2,p2]=ring[i+1]!;s+=((l2-l1)*Math.PI/180)*(2+Math.sin(p1*Math.PI/180)+Math.sin(p2*Math.PI/180))}
 return Math.abs(s*R*R/2)
}
const polygonArea=(p:Ring[])=>Math.max(0,ringArea(p[0]!)-p.slice(1).reduce((a,r)=>a+ringArea(r),0))
function inside(p:Ring[],x:number,y:number){
 let hit=false
 for(const ring of p)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i]!,[xj,yj]=ring[j]!;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit}
 return hit
}
function edgeDistance(p:Ring[],x:number,y:number){
 let best=Infinity
 for(const ring of p)for(let i=0;i<ring.length-1;i++){
  const [ax,ay]=ring[i]!,[bx,by]=ring[i+1]!,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)))
  best=Math.min(best,Math.hypot(ax+t*dx-x,ay+t*dy-y))
 }
 return best
}
// The interior point farthest from the edge, found on two refining grids.
function interior(p:Ring[]):[number,number]{
 const xs=p[0]!.map(c=>c[0]),ys=p[0]!.map(c=>c[1])
 let [x0,x1,y0,y1]=[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)],best:[number,number,number]=[(x0+x1)/2,(y0+y1)/2,-1]
 for(let pass=0;pass<3;pass++){
  const n=40
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*j/n;if(!inside(p,x,y))continue;const d=edgeDistance(p,x,y);if(d>best[2])best=[x,y,d]}
  const wx=(x1-x0)/8,wy=(y1-y0)/8;[x0,x1,y0,y1]=[best[0]-wx,best[0]+wx,best[1]-wy,best[1]+wy]
 }
 return [best[0],best[1]]
}
const round=(v:number,d=2)=>Math.round(v*10**d)/10**d
const norm=(s:string)=>s.toLowerCase().replace(/^kabupaten\s+/,'').replace(/[^a-z]/g,'')

type Place={slug:string;title:string;facet:string;areaKm2:number;latitude:number;longitude:number}
const out:Record<string,Place>={}
const regencyFeatures=geo('kabupaten.geojson').features.filter(f=>PROVINCES.includes(f.properties.provinsi??''))
const entries=catalogue.entries.filter(e=>e.kind==='place')
for(const e of entries){
 const f=regencyFeatures.find(x=>norm(x.properties.kabupaten??'')===norm(e.title))
 if(!f)throw new Error('No outline for '+e.slug)
 const parts=polygons(f),largest=[...parts].sort((a,b)=>polygonArea(b)-polygonArea(a))[0]!,[lon,lat]=interior(largest)
 out[e.slug]={slug:e.slug,title:e.title,facet:e.facet??'regency',areaKm2:Math.round(parts.reduce((a,p)=>a+polygonArea(p),0)),latitude:round(lat),longitude:round(lon)}
}
const provinceFeatures=geo('provinsi.geojson').features
for(const r of catalogue.entries.filter(e=>e.kind==='region')){
 const members=entries.filter(e=>e.parents.includes(r.slug)).map(e=>out[e.slug]!)
 if(!members.length)continue
 const area=members.reduce((a,m)=>a+m.areaKm2,0)
 let lat=members.reduce((a,m)=>a+m.latitude*m.areaKm2,0)/area,lon=members.reduce((a,m)=>a+m.longitude*m.areaKm2,0)/area
 // The weighted centre must fall inside one of the members; otherwise use the nearest member point.
 const shapes=members.map(m=>regencyFeatures.find(x=>norm(x.properties.kabupaten??'')===norm(m.title))!).flatMap(polygons)
 if(r.facet==='province'){const pf=provinceFeatures.find(x=>x.properties.provinsi===r.title);if(pf)shapes.push(...polygons(pf))}
 if(!shapes.some(p=>inside(p,lon,lat))){const near=[...members].sort((a,b)=>Math.hypot(a.latitude-lat,a.longitude-lon)-Math.hypot(b.latitude-lat,b.longitude-lon))[0]!;lat=near.latitude;lon=near.longitude}
 out[r.slug]={slug:r.slug,title:r.title,facet:r.facet??'region',areaKm2:area,latitude:round(lat),longitude:round(lon)}
}
const file={
 version:1,
 about:'Satu titik acuan dan luas untuk setiap wilayah di katalog Tanah Papua, dihitung dari garis batas Badan Informasi Geospasial yang disederhanakan. Titik menandai wilayah pemerintahan atau wilayah acuan, bukan lokasi tertentu.',
 source:'Badan Informasi Geospasial, Batas Wilayah (geoservices.big.go.id), disederhanakan untuk tampilan; keanggotaan wilayah acuan dari Narasi RPJMN 2020–2024 (Bappenas). Lihat apps/web/licenses/map-data.txt.',
 precision:'0,01 derajat',
 places:Object.fromEntries(Object.entries(out).sort(([a],[b])=>a.localeCompare(b))),
}
const text=JSON.stringify(file,null,1)+'\n'
writeFileSync(root+'src/catalogues/tanah-papua-places.json',text)
writeFileSync(root+'apps/web/public/observatory/places.json',text)
console.log(Object.keys(out).length+' places')
