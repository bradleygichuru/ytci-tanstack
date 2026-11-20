import { roles } from '#/lib/rbac'

export type AudioStoryAction =
  | 'read'
  | 'create'
  | 'edit'
  | 'submit'
  | 'review'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'revoke'
  | 'restore'
  | 'assign-reviewer'
  | 'manage-rights'
  | 'hard-delete-draft'
  | 'override-separation'

/**
 * UI capability check for the Audio Stories surface.
 * The API remains the source of truth; this only hides actions a role
 * cannot perform, so a disabled button never implies permission.
 */
export function canAudioStory(role: string | undefined, action: AudioStoryAction): boolean {
  if (!role) return false
  const roleDefinition = (roles as Record<string, { authorize: (input: { audioStories: string[] }) => { success: boolean } }>)[role]
  if (!roleDefinition) return false
  // The role map uses the shared underscore action names; the UI reads the
  // hyphenated capability names from the audio-stories docs.
  return roleDefinition.authorize({ audioStories: [action.replace(/-/g, '_')] }).success
}

export function isAudioStoryReadOnly(role: string | undefined): boolean {
  return !canAudioStory(role, 'edit')
}

/** Administrators and super admins moderate the review queue and publish. */
export function canModerateAudioStories(role: string | undefined): boolean {
  return canAudioStory(role, 'review') && canAudioStory(role, 'publish')
}

export function canPublishAudioStories(role: string | undefined): boolean {
  return canAudioStory(role, 'publish')
}

/** Collections follow the same editorial authority as story publishing. */
export function canManageAudioCollections(role: string | undefined): boolean {
  return canAudioStory(role, 'publish')
}

export function canArchiveAudioStories(role: string | undefined): boolean {
  return canAudioStory(role, 'archive')
}

export function canRevokeAudioStories(role: string | undefined): boolean {
  return canAudioStory(role, 'revoke')
}

export function canRestoreAudioStories(role: string | undefined): boolean {
  return canAudioStory(role, 'restore')
}
