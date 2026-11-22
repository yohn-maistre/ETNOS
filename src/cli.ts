import { mkdirSync, chmodSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Etnos } from './store.ts'
import { server } from './http.ts'
import { etnosEnv } from './env.ts'

process.umask(0o077)
const env = etnosEnv(process.env)
const path = resolve(env.ETNOS_DB ?? '.etnos/node.sqlite')
mkdirSync(dirname(path),{recursive:true,mode:0o700})
const store = new Etnos(path,env.ETNOS_ORIGIN ?? 'http://127.0.0.1:7342')
chmodSync(path,0o600)
const [command,...args] = process.argv.slice(2)
try {
  if (command === 'provision') {
    const [did,name,operator] = args
    if (!did || !name) throw Error('Usage: node src/cli.ts provision DID NAME [HUMAN_OPERATOR_ID]')
    // Token is printed once to the operator's terminal, never an HTTP response/log.
    console.log(JSON.stringify(store.provision(did,name,operator)))
    store.close()
  } else if (command === 'serve') {
    const url = new URL(store.base)
    if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname)) throw Error('Foundation host is loopback-only; production enrollment/TLS is not qualified')
    store.recoverInterrupted()
    const app = server(store,{custodyFixture:env.ETNOS_ENABLE_CUSTODY_FIXTURE === 'true',catalogue:env.ETNOS_CATALOGUE})
    app.requestTimeout = 15000; app.headersTimeout = 10000; app.keepAliveTimeout = 3000
    app.listen(Number(url.port || 7342),'127.0.0.1',()=>console.log(`ETNOS foundation: ${store.base} (JSON API; local credentials; live AT writes disabled)`))
    const stop = () => app.close(()=>{store.close();process.exit(0)})
    process.on('SIGINT',stop);process.on('SIGTERM',stop)
  } else if (command === 'demo') {
    if (store.get<{n:number}>('SELECT COUNT(*) n FROM actors')!.n) throw Error('Demo requires an empty database')
    const owner = store.provision('did:web:steward.example','Demo steward')
    const publicCommunity = store.createCommunity(owner.actor.id,'Music and community','Synthetic local example','public')
    const privateCommunity = store.createCommunity(owner.actor.id,'Private working group','Synthetic private example','hidden-private')
    store.createPost(owner.actor.id,publicCommunity.id,'A public-square foundation. No AT record has been sent.')
    store.createPost(owner.actor.id,privateCommunity.id,'A private discussion; never queued for public AT publication.')
    console.log(JSON.stringify({ disclosure:'Synthetic data. Save the one-time local credential securely.', ...owner, publicCommunity:publicCommunity.id, privateCommunity:privateCommunity.id }))
    store.close()
  } else {
    store.close()
    throw Error('Commands: serve | demo | provision DID NAME [OPERATOR_ID]')
  }
} catch (e) { console.error(e instanceof Error ? e.message : 'Command failed'); process.exitCode = 1 }
