<script lang="ts">
  import { Command } from 'bits-ui'
  import {
    Search,
    ArrowUpRight,
    LoaderCircle,
    Users,
    MessageCircle,
    MapPin,
    Hash,
    Building2,
    BookOpen,
    Sparkles,
  } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { request, type Post } from './api'
  import {
    categories,
    resultGroups,
    type SearchResult,
    type SearchCategory,
  } from './search'

  type SemanticHit = {
    post: Post
    communityTitle: string
    score: number
    topics: { slug: string; title: string; score: number }[]
  }
  type SemanticResponse = {
    mode: 'bge-m3' | 'deterministic'
    suggestedTopics: { slug: string; title: string; score: number }[]
    results: SemanticHit[]
  }

  let {
    open = $bindable(false),
    query = $bindable(''),
    navigate,
  }: {
    open?: boolean
    query?: string
    navigate: (href: string) => void
  } = $props()
  let category = $state<SearchCategory>('all'),
    data = $state<SearchResult | null>(null),
    semantic = $state<SemanticResponse | null>(null),
    pending = $state(false),
    error = $state('')
  const groups = $derived(resultGroups(data, category))
  const extraSemantic = $derived.by(() => {
    if (!semantic || (category !== 'all' && category !== 'posts')) return []
    const exactIds = new Set((data?.posts ?? []).map((p) => p.id))
    return semantic.results.filter((r) => !exactIds.has(r.post.id)).slice(0, 5)
  })
  const icons = {
    people: Users,
    posts: MessageCircle,
    communities: Users,
    contexts: MapPin,
    topics: Hash,
    groups: Building2,
    wiki: BookOpen,
  }
  const compact = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 130)
  function go(href: string) {
    open = false
    navigate(href)
  }
  $effect(() => {
    if (!open) {
      data = null
      semantic = null
      return
    }
    const q = query.trim(),
      controller = new AbortController()
    pending = true
    data = null
    semantic = null
    error = ''
    const timer = setTimeout(
      async () => {
        try {
          const [response, sem] = await Promise.all([
            request<SearchResult>(
              '/v1/search?q=' + encodeURIComponent(q),
              undefined,
              controller.signal,
            ),
            q.length >= 3
              ? request<SemanticResponse>(
                  '/v1/search/semantic?limit=6&q=' + encodeURIComponent(q),
                  undefined,
                  controller.signal,
                  true,
                ).catch(() => null)
              : Promise.resolve(null),
          ])
          if (!controller.signal.aborted) {
            data = response
            semantic = sem
          }
        } catch (e) {
          if (!controller.signal.aborted)
            error = e instanceof Error ? e.message : 'Pencarian belum tersedia'
        } finally {
          if (!controller.signal.aborted) pending = false
        }
      },
      q ? 220 : 0,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  })
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="search-dialog" showCloseButton={false}>
    <Dialog.Title class="sr-only">Cari ETNOS</Dialog.Title>
    <Dialog.Description class="sr-only">
      Cari orang, percakapan, komunitas dan wiki. Gunakan panah untuk memilih,
      Enter untuk membuka.
    </Dialog.Description>
    <Command.Root
      label="Cari ETNOS"
      class="search-command"
      shouldFilter={false}
      loop
      vimBindings={false}
    >
      <div class="command-search-input">
        <Search size={20} /><Command.Input
          bind:value={query}
          maxlength={100}
          placeholder="Cari ETNOS (kata, topik, atau makna lintas komunitas)"
          aria-label="Cari ETNOS"
        /><Dialog.Close class="search-close" aria-label="Tutup pencarian">
          Esc
        </Dialog.Close>
      </div>
      <div class="search-filters" role="group" aria-label="Jenis hasil">
        {#each categories as [key, label]}<button
            aria-pressed={category === key}
            onclick={() => (category = key)}
          >
            {label}
          </button>{/each}
      </div>
      <Command.List class="command-results" aria-busy={pending}>
        {#if pending}<div class="search-state" role="status">
            <LoaderCircle size={18} class="animate-spin" />Mencari…
          </div>
        {:else if error}<div class="search-state" role="alert">
            {error}<Button
              variant="outline"
              onclick={() => go('/find?q=' + encodeURIComponent(query))}
            >
              Buka pencarian
            </Button>
          </div>
        {:else}
          {#if !query}<p class="search-section-label">Di ETNOS</p>{/if}
          {#each groups as group}<Command.Group value={group.key}>
              <Command.GroupHeading class="search-section-label">
                {group.label}
              </Command.GroupHeading>
              <Command.GroupItems>
                {#each group.items as item}{@const Icon =
                    icons[group.key as keyof typeof icons]}<Command.Item
                    value={group.key + ':' + item.id}
                    onSelect={() => go(item.href)}
                    class="command-result"
                  >
                    <Icon size={18} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Command.Item>{/each}
              </Command.GroupItems>
            </Command.Group>{/each}
          {#if extraSemantic.length}<Command.Group value="semantic">
              <Command.GroupHeading class="search-section-label">
                Serupa lintas komunitas ({semantic?.mode === 'bge-m3' ? 'semantik' : 'topik'})
              </Command.GroupHeading>
              <Command.GroupItems>
                {#each extraSemantic as item (item.post.id)}<Command.Item
                    value={'semantic:' + item.post.id}
                    onSelect={() => go('/square/' + item.post.id)}
                    class="command-result"
                  >
                    <Sparkles size={17} />
                    <span>
                      <strong>{item.post.content?.title || compact(item.post.text)}</strong>
                      <small>{item.communityTitle} · {item.post.author.name}{item.topics[0] ? ` · #${item.topics[0].title}` : ''}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Command.Item>{/each}
              </Command.GroupItems>
            </Command.Group>{/if}
          {#if !groups.length && !extraSemantic.length}<div class="search-state">
              <strong>{query ? 'Belum ada hasil' : 'Mulai menjelajah'}</strong>
              <p>
                {query
                  ? 'Coba nama, topik, atau kata lain.'
                  : 'Temukan komunitas dan percakapan pertama.'}
              </p>
              <Button variant="outline" onclick={() => go('/explore')}>
                Jelajah
              </Button>
            </div>{/if}
        {/if}
      </Command.List>
      <div class="search-footer">
        <span>↑ ↓ Pilih · Enter Buka</span>
        <button onclick={() => go('/find?q=' + encodeURIComponent(query))}>
          Lihat semua hasil <ArrowUpRight size={14} />
        </button>
      </div>
    </Command.Root>
  </Dialog.Content>
</Dialog.Root>
