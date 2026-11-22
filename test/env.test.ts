import {test} from 'node:test'
import assert from 'node:assert/strict'
import {etnosEnv} from '../src/env.ts'

test('ETNOS_ settings are read first and the older STRATA_ names still work',()=>{
  const binding={getByName(){return 'stub'}}
  const env=etnosEnv({STRATA_ORIGIN:'https://old.example',ETNOS_ORIGIN:'https://etnos.example',STRATA_NODE:'preview',STRATA:binding,OPENALEX_API_KEY:'k'})
  assert.equal(env.ETNOS_ORIGIN,'https://etnos.example')
  assert.equal(env.ETNOS_NODE,'preview','a deployment that only sets the old name keeps working')
  assert.equal(env.STRATA,binding,'bindings pass through unchanged')
  assert.equal(env.OPENALEX_API_KEY,'k')
  assert.equal('STRATA_ORIGIN' in env,false,'code reads one name for each setting')
  assert.deepEqual(etnosEnv({STRATA_MODEL_KEY:'secret'}),{ETNOS_MODEL_KEY:'secret'})
  assert.deepEqual(etnosEnv({ETNOS_MODEL_KEY:'new',STRATA_MODEL_KEY:'old'}),{ETNOS_MODEL_KEY:'new'})
})
