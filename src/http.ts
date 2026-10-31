import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { api, json } from './api.ts'
import type { StrataCore } from './core.ts'

/** Loopback HTTP transport; the application handler is shared with Workers. */
export function server(store: StrataCore, options: { custodyFixture?: boolean } = {}) {
  const handle=api(store,options)
  return createServer(async(req,res)=>{
    try {
      if (!req.url || req.headers.host !== new URL(store.base).host) {
        res.writeHead(400,{'content-type':'application/json','cache-control':'no-store'})
        res.end(JSON.stringify({error:'Unexpected host'})); return
      }
      const headers=new Headers()
      for (const [key,value] of Object.entries(req.headers)) if(value) headers.set(key,Array.isArray(value)?value.join(','):value)
      const init: RequestInit & {duplex:'half'} = {method:req.method,headers,duplex:'half'}
      if (!['GET','HEAD'].includes(req.method ?? 'GET')) init.body=Readable.toWeb(req) as ReadableStream<Uint8Array>
      const response=await handle(new Request(new URL(req.url,store.base),init))
      res.writeHead(response.status,Object.fromEntries(response.headers))
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch {
      if (res.headersSent) { res.destroy(); return }
      const response=json(500,{error:'Internal error'})
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text())
    }
  })
}
