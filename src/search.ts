import {agentLabels} from './agent-labels.ts'
import { EtnosCore, Fault } from './core.ts'

/** Permission-filtered local discovery. Never indexes private proposals or memberships. */
export class Search {
  private store: EtnosCore
  constructor(store: EtnosCore) { this.store=store }
  profile(viewer: string | undefined, targetId: string) {
    const s=this.store, a=s.actor(targetId)
    if(viewer!==a.id&&!this.visibleAuthor(viewer,a.id))throw new Fault(404,'Not found')
    const profile=s.get<{bio:string;website:string;location:string}>('SELECT bio,website,location FROM actor_profiles WHERE actor_id=?',a.id)
    return {id:a.id,did:a.did,name:a.name,kind:a.kind,...(a.kind==='agent'?{agent:agentLabels(s,[a.id]).get(a.id)??{role:'guest',family:'external',official:false}}:{}),...(profile??{})}
  }
  private visibleAuthor(viewer:string|undefined,id:string) {
    return this.store.get(`SELECT 1 FROM posts p JOIN communities c ON c.id=p.community_id
      WHERE p.author_id=? AND p.hidden=0 AND p.deleted=0 AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
      UNION ALL SELECT 1 FROM wiki_revisions r JOIN wiki_pages w ON w.revision_id=r.id JOIN communities c ON c.id=w.community_id WHERE r.author_id=? AND c.visibility='public' LIMIT 1`,id,viewer??null,id)
  }
  query(viewer:string|undefined,value:string) {
    if(value.length>100)throw new Fault(400,'Search is limited to 100 characters')
    const s=this.store,q=value.trim().replace(/^@/,''),v=viewer??null
    const people=s.all<{id:string;did:string;name:string;kind:string}>(`SELECT a.id,a.did,a.name,a.kind FROM actors a
      WHERE (instr(lower(a.name),lower(?))>0 OR instr(lower(a.did),lower(?))>0)
      AND (a.id=? OR EXISTS(SELECT 1 FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.author_id=a.id AND p.hidden=0 AND p.deleted=0 AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1)))
        OR EXISTS(SELECT 1 FROM wiki_pages w JOIN wiki_revisions r ON r.id=w.revision_id JOIN communities c ON c.id=w.community_id WHERE r.author_id=a.id AND c.visibility='public'))
      ORDER BY CASE WHEN lower(a.name)=lower(?) THEN 0 ELSE 1 END,CASE WHEN EXISTS(SELECT 1 FROM follows f WHERE f.actor_id=? AND f.target_id=a.id) THEN 0 ELSE 1 END,a.name,a.id LIMIT 6`,q,q,v,v,q,v)
    const posts=s.feedPage(viewer,{query:q,limit:10}).items.filter(p=>!p.deleted)
    const communities=s.all<{id:string;title:string;description:string;visibility:string}>(`SELECT c.id,c.title,c.description,c.visibility FROM communities c
      WHERE COALESCE(c.archived,0)=0 AND (c.visibility!='hidden-private' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
      AND instr(lower(c.title||' '||c.description),lower(?))>0 ORDER BY c.title,c.id LIMIT 6`,v,q)
    const contexts=s.all<{id:string;slug:string;title:string;kind:string;description:string}>(`SELECT id,slug,title,kind,description FROM contexts WHERE active=1 AND instr(lower(title||' '||description||' '||aliases),lower(?))>0 ORDER BY title,id LIMIT 6`,q)
    const groups=s.all<{id:string;title:string;description:string;kind:string}>(`SELECT g.id,g.title,g.description,g.kind FROM groups g WHERE (g.visibility='public' OR EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.actor_id=? AND m.active=1)) AND instr(lower(g.title||' '||g.description),lower(?))>0 ORDER BY g.title,g.id LIMIT 6`,v,q)
    const wiki=s.all<{id:string;title:string;community_id:string}>(`SELECT w.id,w.title,w.community_id FROM wiki_pages w JOIN communities c ON c.id=w.community_id LEFT JOIN wiki_revisions r ON r.id=w.revision_id WHERE c.visibility='public' AND (w.draft=0 OR w.revision_id IS NOT NULL) AND instr(lower(w.title||' '||COALESCE(r.text,'')),lower(?))>0 ORDER BY w.created DESC,w.id DESC LIMIT 6`,q)
    return {query:q,people,posts,communities,contexts,groups,wiki}
  }
}
