<script lang="ts">
  // A page's cited sources as numbered notes. News-desk citations open the
  // story inside ETNOS and show its real headline once the desk answers.
  import { ArrowUpRight } from '@lucide/svelte'
  import { newsDate } from './news.svelte'
  import { newsStoryId, newsHeadline, sourceLabel, type NewsHeadline } from './wiki-sources'
  let { citations, variant = 'inline' }: { citations: string[]; variant?: 'inline' | 'rail' } = $props()
  const uid = $props.id()
  let headlines = $state<Record<string, NewsHeadline>>({})
  const notes = $derived(citations.map((url) => ({ url, story: newsStoryId(url) })))
  $effect(() => {
    let live = true
    for (const { story } of notes.slice(0, 20))
      if (story)
        newsHeadline(story).then((h) => {
          if (live && h) headlines = { ...headlines, [story]: h }
        })
    return () => {
      live = false
    }
  })
</script>

<section class={'wiki-notes wiki-notes-' + variant} aria-labelledby={'wiki-notes-' + uid}>
  <h2 id={'wiki-notes-' + uid}>Sumber</h2>
  {#if notes.length}
    <ol>
      {#each notes as note, i (note.url)}
        {@const h = note.story ? headlines[note.story] : undefined}
        <li id={variant === 'inline' ? 'sumber-' + (i + 1) : undefined}>
          <span class="wiki-note-number" aria-hidden="true">{i + 1}</span>
          <div>
            {#if note.story}
              <a href={'/news/' + note.story}>{h?.title ?? 'Kabar'}</a>
              <small>Kabar{h?.publishedAt ? ', ' + newsDate(h.publishedAt) : ''}. Penerbit asli dicantumkan di halaman kabar.</small>
            {:else}
              <a href={note.url} target="_blank" rel="noreferrer">{sourceLabel(note.url)}<ArrowUpRight size={13} aria-hidden="true" /></a>
              <small>Sumber luar</small>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {:else}
    <p>Sumber publik belum ditautkan.</p>
  {/if}
</section>
