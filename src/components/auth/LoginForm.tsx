import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { useNavigate } from '@tanstack/react-router'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit() {
    setError(null)
    if (!emailPattern.test(email)) {
      setError('Enter a valid email address')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    await authClient.signIn.email({
      email,
      password,
      callbackURL: redirectTo ?? '/analytics',
    }, {
      onSuccess: (ctx) => {
        navigate({ to: ctx.data?.url ?? redirectTo ?? '/analytics' })
      },
      onError: (ctx) => {
        setError(ctx.error.message || 'Login failed.')
        setLoading(false)
      },
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
        <input
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Password</label>
          <a href="/forgot-password" className="text-xs font-semibold text-success-leaf hover:underline">
            Forgot password?
          </a>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a href="#" className="font-semibold text-success-leaf hover:underline">Contact support</a>
      </p>
    </div>
  )
}
