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
        <label className="mb-1.5 block text-sm font-semibold text-[#191c1d]">Email</label>
        <input
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#42493e] focus:border-[#154212] focus:ring-1 focus:ring-[#154212]"
          style={{ borderColor: '#c2c9bb' }}
        />
      </div>

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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#42493e] focus:border-[#154212] focus:ring-1 focus:ring-[#154212]"
          style={{ borderColor: '#c2c9bb' }}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-[rgba(186,26,26,0.1)] px-4 py-3 text-sm font-semibold text-[var(--error)]">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-full bg-[#154212] py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#002b02] disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <p className="text-center text-xs text-[#42493e]">
        Don&apos;t have an account?{' '}
        <a href="#" className="font-semibold text-[#345a00] hover:underline">Contact support</a>
      </p>
    </div>
  )
}
