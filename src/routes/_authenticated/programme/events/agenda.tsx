/**
 * Agenda and speaker records.
 *
 * Conflicts are detected on the server-returned sessions and can be resolved by
 * editing the room or time. Speaker records have a consent lifecycle and a
 * remove action; creating a person and linking it to a session uses the contract.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, UserPlus, Warning } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { useMice } from '#/lib/mice/store'
import {
  findSessionConflicts,
  formatDateRange,
  formatLongDate,
  formatTime,
  sessionConflictFor,
} from '#/lib/mice/workflow'
import type { Session, Speaker } from '#/lib/mice/types'
import {
  EventScope,
  LocalActionNote,
  MicePill,
  Notice,
  SectionCard,
  SimpleTable,
  statusLabel,
} from '#/components/mice/shared'

export const Route = createFileRoute('/_authenticated/programme/events/agenda')(
  {
    component: AgendaPage,
  },
)

function AgendaPage() {
  const {
    eventQuery,
    fixtureState,
    setFixtureState,
    selectedEventId,
    local,
    createSession,
    updateSession,
    createSpeaker,
    setSpeakerLifecycle,
  } = useMice()
  const [sessionOpen, setSessionOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [speakerOpen, setSpeakerOpen] = useState(false)

  if (fixtureState === 'empty') {
    return (
      <DataStateView
        state="empty"
        title="No agenda in this fixture"
        description="Switch the data state to Default to load the sample agenda."
      />
    )
  }

  if (eventQuery.isPending) {
    return (
      <DataStateView
        state="loading"
        title="Loading the agenda"
        description="Fetching sessions, rooms and speaker records."
      />
    )
  }
  if (eventQuery.isError || !eventQuery.data) {
    return (
      <DataStateView
        state="error"
        title="The agenda could not load"
        description="The admin API returned an error. Sessions are not shown partially."
        onRetry={() =>
          fixtureState === 'error'
            ? setFixtureState('default')
            : void eventQuery.refetch()
        }
      />
    )
  }

  const detail = eventQuery.data
  const sessions = detail.agenda ?? []
  const conflicts = findSessionConflicts(sessions)
  const speakers = uniqueSpeakers(sessions)
  const eventDays = [
    ...new Set([
      detail.startsAt.slice(0, 10),
      ...(detail.endsAt ? [detail.endsAt.slice(0, 10)] : []),
      ...sessions.map((session) => session.day),
    ]),
  ].sort()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda & speakers"
        description={`${detail.title} · ${formatDateRange(detail.startsAt, detail.endsAt)} · speakers are content records, not user accounts`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EventScope />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSpeakerOpen(true)}
            >
              <UserPlus className="size-4" weight="bold" /> Add speaker
            </Button>
            <Button size="sm" onClick={() => setSessionOpen(true)}>
              <Plus className="size-4" weight="bold" /> Add session
            </Button>
          </div>
        }
      />

      {conflicts.length > 0 ? (
        <Notice
          tone="warning"
          title={`${conflicts.length} agenda conflict${conflicts.length === 1 ? '' : 's'}`}
        >
          {conflicts.map((conflict) => {
            const session = sessions.find(
              (item) => item.id === conflict.sessionId,
            )
            const other = sessions.find(
              (item) => item.id === conflict.withSessionId,
            )
            return (
              <span
                key={`${conflict.sessionId}-${conflict.withSessionId}`}
                className="block"
              >
                {session?.title} ↔ {other?.title}: {conflict.reason}
              </span>
            )
          })}
        </Notice>
      ) : null}

      <SectionCard
        title="Sessions"
        description={`${sessions.length} session${sessions.length === 1 ? '' : 's'} across ${eventDays.length} day${eventDays.length === 1 ? '' : 's'}`}
      >
        <SimpleTable
          caption="Sessions for the selected event, with room conflicts and speakers"
          rows={sessions}
          emptyTitle="No sessions yet"
          emptyDescription="Add the first session to build the agenda."
          columns={[
            {
              header: 'Day',
              cell: (session) =>
                formatLongDate(session.day).replace(/^\w+, /, ''),
            },
            {
              header: 'Time',
              cell: (session) =>
                `${formatTime(session.startsAt)}–${formatTime(session.endsAt)}`,
            },
            {
              header: 'Session',
              cell: (session) => {
                const conflict = sessionConflictFor(conflicts, session.id)
                return (
                  <span>
                    <span className="font-semibold text-foreground">
                      {session.title}
                    </span>
                    {session.track ? (
                      <span className="block text-xs text-muted-foreground">
                        {session.track}
                      </span>
                    ) : null}
                    {conflict ? (
                      <MicePill tone="red" className="mt-1">
                        <Warning className="size-3" weight="bold" />{' '}
                        {conflict.reason}
                      </MicePill>
                    ) : null}
                  </span>
                )
              },
            },
            { header: 'Room', cell: (session) => session.room ?? '—' },
            {
              header: 'Speakers',
              cell: (session) => (
                <span className="text-xs">
                  {(session.speakers ?? [])
                    .filter(
                      (speaker) =>
                        !local.speakerLifecycle[
                          `${session.id}:${speaker.id ?? speaker.displayName}`
                        ]?.removed,
                    )
                    .map((speaker) => speaker.displayName)
                    .join(', ') || 'None linked'}
                </span>
              ),
            },
            {
              header: 'Actions',
              cell: (session) => (
                <span className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSession(session)}
                    aria-label={`Edit ${session.title}`}
                  >
                    {sessionConflictFor(conflicts, session.id)
                      ? 'Resolve'
                      : 'Edit'}
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Speakers"
        description="Content records with a consent lifecycle. Removing a speaker keeps the person record."
      >
        <SimpleTable
          caption="Speaker records, consent and linked sessions"
          rows={speakers}
          emptyTitle="No speakers linked"
          emptyDescription="Create a speaker and link it to a session."
          columns={[
            {
              header: 'Speaker',
              cell: (speaker) => (
                <span>
                  <span className="font-semibold text-foreground">
                    {speaker.displayName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {[speaker.title, speaker.organization]
                      .filter(Boolean)
                      .join(' · ') || 'No title'}
                  </span>
                </span>
              ),
            },
            {
              header: 'Role',
              cell: (speaker) => statusLabel(speaker.role ?? 'speaker'),
            },
            {
              header: 'Consent',
              cell: (speaker) => {
                const key = speakerKey(speaker, sessions)
                const state = local.speakerLifecycle[key]?.consent ?? 'pending'
                return (
                  <select
                    aria-label={`Consent for ${speaker.displayName}`}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    value={state}
                    onChange={(event) =>
                      setSpeakerLifecycle(
                        key,
                        event.target.value as
                          'pending' | 'granted' | 'declined',
                      )
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="granted">Granted</option>
                    <option value="declined">Declined</option>
                  </select>
                )
              },
            },
            {
              header: 'Sessions',
              cell: (speaker) => speakerSessions(speaker, sessions).length,
            },
            {
              header: 'Actions',
              cell: (speaker) => {
                const key = speakerKey(speaker, sessions)
                return (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSpeakerLifecycle(key, 'pending', true)}
                  >
                    Remove from sessions
                  </Button>
                )
              },
            },
          ]}
        />
        <LocalActionNote>
          Consent, removal and speaker edits are local. Creating a person and
          linking a speaker use the contract.
        </LocalActionNote>
      </SectionCard>

      <SessionDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        eventDays={eventDays}
        onSubmit={(body) =>
          selectedEventId && void createSession(selectedEventId, body)
        }
      />
      <SessionDialog
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null)
        }}
        session={editingSession}
        eventDays={eventDays}
        conflicts={conflicts}
        onSubmit={(body) => {
          if (!editingSession || !selectedEventId) return
          void updateSession(selectedEventId, editingSession.id, body)
          setEditingSession(null)
        }}
      />
      <SpeakerDialog
        open={speakerOpen}
        onOpenChange={setSpeakerOpen}
        sessions={sessions}
        onSubmit={(body, sessionId) =>
          selectedEventId &&
          void createSpeaker(selectedEventId, body, sessionId)
        }
      />
    </div>
  )
}

function SessionDialog({
  open,
  onOpenChange,
  eventDays,
  session,
  conflicts,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventDays: string[]
  session?: Session | null
  conflicts?: ReturnType<typeof findSessionConflicts>
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [title, setTitle] = useState(session?.title ?? '')
  const [day, setDay] = useState(session?.day ?? eventDays[0] ?? '')
  const [start, setStart] = useState(
    session ? formatTime(session.startsAt) : '09:00',
  )
  const [end, setEnd] = useState(session ? formatTime(session.endsAt) : '10:00')
  const [room, setRoom] = useState(session?.room ?? '')
  const [track, setTrack] = useState(session?.track ?? '')
  const [description, setDescription] = useState(session?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(session?.title ?? '')
    setDay(session?.day ?? eventDays[0] ?? '')
    setStart(session ? formatTime(session.startsAt) : '09:00')
    setEnd(session ? formatTime(session.endsAt) : '10:00')
    setRoom(session?.room ?? '')
    setTrack(session?.track ?? '')
    setDescription(session?.description ?? '')
    setError(null)
  }, [eventDays, open, session])

  const conflict =
    session && conflicts ? sessionConflictFor(conflicts, session.id) : undefined

  function submit() {
    if (!title.trim() || !day || !start || !end) {
      setError('A title, day, start and end are required.')
      return
    }
    if (end <= start) {
      setError('The end time must be after the start time.')
      return
    }
    onSubmit({
      day,
      startsAt: `${day}T${start}:00+03:00`,
      endsAt: `${day}T${end}:00+03:00`,
      room: room || undefined,
      track: track || undefined,
      title: title.trim(),
      description: description || undefined,
    })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={session ? 'Edit session' : 'Add session'}
      description={
        conflict
          ? `${conflict.reason}. Change the room or time and save to resolve it.`
          : 'Sessions are ordered by start time on the public agenda.'
      }
      submitLabel={session ? 'Save session' : 'Add session'}
      error={error}
      onSubmit={submit}
    >
      <div className="space-y-1">
        <label
          htmlFor="session-title"
          className="text-xs font-bold text-foreground"
        >
          Title
        </label>
        <Input
          id="session-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="session-day"
            className="text-xs font-bold text-foreground"
          >
            Day
          </label>
          <select
            id="session-day"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          >
            {eventDays.map((value) => (
              <option key={value} value={value}>
                {formatLongDate(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="session-room"
            className="text-xs font-bold text-foreground"
          >
            Room
          </label>
          <Input
            id="session-room"
            value={room}
            onChange={(event) => setRoom(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="session-start"
            className="text-xs font-bold text-foreground"
          >
            Start
          </label>
          <Input
            id="session-start"
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="session-end"
            className="text-xs font-bold text-foreground"
          >
            End
          </label>
          <Input
            id="session-end"
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="session-track"
          className="text-xs font-bold text-foreground"
        >
          Track
        </label>
        <Input
          id="session-track"
          value={track}
          onChange={(event) => setTrack(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="session-description"
          className="text-xs font-bold text-foreground"
        >
          Description
        </label>
        <Textarea
          id="session-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      {conflict ? <MicePill tone="red">{conflict.reason}</MicePill> : null}
    </FormDialog>
  )
}

function SpeakerDialog({
  open,
  onOpenChange,
  sessions,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: Session[]
  onSubmit: (body: Record<string, unknown>, sessionId?: string) => void
}) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [organization, setOrganization] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!name.trim()) {
      setError('A display name is required.')
      return
    }
    onSubmit(
      {
        displayName: name.trim(),
        title: title || undefined,
        organization: organization || undefined,
        isPublic: true,
      },
      sessionId || undefined,
    )
    onOpenChange(false)
    setName('')
    setTitle('')
    setOrganization('')
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a speaker"
      description="Speakers are content records, not platform accounts."
      submitLabel="Create speaker"
      error={error}
      onSubmit={submit}
    >
      <div className="space-y-1">
        <label
          htmlFor="speaker-name"
          className="text-xs font-bold text-foreground"
        >
          Display name
        </label>
        <Input
          id="speaker-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="speaker-title"
            className="text-xs font-bold text-foreground"
          >
            Title
          </label>
          <Input
            id="speaker-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="speaker-org"
            className="text-xs font-bold text-foreground"
          >
            Organization
          </label>
          <Input
            id="speaker-org"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="speaker-session"
          className="text-xs font-bold text-foreground"
        >
          Link to session
        </label>
        <select
          id="speaker-session"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
        >
          <option value="">Create without linking</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
      </div>
    </FormDialog>
  )
}

function uniqueSpeakers(sessions: Session[]): Speaker[] {
  const seen = new Map<string, Speaker>()
  for (const session of sessions) {
    for (const speaker of session.speakers ?? []) {
      const key = speaker.id ?? speaker.displayName
      if (!seen.has(key)) seen.set(key, speaker)
    }
  }
  return [...seen.values()]
}

function speakerKey(speaker: Speaker, sessions: Session[]): string {
  for (const session of sessions) {
    if (
      (session.speakers ?? []).some(
        (item) =>
          (item.id ?? item.displayName) === (speaker.id ?? speaker.displayName),
      )
    ) {
      return `${session.id}:${speaker.id ?? speaker.displayName}`
    }
  }
  return `person:${speaker.displayName}`
}

function speakerSessions(speaker: Speaker, sessions: Session[]): Session[] {
  return sessions.filter((session) =>
    (session.speakers ?? []).some(
      (item) =>
        (item.id ?? item.displayName) === (speaker.id ?? speaker.displayName),
    ),
  )
}
