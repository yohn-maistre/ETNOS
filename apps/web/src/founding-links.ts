// The founding link is shown once by the server (only its hash is kept there). Keep it for this tab so the
// founder can copy it again from the waiting room; a new tab asks for a fresh link instead.
const key = (id: string) => 'etnos-founding-' + id
export function rememberLink(communityId: string, token: string) {
  try { sessionStorage.setItem(key(communityId), token) } catch { /* private window: the founder can make a new link */ }
}
export function knownLink(communityId: string): string | null {
  try { return sessionStorage.getItem(key(communityId)) } catch { return null }
}
export function forgetLink(communityId: string) {
  try { sessionStorage.removeItem(key(communityId)) } catch { /* nothing kept */ }
}
/** The link people open. The token rides in the fragment, which browsers never send to the server. */
export const linkFor = (token: string) => `${location.origin}/gabung#${token}`
