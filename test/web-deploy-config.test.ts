import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
// @ts-expect-error: a plain .mjs script without type declarations
import {stripJsonc,withoutServices} from '../scripts/web-deploy-config.mjs'

test('deploy config: the web Worker config parses, and a named service binding is left out',()=>{
  const config=JSON.parse(stripJsonc(readFileSync('wrangler.web.jsonc','utf8')))
  assert.equal(config.name,'strata-preview','the live Worker name is kept')
  assert.match(config.vars.STRATA_SOURCE_ORIGINS,/^https:\/\//,'// inside a string is not a comment')
  assert.deepEqual(config.services.map((s:{binding:string})=>s.binding).sort(),['RESIDENT_PI','WATCH_NEWS'])
  const fresh=withoutServices(config,['WATCH_NEWS'])
  assert.deepEqual(fresh.services.map((s:{binding:string})=>s.binding),['RESIDENT_PI'])
  assert.deepEqual({...fresh,services:undefined},{...config,services:undefined},'nothing else changes')
  assert.equal('services' in withoutServices(config,['WATCH_NEWS','RESIDENT_PI']),false)
  assert.throws(()=>withoutServices(config,['WATCH_NEW']),/No service binding named WATCH_NEW/,'a typo fails the deploy')
})

test('deploy config: comments and trailing commas go, strings stay',()=>{
  assert.deepEqual(JSON.parse(stripJsonc('{\n // note\n "a": "x // y /* z */", /* block */ "b": [1, 2,],\n}')),{a:'x // y /* z */',b:[1,2]})
  assert.deepEqual(JSON.parse(stripJsonc('{"q": "say \\"hi\\" // ok"}')),{q:'say "hi" // ok'})
})
