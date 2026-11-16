import { describe, it, expect } from 'vitest'
import { canAudioStory, isAudioStoryReadOnly } from '../audio-story-permissions'

describe('audio story role gating', () => {
  it('lets content editors create, edit and submit', () => {
    expect(canAudioStory('content_editor', 'create')).toBe(true)
    expect(canAudioStory('content_editor', 'edit')).toBe(true)
    expect(canAudioStory('content_editor', 'submit')).toBe(true)
    expect(canAudioStory('content_editor', 'read')).toBe(true)
    expect(isAudioStoryReadOnly('content_editor')).toBe(false)
  })

  it('lets administrators author and submit', () => {
    expect(canAudioStory('administrator', 'create')).toBe(true)
    expect(canAudioStory('administrator', 'submit')).toBe(true)
  })

  it('keeps moderators read-only', () => {
    expect(canAudioStory('moderator', 'read')).toBe(true)
    expect(canAudioStory('moderator', 'create')).toBe(false)
    expect(canAudioStory('moderator', 'edit')).toBe(false)
    expect(canAudioStory('moderator', 'submit')).toBe(false)
    expect(isAudioStoryReadOnly('moderator')).toBe(true)
  })

  it('denies unknown and signed-out roles', () => {
    expect(canAudioStory('user', 'read')).toBe(false)
    expect(canAudioStory(undefined, 'read')).toBe(false)
    expect(isAudioStoryReadOnly(undefined)).toBe(true)
  })
})
