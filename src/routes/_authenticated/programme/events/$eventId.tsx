/**
 * Event editor route. The live listing is never mutated directly; the editor
 * saves a staged revision that the review queue publishes.
 */
import { useEffect } from 'react'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { EventEditorForm } from '#/components/mice/EventEditorForm'
import { useMice } from '#/lib/mice/store'
import { useMiceEvent } from '#/lib/mice/api'
import { formatDateRange } from '#/lib/mice/workflow'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute(
  '/_authenticated/programme/events/$eventId',
)({
  component: EventEditorPage,
})

function EventEditorPage() {
  const { eventId } = useParams({
    from: '/_authenticated/programme/events/$eventId',
  })
  const { fixtureState, setFixtureState, selectEvent } = useMice()
  const eventQuery = useMiceEvent(eventId, fixtureState)

  const loadedId = eventQuery.data?.id
  useEffect(() => {
    if (loadedId) selectEvent(loadedId)
  }, [loadedId, selectEvent])

  if (fixtureState === 'empty') {
    return (
      <DataStateView
        state="empty"
        title="No event in this fixture"
        description="Switch the data state to Default to load the sample event."
      />
    )
  }

  if (eventQuery.isPending) {
    return (
      <DataStateView
        state="loading"
        title="Loading the event"
        description="Fetching the live record and its current draft state."
      />
    )
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <DataStateView
        state="error"
        title="This event could not load"
        description="The admin API returned an error. No partial record is shown."
        onRetry={() =>
          fixtureState === 'error'
            ? setFixtureState('default')
            : void eventQuery.refetch()
        }
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/programme/events/list">Back to events</Link>
          </Button>
        }
      />
    )
  }

  const detail = eventQuery.data

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit event"
        description={`${detail.title} · ${formatDateRange(detail.startsAt, detail.endsAt)} · ${detail.venue?.name ?? 'No venue'}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/programme/events/list">
              <ArrowLeft className="size-3.5" weight="bold" /> Back to events
            </Link>
          </Button>
        }
      />
      <EventEditorForm key={`${detail.id}-${eventId}`} detail={detail} />
    </div>
  )
}
