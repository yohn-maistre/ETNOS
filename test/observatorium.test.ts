import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bands,worldByRule} from '../src/world-model.ts'
import {BANDS} from '../apps/web/src/world-scale.ts'
import places from '../src/catalogues/tanah-papua-places.json' with {type:'json'}

const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'))

test('the web app draws the same seven level bands as the world model',()=>{
 assert.deepEqual(BANDS.map(b=>({key:b.key,label:b.label,classes:b.classes})),bands.map(b=>({key:b.key,label:b.label,classes:b.classes})))
 // Each band has its own colour in each theme.
 for(const mode of ['light','dark'] as const)assert.equal(new Set(BANDS.map(b=>b[mode])).size,BANDS.length)
})

test('the shipped knowledge graph carries size, pace and level, and they match the rules',()=>{
 const g=read('apps/web/public/observatory/knowledge/graph.json') as {nodes:{id:string;class:string;title:string;context:string|null;world:unknown}[]}
 assert.ok(g.nodes.length>0)
 for(const n of g.nodes){
  const w=worldByRule({slug:n.id,class:n.class,title:n.title,context_slug:n.context})
  const strip=(r:{lo:number;hi:number;basis:string;note:string}|null)=>r&&{lo:r.lo,hi:r.hi,basis:r.basis,note:r.note}
  assert.deepEqual(n.world,{size:strip(w.size),pace:strip(w.pace),level:w.level&&{code:w.level.code,band:w.level.band,basis:w.level.basis,note:w.level.note}},n.id)
 }
})

test('public place points are the catalogue points, inside Tanah Papua and no finer than 0.01 degree',()=>{
 const shipped=read('apps/web/public/observatory/places.json')
 assert.deepEqual(shipped,places)
 for(const p of Object.values(shipped.places as Record<string,{latitude:number;longitude:number}>)){
  assert.ok(p.longitude>=129&&p.longitude<=141.1&&p.latitude>=-9.5&&p.latitude<=0.5)
  assert.equal(Math.round(p.latitude*100)/100,p.latitude);assert.equal(Math.round(p.longitude*100)/100,p.longitude)
 }
})
