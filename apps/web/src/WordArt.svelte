<script lang="ts">
  // A crop of names set in the editorial serif: the picture on a language or topic tile. The names run off the
  // edge on purpose; the full list is one tap away.
  let { words }: { words: string[] } = $props()
</script>

<p class="word-art">{#each words as w, i (i)}<span>{w}</span>{/each}</p>

<style>
  .word-art {
    position: absolute;
    inset: 10px -24px -12px 12px;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0 14px;
    font-family: var(--font-editorial, serif);
    font-size: 26px;
    line-height: 1.15;
    color: var(--ink, var(--brand));
    white-space: nowrap;
    overflow: hidden;
  }
  .word-art span:nth-child(2n) { opacity: 0.62; }
  .word-art span:nth-child(3n) { opacity: 0.4; }
</style>
