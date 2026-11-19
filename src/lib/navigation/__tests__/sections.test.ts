import { describe, expect, it } from 'vitest'
import { DEFAULT_FLAGS, type SurfaceFlagMap } from '#/lib/flags'
import {
  NAV_SECTIONS,
  PINNED_ITEMS,
  SHELL_SURFACES,
  findNavItem,
  isItemVisible,
  visibleSections,
} from '#/lib/navigation/sections'

const flags = (enabled: Partial<SurfaceFlagMap> = {}): SurfaceFlagMap => ({
  ...DEFAULT_FLAGS,
  ...enabled,
})

describe('admin nav registry', () => {
  it('keeps the existing sections and items intact', () => {
    expect(NAV_SECTIONS.map((section) => section.label)).toEqual([
      'Discovery',
      'Engagement',
      'Programme',
      'Platform',
    ])
    expect(findNavItem('/events')?.label).toBe('Events')
    expect(findNavItem('/analytics')?.label).toBe('Analytics')
    expect(PINNED_ITEMS.map((item) => item.path)).toEqual(['/settings'])
  })

  it('keeps unique keys, paths and valid owners on shell entries', () => {
    const items = NAV_SECTIONS.flatMap((section) => section.items)
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length)
    expect(new Set(items.map((item) => item.path)).size).toBe(items.length)
    for (const item of SHELL_SURFACES) {
      expect(item.owner).toMatch(/^stream:/)
      expect(item.flag).toBeTruthy()
      expect(item.permission).toBeTruthy()
    }
  })

  it('hides new surfaces while their flag is off', () => {
    const sections = visibleSections({ role: 'super_admin', flags: flags() })
    const labels = sections.flatMap((section) => section.items.map((item) => item.label))
    expect(labels).not.toContain('Recognition')
    expect(labels).not.toContain('Species')
  })

  it('shows a surface once its flag is on and the role holds the permission', () => {
    const sections = visibleSections({ role: 'super_admin', flags: flags({ species: true }) })
    expect(sections.flatMap((section) => section.items.map((item) => item.label))).toContain(
      'Species',
    )
  })

  it('gates the new surfaces on the canonical permission', () => {
    const species = findNavItem('/programme/species')!
    expect(isItemVisible(species, { role: 'organizer', flags: flags({ species: true }) })).toBe(false)
    expect(isItemVisible(species, { role: 'moderator', flags: flags({ species: true }) })).toBe(true)
    expect(isItemVisible(species, { role: 'user', flags: flags({ species: true }) })).toBe(false)
  })

  it('keeps legacy screens gated by the legacy RBAC resources', () => {
    expect(visibleSections({ role: 'user', flags: flags() })).toEqual([])
    expect(
      visibleSections({ role: 'content_editor', flags: flags() }).flatMap((section) =>
        section.items.map((item) => item.label),
      ),
    ).toContain('Then & Now')
    expect(
      visibleSections({ role: 'moderator', flags: flags() }).flatMap((section) =>
        section.items.map((item) => item.label),
      ),
    ).toContain('Analytics')
  })
})
