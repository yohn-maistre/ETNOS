import { type Agent, ComAtprotoRepoGetRecord } from '@atproto/api'
import { COLLECTION, validateRecord, type Publisher, type PublicRecord } from './transport.ts'

/** Real SDK boundary, supplied with a properly authenticated/scoped Agent.
 * No password-login shortcut, private payload or credentials are accepted here.
 * Live writes deliberately blocked until a real namespace and enrollment exist.
 */
export class AtprotoPublisher implements Publisher {
  readonly did: string
  private agent: Agent
  private options: { sandboxWrites?: boolean }
  constructor(did: string, agent: Agent, options: { sandboxWrites?: boolean } = {}) { this.did=did; this.agent=agent; this.options=options }
  private writeGuard() {
    if (!this.options.sandboxWrites) throw new Error('Live publication disabled: qualify namespace and enrollment first')
    if (this.agent.did !== this.did) throw new Error('Authenticated AT account mismatch')
  }
  async put(rkey: string, record: PublicRecord): Promise<{ cid: string }> {
    validateRecord(record)
    this.writeGuard()
    // The example namespace is validated locally, not published/discoverable DNS.
    // Never overwrite an existing record when acknowledging a new intent.
    const { data } = await this.agent.com.atproto.repo.putRecord({ repo: this.did, collection: COLLECTION, rkey, record, validate: false, swapRecord: null })
    if (data.uri !== `at://${this.did}/${COLLECTION}/${rkey}`) throw new Error('Unexpected publication URI')
    return { cid: data.cid }
  }
  async read(rkey: string) {
    try {
      const { data } = await this.agent.com.atproto.repo.getRecord({ repo: this.did, collection: COLLECTION, rkey })
      if (!data.cid) throw new Error('Missing record CID')
      return { record: data.value, cid: data.cid }
    } catch (e) {
      if (e instanceof ComAtprotoRepoGetRecord.RecordNotFoundError) return null
      throw e
    }
  }
  async remove(rkey: string, cid: string): Promise<void> {
    this.writeGuard()
    await this.agent.com.atproto.repo.deleteRecord({ repo: this.did, collection: COLLECTION, rkey, swapRecord: cid })
  }
}
