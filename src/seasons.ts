import {randomUUID} from 'node:crypto'
import {Fault,type EtnosCore} from './core.ts'
import {readScope} from './commons.ts'

/** A season a community names for itself (a wind, a harvest, a fishing time). Posts may carry one.
 * Seasons are the community's own words, not a calendar ETNOS imposes, so they have no dates.
 * A season is never deleted: retiring it stops new use and keeps it on records that already carry it. */
export type Season={id:string;name:string;note:string;position:number;archived:boolean}
type Row={id:string;community_id:string;name:string;note:string;position:number;archived:number}
const MAX_ACTIVE=12
const view=(r:Row):Season=>({id:r.id,name:r.name,note:r.note,position:r.position,archived:!!r.archived})
const words=(value:unknown,max:number,field:string)=>{if(typeof value!=='string')throw new Fault(400,'Invalid '+field);const v=value.normalize('NFKC').replace(/\s+/g,' ').trim();if(v.length>max)throw new Fault(400,'Invalid '+field);return v}
const fold=(v:string)=>v.toLocaleLowerCase('id-ID')

export class Seasons{
 private store:EtnosCore
 constructor(store:EtnosCore){this.store=store}
 /** Seasons of a community, for anyone who may read it. Retired ones are listed last so old records still resolve. */
 list(communityId:string,actorId?:string){
  readScope(this.store,communityId,actorId)
  return this.store.all<Row>('SELECT * FROM community_seasons WHERE community_id=? ORDER BY archived,position,name',communityId).map(view)
 }
 add(actorId:string,communityId:string,b:Record<string,unknown>){
  const s=this.store
  return s.tx(()=>{
   s.requireSteward(actorId,communityId)
   const name=words(b.name,60,'season name'),note=b.note===undefined?'':words(b.note,200,'season note')
   if(!name)throw new Fault(400,'A season needs a name')
   const active=s.all<Row>('SELECT * FROM community_seasons WHERE community_id=? AND archived=0',communityId)
   if(active.length>=MAX_ACTIVE)throw new Fault(409,'A community keeps at most twelve seasons')
   if(active.some(r=>fold(r.name)===fold(name)))throw new Fault(409,'That season already exists')
   const id=randomUUID(),now=s.clock(),position=(s.get<{n:number}>('SELECT COALESCE(MAX(position),-1)+1 n FROM community_seasons WHERE community_id=?',communityId)!.n)
   s.run('INSERT INTO community_seasons(id,community_id,name,note,position,archived,issuer_id,created,updated) VALUES(?,?,?,?,?,0,?,?,?)',id,communityId,name,note,position,actorId,now,now)
   s.audit(actorId,'season.add',id)
   return view(s.get<Row>('SELECT * FROM community_seasons WHERE id=?',id)!)
  })
 }
 /** Rename, describe, retire or bring back a season. Stewards only, checked at use time. */
 update(actorId:string,communityId:string,seasonId:string,b:Record<string,unknown>){
  const s=this.store
  return s.tx(()=>{
   s.requireSteward(actorId,communityId)
   const row=s.get<Row>('SELECT * FROM community_seasons WHERE id=? AND community_id=?',seasonId,communityId)
   if(!row)throw new Fault(404,'Not found')
   const name=b.name===undefined?row.name:words(b.name,60,'season name'),note=b.note===undefined?row.note:words(b.note,200,'season note')
   const archived=b.archived===undefined?!!row.archived:b.archived===true?true:b.archived===false?false:(()=>{throw new Fault(400,'Invalid season state')})()
   if(!name)throw new Fault(400,'A season needs a name')
   if(!archived){
    const others=s.all<Row>('SELECT * FROM community_seasons WHERE community_id=? AND archived=0 AND id!=?',communityId,seasonId)
    if(others.some(r=>fold(r.name)===fold(name)))throw new Fault(409,'That season already exists')
    if(row.archived&&others.length>=MAX_ACTIVE)throw new Fault(409,'A community keeps at most twelve seasons')
   }
   s.run('UPDATE community_seasons SET name=?,note=?,archived=?,updated=? WHERE id=?',name,note,archived?1:0,s.clock(),seasonId)
   s.invalidatePublicContext(communityId)
   s.audit(actorId,archived&&!row.archived?'season.retire':'season.update',seasonId)
   return view(s.get<Row>('SELECT * FROM community_seasons WHERE id=?',seasonId)!)
  })
 }
}

/** A post may carry a season only from its own community, and only one still in use. */
export function checkSeason(s:EtnosCore,communityId:string,seasonId:string){
 if(!s.get('SELECT 1 FROM community_seasons WHERE id=? AND community_id=? AND archived=0',seasonId,communityId))throw new Fault(400,'Choose a season of this community')
}
