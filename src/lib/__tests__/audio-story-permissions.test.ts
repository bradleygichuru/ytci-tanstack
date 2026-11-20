import { describe, it, expect } from 'vitest'
import {
  canAudioStory, canArchiveAudioStories, canManageAudioCollections, canModerateAudioStories,
  canPublishAudioStories, canRestoreAudioStories, canRevokeAudioStories, isAudioStoryReadOnly,
} from '../audio-story-permissions'

describe('audio story role gating', () => {
  it('lets content editors create, edit and submit', () => {
    expect(canAudioStory('content_editor', 'create')).toBe(true)
    expect(canAudioStory('content_editor', 'edit')).toBe(true)
    expect(canAudioStory('content_editor', 'submit')).toBe(true)
    expect(canAudioStory('content_editor', 'read')).toBe(true)
    expect(isAudioStoryReadOnly('content_editor')).toBe(false)
  })

  it('keeps review and publishing away from content editors', () => {
    expect(canAudioStory('content_editor', 'review')).toBe(false)
    expect(canAudioStory('content_editor', 'publish')).toBe(false)
    expect(canAudioStory('content_editor', 'archive')).toBe(false)
    expect(canModerateAudioStories('content_editor')).toBe(false)
    expect(canManageAudioCollections('content_editor')).toBe(false)
  })

  it('lets administrators author, review, publish and manage collections', () => {
    expect(canAudioStory('administrator', 'create')).toBe(true)
    expect(canAudioStory('administrator', 'submit')).toBe(true)
    expect(canAudioStory('administrator', 'review')).toBe(true)
    expect(canAudioStory('administrator', 'publish')).toBe(true)
    expect(canAudioStory('administrator', 'unpublish')).toBe(true)
    expect(canAudioStory('administrator', 'assign-reviewer')).toBe(true)
    expect(canModerateAudioStories('administrator')).toBe(true)
    expect(canPublishAudioStories('administrator')).toBe(true)
    expect(canManageAudioCollections('administrator')).toBe(true)
    expect(canArchiveAudioStories('administrator')).toBe(false)
    expect(canRevokeAudioStories('administrator')).toBe(false)
    expect(canRestoreAudioStories('administrator')).toBe(false)
  })

  it('reserves archive, revoke and restore for super admins', () => {
    expect(canArchiveAudioStories('super_admin')).toBe(true)
    expect(canRevokeAudioStories('super_admin')).toBe(true)
    expect(canRestoreAudioStories('super_admin')).toBe(true)
    expect(canModerateAudioStories('super_admin')).toBe(true)
    expect(canManageAudioCollections('super_admin')).toBe(true)
  })

  it('keeps moderators read-only', () => {
    expect(canAudioStory('moderator', 'read')).toBe(true)
    expect(canAudioStory('moderator', 'create')).toBe(false)
    expect(canAudioStory('moderator', 'edit')).toBe(false)
    expect(canAudioStory('moderator', 'submit')).toBe(false)
    expect(canAudioStory('moderator', 'review')).toBe(false)
    expect(isAudioStoryReadOnly('moderator')).toBe(true)
    expect(canModerateAudioStories('moderator')).toBe(false)
  })

  it('denies unknown and signed-out roles', () => {
    expect(canAudioStory('user', 'read')).toBe(false)
    expect(canAudioStory(undefined, 'read')).toBe(false)
    expect(canModerateAudioStories(undefined)).toBe(false)
    expect(canManageAudioCollections(undefined)).toBe(false)
    expect(isAudioStoryReadOnly(undefined)).toBe(true)
  })
})
