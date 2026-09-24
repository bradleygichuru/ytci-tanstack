import { useState, type FormEvent } from 'react'
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
  const [stalled, setStalled] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (loading) return
    setError(null)
    setStalled(false)
    if (!emailPattern.test(email)) {
      setError('Enter a valid email address')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    const stallTimer = setTimeout(() => setStalled(true), 15000)
    try {
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
        },
      })
    } finally {
      clearTimeout(stallTimer)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-semibold text-foreground">Password</label>
          <a href="/forgot-password" className="text-xs font-semibold text-success-leaf hover:underline">
            Forgot password?
          </a>
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
      {stalled && loading && (
        <p role="status" className="text-center text-xs text-muted-foreground">Taking longer than expected… please wait, do not resubmit.</p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a href="#" className="font-semibold text-success-leaf hover:underline">Contact support</a>
      </p>
    </form>
  )
}
