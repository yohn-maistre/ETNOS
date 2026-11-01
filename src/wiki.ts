import {randomUUID,createHash} from 'node:crypto'
import {StrataCore,Fault} from './core.ts'
import {canonical} from './transport.ts'

type Page={id:string;community_id:string;title:string;revision_id:string|null;created:number}
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
    if(actor.kind==='human')return
    const grant=s.get<{agent_id:string;community_id:string;issuer_id:string;expires:number;revoked:number;hourly_limit:number}>('SELECT * FROM editorial_mandates WHERE id=?',mandateId??'')
    if(!grant||grant.revoked||grant.agent_id!==actorId||grant.community_id!==communityId||grant.expires<=s.clock()||actor.operator_id!==grant.issuer_id)throw new Fault(403,'Current editorial proposal mandate required; posting mandates alone do not authorize knowledge changes')
    s.requireSteward(grant.issuer_id,communityId)
    if(consume&&s.get<{n:number}>('SELECT count(*) AS n FROM wiki_proposals p JOIN wiki_pages w ON w.id=p.page_id WHERE p.author_id=? AND w.community_id=? AND p.created>?',actorId,communityId,s.clock()-3600000)!.n>=grant.hourly_limit)throw new Fault(429,'Editorial proposal budget exceeded')
  }
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
  read(pageId:string) {
    const page=this.page(pageId)
    const revision=page.revision_id?this.store.get<Revision>('SELECT * FROM wiki_revisions WHERE id=?',page.revision_id):null
    if(!revision)return {...page,revision:null}
    const {proposal_id:_privateProposal,...accepted}=revision
    return {...page,revision:{...accepted,authorKind:this.store.actor(revision.author_id).kind,citations:JSON.parse(revision.citations) as string[]}}
  }
  list(communityId:string) {
    const s=this.store
    if(s.community(communityId).visibility!=='public')throw new Fault(404,'Not found')
    return s.all<Page>('SELECT * FROM wiki_pages WHERE community_id=? ORDER BY created DESC,id DESC LIMIT 100',communityId)
  }
  all(){return this.store.all<Page>("SELECT w.* FROM wiki_pages w JOIN communities c ON c.id=w.community_id WHERE c.visibility='public' ORDER BY w.created DESC,w.id DESC LIMIT 100")}
  proposals(actorId:string,pageId:string){
    const s=this.store,page=this.page(pageId),member=s.requireMember(actorId,page.community_id)
    const steward=s.actor(actorId).kind==='human' && ['owner','moderator'].includes(member.role)
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
    if(proposal.author_id!==actorId)s.requireSteward(actorId,page.community_id)
    return {...proposal,authorKind:s.actor(proposal.author_id).kind,citations:JSON.parse(proposal.citations) as string[]}
  }
  decide(actorId:string,proposalId:string,expectedDigest:string,accept:boolean) {
    const s=this.store
    return s.tx(()=>{
      const proposal=this.proposal(actorId,proposalId),page=this.page(proposal.page_id)
      s.requireSteward(actorId,page.community_id);this.human(actorId)
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
      s.run('UPDATE wiki_pages SET revision_id=? WHERE id=?',id,page.id)
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
