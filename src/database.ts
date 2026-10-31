/** Synchronous local/Worker transaction boundary. Network I/O stays outside. */
export type Binding = string | number | null | Uint8Array
export interface Database {
  exec(sql: string): void
  get<T>(sql: string, ...args: Binding[]): T | undefined
  all<T>(sql: string, ...args: Binding[]): T[]
  run(sql: string, ...args: Binding[]): void
  transaction<T>(fn: () => T): T
  close(): void
}
