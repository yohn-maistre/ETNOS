/** Fixed operational codes only. Never forward provider bodies, prompts or keys. */
export const residentFailureCodes=['authority-changed','gateway-unconfigured','gateway-input','provider-quota','provider-unavailable','provider-transport','provider-output','runtime-budget','runtime-abstained','runtime-unavailable','runtime-input','runtime-protocol'] as const
export type ResidentFailureCode=typeof residentFailureCodes[number]
export class ResidentFailure extends Error{
 readonly code:ResidentFailureCode
 constructor(code:ResidentFailureCode){super('resident:'+code);this.name='ResidentFailure';this.code=code}
}
export function residentFailureCode(value:unknown):ResidentFailureCode|undefined{
 const candidate=typeof value==='string'?value.replace(/^resident:/,''):value instanceof Error?value.message.replace(/^resident:/,''):undefined
 return residentFailureCodes.find(code=>code===candidate)
}
/** Private service responses still get an independent small read bound. */
export async function serviceFailure(response:Response,fallback:ResidentFailureCode){
 const reader=response.body?.getReader();let body='',size=0
 try{if(reader)while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>2048)break;body+=new TextDecoder().decode(r.value,{stream:true})}}catch{/* Status remains useful without a body. */}finally{await reader?.cancel().catch(()=>{});reader?.releaseLock()}
 let value:{code?:unknown;error?:unknown}={};try{value=JSON.parse(body)}catch{/* Never surface the untrusted response. */}
 const explicit=residentFailureCode(value.code)
 const known:Record<string,ResidentFailureCode>={'Communal model gateway unavailable':'gateway-unconfigured','Gateway configuration unavailable':'gateway-unconfigured','Invalid or oversized model input':'gateway-input','Bounded text messages required':'gateway-input','Unsupported resident tool':'gateway-input','Model quota reached':'provider-quota','Model provider unavailable':'provider-unavailable','Model returned an invalid draft':'provider-output','Model request failed; no automatic retry':'provider-transport'}
 return new ResidentFailure(explicit??(typeof value.error==='string'?known[value.error]:undefined)??(response.status===429?'provider-quota':fallback))
}
