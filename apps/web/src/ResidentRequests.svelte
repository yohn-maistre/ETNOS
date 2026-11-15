<script lang="ts">
  import {untrack} from 'svelte'
  import {Bot, LoaderCircle, RefreshCw, ArrowUpRight} from '@lucide/svelte'
  import {request,type ResidentRequest} from './api'
  import {toast} from '@yusufceng1z/ding-svelte'
  let {postId,replyCount=0,onAnswered}:{postId:string;replyCount?:number;onAnswered:()=>Promise<void>}=$props()
  let rows=$state<ResidentRequest[]>([]),busy=$state(false),error=$state('')
  const reasons:Record<string,string>={abstained:'Tidak ada sumber yang cocok, dan balasan jujur belum bisa dikirim. Periksa mandat menulis di Studio.','gateway-unconfigured':'Gerbang model belum dikonfigurasi.','gateway-input':'Gerbang model menolak permintaan.','provider-quota':'Kuota model sudah habis.','provider-unavailable':'Penyedia model sedang tidak tersedia.','provider-transport':'Koneksi ke penyedia model terputus.','provider-output':'Model memberi jawaban yang tidak bisa dipakai.','runtime-budget':'Anggaran tugas sudah habis.','authority-changed':'Izin berubah saat tugas berjalan.','runtime-unavailable':'Runtime Aksara belum terhubung.','runtime-input':'Masukan tugas ditolak runtime.','runtime-protocol':'Runtime dan mesin tidak sepakat soal format.',other:'Tugas gagal. Lihat Aktivitas di Studio.'}
  const labels:Record<ResidentRequest['state'],string>={queued:'menunggu giliran',running:'sedang menyiapkan balasan',answered:'sudah membalas',cancelled:'tidak melanjutkan, permintaan dihentikan',unavailable:'belum bisa menjawab'}
  let refresh:()=>void=()=>{}
  // Only the person who just asked in this tab gets a toast; it follows the
  // question in place: preparing, then answered or unable to answer.
  const followed=new Map<string,string>()
  function asked(id:string){try{return sessionStorage.getItem('etnos.asked.'+id)==='1'}catch{return false}}
  function follow(next:ResidentRequest[]){
   for(const row of next){
    if(!asked(row.postId))continue
    const key='aksara-'+row.postId,last=followed.get(row.postId)
    if(last===row.state)continue
    followed.set(row.postId,row.state)
    if(row.state==='queued'||row.state==='running'){if(!last)toast.loading('Aksara sedang menyiapkan balasan',{id:key,description:'Kamu bisa membaca yang lain dulu.'})}
    else if(row.state==='answered'){toast.update(key,{type:'success',title:'Aksara sudah membalas',description:'',duration:6000,action:row.replyId?{label:'Lihat',onClick:()=>{document.getElementById('post-'+row.replyId)?.scrollIntoView({behavior:'smooth',block:'center'})}}:null});try{sessionStorage.removeItem('etnos.asked.'+row.postId)}catch{}}
    else if(last){toast.update(key,{type:'info',title:row.state==='cancelled'?'Permintaan dihentikan':'Aksara belum bisa menjawab',description:'',duration:6000});try{sessionStorage.removeItem('etnos.asked.'+row.postId)}catch{}}
   }
  }
  $effect(()=>{
    const id=postId;void replyCount;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,attempts=0,active=true
    rows=[];error=''
    async function load(manual=false){
      if(!active||untrack(()=>busy))return
      clearTimeout(timer);busy=true
      try{
        const next=await request<ResidentRequest[]>('/v1/resident/requests?post='+encodeURIComponent(id),undefined,controller.signal,true)
        if(!active)return
        const before=untrack(()=>rows),arrived=next.some(n=>n.state==='answered'&&n.replyId&&before.some(p=>p.postId===n.postId&&['queued','running'].includes(p.state)))
        rows=next;error=''
        follow(next)
        if(arrived||manual)await onAnswered()
        if(active&&next.some(n=>['queued','running'].includes(n.state))&&attempts++<24)timer=setTimeout(()=>{if(document.visibilityState==='visible')void load();else timer=setTimeout(()=>void load(),10000)},5000)
      }catch{if(active)error='Status balasan belum dapat diperiksa.'}
      finally{if(active)busy=false}
    }
    refresh=()=>{attempts=0;void load(true)}
    void load()
    return()=>{active=false;controller.abort();clearTimeout(timer);busy=false}
  })
</script>

{#if rows.length||error}<section class="resident-requests" aria-label="Balasan Aksara">
  {#each rows as row (row.postId)}<div class="resident-request-row" data-state={row.state}>
    <span class="resident-mark" aria-hidden="true">A</span>
    <span class="resident-line" role="status"><strong>Aksara</strong> {labels[row.state]}{#if row.state==='running'||row.state==='queued'}<span class="resident-dots" aria-hidden="true"><i></i><i></i><i></i></span>{/if}</span>
    {#if row.replyId}<a href={'#post-'+row.replyId}>Lihat balasan<ArrowUpRight size={13}/></a>{:else if row.postId!==postId}<a href={'/square/'+row.postId}>Lihat pertanyaan<ArrowUpRight size={13}/></a>{/if}
    <button type="button" aria-label="Periksa balasan Aksara" disabled={busy} onclick={()=>refresh()}><RefreshCw size={13} class={busy?'animate-spin':''}/></button>
    {#if row.reason}<small class="resident-reason">{reasons[row.reason]??row.reason} <a href="/studio">Buka Studio</a></small>{/if}
  </div>{/each}
  {#if error}<p role="status">{error}</p>{/if}
</section>{/if}
