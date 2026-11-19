/**
 * Venue editor dialog.
 *
 * Accessibility is structured tri-state, and each claim can carry its own
 * evidence reference. Venue verification (verifiedAt) is separate from the
 * evidence for a single claim.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { FormDialog } from '#/components/shell/FormDialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { useMice } from '#/lib/mice/store'
import {
  ACCESS_FIELDS,
  type AccessibilityWrite,
  type TriState,
  type Venue,
  type VenueWrite,
} from '#/lib/mice/types'
import { formatLongDate } from '#/lib/mice/workflow'
import { LocalActionNote, MicePill } from '#/components/mice/shared'

export interface VenueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue: Venue | null
}

export function VenueDialog({ open, onOpenChange, venue }: VenueDialogProps) {
  const { saveVenue, setVenueEvidence, local } = useMice()
  const [form, setForm] = useState<VenueWrite>(toWrite(venue))
  const [evidence, setEvidence] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(toWrite(venue))
    setEvidence(
      venue?.id
        ? ((local.venueEvidence[venue.id]?.fields as Record<string, string>) ??
            {})
        : {},
    )
    setNote(venue?.id ? (local.venueEvidence[venue.id]?.note ?? '') : '')
    setError(null)
  }, [local.venueEvidence, open, venue])

  function patch<K extends keyof VenueWrite>(key: K, value: VenueWrite[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function patchAccess(key: keyof AccessibilityWrite, value: TriState) {
    setForm((current) => ({
      ...current,
      accessibility: { ...(current.accessibility ?? {}), [key]: value },
    }))
  }

  async function submit() {
    if (!form.name.trim() || !form.county.trim()) {
      setError('A venue name and county are required.')
      return
    }
    setPending(true)
    const ok = await saveVenue(venue?.id ?? null, form)
    setPending(false)
    if (!ok) return
    if (venue?.id) setVenueEvidence(venue.id, evidence, note)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={venue ? `Edit ${venue.name}` : 'Add a curated venue'}
      description="Accessibility is three-state. Unknown never renders as accessible; evidence is kept per claim."
      submitLabel={venue ? 'Save venue' : 'Create venue'}
      pending={pending}
      error={error}
      size="lg"
      onSubmit={submit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="venue-name">
          <Input
            id="venue-name"
            value={form.name}
            onChange={(event) => patch('name', event.target.value)}
          />
        </Field>
        <Field label="County" htmlFor="venue-county">
          <Input
            id="venue-county"
            value={form.county}
            onChange={(event) => patch('county', event.target.value)}
          />
        </Field>
        <Field label="Address line 1" htmlFor="venue-address1">
          <Input
            id="venue-address1"
            value={form.addressLine1 ?? ''}
            onChange={(event) => patch('addressLine1', event.target.value)}
          />
        </Field>
        <Field label="Address line 2" htmlFor="venue-address2">
          <Input
            id="venue-address2"
            value={form.addressLine2 ?? ''}
            onChange={(event) => patch('addressLine2', event.target.value)}
          />
        </Field>
        <Field label="In-person capacity" htmlFor="venue-capacity-person">
          <Input
            id="venue-capacity-person"
            type="number"
            min={0}
            value={form.capacityInPerson ?? ''}
            onChange={(event) =>
              patch(
                'capacityInPerson',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        </Field>
        <Field label="Online capacity" htmlFor="venue-capacity-online">
          <Input
            id="venue-capacity-online"
            type="number"
            min={0}
            value={form.capacityOnline ?? ''}
            onChange={(event) =>
              patch(
                'capacityOnline',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        </Field>
        <Field label="Rooms" htmlFor="venue-rooms" hint="Comma separated.">
          <Input
            id="venue-rooms"
            value={(form.rooms ?? []).join(', ')}
            onChange={(event) =>
              patch(
                'rooms',
                event.target.value
                  .split(',')
                  .map((room) => room.trim())
                  .filter(Boolean),
              )
            }
          />
        </Field>
        <Field label="Verification date" htmlFor="venue-verified">
          <Input
            id="venue-verified"
            readOnly
            className="bg-muted/50"
            value={
              venue?.verifiedAt
                ? formatLongDate(venue.verifiedAt.slice(0, 10))
                : 'Unverified'
            }
          />
        </Field>
      </div>

      <Field label="Transport notes" htmlFor="venue-transport">
        <Input
          id="venue-transport"
          value={form.transportNotes ?? ''}
          onChange={(event) => patch('transportNotes', event.target.value)}
        />
      </Field>
      <Field label="Drop-off notes" htmlFor="venue-dropoff">
        <Input
          id="venue-dropoff"
          value={form.dropoffNotes ?? ''}
          onChange={(event) => patch('dropoffNotes', event.target.value)}
        />
      </Field>
      <Field label="Parking notes" htmlFor="venue-parking">
        <Input
          id="venue-parking"
          value={form.parkingNotes ?? ''}
          onChange={(event) => patch('parkingNotes', event.target.value)}
        />
      </Field>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-foreground">
            Accessibility and evidence
          </p>
          {venue?.verifiedAt ? (
            <MicePill tone="green">
              Verified {formatLongDate(venue.verifiedAt.slice(0, 10))}
            </MicePill>
          ) : (
            <MicePill tone="gold">Unverified</MicePill>
          )}
        </div>
        <div className="space-y-2">
          {ACCESS_FIELDS.map((field) => (
            <div
              key={field.key}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1.2fr)]"
            >
              <label
                htmlFor={`venue-access-${field.key}`}
                className="self-center text-xs font-semibold text-foreground"
              >
                {field.label}
              </label>
              <select
                id={`venue-access-${field.key}`}
                aria-label={`${field.label} state`}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.accessibility?.[field.key] ?? 'unknown'}
                onChange={(event) =>
                  patchAccess(field.key, event.target.value as TriState)
                }
              >
                <option value="unknown">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              <Input
                aria-label={`${field.label} evidence`}
                placeholder="Evidence reference"
                value={evidence[field.key] ?? ''}
                onChange={(event) =>
                  setEvidence((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
        <Field label="Evidence note" htmlFor="venue-evidence-note">
          <Textarea
            id="venue-evidence-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Who verified it, when, and how."
          />
        </Field>
      </div>

      <LocalActionNote>
        Per-claim evidence and venue verification are separate records. Evidence
        is stored locally until the contract adds a venue-evidence write.
      </LocalActionNote>
    </FormDialog>
  )
}

function toWrite(venue: Venue | null): VenueWrite {
  if (!venue) {
    return {
      name: '',
      county: 'Nairobi',
      accessibility: {
        stepFreeEntrance: 'unknown',
        stepFreeRoute: 'unknown',
        accessibleToilet: 'unknown',
        accessibleParking: 'unknown',
        accessibleSeating: 'unknown',
        captioning: 'unknown',
        signLanguage: 'unknown',
        hearingLoop: 'unknown',
        quietRoom: 'unknown',
        assistanceDogs: 'unknown',
      },
    }
  }
  const access = venue.accessibility?.fields
  return {
    name: venue.name,
    slug: venue.slug,
    county: venue.county,
    countyGid: venue.countyGid ?? null,
    addressLine1: venue.addressLine1 ?? undefined,
    addressLine2: venue.addressLine2 ?? undefined,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    capacityInPerson: venue.capacityInPerson ?? null,
    capacityOnline: venue.capacityOnline ?? null,
    rooms: venue.rooms ?? [],
    transportNotes: venue.transportNotes ?? undefined,
    dropoffNotes: venue.dropoffNotes ?? undefined,
    parkingNotes: venue.parkingNotes ?? undefined,
    accessibility: access
      ? {
          stepFreeEntrance: access.stepFreeEntrance,
          stepFreeRoute: access.stepFreeRoute,
          accessibleToilet: access.accessibleToilet,
          accessibleParking: access.accessibleParking,
          accessibleSeating: access.accessibleSeating,
          captioning: access.captioning,
          signLanguage: access.signLanguage,
          hearingLoop: access.hearingLoop,
          quietRoom: access.quietRoom,
          assistanceDogs: access.assistanceDogs,
          companionTicketPolicy: access.companionTicketPolicy ?? undefined,
          contentNotes: access.contentNotes ?? undefined,
        }
      : undefined,
  }
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-bold text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
