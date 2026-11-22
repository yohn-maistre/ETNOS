// Local tests only: never deploy this provisioning entrypoint.
import worker,{StrataNode} from '../src/web-worker.ts'
import {EtnosCore} from '../src/core.ts'
import {Offerings} from '../src/offerings.ts'
import {Knowledge} from '../src/knowledge.ts'
import {CloudflareDatabase} from '../src/cloudflare-database.ts'
export class TestWebNode extends StrataNode{
 seed(){
  const s=new EtnosCore(new CloudflareDatabase(this.ctx.storage),this.config.ETNOS_ORIGIN)
  const owner=s.provision('did:web:share-runtime.example','Runtime author'),pub=s.createCommunity(owner.actor.id,'Public runtime room','Public room','public'),privateRoom=s.createCommunity(owner.actor.id,'Private runtime room','Never public','hidden-private'),post=s.createPost(owner.actor.id,pub.id,'Runtime public conversation'),secret=s.createPost(owner.actor.id,privateRoom.id,'Never public runtime secret')
  const k=new Knowledge(s),note=k.create(owner.actor.id,{communityId:pub.id,title:'Public provisional runtime Wiki',text:'## Sources\nA public starting point.',requestKey:'runtime-public-note'});k.create(owner.actor.id,{communityId:privateRoom.id,title:'Protected language runtime note',text:'Never public protected wording',requestKey:'runtime-protected-note'});
  const offerings=new Offerings(s),offering=offerings.create(owner.actor.id,{communityId:pub.id,text:'Synthetic public runtime offering',kind:'offer',price:12000,unit:'per ikat',requestKey:'11111111-1111-4111-8111-111111111111'});offerings.create(owner.actor.id,{communityId:privateRoom.id,text:'Protected runtime offering',kind:'request',price:90000,requestKey:'22222222-2222-4222-8222-222222222222'});
  return JSON.stringify({owner,pub,privateRoom,post,secret,note,offering})
 }
}
export default worker
