import { describe, it, expect } from 'vitest'
import { requirePermission } from '#/lib/authz'

describe('requirePermission — users resource', () => {
  it('super_admin can read users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'users', ['read'])).not.toThrow()
  })

  it('super_admin can assign roles', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'users', ['assign-role'])).not.toThrow()
  })

  it('super_admin can suspend users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'users', ['suspend-user'])).not.toThrow()
  })

  it('super_admin can create users', () => {
    expect(() => requirePermission({ user: { role: 'super_admin' } }, 'users', ['create'])).not.toThrow()
  })

  it('administrator can read users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'users', ['read'])).not.toThrow()
  })

  it('administrator can edit users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'users', ['edit'])).not.toThrow()
  })

  it('administrator cannot assign roles', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'users', ['assign-role'])).toThrow('Forbidden')
  })

  it('administrator cannot suspend users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'users', ['suspend-user'])).toThrow('Forbidden')
  })

  it('administrator can create users', () => {
    expect(() => requirePermission({ user: { role: 'administrator' } }, 'users', ['create'])).not.toThrow()
  })

  it('moderator cannot read users', () => {
    expect(() => requirePermission({ user: { role: 'moderator' } }, 'users', ['read'])).toThrow('Forbidden')
  })

  it('county_officer cannot read users', () => {
    expect(() => requirePermission({ user: { role: 'county_officer' } }, 'users', ['read'])).toThrow('Forbidden')
  })

  it('null session throws Unauthorized', () => {
    expect(() => requirePermission(null, 'users', ['read'])).toThrow('Unauthorized')
  })
})
