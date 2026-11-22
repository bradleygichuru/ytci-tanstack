import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CRITERIA,
  RUBRIC,
  isCriteriaInRange,
  weightedTotal,
} from '../scoring'

describe('competition scoring rubric', () => {
  it('uses the published rulebook weights', () => {
    expect(RUBRIC.map((item) => [item.key, item.weight])).toEqual([
      ['relevance', 25],
      ['craft', 30],
      ['originality', 25],
      ['impact', 20],
    ])
  })

  it('turns a flat 5 into 50 out of 100 and a perfect score into 100', () => {
    expect(weightedTotal(DEFAULT_CRITERIA)).toBe(50)
    expect(
      weightedTotal({ relevance: 10, craft: 10, originality: 10, impact: 10 }),
    ).toBe(100)
  })

  it('weights craft and relevance differently', () => {
    expect(
      weightedTotal({ relevance: 8, craft: 7, originality: 9, impact: 6 }),
    ).toBe(75.5)
    expect(
      weightedTotal({ relevance: 10, craft: 1, originality: 10, impact: 10 }),
    ).toBe(73)
  })

  it('rejects scores outside the 1 to 10 scale', () => {
    expect(isCriteriaInRange(DEFAULT_CRITERIA)).toBe(true)
    expect(isCriteriaInRange({ ...DEFAULT_CRITERIA, relevance: 0 })).toBe(false)
    expect(isCriteriaInRange({ ...DEFAULT_CRITERIA, craft: 11 })).toBe(false)
    expect(isCriteriaInRange({ ...DEFAULT_CRITERIA, impact: Number.NaN })).toBe(false)
  })
})
