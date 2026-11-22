import {EtnosCore,Fault,type Post} from './core.ts'
import {contentOf} from './post-content.ts'
import {hash} from './commons.ts'
import {ResidentRouting,type ResidentRoute} from './resident-routing.ts'
import type {ResidentJob} from './resident.ts'
import type {ResidentQuestion} from './resident-contract.ts'
import {residentFailureCode} from './resident-failure.ts'
export type ResidentQuestionRecord={job_id:string;config_community_id:string;target_post_id:string;target_revision:number;target_digest:string;snapshot:string;posting_mandate_id:string;global_revision:number;route_revision:number;coverage:string;created:number}
/** Public, explicitly addressed questions. Protected rooms and execution logs never enter this projection. */
export class ResidentQuestions {
 readonly store:EtnosCore
 readonly routing:ResidentRouting
 constructor(store:EtnosCore,routing:ResidentRouting){this.store=store;this.routing=routing}
 input(jobId:string){return this.store.get<ResidentQuestionRecord>('SELECT * FROM resident_job_inputs WHERE job_id=?',jobId)}
 private post(id:string){const p=this.store.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0 AND deleted=0',id);if(!p)throw new Fault(404,'Question is no longer available');return p}
 snapshot(requester:string,id:string):ResidentQuestion {
  const s=this.store,p=this.post(id),c=s.community(p.community_id)
  if(c.visibility!=='public'||c.publication!=='local')throw new Fault(404,'Not found')
  this.routing.access.assertHumanCurrent(requester)
  if(p.author_id!==requester)throw new Fault(403,'The human author must request this reply')
  s.requireMember(requester,c.id)
  const root=this.post(p.root_id),content=contentOf(p.content)
  if(root.community_id!==c.id||root.locked||p.locked)throw new Fault(409,'This conversation is locked')
  if(content.warning?.trim())throw new Fault(409,'This public assistant does not read warning-protected posts')
  if(p.text.length>4000)throw new Fault(400,'Pertanyaan untuk Aksara maksimal 4.000 karakter. Ringkas atau kirim tanpa meminta balasan.')
  const context:ResidentQuestion['context']=[];let parent=p.parent_id
  for(let i=0;parent&&i<3;i++){
   const prior=this.post(parent);if(prior.community_id!==c.id)throw new Fault(409,'Conversation context changed')
   if(contentOf(prior.content).warning?.trim())throw new Fault(409,'This public assistant does not read warning-protected context')
   context.push({postId:prior.id,revision:prior.revision,text:prior.text.slice(0,700)});parent=prior.parent_id
  }
  return {postId:p.id,revision:p.revision,text:p.text,title:content.title??'',context:context.reverse()}
 }
 check(job:ResidentJob,row=this.input(job.id)):{route:ResidentRoute;question:ResidentQuestion} {
  if(!row||!job.requester_id||job.trigger_post_id!==row.target_post_id)throw new Fault(409,'Question input is missing')
  const route=this.routing.resolve(job.agent_id,job.community_id),c=route.config
  if(c.community_id!==row.config_community_id||c.operator_id!==job.operator_id||c.revision!==job.config_revision||route.globalRevision!==row.global_revision||route.routeRevision!==row.route_revision||route.postingMandateId!==row.posting_mandate_id||JSON.stringify(route.coverage)!==row.coverage)throw new Fault(409,'Question participation changed')
  const p=this.post(row.target_post_id)
  if(p.community_id!==job.community_id||p.revision!==row.target_revision)throw new Fault(409,'Question changed')
  const question=this.snapshot(job.requester_id,p.id)
  if(hash(question)!==row.target_digest||hash(JSON.parse(row.snapshot))!==row.target_digest)throw new Fault(409,'Question or its quoted context changed')
  return {route,question}
 }
 statuses(postId:string,actorId?:string){
  const s=this.store,post=s.getPost(actorId,postId),room=s.community(post.community_id)
  if(room.visibility!=='public'||room.publication!=='local')throw new Fault(404,'Not found')
  const rows=s.all<{job_id:string;target_post_id:string;agent_id:string;state:string;result_id:string|null;result_kind:string|null;operator_id:string;error:string|null}>("SELECT i.job_id,i.target_post_id,j.agent_id,j.state,j.result_id,j.result_kind,j.operator_id,j.error FROM resident_job_inputs i JOIN resident_jobs j ON j.id=i.job_id JOIN posts p ON p.id=i.target_post_id WHERE p.root_id=? AND p.community_id=? AND p.hidden=0 AND p.deleted=0 ORDER BY j.created DESC,j.id DESC LIMIT 20",post.rootId,room.id)
  return rows.map(row=>{
   let replyId:string|null=null
   // An honest abstention note is a real reply; Studio still sees state 'abstained'.
   const note=row.state==='abstained'&&row.result_kind==='abstention-reply'
   if((row.state==='succeeded'&&row.result_kind==='post'||note)&&row.result_id){try{const reply=s.getPost(actorId,row.result_id);if(!reply.deleted&&reply.community_id===room.id&&reply.parent_id===row.target_post_id)replyId=reply.id}catch{/* Never reveal a hidden/deleted answer identifier. */}}
   const state=row.state==='succeeded'||note?(replyId?'answered':'unavailable'):['queued','running','cancelled'].includes(row.state)?row.state:'unavailable'
   // Only the agent's operator learns why a request produced no reply: a
   // fixed code, never the stored message, provider body or prompt.
   const reason=state==='unavailable'&&actorId&&actorId===row.operator_id?(row.state==='abstained'?'abstained':residentFailureCode(row.error)??(row.state==='failed'?'other':null)):null
   return {postId:row.target_post_id,agentId:row.agent_id,state,replyId,...(reason?{reason}:{})}
  })
 }
}
