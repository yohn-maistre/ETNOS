import test from 'node:test'
import assert from 'node:assert/strict'
import {rememberSignatures,restoreSignatures,type ProtocolSignature} from '../src/protocol-replay.ts'
test('provider-issued tool signatures survive semantic replay, stay scoped to the work cache, and reject changed calls',async()=>{
 const rows=new Map<string,ProtocolSignature>(),replay={get:(id:string)=>rows.get(id),put:(row:ProtocolSignature)=>{rows.set(row.id,row)}},signed=[{id:'call',function:{name:'research_helper',arguments:'{"task":"Compare sources","limit":1}'},extra_content:{google:{thought_signature:'synthetic-opaque-original'}}}]
 await rememberSignatures(signed,'synthetic-gemini',replay)
 const messages=[{role:'assistant',tool_calls:[{id:'call',function:{name:'research_helper',arguments:'{ "limit": 1, "task": "Compare sources" }'}}]}];await restoreSignatures(messages,replay);assert.deepEqual((messages[0].tool_calls[0] as unknown as {extra_content:unknown}).extra_content,signed[0].extra_content)
 const another=[{role:'assistant',tool_calls:[{id:'call',function:{name:'research_helper',arguments:'{}'}}]}];await restoreSignatures(another,{get:()=>undefined,put:()=>{}});assert.equal('extra_content' in another[0].tool_calls[0],false)
 await assert.rejects(restoreSignatures([{role:'assistant',tool_calls:[{id:'call',function:{name:'research_helper',arguments:'{"task":"A different task"}'}}]}],replay),/resident:runtime-protocol/)
 await assert.rejects(rememberSignatures([{...signed[0],extra_content:{google:{thought_signature:'x'.repeat(8193)}}}],'synthetic',replay),/resident:provider-output/)
})
