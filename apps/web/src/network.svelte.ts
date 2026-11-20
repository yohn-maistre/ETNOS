import { untrack } from 'svelte'
/** Per-browser request lifecycle. Never make a calling effect depend on this counter. */
export const network = $state({ pending: 0, started: 0, settled: 0 })
export function beginRequest() {
  untrack(() => {
    network.pending++
    network.started++
  })
  let done = false
  return () =>
    untrack(() => {
      if (done) return
      done = true
      network.pending--
      network.settled++
    })
}

/**
 * A route change always shows the loading line for a moment, even when its data is already cached and no request
 * is needed, so every page switch gives the same feedback on a phone as on a desktop.
 */
export function pulse(ms = 650) {
  const done = beginRequest()
  setTimeout(done, ms)
}
