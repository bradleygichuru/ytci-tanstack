import type {
  Experience,
  HeritageSite,
  Readiness,
  ReadinessItem,
} from './types'

function add(items: ReadinessItem[], section: ReadinessItem['section'], label: string) {
  items.push({ section, label })
}

export function experienceReadiness(exp: Experience): Readiness {
  const authoringBlockers: ReadinessItem[] = []
  const warnings: ReadinessItem[] = []

  if (!exp.title.trim()) add(authoringBlockers, 'story', 'Title')
  if (!exp.promise.trim()) add(authoringBlockers, 'story', 'Promise')
  if (!exp.story.trim()) add(authoringBlockers, 'story', 'Story')
  if (!exp.videoMaster) add(authoringBlockers, 'media', 'Site video master')
  if (
    !exp.renditions['1080'] ||
    exp.renditions['1080'] === 'Missing' ||
    (exp.renditionKeys !== undefined && !exp.renditionKeys['1080'])
  ) {
    add(authoringBlockers, 'media', '1080p video file')
  }
  if (!exp.poster || (exp.posterKey !== undefined && !exp.posterKey)) {
    add(authoringBlockers, 'media', 'Poster image')
  }
  if (!exp.captions.en || (exp.captionKeys !== undefined && !exp.captionKeys.en)) {
    add(authoringBlockers, 'accessibility', 'English captions')
  }
  if (!exp.transcript || (exp.transcriptKey !== undefined && !exp.transcriptKey)) {
    add(authoringBlockers, 'accessibility', 'Transcript')
  }
  if (!exp.rights.trim()) add(authoringBlockers, 'rights', 'Rights record')
  if (!exp.consent.trim()) add(authoringBlockers, 'rights', 'Cultural authority / consent')
  if (exp.textCards.filter((card) => card.text.trim()).length < 2) {
    add(authoringBlockers, 'cards', 'At least two text cards')
  }

  const reviewBlockers: ReadinessItem[] = []
  if (exp.draftStatus === 'in_review') {
    add(reviewBlockers, 'review', 'Review decision')
  } else if (
    exp.liveRevision > 0 &&
    exp.draftRevision > exp.liveRevision &&
    exp.draftStatus !== 'approved' &&
    exp.draftStatus !== 'published'
  ) {
    add(reviewBlockers, 'review', `Review approval for v${exp.draftRevision}`)
  }

  if (exp.languages.includes('SW') && !exp.captions.sw) {
    add(warnings, 'accessibility', 'Swahili captions')
  }
  if (!exp.audioDescription) add(warnings, 'accessibility', 'Audio description')
  if (!exp.renditions['540']) add(warnings, 'media', '540p video file')

  const blockers = [...authoringBlockers, ...reviewBlockers]
  return {
    blockers,
    warnings,
    readyToSubmit: authoringBlockers.length === 0 && exp.draftStatus === 'draft',
    readyToPublish:
      blockers.length === 0 &&
      exp.draftStatus === 'approved' &&
      exp.status !== 'archived' &&
      exp.status !== 'revoked',
  }
}

export function siteReadiness(
  site: HeritageSite,
  experiences: Record<string, Experience>,
): Readiness {
  const blockers: ReadinessItem[] = []
  const warnings: ReadinessItem[] = []

  if (!site.name.trim()) add(blockers, 'identity', 'Name')
  if (!site.county.trim()) add(blockers, 'identity', 'County')
  if (!site.type) add(blockers, 'identity', 'Site type')
  if (!site.access) add(blockers, 'policy', 'Access mode')
  if (!site.sensitivity) add(blockers, 'policy', 'Sensitivity')
  if (!site.photography.trim()) add(blockers, 'policy', 'Photography policy')
  if (!site.culturalAuthority.trim()) add(blockers, 'policy', 'Cultural authority')
  if (!site.consent.trim()) add(blockers, 'policy', 'Consent record')

  const published = site.experiences
    .map((id) => experiences[id])
    .filter((exp): exp is Experience => Boolean(exp) && exp.status === 'published')
  if (published.length === 0) {
    add(blockers, 'experiences', 'At least one published experience')
  }
  if (site.access === 'not_available') {
    add(warnings, 'policy', 'Access mode is not available yet')
  }

  return {
    blockers,
    warnings,
    readyToSubmit: false,
    readyToPublish: blockers.length === 0,
  }
}
