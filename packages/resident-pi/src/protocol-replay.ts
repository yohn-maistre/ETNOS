import {ResidentFailure} from '../../../src/resident-failure.ts'
export type ProtocolSignature={id:string;name:string;argumentsHash:string;model:string;signature:string}
export type ProtocolReplay={get:(id:string)=>ProtocolSignature|undefined;put:(row:ProtocolSignature)=>void}
async function argumentHash(name:string,raw:string){
 let args:unknown;try{args=JSON.parse(raw)}catch{throw new ResidentFailure('runtime-protocol')}
 const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({name,args:canonical(args)}))))].map(v=>v.toString(16).padStart(2,'0')).join('')
}
/** Pi's generic OpenAI wire adapter drops Gemini extra_content. Keep the exact
 * provider-issued signature in this job's private runtime storage and restore
 * it only for the unchanged tool call. Never fabricate a validator bypass. */
export async function rememberSignatures(toolCalls:unknown,model:string,replay?:ProtocolReplay){
 if(!replay||!Array.isArray(toolCalls))return
 if(toolCalls.length>2)throw new ResidentFailure('provider-output')
 for(const call of toolCalls){
  const signature=call?.extra_content?.google?.thought_signature
  if(signature===undefined)continue
  if(typeof signature!=='string'||!signature||signature.length>8192||typeof call.id!=='string'||call.id.length>200||typeof call.function?.name!=='string'||typeof call.function?.arguments!=='string'||call.function.arguments.length>4000)throw new ResidentFailure('provider-output')
  replay.put({id:call.id,name:call.function.name,argumentsHash:await argumentHash(call.function.name,call.function.arguments),model,signature})
 }
}
export async function restoreSignatures(messages:unknown,replay?:ProtocolReplay){
 if(!replay||!Array.isArray(messages))return
 for(const message of messages){
  if(message?.role!=='assistant'||!Array.isArray(message.tool_calls))continue
  for(const call of message.tool_calls){
   const saved=typeof call.id==='string'?replay.get(call.id):undefined
   if(!saved)continue
   if(call.function?.name!==saved.name||typeof call.function?.arguments!=='string'||await argumentHash(saved.name,call.function.arguments)!==saved.argumentsHash)throw new ResidentFailure('runtime-protocol')
   call.extra_content={google:{thought_signature:saved.signature}}
  }
 }
}
