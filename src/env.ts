/**
 * Deployment settings are named ETNOS_*. The project was first called Strata, and a deployment set up then still
 * has its vars and secrets under STRATA_* names, so each ETNOS_ name falls back to the STRATA_ name of the same
 * setting. An ETNOS_ value, when set, wins. Bindings and other names pass through unchanged.
 */
export type EtnosEnv<T> = { [K in keyof T as K extends `STRATA_${infer R}` ? `ETNOS_${R}` : K]: T[K] }

const OLD = 'STRATA_', NEW = 'ETNOS_'

/** A copy of env with every STRATA_X also readable as ETNOS_X. */
export function etnosEnv<T extends object>(env: T): EtnosEnv<T> {
  const source = env as Record<string, unknown>, out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(OLD)) out[key] = value
    else if (source[NEW + key.slice(OLD.length)] === undefined) out[NEW + key.slice(OLD.length)] = value
  }
  return out as EtnosEnv<T>
}
