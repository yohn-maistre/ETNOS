<script lang="ts">
  import {
    BookOpen,
    Plus,
    ArrowUpRight,
    GitPullRequest,
    History,
    FileText,
    Search,
    MapPin,
    ChevronDown,
    ArrowRight,
    Clock3,
    Shuffle,
    Type,
    Newspaper,
  } from '@lucide/svelte'
  import { markdown } from './markdown'
  import { wikiDiff, languageName } from './wiki-diff'
  import {
    request,
    relativeDate,
    relativeLong,
    clip,
    type WikiPage,
    type Proposal,
    type Community,
    type Membership,
    type Auth,
  } from './api'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import WikiFront from './WikiFront.svelte'
  import WikiDiscussion from './WikiDiscussion.svelte'
  import WikiContents from './WikiContents.svelte'
  import WikiPlaces from './WikiPlaces.svelte'
  import PapuaMap, { type MapRegion } from './PapuaMap.svelte'
  import type { Atlas } from './RegionArt.svelte'
  import { loadMap, highlandRegions, type MapData } from './observatory'
  import { siteBranding } from './site-branding'
  import { placeScope, setPlaceScope } from './place-scope.svelte'
  import { REGION_ORDER, loadAtlas, loadAtlasLangs, loadContexts, regionTitle, regionsOf } from './explore-data'
  import WikiVoices from './WikiVoices.svelte'
  import WikiSourceNotes from './WikiSourceNotes.svelte'
  import WikiTrail from './WikiTrail.svelte'
  import WikiPeriod from './WikiPeriod.svelte'
  import { voices as pageVoices } from './wiki-sources'
  import LandscapePrint from './LandscapePrint.svelte'
  import { communityArtwork } from './site-branding'
  let {
    page,
    pages,
    proposals,
    history,
    communities,
    memberships,
    auth,
    onCreate,
    onPropose,
    onDecide,
    onReview,
    onShare,
    busy,
  }: {
    page: WikiPage | null
    pages: WikiPage[]
    proposals: Proposal[]
    history: {
      id: string
      created: number
      perspective: string
      language: string
      author?: { id: string; name: string; kind: string }
      reviewer?: { id: string; name: string; kind: string } | null
      review?: string
    }[]
    communities: Community[]
    memberships: Membership[]
    auth: Auth
    onCreate: () => void
    onPropose: () => void
    onDecide: (p: Proposal, accept: boolean) => void
    onReview: (revisionId: string, accept: boolean) => void
    onShare: (url: string) => void
    busy: boolean
  } = $props()
  let query = $state(''),
    section = $state('read'),
    context = $state(placeScope.slug),
    contexts = $state<
      { id: string; slug: string; title: string; kind: string; facet?: string; parents?: string[] }[]
    >([]),
    contextPages = $state<string[] | null>(null)
  type Growing={id:string;community_id:string;title:string;excerpt:string;updated:number;citationCount:number;author:{id:string;name:string;kind:string};evidenceStatus:string}
  let growing=$state<Growing[]>([]),growingError=$state('')
  /** Drops a model's greeting, self-introduction and "based on the evidence, here is…:" preface at the start of an excerpt. */
  const opening=(text:string)=>text.replace(/^\s*(?:(?:halo|hai)\b[^.!?]*[.!?]\s*)?(?:saya aksara\b[^.!?]*[.!?]\s*)?(?:berdasarkan (?:bukti|sumber)\b[^:]{0,160}:\s*)?/i,'')
  const growingMatches=$derived(growing.filter(p=>p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())&&(!communityFilter||p.community_id===communityFilter)&&!context))
  $effect(()=>{const controller=new AbortController();request<Growing[]>('/v1/wiki/growing',undefined,controller.signal).then(rows=>{if(!controller.signal.aborted)growing=rows}).catch(()=>{if(!controller.signal.aborted)growingError='Draf belum dapat dimuat.'});return()=>controller.abort()})
  type Preview={id:string;community_id:string;title:string;revision_id:string;excerpt:string;updated:number;language:string;citationCount:number;sectionCount:number;newsCitations?:number;authorKind?:string;reviewer?:{name:string;kind:string}|null;review?:string}
  type Gaps={contexts:{id:string;slug:string;title:string;kind:string}[];uncited:{id:string;title:string;community_id:string}[]}
  let gaps=$state<Gaps|null>(null)
  $effect(()=>{const controller=new AbortController();request<Gaps>('/v1/wiki/gaps',undefined,controller.signal,true).then(r=>{if(!controller.signal.aborted)gaps=r}).catch(()=>{});return()=>controller.abort()})
  const kindName:Record<string,string>={place:'Tempat',region:'Wilayah',topic:'Topik',language:'Bahasa'}
  let discoveries=$state<Preview[]>([]),discovering=$state(true),discoveryError=$state(''),communityFilter=$state(''),lastReadId=$state(''),readingSize=$state('normal')
  const accepted=$derived(discoveries.filter(p=>p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())&&(!contextPages||contextPages.includes(p.id))&&(!communityFilter||communityFilter===p.community_id)))
  const fromNews=$derived(discoveries.filter(p=>(p.newsCitations??0)>0).slice(0,4))
  // Five pages to read, rotated by day so the front changes without tracking anyone.
  const featuredList=$derived.by(()=>{if(!accepted.length)return [];const day=Math.floor(Date.now()/86400000),start=day%accepted.length;return [...accepted.slice(start),...accepted.slice(0,start)].slice(0,5)})
  let slide=$state(0),track=$state<HTMLDivElement>()
  function goTo(i:number){slide=i;track?.children[i]?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest',inline:'start'})}
  function onTrackScroll(){if(!track)return;const w=track.clientWidth;if(w)slide=Math.round(track.scrollLeft/w)}
  const featured=$derived(featuredList[0]),continued=$derived(discoveries.find(p=>p.id===lastReadId)),recent=$derived(accepted.filter(p=>!featuredList.some(f=>f.id===p.id)).slice(0,6)),groups=$derived(communities.map(c=>({...c,count:discoveries.filter(p=>p.community_id===c.id).length})).filter(c=>c.count))
  function surprise(){if(accepted.length)location.assign('/wiki/'+accepted[Math.floor(Math.random()*accepted.length)].id)}
  function resize(size:string){readingSize=size;try{localStorage.setItem('strata.ui.wiki-text',size)}catch{/* Optional device preference. */}}
  async function discover(signal:AbortSignal|undefined=undefined){discovering=true;discoveryError='';try{const rows=await request<Preview[]>('/v1/wiki/discover',undefined,signal);if(!signal?.aborted)discoveries=rows}catch{if(!signal?.aborted)discoveryError='Halaman belum dapat dimuat.'}finally{if(!signal?.aborted)discovering=false}}
  $effect(()=>{const controller=new AbortController();void discover(controller.signal);try{lastReadId=localStorage.getItem('strata.ui.wiki-last')??'';readingSize=localStorage.getItem('strata.ui.wiki-text')==='large'?'large':'normal'}catch{};return()=>controller.abort()})
  $effect(()=>{if(page?.revision){try{localStorage.setItem('strata.ui.wiki-last',page.id)}catch{}}})
  // The map stays on the wiki home whatever place is chosen; it opens on that place's customary region.
  let mapRegion = $state('')
  $effect(() => {
    const slug = context
    mapRegion = ''
    if (!slug) return
    let live = true
    void Promise.all([loadContexts(), loadAtlasLangs()]).then(([all, langs]) => { if (live) mapRegion = regionsOf(slug, all, langs)[0] ?? '' }).catch(() => {})
    return () => { live = false }
  })
  // The region a page belongs to, from the public map data, chooses its engraved cover.
  let mapData = $state<MapData | null>(null)
  $effect(() => { if (!mapData) void loadMap().then((d) => (mapData = d)) })
  // The wiki follows the place chosen in the header switcher, and the map at the top of the wiki home sets it:
  // pressing a region narrows the wiki (and the rest of the site) to it; pressing it again shows all of Papua.
  $effect(() => { context = placeScope.slug })
  let atlas = $state<Atlas | null>(null)
  $effect(() => { if (!page && !atlas) void loadAtlas().then((a) => (atlas = a)) })
  const regionPages = (slug: string) => mapData?.nodes.filter((n) => n.k === 'page' && n.reg === slug).length ?? 0
  const mapRegions = $derived<MapRegion[]>(
    REGION_ORDER.map((slug) => {
      const c = contexts.find((x) => x.slug === slug)
      return { slug, title: c ? regionTitle(c) : slug, href: '/contexts/' + slug, count: mapData ? regionPages(slug) : undefined }
    }),
  )
  const pickedRegion = $derived(contexts.find((c) => c.slug === context && c.facet === 'customary-region'))
  function pickRegion(slug: string) {
    const c = contexts.find((x) => x.slug === slug)
    if (!c || context === slug) setPlaceScope({ slug: '', title: 'Tanah Papua' })
    else setPlaceScope({ slug: c.slug, title: regionTitle(c) })
  }
  const pageRegion = $derived.by(() => {
    if (!page || !mapData) return null
    const node = mapData.nodes.find((n) => n.href === '/wiki/' + page.id)
    if (!node) return null
    const region = mapData.nodes.find((n) => n.k === 'page' && n.kind === 'region' && n.reg === node.reg)
    return { reg: node.reg, title: region?.t.replace(/^Wilayah adat /, '') ?? '', href: region && region.href !== node.href ? region.href : undefined }
  })
  const pageArt = $derived(pageRegion ? siteBranding.welcomeArtworks.find((a) => a.id === (highlandRegions.has(pageRegion.reg) ? 'tigi' : 'raja-ampat')) ?? null : null)
  const headings = $derived.by(() => {
    if (!page?.revision) return []
    const template = document.createElement('template')
    template.innerHTML = markdown(page.revision.text, [], 'wiki-' + page.id)
    return Array.from(template.content.querySelectorAll('h1,h2,h3,h4')).map(
      (h) => ({ id: h.id, text: h.textContent ?? '' }),
    )
  })
  const member = $derived(
      !!page && memberships.some((m) => m.community_id === page.community_id),
    ),
    steward = $derived(
      !!page &&
        memberships.some(
          (m) => m.community_id === page.community_id && m.role !== 'member',
        ),
    )
  const filtered = $derived(
    pages.filter(
      (p) =>
        p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
        (!contextPages || contextPages.includes(p.id)),
    ),
  )
  const drafts=$derived(filtered.filter(p=>!p.revision_id&&(!communityFilter||communityFilter===p.community_id)))
  $effect(() => {
    const actor = auth.actor?.id,
      abort = new AbortController()
    request<typeof contexts>('/v1/contexts', undefined, abort.signal)
      .then((rows) => {
        if (!abort.signal.aborted && actor === auth.actor?.id) contexts = rows
      })
      .catch(() => {})
    return () => abort.abort()
  })
  $effect(() => {
    const id = context,
      abort = new AbortController()
    contextPages = null
    if (id)
      request<{ pages: { id: string }[] }>(
        '/v1/contexts/' + id,
        undefined,
        abort.signal,
      )
        .then((result) => {
          if (!abort.signal.aborted)
            contextPages = result.pages.map((p) => p.id)
        })
        .catch(() => {
          if (!abort.signal.aborted) contextPages = []
        })
    return () => abort.abort()
  })
  $effect(() => {
    void page?.id
    section = 'read'
  })
</script>

{#if page}
  <article class="wiki-reader" class:wiki-large-text={readingSize==='large'}>
    {#if pageArt}<div class="wiki-page-cover" aria-hidden="true"><LandscapePrint artwork={pageArt} decorative /></div>{/if}
    <header class="wiki-page-header">
      <h1>{page.title}</h1>
      {#if pageRegion?.title && !page.title.toLowerCase().includes(pageRegion.title.toLowerCase())}<p class="wiki-page-region">Wilayah adat {#if pageRegion.href}<a href={pageRegion.href}>{pageRegion.title}</a>{:else}{pageRegion.title}{/if}</p>{/if}
      {#if page.revision}<WikiVoices
          voices={pageVoices(page.revision.citations, history, page.revision.author, proposals)}
          invite={member ? { onclick: onPropose } : { href: auth.actor ? '/communities/' + page.community_id : '/login' }}
          current={page.revision.review}
        />{/if}
      <p>
        {page.revision
          ? `${languageName(page.revision.language)} · ${page.revision.perspective}`
          : 'Draf · Menunggu tinjauan manusia'}
      </p>
      {#if page.revision}<div class="wiki-provenance">
          <span>
            Ditulis oleh <strong>
              {page.revision.author?.name ?? 'Kontributor'}
            </strong>
            {#if page.revision.author?.kind === 'agent'}
              · AI{/if}
          </span>
          {#if page.revision.review === 'unreviewed'}<span class="wiki-unreviewed">
              Belum ditinjau. Terbit {relativeLong(page.revision.created)}.
            </span>{:else}<span>
            Ditinjau oleh <strong>
              {page.revision.reviewer?.name ?? 'Pengelola'}
            </strong>
            · {relativeDate(page.revision.created)}
          </span>{/if}
        </div>
        {#if page.revision.review === 'unreviewed' && steward}<div class="wiki-review-live">
            <Button variant="outline" disabled={busy} onclick={() => onReview(page.revision!.id, true)}>Tandai sudah ditinjau</Button>
            <Button variant="ghost" disabled={busy} onclick={() => onReview(page.revision!.id, false)}>Kembalikan</Button>
          </div>{/if}{/if}
      <div class="wiki-actions">

        <details class="wiki-reading-options"><summary><Type size={15}/>Teks</summary><div class="wiki-history-popover"><p>Ukuran tulisan</p><button aria-pressed={readingSize==='normal'} onclick={()=>resize('normal')}>Nyaman</button><button aria-pressed={readingSize==='large'} onclick={()=>resize('large')}>Lebih besar</button></div></details>
        {#if member}<Button variant="outline" onclick={onPropose}>
            <GitPullRequest size={15} />Usulkan perubahan
          </Button>{/if}
        <details>
          <summary><History size={15} />Riwayat</summary>
          <div class="wiki-history-popover">
            {#each history as rev}<p>
                <strong>{rev.perspective}</strong>
                <small>
                  {languageName(rev.language)} · {relativeDate(rev.created)}
                </small>
                {#if rev.author || rev.reviewer}<small>
                    {rev.author?.name ?? 'Kontributor'}{rev.author?.kind ===
                    'agent'
                      ? ' · AI'
                      : ''} · {rev.review === 'unreviewed' ? 'belum ditinjau' : rev.review === 'reverted' ? 'dikembalikan' : 'ditinjau ' + (rev.reviewer?.name ?? 'pengelola')}
                  </small>{/if}
              </p>{/each}{#if !history.length}<p>
                Belum ada revisi diterima.
              </p>{/if}
          </div>
        </details>
      </div>
    </header>
    {#if member && proposals.length}<nav
        class="wiki-section-tabs"
        aria-label="Tampilan halaman"
      >
        <button
          aria-current={section === 'read' ? 'page' : undefined}
          onclick={() => (section = 'read')}
        >
          Halaman
        </button>
        <button
          aria-current={section === 'review' ? 'page' : undefined}
          onclick={() => (section = 'review')}
        >
          Usulan {proposals.filter((p) => p.state === 'pending').length}
        </button>
      </nav>{/if}
    {#if section === 'read'}
      {#if page.revision}<WikiContents text={page.revision.text} pageId={page.id} inline />
        <div class="wiki-body wiki-serif post-markdown">
          {@html markdown(page.revision.text, [], 'wiki-' + page.id)}
        </div>
        <WikiSourceNotes citations={page.revision.citations} />
        <WikiPeriod pageId={page.id} time={page.time ?? null} {steward} />
        <WikiTrail pageId={page.id} canPropose={member} {onPropose} />
        <WikiDiscussion pageId={page.id} citations={page.revision.citations} {auth} {communities} {memberships} {onShare} />
      {:else}<div class="wiki-draft-state">
          <FileText size={26} />
          <h2>Tulisan sedang disiapkan</h2>
          <p>Draf dan sumber ditinjau sebelum halaman diterbitkan.</p>
          {#if proposals.length}<Button
              variant="outline"
              onclick={() => (section = 'review')}
            >
              Lihat usulan
            </Button>{/if}
        </div>{/if}
      {#if pages.some((p) => p.id !== page.id && p.community_id === page.community_id)}<section
          class="wiki-related"
        >
          <h2>Halaman lain di komunitas ini</h2>
          {#each pages
            .filter((p) => p.id !== page.id && p.community_id === page.community_id && p.revision_id)
            .slice(0, 5) as p}<a href={'/wiki/' + p.id}>
              <BookOpen size={16} />{p.title}<ArrowUpRight size={15} />
            </a>{/each}
        </section>{/if}
    {:else}<section class="wiki-reviews">
        {#each proposals as proposal}{@const comparison = wikiDiff(
            page.revision?.text ?? '',
            proposal.text,
          )}
          <article class="wiki-review-card">
            <div class="wiki-review-heading">
              <strong>
                {proposal.state === 'pending'
                  ? 'Menunggu tinjauan'
                  : proposal.state === 'accepted'
                    ? 'Diterima'
                    : 'Ditolak'}
              </strong>
              <small>{relativeDate(proposal.created)}</small>
            </div>
            <p>
              {proposal.author?.name ?? 'Kontributor'}{proposal.author?.kind ===
              'agent'
                ? ' · AI'
                : ''} · {languageName(proposal.language)}
            </p>
            <p class="cx-hint">Atribusi tulisan: {proposal.perspective}</p>
            <details open={proposal.state === 'pending'}>
              <summary>Bandingkan tulisan</summary>
              <div class="wiki-change-legend">
                <span>Ditambahkan</span>
                <span>Dihapus</span>
              </div>
              {#if comparison.abbreviated}<p class="cx-hint">
                  Perubahan besar ditampilkan sebagai dua blok lengkap.
                </p>{/if}
              <div class="wiki-change-list" aria-label="Perubahan usulan">
                {#each comparison.changes as change}<div
                    class={'wiki-change ' + change.kind}
                  >
                    <span aria-hidden="true">
                      {change.kind === 'added'
                        ? '+'
                        : change.kind === 'removed'
                          ? '−'
                          : ' '}
                    </span>
                    <span class="sr-only">
                      {change.kind === 'added'
                        ? 'Ditambahkan: '
                        : change.kind === 'removed'
                          ? 'Dihapus: '
                          : ''}
                    </span>
                    {change.text || ' '}
                  </div>{/each}
              </div>
              <details class="wiki-full-versions">
                <summary>Baca kedua versi lengkap</summary>
                <div class="wiki-compare">
                  {#if page.revision}<div>
                      <h3>Revisi saat ini</h3>
                      <div class="post-markdown">
                        {@html markdown(page.revision.text)}
                      </div>
                    </div>{/if}
                  <div>
                    <h3>Usulan</h3>
                    <div class="post-markdown">
                      {@html markdown(proposal.text)}
                    </div>
                  </div>
                </div>
              </details>
            </details>
            {#each proposal.citations as url}<a
                class="strata-source"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {url}
              </a>{/each}
            {#if proposal.basis}<details class="wiki-basis">
                <summary>Dasar · {proposal.basis.quotes.length} kalimat sumber</summary>
                {#if !proposal.basis.checks.ok}<p class="cx-hint">
                    {#if proposal.basis.checks.unknown.length}Tidak ditemukan di kalimat sumber: {proposal.basis.checks.unknown.join(', ')}.{/if}
                    {#if proposal.basis.checks.uncited}{' '}{proposal.basis.checks.uncited} paragraf tanpa rujukan.{/if}
                    {#if proposal.basis.checks.unsupported.length}{' '}Rujukan tanpa kalimat sumber: {proposal.basis.checks.unsupported.join(', ')}.{/if}
                  </p>{:else}<p class="cx-hint">Semua nama dan angka ada di kalimat sumber.</p>{/if}
                <ul>
                  {#each proposal.basis.quotes as quote}<li>
                      <span>[{quote.source}]</span>{quote.text}
                    </li>{/each}
                </ul>
              </details>{/if}
            {#if proposal.state === 'pending' && steward}<div
                class="wiki-review-actions"
              >
                <Button
                  disabled={busy}
                  onclick={() => onDecide(proposal, true)}
                >
                  Terima revisi
                </Button><Button
                  variant="outline"
                  disabled={busy}
                  onclick={() => onDecide(proposal, false)}
                >
                  Tolak
                </Button>
              </div>{/if}
          </article>{/each}
      </section>{/if}
  </article>
{:else}
  <section class="knowledge-atlas wiki-discovery">
    <header class="wiki-discovery-header">
      <h1>Pengetahuan bersama</h1>
      <p>Halaman tentang tempat, bahasa dan sejarah Papua yang ditulis dan diperiksa bersama.</p>
      <div class="wiki-discovery-actions">{#if memberships.length}<a class="commons-quiet-link" href="/wiki/notes/new">Tambah catatan <Plus size={14}/></a>{/if}{#if memberships.some(m=>m.role!=='member')}<Button variant="outline" onclick={onCreate}><Plus size={15}/>Tulis halaman</Button>{/if}</div>
    </header>
    <div class="wiki-discovery-controls"><label class="atlas-search"><Search size={18}/><Input bind:value={query} aria-label="Cari pengetahuan" placeholder="Cari dalam Wiki…"/></label>
      {#if atlas && contexts.length}<div class="wiki-region-map">
          <PapuaMap {atlas} regions={mapRegions} focus={mapRegion ? [mapRegion] : []} unit="halaman" onpick={pickRegion} />
          <p class="wiki-region-note">{#if context}{#if pickedRegion}Menampilkan halaman tentang {regionTitle(pickedRegion)}. <a href={'/contexts/' + pickedRegion.slug}>Buka halaman wilayah</a>{' · '}{:else}Menampilkan halaman tentang {placeScope.title}. {/if}<button type="button" onclick={() => setPlaceScope({ slug: '', title: 'Tanah Papua' })}>Tampilkan semua</button>{:else}Pilih wilayah untuk melihat halamannya. Makin gelap wilayahnya, makin banyak halaman wiki tentangnya.{/if}</p>
        </div>{/if}
    </div>
    {#if discovering}<div class="wiki-discovery-loading" role="status">Menyiapkan bacaan…</div>{:else if discoveryError}<div class="wiki-draft-state"><p>{discoveryError}</p><Button variant="outline" onclick={()=>discover()}>Coba lagi</Button></div>{:else}
      {#if continued&&!query&&!context&&!communityFilter}<a class="wiki-continue" href={'/wiki/'+continued.id}><Clock3 size={17}/><div><small>Lanjutkan membaca · di perangkat ini</small><strong>{continued.title}</strong></div><ArrowRight size={18}/></a>{/if}
      {#if featured}{@const art=communityArtwork(featured.community_id)}<div class="wiki-lead"><section class="wiki-featured wiki-front" aria-label="Untuk dibaca">
        <div class="wiki-front-cover">{#if art}<LandscapePrint artwork={art} decorative/>{/if}
          <div class="wiki-front-track" bind:this={track} onscroll={onTrackScroll}>
            {#each featuredList as item}<a class="wiki-front-card" href={'/wiki/'+item.id}><h2>{item.title}</h2>{#if item.excerpt}<p>{clip(item.excerpt,180)}</p>{/if}<span class="wiki-featured-meta">{languageName(item.language)} · {item.citationCount?item.citationCount+' sumber':'Sumber belum ditautkan'}{item.reviewer?' · ditinjau '+item.reviewer.name:item.review==='unreviewed'?' · belum ditinjau':''}</span></a>{/each}
          </div>
        </div>
        {#if featuredList.length>1}<div class="wiki-front-dots" role="tablist" aria-label="Pilih bacaan">{#each featuredList as item,i}<button role="tab" aria-selected={slide===i} aria-label={item.title} onclick={()=>goTo(i)}></button>{/each}</div>{/if}
        {#if accepted.length}<div class="wiki-front-tools">{#if accepted.length>1}<button onclick={surprise}><Shuffle size={15}/>Halaman acak</button>{/if}<a class="commons-quiet-link" href="/lini-masa">Lini masa</a></div>{/if}
      </section>
      {#if recent.length}<section class="wiki-recent wiki-module"><div class="wiki-module-heading"><h2>Baru diperbarui</h2></div>{#each recent as p}<a class="wiki-rank-row" href={'/wiki/'+p.id}><FileText size={18}/><div><h3>{p.title}</h3><small>{p.reviewer?'Ditinjau '+p.reviewer.name+' · ':p.review==='unreviewed'?(p.authorKind==='agent'?'AI · belum ditinjau · ':'Belum ditinjau · '):''}{relativeLong(p.updated)}</small></div><ArrowUpRight size={17}/></a>{/each}</section>{/if}
      </div>
      {#if !query&&!communityFilter}<WikiFront region={mapRegion} />{/if}
      {#if !query&&!communityFilter}<WikiPlaces />{/if}
      {#if fromNews.length&&!query&&!context&&!communityFilter}<section class="wiki-module" aria-label="Dari kabar"><div class="wiki-module-heading"><h2>Dari kabar</h2></div><p class="wiki-module-sub">Halaman yang mengutip kabar.</p>{#each fromNews as p}<a class="wiki-rank-row" href={'/wiki/'+p.id}><Newspaper size={18}/><div><h3>{p.title}</h3><small>Mengutip {p.newsCitations} kabar{p.citationCount>(p.newsCitations??0)?' dan '+(p.citationCount-(p.newsCitations??0))+' sumber lain':''}</small></div><ArrowUpRight size={17}/></a>{/each}</section>{/if}
      {:else if !growingMatches.length}<div class="wiki-draft-state"><BookOpen size={27}/><h2>{query||context||communityFilter?'Belum ada halaman yang cocok':'Belum ada halaman wiki'}</h2><p>{query||context||communityFilter?'Coba kata atau pilihan lain.':'Halaman yang sudah ditinjau akan muncul di sini.'}</p></div>{/if}
      {#if growingMatches.length}<section class="wiki-growing wiki-module" aria-label="Draf"><div class="wiki-module-heading"><h2>Draf</h2><span>Belum ditinjau</span></div>{#each growingMatches as p}<a class="wiki-recent-row" href={'/wiki/notes/'+p.id}><FileText size={19}/><div><h3>{p.title}</h3><p>{opening(p.excerpt)}</p><small>{p.author.name}{p.author.kind==='agent'?' · AI':''} · {p.citationCount?p.citationCount+' sumber':'Belum ada sumber'}{p.evidenceStatus!=='current'?' · sumber perlu ditinjau':''}</small></div><ArrowUpRight size={17}/></a>{/each}</section>{:else if growingError}<p class="commons-alert" role="status">{growingError}</p>{/if}
      {#if gaps&&(gaps.contexts.length||gaps.uncited.length)&&!query&&!context&&!communityFilter}<section class="wiki-module wiki-gaps" aria-label="Perlu ditulis"><div class="wiki-module-heading"><h2>Perlu ditulis</h2></div>
        {#each gaps.contexts.slice(0,3) as c}<a class="wiki-rank-row" href={'/contexts/'+c.slug}><MapPin size={18}/><div><h3>{c.title}</h3><small>{kindName[c.kind]??'Tempat'} · belum ada halaman</small></div><ArrowUpRight size={17}/></a>{/each}
        {#each gaps.uncited.slice(0,3) as p}<a class="wiki-rank-row" href={'/wiki/'+p.id}><FileText size={18}/><div><h3>{p.title}</h3><small>Belum ada sumber</small></div><ArrowUpRight size={17}/></a>{/each}
      </section>{/if}
      {#if groups.length>1}<section class="wiki-browse"><div class="wiki-module-heading"><h2>Jelajahi komunitas</h2>{#if communityFilter}<button onclick={()=>communityFilter=''}>Lihat semua</button>{/if}</div><div class="wiki-community-grid">{#each groups as c}<button aria-pressed={communityFilter===c.id} onclick={()=>communityFilter=communityFilter===c.id?'':c.id}><BookOpen size={18}/><strong>{c.title}</strong><span>{c.count} halaman</span></button>{/each}</div></section>{/if}
      {#if drafts.length}<section class="wiki-drafts"><div class="wiki-module-heading"><h2>Dalam tinjauan</h2></div>{#each drafts as p}<a href={'/wiki/'+p.id}>{p.title}<span>Draf</span><ArrowUpRight size={15}/></a>{/each}</section>{/if}
    {/if}
    <footer class="wiki-discovery-footer"><BookOpen size={19}/><p><a href="/knowledge">Tambah sumber atau catatan <ArrowRight size={13}/></a></p></footer>
  </section>
{/if}
