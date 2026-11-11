/** Basic deterministic data minimization, not a guarantee of PII detection.
 * Source/audience authorization is mandatory before this helper is used. */
export function redactPublicModelText(value:string){
 let redactions=0
 const replace=(pattern:RegExp,label:string)=>{value=value.replace(pattern,()=>{redactions++;return '['+label+']'})}
 replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'email redacted')
 replace(/\b\d{16}\b/g,'identity number redacted')
 replace(/(?:\+62|\b0)8[1-9][\d -]{7,14}\d\b/g,'phone redacted')
 replace(/\b(?:Bearer\s+|sk-|AIza)[A-Za-z0-9_.-]{16,}/g,'credential-like value redacted')
 return {text:value,redactions}
}
