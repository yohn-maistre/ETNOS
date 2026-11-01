/** Synchronous local/Worker transaction boundary. Network I/O stays outside. */
export type Binding = string | number | null | Uint8Array
export interface Database {
  exec(sql: string): void
  get<T>(sql: string, ...args: Binding[]): T | undefined
  all<T>(sql: string, ...args: Binding[]): T[]
  run(sql: string, ...args: Binding[]): void
  // Nested calls join one atomic unit. A failed inner call poisons the outer unit,
  // even if its caller catches the error; there are no partial nested commits.
  transaction<T>(fn: () => T): T
  close(): void
}
