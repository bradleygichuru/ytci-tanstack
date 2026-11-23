/**
 * MICE operations — local workflow types layered over the frozen contracts.
 *
 * The event, venue, organizer, registration, check-in and report data itself
 * comes from the Go admin API. Review staging, assignments, local audit rows and
 * a few actions the 1.0.0 contract does not expose yet (event lifecycle,
 * registration edits, waitlist offers) live in this browser and are clearly
 * labelled as local in the UI.
 */
import type { ContractsSchemas } from '#/lib/contracts/client'

export type EventSummary = ContractsSchemas['EventSummary']
export type EventDetail = ContractsSchemas['EventDetail']
export type EventWrite = ContractsSchemas['EventWrite']
export type Venue = ContractsSchemas['Venue']
export type VenueWrite = ContractsSchemas['VenueWrite']
export type OrganizerProfile = ContractsSchemas['OrganizerProfile']
export type Session = ContractsSchemas['Session']
export type SessionWrite = ContractsSchemas['SessionWrite']
export type Speaker = ContractsSchemas['Speaker']
export type PersonWrite = ContractsSchemas['PersonWrite']
export type AdminRegistration = ContractsSchemas['AdminRegistration']
export type CheckIn = ContractsSchemas['CheckIn']
export type EventReport = ContractsSchemas['EventReport']
export type AccessibilityWrite = ContractsSchemas['AccessibilityWrite']
export type AccessibilityBlock = ContractsSchemas['AccessibilityBlock']
export type WaitlistOffer = ContractsSchemas['WaitlistOffer']
export type MiceAuditEvent = ContractsSchemas['MiceAuditEvent']
export type RegistrationWrite = ContractsSchemas['RegistrationWrite']

export type TriState = 'yes' | 'no' | 'unknown'

export const ACCESS_FIELDS = [
  { key: 'stepFreeEntrance', label: 'Step-free entrance' },
  { key: 'stepFreeRoute', label: 'Step-free route' },
  { key: 'accessibleToilet', label: 'Accessible toilet' },
  { key: 'accessibleParking', label: 'Accessible parking' },
  { key: 'accessibleSeating', label: 'Accessible seating' },
  { key: 'captioning', label: 'Captioning' },
  { key: 'signLanguage', label: 'Sign language' },
  { key: 'hearingLoop', label: 'Assistive listening' },
  { key: 'quietRoom', label: 'Quiet room' },
  { key: 'assistanceDogs', label: 'Assistance dogs' },
] as const

export type AccessFieldKey = (typeof ACCESS_FIELDS)[number]['key']

export type RevisionStatus = 'draft' | 'in_review'

export interface StagedRevision {
  eventId: string
  write: EventWrite
  /** Plain-language evidence reference for every accessibility claim. */
  accessibilityEvidence: string
  status: RevisionStatus
  submittedAt?: string
  submittedBy?: string
  secondReview?: { by: string; at: string; note?: string }
  changedAfterReview?: boolean
  note?: string
}

export type LifecycleState =
  'published' | 'cancelled' | 'postponed' | 'unpublished' | 'archived'

export interface LifecycleOverride {
  state: LifecycleState
  reason: string
  at: string
  by: string
}

export type AuditCategory = 'events' | 'safety' | 'system'

export interface AuditEntry {
  id: string
  at: string
  actor: string
  role: string
  action: string
  entity: string
  detail: string
  category: AuditCategory
  /** Server rows come from /v1/admin/mice/audit; local rows cover review staging. */
  source?: 'server' | 'local'
}

export type RegistrationState =
  'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in'

export interface VenueEvidence {
  venueId: string
  fields: Partial<Record<AccessFieldKey, string>>
  note?: string
  updatedAt: string
  by: string
}

export interface OrganizerNote {
  organizerId: string
  requestedEvidenceAt?: string
  requestedEvidenceBy?: string
  assignedTo?: string
  note?: string
}

export interface ReportAssignment {
  reportId: string
  assignedTo: string
  escalated?: boolean
  escalatedAt?: string
}

export interface MiceLocalState {
  revisions: Record<string, StagedRevision>
  audit: AuditEntry[]
  venueEvidence: Record<string, VenueEvidence>
  venueRetired: Record<string, { at: string; by: string; mergedInto?: string }>
  organizerNotes: Record<string, OrganizerNote>
  reportAssignments: Record<string, ReportAssignment>
  reviewAssignments: Record<string, string>
  /** Demo seed marker so the review queue has one realistic item once. */
  seeded?: boolean
}
