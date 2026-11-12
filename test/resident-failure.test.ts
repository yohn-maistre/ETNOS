import test from 'node:test'
import assert from 'node:assert/strict'
import {ResidentFailure,residentFailureCode,serviceFailure} from '../src/resident-failure.ts'
test('service failures preserve fixed quota/configuration codes without forwarding diagnostics or credentials',async()=>{
 for(const [response,code] of [[Response.json({error:'Model quota reached'},{status:429}),'provider-quota'],[Response.json({error:'Communal model gateway unavailable'},{status:503}),'gateway-unconfigured'],[Response.json({error:'provider detail includes Bearer secret',code:'unrecognized-provider-message'},{status:502}),'provider-unavailable'],[Response.json({code:'runtime-protocol'},{status:503}),'runtime-protocol']] as const){const error=await serviceFailure(response,'provider-unavailable');assert.equal(error.code,code);assert.equal(error.message,'resident:'+code);assert.doesNotMatch(error.message,/Bearer|secret|detail/)}
 assert.equal(residentFailureCode(new ResidentFailure('provider-quota')),'provider-quota');assert.equal(residentFailureCode('untrusted-code'),undefined)
})
