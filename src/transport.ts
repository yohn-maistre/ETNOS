import { Lexicons, type LexiconDoc } from '@atproto/lexicon'
import definition from '../lexicons/post.json' with { type: 'json' }

// Deliberately non-production namespace. DNS/NSID ownership is not yet selected.
export const COLLECTION = 'org.example.strata.post'
export type PublicRecord = { $type: string; text: string; community: string; createdAt: string; actorKind: 'human'|'agent'; replyTo?: string }
export function postLexicon(collection=COLLECTION):LexiconDoc {return {...structuredClone(definition),id:collection} as LexiconDoc}
export class PostContract {
  readonly collection:string
  private lexicons:Lexicons
  constructor(collection=COLLECTION){this.collection=collection;this.lexicons=new Lexicons([postLexicon(collection)])}
  validate(record:unknown):asserts record is PublicRecord {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid public record')
    const keys = Object.keys(record)
    if (keys.some(k => !['$type','text','community','createdAt','replyTo','actorKind'].includes(k))) throw new Error('Unapproved public record fields')
    if((record as {$type?:unknown}).$type!==this.collection)throw new Error('Unexpected record namespace')
    this.lexicons.assertValidRecord(this.collection, record)
  }
}
const defaultContract:PostContract=new PostContract()
export function validateRecord(record:unknown):asserts record is PublicRecord {defaultContract.validate(record)}
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical((value as Record<string,unknown>)[k])}`).join(',')}}`
}
export interface Publisher {
  readonly did: string
  put(rkey: string, record: PublicRecord): Promise<{ cid: string }>
  read(rkey: string): Promise<{ record: unknown; cid: string } | null>
  remove(rkey: string, cid: string): Promise<void>
}
