import type {ResidentWork} from '../../../src/resident-contract.ts'
export type ServicePort={fetch(request:Request):Promise<Response>}
export async function authority(port:ServicePort,path:'work'|'context'|'inference',work:ResidentWork,requestKey?:string){
 const response=await port.fetch(new Request('https://resident-authority.internal/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({work,requestKey})}))
 if(!response.ok){await response.body?.cancel();throw Error('Current Strata authority refused runtime work')}
 const bytes=await response.arrayBuffer();if(bytes.byteLength>32768)throw Error('Authority response too large');return JSON.parse(new TextDecoder().decode(bytes))
}
