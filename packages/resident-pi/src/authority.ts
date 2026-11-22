import type {ResidentWork} from '../../../src/resident-contract.ts'
import {ResidentFailure} from '../../../src/resident-failure.ts'
export type ServicePort={fetch(request:Request):Promise<Response>}
export type AuthorityPath='work'|'context'|'inference'|'wiki-search'|'web-call'|'web-read'
/** Bounded fields only; ETNOS re-validates the work capability on every call. */
export type AuthorityFields={query?:string;tool?:'web_search'|'web_fetch';page?:{url:string;finalUrl:string;status:number;title?:string}}
export async function authority(port:ServicePort,path:AuthorityPath,work:ResidentWork,requestKey?:string,fields:AuthorityFields={}){
 const response=await port.fetch(new Request('https://resident-authority.internal/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({work,requestKey,...fields})}))
 if(!response.ok){await response.body?.cancel();throw new ResidentFailure('authority-changed')}
 const bytes=await response.arrayBuffer();if(bytes.byteLength>65536)throw Error('Authority response too large');return JSON.parse(new TextDecoder().decode(bytes))
}
