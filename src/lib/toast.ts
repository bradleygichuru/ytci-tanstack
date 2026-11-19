/**
 * Toast helpers.
 *
 * One place decides how an API error becomes a sentence. Screens call
 * `notify.error(error)` instead of rendering raw exception text or inventing
 * their own copy. Field-level validation stays in the form via
 * `ContractsApiError.fieldErrors`.
 */
import { toast } from 'sonner'
import { ContractsApiError } from '#/lib/contracts/client'

export function errorMessage(error: unknown): string {
  if (error instanceof ContractsApiError) {
    if (error.fieldErrors.length > 0) {
      const summary = error.fieldErrors
        .slice(0, 3)
        .map((entry) => `${entry.field}: ${entry.message}`)
        .join(', ')
      return summary
    }
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Try again.'
}

export const notify = {
  success(message: string) {
    toast.success(message)
  },
  info(message: string) {
    toast.info(message)
  },
  warning(message: string) {
    toast.warning(message)
  },
  error(error: unknown) {
    toast.error(errorMessage(error))
  },
  /** Copy for the audit-style acknowledgement used after a write. */
  saved(what = 'Changes') {
    toast.success(`${what} saved`)
  },
}
