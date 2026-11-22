/**
 * Judging rubric for the award programme.
 *
 * Rows are the rulebook weights: relevance 25, craft 30, originality 25,
 * impact 20. Judges score each criterion from 1 to 10. The weighted total is
 * expressed out of 100.
 */
export const RUBRIC = [
  { key: 'relevance', label: 'Relevance to the theme', weight: 25 },
  { key: 'craft', label: 'Craft', weight: 30 },
  { key: 'originality', label: 'Originality', weight: 25 },
  { key: 'impact', label: 'Impact and story', weight: 20 },
] as const

export type CriteriaKey = (typeof RUBRIC)[number]['key']

export type Criteria = Record<CriteriaKey, number>

export const DEFAULT_CRITERIA: Criteria = {
  relevance: 5,
  craft: 5,
  originality: 5,
  impact: 5,
}

export function isCriteriaInRange(criteria: Criteria): boolean {
  return RUBRIC.every(({ key }) => {
    const value = criteria[key]
    return Number.isFinite(value) && value >= 1 && value <= 10
  })
}

/** Weighted total out of 100, rounded to two decimals. */
export function weightedTotal(criteria: Criteria): number {
  const total = RUBRIC.reduce((sum, item) => sum + criteria[item.key] * item.weight, 0)
  return Math.round((total / 10) * 100) / 100
}
