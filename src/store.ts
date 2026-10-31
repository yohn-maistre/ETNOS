import { DatabaseSync } from 'node:sqlite'
import type { Database, Binding } from './database.ts'
import { StrataCore } from './core.ts'
export * from './core.ts'

export class LocalDatabase implements Database {
  private sqlite: DatabaseSync
  constructor(path = ':memory:') {
    this.sqlite = new DatabaseSync(path)
    const version = this.sqlite.prepare('PRAGMA user_version').get() as { user_version: number }
    if (version.user_version > 1) { this.sqlite.close(); throw new Error('Legacy database version is newer than this host') }
    this.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;')
  }
  exec(sql: string) { this.sqlite.exec(sql) }
  get<T>(sql: string, ...args: Binding[]) { return this.sqlite.prepare(sql).get(...args) as T | undefined }
  all<T>(sql: string, ...args: Binding[]) { return this.sqlite.prepare(sql).all(...args) as T[] }
  run(sql: string, ...args: Binding[]) { this.sqlite.prepare(sql).run(...args) }
  transaction<T>(fn: () => T): T {
    this.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      if (result && typeof (result as { then?: unknown }).then === 'function') throw new Error('Transaction callback must be synchronous')
      this.exec('COMMIT')
      return result
    } catch (error) { this.exec('ROLLBACK'); throw error }
  }
  close() { this.sqlite.close() }
}

/** Local convenience host. Worker bundles import core.ts, never node:sqlite. */
export class Strata extends StrataCore {
  constructor(path = ':memory:', base = 'http://127.0.0.1:7342', clock = () => Date.now()) {
    const database = new LocalDatabase(path)
    try { super(database,base,clock) } catch (error) { database.close(); throw error }
  }
}
