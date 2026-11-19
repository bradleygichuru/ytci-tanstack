/**
 * Every species editor field must have an accessible name.
 *
 * The editor used `FormField` without an id, so the visible label had no
 * `htmlFor` target and voice/screen-reader users could not address a field by
 * name (ticket #394). These tests render the shared field component and the
 * real type-specific task editor, then assert every control resolves a label.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormField } from '#/components/shared/FormField'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { TaskEditor } from '#/components/species/task-editor'
import type { SpeciesDetail, SpeciesTask } from '#/lib/species/model'

vi.mock('#/components/shell/Gates', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('#/lib/species/store', () => ({
  useSpecies: () => ({
    fixtureState: 'default',
    overlay: {
      baseDrafts: {},
      variantDrafts: {},
      nameDrafts: {},
      audioDrafts: {},
      assignments: {},
      secondReviews: {},
      withdrawnSources: {},
      withdrawnRights: {},
      audit: [],
      publicationRequests: {},
      published: {},
      reviewDecisions: {},
      submittedTasks: {},
    },
    can: () => true,
    saveVariant: vi.fn(),
    saveName: vi.fn(),
    saveAudio: vi.fn(),
    reviewVariant: vi.fn(),
    reviewName: vi.fn(),
    reviewAudio: vi.fn(),
    decideReview: vi.fn(),
    submitTask: vi.fn(),
  }),
}))

afterEach(cleanup)

/** A control is named when a label element, aria-label or aria-labelledby names it. */
function expectEveryControlNamed(container: HTMLElement) {
  const controls = [
    ...container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    ),
  ]
  expect(controls.length).toBeGreaterThan(0)
  for (const control of controls) {
    const label =
      control.labels?.[0]?.textContent?.trim() ||
      control.getAttribute('aria-label') ||
      control.getAttribute('aria-labelledby')
    expect(label, `${control.outerHTML} has no accessible name`).toBeTruthy()
  }
}

const detail = (overrides: Partial<SpeciesDetail> = {}): SpeciesDetail =>
  ({
    slug: 'panthera-leo',
    scientificName: 'Panthera leo',
    nameEn: 'Lion',
    nameSw: 'Simba',
    languages: ['en', 'sw'],
    content: {
      language: 'en',
      coverageTier: 'full',
      summary: '',
      reviewStatus: 'reviewed',
      sourceVersion: 1,
    },
    names: [],
    audio: [],
    coverage: [],
    sources: [],
    whereToSee: [],
    ...overrides,
  }) as SpeciesDetail

const task = (overrides: Partial<SpeciesTask> = {}): SpeciesTask => ({
  id: 'task-1',
  speciesSlug: 'panthera-leo',
  speciesName: 'Lion',
  language: 'sw',
  languageText: 'Swahili',
  type: 'prose',
  state: 'in_review',
  stage: 'translation',
  assignee: null,
  contributor: null,
  reviewer: null,
  submittedAt: null,
  age: '—',
  reason: '',
  staleReason: null,
  entityId: 'entity-1',
  reviewItemId: null,
  ...overrides,
})

describe('FormField association', () => {
  it('names a control even when the caller passes no id', () => {
    const { container } = render(
      <FormField label="Scientific name" description="Edits need a source before publish.">
        <Input defaultValue="Panthera leo" />
      </FormField>,
    )
    const input = screen.getByLabelText('Scientific name')
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toContain(
      'Edits need a source',
    )
    expectEveryControlNamed(container)
  })

  it('keeps an explicit id and associates a textarea and select', () => {
    const { container } = render(
      <div>
        <FormField label="Habitat" id="habitat">
          <Textarea id="habitat" defaultValue="Savannah" />
        </FormField>
        <FormField label="Reason" id="reason">
          <select id="reason" defaultValue="Licence changed">
            <option value="Licence changed">Licence changed</option>
          </select>
        </FormField>
      </div>,
    )
    expect(screen.getByLabelText('Habitat').tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText('Reason').tagName).toBe('SELECT')
    expectEveryControlNamed(container)
  })

  it('names the species base editor fields', () => {
    const { container } = render(
      <div>
        {[
          'Scientific name',
          'Slug',
          'Authorship',
          'Taxonomic rank',
          'Taxonomic status',
          'GBIF key',
          'IUCN category',
          'Assessment id',
          'Red List version',
        ].map((label) => (
          <FormField key={label} label={label}>
            <Input />
          </FormField>
        ))}
      </div>,
    )
    expectEveryControlNamed(container)
    expect(screen.getByLabelText('Scientific name')).toBeTruthy()
    expect(screen.getByLabelText('IUCN category')).toBeTruthy()
  })

  it('names the rights withdrawal fields', () => {
    const { container } = render(
      <div>
        <FormField label="Replacement source">
          <select defaultValue="">
            <option value="">Choose a replacement…</option>
          </select>
        </FormField>
        <FormField label="Reason">
          <select defaultValue="Choose a reason">
            <option value="Choose a reason">Choose a reason</option>
          </select>
        </FormField>
        <FormField label="Note for the audit log">
          <Textarea />
        </FormField>
      </div>,
    )
    expect(screen.getByLabelText('Replacement source').tagName).toBe('SELECT')
    expect(screen.getByLabelText('Reason').tagName).toBe('SELECT')
    expect(screen.getByLabelText('Note for the audit log').tagName).toBe('TEXTAREA')
    expectEveryControlNamed(container)
  })
})

describe('task editor fields', () => {
  it('names every prose field', () => {
    const { container } = render(<TaskEditor task={task({ type: 'prose' })} detail={detail()} />)
    for (const label of [
      'Summary',
      'Habitat',
      'Range',
      'Where to see',
      'Conservation',
      'Full description',
      'Review note',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expectEveryControlNamed(container)
  })

  it('names every name field', () => {
    const { container } = render(<TaskEditor task={task({ type: 'name' })} detail={detail()} />)
    for (const label of ['Local name', 'Region / community', 'Source', 'Review note']) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expectEveryControlNamed(container)
  })

  it('names every audio field', () => {
    const { container } = render(<TaskEditor task={task({ type: 'audio' })} detail={detail()} />)
    for (const label of [
      'Speaker / narrator',
      'Consent reference',
      'Duration (seconds)',
      'Rights holder',
      'Licence',
      'Storage key',
      'Audio URL / playback',
      'Transcript',
      'Review note',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expectEveryControlNamed(container)
  })
})
