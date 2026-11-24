/** Keys for outside services other than the model provider. The operator adds them in Studio; each is
 * checked against its service first, kept in node storage, and never returned (last four characters only).
 * A deploy secret with the same name still works and is used when Studio holds no key. */
export type ServiceKey={key:string;added:number}
export type Service={id:string;label:string;use:string;env:string;link:string;check:(key:string,fetcher:typeof fetch)=>Promise<boolean>}

const ok=async(url:string,headers:Record<string,string>,fetcher:typeof fetch)=>{
 try{const r=await fetcher(url,{headers:{accept:'application/json',...headers},redirect:'manual',signal:AbortSignal.timeout(8000)});return r.ok}catch{return false}
}

export const SERVICES:Service[]=[
 {id:'openalex',label:'OpenAlex',use:'Daftar riset terbit di halaman wiki.',env:'OPENALEX_API_KEY',link:'https://openalex.org/settings/api',
  check:(key,f)=>ok('https://api.openalex.org/works?per-page=1&select=id',{authorization:'Bearer '+key},f)},
 {id:'plantnet',label:'Pl@ntNet',use:'Usulan nama spesies tumbuhan dari foto publik komunitas (opsional).',env:'PLANTNET_API_KEY',link:'https://my.plantnet.org/',
  check:(key,f)=>ok('https://my-api.plantnet.org/v2/projects?api-key='+encodeURIComponent(key),{},f)},
]

export const service=(id:unknown)=>SERVICES.find(s=>s.id===id)??null
export const storageName=(id:string)=>'service-key:'+id

export function validServiceKey(raw:unknown):string|null{
 if(typeof raw!=='string')return null
 const k=raw.trim()
 return k.length>=8&&k.length<=300&&!/\s/.test(k)?k:null
}

/** What Studio may see about each key: where it comes from and its last four characters. */
export function serviceStatus(s:Service,stored:ServiceKey|null|undefined,env:Record<string,unknown>){
 const key=stored?{source:'studio' as const,last4:stored.key.slice(-4),added:stored.added}:typeof env[s.env]==='string'&&env[s.env]?{source:'github' as const,last4:null,added:null}:null
 return {id:s.id,label:s.label,use:s.use,link:s.link,key}
}

/** The key a service call uses: Studio first, then the deploy secret. */
export const effectiveServiceKey=(s:Service,stored:ServiceKey|null|undefined,env:Record<string,unknown>)=>stored?.key||(typeof env[s.env]==='string'?env[s.env] as string:undefined)||undefined
