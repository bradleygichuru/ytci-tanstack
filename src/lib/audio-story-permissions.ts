import { roles } from '#/lib/rbac'

export type AudioStoryAction = 'read' | 'create' | 'edit' | 'submit'

/**
 * UI capability check for the Audio Stories authoring surface.
 * The API remains the source of truth; this only hides actions a role
 * cannot perform, so a disabled button never implies permission.
 */
export function canAudioStory(role: string | undefined, action: AudioStoryAction): boolean {
  if (!role) return false
  const roleDefinition = (roles as Record<string, { authorize: (input: { audioStories: AudioStoryAction[] }) => { success: boolean } }>)[role]
  if (!roleDefinition) return false
  return roleDefinition.authorize({ audioStories: [action] }).success
}

export function isAudioStoryReadOnly(role: string | undefined): boolean {
  return !canAudioStory(role, 'edit')
}
