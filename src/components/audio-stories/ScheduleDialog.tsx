import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  audioScheduleSchema, eatDateTimeToIso, fieldErrors,
} from '#/lib/schemas/audio-story.schema'
import { FormInput } from '#/components/shared/FormField'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onSchedule: (publishAt: string) => Promise<boolean>
}

export function ScheduleDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Schedule publish',
  loading = false,
  onSchedule,
}: ScheduleDialogProps) {
  const [value, setValue] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setValue('')
    setErrors({})
    setDiscardOpen(false)
  }, [open])

  const requestClose = () => {
    if (loading) return
    if (value.trim()) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  const submit = async () => {
    const publishAt = eatDateTimeToIso(value)
    if (!publishAt) {
      setErrors({ publishAt: 'Choose a valid date and time in EAT' })
      toast.error('Choose a future date and time in East Africa Time.')
      return
    }
    const parsed = audioScheduleSchema.safeParse({ publishAt })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      toast.error('Choose a future date and time in East Africa Time.')
      return
    }
    try {
      const success = await onSchedule(publishAt)
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

          <div className="grid gap-3">
            <FormInput
              label="Publish date and time"
              required
              type="datetime-local"
              value={value}
              onChange={(next) => {
                setValue(next)
                setErrors({})
              }}
              error={errors.publishAt}
              description="East Africa Time (UTC+3). The scheduler publishes at this instant."
            />
            <p className="rounded-lg bg-[var(--surface-2)] px-4 py-3 text-xs text-muted-foreground">
              Scheduling does not bypass review or readiness. The revision must already be approved and all blocking readiness checks must pass.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={loading}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={loading || !value.trim()}>
              {loading ? 'Scheduling…' : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard the schedule time?"
        description="The publish date and time has not been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false)
          setValue('')
          setErrors({})
          onOpenChange(false)
        }}
      />
    </>
  )
}
