import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthLayout } from '../components/auth/AuthLayout'
import { LoginForm } from '../components/auth/LoginForm'

const loginSearch = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearch,
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your admin account to continue."
      nav={[
        { label: 'Sign In', href: '/login', active: true },
        { label: 'Forgot', href: '/forgot-password', active: false },
        { label: 'Reset', href: '/reset-password', active: false },
      ]}
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthLayout>
  )
}
