import {test} from 'node:test'
import assert from 'node:assert/strict'
import {publicLinkPreview,previewURL} from '../src/link-preview.ts'
test('public link previews fetch only approved HTTPS pages and strip queries/credentials from their contract',async()=>{
 let calls=0
 const fetcher:typeof fetch=async(url,init)=>{calls++;assert.equal(url,'https://github.com/example/repo');assert.equal(init?.redirect,'manual');assert.deepEqual(init?.headers,{accept:'text/html'});assert.equal(init?.credentials,undefined);return new Response('<meta property="og:title" content="Shared &amp; reviewed"><meta name="description" content="A public project"><meta property="og:image" content="https://opengraph.githubassets.com/abc/example/repo">',{headers:{'content-type':'text/html'}})}
 const response=await publicLinkPreview('https://github.com/example/repo?token=never-forward#private',false,fetcher),body=await response.json()
 assert.equal(response.status,200);assert.equal(body.title,'Shared & reviewed');assert.equal(body.url,'https://github.com/example/repo');assert.equal(body.image,'/v1/link-preview/image?url=https%3A%2F%2Fgithub.com%2Fexample%2Frepo')
 for(const url of ['http://github.com/example','https://github.com.evil.example/x','https://user:pass@github.com/x','https://127.0.0.1/x','https://github.com:444/x','file:///etc/passwd'])assert.equal((await publicLinkPreview(url,false,fetcher)).status,404)
 assert.equal(calls,1);assert.equal(previewURL('https://westpapua.watch/story/?id=42&secret=x'),'https://westpapua.watch/story/?id=42')
})
test('preview redirects, private image hosts, HTML disguised as images and oversized covers fail closed',async()=>{
 assert.equal((await publicLinkPreview('https://github.com/x',false,async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}}))).status,404)
 const html=(image:string)=>new Response('<title>Project</title><meta property="og:image" content="'+image+'">',{headers:{'content-type':'text/html'}})
 let calls=0
 assert.equal((await publicLinkPreview('https://github.com/x',true,async()=>{calls++;return html('https://localhost/private')})).status,404);assert.equal(calls,1)
 for(const cover of [new Response('<html>bad</html>',{headers:{'content-type':'image/jpeg'}}),new Response(new Uint8Array(1048577),{headers:{'content-type':'image/jpeg'}}),new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}})]){
  let n=0
  assert.equal((await publicLinkPreview('https://github.com/x',true,async()=>++n===1?html('https://opengraph.githubassets.com/x'):cover)).status,404)
 }
 const bytes=new Uint8Array([255,216,255,1]);let n=0
 const valid=await publicLinkPreview('https://github.com/x',true,async()=>++n===1?html('https://opengraph.githubassets.com/x'):new Response(bytes,{headers:{'content-type':'image/jpeg'}}))
 assert.equal(valid.status,200);assert.deepEqual(new Uint8Array(await valid.arrayBuffer()),bytes)
})
