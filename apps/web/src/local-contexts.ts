// Local Contexts Notices and Hub projects of the collections that ETNOS shows (src/local-contexts.ts,
// docs/decisions/local-contexts-2026-11-28.md). Loaded once per page view; the list is small and public.
import { request } from './api'

export type LcNotice = { kind: string; name: string; url: string; text: string; by: 'etnos' | 'operator' }
export type LcCollection = { key: string; title: string; kind: 'dataset' | 'service'; notices: LcNotice[]; hub: { projectId: string; url: string } | null }

let loading: Promise<LcCollection[]> | null = null
export function loadLocalContexts(): Promise<LcCollection[]> {
  loading ??= request<{ collections: LcCollection[] }>('/v1/local-contexts', undefined, undefined, true)
    .then((r) => r.collections)
    .catch(() => { loading = null; return [] })
  return loading
}
/** Drop the cached list after the operator changed it in Studio. */
export function reloadLocalContexts() { loading = null }
