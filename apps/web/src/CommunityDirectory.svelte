<script lang="ts">
  import {avatarTone} from './avatar-tone'
  import {
    Users,
    Building2,
    ArrowUpRight,
    Plus,
    Search,
    Globe,
    LockKeyhole,
    MapPin,
    Hash,
    Languages,
    Landmark,
  } from '@lucide/svelte'
  import { contextTree, facetNames, type ContextNode, type ContextBranch } from './context-tree'
  import {
    request,
    initials,
    type Auth,
    type Community,
    type Membership,
  } from './api'
  import Choice from './Choice.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { tabScroll } from './tab-scroll'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  type View = 'rooms' | 'organizations' | 'places' | 'topics' | 'joined'
  type Place = ContextNode
  type Group = {
    id: string
    title: string
    description: string
    kind: string
    spaces?: Community[]
    contexts?: Place[]
  }
  let {
    auth,
    communities,
    memberships,
    view = 'rooms',
    onCreate,
    navigate,
  }: {
    auth: Auth
    communities: Community[]
    memberships: Membership[]
    view?: View
    onCreate: () => void
    navigate: (url: string) => void
  } = $props()
  let query = $state(''),
    organization = $state(''),
    placeKind = $state(''),
    groups = $state<Group[]>([]),
    places = $state<Place[]>([]),
    error = $state(''),
    pending = $state(true)
  const kindNames: Record<string, string> = {
    region: 'Wilayah',
    place: 'Tempat',
    language: 'Bahasa',
    topic: 'Topik',
  }
  $effect(() => {
    const actor = auth.actor?.id,
      abort = new AbortController()
    groups = []
    places = []
    error = ''
    pending = true
    Promise.all([
      request<Group[]>('/v1/groups', undefined, abort.signal),
      request<Place[]>('/v1/contexts', undefined, abort.signal),
    ])
      .then(([gs, ps]) => {
        if (!abort.signal.aborted && actor === auth.actor?.id) {
          groups = gs
          places = ps
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) error = e.message
      })
      .finally(() => {
        if (!abort.signal.aborted) pending = false
      })
    return () => abort.abort()
  })
  const match = (title: string, description = '') =>
    (title + ' ' + description)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase())
  const rooms = $derived(
    communities.filter(
      (c) =>
        (view !== 'joined' ||
          memberships.some((m) => m.community_id === c.id)) &&
        match(c.title, c.description) &&
        (!organization ||
          groups
            .find((g) => g.id === organization)
            ?.spaces?.some((s) => s.id === c.id)),
    ),
  )
  const selectedGroups = $derived(
    groups.filter(
      (g) =>
        (!organization || g.id === organization) &&
        g.spaces?.some((s) => rooms.some((c) => c.id === s.id)),
    ),
  )
  const ungrouped = $derived(
    rooms.filter(
      (c) => !groups.some((g) => g.spaces?.some((s) => s.id === c.id)),
    ),
  )
  const organizationsList = $derived(
    groups.filter((g) => match(g.title, g.description)),
  )
  const placesList = $derived(
    places.filter(
      (p) =>
        (view !== 'topics' || p.kind === 'topic') &&
        (!placeKind || p.kind === placeKind) &&
        match(p.title, p.description + ' ' + (p.aliases ?? []).filter((a) => !a.includes(':')).join(' ')),
    ),
  )
  // Without a search or kind filter the directory reads as a map: regions with
  // their regencies, provinces, languages, then topics and kinds of institution.
  const browsing = $derived(!query.trim() && !placeKind)
  const tree = $derived(contextTree(places))
  const otherPlaces = $derived(tree.other.filter((o) => o.kind !== 'topic')),
    otherTopics = $derived(tree.other.filter((o) => o.kind === 'topic'))
  let languageQuery = $state(''),
    allLanguages = $state(false)
  const languageMatches = $derived(
    tree.languages.filter((l) =>
      (l.title + ' ' + l.description)
        .toLocaleLowerCase()
        .includes(languageQuery.trim().toLocaleLowerCase()),
    ),
  )
  const shownLanguages = $derived(
    allLanguages || languageQuery.trim() ? languageMatches : languageMatches.slice(0, 40),
  )
  function create() {
    if (!auth.actor) {
      navigate('/login')
      return
    }
    if (view === 'organizations') navigate('/groups?create=true')
    else if (view === 'topics') navigate('/contexts?create=true&kind=topic')
    else if (view === 'places') navigate('/contexts?create=true')
    else onCreate()
  }
</script>

<section class="community-directory" aria-label="Direktori">
  <div class="directory-controls">
    <nav class="directory-tabs" aria-label="Direktori komunitas" use:tabScroll>
      {#each [['rooms', 'Komunitas', '/communities'], ['topics', 'Topik', '/topics'], ['places', 'Tempat & bahasa', '/contexts'], ['organizations', 'Organisasi', '/groups']] as [id, label, url]}
        <button
          aria-current={view === id || (view === 'joined' && id === 'rooms')
            ? 'page'
            : undefined}
          onclick={() => navigate(url)}
        >
          {label}
        </button>
      {/each}
    </nav>
    {#if !['places', 'topics'].includes(view) || auth.steward}<Button
        variant="outline"
        aria-label={view === 'organizations'
          ? 'Buat organisasi'
          : view === 'topics'
            ? 'Buat topik'
            : view === 'places'
              ? 'Buat tempat atau bahasa'
              : 'Buat komunitas'}
        onclick={create}
      >
        <Plus size={16} />Buat
      </Button>{/if}
  </div>
  <div class="directory-filters">
    <div class="directory-input-row">
      <label class="directory-search">
        <Search size={18} /><Input
          aria-label="Cari di direktori"
          placeholder={view === 'organizations'
            ? 'Cari organisasi…'
            : view === 'topics'
              ? 'Cari topik…'
              : view === 'places'
                ? 'Cari tempat atau bahasa…'
                : 'Cari komunitas…'}
          bind:value={query}
        />
      </label>
      {#if auth.actor && (view === 'rooms' || view === 'joined')}<Button
          variant={view === 'joined' ? 'secondary' : 'outline'}
          aria-pressed={view === 'joined'}
          onclick={() =>
            navigate(
              view === 'joined' ? '/communities' : '/communities?view=joined',
            )}
        >
          Diikuti
        </Button>{/if}
    </div>
    {#if (view === 'rooms' || view === 'joined') && groups.length}<Choice
        aria-label="Organisasi komunitas"
        bind:value={organization}
        items={[
          { value: '', label: 'Semua organisasi' },
          ...groups.map((g) => ({ value: g.id, label: g.title })),
        ]}
      />{/if}
    {#if view === 'places'}<Choice
        aria-label="Jenis tempat dan konteks"
        bind:value={placeKind}
        items={[
          { value: '', label: 'Semua jenis' },
          ...Object.entries(kindNames)
            .map(([value, label]) => ({
              value,
              label,
            })),
        ]}
      />{/if}
  </div>
  {#if pending && (view === 'organizations' || view === 'places' || view === 'topics')}<ContentSkeleton
      rows={2}
    />{/if}
  {#if error}<p role="alert" class="search-state">{error}</p>{/if}
  {#if view === 'organizations'}
    {#each organizationsList as group}<a
        href={'/groups/' + group.id}
        class="directory-row"
      >
        <span class="directory-avatar avatar-tinted" style={avatarTone(group.id)}><Building2 size={22} /></span>
        <div>
          <strong>{group.title}</strong>
          <p>{group.description}</p>
          <small>
            {group.kind === 'institution' ? 'Institusi' : 'Kelompok'}
          </small>
        </div>
        <ArrowUpRight size={17} />
      </a>{/each}
    {#if !organizationsList.length && !pending && !error}<p
        class="search-state"
      >
        Belum ada organisasi yang cocok.
      </p>{/if}
  {:else if (view === 'places' || view === 'topics') && browsing && places.length}
    <div class="context-map">
      {#if view === 'places' && (tree.regions.length || tree.provinces.length || tree.languages.length)}<nav
          class="context-map-jump"
          aria-label="Bagian direktori"
        >
          {#if tree.regions.length}<a href="#wilayah-adat">Wilayah adat</a>{/if}
          {#if tree.provinces.length}<a href="#provinsi">Provinsi</a>{/if}
          {#if tree.languages.length}<a href="#bahasa">Bahasa</a>{/if}
          {#if tree.lenses.length || tree.topicGroups.length}<a href="#topik">Topik</a>{/if}
        </nav>{/if}
      {#if view === 'places' && tree.regions.length}<section
          id="wilayah-adat"
          class="context-map-section"
          aria-labelledby="wilayah-adat-heading"
        >
          <h2 id="wilayah-adat-heading">Wilayah adat</h2>
          <p class="context-map-note">
            Wilayah acuan yang digeneralisasi, bukan batas tanah adat.
          </p>
          {#each tree.regions as branch (branch.node.id)}{@render branchBlock(branch, true)}{/each}
        </section>{/if}
      {#if view === 'places' && tree.provinces.length}<section
          id="provinsi"
          class="context-map-section"
          aria-labelledby="provinsi-heading"
        >
          <h2 id="provinsi-heading">Provinsi</h2>
          {#each tree.provinces as branch (branch.node.id)}{@render branchBlock(branch, false)}{/each}
        </section>{/if}
      {#if view === 'places' && otherPlaces.length}<section
          class="context-map-section"
          aria-labelledby="tempat-lain-heading"
        >
          <h2 id="tempat-lain-heading">
            {tree.regions.length || tree.provinces.length ? 'Tempat lain' : 'Tempat & wilayah'}
          </h2>
          {#each otherPlaces as place (place.id)}{@render contextRow(place)}{/each}
        </section>{/if}
      {#if view === 'places' && tree.languages.length}<section
          id="bahasa"
          class="context-map-section"
          aria-labelledby="bahasa-heading"
        >
          <h2 id="bahasa-heading">
            Bahasa <span>{tree.languages.length}</span>
          </h2>
          <label class="context-map-filter">
            <Languages size={17} /><Input
              type="search"
              aria-label="Cari bahasa"
              placeholder={'Cari di antara ' + tree.languages.length + ' bahasa atau rumpun…'}
              bind:value={languageQuery}
              autocomplete="off"
            />
          </label>
          <div class="context-chips">
            {#each shownLanguages as l (l.id)}<a href={'/contexts/' + l.slug}>{l.title}</a>{/each}
          </div>
          {#if !languageMatches.length}<p class="context-map-note">
              Belum ada bahasa yang cocok.
            </p>{:else if shownLanguages.length < languageMatches.length}<Button
              variant="outline"
              class="context-map-more"
              onclick={() => (allLanguages = true)}
            >
              Tampilkan semua {languageMatches.length} bahasa
            </Button>{/if}
        </section>{/if}
      {#if tree.lenses.length || tree.topicGroups.length || otherTopics.length}<section
          id="topik"
          class="context-map-section"
          aria-labelledby="topik-heading"
        >
          <h2 id="topik-heading">Topik</h2>
          {#if tree.lenses.length || otherTopics.length}<div class="context-chips">
              {#each [...tree.lenses, ...otherTopics] as t (t.id)}<a href={'/contexts/' + t.slug}><Hash size={14} />{t.title}</a>{/each}
            </div>{/if}
          {#each tree.topicGroups as branch (branch.node.id)}{@render branchBlock(branch, true)}{/each}
        </section>{/if}
    </div>
  {:else if view === 'places' || view === 'topics'}
    {#each placesList as place (place.id)}{@render contextRow(place)}{/each}
    {#if !placesList.length && !pending && !error}<div
        class="search-state directory-empty"
      >
        <MapPin size={24} />
        <p>
          {view === 'topics'
            ? query
              ? 'Belum ada topik yang cocok.'
              : 'Belum ada topik.'
            : query
              ? 'Belum ada tempat atau bahasa yang cocok.'
              : 'Belum ada tempat atau bahasa yang ditautkan.'}
        </p>
        <a href="/communities">Jelajahi komunitas</a>
      </div>{/if}
  {:else}
    {#each selectedGroups as group}<section class="directory-section">
        <h2>
          <Building2 size={16} />
          <a href={'/groups/' + group.id}>{group.title}</a>
        </h2>
        {#each rooms.filter( (c) => group.spaces?.some((s) => s.id === c.id) ) as room}{@render roomRow(
            room,
          )}{/each}
      </section>{/each}
    {#if ungrouped.length}<section class="directory-section">
        {#if selectedGroups.length}<h2>
            Komunitas lain
          </h2>{/if}{#each ungrouped as room}{@render roomRow(room)}{/each}
      </section>{/if}
    {#if !rooms.length && !pending}<div class="search-state directory-empty">
        <Users size={25} />
        <p>
          {view === 'joined'
            ? 'Ruang yang kamu ikuti akan muncul di sini.'
            : 'Belum ada komunitas yang cocok.'}
        </p>
      </div>{/if}
  {/if}
</section>
{#snippet roomRow(room: Community)}
  <a href={'/communities/' + room.id} class="directory-row">
    <span class="directory-avatar avatar-tinted" style={avatarTone(room.id)}>{initials(room.title)}</span>
    <div>
      <strong>{room.title}</strong>
      <p>{room.description}</p>
      <small>
        {#if room.visibility === 'public'}<Globe
            size={12}
          />Publik{:else}<LockKeyhole size={12} />Khusus anggota{/if}{#if memberships.some((m) => m.community_id === room.id)}
          · Anggota{/if}
      </small>
    </div>
    <ArrowUpRight size={17} />
  </a>
{/snippet}
{#snippet contextRow(place: Place)}
  <a href={'/contexts/' + place.slug} class="directory-row">
    <span class="directory-avatar avatar-tinted" style={avatarTone(place.id)}>
      {#if place.kind === 'topic'}<Hash size={22} />{:else if place.kind === 'language'}<Languages
          size={22}
        />{:else}<MapPin size={22} />{/if}
    </span>
    <div>
      <strong>{place.title}</strong>
      {#if place.description}<p>{place.description}</p>{/if}
      {#if view !== 'topics'}<small>
          {facetNames[place.facet ?? ''] ?? kindNames[place.kind] ?? place.kind}
        </small>{/if}
    </div>
    <ArrowUpRight size={17} />
  </a>
{/snippet}
{#snippet branchBlock(branch: ContextBranch, open: boolean)}
  <details class="context-branch" {open}>
    <summary>
      <span class="context-branch-title">
        {#if branch.node.kind === 'topic'}<Landmark size={17} />{:else}<MapPin size={17} />{/if}
        <strong>{branch.node.title}</strong>
      </span>
      <small>{branch.children.length}</small>
    </summary>
    <div class="context-chips">
      <a class="context-chip-parent" href={'/contexts/' + branch.node.slug}>Buka {branch.node.title}<ArrowUpRight size={14} /></a>
      {#each branch.children as c (c.id)}<a href={'/contexts/' + c.slug}>{c.title}</a>{/each}
    </div>
  </details>
{/snippet}
