<script lang="ts">
  import { ChevronRight, Check, ExternalLink, LoaderCircle } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import PostText from './PostText.svelte'
  import { markdown } from './markdown'
  import { sourceLinks } from './sources'
  import { request, type Post } from './api'
  let {
    post,
    tail = '',
    open = false,
    loggedIn = false,
    canAnswer = false,
    onError,
    onAnswered,
  }: {
    post: Post
    tail?: string
    open?: boolean
    loggedIn?: boolean
    canAnswer?: boolean
    onError: (message: string) => void
    onAnswered?: () => void
  } = $props()
  let mode = $state<'wrong' | 'more' | null>(null),
    text = $state(''),
    link = $state(''),
    busy = $state(false),
    sent = $state('')
  const listed = $derived(post.content?.sources ?? [])
  // The author's own "Sumber:" label is redundant under the panel heading.
  const shown = $derived(tail.replace(/^[*_]{0,2}Sumber[*_]{0,2}\s*:\s*(\S)/, (_, first: string) => first.toLocaleUpperCase('id')))
  const hasSources = $derived(listed.length > 0 || !!tail)
  const count = $derived(listed.length || sourceLinks(tail))
  const answers = $derived(post.answers)
  const replies = $derived((answers?.wrong ?? 0) + (answers?.more ?? 0))
  const summary = $derived(
    [
      count ? count + ' sumber' : hasSources ? 'Sumber' : 'Belum ada sumber',
      answers?.right ? answers.right + ' membenarkan' : '',
      replies ? replies + ' tanggapan' : '',
    ]
      .filter(Boolean)
      .join(' · '),
  )
  function blocked() {
    if (canAnswer) return false
    onError(loggedIn ? 'Gabung komunitas untuk menjawab.' : 'Masuk untuk menjawab.')
    return true
  }
  async function confirm() {
    if (blocked() || busy || !answers) return
    busy = true
    try {
      Object.assign(post, await request<Post>(`/v1/posts/${post.id}/confirm`, { value: !answers.mine }))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Belum tersimpan.')
    } finally {
      busy = false
    }
  }
  function start(next: 'wrong' | 'more') {
    if (blocked()) return
    sent = ''
    mode = mode === next ? null : next
  }
  async function send(event: SubmitEvent) {
    event.preventDefault()
    if (!mode || busy || !text.trim()) return
    busy = true
    try {
      await request<Post>('/v1/posts', {
        communityId: post.community_id,
        parentId: post.id,
        text: text.trim(),
        content: { answer: mode, ...(link.trim() ? { url: link.trim() } : {}) },
        requestKey: crypto.randomUUID(),
      })
      if (answers) answers[mode] += 1
      mode = null
      text = ''
      link = ''
      sent = 'Terima kasih. Tanggapanmu tampil sebagai balasan.'
      onAnswered?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Tanggapan belum terkirim.')
    } finally {
      busy = false
    }
  }
</script>

<details class="post-sources" {open}>
  <summary><ChevronRight size={15} aria-hidden="true" /><span>{summary}</span></summary>
  <div class="post-sources-body">
    {#if listed.length}<ol>
        {#each listed as source}<li>
            <span class="post-source-title">{#if source.url}<a href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.title}<ExternalLink size={12} aria-hidden="true" /></a>{:else}{source.title}{/if}</span>
            {#if source.quote}<q>{source.quote}</q>{/if}
          </li>{/each}
      </ol>{:else if tail}<div class="post-sources-tail">
        {#if post.content?.format === 'markdown'}<div class="post-markdown">{@html markdown(shown, [])}</div>{:else}<PostText text={shown} />{/if}
      </div>{/if}
    {#if hasSources}<small class="post-sources-note">Sumber dicantumkan oleh {post.author.name}. Periksa sebelum mengutip.</small>{/if}
    {#if answers}<div class="post-answers" role="group" aria-label="Jawab posting ini">
        <Button variant="outline" size="sm" aria-pressed={answers.mine} disabled={busy} onclick={confirm}>{#if answers.mine}<Check size={14} />{/if}Benar</Button>
        <Button variant="outline" size="sm" aria-pressed={mode === 'wrong'} disabled={busy} onclick={() => start('wrong')}>Ada yang salah</Button>
        <Button variant="outline" size="sm" aria-pressed={mode === 'more'} disabled={busy} onclick={() => start('more')}>Saya tahu lebih</Button>
      </div>
      {#if mode}<form class="post-answer-form" onsubmit={send}>
          <Textarea bind:value={text} maxlength={4000} required rows={3} aria-label={mode === 'wrong' ? 'Apa yang salah' : 'Apa yang kamu tahu'} placeholder={mode === 'wrong' ? 'Apa yang salah, dan bagaimana yang benar?' : 'Apa yang kamu tahu? Dari siapa kamu mendengarnya?'} />
          <Input bind:value={link} type="url" maxlength={2048} aria-label="Tautan sumber" placeholder="Tautan sumber, jika ada" />
          <div><Button type="button" variant="ghost" size="sm" onclick={() => (mode = null)}>Batal</Button><Button type="submit" size="sm" disabled={busy || !text.trim()}>{#if busy}<LoaderCircle size={14} class="animate-spin" />{/if}Kirim</Button></div>
        </form>{/if}
      {#if sent}<p class="post-answer-sent" role="status">{sent}</p>{/if}{/if}
  </div>
</details>
