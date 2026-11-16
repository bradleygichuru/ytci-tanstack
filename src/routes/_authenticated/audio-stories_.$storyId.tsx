import { createFileRoute, redirect, Link, useBlocker, useRouteContext } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowClockwise, CheckCircle, Warning, Info, Lock, Plus, Trash,
  FloppyDisk, PaperPlaneTilt, Waveform, Play, UploadSimple,
} from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { canAudioStory } from '#/lib/audio-story-permissions'
import { useApi } from '#/lib/api/use-api'
import { ApiErrorResponse } from '#/lib/api/types'
import {
  AUDIO_THEMES, AUDIO_THEME_LABELS, RIGHTS_BASES, RIGHTS_BASIS_LABELS, RISK_TIERS,
  CONTENT_NOTE_CATEGORIES, CONTENT_NOTE_LABELS,
} from '#/lib/api/audio-stories'
import type {
  AudioReadiness, AudioRevision, AudioStory, AudioStoryCollection, AudioStoryEvent,
  AudioTheme, AudioTrack, Language, RevisionStatus, RightsBasis, RiskTier, StoredRightsBasis, TranscriptParagraph,
} from '#/lib/api/audio-stories'
import {
  audioRightsSchema, audioStoryDetailsSchema, audioTrackSchema, audioTranscriptSchema,
  fieldErrors, formatCue, formatDuration, parseCue,
} from '#/lib/schemas/audio-story.schema'
import {
  RevisionStatusBadge, RiskBadge, StoryStatusBadge, formatDate, formatRelative,
} from '#/components/audio-stories/badges'
import { FormDatePicker, FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { MediaUpload } from '#/components/shared/MediaUpload'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/audio-stories_/$storyId')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'audioStories', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AudioStoryEditorPage,
})

const TABS = [
  { key: 'story', label: 'Story' },
  { key: 'tracks', label: 'Tracks & transcripts' },
  { key: 'credits', label: 'Placement' },
  { key: 'rights', label: 'Rights & review' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface StoryFormState {
  title: string
  subtitle: string
  summary: string
  theme: AudioTheme
  tags: string
  producer: string
  communitySource: string
  recordedAt: string
  collectionId: string
  collectionOrder: number
  featured: boolean
  coverMediaId: string
}

interface RevisionFormState {
  placeScope: 'national' | 'county' | 'multi_county'
  counties: string
  rightsBasis: StoredRightsBasis
  rightsHolder: string
  licenceReference: string
  rightsExpiresAt: string
  riskTier: RiskTier
  contentNoteCategories: string[]
  contentNoteText: string
}

interface ParagraphDraft {
  text: string
  cue: string
  speaker?: string
}

interface TrackDraft {
  language: Language
  revisionId: string
  track: AudioTrack | null
  audioObjectKey: string
  mediaAssetId: string
  durationSeconds: number
  narrator: string
  narratorConsentDate: string
  narratorConsentReference: string
  recordedAt: string
  format: string
  sizeBytes?: number
  bitrateKbps?: number
  paragraphs: ParagraphDraft[]
  errors: Record<string, string>
  previewUrl?: string
  previewError?: string
  previewing?: boolean
  savedTrackHash: string
  savedTranscriptHash: string
}

const languageLabels: Record<Language, string> = { en: 'English', sw: 'Kiswahili' }

function storyForm(story: AudioStory): StoryFormState {
  return {
    title: story.title,
    subtitle: story.subtitle ?? '',
    summary: story.summary,
    theme: story.theme,
    tags: (story.tags ?? []).join(', '),
    producer: story.producer,
    communitySource: story.communitySource,
    recordedAt: story.recordedAt ?? '',
    collectionId: story.collectionId ?? '',
    collectionOrder: story.collectionOrder ?? 0,
    featured: story.featured,
    coverMediaId: story.coverMediaId ?? '',
  }
}

function revisionForm(revision: AudioRevision): RevisionFormState {
  return {
    placeScope: revision.placeScope,
    counties: revision.counties.join(', '),
    rightsBasis: revision.rightsBasis,
    rightsHolder: revision.rightsHolder,
    licenceReference: revision.licenceReference ?? '',
    rightsExpiresAt: revision.rightsExpiresAt ? revision.rightsExpiresAt.slice(0, 10) : '',
    riskTier: revision.riskTier,
    contentNoteCategories: revision.contentNoteCategories ?? [],
    contentNoteText: revision.contentNoteText ?? '',
  }
}

function trackDrafts(revision: AudioRevision | null): TrackDraft[] {
  return (['en', 'sw'] as Language[]).map((language) => {
    const track = revision?.tracks.find((item) => item.language === language) ?? null
    const transcript = revision?.transcripts.find((item) => item.language === language)
    return {
      language,
      revisionId: revision?.id ?? '',
      track,
      audioObjectKey: track?.audioObjectKey ?? '',
      mediaAssetId: track?.mediaAssetId ?? '',
      durationSeconds: track?.durationSeconds ?? 0,
      narrator: track?.narrator ?? '',
      narratorConsentDate: track?.narratorConsentDate ?? '',
      narratorConsentReference: track?.narratorConsentReference ?? '',
      recordedAt: track?.recordedAt ?? '',
      format: track?.format ?? '',
      sizeBytes: track?.sizeBytes,
      bitrateKbps: track?.bitrateKbps,
      paragraphs: transcript?.paragraphs.length
        ? transcript.paragraphs.map((paragraph) => ({
            text: paragraph.text,
            cue: formatCue(paragraph.startSeconds),
            speaker: paragraph.speaker,
          }))
        : [{ text: '', cue: '' }],
      errors: {},
      savedTrackHash: '',
      savedTranscriptHash: '',
    }
  })
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function placementValue(form: RevisionFormState): string {
  return JSON.stringify({ placeScope: form.placeScope, counties: form.counties })
}

function rightsValue(form: RevisionFormState): string {
  return JSON.stringify({
    rightsBasis: form.rightsBasis,
    rightsHolder: form.rightsHolder,
    licenceReference: form.licenceReference,
    rightsExpiresAt: form.rightsExpiresAt,
    riskTier: form.riskTier,
    contentNoteCategories: form.contentNoteCategories,
    contentNoteText: form.contentNoteText,
  })
}

function trackMetaValue(track: TrackDraft): string {
  return JSON.stringify({
    language: track.language,
    track: track.track,
    audioObjectKey: track.audioObjectKey,
    mediaAssetId: track.mediaAssetId,
    durationSeconds: track.durationSeconds,
    narrator: track.narrator,
    narratorConsentDate: track.narratorConsentDate,
    narratorConsentReference: track.narratorConsentReference,
    recordedAt: track.recordedAt,
    format: track.format,
    sizeBytes: track.sizeBytes,
    bitrateKbps: track.bitrateKbps,
  })
}

function transcriptValue(track: TrackDraft): string {
  return JSON.stringify(track.paragraphs)
}

function AudioStoryEditorPage() {
  const { storyId } = Route.useParams()
  const api = useApi()
  const context = useRouteContext({ from: '/_authenticated' })
  const role = context.user?.role
  const canEdit = canAudioStory(role, 'edit')
  const canSubmit = canAudioStory(role, 'submit')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ story: AudioStory; revision: AudioRevision | null; liveRevision: AudioRevision | null } | null>(null)
  const [collections, setCollections] = useState<AudioStoryCollection[]>([])
  const [storyFormState, setStoryFormState] = useState<StoryFormState | null>(null)
  const [revisionFormState, setRevisionFormState] = useState<RevisionFormState | null>(null)
  const [tracks, setTracks] = useState<TrackDraft[]>([])
  const [readiness, setReadiness] = useState<AudioReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [audit, setAudit] = useState<AudioStoryEvent[]>([])
  const [tab, setTab] = useState<TabKey>('story')
  const [storyErrors, setStoryErrors] = useState<Record<string, string>>({})
  const [revisionErrors, setRevisionErrors] = useState<Record<string, string>>({})
  const [savingStory, setSavingStory] = useState(false)
  const [savingRevision, setSavingRevision] = useState(false)
  const [savingTrack, setSavingTrack] = useState<Language | null>(null)
  const [savingTranscript, setSavingTranscript] = useState<Language | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [liveSaveOpen, setLiveSaveOpen] = useState(false)
  const [confirmReloadOpen, setConfirmReloadOpen] = useState(false)
  const [showAllAudit, setShowAllAudit] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [removeTrack, setRemoveTrack] = useState<TrackDraft | null>(null)
  const [removeReason, setRemoveReason] = useState('')
  const [removing, setRemoving] = useState(false)
  const storySnapshot = useRef<string>('')
  const placementSnapshot = useRef<string>('')
  const rightsSnapshot = useRef<string>('')

  const revision = detail?.revision ?? null
  const story = detail?.story ?? null
  const revisionEditable = revision?.status === 'draft'
  const publishedWithoutOpen = Boolean(story?.status === 'published' && !revision)
  const storyDirty = Boolean(storyFormState && storySnapshot.current && JSON.stringify(storyFormState) !== storySnapshot.current)
  const placementDirty = Boolean(revisionFormState && placementSnapshot.current && placementValue(revisionFormState) !== placementSnapshot.current)
  const rightsDirty = Boolean(revisionFormState && rightsSnapshot.current && rightsValue(revisionFormState) !== rightsSnapshot.current)
  const tracksDirty = tracks.some((track) => trackMetaValue(track) !== track.savedTrackHash || transcriptValue(track) !== track.savedTranscriptHash)
  const dirty = storyDirty || placementDirty || rightsDirty || tracksDirty

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [response, collectionResponse] = await Promise.all([
        api.audioStories.get(storyId),
        api.audioStories.listCollections().catch(() => ({ items: [] as AudioStoryCollection[] })),
      ])
      const viewRevision = response.openRevision ?? response.liveRevision
      const nextStoryForm = storyForm(response.story)
      const nextRevisionForm = viewRevision ? revisionForm(viewRevision) : null
      const nextTrackDrafts = trackDrafts(viewRevision)
      setDetail({ story: response.story, revision: response.openRevision, liveRevision: response.liveRevision })
      setStoryFormState(nextStoryForm)
      setRevisionFormState(nextRevisionForm)
      setTracks(nextTrackDrafts)
      setCollections(collectionResponse.items)
      storySnapshot.current = JSON.stringify(nextStoryForm)
      placementSnapshot.current = nextRevisionForm ? placementValue(nextRevisionForm) : ''
      rightsSnapshot.current = nextRevisionForm ? rightsValue(nextRevisionForm) : ''
      nextTrackDrafts.forEach((track) => { track.savedTrackHash = trackMetaValue(track); track.savedTranscriptHash = transcriptValue(track) })
      setConflict(false)
      setCoverPreview(null)

      const auditPromise = api.audioStories.audit(storyId).catch(() => ({ items: [] as AudioStoryEvent[] }))
      if (response.openRevision) {
        setReadinessLoading(true)
        const [readinessResponse, auditResponse] = await Promise.all([
          api.audioStories.readiness(storyId, response.openRevision.id).catch(() => null),
          auditPromise,
        ])
        setReadiness(readinessResponse)
        setAudit(auditResponse.items)
        setReadinessLoading(false)
      } else {
        setReadiness(null)
        const auditResponse = await auditPromise
        setAudit(auditResponse.items)
      }
    } catch (error) {
      setLoadError(errorMessage(error, 'Failed to load the audio story'))
    } finally {
      setLoading(false)
    }
  }, [api, storyId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])

  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: false,
    withResolver: true,
  })

  const refreshReadiness = useCallback(async (revisionId: string) => {
    setReadinessLoading(true)
    try {
      setReadiness(await api.audioStories.readiness(storyId, revisionId))
    } catch {
      setReadiness(null)
    } finally {
      setReadinessLoading(false)
    }
  }, [api, storyId])

  const updateStoryField = <K extends keyof StoryFormState>(field: K, value: StoryFormState[K]) => {
    setStoryFormState((current) => (current ? { ...current, [field]: value } : current))
    setStoryErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const saveStory = async () => {
    if (!story || !storyFormState) return
    const parsed = audioStoryDetailsSchema.safeParse({
      title: storyFormState.title,
      subtitle: storyFormState.subtitle || undefined,
      summary: storyFormState.summary,
      theme: storyFormState.theme,
      producer: storyFormState.producer,
      communitySource: storyFormState.communitySource,
      collectionId: storyFormState.collectionId || undefined,
      collectionOrder: Number(storyFormState.collectionOrder) || 0,
    })
    if (!parsed.success) {
      setStoryErrors(fieldErrors(parsed.error))
      toast.error('Check the highlighted story fields.')
      return
    }
    const payload = {
      title: storyFormState.title.trim(),
      subtitle: storyFormState.subtitle.trim(),
      summary: storyFormState.summary.trim(),
      theme: storyFormState.theme,
      tags: splitList(storyFormState.tags),
      coverMediaId: storyFormState.coverMediaId,
      producer: storyFormState.producer.trim(),
      communitySource: storyFormState.communitySource.trim(),
      recordedAt: storyFormState.recordedAt,
      collectionId: storyFormState.collectionId,
      collectionOrder: Number(storyFormState.collectionOrder) || 0,
      featured: storyFormState.featured,
      expectedUpdatedAt: story.updatedAt,
    }
    setSavingStory(true)
    try {
      const response = await api.audioStories.update(storyId, payload)
      const savedForm: StoryFormState = {
        ...storyFormState,
        title: payload.title,
        subtitle: payload.subtitle,
        summary: payload.summary,
        producer: payload.producer,
        communitySource: payload.communitySource,
        recordedAt: payload.recordedAt,
        tags: payload.tags.join(', '),
      }
      setStoryFormState(savedForm)
      setDetail((current) => current ? {
        ...current,
        story: {
          ...current.story,
          ...payload,
          subtitle: payload.subtitle,
          recordedAt: payload.recordedAt,
          updatedAt: response.updatedAt ?? new Date().toISOString(),
        },
      } : current)
      storySnapshot.current = JSON.stringify(savedForm)
      setStoryErrors({})
      toast.success('Story details saved')
      if (revision) await refreshReadiness(revision.id)
    } catch (error) {
      if (error instanceof ApiErrorResponse && error.status === 409) {
        setConflict(true)
        toast.error('This story changed while you were editing.')
      } else {
        toast.error(errorMessage(error, 'Failed to save story details'))
      }
    } finally {
      setSavingStory(false)
    }
  }

  const savePlacement = async () => {
    if (!revision || !revisionFormState || !revisionEditable) return
    const counties = splitList(revisionFormState.counties)
    const errors: Record<string, string> = {}
    if (revisionFormState.placeScope === 'county' && counties.length !== 1) {
      errors.counties = 'Choose exactly one county'
    }
    if (revisionFormState.placeScope === 'multi_county' && counties.length < 2) {
      errors.counties = 'Choose at least two counties'
    }
    if (revisionFormState.placeScope === 'national' && counties.length > 0) {
      errors.counties = 'National stories do not list counties'
    }
    if (Object.keys(errors).length > 0) {
      setRevisionErrors(errors)
      toast.error('Check the placement fields.')
      return
    }
    setSavingRevision(true)
    try {
      const response = await api.audioStories.updateRevision(storyId, revision.id, {
        placeScope: revisionFormState.placeScope,
        counties,
        expectedUpdatedAt: revision.updatedAt,
      })
      const savedForm: RevisionFormState = { ...revisionFormState, counties: counties.join(', ') }
      setRevisionFormState(savedForm)
      setDetail((current) => current?.revision ? {
        ...current,
        revision: {
          ...current.revision,
          placeScope: revisionFormState.placeScope,
          counties,
          updatedAt: response.updatedAt ?? new Date().toISOString(),
        },
      } : current)
      placementSnapshot.current = placementValue(savedForm)
      setRevisionErrors({})
      toast.success('Placement saved')
      await refreshReadiness(revision.id)
    } catch (error) {
      if (error instanceof ApiErrorResponse && error.status === 409) {
        setConflict(true)
        toast.error('This revision changed while you were editing.')
      } else {
        toast.error(errorMessage(error, 'Failed to save placement'))
      }
    } finally {
      setSavingRevision(false)
    }
  }

  const saveRights = async () => {
    if (!revision || !revisionFormState || !revisionEditable) return
    if (revisionFormState.rightsBasis === 'unverified') {
      setRevisionErrors({ rightsBasis: 'Choose a rights basis before saving.' })
      toast.error('Choose a rights basis for this story.')
      return
    }
    const rights = audioRightsSchema.safeParse({
      rightsBasis: revisionFormState.rightsBasis,
      rightsHolder: revisionFormState.rightsHolder,
      licenceReference: revisionFormState.licenceReference || undefined,
      rightsExpiresAt: revisionFormState.rightsExpiresAt || undefined,
      riskTier: revisionFormState.riskTier,
      contentNoteCategories: revisionFormState.contentNoteCategories,
      contentNoteText: revisionFormState.contentNoteText || undefined,
    })
    if (!rights.success) {
      setRevisionErrors(fieldErrors(rights.error))
      toast.error('Check the rights and review fields.')
      return
    }
    setSavingRevision(true)
    try {
      const payload = {
        rightsBasis: revisionFormState.rightsBasis,
        rightsHolder: revisionFormState.rightsHolder.trim(),
        licenceReference: revisionFormState.licenceReference.trim(),
        rightsExpiresAt: revisionFormState.rightsExpiresAt,
        riskTier: revisionFormState.riskTier,
        contentNoteCategories: revisionFormState.contentNoteCategories,
        contentNoteText: revisionFormState.contentNoteText,
        expectedUpdatedAt: revision.updatedAt,
      }
      const response = await api.audioStories.updateRevision(storyId, revision.id, payload)
      const savedForm: RevisionFormState = {
        ...revisionFormState,
        rightsBasis: revisionFormState.rightsBasis,
        rightsHolder: payload.rightsHolder,
        licenceReference: payload.licenceReference,
        contentNoteText: payload.contentNoteText,
      }
      setRevisionFormState(savedForm)
      setDetail((current) => current?.revision ? {
        ...current,
        revision: {
          ...current.revision,
          rightsBasis: payload.rightsBasis as RightsBasis,
          rightsHolder: payload.rightsHolder,
          licenceReference: payload.licenceReference,
          rightsExpiresAt: payload.rightsExpiresAt,
          riskTier: payload.riskTier,
          contentNoteCategories: payload.contentNoteCategories,
          contentNoteText: payload.contentNoteText,
          updatedAt: response.updatedAt ?? new Date().toISOString(),
        },
      } : current)
      rightsSnapshot.current = rightsValue(savedForm)
      setRevisionErrors({})
      toast.success('Rights and review saved')
      await refreshReadiness(revision.id)
    } catch (error) {
      if (error instanceof ApiErrorResponse && error.status === 409) {
        setConflict(true)
        toast.error('This revision changed while you were editing.')
      } else {
        toast.error(errorMessage(error, 'Failed to save rights and review'))
      }
    } finally {
      setSavingRevision(false)
    }
  }

  const updateTrack = <K extends keyof TrackDraft>(language: Language, field: K, value: TrackDraft[K]) => {
    setTracks((current) => current.map((track) => (
      track.language === language ? { ...track, [field]: value, errors: {} } : track
    )))
  }

  const saveTrack = async (draft: TrackDraft) => {
    if (!revision || !revisionEditable || savingTrack === draft.language) return
    if (trackMetaValue(draft) === draft.savedTrackHash) return
    const parsed = audioTrackSchema.safeParse({
      language: draft.language,
      audioObjectKey: draft.audioObjectKey,
      narrator: draft.narrator,
      narratorConsentDate: draft.narratorConsentDate,
      narratorConsentReference: draft.narratorConsentReference,
      durationSeconds: draft.durationSeconds,
      recordedAt: draft.recordedAt || undefined,
      format: draft.format || undefined,
      sizeBytes: draft.sizeBytes,
      bitrateKbps: draft.bitrateKbps,
    })
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error)
      setTracks((current) => current.map((track) => (
        track.language === draft.language ? { ...track, errors } : track
      )))
      toast.error('The track needs audio, narrator and consent evidence.')
      return
    }
    setSavingTrack(draft.language)
    try {
      const response = await api.audioStories.saveTrack(storyId, revision.id, {
        language: draft.language,
        mediaAssetId: draft.mediaAssetId || undefined,
        audioObjectKey: draft.audioObjectKey,
        durationSeconds: draft.durationSeconds,
        narrator: draft.narrator.trim(),
        narratorConsentDate: draft.narratorConsentDate,
        narratorConsentReference: draft.narratorConsentReference.trim(),
        recordedAt: draft.recordedAt || undefined,
        format: draft.format || undefined,
        sizeBytes: draft.sizeBytes,
        bitrateKbps: draft.bitrateKbps,
      })
      const savedTrack: AudioTrack = {
        id: response.trackId,
        language: draft.language,
        mediaAssetId: draft.mediaAssetId || undefined,
        audioObjectKey: draft.audioObjectKey,
        durationSeconds: draft.durationSeconds,
        narrator: draft.narrator.trim(),
        narratorConsentDate: draft.narratorConsentDate,
        narratorConsentReference: draft.narratorConsentReference.trim(),
        recordedAt: draft.recordedAt || undefined,
        format: draft.format || undefined,
        sizeBytes: draft.sizeBytes,
        bitrateKbps: draft.bitrateKbps,
      }
      setTracks((current) => current.map((track) => {
        if (track.language !== draft.language) return track
        const savedDraft = { ...track, track: savedTrack, errors: {} }
        return { ...savedDraft, savedTrackHash: trackMetaValue(savedDraft) }
      }))
      toast.success(`${languageLabels[draft.language]} track saved`)
      await refreshReadiness(revision.id)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save the track'))
    } finally {
      setSavingTrack(null)
    }
  }

  const saveTranscript = async (draft: TrackDraft) => {
    if (!revision || !revisionEditable || savingTranscript === draft.language) return
    if (transcriptValue(draft) === draft.savedTranscriptHash) return
    const invalidCue = draft.paragraphs.find((paragraph) => paragraph.cue.trim() && parseCue(paragraph.cue) === undefined)
    if (invalidCue) {
      setTracks((current) => current.map((track) => (
        track.language === draft.language
          ? { ...track, errors: { paragraphs: 'Cues must be seconds (42) or minutes:seconds (0:42).' } }
          : track
      )))
      toast.error('Fix the cue format before saving the transcript.')
      return
    }
    const paragraphs: TranscriptParagraph[] = draft.paragraphs
      .filter((paragraph) => paragraph.text.trim())
      .map((paragraph) => ({
        text: paragraph.text.trim(),
        ...(paragraph.speaker ? { speaker: paragraph.speaker } : {}),
        ...(parseCue(paragraph.cue) !== undefined ? { startSeconds: parseCue(paragraph.cue) } : {}),
      }))
    const parsed = audioTranscriptSchema.safeParse({
      paragraphs,
      durationSeconds: draft.durationSeconds || undefined,
    })
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error)
      setTracks((current) => current.map((track) => (
        track.language === draft.language ? { ...track, errors } : track
      )))
      toast.error('The transcript has empty paragraphs or invalid cues.')
      return
    }
    setSavingTranscript(draft.language)
    try {
      await api.audioStories.saveTranscript(storyId, revision.id, draft.language, paragraphs)
      setTracks((current) => current.map((track) => {
        if (track.language !== draft.language) return track
        return { ...track, savedTranscriptHash: transcriptValue(track) }
      }))
      toast.success(`${languageLabels[draft.language]} transcript saved`)
      await refreshReadiness(revision.id)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save the transcript'))
    } finally {
      setSavingTranscript(null)
    }
  }

  const handleAudioUpload = (language: Language, result: { id: string; objectKey: string; durationSeconds?: number; contentType?: string; sizeBytes?: number }) => {
    setTracks((current) => current.map((track) => {
      if (track.language !== language) return track
      return {
        ...track,
        audioObjectKey: result.objectKey,
        mediaAssetId: result.id,
        durationSeconds: result.durationSeconds ?? track.durationSeconds,
        sizeBytes: result.sizeBytes ?? track.sizeBytes,
        format: result.contentType === 'audio/mpeg' ? 'mp3' : 'm4a',
        previewUrl: undefined,
        previewError: undefined,
        errors: {},
      }
    }))
    toast.success('Audio uploaded. Add narrator consent, then save the track.')
  }

  const previewAudio = async (draft: TrackDraft) => {
    if (!draft.audioObjectKey) return
    if (draft.previewUrl) {
      setTracks((current) => current.map((track) => (
        track.language === draft.language ? { ...track, previewUrl: undefined } : track
      )))
      return
    }
    setTracks((current) => current.map((track) => (
      track.language === draft.language ? { ...track, previewing: true } : track
    )))
    try {
      const response = await api.media.getUrl(draft.audioObjectKey)
      setTracks((current) => current.map((track) => (
        track.language === draft.language ? { ...track, previewUrl: response.url, previewError: undefined, previewing: false } : track
      )))
    } catch {
      setTracks((current) => current.map((track) => (
        track.language === draft.language
          ? { ...track, previewError: 'Audio preview is unavailable. Check the storage connection and retry.', previewing: false }
          : track
      )))
    }
  }

  const confirmRemoveTrack = async () => {
    if (!revision || !removeTrack?.track) return
    if (!removeReason.trim()) {
      toast.error('Add a reason before removing the track.')
      return
    }
    setRemoving(true)
    try {
      await api.audioStories.removeTrack(storyId, revision.id, removeTrack.track.id, removeReason.trim())
      setTracks((current) => current.map((track) => {
        if (track.language !== removeTrack.language) return track
        const cleared = { ...track, track: null, audioObjectKey: '', mediaAssetId: '', durationSeconds: 0, narrator: '', narratorConsentDate: '', narratorConsentReference: '', recordedAt: '', format: '', sizeBytes: undefined, bitrateKbps: undefined, previewUrl: undefined }
        return { ...cleared, savedTrackHash: trackMetaValue(cleared) }
      }))
      toast.success('Track removed')
      setRemoveTrack(null)
      setRemoveReason('')
      await refreshReadiness(revision.id)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to remove the track'))
    } finally {
      setRemoving(false)
    }
  }

  const submitForReview = async () => {
    if (!revision) return
    setSubmitting(true)
    try {
      await api.audioStories.submit(storyId, revision.id)
      toast.success('Submitted for review. The revision is now frozen.')
      setSubmitOpen(false)
      await load()
    } catch (error) {
      toast.error(errorMessage(error, 'Submit failed. Check the readiness checklist.'))
      await refreshReadiness(revision.id)
    } finally {
      setSubmitting(false)
    }
  }

  const requestSaveStory = () => {
    if (story?.status === 'published') {
      setLiveSaveOpen(true)
      return
    }
    void saveStory()
  }

  const copyChanges = async () => {
    const snapshot = {
      story: storyFormState,
      revision: revisionFormState,
      tracks: tracks.map((track) => ({ language: track.language, audioObjectKey: track.audioObjectKey, narrator: track.narrator, consent: track.narratorConsentReference, paragraphs: track.paragraphs })),
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      toast.success('Changes copied to the clipboard')
    } catch {
      toast.error('Could not copy changes')
    }
  }

  const viewCover = async () => {
    if (!story?.coverObjectKey) return
    try {
      const response = await api.media.getUrl(story.coverObjectKey)
      setCoverPreview(response.url)
      setCoverError(null)
    } catch {
      setCoverError('Cover preview is unavailable. Check the storage connection and retry.')
    }
  }

  const createRevision = async () => {
    setCreatingRevision(true)
    try {
      await api.audioStories.createRevision(storyId)
      toast.success('New draft revision created from the live version')
      setTab('story')
      await load()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create a new revision'))
    } finally {
      setCreatingRevision(false)
    }
  }

  const noteItems = useMemo(() => {
    if (!revisionFormState) return []
    return CONTENT_NOTE_CATEGORIES.map((category) => ({
      category,
      label: CONTENT_NOTE_LABELS[category],
      checked: revisionFormState.contentNoteCategories.includes(category),
    }))
  }, [revisionFormState])

  if (loading) return <EditorSkeleton />

  if (loadError || !story || !storyFormState) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-[var(--error-container)] p-8 text-center" role="alert">
        <p className="font-semibold text-destructive">{loadError ?? 'Audio story not found'}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => void load()}>Retry</Button>
          <Button variant="outline" asChild>
            <Link to="/audio-stories">Back to stories</Link>
          </Button>
        </div>
      </div>
    )
  }

  const ownRevision = Boolean(revision && revision.status === 'draft')
  const saveStoryDisabled = savingStory || conflict || !canEdit || !storyDirty
  const savePlacementDisabled = savingRevision || conflict || !canEdit || !ownRevision || !placementDirty
  const saveRightsDisabled = savingRevision || conflict || !canEdit || !ownRevision || !rightsDirty

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link to="/audio-stories" style={{ color: 'var(--on-surface-variant)' }}><ArrowLeft className="h-4 w-4" /> Stories</Link>
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Audio Story · {story.collectionTitle || collectionName(story, collections) || 'Unplaced'}
          </p>
          <h1 className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">{storyFormState.title || 'Untitled story'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StoryStatusBadge status={story.status} />
            {revision && <RevisionStatusBadge status={revision.status} />}
            <RiskBadge risk={revisionFormState?.riskTier ?? detail?.liveRevision?.riskTier ?? story.riskTier} />
            {detail?.liveRevision && (
              <Badge variant="outline" className="rounded-full border-[var(--leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]">
                Live version published
              </Badge>
            )}
            {dirty && (
              <Badge variant="outline" className="rounded-full border-[var(--amber-deep)] bg-[var(--amber-bg)] text-[var(--amber-deep)]">
                Unsaved changes
              </Badge>
            )}
            {!canEdit && (
              <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">Read-only</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSubmit && ownRevision && (
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => setSubmitOpen(true)}
                disabled={submitting || !readiness?.ready || dirty || conflict}
                title={!readiness?.ready ? 'Resolve all blocking readiness items first' : dirty ? 'Save your changes first' : undefined}
                className="rounded-full"
              >
                <PaperPlaneTilt className="h-4 w-4" />
                {submitting ? 'Submitting…' : 'Submit for review'}
              </Button>
              {dirty && <span className="text-[11px] text-[var(--amber-deep)]">Save or discard changes first.</span>}
              {!dirty && !readiness?.ready && <span className="text-[11px] text-muted-foreground">Blocked by readiness.</span>}
            </div>
          )}
        </div>
      </div>

      {conflict && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--amber-deep)] bg-[var(--amber-bg)] px-4 py-3" role="alert">
          <Warning className="h-5 w-5 text-[var(--amber-deep)]" weight="fill" />
          <div className="min-w-[220px] flex-1">
            <strong className="block text-sm text-[var(--amber-deep)]">This story changed while you were editing.</strong>
            <span className="text-xs text-[var(--on-surface-variant)]">Your copy is behind the server. Reloading discards your local edits.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void copyChanges()}>
            Copy my changes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmReloadOpen(true)}>Reload and discard</Button>
        </div>
      )}

      {revision && revision.status !== 'draft' && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3" role="status">
          <Lock className="h-5 w-5 text-muted-foreground" weight="fill" />
          <div className="min-w-[220px] flex-1">
            <strong className="block text-sm text-foreground">This revision is {revision.status === 'in_review' ? 'frozen for review' : revision.status}.</strong>
            <span className="text-xs text-muted-foreground">Audio, transcripts, placement, notes and rights are locked. Story details can still be saved.</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Submitted {formatDate(revision.submittedAt)} · {revision.assignedReviewerName ? `Reviewer: ${revision.assignedReviewerName}` : 'Awaiting reviewer assignment'}
            </span>
          </div>
        </div>
      )}

      {story.status === 'published' && (
        <div className="mb-5 flex flex-wrap items-start gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3" role="note">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--on-surface-variant)]" weight="fill" />
          <div className="min-w-[220px] flex-1">
            <strong className="block text-sm text-foreground">Story details are live.</strong>
            <span className="text-xs text-muted-foreground">
              All story details — title, subtitle, summary, cover, theme, tags, collection, credits, recorded date, featured state and collection order — change the public story immediately when saved. Audio, transcripts, placement, content notes and rights require a draft revision.
            </span>
          </div>
          {publishedWithoutOpen && canEdit && (
            <Button size="sm" onClick={() => void createRevision()} disabled={creatingRevision || dirty} title={dirty ? 'Save or discard changes first' : undefined}>
              {creatingRevision ? 'Creating…' : 'New revision'}
            </Button>
          )}
        </div>
      )}

      <fieldset disabled={conflict} className="m-0 grid min-w-0 gap-6 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 lg:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {!revision
                  ? story.status === 'published' ? 'Live version · no draft revision' : 'No draft revision'
                  : readiness
                  ? readiness.ready
                    ? (readiness.warnings.length ? `Ready with ${readiness.warnings.length} warning${readiness.warnings.length === 1 ? '' : 's'}` : 'Ready for review')
                    : `${readiness.blocking.length} blocking item${readiness.blocking.length === 1 ? '' : 's'}`
                  : 'Readiness not loaded'}
              </p>
              <p className="text-xs text-muted-foreground">{revision ? 'Server-checked before submission.' : 'Create a draft revision to edit and check this story.'}</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href="#readiness-rail" className="text-foreground">View</a>
            </Button>
          </div>

          <div
            id="editor-tabs"
            className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-2)] p-1 sm:flex sm:overflow-x-auto"
            role="tablist"
            aria-label="Story editor sections"
            onKeyDown={(event) => {
              const keys: TabKey[] = TABS.map((item) => item.key)
              const index = keys.indexOf(tab)
              let next: TabKey | undefined
              if (event.key === 'ArrowRight') next = keys[(index + 1) % keys.length]
              if (event.key === 'ArrowLeft') next = keys[(index - 1 + keys.length) % keys.length]
              if (event.key === 'Home') next = keys[0]
              if (event.key === 'End') next = keys[keys.length - 1]
              if (!next) return
              event.preventDefault()
              setTab(next)
              requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus())
            }}
          >
            {TABS.map((item) => (
              <button
                key={item.key}
                role="tab"
                aria-selected={tab === item.key}
                aria-controls={`panel-${item.key}`}
                id={`tab-${item.key}`}
                tabIndex={tab === item.key ? 0 : -1}
                disabled={conflict}
                onClick={() => setTab(item.key)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${tab === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {((item.key === 'story' && storyDirty) ||
                    (item.key === 'tracks' && tracksDirty) ||
                    (item.key === 'credits' && placementDirty) ||
                    (item.key === 'rights' && rightsDirty)) && (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber-deep)]" aria-hidden />
                      <span className="sr-only">Unsaved changes</span>
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>

          <section id="panel-story" role="tabpanel" aria-labelledby="tab-story" hidden={tab !== 'story'} className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
            <SectionHead title="Story" copy="Public identity and collection membership." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormInput label="Title" required value={storyFormState.title} onChange={(value) => updateStoryField('title', value)} error={storyErrors.title} disabled={!canEdit} />
              </div>
              <div className="sm:col-span-2">
                <FormTextarea label="Summary" required value={storyFormState.summary} onChange={(value) => updateStoryField('summary', value)} error={storyErrors.summary} disabled={!canEdit} />
              </div>
              <FormInput label="Subtitle" value={storyFormState.subtitle} onChange={(value) => updateStoryField('subtitle', value)} disabled={!canEdit} />
              <FormSelect
                label="Theme"
                required
                value={storyFormState.theme}
                onChange={(value) => updateStoryField('theme', value as AudioTheme)}
                options={AUDIO_THEMES.map((theme) => ({ value: theme, label: AUDIO_THEME_LABELS[theme] }))}
                disabled={!canEdit}
              />
              <FormInput label="Slug" value={story.slug} onChange={() => {}} description="Fixed when the draft is created." disabled />
              <FormSelect
                label="Collection"
                value={storyFormState.collectionId}
                onChange={(value) => updateStoryField('collectionId', value)}
                options={collections.map((collection) => ({ value: collection.id, label: collection.title }))}
                description={collections.length === 0 ? 'No collections exist yet.' : undefined}
                disabled={!canEdit}
              />
              <FormInput
                label="Order in collection"
                type="number"
                value={String(storyFormState.collectionOrder)}
                onChange={(value) => updateStoryField('collectionOrder', Number(value) || 0)}
                disabled={!canEdit}
              />
              <FormInput
                label="Tags"
                value={storyFormState.tags}
                onChange={(value) => updateStoryField('tags', value)}
                placeholder="oral-history, mangrove, kilifi"
                description="Comma-separated."
                disabled={!canEdit}
              />
              <FormInput
                label="Producer"
                required
                value={storyFormState.producer}
                onChange={(value) => updateStoryField('producer', value)}
                error={storyErrors.producer}
                disabled={!canEdit}
              />
              <FormInput
                label="Community / source"
                required
                value={storyFormState.communitySource}
                onChange={(value) => updateStoryField('communitySource', value)}
                error={storyErrors.communitySource}
                disabled={!canEdit}
              />
              <FormDatePicker
                label="Recorded"
                value={storyFormState.recordedAt}
                onChange={(value) => updateStoryField('recordedAt', value)}
                disabled={!canEdit}
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={storyFormState.featured}
                    onChange={(event) => updateStoryField('featured', event.target.checked)}
                    disabled={!canEdit}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Featured story
                </label>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-foreground">Cover image <span className="text-destructive">*</span></span>
                <p className="mb-2 text-xs text-muted-foreground">Required before review. Recommended 1600×900.</p>
                {storyFormState.coverMediaId && !coverPreview ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3">
                    <CheckCircle className="h-5 w-5 text-[var(--leaf)]" weight="fill" />
                    <span className="text-sm text-foreground">Cover attached</span>
                    <span className="text-xs text-muted-foreground">{story.coverObjectKey?.split('/').pop() || `ID ${storyFormState.coverMediaId.slice(0, 8)}…`}</span>
                    {story.coverObjectKey && (
                      <Button size="sm" variant="ghost" onClick={() => void viewCover()}>View cover</Button>
                    )}
                    {coverError && <span className="w-full text-xs text-destructive" role="alert">{coverError}</span>}
                  </div>
                ) : coverPreview ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3">
                    <img src={coverPreview} alt="Story cover preview" className="h-12 w-20 rounded object-cover" />
                    <span className="text-sm text-foreground">Cover uploaded</span>
                  </div>
                ) : null}
                {canEdit && <div className="mt-2">
                  <MediaUpload
                    label={storyFormState.coverMediaId ? 'Replace cover (JPG/PNG/WebP · max 10 MB)' : 'Upload cover (JPG/PNG/WebP · max 10 MB)'}
                    compact={Boolean(storyFormState.coverMediaId)}
                    allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    entityType="audio_story"
                    entityId={story.id}
                    metadata={{ type: 'image', altText: storyFormState.title }}
                    onComplete={(result) => {
                      updateStoryField('coverMediaId', result.id)
                      setCoverPreview(result.url ?? null)
                      toast.success('Cover uploaded. Save story details to keep it.')
                    }}
                    onError={(message) => toast.error(message)}
                  />
                </div>}
              </div>
              {canEdit && (
                <div className="mt-5 flex justify-end">
                  <Button onClick={requestSaveStory} disabled={saveStoryDisabled}>
                    <FloppyDisk className="h-4 w-4" />
                    {savingStory ? 'Saving…' : 'Save story details'}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section id="panel-tracks" role="tabpanel" aria-labelledby="tab-tracks" hidden={tab !== 'tracks'} className="space-y-4">
            {tracks.map((draft) => (
              <TrackCard
                key={draft.language}
                draft={draft}
                editable={Boolean(canEdit && revisionEditable && !conflict)}
                busy={savingTrack === draft.language || savingTranscript === draft.language}
                onUpload={(result) => handleAudioUpload(draft.language, result)}
                onUpdate={(field, value) => updateTrack(draft.language, field, value)}
                savingTrack={savingTrack === draft.language}
                savingTranscript={savingTranscript === draft.language}
                trackDirty={trackMetaValue(draft) !== draft.savedTrackHash}
                transcriptDirty={transcriptValue(draft) !== draft.savedTranscriptHash}
                onSaveTrack={() => void saveTrack(draft)}
                onSaveTranscript={() => void saveTranscript(draft)}
                onPreview={() => void previewAudio(draft)}
                onRemove={draft.track ? () => setRemoveTrack(draft) : undefined}
                onParagraphChange={(index, field, value) => {
                  setTracks((current) => current.map((track) => {
                    if (track.language !== draft.language) return track
                    const paragraphs = track.paragraphs.map((paragraph, paragraphIndex) => (
                      paragraphIndex === index ? { ...paragraph, [field]: value } : paragraph
                    ))
                    return { ...track, paragraphs, errors: {} }
                  }))
                }}
                onAddParagraph={() => {
                  setTracks((current) => current.map((track) => (
                    track.language === draft.language
                      ? { ...track, paragraphs: [...track.paragraphs, { text: '', cue: '' }], errors: {} }
                      : track
                  )))
                }}
                onRemoveParagraph={(index) => {
                  setTracks((current) => current.map((track) => (
                    track.language === draft.language
                      ? { ...track, paragraphs: track.paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index), errors: {} }
                      : track
                  )))
                }}
              />
            ))}
          </section>

          <section id="panel-credits" role="tabpanel" aria-labelledby="tab-credits" hidden={tab !== 'credits'} className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
            <SectionHead title="Placement" copy="Geographic coverage for discovery and filtering." />
            {!revisionFormState ? (
              <p className="text-sm text-muted-foreground">Create a draft revision to set placement and rights.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect
                    label="Place scope"
                    value={revisionFormState.placeScope}
                    onChange={(value) => {
                      setRevisionFormState((current) => current ? { ...current, placeScope: value as RevisionFormState['placeScope'] } : current)
                    }}
                    options={[
                      { value: 'county', label: 'County' },
                      { value: 'multi_county', label: 'Multi-county' },
                      { value: 'national', label: 'National' },
                    ]}
                    error={revisionErrors.counties}
                    disabled={!revisionEditable}
                  />
                  <div className="sm:col-span-2">
                    <FormInput
                      label="Counties"
                      value={revisionFormState.counties}
                      onChange={(value) => {
                        setRevisionFormState((current) => current ? { ...current, counties: value } : current)
                        }}
                      error={revisionErrors.counties}
                      description="Comma-separated. One county for county scope, two or more for multi-county, none for national."
                      disabled={!revisionEditable}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  {ownRevision ? (
                    <Button onClick={() => void savePlacement()} disabled={savePlacementDisabled}>
                      <FloppyDisk className="h-4 w-4" />
                      {savingRevision ? 'Saving…' : 'Save placement'}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Create a draft revision to edit placement.</span>
                  )}
                </div>
              </>
            )}
          </section>

          <section id="panel-rights" role="tabpanel" aria-labelledby="tab-rights" hidden={tab !== 'rights'} className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
              <SectionHead title="Rights & review" copy="Evidence first for partner, licensed or sensitive material." />
              {!revisionFormState ? (
                <p className="text-sm text-muted-foreground">Create a draft revision to set rights and review risk.</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormSelect
                      label="Rights basis"
                      required
                      value={revisionFormState.rightsBasis}
                      onChange={(value) => {
                        setRevisionFormState((current) => current ? { ...current, rightsBasis: value as RightsBasis } : current)
                        }}
                      options={[
                        ...(revisionFormState.rightsBasis === 'unverified' ? [{ value: 'unverified', label: 'Not yet recorded' }] : []),
                        ...RIGHTS_BASES.map((basis) => ({ value: basis, label: RIGHTS_BASIS_LABELS[basis] })),
                      ]}
                      error={revisionErrors.rightsBasis}
                      description="YTCI-owned is internal; partner permission and licensed require a reference."
                      disabled={!revisionEditable}
                    />
                    <FormInput
                      label="Rights holder"
                      required
                      value={revisionFormState.rightsHolder}
                      onChange={(value) => {
                        setRevisionFormState((current) => current ? { ...current, rightsHolder: value } : current)
                        }}
                      error={revisionErrors.rightsHolder}
                      disabled={!revisionEditable}
                    />
                    <FormInput
                      label="Licence / consent reference"
                      value={revisionFormState.licenceReference}
                      onChange={(value) => {
                        setRevisionFormState((current) => current ? { ...current, licenceReference: value } : current)
                        }}
                      error={revisionErrors.licenceReference}
                      description="Required for partner permission or licensed content."
                      disabled={!revisionEditable}
                    />
                    <FormDatePicker
                      label="Rights expiry"
                      value={revisionFormState.rightsExpiresAt}
                      onChange={(value) => {
                        setRevisionFormState((current) => current ? { ...current, rightsExpiresAt: value } : current)
                      }}
                      description="Leave blank for no expiry."
                      disabled={!revisionEditable}
                    />
                    <FormSelect
                      label="Review risk"
                      required
                      value={revisionFormState.riskTier}
                      onChange={(value) => {
                        setRevisionFormState((current) => current ? { ...current, riskTier: value as RiskTier } : current)
                        }}
                      options={RISK_TIERS.map((tier) => ({ value: tier, label: tier[0].toUpperCase() + tier.slice(1) }))}
                      description="Sensitive requires a second reviewer in the review queue; restricted requires legal/rights approval."
                      disabled={!revisionEditable}
                    />
                  </div>

                  <div className="mt-5">
                    <span className="mb-1 block text-sm font-semibold text-foreground">Content notes</span>
                    <p className="mb-2 text-xs text-muted-foreground">Flag what a listener may need to know before playing. The reviewer can add a note.</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {noteItems.map((item) => (
                        <label key={item.category} className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            disabled={!revisionEditable}
                            className="h-4 w-4 accent-[var(--primary)]"
                            onChange={(event) => {
                              setRevisionFormState((current) => {
                                if (!current) return current
                                const next = event.target.checked
                                  ? [...current.contentNoteCategories, item.category]
                                  : current.contentNoteCategories.filter((category) => category !== item.category)
                                return { ...current, contentNoteCategories: next }
                              })
                            }}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3">
                      <FormTextarea
                        label="Content note text"
                        value={revisionFormState.contentNoteText}
                        onChange={(value) => {
                          setRevisionFormState((current) => current ? { ...current, contentNoteText: value } : current)
                            }}
                        description={`${revisionFormState.contentNoteText.length}/200 characters`}
                        error={revisionErrors.contentNoteText}
                        disabled={!revisionEditable}
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    {ownRevision ? (
                      <Button onClick={() => void saveRights()} disabled={saveRightsDisabled}>
                        <FloppyDisk className="h-4 w-4" />
                        {savingRevision ? 'Saving…' : 'Save rights & review'}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Create a draft revision to edit rights and review.</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
              <SectionHead title="Audit timeline" copy="Append-only. No consent documents or personal contact details." />
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {audit.slice(0, showAllAudit ? audit.length : 10).map((event) => (
                    <li key={event.id} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{eventLabel(event.action)}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.actorName || (event.actorId ? 'Staff member' : '')}{event.actorName || event.actorId ? ' · ' : ''}{formatDate(event.createdAt)} · {formatRelative(event.createdAt)}
                          {event.reason ? ` · ${event.reason}` : ''}
                        </p>
                      </div>
                      {event.toStatus && <RevisionStatusBadge status={event.toStatus as RevisionStatus} />}
                    </li>
                  ))}
                </ol>
              )}
              {audit.length > 10 && (
                <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowAllAudit((value) => !value)}>
                  {showAllAudit ? 'Show latest 10' : `Show all ${audit.length} events`}
                </Button>
              )}
            </div>
          </section>
        </div>

        <ReadinessRail
          readiness={readiness}
          loading={readinessLoading}
          hasRevision={Boolean(revision)}
          revisionStatus={revision?.status}
          canSubmit={canSubmit}
          dirty={dirty}
          onNavigate={(section) => {
            setTab(section === 'tracks' ? 'tracks' : section === 'rights' ? 'rights' : section === 'credits' || section === 'placement' ? 'credits' : 'story')
            requestAnimationFrame(() => document.getElementById('editor-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
          }}
          onRefresh={() => revision ? void refreshReadiness(revision.id) : undefined}
        />
      </fieldset>

      <Dialog open={confirmReloadOpen} onOpenChange={setConfirmReloadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard local edits and reload?</DialogTitle>
            <DialogDescription>
              The server version will replace everything on this page. Use “Copy my changes” first if you need to keep your edits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReloadOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmReloadOpen(false); void load() }}>Discard and reload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={liveSaveOpen} onOpenChange={(open) => { if (!open && !savingStory) setLiveSaveOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update live story details?</DialogTitle>
            <DialogDescription>
              This story is published. All story details, including credits, recorded date, featured state and collection order, go public immediately; they are not held for review.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-3 text-xs text-muted-foreground">
            Audio, transcripts, placement, content notes and rights still require a draft revision.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiveSaveOpen(false)} disabled={savingStory}>Cancel</Button>
            <Button
              onClick={() => { setLiveSaveOpen(false); void saveStory() }}
              disabled={savingStory}
            >
              {savingStory ? 'Saving…' : 'Save live details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitOpen} onOpenChange={(open) => { if (!open && !submitting) setSubmitOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this revision for review?</DialogTitle>
            <DialogDescription>
              The revision becomes read-only. Audio, transcripts, placement, content notes and rights are locked until a reviewer returns it to draft.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-3 text-sm text-foreground">
            <p><strong>{storyFormState.title}</strong> · {revision ? (revision.contentVersion ? 'submitted revision' : 'draft revision') : 'draft'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {readiness?.ready ? 'All blocking checks pass.' : 'Some checks still block submission.'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {detail?.liveRevision
                ? `The live version (v${detail.liveRevision.contentVersion}) stays public until this revision is approved and published.`
                : 'This is the first version of the story. Nothing is public until it is approved and published.'}
            </p>
            {(readiness?.warnings.length ?? 0) > 0 && (
              <p className="mt-2 text-xs text-[var(--amber-deep)]">{readiness?.warnings.length} warning{(readiness?.warnings.length ?? 0) === 1 ? '' : 's'} will go with the submission.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void submitForReview()} disabled={submitting || !readiness?.ready}>
              <PaperPlaneTilt className="h-4 w-4" />
              {submitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blocker.status === 'blocked'} onOpenChange={(open) => { if (!open && blocker.status === 'blocked') blocker.reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have edits that have not been saved. Leaving this page will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (blocker.status === 'blocked') blocker.reset() }}>Stay on this page</Button>
            <Button variant="destructive" onClick={() => { if (blocker.status === 'blocked') blocker.proceed() }}>Discard and leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeTrack)} onOpenChange={(open) => { if (!open && !removing) { setRemoveTrack(null); setRemoveReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTrack ? languageLabels[removeTrack.language] : ''} track?</DialogTitle>
            <DialogDescription>
              The audio is detached from this draft revision. The transcript stays and the reason is written to the audit timeline.
            </DialogDescription>
          </DialogHeader>
          <FormTextarea
            label="Reason"
            required
            value={removeReason}
            onChange={setRemoveReason}
            placeholder="Narrator consent withdrawn / replacement recording"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveTrack(null); setRemoveReason('') }} disabled={removing}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmRemoveTrack()} disabled={removing || !removeReason.trim()}>
              {removing ? 'Removing…' : 'Remove track'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function collectionName(story: AudioStory, collections: AudioStoryCollection[]): string {
  if (!story.collectionId) return ''
  return collections.find((collection) => collection.id === story.collectionId)?.title ?? ''
}

function SectionHead({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-sans text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{copy}</p>
    </div>
  )
}

function ReadinessRail({
  readiness, loading, hasRevision, revisionStatus, canSubmit, dirty, onNavigate, onRefresh,
}: {
  readiness: AudioReadiness | null
  loading: boolean
  hasRevision: boolean
  revisionStatus?: RevisionStatus
  canSubmit: boolean
  dirty: boolean
  onNavigate: (section: string) => void
  onRefresh: () => void
}) {
  const blocking = readiness?.blocking ?? []
  const warnings = readiness?.warnings ?? []
  const frozen = Boolean(revisionStatus && revisionStatus !== 'draft')
  const clean = Boolean(readiness?.ready && warnings.length === 0)
  return (
    <aside id="readiness-rail" className="h-fit scroll-mt-6 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-6" style={{ boxShadow: 'var(--card-shadow)' }} aria-label="Review readiness">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-sans text-lg font-bold text-foreground">Readiness</h2>
          <p className="text-xs text-muted-foreground">Checked by the server</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={!hasRevision || loading} aria-label="Refresh readiness">
          <ArrowClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {!hasRevision ? (
        <p className="mt-4 rounded-lg bg-[var(--surface-2)] px-3 py-3 text-sm text-muted-foreground">
          Create a draft revision to compute readiness.
        </p>
      ) : loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !readiness ? (
        <p className="mt-4 text-sm text-muted-foreground">Readiness could not be loaded. Refresh to retry.</p>
      ) : (
        <>
          <div className={`mt-4 rounded-lg px-3 py-3 ${clean ? 'bg-[var(--leaf-bg)]' : 'bg-[var(--amber-bg)]'}`} role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              {clean
                ? <CheckCircle className="h-5 w-5 text-[var(--success-leaf)]" weight="fill" />
                : <Warning className="h-5 w-5 text-[var(--amber-deep)]" weight="fill" />}
              <strong className="text-sm text-foreground">
                {readiness.ready
                  ? warnings.length > 0
                    ? frozen
                      ? `Recorded with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`
                      : `Ready with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`
                    : frozen
                    ? 'Checks recorded'
                    : canSubmit
                    ? 'Ready for review'
                    : 'Ready for an editor to submit'
                  : `${blocking.length} blocking ${blocking.length === 1 ? 'item' : 'items'}`}
              </strong>
            </div>
            {dirty && (
              <p className="mt-1 text-xs text-[var(--amber-deep)]">Checks may be stale until you save.</p>
            )}
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {frozen
                ? readiness.ready
                  ? 'Recorded when this revision was submitted. Content is now frozen.'
                  : 'This revision was submitted with blocking items; the reviewer sees the same checklist.'
                : readiness.ready
                ? canSubmit
                  ? 'All blocking checks pass. Submit when the draft is ready.'
                  : 'All blocking checks pass. An editor can submit this draft.'
                : canSubmit
                ? 'Resolve blocking items before submitting for review.'
                : 'Read-only view. Blocking items are shown for the reviewer.'}
            </p>
          </div>

          {blocking.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--error)]">Blocking</span>
              <ul className="mt-2 space-y-2">
                {blocking.map((item) => (
                  <li key={item.code} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--error-container)] text-[11px] font-bold text-destructive">!</span>
                    <div>
                      <button type="button" onClick={() => onNavigate(item.section)} className="text-left text-sm font-semibold text-foreground hover:underline">
                        {item.label}
                      </button>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{sectionLabel(item.section)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--amber-deep)]">Warnings</span>
              <ul className="mt-2 space-y-2">
                {warnings.map((item) => (
                  <li key={item.code} className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber-deep)]" weight="fill" />
                    <div>
                      <button type="button" onClick={() => onNavigate(item.section)} className="text-left text-sm text-foreground hover:underline">
                        {item.label}
                      </button>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{sectionLabel(item.section)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {readiness.ready && warnings.length === 0 && (
            <p className="mt-4 text-xs text-muted-foreground">No warnings.</p>
          )}
        </>
      )}
    </aside>
  )
}

function TrackCard({
  draft, editable, busy, savingTrack, savingTranscript, trackDirty, transcriptDirty,
  onUpload, onUpdate, onSaveTrack, onSaveTranscript, onPreview, onRemove,
  onParagraphChange, onAddParagraph, onRemoveParagraph,
}: {
  draft: TrackDraft
  editable: boolean
  busy: boolean
  savingTrack: boolean
  savingTranscript: boolean
  trackDirty: boolean
  transcriptDirty: boolean
  onUpload: (result: { id: string; objectKey: string; durationSeconds?: number; contentType?: string; sizeBytes?: number }) => void
  onUpdate: <K extends keyof TrackDraft>(field: K, value: TrackDraft[K]) => void
  onSaveTrack: () => void
  onSaveTranscript: () => void
  onPreview: () => void
  onRemove?: () => void
  onParagraphChange: (index: number, field: 'text' | 'cue', value: string) => void
  onAddParagraph: () => void
  onRemoveParagraph: (index: number) => void
}) {
  const wordCount = draft.paragraphs.reduce((total, paragraph) => total + paragraph.text.trim().split(/\s+/).filter(Boolean).length, 0)
  const cueValues = draft.paragraphs.map((paragraph) => parseCue(paragraph.cue)).filter((value): value is number => value !== undefined)
  const cueRange = cueValues.length > 0 ? `${formatCue(Math.min(...cueValues))}–${formatCue(Math.max(...cueValues))}` : 'no cues'
  const emptyOptional = !draft.track && draft.paragraphs.every((paragraph) => !paragraph.text.trim())

  if (!editable && emptyOptional) {
    return (
      <article className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center gap-2">
          <Waveform className="h-5 w-5 text-muted-foreground" weight="duotone" />
          <h2 className="font-sans text-lg font-bold text-foreground">{languageLabels[draft.language]}</h2>
          <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">Not provided</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">This revision has no {languageLabels[draft.language]} track.</p>
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Waveform className="h-5 w-5 text-primary" weight="duotone" />
          <h2 className="font-sans text-lg font-bold text-foreground">{languageLabels[draft.language]}</h2>
          {draft.track ? (
            <Badge variant="outline" className="rounded-full bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]">Audio attached</Badge>
          ) : (
            <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">{draft.language === 'sw' ? 'No audio · optional' : 'No audio'}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {draft.audioObjectKey && (
            <Button size="sm" variant="outline" onClick={onPreview} disabled={draft.previewing}>
              <Play className="h-4 w-4" weight="fill" />
              {draft.previewUrl ? 'Hide preview' : draft.previewing ? 'Loading…' : 'Preview'}
            </Button>
          )}
          {editable && onRemove && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onRemove}>
              <Trash className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
      </div>

      {draft.previewUrl && (
        <audio controls autoPlay src={draft.previewUrl} className="mb-4 w-full">
          <track kind="captions" />
        </audio>
      )}
      {draft.previewError && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-[var(--error-container)] px-4 py-3" role="alert">
          <span className="text-sm text-destructive">{draft.previewError}</span>
          <Button size="sm" variant="outline" onClick={onPreview}>Retry</Button>
        </div>
      )}

      {draft.audioObjectKey ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3">
          <UploadSimple className="h-5 w-5 text-muted-foreground" weight="duotone" />
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-semibold text-foreground">{draft.audioObjectKey.split('/').pop()}</p>
            <p className="text-xs text-muted-foreground">
              {formatDuration(draft.durationSeconds)} · {draft.format?.toUpperCase() || 'audio'}
              {draft.sizeBytes ? ` · ${(draft.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : ''}
            </p>
          </div>
          {editable && (
            <MediaUpload
              label="Replace audio (M4A/MP3 · 30s–60min)"
              compact
              allowedTypes={['audio/mp4', 'audio/mpeg']}
              entityType="audio_story"
              entityId={draft.revisionId}
              metadata={{ type: 'audio' }}
              onComplete={onUpload}
            />
          )}
        </div>
      ) : editable ? (
        <div className="mb-4">
          <MediaUpload
            label={`Upload ${languageLabels[draft.language]} audio (M4A/MP3 · 30s–60min)`}
            allowedTypes={['audio/mp4', 'audio/mpeg']}
            entityType="audio_story"
            entityId={draft.revisionId}
            metadata={{ type: 'audio' }}
            onComplete={onUpload}
          />
        </div>
      ) : (
        <p className="mb-4 rounded-lg bg-[var(--surface-2)] px-4 py-3 text-sm text-muted-foreground">No audio attached.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Narrator"
          required={editable}
          value={draft.narrator}
          onChange={(value) => onUpdate('narrator', value)}
          error={draft.errors.narrator}
          readOnly={!editable || busy}
        />
        <FormDatePicker
          label="Recorded"
          value={draft.recordedAt}
          onChange={(value) => onUpdate('recordedAt', value)}
          disabled={!editable}
        />
        <FormDatePicker
          label="Consent date"
          required={editable}
          value={draft.narratorConsentDate}
          onChange={(value) => onUpdate('narratorConsentDate', value)}
          error={draft.errors.narratorConsentDate}
          disabled={!editable}
        />
        <FormInput
          label="Consent reference"
          required={editable}
          value={draft.narratorConsentReference}
          onChange={(value) => onUpdate('narratorConsentReference', value)}
          error={draft.errors.narratorConsentReference}
          description="Release or internal record ID."
          readOnly={!editable || busy}
        />
      </div>
      {editable && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={onSaveTrack} disabled={!draft.audioObjectKey || busy || !trackDirty}>
            <FloppyDisk className="h-4 w-4" /> {savingTrack ? 'Saving…' : trackDirty ? 'Save track' : 'Track saved'}
          </Button>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">{languageLabels[draft.language]} transcript</h3>
            <p className="text-xs text-muted-foreground">
              {draft.paragraphs.filter((paragraph) => paragraph.text.trim()).length} paragraph{draft.paragraphs.filter((paragraph) => paragraph.text.trim()).length === 1 ? '' : 's'} · cues {cueRange} · {wordCount} words
            </p>
          </div>
          {editable && (
            <Button size="sm" variant="outline" onClick={onAddParagraph}>
              <Plus className="h-4 w-4" /> Add paragraph
            </Button>
          )}
        </div>
        {draft.errors.paragraphs && <p className="mb-2 text-xs text-destructive">{draft.errors.paragraphs}</p>}
        <div className="space-y-3">
          {draft.paragraphs.map((paragraph, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-muted-foreground">{index + 1}</span>
              <Textarea
                value={paragraph.text}
                onChange={(event) => onParagraphChange(index, 'text', event.target.value)}
                rows={2}
                placeholder="Paragraph text"
                aria-label={`${languageLabels[draft.language]} transcript paragraph ${index + 1}`}
                readOnly={!editable || busy}
                className="flex-1 read-only:bg-[var(--surface-2)]"
              />
              <div className="flex w-full flex-col gap-1 sm:w-24">
                <span className="text-[11px] font-semibold text-muted-foreground">Cue</span>
                <Input
                  value={paragraph.cue}
                  onChange={(event) => onParagraphChange(index, 'cue', event.target.value)}
                  placeholder="0:00"
                  aria-label={`Cue for paragraph ${index + 1}`}
                  readOnly={!editable || busy}
                  className="read-only:bg-[var(--surface-2)]"
                />
              </div>
              {editable && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemoveParagraph(index)}
                  disabled={draft.paragraphs.length === 1}
                  aria-label={`Remove paragraph ${index + 1}`}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {draft.errors['paragraphs.0.startSeconds'] && (
          <p className="mt-2 text-xs text-destructive">{draft.errors['paragraphs.0.startSeconds']}</p>
        )}
        {editable && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={onSaveTranscript} disabled={busy || !transcriptDirty}>
              <FloppyDisk className="h-4 w-4" /> {savingTranscript ? 'Saving…' : transcriptDirty ? 'Save transcript' : 'Transcript saved'}
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}

function eventLabel(action: string): string {
  const labels: Record<string, string> = {
    'audio_story.created': 'Story created',
    'audio_story.revision_created': 'Revision created',
    'audio_story.revision_updated': 'Draft revision updated',
    'audio_story.track_saved': 'Track saved',
    'audio_story.track_updated': 'Track updated',
    'audio_story.track_removed': 'Track removed',
    'audio_story.transcript_saved': 'Transcript saved',
    'audio_story.submitted_for_review': 'Submitted for review',
    'audio_story.metadata_updated': 'Live story details updated',
  }
  return labels[action] ?? action.replaceAll('_', ' ').replaceAll('.', ' · ')
}

function sectionLabel(section: string): string {
  const labels: Record<string, string> = {
    story: 'Story',
    credits: 'Placement',
    collection: 'Collection',
    placement: 'Placement',
    rights: 'Rights & review',
    tracks: 'Tracks & transcripts',
  }
  return labels[section] ?? section
}

function EditorSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-4 h-10 w-80" />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
