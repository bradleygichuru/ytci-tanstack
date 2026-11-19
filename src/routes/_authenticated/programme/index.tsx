/**
 * Programme hub — the admin shell's index for the new surfaces.
 *
 * Lists the registry's shell surfaces the current role can open. It owns no
 * feature UI: each owning stream replaces its own `$surface` route body.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { useContractRole } from '#/lib/contracts/session'
import { useFlags } from '#/lib/flags'
import { isItemVisible, SHELL_SURFACES } from '#/lib/navigation/sections'

export const Route = createFileRoute('/_authenticated/programme/')({
  component: ProgrammeHubPage,
})

function ProgrammeHubPage() {
  const { role } = useContractRole()
  const flags = useFlags()
  const surfaces = SHELL_SURFACES.filter((item) => isItemVisible(item, { role, flags }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programme"
        description="Execution surfaces shared by the programme streams."
      />
      {surfaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No programme surfaces are enabled for your role.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {surfaces.map((item) => (
            <li key={item.key}>
              <Link
                to={item.path}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="size-5 text-foreground" weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {item.owner ?? 'Shell placeholder'}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" weight="bold" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
