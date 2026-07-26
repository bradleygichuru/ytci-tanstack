import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { authClient } from '#/lib/auth-client'
import { useState } from 'react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await authClient.signIn.email({
          email: value.email,
          password: value.password,
          callbackURL: redirectTo ?? '/',
        })
      } catch (err) {
        setError('Login failed — check your credentials or account status.')
        console.error('Sign in failed', err)
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-5"
    >
      <form.Field name="email">
        {(field) => (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#191c1d]">Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#42493e] focus:border-[#154212] focus:ring-1 focus:ring-[#154212]"
              style={{ borderColor: '#c2c9bb' }}
            />
            {field.state.meta.errors && (
              <p className="mt-1 text-xs text-[#ba1a1a]">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-[#191c1d]">Password</label>
              <a href="/forgot-password" className="text-xs font-semibold text-[#345a00] hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#42493e] focus:border-[#154212] focus:ring-1 focus:ring-[#154212]"
              style={{ borderColor: '#c2c9bb' }}
            />
            {field.state.meta.errors && (
              <p className="mt-1 text-xs text-[#ba1a1a]">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      </form.Field>

      {error && (
        <p className="rounded-lg bg-[rgba(186,26,26,0.1)] px-4 py-3 text-sm font-semibold text-[var(--error)]">{error}</p>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-[#154212] py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#002b02]"
      >
        Sign In
      </button>

      {/* OAuth providers (Google/Apple) — deferred to follow-up map */}

      <p className="text-center text-xs text-[#42493e]">
        Don&apos;t have an account?{' '}
        <a href="#" className="font-semibold text-[#345a00] hover:underline">Contact support</a>
      </p>
    </form>
  )
}
