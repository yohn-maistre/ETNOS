<script lang="ts">
  import PlaceScopeSwitch from './PlaceScopeSwitch.svelte'
  import {avatarTone} from './avatar-tone'
  import { type Snippet } from 'svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import * as Avatar from '$lib/components/ui/avatar/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import {
    Home,
    Compass,
    Bell,
    MessagesSquare,
    Users,
    Bookmark,
    BookOpen,
    Search,
    Settings2,
    Plus,
    Sun,
    Moon,
    Menu,
    X,
    Sparkle,
    SlidersHorizontal,
    ArrowLeft,
    ChevronDown,
    RefreshCw,
  } from '@lucide/svelte'
  import { appearance } from './appearance.svelte'
  import { OBSERVATORY_NAME } from './observatory-name.ts'
  import { initials, type Auth } from './api'
  let {
    children,
    rail,
    path,
    heading,
    auth,
    unread = 0,
    onBack,
    onCompose,
    onSearch,
    onRefresh,
    feedMode,
    onFeedChange,
  }: {
    children: Snippet
    rail: Snippet
    path: string
    heading: string
    auth: Auth
    unread?: number
    onBack: () => void
    onCompose: () => void
    onSearch: (q: string) => void
    onRefresh: () => void
    feedMode: 'new' | 'mine' | 'following'
    onFeedChange: (mode: 'new' | 'mine' | 'following') => void
  } = $props()
  const sidebar = Sidebar.useSidebar()
  let contextScroll=$state<HTMLDivElement|null>(null)
  $effect(()=>{void path;if(contextScroll)contextScroll.scrollTop=0})
  // Pesan, Aktivitas and Tersimpan belong to an account; visitors who are not signed in do not see them.
  const nav = [
    { href: '/', label: 'Beranda', icon: Home },
    { href: '/explore', label: 'Jelajah', icon: Compass },
    { href: '/communities', label: 'Komunitas', icon: Users },
    { href: '/wiki', label: OBSERVATORY_NAME, icon: BookOpen },
    { href: '/messages', label: 'Pesan', icon: MessagesSquare },
    { href: '/notifications', label: 'Aktivitas', icon: Bell },
    { href: '/saved', label: 'Tersimpan', icon: Bookmark },
  ]
  const wikiSections: { href: string; label: string; match: (p: string) => boolean }[] = [
    { href: '/wiki/jenis/tempat', label: 'Tempat', match: (p) => p === '/wiki/jenis/tempat' },
    { href: '/wiki/jenis/bahasa', label: 'Bahasa', match: (p) => p === '/wiki/jenis/bahasa' || p === '/wiki/peta-kata' || p === '/peta-kata' },
    { href: '/wiki/jenis/topik', label: 'Topik', match: (p) => p === '/wiki/jenis/topik' },
    { href: '/wiki/peta', label: 'Peta Pengetahuan', match: (p) => p === '/wiki/peta' },
    { href: '/wiki/data', label: 'Katalog Data', match: (p) => p.startsWith('/wiki/data') },
  ]
  const navGroups = $derived(auth.actor ? [nav.slice(0, 4), nav.slice(4)] : [nav.slice(0, 4)])
  function active(href: string) {
    return href === '/'
      ? path === '/'
      : href === '/communities'
        ? path.startsWith('/communities') || path.startsWith('/groups')
        : href === '/explore'
          ? path.startsWith('/explore') || path.startsWith('/contexts') || path.startsWith('/topics')
          : href === '/wiki'
            ? path.startsWith('/wiki') || path === '/peta-kata'
            : path.startsWith(href)
  }
  $effect(() => {
    void path
    sidebar.setOpenMobile(false)
  })
  function compose() {
    sidebar.setOpenMobile(false)
    onCompose()
  }
</script>

<a class="cx-skip" href="#commons-main">Lewati navigasi</a>
<Sidebar.Root class="etnos-sidebar">
  <Sidebar.Header class="p-5 pb-3">
    <div class="cx-between">
      <a href="/" class="cx-brand" onclick={() => sidebar.setOpenMobile(false)}>
        <span class="brand-full">etnos</span>
        <span class="brand-compact" aria-hidden="true">e</span>
        <span class="brand-dot">.</span>
      </a>
      <Button
        variant="ghost"
        size="icon"
        class="md:hidden"
        aria-label="Tutup menu"
        onclick={() => sidebar.setOpenMobile(false)}
      >
        <X size={19} />
      </Button>
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    {#each navGroups as items, section}
      <Sidebar.Group>
        <Sidebar.Menu>
          {#each items as item}<Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={active(item.href)}
                onclick={() => sidebar.setOpenMobile(false)}
                class="nav-link"
              >
                {#snippet child({ props })}<a
                    {...props}
                    href={item.href}
                    aria-label={item.href === '/notifications' && unread ? `${item.label}, ${unread} belum dibaca` : item.label}
                    title={item.label}
                    aria-current={active(item.href) ? 'page' : undefined}
                  >
                    <item.icon size={20} strokeWidth={1.7} />
                    <span>{item.label}</span>
                    {#if item.href === '/notifications' && unread}<span
                        class="utility-unread notification-count" aria-hidden="true"
                      >
                        {unread>99?'99+':unread}
                      </span>{/if}
                  </a>{/snippet}
              </Sidebar.MenuButton>
              {#if item.href === '/wiki'}<!-- Places, languages, topics, knowledge map and open data under Ensiklopedia. -->
                <Sidebar.MenuSub class="nav-sub">
                  {#each wikiSections as sub (sub.href)}<Sidebar.MenuSubItem>
                      <Sidebar.MenuSubButton
                        href={sub.href}
                        isActive={sub.match(path)}
                        onclick={() => sidebar.setOpenMobile(false)}
                      >
                        <span>{sub.label}</span>
                      </Sidebar.MenuSubButton>
                    </Sidebar.MenuSubItem>{/each}
                </Sidebar.MenuSub>{/if}
            </Sidebar.MenuItem>{/each}
        </Sidebar.Menu>
      </Sidebar.Group>{#if section === 0 && auth.actor}
        <div class="px-4 pt-2">
          <Button
            class="w-full sidebar-compose"
            aria-label="Posting"
            title="Posting"
            onclick={compose}
          >
            <Plus size={18} />
            <span>Posting</span>
          </Button>
        </div>
      {/if}{/each}
  </Sidebar.Content>
  <Sidebar.Footer class="p-4 gap-3">
    <a
      href="/aksara"
      class="sidebar-aksara"
      class:active={path.startsWith('/aksara') || path.startsWith('/jadwal')}
      aria-current={path.startsWith('/aksara') || path.startsWith('/jadwal') ? 'page' : undefined}
      title="Aksara, pustakawan AI di ETNOS"
      onclick={() => sidebar.setOpenMobile(false)}
    >
      <Sparkle size={16} />
      <span><strong>Aksara</strong><small>Pustakawan AI</small></span>
    </a>
    {#if auth.actor}<Button
        href="/studio"
        variant="ghost"
        class="sidebar-settings"
        aria-label="Studio"
        title="Studio"
        onclick={() => sidebar.setOpenMobile(false)}
      >
        <SlidersHorizontal size={18} />
        <span>Studio</span>
      </Button>{/if}
    <Button
      href="/preferences"
      variant="ghost"
      class="sidebar-settings"
      aria-label="Pengaturan"
      title="Pengaturan"
      onclick={() => sidebar.setOpenMobile(false)}
    >
      <Settings2 size={18} />
      <span>Pengaturan</span>
    </Button>
    {#if auth.actor}<a
        href={'/people/' + auth.actor.id}
        class="account-link"
        aria-label={'Profil ' + auth.actor.name}
        title={'Profil ' + auth.actor.name}
        onclick={() => sidebar.setOpenMobile(false)}
      >
        <Avatar.Root>
          <Avatar.Fallback class="avatar-tinted" style={avatarTone(auth.actor.id)}>{initials(auth.actor.name)}</Avatar.Fallback>
        </Avatar.Root>
        <span>
          <strong>{auth.actor.name}</strong>
          <small>Akun AT terhubung</small>
        </span>
      </a>{:else}<Button
        href="/login"
        variant="outline"
        onclick={() => sidebar.setOpenMobile(false)}
      >
        Masuk
      </Button>{/if}
    <a class="preview-label" href="/tentang" onclick={() => sidebar.setOpenMobile(false)}>Tentang ETNOS · Alpha</a>
  </Sidebar.Footer>
</Sidebar.Root>
<Sidebar.Inset class="platform-inset">
  <header
    class="cx-topbar"
    class:home-topbar={path === '/'}
    class:directory-topbar={['/communities', '/groups', '/contexts','/topics'].includes(
      path,
    )}
    class:sidebar-collapsed={sidebar.state === 'collapsed'}
    class:thread-topbar={/^\/(square|people|news|communities|wiki|contexts|groups|work)\/[^/]+/.test(
      path,
    )}
  >
    {#if /^\/(square|people|news|communities|wiki|contexts|groups|work)\/[^/]+/.test(path)}<Button
        onclick={onBack}
        variant="ghost"
        size="icon"
        class="thread-back"
        aria-label="Kembali"
      >
        <ArrowLeft size={22} />
      </Button>
    {/if}
    <!-- The sidebar stays put on desktop; phones open it from the dock's Menu. -->
    <div class="surface-heading" class:explore-title={path === '/explore'}>
      {#if path === '/'}<PlaceScopeSwitch onChange={onRefresh} feed={feedMode} {onFeedChange} />{:else if ['/explore', '/wiki'].includes(path)}<h1 class="sr-only">{heading}</h1><PlaceScopeSwitch />{:else if ['/communities', '/groups', '/contexts','/topics'].includes(path)}<h1
        >
          {heading}
        </h1>{:else}<span>{heading}</span>{/if}
    </div>
    <a
      href="/"
      class="cx-mobile-brand"
      class:explore-brand={path === '/explore'}
    >
      etnos
      <span>.</span>
    </a>
    <Button
      variant="ghost"
      class="cx-global-search search-launcher"
      aria-label="Buka pencarian"
      onclick={() => onSearch('')}
    >
      <Search size={18} />
      <span>Cari ETNOS</span>
      <kbd>⌘ K</kbd>
    </Button>
    {#if path === '/'}<Button
        variant="ghost"
        size="icon"
        class="header-refresh"
        aria-label="Muat ulang"
        onclick={onRefresh}
      >
        <RefreshCw size={18} />
      </Button>{/if}
    {#if auth.actor}<Button
      href="/notifications"
      variant="ghost"
      size="icon"
      class="activity-bell"
      aria-label={unread ? `Aktivitas, ${unread} belum dibaca` : 'Aktivitas'}
    >
      <Bell size={18} />{#if unread}<span class="notification-count" aria-hidden="true">{unread>99?'99+':unread}</span>{/if}
    </Button>{/if}
    <Button
      variant="ghost"
      size="icon"
      class="theme-toggle"
      title={appearance.themeMode === 'clock'
        ? 'Tema otomatis, ketuk untuk mengubah'
        : 'Ubah tema'}
      aria-label={appearance.theme === 'dark' ? 'Tema terang' : 'Tema gelap'}
      onclick={() =>
        (appearance.themeMode = appearance.theme === 'dark' ? 'light' : 'dark')}
    >
      {#if appearance.theme === 'dark'}<Sun size={18} />{:else}<Moon
          size={18}
        />{/if}
    </Button>
  </header>
  <div
    class="cx-content-grid"
    data-surface={path.startsWith('/square/')
      ? 'thread'
      : path === '/'
        ? 'feed'
        : 'page'}
  >
    <main id="commons-main" class="cx-main" data-route={path} tabindex="-1">
      {@render children()}
    </main>
    <aside
      class="cx-context"
      aria-label="Konteks terkait"
      hidden={[
        'preferences',
        'messages',
        'agents',
        'studio',
        'login',
        'recover-messages',
      ].includes(path.split('/')[1])}
    >
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (A named overflow region needs keyboard scrolling; focus can leave normally.) -->
      <div class="context-scroll" bind:this={contextScroll} tabindex="0" role="region" aria-label="Gulir konteks terkait">{@render rail()}</div>
    </aside>
  </div>
</Sidebar.Inset>
<div class="mobile-dock-vignette" aria-hidden="true" hidden={path.startsWith('/square/')}></div>
<nav
  class="cx-mobile-dock"
  class:thread-dock={path.startsWith('/square/')}
  class:visitor-dock={!auth.actor}
  aria-label="Navigasi ponsel"
>
  <Button
    href="/"
    variant="ghost"
    size="icon"
    aria-label="Beranda"
    aria-current={active('/') ? 'page' : undefined}
  >
    <Home size={21} />
    <span aria-hidden="true">Beranda</span>
  </Button>
  <Button href="/explore" variant="ghost" size="icon" aria-label="Jelajah">
    <Compass size={21} />
    <span aria-hidden="true">Jelajah</span>
  </Button>
  <!-- Visitors get three places: Beranda, Jelajah, Menu. Masuk lives in the Menu and in the bar on Beranda;
       Posting and Aktivitas need an account. -->
  {#if auth.actor}<Button size="icon" aria-label="Posting baru" onclick={onCompose}>
    <Plus size={23} />
    <span aria-hidden="true">Posting</span>
  </Button>{/if}
  {#if auth.actor}<Button
    href="/notifications"
    variant="ghost"
    size="icon"
    aria-label={unread ? `Aktivitas, ${unread} belum dibaca` : 'Aktivitas'}
    aria-current={active('/notifications') ? 'page' : undefined}
    class="mobile-activity"
  >
    <span class="mobile-activity-icon"><Bell size={21} />{#if unread}<span class="notification-count" aria-hidden="true">{unread>99?'99+':unread}</span>{/if}</span>
    <span aria-hidden="true">Aktivitas</span>
  </Button>{/if}
  <Button
    variant="ghost"
    size="icon"
    aria-label="Buka menu"
    title="Menu"
    onclick={() => sidebar.toggle()}
  >
    <Menu size={21} />
    <span aria-hidden="true">Menu</span>
  </Button>
</nav>
