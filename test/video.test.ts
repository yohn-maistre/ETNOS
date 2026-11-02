import assert from 'node:assert/strict'
import {test} from 'node:test'
import {publicVideo} from '../src/video.ts'
test('video cards fetch only fixed-provider oEmbed metadata, never a player or caller URL',async()=>{
 const calls:string[]=[]
 const fetcher:typeof fetch=async(url,options)=>{calls.push(String(url));assert.equal(options?.redirect,'error');assert.equal(options?.credentials,'omit');return Response.json({title:'A title',thumbnail_url:'https://evil.example/tracker',html:'<iframe src=evil></iframe>'})}
 const response=await publicVideo('youtube','ZWp5904RkJY',false,fetcher),data=await response.json();assert.equal(data.title,'A title');assert.equal(data.image,'/v1/video-preview/youtube/ZWp5904RkJY/image');assert.equal(calls.length,1);assert.ok(calls[0].startsWith('https://www.youtube.com/oembed?'));assert.equal(JSON.stringify(data).includes('<iframe'),false)
 const vimeo=await publicVideo('vimeo','12345678',false,fetcher);assert.equal((await vimeo.json()).image,null)
 assert.equal((await publicVideo('youtube','../admin',false,fetcher)).status,404);assert.equal(calls.length,2)
})
test('video covers reject spoofed bytes, non-images and oversized streams',async()=>{
 for(const image of [new Response('<html/>',{headers:{'content-type':'image/jpeg'}}),new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}}),new Response(new Uint8Array(1048577),{headers:{'content-type':'image/jpeg'}})]){
  const response=await publicVideo('youtube','ZWp5904RkJY',true,async()=>image);assert.equal(response.status,404)
 }
})
