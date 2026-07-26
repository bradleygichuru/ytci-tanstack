import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../components/auth/AuthLayout'
import { ForgotForm } from '../components/auth/ForgotForm'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPage,
})

function ForgotPage() {
  return (
    <AuthLayout
      title="Forgot password"
      subtitle="No worries — we'll send you a reset link."
      nav={[
        { label: 'Sign In', href: '/login', active: false },
        { label: 'Forgot', href: '/forgot-password', active: true },
        { label: 'Reset', href: '/reset-password', active: false },
      ]}
    >
      <ForgotForm />
    </AuthLayout>
  )
}
