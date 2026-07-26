// THROWAWAY — UI prototype for ticket #10.
// Lives on branch prototype/auth-design. Throw away when verdict is captured.
// Question: "What should the auth pages (login, forgot, reset) look like?"
// 3 variants: A = centered card, B = split-screen, C = minimal/no-card

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Switcher } from '../../components/prototype/Switcher'
import { AUTH_VARIANTS } from '../../components/prototype/auth/AuthLayout'
import { VariantA } from '../../components/prototype/auth/VariantA'
import { VariantB } from '../../components/prototype/auth/VariantB'
import { VariantC } from '../../components/prototype/auth/VariantC'

const searchSchema = z.object({
  variant: z.enum(['A', 'B', 'C']).default('A'),
  page: z.enum(['login', 'forgot', 'reset']).default('login'),
})

export const Route = createFileRoute('/prototype/auth')({
  validateSearch: searchSchema,
  component: AuthPrototype,
})

const VARIANT_MAP: Record<string, typeof VariantA> = {
  A: VariantA,
  B: VariantB,
  C: VariantC,
}

function AuthPrototype() {
  const { variant, page } = Route.useSearch()
  const navigate = Route.useNavigate()

  const VariantComponent = VARIANT_MAP[variant] ?? VariantA

  const handlePageChange = (p: 'login' | 'forgot' | 'reset') => {
    navigate({ to: '.', search: { variant, page: p }, replace: true })
  }

  return (
    <>
      <VariantComponent page={page} onPageChange={handlePageChange} />
      <Switcher variants={AUTH_VARIANTS} current={variant} />
    </>
  )
}
