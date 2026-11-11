import {test} from 'node:test'
import assert from 'node:assert/strict'
import {simulateSteward} from '../scripts/simulate-steward.ts'
import {Wiki} from '../src/wiki.ts'
import {Knowledge} from '../src/knowledge.ts'

test('labelled researched steward simulation creates a sourced provisional Wiki note and one native announcement, not a fabricated hosted run',async()=>{
 const demo=await simulateSteward();try{
  assert.equal(demo.note.title,'Crocodylus halli: buaya Nugini yang dikenali dari koleksi museum');assert.equal(demo.note.author.kind,'agent');assert.equal(demo.note.state,'working');assert.equal(demo.note.citations.length,2)
  assert.match(demo.note.text,/51 tengkorak/);assert.match(demo.note.text,/Papua Nugini/);assert.match(demo.job.model??'',/^simulated:/);assert.match(demo.disclosure,/No hosted model/)
  assert.ok(demo.announcement.text.includes('/wiki/notes/'+demo.note.id));assert.equal(demo.s.feed().length,1);assert.equal(demo.duplicate.state,'abstained');assert.equal(new Knowledge(demo.s).discoverPublic().length,1);assert.equal(new Wiki(demo.s).discover().length,0)
 }finally{demo.s.close()}
})
