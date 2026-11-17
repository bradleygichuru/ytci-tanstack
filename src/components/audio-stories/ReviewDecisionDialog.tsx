import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ReviewDecision, RiskTier } from '#/lib/api/audio-stories'
import { fieldErrors, reviewDecisionSchema } from '#/lib/schemas/audio-story.schema'
import { FormInput, FormTextarea } from '#/components/shared/FormField'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

interface DecisionFormState {
  notes: string
  externalReviewerName: string
  externalReviewerAffiliation: string
}

const COPY: Record<ReviewDecision, { title: string; description: string; confirm: string; variant: 'default' | 'destructive' }> = {
  approve: {
    title: 'Approve this revision?',
    description: 'The revision becomes eligible for publishing once readiness passes. For sensitive stories, the first approval records the review but keeps the revision in review until a second distinct reviewer approves.',
    confirm: 'Approve revision',
    variant: 'default',
  },
  request_changes: {
    title: 'Request changes?',
    description: 'The revision returns to draft so the author can revise. Your notes are required and become part of the review record.',
    confirm: 'Request changes',
    variant: 'destructive',
  },
  reject: {
    title: 'Reject this revision?',
    description: 'The revision returns to draft and the rejection is recorded permanently. The author will see your notes in the audit history.',
    confirm: 'Reject revision',
    variant: 'destructive',
  },
}

function emptyForm(): DecisionFormState {
  return { notes: '', externalReviewerName: '', externalReviewerAffiliation: '' }
}

interface ReviewDecisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  decision: ReviewDecision
  storyTitle?: string
  riskTier?: RiskTier
  approvals?: number
  requiredApprovals?: number
  saving?: boolean
  onConfirm: (input: {
    decision: ReviewDecision
    notes?: string
    externalReviewerName?: string
    externalReviewerAffiliation?: string
  }) => Promise<boolean>
}

export function ReviewDecisionDialog({
  open,
  onOpenChange,
  decision,
  storyTitle,
  riskTier,
  approvals = 0,
  requiredApprovals = 1,
  saving = false,
  onConfirm,
}: ReviewDecisionDialogProps) {
  const [form, setForm] = useState<DecisionFormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [discardOpen, setDiscardOpen] = useState(false)
  const copy = COPY[decision]

  useEffect(() => {
    if (!open) return
    setForm(emptyForm())
    setErrors({})
    setDiscardOpen(false)
  }, [open, decision])

  const dirty = Boolean(form.notes.trim() || form.externalReviewerName.trim() || form.externalReviewerAffiliation.trim())

  const setField = (field: keyof DecisionFormState, value: string) => {
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
    const parsed = reviewDecisionSchema.safeParse({ decision, ...form })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      toast.error(decision === 'approve' ? 'Check the review fields.' : 'Add the required review notes.')
      return
    }
    try {
      const success = await onConfirm({
        decision,
        notes: form.notes.trim() || undefined,
        externalReviewerName: form.externalReviewerName.trim() || undefined,
        externalReviewerAffiliation: form.externalReviewerAffiliation.trim() || undefined,
      })
      if (success) {
        setDiscardOpen(false)
        onOpenChange(false)
      }
    } catch {
      /* parent surfaces the API error */
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>
              {storyTitle ? <><strong>{storyTitle}</strong> · </> : null}
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-3 text-xs text-muted-foreground">
            Risk tier: <strong className="capitalize text-foreground">{riskTier ?? 'standard'}</strong>
            {' · '}Approvals: <strong className="text-foreground">{approvals} of {requiredApprovals}</strong>
            {riskTier === 'restricted' && (
              <span className="mt-1 block text-destructive">Restricted material cannot be approved in this workflow.</span>
            )}
            {riskTier === 'sensitive' && decision === 'approve' && approvals < requiredApprovals && (
              <span className="mt-1 block text-[var(--amber-deep)]">A second distinct reviewer is required before publishing.</span>
            )}
          </div>

          <FormTextarea
            label="Review notes"
            required={decision !== 'approve'}
            value={form.notes}
            onChange={(value) => setField('notes', value)}
            error={errors.notes}
            placeholder={decision === 'approve' ? 'Optional conditions or observations for the record' : 'What must change before this can be approved?'}
            description={decision === 'approve' ? 'Optional. Read-only once recorded.' : 'Required. Read-only once recorded.'}
          />

          <fieldset className="rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">External reviewer</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Only when the decision is made by someone without an administrator account. Recorded in the review history.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Name"
                value={form.externalReviewerName}
                onChange={(value) => setField('externalReviewerName', value)}
                error={errors.externalReviewerName}
              />
              <FormInput
                label="Affiliation"
                value={form.externalReviewerAffiliation}
                onChange={(value) => setField('externalReviewerAffiliation', value)}
                placeholder="Partner organisation or legal counsel"
              />
            </div>
          </fieldset>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={saving}>Cancel</Button>
            <Button variant={copy.variant} onClick={() => void submit()} disabled={saving || (decision === 'approve' && riskTier === 'restricted')}>
              {saving ? 'Recording…' : copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard review notes?"
        description="The decision has not been recorded. Closing now discards the notes you entered."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false)
          setForm(emptyForm())
          setErrors({})
          onOpenChange(false)
        }}
      />
    </>
  )
}
