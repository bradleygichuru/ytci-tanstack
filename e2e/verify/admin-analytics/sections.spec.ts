import { expect, test } from '@playwright/test'
import {
  bodyText,
  loginAnalytics,
  openAnalytics,
  VERIFY_ANALYTICS_USERS,
} from './support'

test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test.skip(
  process.env.VERIFY_MODE !== 'live',
  'Analytics sections need the live admin app and a disposable seed; the static fixture has no auth or rollup.',
)

test.beforeEach(async ({ page }) => {
  await loginAnalytics(page, VERIFY_ANALYTICS_USERS.admin)
})

test('journeys: nine definitions, one rollup source, filter scoped to this read', async ({ page }) => {
  await openAnalytics(page, 'journeys')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Journeys')
  const options = await page.getByLabel('Journey').locator('option').allTextContents()
  expect(options).toHaveLength(10) // All journeys + the nine definitions
  expect(options).toContain('Onboarding')
  expect(options).toContain('Recognition opt-in')

  const text = await bodyText(page)
  expect(text).toContain('Nine journeys, one source.')
  expect(text).toContain('Overview')
  expect(text).toContain('this same table')
  // The fixture rollup has one journey; completion is completed ÷ started.
  expect(text).toContain('Event registration → check-in')
  expect(text).toContain('75.0%')

  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/v1/admin/analytics/')) requests.push(request.url())
  })
  await page.getByLabel('Journey').selectOption('onboarding')
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  const journeyReads = requests.filter((url) => url.includes('/journeys'))
  expect(journeyReads.some((url) => url.includes('journey=onboarding'))).toBe(true)
  // Only the journeys read may receive the journey dimension.
  expect(requests.filter((url) => !url.includes('/journeys')).every((url) => !url.includes('journey='))).toBe(true)
  expect(await bodyText(page)).toMatch(/Last 30 days · Onboarding · applied to this screen/)
})

test('journey filter carried to overview is labelled not applied', async ({ page }) => {
  await openAnalytics(page, 'journeys')
  await page.getByLabel('Journey').selectOption('onboarding')
  await expect(page.getByText(/Onboarding · applied/)).toBeVisible()

  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  await expect(page.getByText(/NOT APPLIED HERE: ONBOARDING/i)).toBeVisible()
  // The journey control is not offered where it cannot be applied.
  await expect(page.getByLabel('Journey')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reset filters' })).toBeEnabled()
})

test('funnels: step bars and largest-drop caption render from the journey rollup', async ({ page }) => {
  await openAnalytics(page, 'funnels')

  const text = await bodyText(page)
  expect(text).toContain('Funnel conversion')
  expect(text).toContain('detail viewed')
  expect(text).toContain('registered')
  expect(text).toContain('The largest drop in Event registration → check-in is between detail viewed and registered (310 readers).')
  expect(text).toContain('1,240')
  expect(text).toContain('930')
  // A journey with no rolled-up steps is absent, never shown as a zero.
  expect(text).not.toMatch(/Course completion\s+0\b/)
})

test('funnels: summary and step bars reconcile to one population (#387)', async ({ page }) => {
  await openAnalytics(page, 'funnels')

  // The table row is the journey rollup: entered = first step, completed =
  // last step. It must match the bars, not the separate funnels aggregation.
  const text = await bodyText(page)
  expect(text).toMatch(/Event registration → check-in\t1,240\t930\t75\.0%/)
  expect(text).not.toMatch(/Event registration → check-in\t1,240\t810\t65\.0%/)

  const bars = page.getByRole('progressbar')
  await expect(bars).toHaveCount(2)
  const barLabels = await bars.evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: node.getAttribute('aria-label'),
      now: node.getAttribute('aria-valuenow'),
      text: node.getAttribute('aria-valuetext'),
    })),
  )
  expect(barLabels).toEqual([
    { label: 'Detail viewed reached', now: '100', text: '100% of entrants' },
    { label: 'Registered reached', now: '75', text: '75% of entrants' },
  ])

  // The largest-drop caption reads the same series (1240 - 930 = 310).
  await expect(
    page.getByText(/The largest drop in Event registration → check-in is between detail viewed and registered/),
  ).toContainText('310 readers')
})

test('retention: elapsed cohorts only and an accessible description without future weeks', async ({ page }) => {
  await openAnalytics(page, 'retention')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Retention')
  const headers = await page.getByRole('table').first().getByRole('columnheader').allTextContents()
  expect(headers).toContain('W0')
  expect(headers).toContain('W7')
  expect(headers).not.toContain('W8')

  const caption = await page.locator('table caption').first().textContent()
  const text = await bodyText(page)
  expect(caption).toContain('Weekly retention cohorts, elapsed weeks only')
  expect(text).toContain('44%')
  // Future or suppressed weeks are dots, never announced as 0%.
  expect(caption).not.toContain('0%')
  expect(text).toContain('· not yet available or suppressed')
})

test('adoption: reach, depth and repeat keep their denominators visible', async ({ page }) => {
  await openAnalytics(page, 'adoption')

  const text = await bodyText(page)
  expect(text).toContain('Reach = distinct analytics IDs')
  expect(text).toContain('depth = median actions per adopter')
  expect(text).toContain('repeat = 3+ sessions in 28 days')
  expect(text).toContain('Events')
  expect(text).toContain('Species')
  expect(text).toContain('5,210')
  expect(text).toContain('1,890')
  expect(text).toContain('2.8 actions')
  expect(text).toContain('39.0%')

  const bars = page.getByRole('progressbar')
  expect(await bars.count()).toBe(2)
  await expect(bars.first()).toHaveAttribute('aria-valuemax', '100')
  await expect(bars.first()).toHaveAttribute('aria-valuetext', /% of the largest reach/)
})

test('search gaps: contract gap is explicit, never a fabricated zero', async ({ page }) => {
  await openAnalytics(page, 'search')

  const text = await bodyText(page)
  expect(text).toContain('CONTRACT GAP')
  expect(text).toContain('Search insight is a contract gap, not an empty result')
  expect(text.match(/Not in contract 1\.0\.0/g)).toHaveLength(4)
  expect(text).toContain('NO RAW TEXT')
  expect(text).toContain('HASHES + BUCKETS ONLY')
  // Ingestion counters are real and distinct from search outcomes.
  expect(text).toContain('87')
  expect(text).toContain('412')
  expect(text).toContain('6')
  expect(text).toContain('85.7%')
  expect(text).toContain('These are ingestion counters, not search outcomes')
})

test('content: live rows when present, otherwise a labelled sample overlay', async ({ page }) => {
  await openAnalytics(page, 'content')

  const text = await bodyText(page)
  expect(text).toContain('SAMPLE OVERLAY')
  expect(text).toContain('Maasai Mara · view → save → plan')
  expect(text).toContain('Wildlife Conservation in Kenya · start → complete')
  expect(text).toContain('not affected by the date range')
  expect(text).toContain('never used to fill a contract KPI')
  expect(text).toContain('No content journeys in this rollup')
})

test('programme: domain-table impact is never proxied from telemetry', async ({ page }) => {
  await openAnalytics(page, 'programme')

  const text = await bodyText(page)
  expect(text).toContain('Telemetry is not an impact proxy')
  expect(text).toContain('Domain-table view · analytics filters do not apply')
  expect(text).toContain('deliberately shows no numbers rather than a telemetry proxy')
  for (const surface of ['Conservation', 'Events', 'LMS', 'Recognition']) {
    await expect(page.getByRole('link', { name: new RegExp(surface) }).first()).toBeVisible()
  }
})

test('quality: pipeline checks, rollup health, definitions and erasure entry', async ({ page }) => {
  await openAnalytics(page, 'quality')

  const text = await bodyText(page)
  expect(text).toContain('84,210 events · 3,120 batches')
  expect(text).toContain('85.7%')
  expect(text).toContain('Unknown property')
  expect(text).toContain('Under-18 identified analytics')
  expect(text).toContain('14 months raw · 24 months agg')
  expect(text).toContain('analytics_daily')
  expect(text).toContain('Last successful rollup: 18 Nov 2026')
  expect(text).toContain('Activation')
  expect(text).toContain('No per-user timelines')
  await expect(page.getByRole('button', { name: /Request erasure/ })).toBeEnabled()
})

test('suppressed: real withheld cells, em dashes and no revealing total', async ({ page }) => {
  await openAnalytics(page, 'suppressed')

  const text = await bodyText(page)
  expect(text).toContain('Cells under 10 readers are hidden')
  expect(text).toContain('Contract cells withheld')
  expect(text).toContain('No total that reveals a hidden cell')
  expect(text).toContain('FUNNELS')
  expect(text).toContain('Course completion')
  expect((text.match(/Suppressed cell: fewer readers than the suppression threshold/g) ?? []).length).toBeGreaterThanOrEqual(3)
  expect(text).toContain('There is deliberately no total row')
  // No visible row named Total.
  await expect(page.getByRole('row', { name: /^Total/ })).toHaveCount(0)
})

test(
  'suppressed: retention cell names a week the retention table renders',
  {
    annotation: {
      type: 'known-defect',
      description:
        'P2 #375: the suppressed list reports "24 Aug · W8" while the retention table stops at W7.',
    },
  },
  async ({ page }) => {
    test.fail()
    await openAnalytics(page, 'suppressed')
    const text = await bodyText(page)
    expect(text).not.toContain('W8')
  },
)
