<script lang="ts">
  // The headline card of a Jelajah section: the art fills the tile and the title and meta sit on a dark wash rising from the bottom (cover-wash.css). Only the one or two top items of a section get one; the rest are open rows (ExploreRow).
  // Colour comes from the kind (tone), taken from the reader's palette of accents.
  import type { Snippet } from 'svelte'

  let {
    title,
    text = '',
    meta = '',
    href,
    tone = 'place',
    art,
  }: {
    title: string
    text?: string
    meta?: string
    href: string
    tone?: 'place' | 'language' | 'topic' | 'news' | 'room'
    art?: Snippet
  } = $props()
</script>

<a class="cover-wash tile" data-tone={tone} {href}>
  {#if art}<div class="cover-wash-art" aria-hidden="true">{@render art()}</div>{/if}
  <div class="cover-wash-body">
    {#if meta}<span class="cover-wash-meta">{meta}</span>{/if}
    <h3 class="cover-wash-title">{title}</h3>
    {#if text}<p class="cover-wash-text">{text}</p>{/if}
  </div>
</a>

<style>
  .tile[data-tone='language'] { --wash-tone: var(--tone-language, var(--brand)); }
  .tile[data-tone='topic'] { --wash-tone: var(--tone-topic, var(--brand)); }
  .tile[data-tone='news'] { --wash-tone: var(--tone-news, var(--brand)); }
  .tile[data-tone='room'] { --wash-tone: var(--tone-room, var(--brand)); }
  .tile[data-tone='place'] { --wash-tone: var(--tone-place, var(--brand)); }
</style>
