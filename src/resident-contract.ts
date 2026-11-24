/** JSON-only runtime port. No authority, model credentials or private-source access is implied. */
export type AutonomousSkill='kabar-harian'|'riset-ensiklopedia'|'usulan-periksa'|'pertanyaan-harian'
export type ResidentSkill='source-digest'|'research-question'|'knowledge-draft'|AutonomousSkill|'thread-reply'
export type ResidentEvidence={id:string;revision:number;title:string;url:string;summary:string;sources:{id:string;revision:number}[]}
export type ResidentWork={jobId:string;generation:number;ticket:string;communityId:string;agentId:string;contextEpoch:number;sessionKey:string}
export type ResidentQuestion={postId:string;revision:number;text:string;title:string;context:{postId:string;revision:number;text:string}[]}
export type ResidentInput={skill:ResidentSkill;community:string;language:string;evidence:ResidentEvidence[];work:ResidentWork;question?:ResidentQuestion}
export type ResidentOutput={text:string;model:string;inputTokens?:number;outputTokens?:number;questionReceipt?:{postId:string;revision:number}}
