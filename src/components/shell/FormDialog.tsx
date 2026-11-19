/**
 * Shared form dialog.
 *
 * One wrapper for create/edit dialogs: title, description, body, confirm/cancel,
 * pending state and a field-error summary. Action gating is the caller's job
 * (use `<Can>`), so a stream never renders its own submit button styles.
 */
import type { FormEvent, ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  submitLabel?: string
  cancelLabel?: string
  pendingLabel?: string
  pending?: boolean
  /** Server field errors keyed by field name. */
  fieldErrors?: Record<string, string>
  /** Non-field error summary from the frozen error envelope. */
  error?: string | null
  onSubmit: () => void
  variant?: 'default' | 'destructive'
  size?: 'sm' | 'default' | 'lg'
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  pendingLabel = 'Saving…',
  pending = false,
  fieldErrors,
  error,
  onSubmit,
  variant = 'default',
  size = 'default',
}: FormDialogProps) {
  const hasFieldErrors = Boolean(fieldErrors && Object.keys(fieldErrors).length > 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!pending ? onOpenChange(next) : undefined)}>
      <DialogContent className={size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-sm' : undefined}>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}
            {hasFieldErrors ? (
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <p className="font-semibold">Check these fields</p>
                <ul className="mt-1 list-inside list-disc">
                  {Object.entries(fieldErrors ?? {}).map(([field, message]) => (
                    <li key={field}>
                      {field}: {message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {children}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" variant={variant} disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
