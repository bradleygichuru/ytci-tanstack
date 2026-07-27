import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { authClient } from '#/lib/auth-client'
import { Link, useSearch } from '@tanstack/react-router'

const resetSchema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
})

export function ResetForm() {
  const search = useSearch({ from: '/reset-password' }) as { token?: string }

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validators: { onSubmit: resetSchema },
    onSubmit: async ({ value }) => {
      try {
        await authClient.resetPassword({
          newPassword: value.password,
          token: search.token ?? '',
        })
      } catch (err) {
        console.error('Reset password failed', err)
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        Must be at least 8 characters.
      </p>

      <form.Field name="password">
        {(field) => (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {field.state.meta.errors && (
              <p className="mt-1 text-xs text-[#ba1a1a]">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {field.state.meta.errors && (
              <p className="mt-1 text-xs text-[#ba1a1a]">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      </form.Field>

      <button
        type="submit"
        className="w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#002b02]"
      >
        Reset Password
      </button>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/login" className="font-semibold text-[#345a00] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
