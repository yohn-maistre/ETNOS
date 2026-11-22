// Device preferences in localStorage. They were saved under strata.* keys before the project was renamed ETNOS;
// a read falls back to the old key, and every write goes to the new one.
const KEY = 'etnos.', OLD_KEY = 'strata.'

export function readStored(name: string): string | null {
  return localStorage.getItem(KEY + name) ?? localStorage.getItem(OLD_KEY + name)
}

export function writeStored(name: string, value: string) {
  localStorage.setItem(KEY + name, value)
}
