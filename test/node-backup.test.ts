import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {backupKey,backupId,backupFileName,backupRows,decodeBackup,encodeBackup,exportNode,importNode,nodeTables,SKIPPED_TABLES} from '../src/node-backup.ts'

const did=(c:string)=>'did:plc:'+c.repeat(24)
function populated(){
  const s=new Etnos(':memory:','https://etnos.example')
  const owner=s.provision(did('a'),'Pemilik (data uji)'),member=s.provision(did('b'),'Anggota (data uji)')
  const open=s.createCommunity(owner.actor.id,'Ruang publik (data uji)','Percakapan uji','public')
  const hidden=s.createCommunity(owner.actor.id,'Ruang privat (data uji)','Hanya anggota','hidden-private')
  s.join(member.actor.id,open.id)
  const root=s.createPost(owner.actor.id,open.id,'Posting pertama (data uji)')
  s.createPost(member.actor.id,open.id,'Balasan (data uji)',root.id)
  s.createPost(owner.actor.id,hidden.id,'Catatan privat (data uji)')
  s.run('INSERT INTO browser_sessions VALUES(?,?,?,?,?,0)','f'.repeat(64),owner.actor.id,'csrf-fixture',s.clock(),s.clock()+1000)
  s.run('INSERT INTO invite_requests(id,name,contact,reason,created) VALUES(?,?,?,?,?)','00000000-0000-4000-8000-000000000001','Peminta (data uji)','kontak uji','',s.clock())
  // A BLOB column survives the trip byte for byte.
  s.run("INSERT INTO public_post_vectors(post_id,community_id,vector,dims,mode,updated) VALUES(?,?,?,?,?,?)",root.id,open.id,new Uint8Array([0,1,2,250,255]),5,'fixture',s.clock())
  return {s,owner,member,open,hidden,root}
}
const counts=(s:Etnos)=>Object.fromEntries(nodeTables(s).filter(t=>!SKIPPED_TABLES.has(t)).map(t=>[t,s.get<{n:number}>('SELECT count(*) n FROM "'+t+'"')!.n]))

test('node backup round trip: export, compress, import into a fresh node, same rows', async()=>{
  const a=populated()
  const fresh=new Etnos(':memory:','https://etnos.example')
  try{
    const backup=exportNode(a.s,Date.UTC(2026,10,27,3,0,0),[['model-choice',{fast:'x'}],['model-key',{key:'secret-fixture'}],['service-key:plantnet',{key:'secret-fixture'}]])
    assert.ok(backupRows(backup)>10)
    assert.equal('browser_sessions' in backup.tables,false)
    assert.equal('oauth_records' in backup.tables,false)
    assert.deepEqual(Object.keys(backup.kv),['model-choice'])
    const bytes=await encodeBackup(backup)
    assert.equal(new TextDecoder().decode(bytes).includes('Catatan privat'),false,'compressed, not plain text')
    const restored=importNode(fresh,await decodeBackup(bytes))
    assert.equal(restored.rows,backupRows(backup))
    assert.deepEqual(counts(fresh),counts(a.s))
    for(const id of [a.root.id])assert.deepEqual(fresh.get('SELECT * FROM posts WHERE id=?',id),a.s.get('SELECT * FROM posts WHERE id=?',id))
    assert.equal(fresh.get<{title:string}>('SELECT title FROM communities WHERE id=?',a.hidden.id)!.title,'Ruang privat (data uji)')
    assert.equal(fresh.get<{visibility:string}>('SELECT visibility FROM communities WHERE id=?',a.hidden.id)!.visibility,'hidden-private')
    assert.deepEqual(fresh.get('SELECT * FROM memberships WHERE actor_id=? AND community_id=?',a.member.actor.id,a.open.id),a.s.get('SELECT * FROM memberships WHERE actor_id=? AND community_id=?',a.member.actor.id,a.open.id))
    assert.deepEqual([...fresh.get<{vector:Uint8Array}>('SELECT vector FROM public_post_vectors')!.vector],[0,1,2,250,255])
    assert.equal(fresh.get<{name:string}>('SELECT name FROM invite_requests')!.name,'Peminta (data uji)')
    assert.equal(fresh.get<{n:number}>('SELECT count(*) n FROM browser_sessions')!.n,0)
    // The restored node works: the private post stays private to non-members.
    const outsider=fresh.provision(did('c'),'Orang luar (data uji)')
    assert.throws(()=>fresh.createPost(outsider.actor.id,a.hidden.id,'Tidak boleh'))
  }finally{a.s.close();fresh.close()}
})

test('restore refuses a node that already holds data, another schema version and a file that is not a backup', async()=>{
  const a=populated(),b=populated()
  try{
    const backup=exportNode(a.s,Date.now())
    const before=counts(b.s)
    assert.throws(()=>importNode(b.s,backup),/sudah berisi/)
    assert.deepEqual(counts(b.s),before)
    const empty=new Etnos(':memory:','https://etnos.example')
    try{
      assert.throws(()=>importNode(empty,{...backup,schemaVersion:backup.schemaVersion-1}),/versi ETNOS lain/)
      assert.throws(()=>importNode(empty,{...backup,tables:{...backup.tables,evil:{columns:['x'],rows:[]}}}),/tidak dikenal/)
      await assert.rejects(decodeBackup(new TextEncoder().encode('not gzip')),/bukan cadangan/)
      // A failure halfway through leaves the empty node empty.
      const broken={...backup,tables:{...backup.tables,posts:{...backup.tables.posts,rows:[...backup.tables.posts.rows,backup.tables.posts.rows[0]]}}}
      assert.throws(()=>importNode(empty,broken))
      assert.equal(empty.get<{n:number}>('SELECT count(*) n FROM actors')!.n,0)
    }finally{empty.close()}
  }finally{a.s.close();b.s.close()}
})

test('backup objects are named by time only', ()=>{
  const key=backupKey(Date.UTC(2026,10,27,3,4,5,678))
  assert.equal(key,'node/2026-11-27T03-04-05Z.json.gz')
  assert.equal(backupId(key),'2026-11-27T03-04-05Z')
  assert.equal(backupFileName(backupId(key)!),'etnos-node-2026-11-27T03-04-05Z.json.gz')
  assert.equal(backupId('node/../x.json.gz'),null)
})
