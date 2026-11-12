import test from 'node:test'
import assert from 'node:assert/strict'
import {residentPromptContext} from '../src/resident-prompt.ts'

test('resident model context minimizes authority/identifiers and redacts public contact details before drafting',()=>{
 const result=residentPromptContext({skill:'thread-reply',community:'Public commons',language:'id',evidence:[{id:'internal-item',revision:7,title:'Public source',url:'https://example.org/reference',summary:'Contact reader@example.org.',sources:[{id:'internal-source',revision:8}]}],question:{postId:'question-id',revision:3,title:'A question',text:'What does this say?',context:[{postId:'parent-id',revision:4,text:'An earlier public question.'}]}})
 assert.equal(result.question!.text,'What does this say?');assert.equal(result.evidence[0].reference,'S1');assert.match(result.evidence[0].summary,/email redacted/);assert.doesNotMatch(JSON.stringify(result),/internal-item|internal-source|question-id|parent-id|example.org|reader@/)
})
test('a long non-Latin question stays complete while quotes shrink within the model budget without mutating canonical pins',()=>{
 const text='河'.repeat(3900),input={skill:'thread-reply' as const,community:'Public commons',evidence:Array.from({length:5},(_,i)=>({id:'item-'+i,revision:1,title:'河'.repeat(240),url:'https://example.org/'+i,summary:'河'.repeat(600),sources:[{id:'source-'+i,revision:1}]})),question:{postId:'question',revision:1,title:'Public question',text,context:Array.from({length:3},(_,i)=>({postId:'parent-'+i,revision:1,text:'河'.repeat(700)}))}},before=JSON.stringify(input),result=residentPromptContext(input)
 assert.equal(result.question!.text,text);assert.ok(new TextEncoder().encode(JSON.stringify(result)).byteLength<=18000);assert.ok(result.evidence.some(e=>e.truncated)||result.question!.context.some(p=>p.truncated));assert.equal(JSON.stringify(input),before)
})
