import type {ResidentInput} from './resident-contract.ts'
import {redactPublicModelText} from './redaction.ts'

/** A model sees public text, not the runtime capability, source IDs or receipt.
 * Preserve the question; progressively shorten quotes to reserve room for Pi's
 * policy/tools inside its 32 KiB transport budget. Canonical pins stay intact. */
export function residentPromptContext(input:Pick<ResidentInput,'skill'|'community'|'evidence'|'question'>&{language?:string}){
 const clean=(v:string)=>redactPublicModelText(v).text
 const evidence=input.evidence.map((e,i)=>({reference:'S'+(i+1),title:clean(e.title),summary:clean(e.summary),truncated:false}))
 const question=input.question?{text:clean(input.question.text),title:clean(input.question.title),context:input.question.context.map(p=>({text:clean(p.text),truncated:false}))}:undefined
 const result={skill:input.skill,community:clean(input.community),language:input.language??'id',evidence,...(question?{question}:{})}
 const fits=()=>new TextEncoder().encode(JSON.stringify(result)).byteLength<=18000
 const shorten=(v:string,n:number)=>Array.from(v).slice(0,n).join('')
 for(const limit of [300,150,0]){
  if(fits())return result
  for(const e of evidence){const next=shorten(e.summary,limit);e.truncated ||= next!==e.summary;e.summary=next}
 }
 for(const limit of [350,150,0]){
  if(fits())return result
  for(const p of question?.context??[]){const next=shorten(p.text,limit);p.truncated ||= next!==p.text;p.text=next}
 }
 for(const limit of [160,80]){
  if(fits())return result
  for(const e of evidence){const next=shorten(e.title,limit);e.truncated ||= next!==e.title;e.title=next}
 }
 if(!fits())throw Error('Question exceeds the model context budget; shorten it before requesting another task')
 return result
}
