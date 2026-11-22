<script lang="ts">
  import {avatarTone} from './avatar-tone'
  import {firstPostUrl} from './post-links'
  import { onDestroy, untrack } from 'svelte'
  import {
    ShoppingBag,
    ImagePlus,
    Bold,
    Globe,
    LockKeyhole,
    X,
    LoaderCircle,
    Link,
    Heading,
    ShieldAlert,
    Vote,
    CalendarDays,
    Code,
    Plus,
    ArrowUp,
    AtSign, Bot,
  } from '@lucide/svelte'
  import * as Avatar from '$lib/components/ui/avatar/index.js'
  import Choice from './Choice.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import {
    request,
    ApiError,
    initials,
    type Actor,
    type Community,
    type Post,
    type PostContent,
    type ResidentChoice,
    type Season,
  } from './api'
  import PostText from './PostText.svelte'
  import TentangPicker from './TentangPicker.svelte'
  import { askTandai, type Tag } from './tentang.svelte.ts'
  import { markdown, videoEmbed, directVideo } from './markdown'
  import VideoPreview from './VideoPreview.svelte'
  import { OBSERVATORY_NAME } from './observatory-name.ts'
  import LinkPreview from './LinkPreview.svelte'
  import * as Dropdown from '$lib/components/ui/dropdown-menu/index.js'
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js'
  import { prepareImage, uploadImages, type ImageDraft } from './media'
  import type DocumentEditor from './DocumentEditor.svelte'
  let documentEditor = $state<DocumentEditor | null>(null)
  async function insertImage(image: ImageDraft) {
    processing = true
    try {
      await uploadImages(communityId, [image])
      documentEditor?.insertImage(image.uploaded!.url, image.alt)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gambar belum dapat disisipkan.'
    } finally {
      processing = false
    }
  }
  let {
    actor,
    communities,
    initialCommunity,
    parentId,
    replyingTo,
    onCancelReply,
    onPosted,
    onStateChange,
    compact = false,
    initialUrl = '',
    initialKind = '',
    initialTentang = [],
  }: {
    actor: Actor
    communities: Community[]
    initialCommunity: string
    parentId?: string
    replyingTo?: string
    onCancelReply?: () => void
    onPosted: (post: Post) => void | Promise<void>
    onStateChange?: (state: {
      dirty: boolean
      busy: boolean
      canSubmit: boolean
    }) => void
    initialUrl?: string
    initialKind?: string
    /** Entries the post starts out about, such as the entry page it was written from. */
    initialTentang?: Tag[]
    compact?: boolean
  } = $props()
  let communityId = $state(untrack(() => initialCommunity)),
    text = $state(''),
    title = $state(''),
    url = $state(untrack(() => initialUrl)),
    warning = $state(''),
    showTitle = $state(untrack(()=>initialKind==='offering')),
    showUrl = $state(false),
    showWarning = $state(false),
    format = $state(untrack(()=>communities.find(c=>c.id===initialCommunity)?.publication==='local')),
    showFormatting = $state(true),
    preview = $state(false),
    kind = $state(untrack(() => initialKind)),
    pollOptions = $state(['', '']),
    pollDays = $state('3'),
    offerKind = $state('offer'),offerPrice = $state(''),offerUnit = $state(''),offerDays = $state('30'),
    eventTime = $state(''),
    eventLocation = $state(''),
    pending = $state<{ key: string; payload: Record<string, unknown> } | null>(
      null,
    ),
    images = $state<ImageDraft[]>([]),
    busy = $state(false),
    processing = $state(false),
    error = $state(''),
    altKey = $state(''),
    field = $state<HTMLTextAreaElement | null>(null),
    picker = $state<HTMLInputElement | null>(null),
    form = $state<HTMLFormElement | null>(null)
  const detectedUrl = $derived(
    url.trim() ||
      firstPostUrl(text,format),
  )
  const destination = $derived(communities.find((c) => c.id === communityId))
  // Percakapan: what the post is about. Only an opening post in a public community carries tags.
  let tentangTags = $state<Tag[]>(untrack(() => initialTentang))
  const tentangOn = $derived(!parentId && !compact && kind !== 'offering' && destination?.visibility === 'public')
  // Seasons the destination community named; the picker shows only when it has some.
  let seasons = $state<Season[]>([]),
    season = $state('')
  const seasonCache = new Map<string, Season[]>()
  $effect(() => {
    const id = communityId
    season = ''
    if (!id || parentId) return void (seasons = [])
    const known = seasonCache.get(id)
    if (known) return void (seasons = known)
    seasons = []
    request<Season[]>(`/v1/communities/${id}/seasons`)
      .then((rows) => {
        const usable = rows.filter((s) => !s.archived)
        seasonCache.set(id, usable)
        if (communityId === id) seasons = usable
      })
      .catch(() => {})
  })
  // In a community with a Kamus, a post may carry its Indonesian translation (Artinya). It helps readers who do not
  // speak the language, and it is the Kamus's best evidence for meanings.
  let kamusOn = $state(false),
    artinya = $state(''),
    artinyaOpen = $state(false)
  const kamusCache = new Map<string, boolean>()
  $effect(() => {
    const id = communityId
    kamusOn = false
    if (!id) return
    if (kamusCache.has(id)) return void (kamusOn = kamusCache.get(id)!)
    request<{ settings: { language: string } }>(`/v1/communities/${encodeURIComponent(id)}/kamus?limit=0`, undefined, undefined, true)
      .then((k) => { kamusCache.set(id, !!k.settings.language); if (communityId === id) kamusOn = !!k.settings.language })
      .catch(() => {})
  })
  let mentionChoices=$state<ResidentChoice[]>([]),mentionLoading=$state(false),mentionError=$state(''),selectedMention=$state<(ResidentChoice&{communityId:string})|null>(null)
  const mentionEligible=$derived(destination?.visibility==='public'&&destination?.publication==='local'&&actor.kind==='human'&&kind!=='offering'&&!warning.trim())
  const strayAksara=$derived(mentionEligible&&!selectedMention&&/@aksara/i.test(text))
  const textLimit=$derived(selectedMention?4000:destination?.publication==='atproto'?6000:20000)
  $effect(()=>{
    const id=communityId,enabled=mentionEligible,controller=new AbortController()
    mentionChoices=[];mentionError='';mentionLoading=enabled
    if(enabled)request<ResidentChoice[]>('/v1/resident/choices?community='+encodeURIComponent(id),undefined,controller.signal,true).then(result=>{if(!controller.signal.aborted)mentionChoices=result}).catch(()=>{if(!controller.signal.aborted)mentionError='Aksara belum dapat diperiksa. Kamu tetap dapat menulis.'}).finally(()=>{if(!controller.signal.aborted)mentionLoading=false})
    return()=>controller.abort()
  })
  $effect(()=>{if(selectedMention&&(!mentionEligible||selectedMention.communityId!==communityId||!text.includes('](/people/'+selectedMention.actor.id+')')))selectedMention=null})
  const hasContent = $derived(
    !!(text.trim() || title.trim() || url.trim() || images.length || kind),
  )
  $effect(() => {
    onStateChange?.({
      dirty: hasContent,
      busy: busy || processing,
      canSubmit: hasContent && text.length<=textLimit && !!destination && !busy && !processing,
    })
  })
  let lastCommunity = untrack(() => initialCommunity),
    audiencePending = $state('')
  function changeDestination(next: string) {
    const before = communities.find((c) => c.id === lastCommunity),
      after = communities.find((c) => c.id === next)
    if(after?.publication==='atproto'&&format&&text.trim()){error='Tulisan berformat hanya dapat disimpan di komunitas lokal. Pilih komunitas lokal, atau mulai tulisan teks baru untuk AT.';return false}
    if (
      hasContent &&
      before &&
      before.visibility !== 'public' &&
      after?.visibility === 'public'
    ) {
      audiencePending = next
      return false
    }
    if(!hasContent)format=after?.publication==='local'
    lastCommunity = next
    return true
  }
  onDestroy(() => images.forEach((image) => URL.revokeObjectURL(image.preview)))
  function remove(key: string) {
    const image = images.find((i) => i.key === key)
    if (image?.uploaded) documentEditor?.removeImage(image.uploaded.url)
    if (image) URL.revokeObjectURL(image.preview)
    images = images.filter((i) => i.key !== key)
  }
  async function add(files: FileList | null) {
    if (!files || processing || busy || pending) return
    processing = true
    error = ''
    try {
      if (images.length + files.length > 4)
        throw Error('Maksimal 4 gambar per posting.')
      for (const file of Array.from(files))
        images = [...images, await prepareImage(file)]
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gambar belum dapat ditambahkan.'
    } finally {
      processing = false
      if (picker) picker.value = ''
    }
  }
  function resize() {
    if (field) {
      field.style.height = 'auto'
      field.style.height = field.scrollHeight + 'px'
    }
  }
  export function focus() {
    if(format)documentEditor?.focus();else field?.focus()
  }
  export function send() {
    form?.requestSubmit()
  }
  function callAksara(){if(!documentEditor?.openMention())error='Pilih Aksara dari editor visual. Markdown lanjutan tetap dipertahankan di mode sumber.'}
  async function submit() {
    if (busy || processing || !hasContent || !destination || text.length>textLimit) return
    busy = true
    error = ''
    try {
      const content: PostContent = {
        ...(title.trim() ? { title } : {}),
        ...(detectedUrl ? { url: detectedUrl } : {}),
        ...(warning.trim() ? { warning } : {}),
        ...(format ? { format: 'markdown' } : {}),
        ...(season && kind !== 'offering' ? { season } : {}),
      }
      if (kind === 'poll')
        content.poll = {
          options: pollOptions,
          closesAt: Date.now() + Number(pollDays) * 86400000,
        }
      if (kind === 'event') {
        if (!eventTime) throw Error('Pilih waktu acara.')
        content.event = {
          startsAt: new Date(eventTime).getTime(),
          location: eventLocation,
        }
      }
      if (!pending) {
        const mediaIds = await uploadImages(communityId, images)
        const inlineIds = mediaIds.filter((id) =>
          text.includes('/v1/media/' + id),
        )
        if (format && inlineIds.length)
          content.inlineMedia = { version: 1, ids: inlineIds }
        pending = {
          key: crypto.randomUUID(),
          payload: {
            communityId,
            text,
            ...(parentId ? { parentId } : {}),
            mediaIds,
            content,
            ...(selectedMention?{agentMention:{actorId:selectedMention.actor.id,choiceKey:selectedMention.choiceKey}}:{}),
            ...(tentangOn&&tentangTags.length?{tentang:tentangTags.map(t=>t.slug)}:{}),
            ...(kamusOn&&kind!=='offering'&&!selectedMention&&artinya.trim()?{artinya:artinya.trim()}:{}),
            ...(kind==='offering'?{kind:offerKind,price:String(offerPrice??'').trim()?Number(offerPrice):null,unit:offerUnit,durationDays:Number(offerDays)}:{}),
          },
        }
      }
      const post = await request<Post>(kind==='offering'?'/v1/offerings':'/v1/posts', {
        ...pending.payload,
        requestKey: pending.key,
      })
      const ask = !!pending && !parentId && kind !== 'offering' && destination?.visibility === 'public'
      pending = null
      tentangTags = []
      title = ''
      url = ''
      warning = ''
      season = ''
      kind = ''
      offerKind='offer';offerPrice='';offerUnit='';offerDays='30'
      pollOptions = ['', '']
      format = destination?.publication==='local'
      preview = false
      text = ''
      selectedMention=null
      artinya = ''
      artinyaOpen = false
      images.forEach((image) => URL.revokeObjectURL(image.preview))
      images = []
      resize()
      await onPosted(post)
      if (ask) void askTandai(post.id)
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500)
        pending = null
      error =
        e instanceof Error
          ? e.message
          : 'Belum terkirim. Periksa percakapan sebelum mencoba lagi.'
    } finally {
      busy = false
    }
  }
</script>

<form
  bind:this={form}
  class="post-composer"
  class:compact
  onsubmit={(e) => {
    e.preventDefault()
    void submit()
  }}
>
  {#if replyingTo}<div class="reply-target">
      <span>Membalas {replyingTo}</span>
      {#if onCancelReply}<Button
          variant="ghost"
          size="icon"
          aria-label="Batal membalas"
          onclick={onCancelReply}
        >
          <X size={16} />
        </Button>{/if}
    </div>{/if}
  <div class="composer-writing">
    <Avatar.Root class="composer-avatar">
      <Avatar.Fallback class="avatar-tinted" style={avatarTone(actor.id)}>{initials(actor.name)}</Avatar.Fallback>
    </Avatar.Root>
    <div class="composer-content">
      {#if !compact}<div class="composer-identity">
          <strong>{actor.name}</strong>
          <span class="composer-destination">
            <Choice
              aria-label="Komunitas"
              bind:value={communityId}
              onbeforechange={changeDestination}
              disabled={busy || !!pending || images.length > 0}
              items={communities.map((c) => ({
                value: c.id,
                label: c.title + (c.visibility === 'public' ? '' : ' · Privat'),
              }))}
            />
          </span>
        </div>
        <p class="composer-scope">
          {#if destination?.visibility === 'public'}<Globe size={14} />
            <span>
              Publik · semua orang dapat membaca{destination.publication ===
              'atproto'
                ? ' · diterbitkan ke AT'
                : ''}
            </span>{:else}<LockKeyhole size={14} />
            <span>
              Privat · hanya anggota {destination?.title} dapat membaca
            </span>{/if}
        </p>{/if}
      {#if showTitle}<Input
          aria-label="Judul posting"
          placeholder="Judul (opsional)"
          bind:value={title}
          maxlength={180}
          disabled={busy || !!pending}
        />{/if}
      <div class="composer-editor" hidden={preview}>
      {#if format}{#await import('./DocumentEditor.svelte')}<p role="status" class="composer-editor-loading">Menyiapkan editor…</p>{:then module}<module.default bind:this={documentEditor} bind:value={text} label={compact?'Tulis balasan':'Posting'} max={textLimit} disabled={busy||!!pending} toolbar={showFormatting} {compact} autofocus={!compact} placeholder={compact?'Tulis balasan…':kind==='offering'?'Ceritakan yang kamu tawarkan atau butuhkan…':'Apa yang terjadi?'} onSubmit={send} mentionChoices={mentionEligible?mentionChoices:undefined} {mentionLoading} {mentionError} onMentionSelect={choice=>selectedMention={...choice,communityId}}/>{/await}
      {:else}<Textarea bind:ref={field} bind:value={text} class="composer-text" aria-label={compact?'Tulis balasan':'Posting'} placeholder={compact?'Tulis balasan…':'Apa yang terjadi?'} rows={compact?1:4} maxlength={textLimit} disabled={busy||!!pending} oninput={resize} onkeydown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&!e.isComposing){e.preventDefault();send()}}}/>{/if}
      </div>
      {#if preview}<div class="composer-preview post-markdown">{#if format}{@html markdown(text)}{:else}<PostText {text}/>{/if}</div>{/if}
      {#if kamusOn && kind !== 'offering' && !preview}<div class="composer-artinya">
          {#if artinyaOpen || artinya}<label for="composer-artinya">Artinya dalam bahasa Indonesia <small>Tidak wajib</small></label>
            <Textarea id="composer-artinya" bind:value={artinya} rows={compact ? 1 : 2} maxlength={4000} disabled={busy || !!pending} placeholder="Tulis terjemahan posting ini" />
          {:else}<button type="button" class="composer-artinya-open" onclick={() => (artinyaOpen = true)}>Tambahkan artinya dalam bahasa Indonesia</button>{/if}
        </div>{/if}
      {#if tentangOn && !preview}<TentangPicker bind:value={tentangTags} text={title + '\n' + text} disabled={busy || !!pending} />
      {:else if tentangTags.length && !parentId && kind !== 'offering' && destination && destination.visibility !== 'public'}<p class="composer-tentang-note">Posting di komunitas privat tidak ditandai dan tidak tampil di {OBSERVATORY_NAME}.</p>{/if}
      {#if text.length>textLimit}<p role="alert" class="document-editor-error">Tulisan melewati batas {textLimit.toLocaleString('id')} karakter.</p>{/if}
      {#if strayAksara}<p class="composer-aksara-hint" role="status">Ini akan jadi posting biasa. Pilih Aksara dari daftar untuk meminta jawaban.</p>{/if}
      {#if selectedMention}<div class="composer-aksara-request" role="group" aria-label="Permintaan balasan Aksara"><Bot size={16}/><span><strong>{selectedMention.actor.name}</strong><small>{selectedMention.scope==='sitewide'?'Aksara ETNOS':'Aksara komunitas'} akan diminta membalas di sini · publik</small></span><button type="button" disabled={busy||!!pending} aria-label="Kirim tanpa meminta balasan Aksara" title="Kirim tanpa meminta balasan Aksara" onclick={()=>selectedMention=null}><X size={16}/></button></div>{/if}
      {#if showUrl}<Input
          aria-label="Tautan posting"
          type="url"
          placeholder="https://…"
          bind:value={url}
          disabled={busy || !!pending}
        />{/if}
      {#if !warning && (videoEmbed(detectedUrl) || directVideo(detectedUrl))}<VideoPreview
          url={detectedUrl}
        />{:else if !warning && detectedUrl && destination?.visibility === 'public'}<div
          class="post-link-card"
        >
          <LinkPreview url={detectedUrl} />
        </div>{/if}
      {#if showWarning}<Input
          aria-label="Peringatan konten"
          placeholder="Peringatan konten"
          bind:value={warning}
          maxlength={160}
          disabled={busy || !!pending}
        />{/if}
      {#if seasons.length && kind !== 'offering'}<label class="composer-season"
          ><span>Musim</span><select bind:value={season} disabled={busy || !!pending}
            ><option value="">Tanpa musim</option>{#each seasons as s (s.id)}<option value={s.id}>{s.name}</option>{/each}</select
          ></label
        >{/if}
      {#if kind === 'offering'}<fieldset class="composer-extras offering-create" disabled={busy||!!pending}><legend>Penawaran atau kebutuhan</legend><Choice aria-label="Menawarkan atau mencari" bind:value={offerKind} items={[{value:'offer',label:'Menawarkan'},{value:'request',label:'Mencari'}]}/><div class="offering-form-pair"><Input aria-label={offerKind==='request'?'Anggaran (Rp)':'Harga (Rp)'} type="number" min="0" step="1" bind:value={offerPrice} placeholder={offerKind==='request'?'Anggaran (opsional)':'Harga (opsional)'}/><Input aria-label="Satuan harga" bind:value={offerUnit} maxlength={60} placeholder="Misalnya per ikat"/></div><Choice aria-label="Masa penawaran" bind:value={offerDays} items={[{value:'7',label:'Berlaku 7 hari'},{value:'30',label:'Berlaku 30 hari'},{value:'90',label:'Berlaku 90 hari'}]}/><p class="cx-hint">Kosongkan harga untuk dibicarakan langsung. Kontak dilakukan lewat pesan atau diskusi. ETNOS belum menyediakan pembayaran.</p><Button variant="ghost" size="sm" onclick={()=>kind=''}>Hapus penawaran</Button></fieldset>{/if}
      {#if kind === 'poll'}<fieldset
          class="composer-extras"
          disabled={busy || !!pending}
        >
          <legend>Jajak pendapat</legend>
          <div class="poll-choice-list">
            {#each pollOptions.keys() as i}<div class="poll-choice-row">
                <span>{i + 1}</span>
                <Input
                  aria-label={'Pilihan ' + (i + 1)}
                  placeholder={'Pilihan ' + (i + 1)}
                  bind:value={pollOptions[i]}
                  maxlength={100}
                  required
                />{#if pollOptions.length > 2}<Button
                    variant="ghost"
                    size="icon"
                    aria-label={'Hapus pilihan ' + (i + 1)}
                    onclick={() =>
                      (pollOptions = pollOptions.filter((_, n) => n !== i))}
                  >
                    <X size={15} />
                  </Button>{/if}
              </div>{/each}
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              disabled={pollOptions.length >= 6}
              onclick={() => (pollOptions = [...pollOptions, ''])}
            >
              Tambah pilihan
            </Button><Choice
              compact
              aria-label="Durasi jajak pendapat"
              bind:value={pollDays}
              items={[
                { value: '1', label: '1 hari' },
                { value: '3', label: '3 hari' },
                { value: '7', label: '7 hari' },
              ]}
            /><Button variant="ghost" size="sm" onclick={() => (kind = '')}>
              Hapus
            </Button>
          </div>
        </fieldset>{/if}
      {#if kind === 'event'}<fieldset
          class="composer-extras"
          disabled={busy || !!pending}
        >
          <legend>Acara</legend>
          <Input
            aria-label="Waktu acara"
            type="datetime-local"
            bind:value={eventTime}
            required
          /><Input
            aria-label="Lokasi acara"
            placeholder="Lokasi (opsional)"
            bind:value={eventLocation}
            maxlength={200}
          /><Button variant="ghost" size="sm" onclick={() => (kind = '')}>
            Hapus acara
          </Button>
        </fieldset>{/if}
      {#if images.length}<div class="composer-images">
          {#each images as image (image.key)}<div class="composer-image-draft">
              <img
                src={image.preview}
                alt={image.alt || 'Pratinjau gambar'}
                width={image.width}
                height={image.height}
              />
              <Button
                class="draft-remove"
                variant="secondary"
                size="icon"
                aria-label="Hapus gambar"
                disabled={busy || !!pending}
                onclick={() => remove(image.key)}
              >
                <X size={16} />
              </Button><Button
                class="draft-alt"
                variant="secondary"
                disabled={busy || !!image.uploaded}
                onclick={() => (altKey = altKey === image.key ? '' : image.key)}
              >
                ALT{image.alt ? ' ✓' : ''}
              </Button>{#if format}<Button
                  class="draft-insert"
                  variant="secondary"
                  size="sm"
                  disabled={busy || processing || !!pending || !documentEditor}
                  onclick={() => insertImage(image)}
                >
                  Sisipkan
                </Button>{/if}{#if altKey === image.key}<Input
                  aria-label="Teks alternatif gambar"
                  placeholder="Deskripsikan gambar"
                  maxlength={1000}
                  disabled={busy || !!image.uploaded}
                  bind:value={image.alt}
                />{/if}
            </div>{/each}
        </div>{/if}
      <div class="composer-tools">
        {#if format&&mentionEligible}<Button variant="ghost" size="icon" aria-label="Panggil Aksara" title="Panggil Aksara · atau ketik @aksara" disabled={busy||!!pending||!documentEditor} onclick={callAksara}><AtSign size={20}/><span class="composer-tool-label">Aksara</span></Button>{/if}
        {#if !compact && !parentId && destination?.publication === 'local'}<Button variant="ghost" size="icon" aria-label="Tambahkan penawaran" title="Penawaran atau kebutuhan" aria-pressed={kind==='offering'} disabled={busy||!!pending} onclick={()=>{kind=kind==='offering'?'':'offering';if(kind==='offering')showTitle=true}}><ShoppingBag size={20}/><span class="composer-tool-label">Penawaran</span></Button>{/if}
        {#if !compact && destination?.publication === 'local'}<Button
          variant="ghost" size="icon" aria-label="Format tulisan" title="Format tulisan, termasuk tebal, miring, daftar dan Markdown"
          aria-pressed={format&&showFormatting} disabled={busy || !!pending} onclick={() => {if(!format)format=true;else showFormatting=!showFormatting}}
        ><Bold size={20}/><span class="composer-tool-label">Format</span></Button>{/if}
        <input
          bind:this={picker}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          class="sr-only"
          tabindex="-1"
          aria-label="Pilih gambar"
          onchange={(e) => void add(e.currentTarget.files)}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tambahkan gambar"
          disabled={busy ||
            !!pending ||
            processing ||
            images.length >= 4 ||
            destination?.publication !== 'local'}
          onclick={() => picker?.click()}
        >
          {#if processing}<LoaderCircle
              size={20}
              class="animate-spin"
            />{:else}<ImagePlus size={20} />{/if}<span class="composer-tool-label">Media</span>
        </Button>
        {#if !compact && destination?.publication === 'local'}<Button
            variant="ghost"
            size="icon"
            aria-label="Tambahkan tautan"
            title="Tautan"
            aria-pressed={showUrl}
            disabled={busy || !!pending}
            onclick={() => (showUrl = !showUrl)}
          >
            <Link size={20} /><span class="composer-tool-label">Tautan</span>
          </Button>{#if !parentId}<Button
              variant="ghost"
              size="icon"
              aria-label="Tambahkan jajak pendapat"
              title="Jajak pendapat"
              aria-pressed={kind === 'poll'}
              disabled={busy || !!pending}
              onclick={() => (kind = kind === 'poll' ? '' : 'poll')}
            >
              <Vote size={20} /><span class="composer-tool-label">Polling</span>
            </Button><Button variant="ghost" size="icon" aria-label="Tambahkan acara" title="Acara" aria-pressed={kind === 'event'} disabled={busy || !!pending} onclick={() => kind = kind === 'event' ? '' : 'event'}><CalendarDays size={20}/><span class="composer-tool-label">Acara</span></Button>{/if}{/if}
        {#if destination?.publication === 'local'}<Dropdown.Root>
            <Dropdown.Trigger
              class="composer-tool"
              aria-label="Opsi konten"
              disabled={busy || !!pending}
            >
              <Plus size={20} />
            </Dropdown.Trigger><Dropdown.Content>
              <Dropdown.Item onSelect={() => (showTitle = !showTitle)}>
                <Heading size={16} />Judul
              </Dropdown.Item><Dropdown.Item
                onSelect={() => (showUrl = !showUrl)}
              >
                <Link size={16} />Tautan / video
              </Dropdown.Item><Dropdown.Item
                onSelect={() => (showWarning = !showWarning)}
              >
                <ShieldAlert size={16} />Peringatan konten
              </Dropdown.Item>{#if !parentId}<Dropdown.Item
                  onSelect={() => (kind = kind === 'poll' ? '' : 'poll')}
                >
                  <Vote size={16} />Jajak pendapat
                </Dropdown.Item><Dropdown.Item
                  onSelect={() => (kind = kind === 'event' ? '' : 'event')}
                >
                  <CalendarDays size={16} />Acara
                </Dropdown.Item>{/if}<Dropdown.Separator
              /><Dropdown.Item onSelect={()=>documentEditor?.toggleSource()}><Code size={16}/>Sumber Markdown</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>{/if}
        {#if text.trim()}<Button
            variant="ghost"
            size="sm"
            onclick={() => (preview = !preview)}
          >
            {preview ? 'Tulis' : 'Pratinjau'}
          </Button>{/if}
        {#if !format && text.length > textLimit-500}<span class="composer-count">
            {(destination?.publication === 'atproto' ? 6000 : 20000) -
              text.length}
          </span>{/if}
      </div>
    </div>
    {#if compact}<Button
        class="composer-send"
        aria-label="Kirim balasan"
        type="submit"
        size="sm"
        disabled={busy || processing || !hasContent || text.length>textLimit}
      >
        {#if busy}<LoaderCircle size={16} class="animate-spin" />{:else}<ArrowUp
            size={20}
          />{/if}
      </Button>{/if}
  </div>
  <div class="composer-footer" class:reply-footer={compact}>
    {#if !compact}<span class="composer-audience">
        {#if destination?.visibility === 'public'}<Globe
            size={13}
          />{destination.publication === 'atproto'
            ? 'Publik · AT'
            : 'Publik'}{:else}<LockKeyhole size={13} />Hanya anggota{/if}
      </span>
      <Button
        type="submit"
        disabled={busy || processing || !hasContent || !destination || text.length>textLimit}
      >
        {#if busy}<LoaderCircle size={16} class="animate-spin" />{/if}Posting
      </Button>{/if}
  </div>
  {#if pending && !busy}<p class="composer-retry-note">
      Pengiriman belum terkonfirmasi. Coba lagi untuk memeriksa posting yang
      sama.
    </p>{/if}
  {#if error}<p class="cx-form-error" role="alert">{error}</p>{/if}
</form>
<AlertDialog.Root
  open={!!audiencePending}
  onOpenChange={(open) => {
    if (!open) audiencePending = ''
  }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Pindahkan tulisan ke ruang publik?</AlertDialog.Title>
      <AlertDialog.Description>
        Semua orang dapat membaca posting di {communities.find(
          (c) => c.id === audiencePending,
        )?.title}. Periksa kembali cerita dan sumber yang boleh dibagikan.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Tetap privat</AlertDialog.Cancel><AlertDialog.Action
        onclick={() => {
          communityId = audiencePending
          lastCommunity = audiencePending
          audiencePending = ''
        }}
      >
        Pindahkan ke publik
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  .composer-tentang-note { margin: 10px 0 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .composer-artinya { display: grid; gap: 6px; margin-top: 8px; }
  .composer-artinya label { font-size: 13.5px; font-weight: 600; }
  .composer-artinya label small { margin-left: 4px; font-weight: 400; color: var(--muted-foreground); }
  .composer-artinya-open { justify-self: start; min-height: 36px; padding: 0; border: 0; background: none; color: var(--muted-foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
  .composer-artinya-open:hover { color: var(--foreground); }
  .composer-artinya-open:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
</style>
