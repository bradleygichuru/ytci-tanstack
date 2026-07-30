import { describe, it, expect } from 'vitest'
import { requirePermission } from '#/lib/authz'
import { toUserItem, getValidRoles } from '#/lib/users.functions'

describe('requirePermission — users resource', () => {
  it('super_admin can read users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['read'])).not.toThrow()
  })

  it('super_admin can assign roles', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['assign-role'])).not.toThrow()
  })

  it('super_admin can suspend users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['suspend-user'])).not.toThrow()
  })

  it('super_admin can create users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['create'])).not.toThrow()
  })

  it('administrator can read users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['read'])).not.toThrow()
  })

  it('administrator can edit users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['edit'])).not.toThrow()
  })

  it('administrator cannot assign roles', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['assign-role'])).toThrow('Forbidden')
  })

  it('administrator cannot suspend users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['suspend-user'])).toThrow('Forbidden')
  })

  it('administrator can create users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['create'])).not.toThrow()
  })

  it('super_admin can update users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['update'])).not.toThrow()
  })

  it('super_admin can set-role', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['set-role'])).not.toThrow()
  })

  it('super_admin can ban users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['ban'])).not.toThrow()
  })

  it('super_admin can list users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'user', ['list'])).not.toThrow()
  })

  it('administrator can update users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['update'])).not.toThrow()
  })

  it('administrator cannot set-role', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['set-role'])).toThrow('Forbidden')
  })

  it('administrator cannot ban users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'user', ['ban'])).toThrow('Forbidden')
  })

  it('moderator cannot read users', () => {
    expect(() => requirePermission({ user: { role: 'moderator' } }, 'user', ['read'])).toThrow('Forbidden')
  })

  it('county_officer cannot read users', () => {
    expect(() => requirePermission({ user: { role: 'county_officer' } }, 'user', ['read'])).toThrow('Forbidden')
  })

  it('null session throws Unauthorized', () => {
    expect(() => requirePermission(null, 'user', ['read'])).toThrow('Unauthorized')
  })
})

describe('toUserItem', () => {
  it('returns consentGrantedAt as ISO string when profile has consentGrantedAt', () => {
    const date = new Date('2025-06-01T00:00:00Z')
    const result = toUserItem(
      { id: '1', email: 'a@b.com', name: 'A', role: 'administrator', banned: false, banReason: null, banExpires: null, emailVerified: true, createdAt: new Date().toISOString() },
      { ageRange: null, county: 'Nairobi', languages: null, preferences: null, consentGrantedAt: date, createdBy: 'admin-1' },
    )
    expect(result.consentGrantedAt).toBe('2025-06-01T00:00:00.000Z')
    expect(result.county).toBe('Nairobi')
    expect(result.createdBy).toBe('admin-1')
  })

  it('returns null consentGrantedAt when profile has no consent', () => {
    const result = toUserItem(
      { id: '1', email: 'a@b.com', name: 'A', role: 'moderator', banned: true, banReason: 'test', banExpires: null, emailVerified: false, createdAt: new Date().toISOString() },
      { ageRange: null, county: null, languages: null, preferences: null, consentGrantedAt: null, createdBy: 'admin-1' },
    )
    expect(result.consentGrantedAt).toBeNull()
    expect(result.banned).toBe(true)
    expect(result.banReason).toBe('test')
  })

  it('defaults role to user when user has no role', () => {
    const result = toUserItem(
      { id: '1', email: 'a@b.com', name: 'A' },
    )
    expect(result.role).toBe('user')
  })
})

describe('getValidRoles', () => {
  it('returns the five admin roles', () => {
    const roles = getValidRoles()
    expect(roles).toHaveLength(5)
    expect(roles).toContain('super_admin')
    expect(roles).toContain('administrator')
    expect(roles).toContain('moderator')
    expect(roles).toContain('county_officer')
    expect(roles).toContain('user')
  })
})
