import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Can } from '#/components/shell/Gates'
import { useRecognition } from '#/lib/recognition/store'
import { relativeAge } from '#/lib/recognition/format'
import { AdminPage, DataState, Notice, ScopeNote, StatusPill } from '#/components/recognition/shared'
import { ActionDialog } from '#/components/recognition/dialogs'
import type { Badge } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/badges')({
  component: BadgesPage,
})

interface BadgeForm {
  badgeKey: string
  nameEn: string
  nameSw: string
  family: string
  criteria: string
  privacyClass: Badge['privacyClass']
  hidden: boolean
  publicEligible: boolean
}

const EMPTY_FORM: BadgeForm = {
  badgeKey: '',
  nameEn: '',
  nameSw: '',
  family: 'Explorer',
  criteria: '',
  privacyClass: 'public',
  hidden: false,
  publicEligible: true,
}

function BadgesPage() {
  const { state, loads, actions, can } = useRecognition()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Badge | null>(null)
  const [form, setForm] = useState<BadgeForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () =>
      state.badges.filter(
        (badge) =>
          !query ||
          `${badge.nameEn} ${badge.nameSw ?? ''} ${badge.family} ${badge.badgeKey}`
            .toLowerCase()
            .includes(query)
      ),
    [state.badges, query]
  )

  if (loads.badges === 'loading' && state.badges.length === 0) {
    return (
      <AdminPage kicker="Recognition · Badges" title="Badge catalogue">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }
  if (state.badges.length === 0 && loads.badges !== 'loading') {
    return (
      <AdminPage kicker="Recognition · Badges" title="Badge catalogue">
        <DataState
          state="empty"
          emptyTitle="No badges in this view"
          emptyDescription="Every badge needs an English and a Kiswahili name before it can be published."
          emptyAction={<Button onClick={() => openCreate()}>Create a badge</Button>}
        >
          {null}
        </DataState>
      </AdminPage>
    )
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(badge: Badge) {
    setEditing(badge)
    setForm({
      badgeKey: badge.badgeKey,
      nameEn: badge.pendingChanges?.nameEn ?? badge.nameEn,
      nameSw: badge.pendingChanges?.nameSw ?? badge.nameSw ?? '',
      family: badge.pendingChanges?.family ?? badge.family,
      criteria: badge.pendingChanges?.criteria ?? badge.criteria,
      privacyClass: badge.pendingChanges?.privacyClass ?? badge.privacyClass,
      hidden: badge.pendingChanges?.hidden ?? badge.hidden,
      publicEligible: badge.pendingChanges?.publicEligible ?? badge.publicEligible,
    })
    setError(null)
    setDialogOpen(true)
  }

  function save() {
    if (!form.badgeKey.trim() || !/^[a-z][a-z0-9_]*$/.test(form.badgeKey.trim())) {
      setError('Use a lowercase key with underscores, e.g. heritage_keeper.')
      return
    }
    if (!form.nameEn.trim()) {
      setError('The English name is required.')
      return
    }
    const payload = {
      badgeKey: form.badgeKey.trim(),
      nameEn: form.nameEn.trim(),
      nameSw: form.nameSw.trim() || null,
      family: form.family.trim() || 'Explorer',
      criteria: form.criteria.trim() || 'Criteria not set',
      privacyClass: form.privacyClass,
      hidden: form.hidden,
      publicEligible: form.publicEligible,
    }
    if (editing) actions.updateBadge(editing.badgeKey, payload)
    else actions.createBadge(payload)
    setDialogOpen(false)
    setEditing(null)
  }

  return (
    <AdminPage
      kicker="Recognition · Badges"
      title="Badge catalogue"
      sub="Every badge needs an EN and SW name before publish. A badge used by an active rule or mission must itself be published."
      actions={
        <Can permission="recognition.author_badge">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" weight="bold" /> New badge
          </Button>
        </Can>
      }
    >
      <ScopeNote>
        Showing {visible.length} of {state.badges.length} badges · used-by counts include active rules and
        missions
      </ScopeNote>

      {publishError ? (
        <Notice tone="red" title="Badge not published">
          {publishError}
        </Notice>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, family or key"
          aria-label="Search badges"
          className="h-9 w-full sm:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <caption className="sr-only">Badge catalogue with bilingual names, criteria and privacy</caption>
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-4 py-3">
                  Badge
                </th>
                <th scope="col" className="px-4 py-3">
                  Family
                </th>
                <th scope="col" className="px-4 py-3">
                  Criteria
                </th>
                <th scope="col" className="px-4 py-3">
                  Names
                </th>
                <th scope="col" className="px-4 py-3">
                  Privacy
                </th>
                <th scope="col" className="px-4 py-3">
                  Used by
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((badge) => {
                const staged = badge.pendingChanges
                const en = staged?.nameEn ?? badge.nameEn
                const sw = staged?.nameSw ?? badge.nameSw
                return (
                  <tr key={badge.badgeKey} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{en}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {badge.badgeKey}
                      </span>
                      {staged ? (
                        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--amber-deep)]">
                          staged changes
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{staged?.family ?? badge.family}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {staged?.criteria ?? badge.criteria}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-sm">
                        {sw || <span className="text-destructive">Kiswahili name missing</span>}
                      </span>
                      <StatusPill status={sw ? 'published' : 'failed'} label={sw ? 'EN + SW' : 'EN only'} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {staged?.privacyClass ?? badge.privacyClass}
                      {badge.hidden || staged?.hidden ? (
                        <span className="ml-1 font-semibold">· hidden</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {badge.usedBy} reference{badge.usedBy === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={badge.status} />
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        v{badge.version} · {relativeAge(badge.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Can permission="recognition.author_badge">
                          <Button variant="outline" size="sm" onClick={() => openEdit(badge)}>
                            Edit
                          </Button>
                        </Can>
                        <Can permission="recognition.publish_badge">
                          {badge.status !== 'published' || badge.pendingChanges ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setPublishError(null)
                                try {
                                  await actions.publishBadge(badge.badgeKey)
                                } catch (cause) {
                                  setPublishError(
                                    cause instanceof Error ? cause.message : 'Could not publish the badge.'
                                  )
                                }
                              }}
                            >
                              Publish
                            </Button>
                          ) : null}
                        </Can>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No badges match. Clear the search to see the catalogue.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Notice tone="gold" title="Badge integrity">
        Hidden badges are deterministic, never random. Editing a published badge stages a new version; the
        public badge keeps its live names until a second administrator publishes.
      </Notice>

      <ActionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        title={editing ? `Edit ${editing.nameEn}` : 'New badge'}
        description={
          editing?.status === 'published'
            ? 'Changes to a published badge are staged as a new version.'
            : 'Drafts can be incomplete, but publish needs both names.'
        }
        confirmLabel={editing ? 'Save changes' : 'Create draft'}
        onConfirm={save}
        error={error}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Badge key
            </span>
            <Input
              value={form.badgeKey}
              onChange={(event) => setForm((prev) => ({ ...prev, badgeKey: event.target.value }))}
              disabled={Boolean(editing)}
              aria-label="Badge key"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Family
            </span>
            <select
              value={form.family}
              onChange={(event) => setForm((prev) => ({ ...prev, family: event.target.value }))}
              aria-label="Badge family"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              {[
                'Explorer',
                'Events',
                'Heritage',
                'Discovery',
                'Conservation',
                'Learning',
                'Listening',
                'Trails',
                'Community',
                'Hidden',
              ].map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              English name
            </span>
            <Input
              value={form.nameEn}
              onChange={(event) => setForm((prev) => ({ ...prev, nameEn: event.target.value }))}
              aria-label="English name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kiswahili name
            </span>
            <Input
              value={form.nameSw}
              onChange={(event) => setForm((prev) => ({ ...prev, nameSw: event.target.value }))}
              aria-label="Kiswahili name"
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Criteria
            </span>
            <Textarea
              value={form.criteria}
              onChange={(event) => setForm((prev) => ({ ...prev, criteria: event.target.value }))}
              rows={2}
              aria-label="Criteria"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Privacy class
            </span>
            <select
              value={form.privacyClass}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  privacyClass: event.target.value as Badge['privacyClass'],
                }))
              }
              aria-label="Privacy class"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="sensitive">Sensitive</option>
            </select>
          </label>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(event) => setForm((prev) => ({ ...prev, hidden: event.target.checked }))}
              />
              Hidden until earned
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.publicEligible}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    publicEligible: event.target.checked,
                  }))
                }
              />
              Eligible for the public badge count
            </label>
          </div>
        </div>
        {!can('recognition.publish_badge') ? (
          <p className="text-xs text-muted-foreground">Your role can draft badges but not publish them.</p>
        ) : null}
      </ActionDialog>
    </AdminPage>
  )
}
