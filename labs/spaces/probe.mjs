import {Server} from 'node:net'
import {randomUUID} from 'node:crypto'
import {dirname} from 'node:path'
import {tmpdir} from 'node:os'
import assert from 'node:assert/strict'
import {image} from '../../test/media-fixture.ts'
import {writeFile,rm} from 'node:fs/promises'
import {TestNetworkNoAppView} from '@atproto/dev-env'
import {AtpAgent} from '@atproto/api'
import {P256Keypair} from '@atproto/crypto'
import {getDidKeyFromMultibase} from '@atproto/identity'
import {parseCid} from '@atproto/lex-data'
import {createSpaceSigHeaders,parseSpaceToken,encapsulate,formatWantMacHeader,parseMacHeader,verifyRecordMac,RECORD_MAC_TYPE} from '@atproto/space'
const report={snapshot:'0.0.0-spaces-alpha-20261029171913',syntheticOnly:true,checks:[],limits:[]}
const check=(name,detail)=>{report.checks.push({name,detail});console.log('PASS',name,detail??'')}
const denied=(fn,code)=>assert.rejects(fn,e=>[400,401,403,404].includes(e.status)&&e.error===code)
// The official dev harness otherwise listens on all interfaces. Limit this
// standalone lab's bootstrap listeners to loopback, then restore Node's method.
const listen=Server.prototype.listen
Server.prototype.listen=function(...args){if(typeof args[0]==='number'){if(typeof args[1]==='string')args[1]='127.0.0.1';else args.splice(1,0,'127.0.0.1')}else if(args[0]&&typeof args[0]==='object'&&'port' in args[0])args[0]={...args[0],host:'127.0.0.1'};return listen.apply(this,args)}
let network
try{network=await TestNetworkNoAppView.create({extraPdses:1,lexiconAuthority:true})}finally{Server.prototype.listen=listen}
const temporaryPaths=[network.pds,...network.extraPdses].flatMap(p=>[dirname(p.ctx.cfg.db.accountDbLoc),p.ctx.cfg.blobstore.location])
for(const p of[network.pds,...network.extraPdses])assert.equal(p.server.server.address().address,'127.0.0.1')
try{
 const pds=network.pds,remote=network.extraPdses[0]
 async function account(pds,handle){const a=pds.getAgent();await a.createAccount({handle,email:handle+'@example.invalid',password:randomUUID()});return a}
 const owner=await account(pds,'strata-alice.test'),member=await account(remote,'strata-bob.test2'),outsider=await account(remote,'strata-carol.test2')
 const created=await owner.com.atproto.space.createSpace({spaceType:'com.example.group',policy:{$type:'com.atproto.memberspace.policy',publicRead:false,publicWrite:false,publishPolicy:false,publishMembers:false}}),space=created.data.uri
 check('create-private-space','Official PDS alpha; two independent PDS services')
 for(const did of[owner.assertDid,member.assertDid])await owner.com.atproto.memberspace.putMember({space,did,read:true,write:true})
 const collection='org.example.strata.labPost',rkey='synthetic-one',text='Synthetic Mee forum experiment. No community data.'
 await member.com.atproto.space.putRecord({space,repo:member.assertDid,collection,rkey,validate:false,record:{$type:collection,text,createdAt:new Date().toISOString()}})
 check('member-write-on-second-pds','Author retains a separate repository inside the shared space')
 const credentialKey=await P256Keypair.create()
 async function credential(agent){const delegation=await agent.com.atproto.space.getDelegationToken({space});const result=await new AtpAgent({service:pds.url}).com.atproto.space.getSpaceCredential({space,credentialKid:credentialKey.did(),delegationToken:delegation.data.token});return result.data.credential}
 const token=await credential(owner)
 const memberToken=await credential(member);check('admitted-member-can-mint-credential')
 const doc=await network.plc.getClient().getDocument(member.assertDid)
 const kemMethod=doc.verificationMethod.find(m=>m.id.endsWith('#atproto_kem'))
 const kemKey=getDidKeyFromMultibase(kemMethod)
 async function read(token,service=remote.url,key=credentialKey){
  const kem=await encapsulate(kemKey)
  const headers={...await createSpaceSigHeaders(key,{authorization:'Atproto-Space-Credential '+token,audience:member.assertDid}),'atproto-space-want-mac':formatWantMacHeader(RECORD_MAC_TYPE,kem.keyShare)}
  const response=await new AtpAgent({service}).com.atproto.space.getRecord({space,repo:member.assertDid,collection,rkey},{headers})
  assert.ok(verifyRecordMac(kem.sharedSecret,response.data.uri,parseCid(response.data.cid),parseMacHeader(response.headers['atproto-space-mac'],RECORD_MAC_TYPE)))
  return response
 }
 assert.equal((await read(token)).data.value.text,text);assert.equal((await read(memberToken)).data.value.text,text);check('cross-pds-authorized-read','Official key-bound credential and HTTP signature helpers')
 await denied(()=>credential(outsider),'SpaceNotFound');check('outsider-credential-denied')
 await denied(()=>new AtpAgent({service:remote.url}).com.atproto.space.getRecord({space,repo:member.assertDid,collection,rkey}),'AuthMissing');check('anonymous-space-read-denied')
 const wrongKey=await P256Keypair.create();await denied(()=>read(token,remote.url,wrongKey),'BadSpaceSignature');check('wrong-credential-key-denied')
 await denied(()=>new AtpAgent({service:remote.url}).com.atproto.repo.getRecord({repo:member.assertDid,collection,rkey}),'RecordNotFound');check('absent-from-public-repository-records')
 const publicRecords=await new AtpAgent({service:remote.url}).com.atproto.repo.listRecords({repo:member.assertDid,collection});assert.equal(publicRecords.data.records.length,0);check('absent-from-public-collection-list')
 const bytes=Buffer.from(image,'base64'),blob=(await member.com.atproto.repo.uploadBlob(bytes,{encoding:'image/webp'})).data.blob
 await member.com.atproto.space.putRecord({space,repo:member.assertDid,collection,rkey:'synthetic-image',validate:false,record:{$type:collection,text:'Synthetic image',image:blob}})
 const blobHeaders=await createSpaceSigHeaders(credentialKey,{authorization:'Atproto-Space-Credential '+token,audience:member.assertDid})
 const privateBlob=await new AtpAgent({service:remote.url}).com.atproto.space.getBlob({space,repo:member.assertDid,cid:blob.ref.toString()},{headers:blobHeaders});assert.deepEqual(Buffer.from(privateBlob.data),bytes);check('authorized-private-blob-read')
 await denied(()=>new AtpAgent({service:remote.url}).com.atproto.space.getBlob({space,repo:member.assertDid,cid:blob.ref.toString()}),'AuthMissing');check('anonymous-private-blob-denied')
 await denied(()=>new AtpAgent({service:remote.url}).com.atproto.sync.getBlob({did:member.assertDid,cid:blob.ref.toString()}),'BlobNotFound');check('private-blob-absent-from-public-sync')
 await owner.com.atproto.memberspace.removeMember({space,did:member.assertDid});await denied(()=>credential(member),'SpaceNotFound');check('removed-member-cannot-mint-new-credential')
 await read(memberToken);check('issued-credential-still-readable-immediately-after-removal','New credentials denied; old bearer remains usable until revocation/expiry reaches the repo host')
 const ttl=parseSpaceToken('credential',token).payload;report.limits.push('Credential lifetime: '+(ttl.exp-ttl.iat)+' seconds. Existing issued credentials need explicit revocation qualification; no instant-revocation claim.','Spaces access control is not end-to-end encryption.','This trial uses development account sessions, not the production OAuth/consent integration.','Public full-repo/firehose inspection, OAuth scopes and backup/restore remain separate qualification gates.')
 await writeFile(new URL('./report.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
}catch(e){console.error(e.error??e.name,e.message);process.exitCode=1}finally{await network.close();for(const path of temporaryPaths){if(dirname(path)!==tmpdir())throw Error('Unexpected lab temporary path');await rm(path,{recursive:true,force:true})}}
