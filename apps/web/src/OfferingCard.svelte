<script lang="ts">
 import {ShoppingBag,MapPin,MessageCircle,Settings2,QrCode,Printer,X} from '@lucide/svelte'
 import {Portal} from 'bits-ui'
 import {request,type Post,type Community} from './api'
 import {qrSvg} from './qr'
 import {Button} from '$lib/components/ui/button/index.js'
 import {Input} from '$lib/components/ui/input/index.js'
 let {post,community,loggedIn=false,onUpdated,onError}:{post:Post;community?:Community;loggedIn?:boolean;onUpdated:(post:Post)=>void;onError:(message:string)=>void}=$props()
 let editing=$state(false),busy=$state(false),price=$state(''),unit=$state(''),status=$state('open'),expiry=$state(''),error=$state(''),showTag=$state(false)
 const o=$derived(post.offering)
 const labels:Record<string,string>={open:'Terbuka',paused:'Dijeda',fulfilled:'Terpenuhi',expired:'Berakhir',withdrawn:'Ditarik'}
 const tagUrl=$derived((typeof location!=='undefined'?location.origin:'https://etnos.space')+'/square/'+post.id)
 const tagQr=$derived(showTag?qrSvg(tagUrl,148):'')
 const priceText=$derived(!o?'':o.price===null?(o.kind==='request'?'Anggaran terbuka':'Harga dibicarakan'):o.price===0?'Gratis':new Intl.NumberFormat('id-ID',{style:'currency',currency:o.currency,maximumFractionDigits:0}).format(o.price))
 function open(){if(!o)return;price=o.price===null?'':String(o.price);unit=o.unit;status=o.status==='expired'?'open':o.status;expiry=o.expiresAt?new Date(o.expiresAt).toLocaleDateString('en-CA'):'';editing=true;error=''}
 async function save(){if(!o||busy)return;busy=true;error='';try{const result=await request<Post>('/v1/offerings/'+post.id+'/edit',{revision:o.revision,price:String(price??'').trim()?Number(price):null,unit,status,expiresAt:expiry?new Date(expiry+'T23:59:00').getTime():null,requestKey:crypto.randomUUID()});onUpdated(result);editing=false}catch(e){error=e instanceof Error?e.message:'Penawaran belum tersimpan.';onError(error)}finally{busy=false}}
</script>
{#if o}<aside class="offering-card" aria-label={o.kind==='offer'?'Penawaran':'Kebutuhan'}>
 <div class="offering-caption"><span><ShoppingBag size={14}/>{o.kind==='offer'?'Menawarkan':'Mencari'}</span><span class:offering-closed={o.status!=='open'}>{labels[o.status]}</span></div>
 <div class="offering-terms"><strong>{priceText}</strong>{#if o.unit}<span>· {o.unit}</span>{/if}</div>
 {#if o.place}<a class="offering-place" href={'/wiki/'+o.place.id}><MapPin size={13}/>{o.place.title}</a>{/if}
 {#if o.expiresAt}<small>Berlaku hingga {new Date(o.expiresAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</small>{/if}
 <div class="offering-actions">{#if o.canContact}<Button variant="outline" href={community?.visibility==='public'?'/messages?to='+post.author_id:'/square/'+post.id+'#reply'}><MessageCircle size={15}/>{community?.visibility==='public'?'Hubungi':'Diskusikan'}</Button>{:else if !loggedIn&&o.status==='open'}<Button variant="outline" href={'/login?returnTo='+encodeURIComponent(community?.visibility==='public'?'/messages?to='+post.author_id:'/square/'+post.id)}>Masuk untuk menghubungi</Button>{/if}{#if o.kind==='offer'&&community?.visibility==='public'}<Button variant="ghost" onclick={()=>showTag=true}><QrCode size={15}/>Kartu Asal</Button>{/if}{#if o.canManage}<Button variant="ghost" onclick={open}><Settings2 size={15}/>Kelola penawaran</Button>{/if}</div>
 {#if editing}<form class="offering-editor" onsubmit={e=>{e.preventDefault();void save()}}>
  <label for={'offering-price-'+post.id}>{o.kind==='request'?'Anggaran (Rp)':'Harga (Rp)'}</label><Input id={'offering-price-'+post.id} type="number" min="0" step="1" bind:value={price} placeholder="Boleh dikosongkan" disabled={busy}/>
  <label for={'offering-unit-'+post.id}>Satuan / keterangan harga</label><Input id={'offering-unit-'+post.id} bind:value={unit} maxlength={60} placeholder="Misalnya per ikat atau per jam" disabled={busy}/>
  <label for={'offering-status-'+post.id}>Status</label><select id={'offering-status-'+post.id} bind:value={status} disabled={busy}><option value="open">Terbuka</option><option value="paused">Dijeda</option><option value="fulfilled">Terpenuhi</option></select>
  <label for={'offering-expiry-'+post.id}>Berlaku hingga</label><Input id={'offering-expiry-'+post.id} type="date" bind:value={expiry} disabled={busy}/>
  {#if error}<p role="alert">{error}</p>{/if}<div class="offering-actions"><Button type="submit" disabled={busy}>Simpan penawaran</Button><Button variant="ghost" disabled={busy} onclick={()=>editing=false}>Batal</Button></div>
 </form>{/if}
</aside>{/if}
{#if showTag&&o}
<Portal>
<div class="kartu-asal-backdrop" role="dialog" aria-modal="true" aria-labelledby={'ka-title-'+post.id}>
 <div class="ka-bar">
  <button type="button" onclick={()=>showTag=false}><X size={16}/>Tutup</button>
  <button type="button" class="ka-print" onclick={()=>print()}><Printer size={16}/>Cetak Kartu Asal</button>
 </div>
 <article class="ka-sheet">
  <div class="ka-card">
   <div class="ka-meta">
    <small class="ka-kicker">KARTU ASAL · ETNOS</small>
    <h2 id={'ka-title-'+post.id}>{post.content?.title || post.text.slice(0, 72)}</h2>
    <p class="ka-maker">Pembuat: <strong>{post.author.name}</strong>{#if community} · {community.title}{/if}</p>
    {#if o.place}<p class="ka-place">Asal: {o.place.title}</p>{/if}
    <p class="ka-price">{priceText}{#if o.unit} · {o.unit}{/if}</p>
    <p class="ka-hint">Pindai kode QR untuk membaca cerita pembuat dan menghubungi langsung di ETNOS.</p>
    <small class="ka-url">{tagUrl}</small>
   </div>
   <div class="ka-qr">{@html tagQr}</div>
  </div>
 </article>
</div>
</Portal>
{/if}
<style>
 .kartu-asal-backdrop{position:fixed;inset:0;z-index:75;overflow-y:auto;background:var(--page-ground,var(--background));color:var(--foreground)}
 .ka-bar{position:sticky;top:0;display:flex;justify-content:space-between;gap:8px;padding:10px 16px;background:color-mix(in oklab,var(--background) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
 .ka-bar button{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--foreground);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
 .ka-bar .ka-print{border-color:transparent;background:var(--foreground);color:var(--background)}
 .ka-sheet{max-width:560px;margin:28px auto;padding:24px}
 .ka-card{display:flex;gap:18px;align-items:center;justify-content:space-between;padding:22px 24px;background:#fff;color:#141414;border:1.5px solid #141414;border-radius:12px}
 .ka-meta{display:flex;flex-direction:column;gap:4px;min-width:0}
 .ka-kicker{font-size:10px;font-weight:800;letter-spacing:.12em;color:#555}
 .ka-meta h2{margin:0;font-size:19px;line-height:1.2;font-weight:800}
 .ka-maker,.ka-place,.ka-price,.ka-hint{margin:2px 0 0;font-size:13px;line-height:1.4}
 .ka-price{font-weight:700}
 .ka-hint{color:#444;font-size:11.5px;margin-top:6px}
 .ka-url{font-size:10px;color:#666;word-break:break-all}
 .ka-qr{flex:none;border:1px solid #e5e5e5;border-radius:6px;padding:4px;background:#fff}
 @media (max-width:520px){.ka-card{flex-direction:column;text-align:center}}
 @media print{
  :global(body *){visibility:hidden}
  .kartu-asal-backdrop,.kartu-asal-backdrop :global(*){visibility:visible}
  .kartu-asal-backdrop{position:absolute;inset:0;background:#fff}
  .ka-bar{display:none}
  .ka-sheet{margin:0;padding:8mm;max-width:none}
 }
</style>
