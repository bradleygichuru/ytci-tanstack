import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { Gear } from '@phosphor-icons/react'

export const Route = createFileRoute('/_authenticated/ai-config')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'aiConfig', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AiConfigPlaceholder,
})

function AiConfigPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Gear className="mb-4 h-16 w-16 text-muted-foreground" weight="duotone" />
      <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground">AI Engine Configuration</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        AI Config endpoints are not yet implemented in the Go backend. This page will be enabled when the backend supports it.
      </p>
    </div>
  )
}
