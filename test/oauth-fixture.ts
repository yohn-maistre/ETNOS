import assert from 'node:assert/strict'
import {JoseKey,type Fetch} from '@atproto/oauth-client-node'
import {BrowserAuth,type OAuthConfiguration} from '../src/oauth.ts'
import type {StrataCore} from '../src/core.ts'

export const did='did:plc:abcdefghijklmnopqrstuvwx'
export const origin='https://strata.example',issuer='https://issuer.example',pds='https://pds.example'
export async function fixture(s:StrataCore,overrides:Partial<OAuthConfiguration>={},tokenSubject=did){
  const key=await JoseKey.generate(['ES256'],'strata-signing-1')
  const config:OAuthConfiguration={origin,privateJwk:JSON.stringify(key.privateJwk),sealKey:Buffer.alloc(32,7).toString('base64url'),stewardDid:did,allowedHosts:['bsky.social','plc.directory','issuer.example','pds.example'],...overrides}
  let oauthState='',exchanges=0
  const metadata={issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',pushed_authorization_request_endpoint:issuer+'/par',revocation_endpoint:issuer+'/revoke',
    response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],subject_types_supported:['public'],
    token_endpoint_auth_methods_supported:['private_key_jwt'],token_endpoint_auth_signing_alg_values_supported:['ES256'],dpop_signing_alg_values_supported:['ES256'],
    code_challenge_methods_supported:['S256'],require_pushed_authorization_requests:true,client_id_metadata_document_supported:true,authorization_response_iss_parameter_supported:true,scopes_supported:['atproto']}
  const fetcher:Fetch=async(input,init)=>{
    const r=new Request(input,init),url=new URL(r.url)
    const reply=(body:unknown,status=200)=>Response.json(body,{status})
    if(url.hostname==='bsky.social' && url.pathname.endsWith('com.atproto.identity.resolveHandle'))return reply({did})
    if(url.hostname==='plc.directory')return reply({id:did,alsoKnownAs:['at://member.example'],service:[{id:did+'#atproto_pds',type:'AtprotoPersonalDataServer',serviceEndpoint:pds}]})
    if(url.origin===pds && url.pathname==='/.well-known/oauth-protected-resource')return reply({resource:pds,authorization_servers:[issuer],scopes_supported:['atproto'],bearer_methods_supported:['header']})
    if(url.origin===issuer && url.pathname==='/.well-known/oauth-authorization-server')return reply(metadata)
    if(url.origin===issuer && url.pathname==='/par'){
      const b=new URLSearchParams(await r.text());oauthState=b.get('state')!
      assert.equal(b.get('code_challenge_method'),'S256');assert.ok(b.get('code_challenge'));assert.ok(b.get('client_assertion'));assert.ok(r.headers.get('dpop'))
      return reply({request_uri:'urn:ietf:params:oauth:request_uri:fixture',expires_in:90},201)
    }
    if(url.origin===issuer && url.pathname==='/token'){
      exchanges++;assert.ok(r.headers.get('dpop'))
      return reply({access_token:'fixture-access-token',refresh_token:'fixture-refresh-token',token_type:'DPoP',expires_in:3600,scope:'atproto',sub:tokenSubject})
    }
    if(url.origin===issuer && url.pathname==='/revoke')return reply({})
    throw Error('Unexpected fixture endpoint '+url.origin+url.pathname)
  }
  const auth=await BrowserAuth.create(s,config,fetcher)
  return{s,auth,config,state:()=>oauthState,exchanges:()=>exchanges}
}
