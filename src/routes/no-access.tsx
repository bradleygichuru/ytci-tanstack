import { createFileRoute, Link } from '@tanstack/react-router'
import { ShieldSlash } from '@phosphor-icons/react'

export const Route = createFileRoute('/no-access')({
  component: NoAccessPage,
})

function NoAccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] p-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <ShieldSlash className="h-8 w-8 text-[#ba1a1a]" weight="duotone" />
      </div>
      <h1 className="text-2xl font-bold text-[#191c1d]">No Access</h1>
      <p className="mt-2 text-sm text-[#42493e]">
        You don&apos;t have permission to view this page.
      </p>
      <Link
        to="/login"
        className="mt-6 rounded-full bg-[#154212] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#002b02]"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
