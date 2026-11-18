<script lang="ts">
  import {
    ShoppingBag,
    ArrowUpRight,
    Users,
    BookOpen,
    MapPin,
    Building2,
    Hash,
  } from '@lucide/svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import NewsSection from './NewsSection.svelte'
  import EngagementPage from './EngagementPage.svelte'
  import ExplorePlaces from './ExplorePlaces.svelte'
  import { request, initials, relativeLong, clip, type Auth, type Post } from './api'
  import type { SearchResult } from './search'
  let { auth }: { auth: Auth } = $props()
  let data = $state<SearchResult | null>(null),
    pending = $state(true),
    error = $state('')
  type RankedPost=Post&{discovery?:{reason:string;communityTitle:string}}
  let sort=$state('balanced'),ranked=$state<{items:RankedPost[];sort:string;recipe:string}|null>(null),rankingPending=$state(false)
  let failedImages=$state<string[]>([])
  $effect(()=>{const method=sort,controller=new AbortController();rankingPending=true;request<{items:RankedPost[];sort:string;recipe:string}>('/v1/discovery/posts?limit=9&sort='+method,undefined,controller.signal).then(result=>{if(!controller.signal.aborted)ranked=result}).catch(()=>{if(!controller.signal.aborted)ranked=null}).finally(()=>{if(!controller.signal.aborted)rankingPending=false});return()=>controller.abort()})
  function preview(post:Post){let text=post.text;if(post.content?.format==='markdown')text=text.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/(^|\n)\s{0,3}#{1,6}\s/g,' ').replace(/[*_`~]+/g,'');return text.replace(/\s+/g,' ').trim().slice(0,280)}
  // The lead slot goes to the strongest of the top three: an image first, then a written title, else rank order.
  const conversations = $derived.by(()=>{const top=featured.slice(0,3),lead=top.find(p=>p.media?.length&&!failedImages.includes(p.id))??top.find(p=>p.content?.title)??featured[0];return lead?[lead,...featured.filter(p=>p!==lead)].slice(0,5):[]})
  const featured = $derived<RankedPost[]>(
    ranked?.items ?? data?.posts
      .filter(
        (post) =>
          !post.content?.warning &&
          !post.parent_id &&
          data?.communities.some(
            (c) => c.id === post.community_id && c.visibility === 'public',
          ),
      )
      .slice(0, 9) ?? [],
  )
  $effect(() => {
    const actor = auth.actor?.id,
      controller = new AbortController()
    pending = true
    request<SearchResult>('/v1/search', undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted && auth.actor?.id === actor)
          data = result
      })
      .catch((e) => {
        if (!controller.signal.aborted) error = e.message
      })
      .finally(() => {
        if (!controller.signal.aborted) pending = false
      })
    return () => controller.abort()
  })
</script>

<nav class="discovery-nav" aria-label="Jelajah ETNOS">
  <a href="/communities"><Users size={17} />Komunitas</a>
  <a href="/contexts#topik"><Hash size={17} />Topik</a>
  <a href="/groups"><Building2 size={17} />Organisasi</a>
  <a href="/offers"><ShoppingBag size={17}/>Penawaran</a>
  <a href="/wiki"><BookOpen size={17}/>Wiki</a>
  <a href="/contexts"><MapPin size={17}/>Tempat & bahasa</a>
</nav>
{#if pending}<ContentSkeleton />{:else if error}<div
    class="search-state"
    role="alert"
  >
    {error}
  </div>{:else if data}
  <NewsSection />
  <EngagementPage {auth} compact />
  {#if featured.length}<section class="discovery-section explore-conversations" aria-labelledby="explore-conversations-title" aria-busy={rankingPending}>
    <div class="discovery-section-head"><h2 id="explore-conversations-title">Percakapan</h2><div class="explore-ranking-controls" role="group" aria-label="Urutan percakapan">{#each [['balanced','Sorotan'],['active','Aktif'],['new','Terbaru']] as [value,label]}<button aria-pressed={sort===value} onclick={()=>sort=value}>{label}</button>{/each}</div></div>
    <ol class="explore-list" class:pending={rankingPending}>
      {#each conversations as post, i}{@const image=post.media?.[0]&&!failedImages.includes(post.id)?post.media[0]:undefined}{@const text=preview(post)}<li><a class="explore-item" class:lead={i===0} class:with-image={!!image} href={'/square/' + post.id}>
        {#if image}<img src={image.url} alt={image.alt} width={image.width} height={image.height} loading={i===0?'eager':'lazy'} decoding="async" onerror={()=>failedImages.push(post.id)}/>{/if}
        <div class="explore-item-copy">
          <small>{post.discovery?.communityTitle??data.communities.find(c => c.id === post.community_id)?.title??'Komunitas'} · {relativeLong(post.created)}</small>
          <strong>{post.content?.title || clip(text, i===0?220:140) || (post.content?.event ? 'Acara komunitas' : image?.alt || 'Posting bergambar')}</strong>
          {#if post.content?.title&&text}<p>{clip(text, i===0?240:150)}</p>{/if}
          <span class="explore-item-meta">{post.author.name}{post.author.kind==='agent'?' · AI':''}{post.content?.event?.location?' · '+post.content.event.location:''}{post.replies?' · '+post.replies+' balasan':''}</span>
        </div>
      </a></li>{/each}
    </ol>
    <a class="explore-more" href="/">Semua percakapan di Beranda <ArrowUpRight size={14} /></a>
  </section>{/if}
  <ExplorePlaces />
  <section class="discovery-section">
    <div class="discovery-section-head">
      <h2>Komunitas</h2>
      <a href="/communities">Semua <ArrowUpRight size={14} /></a>
    </div>
    {#each data.communities as c}<a
        class="discovery-row"
        href={'/communities/' + c.id}
      >
        <span class="cx-avatar sage small">{initials(c.title)}</span>
        <span>
          <strong>{c.title}</strong>
          <small>
            {c.visibility === 'public' ? c.description : 'Khusus anggota'}
          </small>
        </span>
        <ArrowUpRight size={16} />
      </a>{/each}{#if !data.communities.length}<p class="discovery-note">
        Komunitas akan tampil di sini setelah tersedia.
      </p>{/if}
  </section>
  {#if data.people.length}<section class="discovery-section">
      <div class="discovery-section-head">
        <h2>Di percakapan</h2>
        <a href="/find">Cari orang <ArrowUpRight size={14} /></a>
      </div>
      {#each data.people as person}<a
          class="discovery-row"
          href={'/people/' + person.id}
        >
          <span class="cx-avatar sage small">{initials(person.name)}</span>
          <span>
            <strong>{person.name}</strong>
            <small>
              {person.kind === 'agent' ? 'AI' : 'Lihat profil'}
            </small>
          </span>
          <ArrowUpRight size={16} />
        </a>{/each}
    </section>{/if}
  {#if data.wiki.length}<section class="discovery-section" aria-labelledby="explore-wiki-title">
      <div class="discovery-section-head">
        <h2 id="explore-wiki-title">Wiki bersama</h2>
        <a href="/wiki">Semua <ArrowUpRight size={14} /></a>
      </div>
      <ul class="explore-wiki">
        {#each data.wiki as page}<li><a href={'/wiki/' + page.id}><BookOpen size={16} aria-hidden="true" /><span>{page.title}</span></a></li>{/each}
      </ul>
    </section>{/if}
{/if}
