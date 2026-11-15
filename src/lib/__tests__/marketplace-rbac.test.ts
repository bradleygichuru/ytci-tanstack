import { describe, it, expect } from 'vitest'
import { requirePermission } from '#/lib/authz'

describe('marketplace RBAC', () => {
  it('super_admin can read and write', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'marketplace', ['read', 'create', 'edit', 'delete', 'publish'])).not.toThrow()
  })

  it('administrator can read and write', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'marketplace', ['read', 'create', 'edit', 'delete', 'publish'])).not.toThrow()
  })

  it('moderator can read but not write', () => {
    expect(() => requirePermission({ user: { role: 'moderator' } }, 'marketplace', ['read'])).not.toThrow()
    expect(() => requirePermission({ user: { role: 'moderator' } }, 'marketplace', ['create'])).toThrow('Forbidden')
  })

  it('county_officer can read but not write', () => {
    expect(() => requirePermission({ user: { role: 'county_officer' } }, 'marketplace', ['read'])).not.toThrow()
    expect(() => requirePermission({ user: { role: 'county_officer' } }, 'marketplace', ['edit'])).toThrow('Forbidden')
  })

  it('user has no marketplace access', () => {
    expect(() => requirePermission({ user: { role: 'user' } }, 'marketplace', ['read'])).toThrow('Forbidden')
  })
})
