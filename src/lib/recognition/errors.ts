/**
 * Operator-facing copy for XP adjustment failures.
 *
 * The Go API rejects a bad second approver with one of four 403 codes. Each one
 * has a different fix, so the client never falls back to a generic "forbidden"
 * message and never treats a rejected write as success.
 */
import { ContractsApiError } from '#/lib/contracts/client'

export const ADJUSTMENT_ERROR_COPY = {
  SECOND_APPROVER_REQUIRED:
    'A second approver is required. Choose an active approver who is not you — you cannot approve your own adjustment.',
  SECOND_APPROVER_UNKNOWN:
    'The selected approver no longer exists. Reload the approver list and choose another active approver.',
  SECOND_APPROVER_INACTIVE:
    'The selected approver is inactive or suspended. Choose another active approver.',
  SECOND_APPROVER_FORBIDDEN:
    'The selected approver cannot approve adjustments (missing recognition.approve_adjustment). Choose another approver.',
  FORBIDDEN: 'Your account cannot record XP adjustments. Nothing was changed.',
  UNAUTHORIZED: 'Your session expired. Sign in again; nothing was changed.',
} as const

export type AdjustmentErrorCode = keyof typeof ADJUSTMENT_ERROR_COPY

export function isAdjustmentErrorCode(code: unknown): code is AdjustmentErrorCode {
  return typeof code === 'string' && code in ADJUSTMENT_ERROR_COPY
}

export function adjustmentErrorCopy(error: unknown): string {
  if (error instanceof ContractsApiError && isAdjustmentErrorCode(error.code)) {
    return ADJUSTMENT_ERROR_COPY[error.code]
  }
  if (error instanceof Error && error.message) return error.message
  return 'The adjustment was not recorded. Nothing changed; try again.'
}

/**
 * Preserve the machine code for logs/tests while showing actionable copy.
 * Non-contract errors pass through untouched.
 */
export function asAdjustmentError(error: unknown): unknown {
  if (!(error instanceof ContractsApiError)) return error
  return new ContractsApiError(error.status, error.code, adjustmentErrorCopy(error), {
    details: error.details,
    requestId: error.requestId,
    fieldErrors: error.fieldErrors,
  })
}
