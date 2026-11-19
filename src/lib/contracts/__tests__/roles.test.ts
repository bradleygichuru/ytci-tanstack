import { describe, expect, it } from 'vitest'
import {
  ACTOR_SEPARATIONS,
  ASSIGNMENT_DUTIES,
  DEFAULT_ROLE,
  PERMISSIONS,
  PERMISSION_ROLES,
  ROLE_KEYS,
  ROLES_CONTRACT_VERSION,
  canAccessAdmin,
  canPublish,
  findActorSeparationViolation,
  isRole,
  normaliseRole,
  permissionsForRole,
  roleCanAny,
  roleHasPermission,
  type Role,
} from '#/lib/contracts/roles'

describe('canonical role model', () => {
  it('is the frozen 1.0.0 contract', () => {
    expect(ROLES_CONTRACT_VERSION).toBe('1.0.0')
    expect(ROLE_KEYS).toHaveLength(11)
  })

  it('treats publisher as a permission, not a role', () => {
    expect((ROLE_KEYS as readonly string[]).includes('publisher')).toBe(false)
    const publishers = ROLE_KEYS.filter((role) =>
      roleCanAny(role, ['species.publish', 'events.publish', 'recognition.publish_rule']),
    )
    expect(publishers).toEqual(['administrator', 'super_admin'])
  })

  it('keeps publish off authoring and moderation roles', () => {
    for (const role of ['user', 'content_editor', 'moderator', 'county_officer'] as Role[]) {
      expect(canPublish(role)).toBe(false)
    }
    expect(canPublish('administrator')).toBe(true)
  })

  it('models scanner as an assignment, not a role', () => {
    expect(ASSIGNMENT_DUTIES.scanner.permissions).toEqual(['events.scan'])
    expect(ASSIGNMENT_DUTIES.scanner.source).toBe('organizer_staff')
  })

  it('gives moderators read-only admin access', () => {
    expect(canAccessAdmin('moderator')).toBe(true)
    expect(roleHasPermission('moderator', 'species.publish')).toBe(false)
    expect(roleHasPermission('moderator', 'recognition.disqualify')).toBe(false)
  })

  it('reserves reversals for super admins', () => {
    for (const permission of [
      'recognition.disqualify',
      'recognition.approve_adjustment',
      'recognition.approve_backfill',
      'recognition.kill_switch',
      'species.rights_withdraw',
      'events.revoke_organizer',
    ] as const) {
      expect(PERMISSION_ROLES[permission]).toEqual(['super_admin'])
    }
  })

  it('blocks self-publish through actor separations', () => {
    expect(
      findActorSeparationViolation('recognition.publish_rule', ['recognition.author_rule']),
    ).toMatchObject({ name: 'publisher_is_not_author' })
    expect(findActorSeparationViolation('recognition.publish_rule', [])).toBeNull()
    expect(ACTOR_SEPARATIONS.map((rule) => rule.name)).toContain('xp_approver_is_not_adjuster')
  })

  it('normalises untrusted role values to least privilege', () => {
    expect(normaliseRole('SUPER_ADMIN')).toBe('super_admin')
    expect(normaliseRole(' admin ')).toBe(DEFAULT_ROLE)
    expect(normaliseRole(null)).toBe(DEFAULT_ROLE)
    expect(isRole('translator')).toBe(true)
    expect(isRole('publisher')).toBe(false)
  })

  it('admits content and review roles to the admin shell', () => {
    for (const role of [
      'content_editor',
      'species_expert',
      'translator',
      'language_reviewer',
      'rights_reviewer',
    ]) {
      expect(isRole(role)).toBe(true)
      expect(permissionsForRole(role as Role).length).toBeGreaterThan(0)
      expect(canAccessAdmin(role as Role)).toBe(true)
    }
  })

  it('points every permission at a declared role', () => {
    for (const permission of PERMISSIONS) {
      for (const role of PERMISSION_ROLES[permission]) {
        expect(isRole(role)).toBe(true)
      }
    }
  })
})
