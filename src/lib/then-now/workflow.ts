import { experienceReadiness } from './readiness'
import type {
  Experience,
  ExternalReviewer,
  ReviewNote,
} from './types'

export class ThenNowWorkflowError extends Error {
  constructor(
    message: string,
    public code:
      | 'readiness'
      | 'assignment'
      | 'separation'
      | 'second_reviewer'
      | 'restricted'
      | 'state'
      | 'material_change'
      | 'notes',
  ) {
    super(message)
    this.name = 'ThenNowWorkflowError'
  }
}

export function revisionSnapshot(exp: Experience): string {
  return JSON.stringify({
    title: exp.title,
    promise: exp.promise,
    story: exp.story,
    period: exp.period,
    contentNotes: exp.contentNotes,
    safetyNotes: exp.safetyNotes,
    sources: exp.sources,
    textCards: exp.textCards.map((card) => [card.at, card.text]),
  })
}

export function materialChangeNeeded(exp: Experience): boolean {
  if (exp.lastDecision !== 'rejected') return false
  if (!exp.rejectedSnapshot) return Boolean(exp.revisedSinceDecision === false)
  return revisionSnapshot(exp) === exp.rejectedSnapshot
}

export function submitRevision(exp: Experience, actor: string, at: string): Experience {
  if (exp.draftStatus !== 'draft') {
    throw new ThenNowWorkflowError('Only a draft revision can be submitted.', 'state')
  }
  const readiness = experienceReadiness(exp)
  if (!readiness.readyToSubmit) {
    throw new ThenNowWorkflowError('Resolve the blocking checks before submitting.', 'readiness')
  }
  if (materialChangeNeeded(exp)) {
    throw new ThenNowWorkflowError(
      'Make a material change before resubmitting a rejected revision.',
      'material_change',
    )
  }
  return {
    ...exp,
    draftStatus: 'in_review',
    submittedBy: actor,
    submittedAt: at,
    reviewer: 'Unassigned',
    lastDecision: null,
    updatedAt: at,
    lastSavedAt: at,
  }
}

export function assignReviewer(exp: Experience, reviewer: string, at: string): Experience {
  if (exp.draftStatus !== 'in_review') {
    throw new ThenNowWorkflowError('Assignment is only available while in review.', 'state')
  }
  if (reviewer === exp.uploadedBy) {
    throw new ThenNowWorkflowError('The uploader cannot review their own revision.', 'separation')
  }
  return { ...exp, reviewer, updatedAt: at }
}

export function reviewersFor(exp: Experience): string {
  return exp.reviewer
}

export function approveRevision(
  exp: Experience,
  actor: string,
  note: string,
  at: string,
): Experience {
  if (exp.draftStatus !== 'in_review') {
    throw new ThenNowWorkflowError('Only a frozen revision can be approved.', 'state')
  }
  if (exp.reviewer === 'Unassigned') {
    throw new ThenNowWorkflowError('Assign a reviewer before deciding.', 'assignment')
  }
  if (actor === exp.uploadedBy) {
    throw new ThenNowWorkflowError('The uploader cannot approve their own revision.', 'separation')
  }
  if (exp.sensitivity !== 'standard' && !exp.secondReviewerApproved) {
    throw new ThenNowWorkflowError(
      'Record the second reviewer before approving a sensitive revision.',
      'second_reviewer',
    )
  }
  if (exp.sensitivity === 'restricted') {
    throw new ThenNowWorkflowError(
      'Restricted content needs super-admin and legal resolution before approval.',
      'restricted',
    )
  }
  const reviewNotes: ReviewNote[] = note.trim()
    ? [{ author: actor, role: 'Reviewer', at, note: note.trim() }, ...exp.reviewNotes]
    : exp.reviewNotes
  return {
    ...exp,
    draftStatus: 'approved',
    lastDecision: 'approved',
    reviewer: actor,
    reviewNotes,
    updatedAt: at,
  }
}

export function requestChanges(
  exp: Experience,
  actor: string,
  note: string,
  at: string,
): Experience {
  if (exp.draftStatus !== 'in_review') {
    throw new ThenNowWorkflowError('Only a frozen revision can be returned for changes.', 'state')
  }
  if (exp.reviewer === 'Unassigned') {
    throw new ThenNowWorkflowError('Assign a reviewer before deciding.', 'assignment')
  }
  if (!note.trim()) {
    throw new ThenNowWorkflowError('Add a note explaining the decision.', 'notes')
  }
  return {
    ...exp,
    draftStatus: 'draft',
    lastDecision: 'changes',
    reviewer: 'Unassigned',
    revisedSinceDecision: false,
    reviewNotes: [{ author: actor, role: 'Reviewer', at, note: note.trim() }, ...exp.reviewNotes],
    updatedAt: at,
  }
}

export function rejectRevision(
  exp: Experience,
  actor: string,
  note: string,
  at: string,
): Experience {
  if (exp.draftStatus !== 'in_review') {
    throw new ThenNowWorkflowError('Only a frozen revision can be rejected.', 'state')
  }
  if (exp.reviewer === 'Unassigned') {
    throw new ThenNowWorkflowError('Assign a reviewer before deciding.', 'assignment')
  }
  if (!note.trim()) {
    throw new ThenNowWorkflowError('Add a note explaining the decision.', 'notes')
  }
  return {
    ...exp,
    draftStatus: 'draft',
    lastDecision: 'rejected',
    reviewer: 'Unassigned',
    revisedSinceDecision: false,
    rejectedSnapshot: revisionSnapshot(exp),
    reviewNotes: [{ author: actor, role: 'Reviewer', at, note: note.trim() }, ...exp.reviewNotes],
    updatedAt: at,
  }
}

export function returnToDraft(exp: Experience, actor: string, reason: string, at: string): Experience {
  if (exp.draftStatus !== 'in_review' && exp.draftStatus !== 'approved') {
    throw new ThenNowWorkflowError('This revision is already editable.', 'state')
  }
  if (!reason.trim()) {
    throw new ThenNowWorkflowError('Add a reason for returning to draft.', 'notes')
  }
  return {
    ...exp,
    draftStatus: 'draft',
    lastDecision: 'returned',
    reviewer: 'Unassigned',
    reviewNotes: [
      { author: actor, role: 'Reviewer', at, note: `Returned to draft: ${reason.trim()}` },
      ...exp.reviewNotes,
    ],
    updatedAt: at,
  }
}

export function publishRevision(exp: Experience, at: string): Experience {
  if (exp.draftStatus !== 'approved') {
    throw new ThenNowWorkflowError('Only an approved revision can be published.', 'state')
  }
  const readiness = experienceReadiness(exp)
  if (!readiness.readyToPublish) {
    throw new ThenNowWorkflowError('Resolve the blocking checks before publishing.', 'readiness')
  }
  return {
    ...exp,
    status: 'published',
    draftStatus: 'published',
    liveRevision: exp.draftRevision,
    scheduledAt: undefined,
    scheduleNote: undefined,
    reviewer: 'Published',
    lastDecision: null,
    revisedSinceDecision: false,
    rejectedSnapshot: undefined,
    updatedAt: at,
  }
}

export function scheduleRevision(
  exp: Experience,
  at: string,
  scheduleNote: string,
): Experience {
  if (exp.draftStatus !== 'approved') {
    throw new ThenNowWorkflowError('Only an approved revision can be scheduled.', 'state')
  }
  if (!at) throw new ThenNowWorkflowError('Choose a publish date and time.', 'state')
  const readiness = experienceReadiness(exp)
  if (!readiness.readyToPublish) {
    throw new ThenNowWorkflowError('Resolve the blocking checks before scheduling.', 'readiness')
  }
  return {
    ...exp,
    status: exp.liveRevision > 0 ? exp.status : 'scheduled',
    scheduledAt: at,
    scheduleNote: scheduleNote.trim() || undefined,
    updatedAt: at,
  }
}

export function cancelSchedule(exp: Experience): Experience {
  return {
    ...exp,
    status: exp.liveRevision > 0 ? exp.status : 'draft',
    scheduledAt: undefined,
    scheduleNote: undefined,
  }
}

export function unpublishExperience(exp: Experience): Experience {
  return {
    ...exp,
    status: 'unpublished',
    scheduledAt: undefined,
    scheduleNote: undefined,
  }
}

export function archiveExperience(exp: Experience): Experience {
  return { ...exp, status: 'archived', scheduledAt: undefined, scheduleNote: undefined }
}

export function revokeExperience(exp: Experience): Experience {
  return { ...exp, status: 'revoked', scheduledAt: undefined, scheduleNote: undefined }
}

export function createRevision(exp: Experience, at: string): Experience {
  if (exp.liveRevision === 0 || exp.draftRevision > exp.liveRevision) {
    throw new ThenNowWorkflowError('There is already an open revision.', 'state')
  }
  return {
    ...exp,
    draftRevision: exp.liveRevision + 1,
    draftStatus: 'draft',
    lastDecision: null,
    reviewer: 'Unassigned',
    updatedAt: at,
  }
}

export function recordClientApproval(
  exp: Experience,
  approval: { name: string; role: string; at: string },
): Experience {
  return { ...exp, clientApproval: approval }
}

export function recordExternalReviewer(
  exp: Experience,
  reviewer: ExternalReviewer,
): Experience {
  return {
    ...exp,
    secondReviewer: reviewer,
    secondReviewerApproved: reviewer.decision === 'approved',
  }
}
