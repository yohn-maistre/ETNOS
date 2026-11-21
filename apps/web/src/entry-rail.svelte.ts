// The entry being read, so the shell's side rail can show its Letak rail instead of the site-wide lists.
import type { Entry } from './entri'
export const entryRail = $state<{ entry: Entry | null }>({ entry: null })
