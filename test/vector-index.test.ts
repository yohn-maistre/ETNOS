import test from 'node:test'
import assert from 'node:assert/strict'
import {rng} from '../src/knowledge-graph.ts'
import {buildIndex,search,storeIndex,loadIndex,vectorOf} from '../src/vector-index.ts'

// Synthetic clustered vectors: 12 centres in 64 dimensions, 50 noisy points each.
function data(seed:number){
 const r=rng(seed),gauss=()=>{const u=r()||1e-9,v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
 const centres=Array.from({length:12},()=>Array.from({length:64},gauss))
 const ids:string[]=[],rows:number[][]=[]
 centres.forEach((c,ci)=>{for(let j=0;j<50;j++){ids.push(`c${ci}-${j}`);rows.push(c.map(x=>x+gauss()*0.6))}})
 return {ids,rows,gauss}
}

test('IVF search finds the same neighbours as an exact scan, and the index is reproducible',()=>{
 const {ids,rows,gauss}=data(7)
 const index=buildIndex(ids,rows,{seed:3})
 assert.equal(index.lists.length,Math.round(Math.sqrt(600)))
 assert.equal(index.lists.flat().length,600)
 let recall=0,queries=0
 for(let i=0;i<600;i+=15){
  const q=rows[i]!.map(x=>x+gauss()*0.1)
  const exact=new Set(search(index,q,10,index.lists.length).map(h=>h.id))
  const approx=search(index,q,10,6).map(h=>h.id)
  recall+=approx.filter(id=>exact.has(id)).length/10;queries++
 }
 assert.ok(recall/queries>=0.95,`recall ${recall/queries}`)
 // The nearest neighbour of a stored point is itself.
 assert.equal(search(index,vectorOf(index,'c4-7')!,1,index.lists.length)[0]!.id,'c4-7')
 // Same seed, same index; stored form round-trips.
 const again=buildIndex(ids,rows,{seed:3})
 assert.deepEqual(again.lists,index.lists)
 const loaded=loadIndex(JSON.parse(JSON.stringify(storeIndex(index))))
 assert.deepEqual(search(loaded,rows[0]!,5),search(index,rows[0]!,5))
 assert.throws(()=>buildIndex(['a'],[]),/must match/)
})
