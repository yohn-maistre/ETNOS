<script lang="ts">
  // A post's text in a community with a Kamus. Open questions carry a dotted underline (a button, so the keyboard
  // reaches them); every other word opens the word card when tapped. With Mode belajar on, checked words are tinted
  // by word class and carry a class letter.
  import { kamus, openWord } from './kamus-posts.svelte.ts'
  import { markWords, plainHtml, wordAt } from './kamus-render.ts'
  let { postId, communityId, html, text, markdown = false }: { postId: string; communityId: string; html?: string; text?: string; markdown?: boolean } = $props()
  const annotation = $derived(kamus.annotations[postId])
  const marked = $derived(annotation ? markWords(markdown ? (html ?? '') : plainHtml(text ?? ''), annotation, kamus.learn) : '')

  function tap(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('a,img,video,iframe')) return
    const ask = target.closest<HTMLButtonElement>('button.kq')
    if (ask) { e.preventDefault(); openWord(communityId, ask.dataset.w ?? ask.textContent ?? '', postId, ask); return }
    if (window.getSelection()?.isCollapsed === false) return
    const hit = wordAt(e.clientX, e.clientY)
    if (hit) { e.preventDefault(); openWord(communityId, hit.word, postId, hit.el) }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="kamus-body" class:post-markdown={markdown} class:learning={kamus.learn} onclick={tap}>{@html marked}</div>

<style>
  /* Word-class colours for Mode belajar, from the level bands in DESIGN.md (light and dark sets). */
  .kamus-body { --kc-benda: #067132; --kc-kerja: #305eb7; --kc-sifat: #b54d98; --kc-lainnya: #857d0b; }
  :global(.dark) .kamus-body { --kc-benda: #1d7d3e; --kc-kerja: #4777d2; --kc-sifat: #c664a8; --kc-lainnya: #918112; }
  .kamus-body :global(button.kq) {
    display: inline; margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; letter-spacing: inherit; cursor: pointer;
    text-decoration: underline dotted var(--brand); text-decoration-thickness: 2px; text-underline-offset: 0.22em; border-radius: 3px;
  }
  .kamus-body :global(button.kq:hover) { background: color-mix(in oklab, var(--brand) 10%, transparent); }
  .kamus-body :global(button.kq:focus-visible) { outline: 2px solid var(--brand); outline-offset: 1px; }
  .kamus-body :global(.kc) { --kc: var(--muted-foreground); border-radius: 4px; padding: 0 1px; background: color-mix(in oklab, var(--kc) 15%, transparent); box-shadow: inset 0 -1.5px 0 color-mix(in oklab, var(--kc) 70%, transparent); }
  .kamus-body :global(.kc[data-c='benda']) { --kc: var(--kc-benda); }
  .kamus-body :global(.kc[data-c='kerja']) { --kc: var(--kc-kerja); }
  .kamus-body :global(.kc[data-c='sifat']) { --kc: var(--kc-sifat); }
  .kamus-body :global(.kc[data-c='lainnya']) { --kc: var(--kc-lainnya); }
  .kamus-body :global(.kc-l) { margin-left: 1px; font-size: 0.62em; font-weight: 700; vertical-align: 0.5em; line-height: 0; color: color-mix(in oklab, var(--kc) 72%, var(--foreground)); }
</style>
