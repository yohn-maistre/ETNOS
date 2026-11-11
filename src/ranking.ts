import {StrataCore,Fault} from './core.ts'
export type ExploreSort='balanced'|'active'|'new'
export type RankCandidate={id:string;author_id:string;community_id:string;created:number;score:number;humanReplies:number;latestReply:number;activeAuthors:number}
/** Original bounded recipe informed by Lemmy's published decay and X's pipeline stages. */
export function discussionRank(p:RankCandidate,sort:ExploreSort,now:number){
 if(sort==='new')return p.created
 const anchor=sort==='active'?Math.min(now,Math.max(p.created,Math.min(p.latestReply,p.created+48*3600000))):p.created
 const hours=Math.max(0,(now-anchor)/3600000),votes=Math.min(50,Math.max(-2,p.score)),reply=Math.log1p(Math.min(8,Math.max(0,p.humanReplies)))*.25
 const rank=(Math.log(Math.max(1,3+votes))+reply)/Math.pow(hours+2,1.8)
 return sort==='balanced'?rank/Math.log2(2+Math.max(1,p.activeAuthors)):rank
}
export class Ranking {
 readonly store:StrataCore
 constructor(store:StrataCore){this.store=store}
 explore(options:{sort?:string;limit?:number;communityId?:string}={}){
  const sort=options.sort??'balanced',limit=options.limit??12,now=this.store.clock()
  if(!['balanced','active','new'].includes(sort)||!Number.isSafeInteger(limit)||limit<1||limit>24)throw new Fault(400,'Choose a supported discovery sort and 1–24 items')
  if(options.communityId&&this.store.community(options.communityId).visibility!=='public')throw new Fault(404,'Not found')
  const rows=this.store.all<RankCandidate>(`SELECT p.id,p.author_id,p.community_id,p.created,COALESCE(SUM(v.value),0) score FROM posts p JOIN communities c ON c.id=p.community_id LEFT JOIN votes v ON v.post_id=p.id WHERE c.visibility='public' AND p.parent_id IS NULL AND p.hidden=0 AND p.deleted=0 AND p.created>=? AND COALESCE(json_extract(p.content,'$.warning'),'')='' AND (? IS NULL OR p.community_id=?) GROUP BY p.id ORDER BY p.created DESC,p.id DESC LIMIT 100`,now-30*86400000,options.communityId??null,options.communityId??null)
  const ids=JSON.stringify(rows.map(p=>p.id))
  const activity=new Map(this.store.all<{root_id:string;n:number;latest:number}>(`SELECT r.root_id,count(DISTINCT r.author_id) n,max(r.created) latest FROM posts r JOIN posts root ON root.id=r.root_id JOIN actors a ON a.id=r.author_id JOIN communities c ON c.id=r.community_id WHERE c.visibility='public' AND r.parent_id IS NOT NULL AND r.hidden=0 AND r.deleted=0 AND a.kind='human' AND r.author_id!=root.author_id AND r.root_id IN(SELECT value FROM json_each(?)) GROUP BY r.root_id`,ids).map(r=>[r.root_id,r]))
  const communities=new Map(this.store.all<{community_id:string;n:number}>(`SELECT p.community_id,count(DISTINCT p.author_id) n FROM posts p JOIN communities c ON c.id=p.community_id JOIN actors a ON a.id=p.author_id WHERE c.visibility='public' AND p.hidden=0 AND p.deleted=0 AND a.kind='human' AND p.created>=? GROUP BY p.community_id`,now-30*86400000).map(r=>[r.community_id,r.n]))
  for(const p of rows){p.humanReplies=activity.get(p.id)?.n??0;p.latestReply=activity.get(p.id)?.latest??p.created;p.activeAuthors=communities.get(p.community_id)??1}
  rows.sort((a,b)=>discussionRank(b,sort as ExploreSort,now)-discussionRank(a,sort as ExploreSort,now)||b.created-a.created||b.id.localeCompare(a.id))
  const selected:RankCandidate[]=[],authors=new Map<string,number>(),groups=new Map<string,number>()
  // Chronological choice stays chronological. Diversity is a soft discovery pass.
  for(const p of rows){if(sort!=='new'&&((authors.get(p.author_id)??0)>=2||(groups.get(p.community_id)??0)>=3))continue;selected.push(p);authors.set(p.author_id,(authors.get(p.author_id)??0)+1);groups.set(p.community_id,(groups.get(p.community_id)??0)+1);if(selected.length===limit)break}
  for(const p of rows){if(selected.length>=limit)break;if(!selected.some(x=>x.id===p.id))selected.push(p)}
  const items=selected.map(p=>({...this.store.getPost(undefined,p.id),discovery:{communityTitle:this.store.community(p.community_id).title,reason:sort==='new'?'Terbaru':sort==='active'&&p.humanReplies?'Percakapan aktif':sort==='balanced'?'Aktivitas publik · beragam komunitas':'Baru dibagikan'}}))
  return {items,sort,recipe:'commons-explore-v1',asOf:now,candidateCount:rows.length,windowDays:30,pagination:'bounded-selection',personalized:false}
 }
}
