/**
 * Backup and restore of a whole ETNOS node (docs/ops/fresh-cloudflare-migration.md).
 *
 * The export is a dump of every table, read with plain SELECT statements inside one synchronous call. A Durable
 * Object runs one thing at a time and nothing awaits between the reads, so no write can land in the middle: the
 * dump is a consistent snapshot. The same code runs on Node's SQLite, which is how the tests prove a round trip.
 *
 * What is left out: sign-in state (browser sessions, sealed OAuth records and the rate-limit buckets). After a
 * restore everyone signs in again. Keys that the operator added in Studio are left out too and are added again.
 *
 * A backup holds private data (private communities, messages, invitation requests). It is written only to a
 * private R2 bucket, read only by the operator, and named by its time only.
 */
import {Fault} from './core.ts'
import {schemaVersion} from './schema.ts'
import type {Binding} from './database.ts'

export const BACKUP_FORMAT='etnos-node-backup'
/** Tables never copied: sessions and tokens are tied to this deployment's keys, and buckets are throwaway counters. */
export const SKIPPED_TABLES=new Set(['oauth_records','browser_sessions','auth_buckets','invite_request_buckets'])
/** Studio-held secrets in the node's key-value storage. Never exported; the operator adds them again. */
export const secretKv=(key:string)=>key==='model-key'||key.startsWith('service-key:')

type Store={all<T>(sql:string,...args:Binding[]):T[];get<T>(sql:string,...args:Binding[]):T|undefined;run(sql:string,...args:Binding[]):void;tx<T>(fn:()=>T):T}
type Cell=string|number|null|{$b:string}
export type NodeBackup={
  format:typeof BACKUP_FORMAT;version:1;created:number;schemaVersion:number
  tables:Record<string,{columns:string[];rows:Cell[][]}>
  kv:Record<string,unknown>
}

const b64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
const unb64=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0))
const quote=(name:string)=>'"'+name.replace(/"/g,'""')+'"'

/** The node's own tables, in creation order. SQLite and Cloudflare internals (sqlite_*, _cf_*) are not ours. */
export function nodeTables(store:Store):string[]{
  return store.all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' ORDER BY rowid").map(r=>r.name)
}

/** One consistent snapshot. Synchronous on purpose: call it without awaiting anything in between. */
export function exportNode(store:Store,created:number,kv:Iterable<[string,unknown]>=[]):NodeBackup{
  const tables:NodeBackup['tables']={}
  for(const name of nodeTables(store)){
    if(SKIPPED_TABLES.has(name))continue
    const columns=store.all<{name:string}>('SELECT name FROM pragma_table_info(?) ORDER BY cid',name).map(c=>c.name)
    const rows=store.all<Record<string,unknown>>('SELECT * FROM '+quote(name)+' ORDER BY rowid').map(row=>columns.map((c):Cell=>{
      const v=row[c]
      if(v instanceof Uint8Array)return {$b:b64(v)}
      if(v instanceof ArrayBuffer)return {$b:b64(new Uint8Array(v))}
      if(typeof v==='bigint')return Number(v)
      return v as string|number|null
    }))
    tables[name]={columns,rows}
  }
  const values:Record<string,unknown>={}
  for(const [key,value] of kv)if(!secretKv(key)&&!key.startsWith('backup-'))values[key]=value
  return {format:BACKUP_FORMAT,version:1,created,schemaVersion,tables,kv:values}
}

export function backupRows(backup:NodeBackup){return Object.values(backup.tables).reduce((n,t)=>n+t.rows.length,0)}

async function pipe(bytes:Uint8Array,stream:CompressionStream|DecompressionStream){
  const out=new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}
export async function encodeBackup(backup:NodeBackup){return pipe(new TextEncoder().encode(JSON.stringify(backup)),new CompressionStream('gzip'))}
export async function decodeBackup(bytes:Uint8Array):Promise<NodeBackup>{
  let value:unknown
  try{value=JSON.parse(new TextDecoder().decode(await pipe(bytes,new DecompressionStream('gzip'))))}catch{throw new Fault(400,'Berkas ini bukan cadangan ETNOS.')}
  const b=value as NodeBackup
  if(!b||b.format!==BACKUP_FORMAT||b.version!==1||typeof b.tables!=='object'||!b.tables)throw new Fault(400,'Berkas ini bukan cadangan ETNOS.')
  return b
}

/** A node that nobody has written to yet: no posts, and at most the operator who signed in to restore. */
export function nodeIsEmpty(store:Store){
  return store.get<{n:number}>('SELECT count(*) n FROM posts')!.n===0&&store.get<{n:number}>('SELECT count(*) n FROM actors')!.n<=1
}

/**
 * Restore a backup into an empty node of the same schema version. Every table is replaced whole in one
 * transaction, with foreign keys checked at the end, so a failure leaves the node as it was.
 */
export function importNode(store:Store,backup:NodeBackup){
  if(backup.schemaVersion!==schemaVersion)throw new Fault(409,'Cadangan ini dibuat oleh versi ETNOS lain (skema '+backup.schemaVersion+', di sini '+schemaVersion+'). Pulihkan dengan versi yang sama, lalu perbarui.')
  const local=new Set(nodeTables(store))
  for(const name of Object.keys(backup.tables))if(!local.has(name)||SKIPPED_TABLES.has(name))throw new Fault(400,'Cadangan memuat tabel yang tidak dikenal.')
  return store.tx(()=>{
    if(!nodeIsEmpty(store))throw new Fault(409,'Node ini sudah berisi. Pemulihan hanya untuk node yang masih kosong.')
    store.run('PRAGMA defer_foreign_keys=ON')
    // Sign-in state goes too: the restored people sign in again on this deployment.
    for(const name of local)store.run('DELETE FROM '+quote(name))
    let rows=0
    for(const [name,table] of Object.entries(backup.tables)){
      if(!table.rows.length)continue
      const sql='INSERT INTO '+quote(name)+'('+table.columns.map(quote).join(',')+') VALUES('+table.columns.map(()=>'?').join(',')+')'
      for(const row of table.rows){
        store.run(sql,...row.map((v):Binding=>v&&typeof v==='object'?unb64(v.$b):v))
        rows++
      }
    }
    return {tables:Object.keys(backup.tables).length,rows}
  })
}

/** Object names hold the time only, never a name, handle or community. */
export const backupKey=(created:number)=>'node/'+new Date(created).toISOString().replace(/\.\d{3}Z$/,'Z').replace(/:/g,'-')+'.json.gz'
export const backupId=(key:string)=>/^node\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)\.json\.gz$/.exec(key)?.[1]??null
export const backupFileName=(id:string)=>'etnos-node-'+id+'.json.gz'
export const BACKUP_KEEP_DAYS=14
export const BACKUP_EVERY_MS=86400000
