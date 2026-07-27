import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { authClient } from '#/lib/auth-client'
import { Link } from '@tanstack/react-router'

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export function ForgotForm() {
  const form = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: forgotSchema },
    onSubmit: async ({ value }) => {
      try {
        await authClient.requestPasswordReset({ email: value.email })
      } catch (err) {
        console.error('Forgot password failed', err)
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
        Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
      </p>

      <form.Field name="email">
        {(field) => (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {field.state.meta.errors && (
              <p className="mt-1 text-xs text-destructive">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      </form.Field>

      <button
        type="submit"
        className="w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90"
      >
        Send Reset Link
      </button>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/login" className="font-semibold text-[var(--success-leaf)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
