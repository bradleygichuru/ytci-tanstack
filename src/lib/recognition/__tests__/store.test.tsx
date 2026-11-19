import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { api } = vi.hoisted(() => ({
  api: {
    listRules: vi.fn(),
    createRule: vi.fn(),
    publishRule: vi.fn(),
    simulateRule: vi.fn(),
    listBadges: vi.fn(),
    createBadge: vi.fn(),
    publishBadge: vi.fn(),
    listSeasons: vi.fn(),
    createSeason: vi.fn(),
    publishSeason: vi.fn(),
    freezeSeason: vi.fn(),
    closeSeason: vi.fn(),
    listModeration: vi.fn(),
    decideModeration: vi.fn(),
    listBackfill: vi.fn(),
    createBackfill: vi.fn(),
    approveBackfill: vi.fn(),
    createAdjustment: vi.fn(),
    listKillSwitches: vi.fn(),
    setKillSwitch: vi.fn(),
    listAudit: vi.fn(),
    getLeaderboard: vi.fn(),
    stale: vi.fn(),
  },
}))

vi.mock('../api', () => ({ createRecognitionApi: () => api }))
vi.mock('@tanstack/react-router', () => ({
  useRouteContext: () => ({
    user: { id: 'admin-1', name: 'Admin One', role: 'administrator' },
  }),
}))
vi.mock('#/lib/toast', () => ({
  notify: { saved: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

import { notify } from '#/lib/toast'
import { RecognitionProvider, useRecognition, type RecognitionContextValue } from '../store'
import type { RuleDraft } from '../types'

const RULE_ID = '11111111-1111-4111-8111-111111111111'
const SEASON_ID = '22222222-2222-4222-8222-222222222222'

const contractRule = {
  id: RULE_ID,
  ruleKey: 'event.attendance',
  version: 3,
  sourceType: 'event',
  status: 'published' as const,
  effectiveFrom: '2026-11-01T00:00:00+03:00',
  criteria: { name: 'Event attendance', event: 'ke.event.attended.v1', verify: 'QR check-in' },
  xpAmount: 60,
  badgeKey: 'event_attended',
  createdBy: 'editor-1',
  publishedBy: 'admin-2',
}

const contractBadge = {
  badgeKey: 'event_attended',
  nameEn: 'Event attendee',
  nameSw: 'Mhudhuriaji',
  family: 'Events',
  criteria: { label: 'First verified check-in' },
  privacyClass: 'public' as const,
  hidden: false,
  publicEligible: true,
  status: 'published' as const,
  version: 2,
}

const contractSeason = {
  key: '2026-q4',
  nameEn: 'Season of the Rift',
  nameSw: 'Msimu wa Bonde',
  startsAt: '2026-10-01T00:00:00+03:00',
  endsAt: '2026-12-31T23:59:59+03:00',
  status: 'active' as const,
  badgeKey: 'season_q4_2026',
  xpAward: 500,
  missionFamilies: ['Events'],
}

function switches() {
  return [
    { key: 'global', enabled: true, reason: 'on', updatedBy: 'admin-2', updatedAt: '2026-11-18T00:00:00Z' },
    {
      key: 'public_leaderboard',
      enabled: true,
      reason: 'on',
      updatedBy: 'admin-2',
      updatedAt: '2026-11-18T00:00:00Z',
    },
    { key: 'source:audio', enabled: true, reason: null, updatedBy: null, updatedAt: '2026-11-18T00:00:00Z' },
    { key: 'source:event', enabled: true, reason: null, updatedBy: null, updatedAt: '2026-11-18T00:00:00Z' },
  ]
}

function liveApi() {
  api.listRules.mockResolvedValue([contractRule])
  api.listBadges.mockResolvedValue([contractBadge])
  api.listSeasons.mockResolvedValue([contractSeason])
  api.listModeration.mockResolvedValue([])
  api.listBackfill.mockResolvedValue([])
  api.listKillSwitches.mockResolvedValue(switches())
  api.listAudit.mockResolvedValue([])
  api.getLeaderboard.mockResolvedValue({
    seasonKey: '2026-q4',
    suppressed: false,
    entries: [
      {
        rank: 1,
        displayName: 'RiftReader',
        county: 'Nakuru',
        level: 2,
        publicBadgeCount: 6,
        verifiedSites: 17,
        trailCompletions: 6,
        isSelf: false,
      },
    ],
  })
}

let ctx: RecognitionContextValue | null = null

function Probe() {
  ctx = useRecognition()
  return null
}

async function mount() {
  ctx = null
  render(
    <RecognitionProvider>
      <Probe />
    </RecognitionProvider>
  )
  await waitFor(() => expect(ctx?.apiStatus).not.toBe('loading'))
  return ctx as RecognitionContextValue
}

beforeEach(() => {
  vi.clearAllMocks()
  liveApi()
})

afterEach(() => {
  cleanup()
})

describe('recognition store provenance', () => {
  it('keeps exactly the contract rows when every read answers', async () => {
    const value = await mount()
    await waitFor(() => expect(value.state.rules).toHaveLength(1))
    expect(value.state.rules.map((rule) => rule.id)).toEqual([RULE_ID])
    expect(value.state.badges.map((badge) => badge.badgeKey)).toEqual(['event_attended'])
    expect(value.state.seasons.map((season) => season.key)).toEqual(['2026-q4'])
    expect(value.state.missions).toHaveLength(0)
    expect(value.state.awards).toHaveLength(0)
    expect(value.source).toBe('api')
    expect(value.state.rules[0].provenance).toBe('api')
  })

  it('falls back to labelled sample rows only when every read fails', async () => {
    const failure = () => Promise.reject(new Error('offline'))
    api.listRules.mockImplementation(failure)
    api.listBadges.mockImplementation(failure)
    api.listSeasons.mockImplementation(failure)
    api.listModeration.mockImplementation(failure)
    api.listBackfill.mockImplementation(failure)
    api.listKillSwitches.mockImplementation(failure)
    api.listAudit.mockImplementation(failure)
    api.getLeaderboard.mockImplementation(failure)

    const value = await mount()
    await waitFor(() => expect(value.apiStatus).toBe('error'))
    expect(value.source).toBe('sample')
    expect(value.state.rules.length).toBeGreaterThan(1)
    expect(value.state.rules.every((rule) => rule.provenance === 'sample')).toBe(true)
    expect(value.state.badges.length).toBeGreaterThan(1)
    expect(value.apiError).toMatch(/did not answer any recognition read/i)
  })

  it('reports a mixed read as mixed and never as contract data', async () => {
    api.listBadges.mockRejectedValue(new Error('badge read failed'))
    const value = await mount()
    await waitFor(() => expect(value.state.rules).toHaveLength(1))
    expect(value.state.badges.length).toBeGreaterThan(1)
    expect(value.source).toBe('mixed')
    expect(value.errors.badges).toMatch(/badge read failed/i)
  })
})

describe('recognition store writes', () => {
  it('creates a rule through the API and refetches', async () => {
    const value = await mount()
    const draft: RuleDraft = {
      name: 'Verified heritage visit',
      sourceType: 'heritage_visit',
      event: 'ke.heritage.visit.v1',
      verify: 'Site steward check-in',
      xpAmount: 40,
      badgeKey: 'none',
      effectiveFrom: '2026-12-01',
    }
    api.createRule.mockResolvedValue({ ...contractRule, id: RULE_ID, status: 'draft' })

    await act(async () => {
      await value.actions.createRule('heritage.visit.verified', draft)
    })

    expect(api.createRule).toHaveBeenCalledWith({
      ruleKey: 'heritage.visit.verified',
      sourceType: 'heritage_visit',
      effectiveFrom: '2026-12-01',
      criteria: {
        name: 'Verified heritage visit',
        event: 'ke.heritage.visit.v1',
        verify: 'Site steward check-in',
      },
      xpAmount: 40,
      badgeKey: null,
    })
    expect(api.listRules).toHaveBeenCalledTimes(2)
    expect(vi.mocked(notify.saved)).toHaveBeenCalledWith('Rule draft created')
  })

  it('creates a badge through the API and refetches', async () => {
    const value = await mount()
    api.createBadge.mockResolvedValue(contractBadge)

    await act(async () => {
      await value.actions.createBadge({
        badgeKey: 'heritage_keeper',
        nameEn: 'Heritage keeper',
        nameSw: 'Mlezi wa urithi',
        family: 'Heritage',
      })
    })

    expect(api.createBadge).toHaveBeenCalledWith(
      expect.objectContaining({ badgeKey: 'heritage_keeper', nameEn: 'Heritage keeper' })
    )
    expect(api.listBadges).toHaveBeenCalledTimes(2)
  })

  it('creates a season through the API and refetches', async () => {
    const value = await mount()
    api.createSeason.mockResolvedValue(contractSeason)

    await act(async () => {
      await value.actions.createSeason({
        key: '2027-q1',
        nameEn: 'Roots',
        startsAt: '2027-01-01T00:00:00+03:00',
        endsAt: '2027-03-31T23:59:59+03:00',
      })
    })

    expect(api.createSeason).toHaveBeenCalledWith(
      expect.objectContaining({ key: '2027-q1', nameEn: 'Roots', xpAward: 500 })
    )
    expect(api.listSeasons).toHaveBeenCalledTimes(2)
  })

  it('leaves the UI unchanged and shows the error when a create is rejected', async () => {
    const value = await mount()
    const before = value.state.badges
    api.createBadge.mockRejectedValue(new Error('forbidden by the contract'))

    await expect(
      act(async () => {
        await value.actions.createBadge({
          badgeKey: 'nope',
          nameEn: 'Nope',
          family: 'Events',
        })
      })
    ).rejects.toThrow(/forbidden by the contract/)

    expect(value.state.badges).toBe(before)
    expect(api.listBadges).toHaveBeenCalledTimes(1)
    expect(vi.mocked(notify.saved)).not.toHaveBeenCalled()
  })

  it('does not toast published when the publish is rejected', async () => {
    const value = await mount()
    const beforeBadges = value.state.badges
    api.publishBadge.mockRejectedValue(new Error('second administrator required'))

    await expect(
      act(async () => {
        await value.actions.publishBadge('event_attended')
      })
    ).rejects.toThrow(/second administrator required/)

    expect(api.publishBadge).toHaveBeenCalledWith('event_attended')
    expect(value.state.badges).toBe(beforeBadges)
    expect(vi.mocked(notify.saved)).not.toHaveBeenCalled()
  })

  it('sends the season UUID, never the key, and refuses without an id', async () => {
    const value = await mount()
    api.publishSeason.mockResolvedValue(contractSeason)

    await expect(
      act(async () => {
        await value.actions.publishSeason('2026-q4')
      })
    ).rejects.toThrow(/Season read exposes only the key/)

    expect(api.publishSeason).not.toHaveBeenCalled()
    expect(vi.mocked(notify.saved)).not.toHaveBeenCalled()
  })

  it('publishes a season by UUID when the read model exposes it', async () => {
    api.listSeasons.mockResolvedValue([{ ...contractSeason, id: SEASON_ID, status: 'upcoming' }])
    const value = await mount()
    api.publishSeason.mockResolvedValue({ ...contractSeason, status: 'active' })

    await act(async () => {
      await value.actions.publishSeason('2026-q4')
    })

    expect(api.publishSeason).toHaveBeenCalledWith(SEASON_ID)
    expect(api.listSeasons).toHaveBeenCalledTimes(2)
    expect(vi.mocked(notify.saved)).toHaveBeenCalledWith('Season published')
  })

  it('publishes only a simulated contract draft', async () => {
    api.listRules.mockResolvedValue([{ ...contractRule, status: 'draft' }])
    const value = await mount()
    await waitFor(() => expect(value.state.rules[0]?.status).toBe('draft'))
    const draft: RuleDraft = {
      name: 'Event attendance',
      sourceType: 'event',
      event: 'ke.event.attended.v1',
      verify: 'QR check-in',
      xpAmount: 60,
      badgeKey: 'event_attended',
      effectiveFrom: '2026-11-01',
    }
    api.simulateRule.mockResolvedValue({
      ruleKey: 'event.attendance',
      version: 3,
      evaluated: 40,
      wouldAward: 12,
      wouldDeduct: 0,
      notes: null,
    })
    api.publishRule.mockResolvedValue({ ...contractRule, status: 'published' })

    await act(async () => {
      await value.actions.simulateRule('event.attendance', draft)
    })
    await waitFor(() => expect(ctx?.simulations['event.attendance']).toBeDefined())
    await act(async () => {
      await (ctx as RecognitionContextValue).actions.publishRule('event.attendance', draft)
    })

    expect(api.simulateRule).toHaveBeenCalledWith(RULE_ID)
    expect(api.publishRule).toHaveBeenCalledWith(RULE_ID)
    expect(api.listRules).toHaveBeenCalledTimes(2)
    expect(vi.mocked(notify.saved)).toHaveBeenCalledWith('Rule published')
  })
})
