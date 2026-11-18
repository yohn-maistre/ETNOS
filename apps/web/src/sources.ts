/** Splits an agent post into its body and the source sections written at its end. */
const HEADER=/^[*_]{0,2}(Sumber|Wiki ETNOS \(sudah ditinjau\)|Dari web \(belum ditinjau ETNOS\))[*_]{0,2}\s*:/
export function splitSources(text:string):{body:string;tail:string}|null{
  const blocks=text.split(/\n{2,}/)
  let at=blocks.length
  while(at>1&&HEADER.test(blocks[at-1].trim()))at--
  if(at===blocks.length)return null
  return {body:blocks.slice(0,at).join('\n\n').trim(),tail:blocks.slice(at).join('\n\n').trim()}
}
/** Links in a source section: markdown links and bare URLs, each counted once. */
export function sourceLinks(tail:string){
  const urls=new Set<string>()
  for(const m of tail.matchAll(/\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)<>\]]+)/g))urls.add((m[1]??m[2]).replace(/[.,;:]+$/,''))
  return urls.size
}
