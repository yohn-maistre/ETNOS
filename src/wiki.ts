import {randomUUID,createHash} from 'node:crypto'
import {StrataCore,Fault} from './core.ts'
import {canonical} from './transport.ts'

type Page={id:string;community_id:string;title:string;revision_id:string|null;created:number;draft:number}
type Proposal={id:string;page_id:string;author_id:string;base_revision_id:string|null;text:string;citations:string;language:string;perspective:string;digest:string;state:'pending'|'accepted'|'rejected';created:number;editorial_mandate_id:string|null}
type Revision={id:string;page_id:string;parent_id:string|null;proposal_id:string;author_id:string;reviewer_id:string;text:string;citations:string;language:string;perspective:string;digest:string;created:number}
function text(value:string,max:number) {if(typeof value!=='string'||!value.trim()||value.length>max)throw new Fault(400,'Invalid input');return value.trim()}
function citations(values:string[]) {
  if(!Array.isArray(values)||values.length>20) throw new Fault(400,'At most 20 public citations')
  return values.map(value=>{
    try {
      const url=new URL(text(value,2000))
      if(url.protocol!=='https:'||url.username||url.password) throw Error()
      return url.href
    } catch { throw new Fault(400,'Citations must be HTTPS URLs intended for public disclosure') }
  })
}

/** Public editorial knowledge, not a private institutional Library.
 * Proposals are restricted; human acceptance creates a separate public revision.
 * No network fetch, automatic source ingestion, AT export or training consent.
 */
export class Wiki {
  private store:StrataCore
  constructor(store:StrataCore) {this.store=store}
  private human(actorId:string) {if(this.store.actor(actorId).kind!=='human')throw new Fault(403,'Human knowledge contributor required; posting mandates do not authorize Wiki changes')}
  private authorizeProposal(actorId:string,communityId:string,mandateId?:string|null,consume=true){
    const s=this.store,actor=s.actor(actorId);s.requireMember(actorId,communityId)
    const group=s.get<{contributor_group_id:string|null}>('SELECT contributor_group_id FROM wiki_policies WHERE community_id=?',communityId)?.contributor_group_id
    if(group&&!s.get('SELECT 1 FROM group_members WHERE group_id=? AND actor_id=? AND active=1',group,actorId))throw new Fault(403,'Current contributor group membership required')
    if(actor.kind==='human')return
    const grant=s.get<{agent_id:string;community_id:string;issuer_id:string;expires:number;revoked:number;hourly_limit:number}>('SELECT * FROM editorial_mandates WHERE id=?',mandateId??'')
    if(!grant||grant.revoked||grant.agent_id!==actorId||grant.community_id!==communityId||grant.expires<=s.clock()||actor.operator_id!==grant.issuer_id)throw new Fault(403,'Current editorial proposal mandate required; posting mandates alone do not authorize knowledge changes')
    s.requireSteward(grant.issuer_id,communityId)
    if(consume&&s.get<{n:number}>('SELECT count(*) AS n FROM wiki_proposals p JOIN wiki_pages w ON w.id=p.page_id WHERE p.author_id=? AND w.community_id=? AND p.created>?',actorId,communityId,s.clock()-3600000)!.n>=grant.hourly_limit)throw new Fault(429,'Editorial proposal budget exceeded')
  }
  checkProposalAuthority(actorId:string,communityId:string,mandateId:string){this.authorizeProposal(actorId,communityId,mandateId,false)}
  grant(operator:string,agentId:string,communityId:string,purpose:string,expires:number,hourlyLimit=3){return this.store.tx(()=>{
    const s=this.store;s.requireSteward(operator,communityId);s.requireMember(agentId,communityId)
    const agent=s.actor(agentId)
    if(agent.kind!=='agent'||agent.operator_id!==operator)throw new Fault(403,'Registered agent operator required')
    if(s.community(communityId).visibility!=='public')throw new Fault(400,'This editorial path is for public knowledge only')
    if(!Number.isSafeInteger(expires)||expires<=s.clock()||expires>s.clock()+86400000||!Number.isInteger(hourlyLimit)||hourlyLimit<1||hourlyLimit>10)throw new Fault(400,'Invalid editorial mandate bounds')
    const id=randomUUID();s.run('INSERT INTO editorial_mandates VALUES(?,?,?,?,?,?,0,?)',id,agentId,communityId,operator,text(purpose,500),expires,hourlyLimit);s.audit(operator,'wiki.mandate.issue',communityId);return {id,expires}
  })}
  revoke(operator:string,mandateId:string){return this.store.tx(()=>{
    const s=this.store,m=s.get<{agent_id:string;community_id:string;issuer_id:string}>('SELECT * FROM editorial_mandates WHERE id=?',mandateId)
    if(!m)throw new Fault(404,'Not found');this.human(operator)
    if(s.actor(m.agent_id).operator_id!==operator)s.requireSteward(operator,m.community_id)
    s.run('UPDATE editorial_mandates SET revoked=1 WHERE id=?',mandateId);s.audit(operator,'wiki.mandate.revoke',m.community_id);return {ok:true}
  })}
  private page(pageId:string) {
    const p=this.store.get<Page>('SELECT * FROM wiki_pages WHERE id=?',pageId)
    if(!p || this.store.community(p.community_id).visibility!=='public') throw new Fault(404,'Not found')
    return p
  }
  create(actorId:string,communityId:string,title:string) {
    const s=this.store
    return s.tx(()=>{
      s.requireSteward(actorId,communityId);this.human(actorId)
      if(s.community(communityId).visibility!=='public')throw new Fault(400,'Protected knowledge stays in Aksara; this Wiki is public')
      const id=randomUUID()
      s.run('INSERT INTO wiki_pages(id,community_id,title,created) VALUES(?,?,?,?)',id,communityId,text(title,160),s.clock())
      s.audit(actorId,'wiki.create',id)
      return this.read(id)
    })
  }
  private draftAccess(page:Page,actorId?:string){
    if(!page.draft||page.revision_id)return
    if(!actorId)throw new Fault(404,'Not found')
    this.store.requireMember(actorId,page.community_id)
    if(this.store.get('SELECT 1 FROM wiki_proposals WHERE page_id=? AND author_id=?',page.id,actorId))return
    try{this.reviewer(actorId,page.community_id)}catch{throw new Fault(404,'Not found')}
  }
  createDraft(actorId:string,communityId:string,title:string,draft:{text:string;citations:string[];language:string;perspective:string},requestKey?:string){
    if(requestKey!==undefined&&!/^[-a-f0-9]{36}$/.test(requestKey))throw new Fault(400,'Invalid request key')
    const digest=createHash('sha256').update(canonical({communityId,title,draft})).digest('hex')
    return this.store.tx(()=>{const s=this.store;s.requireSteward(actorId,communityId);this.human(actorId)
      if(requestKey){const prior=s.get<{digest:string;page_id:string}>('SELECT digest,page_id FROM wiki_requests WHERE actor_id=? AND request_key=?',actorId,requestKey);if(prior){if(prior.digest!==digest)throw new Fault(409,'This request already contains another wiki draft');return this.read(prior.page_id,actorId)}}
      const page=this.create(actorId,communityId,title);s.run('UPDATE wiki_pages SET draft=1 WHERE id=?',page.id);this.propose(actorId,page.id,null,draft.text,draft.citations,draft.language,draft.perspective);if(requestKey)s.run('INSERT INTO wiki_requests VALUES(?,?,?,?)',actorId,requestKey,digest,page.id);return this.read(page.id,actorId)})
  }
  policy(actorId:string,communityId:string){this.store.requireSteward(actorId,communityId);return this.store.get<{contributor_group_id:string|null;reviewer_group_id:string|null}>('SELECT contributor_group_id,reviewer_group_id FROM wiki_policies WHERE community_id=?',communityId)??{contributor_group_id:null,reviewer_group_id:null}}
  setPolicy(actorId:string,communityId:string,contributor:string|null,reviewer:string|null){
    return this.store.tx(()=>{const s=this.store;s.requireSteward(actorId,communityId);this.human(actorId)
      for(const group of [contributor,reviewer])if(group&&!s.get("SELECT 1 FROM group_members WHERE group_id=? AND actor_id=? AND active=1 AND role IN ('owner','steward')",group,actorId))throw new Fault(403,'Group steward required to bind an editorial group')
      s.run('INSERT INTO wiki_policies VALUES(?,?,?) ON CONFLICT(community_id) DO UPDATE SET contributor_group_id=excluded.contributor_group_id,reviewer_group_id=excluded.reviewer_group_id',communityId,contributor,reviewer);s.audit(actorId,'wiki.policy',communityId);return this.policy(actorId,communityId)})
  }
  private reviewer(actorId:string,communityId:string){const s=this.store;s.requireSteward(actorId,communityId);this.human(actorId);const group=this.policy(actorId,communityId).reviewer_group_id;if(group&&!s.get('SELECT 1 FROM group_members WHERE group_id=? AND actor_id=? AND active=1',group,actorId))throw new Fault(403,'Current reviewer group membership required')}
  read(pageId:string,actorId?:string) {
    const page=this.page(pageId)
    this.draftAccess(page,actorId)
    const revision=page.revision_id?this.store.get<Revision>('SELECT * FROM wiki_revisions WHERE id=?',page.revision_id):null
    if(!revision)return {...page,revision:null}
    const {proposal_id:_privateProposal,...accepted}=revision
    return {...page,revision:{...accepted,authorKind:this.store.actor(revision.author_id).kind,citations:JSON.parse(revision.citations) as string[]}}
  }
  list(communityId:string,actorId?:string) {
    const s=this.store
    if(s.community(communityId).visibility!=='public')throw new Fault(404,'Not found')
    return this.all(actorId,communityId)
  }
  all(actorId?:string,communityId?:string){return this.store.all<Page>("SELECT w.* FROM wiki_pages w JOIN communities c ON c.id=w.community_id WHERE c.visibility='public' AND (? IS NULL OR w.community_id=?) AND (w.draft=0 OR w.revision_id IS NOT NULL OR (EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=w.community_id AND m.actor_id=? AND m.active=1) AND (EXISTS(SELECT 1 FROM wiki_proposals p WHERE p.page_id=w.id AND p.author_id=?) OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=w.community_id AND m.actor_id=? AND m.active=1 AND m.role IN ('owner','moderator') AND (NOT EXISTS(SELECT 1 FROM wiki_policies wp WHERE wp.community_id=w.community_id AND wp.reviewer_group_id IS NOT NULL) OR EXISTS(SELECT 1 FROM wiki_policies wp JOIN group_members gm ON gm.group_id=wp.reviewer_group_id WHERE wp.community_id=w.community_id AND gm.actor_id=m.actor_id AND gm.active=1)))))) ORDER BY w.created DESC,w.id DESC LIMIT 100",communityId??null,communityId??null,actorId??null,actorId??null,actorId??null)}
  proposals(actorId:string,pageId:string){
    const s=this.store,page=this.page(pageId);s.requireMember(actorId,page.community_id);this.draftAccess(page,actorId)
    let steward=false;try{this.reviewer(actorId,page.community_id);steward=true}catch{}
    return s.all<Proposal>('SELECT * FROM wiki_proposals WHERE page_id=? AND (?=1 OR author_id=?) ORDER BY created DESC,id DESC LIMIT 100',pageId,steward?1:0,actorId).map(p=>({...p,authorKind:s.actor(p.author_id).kind,citations:JSON.parse(p.citations) as string[]}))
  }
  propose(actorId:string,pageId:string,baseRevision:string|null,body:string,sourceUrls:string[],language:string,perspective:string,editorialMandateId?:string) {
    const s=this.store
    return s.tx(()=>{
      const page=this.page(pageId);this.authorizeProposal(actorId,page.community_id,editorialMandateId)
      if(baseRevision!==page.revision_id)throw new Fault(409,'Wiki changed; review the current revision before proposing')
      const content={text:text(body,50000),citations:citations(sourceUrls),language:text(language,40),perspective:text(perspective,300)}
      const digest=createHash('sha256').update(canonical(content)).digest('hex'),id=randomUUID()
      s.run("INSERT INTO wiki_proposals(id,page_id,author_id,base_revision_id,text,citations,language,perspective,digest,state,created,editorial_mandate_id) VALUES(?,?,?,?,?,?,?,?,?,'pending',?,?)",id,pageId,actorId,baseRevision,content.text,JSON.stringify(content.citations),content.language,content.perspective,digest,s.clock(),editorialMandateId??null)
      s.audit(actorId,'wiki.propose',pageId)
      return {id,digest,state:'pending',authorKind:s.actor(actorId).kind}
    })
  }
  proposal(actorId:string,proposalId:string) {
    const s=this.store,proposal=s.get<Proposal>('SELECT * FROM wiki_proposals WHERE id=?',proposalId)
    if(!proposal)throw new Fault(404,'Not found')
    const page=this.page(proposal.page_id);s.requireMember(actorId,page.community_id)
    if(proposal.author_id!==actorId)this.reviewer(actorId,page.community_id)
    return {...proposal,authorKind:s.actor(proposal.author_id).kind,citations:JSON.parse(proposal.citations) as string[]}
  }
  decide(actorId:string,proposalId:string,expectedDigest:string,accept:boolean) {
    const s=this.store
    return s.tx(()=>{
      const proposal=this.proposal(actorId,proposalId),page=this.page(proposal.page_id)
      this.reviewer(actorId,page.community_id)
      if(proposal.state!=='pending'||proposal.digest!==expectedDigest)throw new Fault(409,'Review no longer matches')
      if(!accept) {
        s.run("UPDATE wiki_proposals SET state='rejected',decided=? WHERE id=?",s.clock(),proposalId)
        s.audit(actorId,'wiki.reject',page.id)
        return {state:'rejected' as const,revisionId:null}
      }
      // Recheck admission at the effect, not just when a draft was written.
      this.authorizeProposal(proposal.author_id,page.community_id,proposal.editorial_mandate_id,false)
      if(page.revision_id!==proposal.base_revision_id)throw new Fault(409,'Wiki changed; proposal must be reviewed against the new base')
      const id=randomUUID()
      s.run('INSERT INTO wiki_revisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,page.id,page.revision_id,proposalId,proposal.author_id,actorId,
        proposal.text,JSON.stringify(proposal.citations),proposal.language,proposal.perspective,proposal.digest,s.clock())
      s.run('UPDATE wiki_pages SET revision_id=?,draft=0 WHERE id=?',id,page.id)
      s.run("UPDATE wiki_proposals SET state='accepted',decided=? WHERE id=?",s.clock(),proposalId)
      s.audit(actorId,'wiki.accept',page.id)
      return {state:'accepted' as const,revisionId:id}
    })
  }
  history(pageId:string) {
    this.page(pageId)
    return this.store.all<Omit<Revision,'text'|'citations'|'proposal_id'>>('SELECT id,page_id,parent_id,author_id,reviewer_id,language,perspective,digest,created FROM wiki_revisions WHERE page_id=? ORDER BY created DESC,id DESC LIMIT 100',pageId)
  }
}
