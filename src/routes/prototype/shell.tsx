// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.
// Question: "What should the per-area admin page look like?"
// Variants: A = Moderation Queue (table-driven), B = Moderation Review (detail pane)

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { VariantA_ModerationQueue } from '../../components/prototype/Variants/VariantA_ModerationQueue'
import { VariantB_ModerationDetail } from '../../components/prototype/Variants/VariantB_ModerationDetail'
import { Switcher } from '../../components/prototype/Switcher'

const searchSchema = z.object({
  variant: z.enum(['A', 'B']).default('A'),
})

export const Route = createFileRoute('/prototype/shell')({
  validateSearch: searchSchema,
  component: ShellPrototype,
})

const variants = [
  { key: 'A', label: 'Moderation Queue (table)' },
  { key: 'B', label: 'Moderation Detail (split pane)' },
]

function ShellPrototype() {
  const { variant } = Route.useSearch()

  return (
    <>
      {variant === 'A' ? <VariantA_ModerationQueue /> : <VariantB_ModerationDetail />}
      <Switcher variants={variants} current={variant} />
    </>
  )
}
