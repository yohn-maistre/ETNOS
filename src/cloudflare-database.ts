import type { Database, Binding } from './database.ts'

/** SQL is colocated with the node authority; never run BEGIN/COMMIT via sql.exec. */
export class CloudflareDatabase implements Database {
  private storage: DurableObjectStorage
  private inTransaction=false
  private poisoned=false
  private cause:unknown
  constructor(storage: DurableObjectStorage) { this.storage=storage }
  exec(sql: string) { this.storage.sql.exec(sql) }
  all<T>(sql: string, ...args: Binding[]): T[] {
    const rows=this.storage.sql.exec(sql,...args).toArray()
    return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[
      key,value instanceof ArrayBuffer ? new Uint8Array(value) : value,
    ]))) as T[]
  }
  get<T>(sql: string, ...args: Binding[]) { return this.all<T>(sql,...args)[0] }
  run(sql: string, ...args: Binding[]) { this.storage.sql.exec(sql,...args) }
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
