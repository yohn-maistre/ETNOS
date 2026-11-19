<script lang="ts">
  // Renders one composed card from OpenUI Lang. A card that does not parse, or whose props fail the library's
  // checks, shows nothing; the post's own text still reads on its own.
  import { Renderer, type ParseResult } from '@openuidev/svelte-lang'
  import { cardLibrary } from './library'
  let { source }: { source: string } = $props()
  let ok = $state(true)
  function checked(r: ParseResult | null) { ok = !!r?.root && !r.meta.errors.length }
</script>

<div class="open-card" class:hidden={!ok}>
  <Renderer response={source} library={cardLibrary} onParseResult={checked} />
</div>

<style>
  .hidden { display: none; }
</style>
