/**
 * A small inverted-file (IVF) index for embeddings, in plain TypeScript so the same code runs
 * offline in the build, in a Worker and in the browser. Vectors are L2-normalised and stored as
 * int8 (value × 127), so similarity is a dot product. Built with seeded k-means: the same input
 * gives the same index.
 *
 * Below a few tens of thousands of vectors an exact scan is as fast as any approximate index;
 * `search` falls back to it when the index has a single list. The IVF layout is here so the file
 * format does not change when the corpus grows.
 */
import {rng} from './knowledge-graph.ts'

export interface VectorIndex{version:1;dims:number;ids:string[];vectors:Int8Array;centroids:Float32Array;lists:number[][]}
export interface StoredIndex{version:1;dims:number;ids:string[];vectors:string;centroids:string;lists:number[][]}

export function normalise(v:ArrayLike<number>){let n=0;for(let i=0;i<v.length;i++)n+=v[i]!*v[i]!;n=Math.sqrt(n)||1;return Float32Array.from(v,x=>x/n)}
export function quantise(v:Float32Array){return Int8Array.from(v,x=>Math.max(-127,Math.min(127,Math.round(x*127))))}
const dotQ=(a:Int8Array,ai:number,q:Float32Array,dims:number)=>{let s=0;for(let i=0;i<dims;i++)s+=a[ai+i]!*q[i]!;return s/127}
const dotF=(a:Float32Array,ai:number,q:Float32Array,dims:number)=>{let s=0;for(let i=0;i<dims;i++)s+=a[ai+i]!*q[i]!;return s}

/** Build an index over rows of normalised vectors. `lists` defaults to about √n, at least 1. */
export function buildIndex(ids:string[],rows:ArrayLike<number>[],options:{lists?:number;seed?:number;iterations?:number}={}):VectorIndex{
 if(ids.length!==rows.length||!rows.length)throw new Error('ids and rows must match and not be empty')
 const dims=rows[0]!.length,n=rows.length,k=Math.max(1,Math.min(n,options.lists??Math.round(Math.sqrt(n)))),random=rng(options.seed??1)
 const unit=rows.map(normalise),vectors=new Int8Array(n*dims)
 unit.forEach((v,i)=>vectors.set(quantise(v),i*dims))
 // k-means++ seeding, then Lloyd iterations on the unit sphere (spherical k-means).
 const centroids=new Float32Array(k*dims),first=Math.floor(random()*n)
 centroids.set(unit[first]!,0)
 const best=new Float64Array(n).fill(Infinity)
 for(let c=1;c<k;c++){
  let total=0
  for(let i=0;i<n;i++){const d=1-dotF(centroids,(c-1)*dims,unit[i]!,dims);if(d<best[i]!)best[i]=d;total+=Math.max(best[i]!,0)}
  let r=random()*total,pick=n-1
  for(let i=0;i<n;i++){r-=Math.max(best[i]!,0);if(r<=0){pick=i;break}}
  centroids.set(unit[pick]!,c*dims)
 }
 const assign=new Int32Array(n)
 for(let it=0;it<(options.iterations??20);it++){
  let moved=0
  for(let i=0;i<n;i++){let bc=0,bs=-Infinity;for(let c=0;c<k;c++){const s=dotF(centroids,c*dims,unit[i]!,dims);if(s>bs){bs=s;bc=c}}if(assign[i]!==bc||it===0){moved++;assign[i]=bc}}
  const sum=new Float64Array(k*dims),count=new Int32Array(k)
  for(let i=0;i<n;i++){count[assign[i]!]!++;for(let d=0;d<dims;d++)sum[assign[i]!*dims+d]+=unit[i]![d]!}
  for(let c=0;c<k;c++)if(count[c]){const v=normalise(sum.subarray(c*dims,(c+1)*dims));centroids.set(v,c*dims)}
  if(!moved&&it>0)break
 }
 const lists:number[][]=Array.from({length:k},()=>[])
 for(let i=0;i<n;i++)lists[assign[i]!]!.push(i)
 return {version:1,dims,ids:[...ids],vectors,centroids,lists}
}

/** Nearest neighbours by cosine similarity. `probe` lists are scanned (all of them gives the exact answer). */
export function search(index:VectorIndex,query:ArrayLike<number>,k=10,probe=Math.max(1,Math.ceil(index.lists.length/4))){
 const q=normalise(query),{dims}=index
 const order=index.lists.map((_,c)=>[c,dotF(index.centroids,c*dims,q,dims)] as const).sort((a,b)=>b[1]-a[1]).slice(0,Math.min(probe,index.lists.length))
 const hits:{id:string;score:number}[]=[]
 for(const [c] of order)for(const i of index.lists[c]!)hits.push({id:index.ids[i]!,score:dotQ(index.vectors,i*dims,q,dims)})
 return hits.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,k).map(h=>({id:h.id,score:Math.round(h.score*1000)/1000}))
}
export function vectorOf(index:VectorIndex,id:string){const i=index.ids.indexOf(id);if(i<0)return null;return Float32Array.from(index.vectors.subarray(i*index.dims,(i+1)*index.dims),x=>x/127)}

const b64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
export function storeIndex(index:VectorIndex):StoredIndex{return {version:1,dims:index.dims,ids:index.ids,vectors:b64(new Uint8Array(index.vectors.buffer,index.vectors.byteOffset,index.vectors.byteLength)),centroids:b64(new Uint8Array(index.centroids.buffer,index.centroids.byteOffset,index.centroids.byteLength)),lists:index.lists}}
export function loadIndex(s:StoredIndex):VectorIndex{
 if(s.version!==1)throw new Error('Unknown index version')
 const v=unb64(s.vectors),c=unb64(s.centroids)
 return {version:1,dims:s.dims,ids:s.ids,vectors:new Int8Array(v.buffer,v.byteOffset,v.byteLength),centroids:new Float32Array(c.buffer.slice(c.byteOffset,c.byteOffset+c.byteLength)),lists:s.lists}
}
