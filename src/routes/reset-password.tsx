import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthLayout } from '../components/auth/AuthLayout'
import { ResetForm } from '../components/auth/ResetForm'

const resetSearch = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: resetSearch,
  component: ResetPage,
})

function ResetPage() {
  return (
    <AuthLayout
      title="Set new password"
      subtitle="Must be at least 8 characters."
      nav={[
        { label: 'Sign In', href: '/login', active: false },
        { label: 'Forgot', href: '/forgot-password', active: false },
        { label: 'Reset', href: '/reset-password', active: true },
      ]}
    >
      <ResetForm />
    </AuthLayout>
  )
}
