/**
 * Feature flags for the execution surfaces.
 *
 * Every new admin surface ships dark: the flag defaults to `false`, and the nav
 * entry, route gate and actions all read the same flag. Streams launch by setting
 * `VITE_FLAG_*` in the deployment environment — they do not edit shared nav.
 *
 * Resolution order: dev override (localStorage) → build env → default `false`.
 */
import { useCallback, useEffect, useState } from 'react'

export const SURFACE_FLAGS = ['mice', 'recognition', 'species', 'analytics'] as const
export type SurfaceFlag = (typeof SURFACE_FLAGS)[number]
export type SurfaceFlagMap = Record<SurfaceFlag, boolean>

const OVERRIDE_KEY = 'ytci.flags'
const CHANGE_EVENT = 'ytci:flags-changed'

const ENV_FLAGS: Record<SurfaceFlag, string | undefined> = {
  mice: import.meta.env.VITE_FLAG_MICE,
  recognition: import.meta.env.VITE_FLAG_RECOGNITION,
  species: import.meta.env.VITE_FLAG_SPECIES,
  analytics: import.meta.env.VITE_FLAG_ANALYTICS,
}

export const DEFAULT_FLAGS: SurfaceFlagMap = {
  mice: false,
  recognition: false,
  species: false,
  analytics: false,
}

const TRUTHY = new Set(['1', 'true', 'on', 'yes'])
const FALSY = new Set(['0', 'false', 'off', 'no'])

export function parseFlagValue(value: string | undefined | null): boolean | undefined {
  if (value == null) return undefined
  const normalised = value.trim().toLowerCase()
  if (TRUTHY.has(normalised)) return true
  if (FALSY.has(normalised)) return false
  return undefined
}

export function resolveFlags(
  overrides: Partial<SurfaceFlagMap> = {},
  env: Record<SurfaceFlag, string | undefined> = ENV_FLAGS,
): SurfaceFlagMap {
  const resolved = { ...DEFAULT_FLAGS }
  for (const flag of SURFACE_FLAGS) {
    const envValue = parseFlagValue(env[flag])
    if (envValue !== undefined) resolved[flag] = envValue
  }
  for (const flag of SURFACE_FLAGS) {
    if (typeof overrides[flag] === 'boolean') resolved[flag] = overrides[flag] as boolean
  }
  return resolved
}

function readOverrides(): Partial<SurfaceFlagMap> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const overrides: Partial<SurfaceFlagMap> = {}
    for (const flag of SURFACE_FLAGS) {
      if (typeof parsed[flag] === 'boolean') overrides[flag] = parsed[flag] as boolean
    }
    return overrides
  } catch {
    return {}
  }
}

export function getFlags(): SurfaceFlagMap {
  return resolveFlags(readOverrides())
}

export function setFlagOverride(flag: SurfaceFlag, enabled: boolean | null): void {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') return
  const overrides = readOverrides()
  if (enabled === null) {
    delete overrides[flag]
  } else {
    overrides[flag] = enabled
  }
  if (Object.keys(overrides).length === 0) {
    localStorage.removeItem(OVERRIDE_KEY)
  } else {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides))
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useFlags(): SurfaceFlagMap {
  const [flags, setFlags] = useState<SurfaceFlagMap>(getFlags)

  useEffect(() => {
    const refresh = () => setFlags(getFlags())
    refresh()
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return flags
}

export function useSurfaceFlag(flag: SurfaceFlag): boolean {
  const flags = useFlags()
  return flags[flag]
}

/** Stable callback for consumers that only need one flag synchronously. */
export function useFlagReader(): (flag: SurfaceFlag) => boolean {
  const flags = useFlags()
  return useCallback((flag: SurfaceFlag) => flags[flag], [flags])
}
