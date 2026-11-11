// Local tests only: never deploy this provisioning entrypoint.
import worker,{StrataNode} from '../src/web-worker.ts'
import {StrataCore} from '../src/core.ts'
import {Knowledge} from '../src/knowledge.ts'
import {CloudflareDatabase} from '../src/cloudflare-database.ts'
export class TestWebNode extends StrataNode{
 seed(){
  const s=new StrataCore(new CloudflareDatabase(this.ctx.storage),this.env.STRATA_ORIGIN)
  const owner=s.provision('did:web:share-runtime.example','Runtime author'),pub=s.createCommunity(owner.actor.id,'Public runtime room','Public room','public'),privateRoom=s.createCommunity(owner.actor.id,'Private runtime room','Never public','hidden-private'),post=s.createPost(owner.actor.id,pub.id,'Runtime public conversation'),secret=s.createPost(owner.actor.id,privateRoom.id,'Never public runtime secret')
  const k=new Knowledge(s),note=k.create(owner.actor.id,{communityId:pub.id,title:'Public provisional runtime Wiki',text:'## Sources\nA public starting point.',requestKey:'runtime-public-note'});k.create(owner.actor.id,{communityId:privateRoom.id,title:'Protected language runtime note',text:'Never public protected wording',requestKey:'runtime-protected-note'});
  return JSON.stringify({owner,pub,privateRoom,post,secret,note})
 }
}
export default worker
