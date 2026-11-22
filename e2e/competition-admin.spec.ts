import { expect, test, type Page } from '@playwright/test'

/**
 * Competition admin end-to-end coverage.
 *
 * Requires a running admin app (`PLAYWRIGHT_BASE_URL`, default
 * http://localhost:3000) pointed at an API with:
 *   - the competition admin surface deployed;
 *   - a seeded administrator account (default grace@example.com / password);
 *   - at least one published repository entry to attach as a competition entry.
 *
 * The spec creates a disposable edition with a timestamped slug and removes it
 * again at the end. It does not write to an existing edition.
 */
test.describe.configure({ timeout: 240_000 })

const adminEmail = process.env.COMPETITION_ADMIN_EMAIL ?? 'grace@example.com'
const officerEmail = process.env.COMPETITION_OFFICER_EMAIL ?? 'officer@example.com'

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#login-email')
  await page.waitForTimeout(1000)
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill('password')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  await page.waitForTimeout(1000)
}

async function openCompetition(page: Page) {
  await page.goto('/competition', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Competition', exact: true })).toBeVisible({
    timeout: 20_000,
  })
}

test.describe('competition admin', () => {
  test('creates an edition, assigns a judge, scores, freezes, and publishes an award', async ({
    page,
  }) => {
    const stamp = Date.now().toString(36)
    const slug = `e2e-award-${stamp}`
    const editionName = `E2E Award Edition ${stamp}`
    const judgeName = `E2E Judge ${stamp}`

    await login(page, adminEmail)
    await openCompetition(page)

    await test.step('create edition', async () => {
      await page.getByRole('button', { name: 'New edition' }).click()
      const panel = page.getByRole('dialog')
      await expect(panel.getByRole('heading', { name: 'Create a competition edition' })).toBeVisible()
      await panel.getByLabel('Name', { exact: true }).fill(editionName)
      await panel.getByLabel('Slug', { exact: true }).fill(slug)
      await panel.getByLabel('Rules version').fill('1.0-e2e')
      await panel.getByRole('button', { name: 'Create edition' }).click()
      await expect(page.getByText('Edition created')).toBeVisible({ timeout: 20_000 })
      await expect(panel.getByRole('heading', { name: editionName })).toBeVisible()
    })

    await test.step('add a category', async () => {
      const panel = page.getByRole('dialog')
      await panel.getByLabel('New category label').fill('Photography')
      await panel.getByLabel('New category key').fill(`photography-${stamp}`)
      await panel.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(page.getByText('Category added')).toBeVisible({ timeout: 20_000 })
      await expect(panel.getByRole('cell', { name: 'Photography' })).toBeVisible()
      await panel.getByRole('button', { name: 'Close panel' }).click()
    })

    await test.step('invite and assign a judge', async () => {
      await page.getByRole('button', { name: 'Judges', exact: true }).click()
      await page.getByRole('button', { name: 'Invite judge' }).click()
      let panel = page.getByRole('dialog')
      await panel.getByLabel('Display name').fill(judgeName)
      await panel.getByLabel('Email').fill(`e2e-judge-${stamp}@example.com`)
      await panel.getByRole('button', { name: 'Send invitation' }).click()
      await expect(page.getByText('Judge invited')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(judgeName)).toBeVisible()

      await page.getByRole('button', { name: 'Assign to category' }).click()
      panel = page.getByRole('dialog')
      await panel.getByLabel('Judge').selectOption({ label: judgeName })
      await panel.getByLabel('Category').selectOption({ label: 'Photography' })
      await panel.getByRole('button', { name: 'Assign judge' }).click()
      await expect(page.getByText('Judge assigned to category')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(`${judgeName}`).first()).toBeVisible()
    })

    await test.step('attach a repository entry', async () => {
      await page.getByRole('button', { name: 'Entries', exact: true }).click()
      await page.getByRole('button', { name: 'Attach entry' }).click()
      const panel = page.getByRole('dialog')
      const repositorySelect = panel.getByLabel('Repository entry')
      await page.waitForTimeout(1500)
      const options = await repositorySelect.locator('option').count()
      test.skip(
        options <= 1,
        'No published repository entries are available to attach. Seed the repository first.',
      )
      await repositorySelect.selectOption({ index: 1 })
      await panel.getByLabel('Category').selectOption({ label: 'Photography' })
      await panel.getByRole('button', { name: 'Attach entry' }).click()
      await expect(page.getByText('Entry attached')).toBeVisible({ timeout: 20_000 })
    })

    await test.step('score the entry blind', async () => {
      await page.getByRole('button', { name: 'Scoring', exact: true }).click()
      await expect(
        page.getByLabel('Scoring judge').locator('option', { hasText: judgeName }),
      ).toHaveCount(1, { timeout: 20_000 })
      await page.getByLabel('Scoring judge').selectOption({ label: judgeName })
      await page.getByRole('button', { name: 'Score', exact: true }).first().click()
      const panel = page.getByRole('dialog')
      await expect(panel.getByText('Blind score')).toBeVisible()
      await panel.getByLabel('Relevance to the theme (25%)').fill('8')
      await panel.getByLabel('Craft (30%)').fill('7')
      await panel.getByLabel('Originality (25%)').fill('9')
      await panel.getByLabel('Impact and story (20%)').fill('6')
      await panel.getByLabel('Judge note').fill('Specific and honest. E2E verification score.')
      await panel.getByRole('button', { name: 'Save score' }).click()
      await expect(page.getByText('Score saved')).toBeVisible({ timeout: 20_000 })
    })

    await test.step('freeze the board and preview results', async () => {
      await page.getByRole('button', { name: 'Results', exact: true }).click()
      await expect(page.getByText('Awards published')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('button', { name: 'Publish award' }).first()).toBeVisible({
        timeout: 20_000,
      })
      await page.getByRole('button', { name: 'Freeze board' }).click()
      const confirm = page.getByRole('dialog')
      await confirm.getByRole('button', { name: 'Freeze board' }).click()
      await expect(page.getByText('Board frozen')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Final snapshot is written')).toBeVisible({ timeout: 20_000 })
    })

    await test.step('publish a category award', async () => {
      await page.getByRole('button', { name: 'Publish award' }).first().click()
      const panel = page.getByRole('dialog')
      await expect(panel.getByRole('heading', { name: 'Record and publish an award' })).toBeVisible()
      await panel.getByLabel('Citation').fill('A precise, locally grounded story. E2E citation.')
      await panel.getByRole('button', { name: 'Publish award' }).click()
      await expect(page.getByText('Award recorded and published')).toBeVisible({ timeout: 20_000 })
      await page.getByRole('button', { name: 'Awards', exact: true }).click()
      await expect(page.getByText('Published').first()).toBeVisible({ timeout: 20_000 })
    })

    await test.step('clean up the disposable edition', async () => {
      await page.getByRole('button', { name: 'Editions', exact: true }).click()
      const row = page.getByRole('row').filter({ hasText: slug })
      await row.getByRole('button', { name: 'Edit', exact: true }).click()
      const panel = page.getByRole('dialog')
      await panel.getByRole('button', { name: 'Delete edition' }).click()
      const confirm = page.getByRole('dialog').filter({ hasText: 'Delete this edition?' })
      await confirm.getByRole('button', { name: 'Delete edition' }).click()
      await page.waitForTimeout(1000)
    })
  })

  test('county officers get the read-only competition surface', async ({ page }) => {
    await login(page, officerEmail)
    await openCompetition(page)
    await expect(page.getByText('Read only')).toBeVisible({ timeout: 20_000 })
    for (const tab of [
      'Editions',
      'Entries',
      'Judges',
      'Scoring',
      'Votes',
      'Results',
      'Awards',
      'Consultation',
    ]) {
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible()
    }
  })
})
