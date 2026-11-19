import {test} from 'node:test'
import assert from 'node:assert/strict'
import {leiden,modularity,nullModel,strategicRoles,hill,predictLinks,layout,rng,type WeightedEdge} from '../src/knowledge-graph.ts'

/** Planted partition: g groups of size n, dense inside, sparse between. */
function planted(g:number,n:number,pIn:number,pOut:number,seed:number){
  const r=rng(seed),nodes=Array.from({length:g*n},(_,i)=>'n'+i),edges:WeightedEdge[]=[]
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const same=Math.floor(i/n)===Math.floor(j/n);if(r()<(same?pIn:pOut))edges.push([nodes[i]!,nodes[j]!,1])}
  return {nodes,edges,truth:new Map(nodes.map((x,i)=>[x,Math.floor(i/n)]))}
}
/** Share of node pairs on which two partitions agree (Rand index). */
function rand(a:Map<string,number>,b:Map<string,number>){const k=[...a.keys()];let agree=0,total=0;for(let i=0;i<k.length;i++)for(let j=i+1;j<k.length;j++){total++;if((a.get(k[i]!)===a.get(k[j]!))===(b.get(k[i]!)===b.get(k[j]!)))agree++}return agree/total}

test('Leiden recovers a planted partition and is reproducible',()=>{
  const {nodes,edges,truth}=planted(4,15,0.5,0.02,3)
  const found=leiden(nodes,edges,{seed:1})
  assert.ok(rand(found,truth)>0.97,'recovers the planted groups')
  assert.equal(new Set(found.values()).size,4)
  assert.deepEqual([...leiden(nodes,edges,{seed:1})],[...found],'same seed, same clusters')
  assert.ok(modularity(nodes,edges,found)>0.5)
  // Every cluster is connected (the Leiden guarantee).
  for(const c of new Set(found.values())){
    const members=new Set(nodes.filter(n=>found.get(n)===c)),seen=new Set([[...members][0]!]),stack=[[...members][0]!]
    while(stack.length){const v=stack.pop()!;for(const [a,b] of edges){const u=a===v?b:b===v?a:undefined;if(u&&members.has(u)&&!seen.has(u)){seen.add(u);stack.push(u)}}}
    assert.equal(seen.size,members.size)
  }
})

test('the null model separates structure from chance',()=>{
  const {nodes,edges}=planted(3,12,0.6,0.03,5)
  const structured=nullModel(nodes,edges,{samples:10,seed:2})
  assert.ok(structured.z!==null&&structured.z>3,'planted clusters are far above rewired graphs: z='+structured.z)
  const r=rng(9),flat:WeightedEdge[]=[];for(let i=0;i<36;i++)for(let j=i+1;j<36;j++)if(r()<0.15)flat.push(['n'+i,'n'+j,1])
  const random=nullModel(nodes,flat,{samples:10,seed:2})
  assert.ok(random.z===null||random.z<3,'a random graph is not reported as structured: z='+random.z)
})

test('roles, Hill numbers, link prediction and layout',()=>{
  const edges:WeightedEdge[]=[['a','b',1],['b','c',1],['a','c',1],['c','d',1],['d','e',1],['e','f',1],['d','f',1],['f','g',1]]
  const clusters=new Map([['a',0],['b',0],['c',0],['d',1],['e',1],['f',1],['g',2]])
  const roles=strategicRoles(edges,clusters)
  assert.equal(roles.length,3);assert.ok(roles.every(r=>['inti','dasar-tipis','khusus','baru-atau-memudar'].includes(r.role)))
  assert.deepEqual(hill({ensiklopedia:9,pemerintah:1}).q0,2)
  assert.ok(hill({a:1,b:1}).q1===2&&hill({a:5}).q2===1)
  assert.deepEqual(hill({}),{q0:0,q1:0,q2:0})
  const links=predictLinks(['a','b','c','d','e','f','g'],edges)
  assert.ok(links.length>0&&links.every(l=>!edges.some(([x,y])=>(x===l.a&&y===l.b)||(x===l.b&&y===l.a))),'only unlinked pairs')
  assert.deepEqual(links,predictLinks(['a','b','c','d','e','f','g'],edges))
  const p=layout(['a','b','c','d'],edges,{seed:4,iterations:50})
  assert.deepEqual([...p],[...layout(['a','b','c','d'],edges,{seed:4,iterations:50})])
  assert.ok([...p.values()].every(([x,y])=>Math.abs(x)<=1&&Math.abs(y)<=1))
})
