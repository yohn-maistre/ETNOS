<script lang="ts">
  // The wiki article reader: one page, its sources, history and proposals. The wiki front is EnsiklopediaFront.
  import {
    BookOpen,
    ArrowUpRight,
    GitPullRequest,
    History,
    FileText,
    Type,
  } from '@lucide/svelte'
  import { markdown } from './markdown'
  import { wikiDiff, languageName } from './wiki-diff'
  import {
    relativeDate,
    relativeLong,
    type WikiPage,
    type Proposal,
    type Community,
    type Membership,
    type Auth,
  } from './api'
  import { Button } from '$lib/components/ui/button/index.js'
  import WikiViewerLinks from './WikiViewerLinks.svelte'
  import './styles/observatorium.css'
  import WikiDiscussion from './WikiDiscussion.svelte'
  import WikiContents from './WikiContents.svelte'
  import { loadMap, highlandRegions, type MapData } from './observatory'
  import { siteBranding } from './site-branding'
  import WikiVoices from './WikiVoices.svelte'
  import WikiSourceNotes from './WikiSourceNotes.svelte'
  import WikiTrail from './WikiTrail.svelte'
  import WikiPeriod from './WikiPeriod.svelte'
  import { voices as pageVoices } from './wiki-sources'
  import LandscapePrint from './LandscapePrint.svelte'
  let {
    page,
    pages,
    proposals,
    history,
    communities,
    memberships,
    auth,
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
    onPropose: () => void
    onDecide: (p: Proposal, accept: boolean) => void
    onReview: (revisionId: string, accept: boolean) => void
    onShare: (url: string) => void
    busy: boolean
  } = $props()
  let section = $state('read'),
    readingSize = $state('normal')
  function resize(size:string){readingSize=size;try{localStorage.setItem('strata.ui.wiki-text',size)}catch{/* Optional device preference. */}}
  $effect(()=>{try{readingSize=localStorage.getItem('strata.ui.wiki-text')==='large'?'large':'normal'}catch{/* Optional device preference. */}})
  // The region a page belongs to, from the public map data, chooses its engraved cover.
  let mapData = $state<MapData | null>(null)
  $effect(() => { if (!mapData) void loadMap().then((d) => (mapData = d)) })
  const pageRegion = $derived.by(() => {
    if (!page || !mapData) return null
    const node = mapData.nodes.find((n) => n.href === '/wiki/' + page.id)
    if (!node) return null
    const region = mapData.nodes.find((n) => n.k === 'page' && n.kind === 'region' && n.reg === node.reg)
    return { reg: node.reg, title: region?.t.replace(/^Wilayah adat /, '') ?? '', href: region && region.href !== node.href ? region.href : undefined }
  })
  const pageArt = $derived(pageRegion ? siteBranding.welcomeArtworks.find((a) => a.id === (highlandRegions.has(pageRegion.reg) ? 'tigi' : 'raja-ampat')) ?? null : null)
  const member = $derived(
      !!page && memberships.some((m) => m.community_id === page.community_id),
    ),
    steward = $derived(
      !!page &&
        memberships.some(
          (m) => m.community_id === page.community_id && m.role !== 'member',
        ),
    )
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
        <WikiViewerLinks text={page.revision.text} />
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
{/if}
