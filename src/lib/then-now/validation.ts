import type { Experience, HeritageSite } from './types'

export function validateSiteDraft(
  site: Pick<HeritageSite, 'name' | 'county' | 'type' | 'access' | 'sensitivity'>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!site.name.trim()) errors.name = 'Site name is required'
  if (!site.county.trim()) errors.county = 'County is required'
  if (!site.type) errors.type = 'Site type is required'
  if (!site.access) errors.access = 'Access mode is required'
  if (!site.sensitivity) errors.sensitivity = 'Sensitivity is required'
  return errors
}

export function validateExperienceDraft(
  exp: Pick<Experience, 'title' | 'duration' | 'textCards'>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!exp.title.trim()) errors.title = 'Experience title is required'
  if (!Number.isFinite(exp.duration) || exp.duration < 30 || exp.duration > 180) {
    errors.duration = 'Duration must be between 30 and 180 seconds'
  }
  if (exp.textCards.length > 3) errors.textCards = 'Three text cards is the v1 maximum'
  return errors
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}
