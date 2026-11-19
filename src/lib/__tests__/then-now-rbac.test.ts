import { describe, expect, it } from 'vitest'
import { hasPermission } from '../authz'

describe('Then & Now RBAC', () => {
  it('gives content editors draft and submit access only', () => {
    expect(hasPermission('content_editor', 'thenNow', ['read'])).toBe(true)
    expect(hasPermission('content_editor', 'thenNow', ['create'])).toBe(true)
    expect(hasPermission('content_editor', 'thenNow', ['edit'])).toBe(true)
    expect(hasPermission('content_editor', 'thenNow', ['submit'])).toBe(true)
    expect(hasPermission('content_editor', 'thenNow', ['review'])).toBe(false)
    expect(hasPermission('content_editor', 'thenNow', ['publish'])).toBe(false)
    expect(hasPermission('content_editor', 'thenNow', ['archive'])).toBe(false)
  })

  it('gives administrators review, publish, and rights access', () => {
    expect(hasPermission('administrator', 'thenNow', ['review'])).toBe(true)
    expect(hasPermission('administrator', 'thenNow', ['publish'])).toBe(true)
    expect(hasPermission('administrator', 'thenNow', ['unpublish'])).toBe(true)
    expect(hasPermission('administrator', 'thenNow', ['manage_rights'])).toBe(true)
    expect(hasPermission('administrator', 'thenNow', ['assign_reviewer'])).toBe(true)
    expect(hasPermission('administrator', 'thenNow', ['archive'])).toBe(false)
    expect(hasPermission('administrator', 'thenNow', ['revoke'])).toBe(false)
  })

  it('keeps moderators read-only', () => {
    expect(hasPermission('moderator', 'thenNow', ['read'])).toBe(true)
    expect(hasPermission('moderator', 'thenNow', ['edit'])).toBe(false)
    expect(hasPermission('moderator', 'thenNow', ['review'])).toBe(false)
    expect(hasPermission('moderator', 'thenNow', ['publish'])).toBe(false)
  })

  it('gives super-admins takedown and override access', () => {
    expect(hasPermission('super_admin', 'thenNow', ['archive'])).toBe(true)
    expect(hasPermission('super_admin', 'thenNow', ['revoke'])).toBe(true)
    expect(hasPermission('super_admin', 'thenNow', ['override_separation'])).toBe(true)
  })

  it('denies unrelated roles', () => {
    expect(hasPermission('county_officer', 'thenNow', ['read'])).toBe(false)
    expect(hasPermission('user', 'thenNow', ['read'])).toBe(false)
    expect(hasPermission(undefined, 'thenNow', ['read'])).toBe(false)
  })
})
