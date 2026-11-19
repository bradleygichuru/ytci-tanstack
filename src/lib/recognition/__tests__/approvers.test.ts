import { describe, expect, it } from 'vitest'
import {
  canApproveAdjustment,
  eligibleApprovers,
  type ApproverDirectoryUser,
} from '../approvers'

const users: ApproverDirectoryUser[] = [
  { id: 'actor-1', name: 'Amina Admin', email: 'amina@example.ke', role: 'super_admin', banned: false },
  { id: 'super-2', name: 'Zawadi Approver', email: 'zawadi@example.ke', role: 'super_admin', banned: false },
  { id: 'super-banned', name: 'Banned Approver', email: 'banned@example.ke', role: 'super_admin', banned: true },
  { id: 'admin-1', name: 'Achieng Administrator', email: 'achieng@example.ke', role: 'administrator' },
  { id: 'mod-1', name: 'Moderator', email: 'mod@example.ke', role: 'moderator' },
  { id: 'reader-1', name: 'Reader', email: 'reader@example.ke', role: 'user' },
  { id: 'super-2', name: 'Zawadi Approver', email: 'zawadi@example.ke', role: 'super_admin' },
]

describe('adjustment approvers', () => {
  it('recognises the contract permission, not a role name', () => {
    expect(canApproveAdjustment('super_admin')).toBe(true)
    expect(canApproveAdjustment('administrator')).toBe(false)
    expect(canApproveAdjustment('moderator')).toBe(false)
    expect(canApproveAdjustment(undefined)).toBe(false)
  })

  it('lists only active users holding recognition.approve_adjustment', () => {
    const options = eligibleApprovers(users, 'someone-else')
    expect(options.map((option) => option.id)).toEqual(['actor-1', 'super-2'])
    expect(options.map((option) => option.role)).toEqual(['super_admin', 'super_admin'])
  })

  it('excludes the signed-in actor and de-duplicates the directory', () => {
    expect(eligibleApprovers(users, 'actor-1').map((option) => option.id)).toEqual(['super-2'])
    expect(eligibleApprovers(users, 'super-2').map((option) => option.id)).toEqual(['actor-1'])
    expect(eligibleApprovers(users, 'someone-else')).toHaveLength(2)
  })

  it('returns no approver when only the actor or inactive accounts qualify', () => {
    expect(
      eligibleApprovers(
        [
          { id: 'me', name: 'Me', role: 'super_admin', banned: false },
          { id: 'off', name: 'Off', role: 'super_admin', banned: true },
        ],
        'me'
      )
    ).toEqual([])
  })
})
