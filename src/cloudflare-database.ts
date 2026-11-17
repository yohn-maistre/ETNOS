import type { Database, Binding } from './database.ts'
import type { SqlUsage } from './usage.ts'

/** SQL is colocated with the node authority; never run BEGIN/COMMIT via sql.exec. */

export class CloudflareDatabase implements Database {
  /** Running totals for free-tier metering; read by the node per request. */
  readonly usage:SqlUsage={statements:0,rowsRead:0,rowsWritten:0}
  /** Test and profiling hook only: sees statement text and row counts, never bound values. */
  trace?:(sql:string,rowsRead:number,rowsWritten:number)=>void
  private storage: DurableObjectStorage
  private inTransaction=false
  private poisoned=false
  private cause:unknown
  constructor(storage: DurableObjectStorage) { this.storage=storage }
  private count(cursor:SqlStorageCursor<Record<string,SqlStorageValue>>,sql:string){this.usage.statements++;this.usage.rowsRead+=cursor.rowsRead;this.usage.rowsWritten+=cursor.rowsWritten;this.trace?.(sql,cursor.rowsRead,cursor.rowsWritten)}
  exec(sql: string) { const cursor=this.storage.sql.exec(sql);cursor.toArray();this.count(cursor,sql) }
  all<T>(sql: string, ...args: Binding[]): T[] {
    const cursor=this.storage.sql.exec(sql,...args),rows:Record<string,unknown>[]=cursor.toArray();this.count(cursor,sql)
    return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[
      key,value instanceof ArrayBuffer ? new Uint8Array(value) : value,
    ]))) as T[]
  }
  get<T>(sql: string, ...args: Binding[]) { return this.all<T>(sql,...args)[0] }
  run(sql: string, ...args: Binding[]) { const cursor=this.storage.sql.exec(sql,...args);cursor.toArray();this.count(cursor,sql) }
  transaction<T>(fn: () => T): T {
    const invoke=()=>{const result=fn();if(result && typeof (result as {then?:unknown}).then==='function')throw new Error('Transaction callback must be synchronous');return result}
    if(this.inTransaction){try{return invoke()}catch(error){this.poisoned=true;this.cause=error;throw error}}
    return this.storage.transactionSync(()=>{
      this.inTransaction=true;this.poisoned=false
      try{const result=invoke();if(this.poisoned)throw new Error('Nested operation failed; transaction aborted',{cause:this.cause});return result}
      finally{this.inTransaction=false;this.poisoned=false;this.cause=undefined}
    })
  }
  close() { /* The platform owns the connection lifetime. */ }
}
