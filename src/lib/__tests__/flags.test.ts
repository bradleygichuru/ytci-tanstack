import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FLAGS,
  SURFACE_FLAGS,
  parseFlagValue,
  resolveFlags,
  type SurfaceFlagMap,
} from '#/lib/flags'

const noEnv = {} as Record<(typeof SURFACE_FLAGS)[number], string | undefined>

describe('admin feature flags', () => {
  it('ships every new surface off by default', () => {
    expect(resolveFlags({}, noEnv)).toEqual(DEFAULT_FLAGS)
    for (const flag of SURFACE_FLAGS) expect(DEFAULT_FLAGS[flag]).toBe(false)
  })

  it('parses accepted spellings', () => {
    for (const value of ['1', 'true', 'on', 'yes', ' TRUE ']) expect(parseFlagValue(value)).toBe(true)
    for (const value of ['0', 'false', 'off', 'no']) expect(parseFlagValue(value)).toBe(false)
    expect(parseFlagValue('maybe')).toBeUndefined()
  })

  it('lets the environment enable one surface', () => {
    const resolved = resolveFlags({}, { ...noEnv, species: 'true' })
    expect(resolved.species).toBe(true)
    expect(resolved.recognition).toBe(false)
  })

  it('lets a dev override beat the environment', () => {
    const resolved = resolveFlags({ species: false, recognition: true }, { ...noEnv, species: 'true' })
    expect(resolved.species).toBe(false)
    expect(resolved.recognition).toBe(true)
  })

  it('returns a complete flag map', () => {
    const resolved: SurfaceFlagMap = resolveFlags({}, noEnv)
    expect(Object.keys(resolved).sort()).toEqual([...SURFACE_FLAGS].sort())
  })
})
