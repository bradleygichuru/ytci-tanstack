import { useState, type ReactNode } from 'react'
import {
  CheckCircle,
  XCircle,
  WarningCircle,
  MapPin,
  Star,
  ArrowSquareOut,
} from '@phosphor-icons/react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  BEST_SEASONS,
  CATEGORY_OPTIONS,
  FEE_STATUSES,
  OPENING_HOURS_STATUSES,
  TRANSPORT_MODES,
  type CurationCandidate,
  type FeeStatus,
  type OpeningHoursStatus,
  type ReadinessResult,
  type ReviewFields,
} from '#/lib/curation'

interface ReviewPanelProps {
  candidate: CurationCandidate
  fields: ReviewFields
  readiness: ReadinessResult
  errors: Record<string, string>
  savingAction: 'draft' | 'publish' | 'reject' | null
  dirty: boolean
  canPublish: boolean
  onChange: (patch: Partial<ReviewFields>) => void
  onSaveDraft: () => void
  onSaveAndNext: () => void
  onPublish: () => void
  onReject: (reason: string) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Chip({
  selected,
  label,
  onToggle,
}: {
  selected: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition active:opacity-80 ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
      }`}
    >
      {label}
    </button>
  )
}

function CheckRow({ check }: { check: ReadinessResult['checks'][number] }) {
  return (
    <li
      className="flex items-start gap-2 text-xs"
      aria-label={`${check.label}: ${
        check.ok ? 'passed' : check.required ? 'required and incomplete' : 'recommended'
      }`}
    >
      {check.ok ? (
        <CheckCircle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success-leaf)]"
          weight="fill"
        />
      ) : check.required ? (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" weight="fill" />
      ) : (
        <WarningCircle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--amber-text,#6c5000)]"
          weight="fill"
        />
      )}
      <span
        className={
          check.ok
            ? 'text-muted-foreground'
            : check.required
              ? 'text-foreground'
              : 'text-muted-foreground'
        }
      >
        <span className="font-semibold">{check.label}</span>
        {!check.ok && check.detail ? ` — ${check.detail}` : ''}
        {!check.required ? (
          <span className="ml-1 text-[10px] uppercase tracking-wide">recommended</span>
        ) : null}
      </span>
    </li>
  )
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ReviewPanel({
  candidate,
  fields,
  readiness,
  errors,
  savingAction,
  dirty,
  canPublish,
  onChange,
  onSaveDraft,
  onSaveAndNext,
  onPublish,
  onReject,
}: ReviewPanelProps) {
  const saving = savingAction != null
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const required = readiness.checks.filter((check) => check.required)
  const passed = required.filter((check) => check.ok).length
  const destination = candidate.destination
  const isPublished = candidate.curationStatus === 'published'

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground">{candidate.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {candidate.county}
              </span>
              {candidate.rating != null ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" weight="fill" /> {candidate.rating.toFixed(1)}
                  {candidate.reviewCount != null ? ` · ${candidate.reviewCount} reviews` : ''}
                </span>
              ) : null}
              <span className="font-mono text-[10px] text-muted-foreground/80">
                {candidate.placeId}
              </span>
            </div>
            {candidate.address ? (
              <p className="mt-1 text-xs text-muted-foreground">{candidate.address}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={candidate.curationStatus}
              label={
                candidate.curationStatus[0].toUpperCase() + candidate.curationStatus.slice(1)
              }
            />
            {dirty ? <Badge variant="outline">Unsaved changes</Badge> : null}
            <Badge variant={readiness.ready ? 'default' : 'outline'}>
              {readiness.ready
                ? 'Composer ready'
                : `${passed}/${required.length} required checks`}
            </Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-xl text-xs text-muted-foreground">
            {destination
              ? `Linked destination: ${destination.slug} · ${destination.status}`
              : 'No destination row yet. Save a draft to start enriching this place.'}
          </p>
          <a
            href={
              destination
                ? `/destinations?search=${encodeURIComponent(candidate.name)}`
                : '/destinations'
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open CMS <ArrowSquareOut className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Traveler preview
          </p>
          <div className="mt-2 flex gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {fields.heroImageUrl ? (
                <img
                  src={fields.heroImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <MapPin className="h-6 w-6" weight="duotone" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{fields.category || 'Category'}</Badge>
                <span className="text-[11px] text-muted-foreground">{candidate.county}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-foreground">
                {fields.name || 'Place name'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {fields.shortDescription ||
                  'Add a short description to see the mobile card copy.'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {fields.feeStatus ? humanize(fields.feeStatus) : 'Fee not set'}
                {' · '}
                {fields.durationMinMinutes != null && fields.durationMaxMinutes != null
                  ? `${fields.durationMinMinutes}–${fields.durationMaxMinutes} min`
                  : 'Duration not set'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Composer-ready checklist</h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {passed}/{required.length} required
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={required.length}
            aria-valuenow={passed}
            aria-label="Required composer checks passed"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${required.length === 0 ? 0 : (passed / required.length) * 100}%`,
              }}
            />
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {readiness.checks.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </ul>
        </div>

        <div className="mt-4 space-y-4">
          <Section title="Classification">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="curation-name">Place name</Label>
                <Input
                  id="curation-name"
                  value={fields.name}
                  onChange={(event) => onChange({ name: event.target.value })}
                  aria-invalid={!!errors.name}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="curation-county">County</Label>
                <Input
                  id="curation-county"
                  value={`${candidate.county} (${fields.countyCode})`}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="curation-category">Category</Label>
                <Select
                  value={fields.category || undefined}
                  onValueChange={(value) => onChange({ category: value })}
                >
                  <SelectTrigger id="curation-category" className="w-full" aria-invalid={!!errors.category}>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.category} />
              </div>
              <div>
                <Label htmlFor="curation-locality">Locality</Label>
                <Input
                  id="curation-locality"
                  value={fields.locality}
                  onChange={(event) => onChange({ locality: event.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Interest tags</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Interest tags">
                {CATEGORY_OPTIONS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    selected={fields.interestTags.includes(tag)}
                    onToggle={() =>
                      onChange({
                        interestTags: fields.interestTags.includes(tag)
                          ? fields.interestTags.filter((value) => value !== tag)
                          : [...fields.interestTags, tag],
                      })
                    }
                  />
                ))}
              </div>
              <FieldError message={errors.interests} />
            </div>
          </Section>

          <Section
            title="Visitor information"
            hint="The mobile card and the composer route use these fields."
          >
            <div>
              <Label htmlFor="curation-description">Short description</Label>
              <Textarea
                id="curation-description"
                value={fields.shortDescription}
                onChange={(event) => onChange({ shortDescription: event.target.value })}
                placeholder="What makes this place worth the trip?"
                aria-invalid={!!errors.description}
              />
              <FieldError message={errors.description} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="curation-duration-min">Minimum visit (minutes)</Label>
                <Input
                  id="curation-duration-min"
                  type="number"
                  min={1}
                  value={fields.durationMinMinutes ?? ''}
                  onChange={(event) =>
                    onChange({
                      durationMinMinutes:
                        event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="curation-duration-max">Maximum visit (minutes)</Label>
                <Input
                  id="curation-duration-max"
                  type="number"
                  min={1}
                  value={fields.durationMaxMinutes ?? ''}
                  onChange={(event) =>
                    onChange({
                      durationMaxMinutes:
                        event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
              </div>
            </div>
            <FieldError message={errors.duration} />
            <div>
              <Label>Transport modes</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Transport modes">
                {TRANSPORT_MODES.map((mode) => (
                  <Chip
                    key={mode}
                    label={humanize(mode)}
                    selected={fields.transportModes.includes(mode)}
                    onToggle={() =>
                      onChange({
                        transportModes: fields.transportModes.includes(mode)
                          ? fields.transportModes.filter((value) => value !== mode)
                          : [...fields.transportModes, mode],
                      })
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Best seasons</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Best seasons">
                {BEST_SEASONS.map((season) => (
                  <Chip
                    key={season}
                    label={humanize(season)}
                    selected={fields.bestSeasons.includes(season)}
                    onToggle={() =>
                      onChange({
                        bestSeasons: fields.bestSeasons.includes(season)
                          ? fields.bestSeasons.filter((value) => value !== season)
                          : [...fields.bestSeasons, season],
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </Section>

          <Section
            title="Fees and hours"
            hint="Never publish a fee or hour claim the program has not reviewed."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="curation-fee-status">Fee status</Label>
                <Select
                  value={fields.feeStatus ?? undefined}
                  onValueChange={(value) => onChange({ feeStatus: value as FeeStatus })}
                >
                  <SelectTrigger id="curation-fee-status" className="w-full">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {humanize(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.fee_status} />
              </div>
              <div>
                <Label htmlFor="curation-fee-amount">Amount (KES)</Label>
                <Input
                  id="curation-fee-amount"
                  type="number"
                  min={0}
                  value={fields.feeAmount ?? ''}
                  onChange={(event) =>
                    onChange({
                      feeAmount:
                        event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
                <FieldError message={errors.fee_amount} />
              </div>
              <div>
                <Label htmlFor="curation-fee-currency">Currency</Label>
                <Input
                  id="curation-fee-currency"
                  value={fields.feeCurrency}
                  onChange={(event) =>
                    onChange({
                      feeCurrency: event.target.value.toUpperCase().slice(0, 3),
                    })
                  }
                />
                <FieldError message={errors.fee_currency} />
              </div>
            </div>
            <div>
              <Label htmlFor="curation-fee-basis">Fee basis</Label>
              <Input
                id="curation-fee-basis"
                value={fields.feeBasis}
                onChange={(event) => onChange({ feeBasis: event.target.value })}
                placeholder="e.g. adult non-resident entry, published 2026"
              />
              <FieldError message={errors.fee_basis} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="curation-hours-status">Opening-hours status</Label>
                <Select
                  value={fields.openingHoursStatus ?? undefined}
                  onValueChange={(value) =>
                    onChange({ openingHoursStatus: value as OpeningHoursStatus })
                  }
                >
                  <SelectTrigger id="curation-hours-status" className="w-full">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENING_HOURS_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {humanize(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.hours_status} />
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {fields.openingHours
                  ? 'Structured hours are present from Google Places. Review them before marking verified.'
                  : 'No structured opening hours are attached. Leave the status unverified until the program has them.'}
              </div>
            </div>
            <FieldError message={errors.hours_data} />
          </Section>

          <Section title="Ownership and review" hint="Monthly cadence: new publishes default to a review 30 days out.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="curation-owner">Content owner</Label>
                <Input
                  id="curation-owner"
                  value={fields.contentOwner}
                  onChange={(event) => onChange({ contentOwner: event.target.value })}
                  placeholder="YTCI Content Team"
                />
                <FieldError message={errors.owner} />
              </div>
              <div>
                <Label htmlFor="curation-review-date">Next review date</Label>
                <Input
                  id="curation-review-date"
                  type="date"
                  value={fields.reviewDate}
                  onChange={(event) => onChange({ reviewDate: event.target.value })}
                />
                <FieldError message={errors.review_date} />
              </div>
            </div>
          </Section>

          <Section
            title="Media and provenance"
            hint="A hero image and a source make the place legible in the traveler app."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="curation-image">Hero image URL</Label>
                <Input
                  id="curation-image"
                  value={fields.heroImageUrl}
                  onChange={(event) => onChange({ heroImageUrl: event.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label htmlFor="curation-credit">Hero image credit</Label>
                <Input
                  id="curation-credit"
                  value={fields.heroImageAttribution}
                  onChange={(event) =>
                    onChange({ heroImageAttribution: event.target.value })
                  }
                  placeholder="Photographer or rights holder"
                />
                <FieldError message={errors.hero_attribution} />
              </div>
            </div>
            <div>
              <Label htmlFor="curation-source">Source</Label>
              <Input
                id="curation-source"
                value={fields.source}
                onChange={(event) => onChange({ source: event.target.value })}
              />
              <FieldError message={errors.source} />
            </div>
          </Section>

          {candidate.rejectionReason ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-destructive">
              Rejected: {candidate.rejectionReason}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border bg-card px-5 py-3">
        {!readiness.ready ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Publish unlocks when every required composer-ready check passes.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={saving || isPublished}>
            {savingAction === 'draft' ? 'Saving…' : 'Save draft'}
          </Button>
          <Button variant="outline" onClick={onSaveAndNext} disabled={saving || isPublished}>
            Save & next
          </Button>
          <Button
            onClick={onPublish}
            disabled={saving || !readiness.ready || !canPublish || isPublished}
          >
            {savingAction === 'publish' ? 'Publishing…' : 'Publish as YTCI-reviewed'}
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setRejectOpen(true)}
            disabled={saving || isPublished}
          >
            {savingAction === 'reject' ? 'Rejecting…' : 'Reject'}
          </Button>
          {!canPublish ? (
            <span className="text-xs text-muted-foreground">
              Your role can edit drafts but not publish.
            </span>
          ) : null}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {candidate.name}?</DialogTitle>
            <DialogDescription>
              This place will leave the review queue and stop counting as an unverified candidate.
              Any linked draft is archived. The name is kept in the rejection record.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="rejection-reason">Reason</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. not a visitable destination, duplicate, unsafe access"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => {
                onReject(reason.trim())
                setReason('')
                setRejectOpen(false)
              }}
            >
              Reject place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
