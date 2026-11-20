import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { audioReasonSchema, audioRevokeSchema, fieldErrors } from '#/lib/schemas/audio-story.schema'
import { FormInput, FormTextarea } from '#/components/shared/FormField'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  reasonLabel?: string
  reasonPlaceholder?: string
  requireEvidence?: boolean
  evidenceLabel?: string
  evidencePlaceholder?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: (input: { reason: string; evidenceReference?: string }) => Promise<boolean>
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  reasonLabel = 'Reason',
  reasonPlaceholder,
  requireEvidence = false,
  evidenceLabel = 'Evidence reference',
  evidencePlaceholder,
  variant = 'default',
  loading = false,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [evidenceReference, setEvidenceReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason('')
    setEvidenceReference('')
    setErrors({})
    setDiscardOpen(false)
  }, [open, title])

  const dirty = Boolean(reason.trim() || evidenceReference.trim())

  const requestClose = () => {
    if (loading) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  const submit = async () => {
    const parsed = (requireEvidence ? audioRevokeSchema : audioReasonSchema).safeParse({
      reason,
      ...(requireEvidence ? { evidenceReference } : {}),
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      toast.error(requireEvidence ? 'Add a reason and evidence reference.' : 'Add a reason.')
      return
    }
    try {
      const success = await onConfirm({
        reason: reason.trim(),
        evidenceReference: requireEvidence ? evidenceReference.trim() : undefined,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <FormTextarea
              label={reasonLabel}
              required
              value={reason}
              onChange={(value) => {
                setReason(value)
                setErrors((current) => {
                  if (!current.reason) return current
                  const next = { ...current }
                  delete next.reason
                  return next
                })
              }}
              error={errors.reason}
              placeholder={reasonPlaceholder}
              description="Written to the audit timeline and visible to editors."
            />
            {requireEvidence && (
              <FormInput
                label={evidenceLabel}
                required
                value={evidenceReference}
                onChange={(value) => {
                  setEvidenceReference(value)
                  setErrors((current) => {
                    if (!current.evidenceReference) return current
                    const next = { ...current }
                    delete next.evidenceReference
                    return next
                  })
                }}
                error={errors.evidenceReference}
                placeholder={evidencePlaceholder}
                description="Link or cite the source that supports this decision."
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={loading}>Cancel</Button>
            <Button variant={variant} onClick={() => void submit()} disabled={loading || !reason.trim() || (requireEvidence && !evidenceReference.trim())}>
              {loading ? 'Saving…' : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard this note?"
        description="Nothing has been saved. Closing now discards the text you entered."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false)
          setReason('')
          setEvidenceReference('')
          setErrors({})
          onOpenChange(false)
        }}
      />
    </>
  )
}
