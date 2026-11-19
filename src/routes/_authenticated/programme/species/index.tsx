import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, WarningCircle } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { DataStateView } from '#/components/shell/DataState'
import { PageHeader } from '#/components/shell/PageHeader'
import { CoverageBar, Kpi, SectionCard, StatusPill } from '#/components/species/shared'
import { useSpecies } from '#/lib/species/store'
import { formatDate, languageLabel } from '#/lib/species/model'

export const Route = createFileRoute('/_authenticated/programme/species/')({
  component: SpeciesOverviewPage,
})

function SpeciesOverviewPage() {
  const {
    fixtureState,
    setFixtureState,
    rows,
    coverage,
    audit,
    tasks,
    overlay,
    sources,
    rights,
    details,
  } = useSpecies()

  if (fixtureState === 'empty') {
    return (
      <>
        <PageHeader
          title="Species overview"
          description="Catalogue health, language coverage and the decisions waiting on a person."
        />
        <DataStateView
          state="empty"
          title="No species in this view"
          description="The catalogue is empty for this state. Return to live data to see the sample records."
          action={
            <Button variant="outline" size="sm" onClick={() => setFixtureState('default')}>
              Use live data
            </Button>
          }
        />
      </>
    )
  }

  if (fixtureState === 'error') {
    return (
      <>
        <PageHeader
          title="Species overview"
          description="Catalogue health, language coverage and the decisions waiting on a person."
        />
        <DataStateView
          state="error"
          title="Species overview is unavailable"
          description="No partial totals are shown. Other sections keep working."
          onRetry={() => setFixtureState('default')}
        />
      </>
    )
  }

  const sample = details.length
  const published = rows.filter((row) => row.publicationState === 'published').length
  const staleRows = rows.filter((row) => row.staleCount > 0)
  const staleTasks = tasks.filter((task) => task.state === 'stale')
  const rightsHolds = rows.filter((row) => row.hasRightsHold)
  const swahili = rows.filter((row) => row.languages.includes('sw'))
  const withdrawnSources = Object.values(overlay.withdrawnSources)
  const attention = [
    ...staleTasks.slice(0, 4).map((task) => ({
      id: `task-${task.id}`,
      title: `${task.speciesName} · ${task.languageText} ${task.type.replace('_', ' ')}`,
      detail: `${task.state === 'stale' ? 'Stale' : 'In review'} · ${task.reason} · ${task.age}`,
      owner: task.assignee ?? 'Unassigned',
      to: '/programme/species/translation' as const,
      search: { task: task.id },
      action: 'Open queue',
    })),
    ...withdrawnSources.map((entry) => {
      const source = sources.find((candidate) => candidate.id === entry.sourceId)
      return {
        id: `source-${entry.sourceId}`,
        title: `Rights withdrawal · ${source?.publisher ?? entry.sourceId}`,
        detail: `${entry.affectedSpecies.length} species unpublished · replacement ${
          entry.replacementId ? 'recorded' : 'needed'
        } · ${entry.reason}`,
        owner: entry.actor,
        to: '/programme/species/sources' as const,
        search: { source: entry.sourceId },
        action: 'Open sources',
      }
    }),
    ...rights
      .filter((record) => overlay.withdrawnRights[record.id])
      .map((record) => ({
        id: `rights-${record.id}`,
        title: `Rights record withdrawn · ${record.attribution}`,
        detail: `${overlay.withdrawnRights[record.id]?.affectedSpecies.length ?? 0} dependent species`,
        owner: overlay.withdrawnRights[record.id]?.actor ?? 'Rights reviewer',
        to: '/programme/species/sources' as const,
        search: { source: 'none' },
        action: 'Open rights',
      })),
  ].slice(0, 6)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Species overview"
        description="Catalogue health, language coverage and the decisions waiting on a person. Every number below is derived from the loaded records."
        badge={
          <span className="text-xs text-muted-foreground">
            Sample of {sample} species · production catalogue is paginated
          </span>
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/programme/species/catalogue">All species</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Published"
          value={published}
          foot={`${rows.length} loaded in this sample`}
        />
        <Kpi
          label="Stale content"
          value={staleRows.length}
          foot={
            staleRows.length > 0
              ? 'Base revision changed after translation'
              : 'No variant trails its base revision'
          }
          alert={staleRows.length > 0}
        />
        <Kpi
          label="Rights holds"
          value={rightsHolds.length}
          foot={rightsHolds.length > 0 ? 'Dependent species unpublished' : 'Every fact block has an active source'}
          alert={rightsHolds.length > 0}
        />
        <Kpi
          label="Kiswahili coverage"
          value={`${rows.length ? Math.round((swahili.length / rows.length) * 100) : 0}%`}
          foot={`${swahili.length} of ${rows.length} species carry a Kiswahili name`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <SectionCard
          title="Needs attention"
          description="Derived from review items, base revisions and rights records."
          actions={<span className="text-[11px] text-muted-foreground">{attention.length} open</span>}
        >
          {attention.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing is waiting. The next base edit will surface its dependent translations here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attention.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <WarningCircle className="mt-0.5 size-4 shrink-0 text-[var(--amber-deep)]" weight="duotone" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.owner}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={item.to} search={item.search}>
                        {item.action}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Coverage by language"
            description="Names / prose / audio across the loaded sample."
          >
            {coverage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No language coverage records loaded.</p>
            ) : (
              <div className="space-y-3">
                {coverage.map((entry) => (
                  <div key={entry.language}>
                    <CoverageBar value={entry.names} total={entry.total} label={entry.label} />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Names {entry.names}/{entry.total} · prose {entry.prose}/{entry.total} · audio{' '}
                      {entry.audio}/{entry.total}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recently updated" description="Newest first, from the audit stream.">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {audit.slice(0, 4).map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <p className="font-semibold text-foreground">{entry.action}</p>
                    <p className="text-muted-foreground">
                      {entry.summary} · {entry.actor} · {formatDate(entry.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Species needing a decision" description="Stale, held or never-translated records only.">
        {rows.filter((row) => row.staleCount > 0 || row.hasRightsHold || row.publicationState === 'draft').length === 0 ? (
          <p className="text-sm text-muted-foreground">Every loaded species is published and clear.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows
              .filter((row) => row.staleCount > 0 || row.hasRightsHold || row.publicationState === 'draft')
              .map((row) => (
                <li
                  key={row.slug}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{row.nameEn}</p>
                    <p className="truncate text-[11px] italic text-muted-foreground">{row.scientificName}</p>
                  </div>
                  <StatusPill status={row.publicationState} />
                  {row.staleCount > 0 ? <StatusPill status="stale" /> : null}
                  {row.hasRightsHold ? <StatusPill status="withdrawn" /> : null}
                  <Link
                    to="/programme/species/$speciesId"
                    params={{ speciesId: row.slug }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>{languageLabel('sw')} coverage counts a recorded language, not a reviewed prose variant.</span>
        <Link to="/programme/species/audit" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          Open the audit log <ArrowRight className="size-3" weight="bold" />
        </Link>
      </div>
    </div>
  )
}
