import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import type { UserItem } from '#/lib/api/users'
import type { AssignReviewerInput } from '#/lib/api/audio-stories'
import { fieldErrors, reviewAssignmentSchema } from '#/lib/schemas/audio-story.schema'
import { FormSelect, FormTextarea } from '#/components/shared/FormField'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

interface AssignFormState {
  reviewerId: string
  secondReviewerId: string
  reason: string
}

interface AssignReviewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storyTitle?: string
  currentReviewerId?: string
  currentSecondReviewerId?: string
  excludedUserIds?: string[]
  reassigning?: boolean
  saving?: boolean
  onAssign: (input: AssignReviewerInput) => Promise<boolean>
}

function formFor(currentReviewerId?: string, currentSecondReviewerId?: string): AssignFormState {
  return {
    reviewerId: currentReviewerId ?? '',
    secondReviewerId: currentSecondReviewerId ?? '',
    reason: '',
  }
}

export function AssignReviewerDialog({
  open,
  onOpenChange,
  storyTitle,
  currentReviewerId,
  currentSecondReviewerId,
  excludedUserIds = [],
  reassigning = false,
  saving = false,
  onAssign,
}: AssignReviewerDialogProps) {
  const api = useApi()
  const [form, setForm] = useState<AssignFormState>(() => formFor(currentReviewerId, currentSecondReviewerId))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reviewers, setReviewers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const excludedKey = excludedUserIds.join('|')

  useEffect(() => {
    if (!open) return
    setForm(formFor(currentReviewerId, currentSecondReviewerId))
    setErrors({})
    setDiscardOpen(false)
  }, [open, currentReviewerId, currentSecondReviewerId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    const loadRole = (role: string) =>
      fetch(`/api/admin/users/list?role=${role}&limit=100`, { credentials: 'same-origin' })
        .then(async (response) => {
          if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'Failed to load reviewers')
          return response.json() as Promise<{ users: UserItem[] }>
        })
    Promise.all([loadRole('administrator'), loadRole('super_admin')])
      .then(([administrators, superAdmins]) => {
        if (cancelled) return
        const excluded = new Set(excludedKey ? excludedKey.split('|') : [])
        const merged = [...administrators.users, ...superAdmins.users]
        const unique = Array.from(new Map(merged.map((user) => [user.id, user])).values())
          .filter((user) => !user.banned && !excluded.has(user.id))
          .sort((a, b) => a.name.localeCompare(b.name))
        setReviewers(unique)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Could not load reviewers')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, api, excludedKey, reloadToken])

  const currentForm = formFor(currentReviewerId, currentSecondReviewerId)
  const dirty = form.reviewerId !== currentForm.reviewerId
    || form.secondReviewerId !== currentForm.secondReviewerId
    || form.reason.trim().length > 0

  const setField = (field: keyof AssignFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  const submit = async () => {
    if (reassigning && !form.reason.trim()) {
      setErrors({ reason: 'Explain why the decision authority is changing' })
      return
    }
    const parsed = reviewAssignmentSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      toast.error('Check the reviewer assignment fields.')
      return
    }
    try {
      const success = await onAssign({
        reviewerId: form.reviewerId,
        secondReviewerId: form.secondReviewerId || undefined,
        reason: form.reason.trim() || undefined,
      })
      if (success) {
        setDiscardOpen(false)
        onOpenChange(false)
      }
    } catch {
      /* parent surfaces the API error */
    }
  }

  const selectedReviewer = reviewers.find((user) => user.id === form.reviewerId)
  const selectedSecond = reviewers.find((user) => user.id === form.secondReviewerId)

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reassigning ? 'Reassign reviewer' : 'Assign reviewer'}</DialogTitle>
            <DialogDescription>
              {storyTitle ? <><strong>{storyTitle}</strong> · </> : null}
              Reviewers must be administrators or super admins. Reviewers cannot review their own upload or attestation.
            </DialogDescription>
          </DialogHeader>

          {reassigning && (
            <div className="rounded-lg border border-[var(--amber-deep)] bg-[var(--amber-bg)] px-4 py-3 text-xs text-[var(--amber-deep)]" role="note">
              Reassigning changes who holds decision authority for this revision. Reviews already recorded stay in the history and are never rewritten.
            </div>
          )}

          <div className="grid gap-4">
            <FormSelect
              label="Primary reviewer"
              required
              value={form.reviewerId}
              onChange={(value) => setField('reviewerId', value)}
              options={reviewers.map((user) => ({
                value: user.id,
                label: `${user.name} · ${user.role === 'super_admin' ? 'Super admin' : 'Administrator'}`,
              }))}
              error={errors.reviewerId}
              description={loading ? 'Loading reviewers…' : loadError ?? (reviewers.length === 0 ? 'No eligible reviewers found.' : undefined)}
              disabled={loading || Boolean(loadError)}
            />
            <FormSelect
              label="Second reviewer (sensitive stories)"
              value={form.secondReviewerId}
              onChange={(value) => setField('secondReviewerId', value)}
              options={reviewers
                .filter((user) => user.id !== form.reviewerId)
                .map((user) => ({
                  value: user.id,
                  label: `${user.name} · ${user.role === 'super_admin' ? 'Super admin' : 'Administrator'}`,
                }))}
              error={errors.secondReviewerId}
              description="Optional until a sensitive revision needs two distinct approvals."
              disabled={loading || Boolean(loadError)}
            />
            <FormTextarea
              label={reassigning ? 'Reason for reassignment' : 'Assignment note'}
              required={reassigning}
              value={form.reason}
              onChange={(value) => setField('reason', value)}
              error={errors.reason}
              placeholder={reassigning ? 'Original reviewer unavailable / conflict of interest' : 'Optional context for the reviewer'}
            />
            {(selectedReviewer || selectedSecond) && (
              <p className="text-xs text-muted-foreground">
                {selectedReviewer ? `Primary: ${selectedReviewer.email}` : ''}
                {selectedReviewer && selectedSecond ? ' · ' : ''}
                {selectedSecond ? `Second: ${selectedSecond.email}` : ''}
              </p>
            )}
            {loadError && (
              <Button variant="outline" size="sm" onClick={() => setReloadToken((value) => value + 1)}>
                Retry reviewer list
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={saving || loading || Boolean(loadError) || reviewers.length === 0}>
              {saving ? 'Saving…' : reassigning ? 'Reassign reviewer' : 'Assign reviewer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard assignment changes?"
        description="The reviewer selection and note have not been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false)
          setForm(currentForm)
          setErrors({})
          onOpenChange(false)
        }}
      />
    </>
  )
}
