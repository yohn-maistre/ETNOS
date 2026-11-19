<script lang="ts">
  import {
    ExternalLink,
    CalendarDays,
    MapPin,
    Check,
    LockKeyhole,
  } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import PostText from './PostText.svelte'
  import SourcesPanel from './SourcesPanel.svelte'
  import { splitSources } from './sources'
  import { CARD_FENCE } from './cards/fence'
  import PostMedia from './PostMedia.svelte'
  import VideoPreview from './VideoPreview.svelte'
  import LinkPreview from './LinkPreview.svelte'
  import { markdown, videoEmbed, directVideo } from './markdown'
  import { request, type Post } from './api'
  let {
    post,
    detail = false,
    canVote = false,
    onError,
    externalPreview = false,
    loggedIn = false,
    onAnswered,
  }: {
    post: Post
    detail?: boolean
    canVote?: boolean
    onError: (s: string) => void
    externalPreview?: boolean
    loggedIn?: boolean
    onAnswered?: () => void
  } = $props()
  // An agent's closing "Sumber:" sections fold into the panel; the body reads without them.
  // An agent post may carry one composed card (OpenUI Lang in a fenced block); it renders under the text.
  const card = $derived(post.author.kind === 'agent' ? post.text.match(CARD_FENCE)?.[1]?.trim() || '' : '')
  const text = $derived(card ? post.text.replace(CARD_FENCE, '').trim() : post.text)
  const folded = $derived(post.author.kind === 'agent' && !post.content?.sources?.length ? splitSources(text) : null)
  const body = $derived(folded?.body ?? text)
  const answerLabel = { wrong: 'Ada yang salah', more: 'Saya tahu lebih' } as const
  let revealed = $state(false),
    expanded = $state(false),
    busy = $state(false)
  let mediaViewer = $state<PostMedia | undefined>()
  const inlineIds = $derived(post.content?.inlineMedia?.ids ?? [])
  const inlineImages = $derived(
    post.media?.filter((m) => inlineIds.includes(m.id)) ?? [],
  )
  const embed = $derived(
    videoEmbed(post.content?.url ?? '') || directVideo(post.content?.url ?? ''),
  )
  const truncated = $derived(!detail && !expanded && body.length > 900)
  async function act(route: string, b: unknown) {
    if (busy) return
    busy = true
    try {
      Object.assign(
        post,
        await request<Post>(`/v1/posts/${post.id}/${route}`, b),
      )
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Belum tersimpan.')
    } finally {
      busy = false
    }
  }
</script>

<div
  class="rich-post"
  onclick={(event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      'button[data-image-id]',
    )
    if (button) mediaViewer?.showImage(button.dataset.imageId!)
  }}
  role="presentation"
>
  {#if post.deleted}<p class="post-tombstone">
      Posting dihapus.
    </p>{:else}
    {#if post.content?.warning && !revealed}<div class="content-warning">
        <span>{post.content.warning}</span>
        <Button variant="outline" size="sm" onclick={() => (revealed = true)}>
          Tampilkan
        </Button>
      </div>{:else}
      {#if post.content?.title}<h2 class="post-title">
          <a href={'/square/' + post.id}>{post.content.title}</a>
        </h2>{/if}
      {#if post.content?.answer}<small class="post-answer-label">{answerLabel[post.content.answer]}</small>{/if}
      <div class="cx-post-body strata-body" class:post-clamped={truncated}>
        {#if post.content?.format === 'markdown'}<div class="post-markdown">
            {@html markdown(body, inlineImages)}
          </div>{:else}<PostText
            text={body}
            permalink={!detail ? '/square/' + post.id : undefined}
          />{/if}
      </div>
      {#if truncated}<button
          class="post-read-more"
          onclick={() => (expanded = true)}
        >
          Baca selengkapnya
        </button>{/if}
      {#if card}{#await import('./cards/OpenCard.svelte') then m}<m.default source={card} />{/await}{/if}
      {#if post.content?.sources?.length || folded || post.answers}<SourcesPanel {post} tail={folded?.tail ?? ''} open={detail} {loggedIn} canAnswer={canVote} {onError} {onAnswered} />{/if}
      {#if post.media?.length}<PostMedia
          bind:this={mediaViewer}
          images={post.media}
          {inlineIds}
          caption={post.text}
          author={post.author.name}
        />{/if}
      {#if post.content?.url}<div class="post-link-card">
          {#if embed}<VideoPreview url={post.content.url} />{/if}
          {#if !embed}<LinkPreview
              url={post.content.url}
              title={post.content.title}
              enabled={externalPreview}
            />{:else}<a
              class:video-link-label={!!embed}
              href={post.content.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              referrerpolicy="no-referrer"
            >
              <span>
                <small>{new URL(post.content.url).hostname}</small>
                {post.content.title || post.content.url}
              </span>
              <ExternalLink size={16} />
            </a>{/if}
        </div>{/if}
      {#if post.poll}<div class="post-poll" aria-label="Jajak pendapat">
          {#each post.poll.options as option, i}<button
              class:chosen={post.poll.myVote === i}
              disabled={busy || post.poll.closed || !canVote}
              onclick={() =>
                act('poll', { choice: post.poll?.myVote === i ? null : i })}
            >
              <span
                class="poll-fill"
                style={'width:' +
                  (post.poll.total && option.votes !== null
                    ? option.votes / post.poll.total
                    : 0) *
                    100 +
                  '%'}
              ></span>
              <span>
                {option.label}{#if post.poll.myVote === i}<Check
                    size={14}
                  />{/if}
              </span>
              {#if option.votes !== null}<small>{option.votes}</small>{/if}
            </button>{/each}
          <small>
            {#if post.poll.results === 'shown'}Hasil dari {post.poll.total}
              penjawab di ETNOS{:else}Hasil tampil setelah 10 orang menjawab.{/if}
            · {post.poll.closed
              ? 'Ditutup'
              : new Date(post.poll.closesAt).toLocaleString(
                  'id-ID',
                )}{#if !canVote && !post.poll.closed}
              · Gabung untuk memilih{/if}
          </small>
          <small>Pilihanmu tidak ditampilkan ke siapa pun.</small>
        </div>{/if}
      {#if post.event}<div class="post-event">
          <CalendarDays size={20} />
          <div>
            <strong>
              {new Date(post.event.startsAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </strong>
            {#if post.event.location}<span>
                <MapPin size={13} />{post.event.location}
              </span>{/if}
            <small>
              {post.event.going} ikut · {post.event.interested} tertarik
            </small>
          </div>
          <Button
            variant={post.event.myResponse === 'going' ? 'default' : 'outline'}
            size="sm"
            disabled={!canVote || busy}
            onclick={() =>
              act('rsvp', {
                response: post.event?.myResponse === 'going' ? null : 'going',
              })}
          >
            {post.event.myResponse === 'going' ? 'Akan ikut' : 'Ikut'}
          </Button>
        </div>{/if}
    {/if}
    {#if post.locked}<small class="post-state">
        <LockKeyhole size={12} />Percakapan dikunci
      </small>{/if}
  {/if}
</div>
