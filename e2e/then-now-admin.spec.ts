import { test, expect, type Page } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

async function loginAs(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#login-email')
  await page.waitForTimeout(1200)

  const emailInput = page.locator('#login-email')
  await emailInput.click()
  await emailInput.pressSequentially(email, { delay: 10 })
  const passwordInput = page.locator('#login-password')
  await passwordInput.click()
  await passwordInput.pressSequentially('password', { delay: 10 })
  await expect(emailInput).toHaveValue(email)

  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  await page.waitForTimeout(1200)
}

async function openThenNow(page: Page, path = '/then-now') {
  await page.goto(path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await expect(page.getByRole('heading', { name: 'Heritage sites' })).toBeVisible({ timeout: 20_000 })
}

test.describe('Then & Now admin', () => {
  test('sites list, filters, and site editor', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.goto('/then-now', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Heritage sites' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Nairobi Railway Museum/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Nairobi War Cemetery/ }).first()).toBeVisible()

    await page.getByLabel('Search sites').fill('cemetery')
    await expect(page.getByLabel('Search sites')).toHaveValue('cemetery')
    await expect(page.getByRole('link', { name: /Nairobi War Cemetery/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Nairobi Railway Museum/ }).first()).not.toBeVisible()
    await page.getByLabel('Search sites').fill('')
    await page.waitForTimeout(300)

    await page.getByRole('link', { name: /Nairobi Railway Museum/ }).first().click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Nairobi Railway Museum' })).toBeVisible()
    await page.getByRole('tab', { name: 'Policy' }).click()
    await expect(page.getByText('Access mode').first()).toBeVisible()
    await expect(page.getByText('Camera + video').first()).toBeVisible()
    await expect(page.getByRole('tab', { name: /Experiences/ })).toBeVisible()
  })

  test('submit, review, approve, and publish the railway revision', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.goto('/then-now/experiences/railway-exp', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'The railway that built Nairobi' })).toBeVisible()

    const title = page.getByLabel('Title')
    await title.fill('The railway that built Nairobi — revised')
    await expect(title).toHaveValue('The railway that built Nairobi — revised')
    await expect(page.getByText('Unsaved changes')).toBeVisible()
    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Submit for review' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Submit for review' }).click()
    await expect(page.getByText('Frozen for review.').first()).toBeVisible({ timeout: 10_000 })

    await page.goto('/then-now/review', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible()
    await page.getByRole('link', { name: /The railway that built Nairobi/ }).first().click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: /The railway that built Nairobi/ })).toBeVisible()

    await page.getByRole('button', { name: 'Assign to me' }).click()
    await expect(page.getByText('Assigned to you.')).toBeVisible()
    await page.getByRole('button', { name: 'Approve revision' }).click()
    await expect(page.getByRole('button', { name: 'Publish now' })).toBeVisible()

    await page.getByRole('button', { name: 'Publish now' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Publish now' }).click()
    await expect(page.getByText('Live v4').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Edit new revision' })).toBeVisible()
  })

  test('sensitive review blocks approval until a second reviewer is recorded', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.goto('/then-now/review/cemetery-exp', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'A place of remembrance' })).toBeVisible()
    await expect(page.getByText('Sensitive site.').first()).toBeVisible()

    await page.getByRole('button', { name: 'Assign to me' }).click()
    await expect(page.getByText('Assigned to you.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve revision' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Request changes' })).toBeEnabled()

    await page.getByRole('button', { name: 'Record second reviewer' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('e.g. Wanjiku M.').fill('Wanjiku M.')
    await dialog.getByPlaceholder('Community / cultural reviewer').fill('Community reviewer')
    await dialog.getByRole('button', { name: 'Record reviewer' }).click()
    await expect(page.getByText('Wanjiku M.').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve revision' })).toBeEnabled()
  })

  test('content editors can draft and submit but cannot review or publish', async ({ page }) => {
    await loginAs(page, 'editor@example.com')
    await page.goto('/then-now', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Heritage sites' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: /^Review/ })).toHaveCount(0)

    await page.goto('/then-now/experiences/railway-exp', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'The railway that built Nairobi' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit for review' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publish now' })).toHaveCount(0)

    await page.goto('/then-now/review', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByText('Admins review revisions')).toBeVisible()
  })

  test('moderators see Then & Now as read-only', async ({ page }) => {
    await loginAs(page, 'moderator@example.com')
    await page.goto('/then-now', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Heritage sites' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New site' })).toHaveCount(0)

    await page.goto('/then-now/experiences/railway-exp', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByText(/Read-only\./).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Submit for review' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Publish now' })).toHaveCount(0)
  })

  test('fixture states expose empty, loading, error, offline, conflict, and read-only', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await openThenNow(page)

    const state = page.getByLabel('Fixture state')
    await state.selectOption('empty')
    await expect(state).toHaveValue('empty')
    await expect(page.getByText('No heritage sites yet')).toBeVisible()

    await state.selectOption('loading')
    await expect(page.getByRole('heading', { name: 'Loading…' })).toBeVisible()

    await state.selectOption('error')
    await expect(page.getByText(/couldn.t load the Then & Now records/)).toBeVisible()

    await state.selectOption('offline')
    await expect(page.getByText(/You.re offline/)).toBeVisible()

    await state.selectOption('conflict')
    await expect(page.getByRole('status').filter({ hasText: '409 conflict' })).toBeVisible()

    await state.selectOption('readonly')
    await expect(page.getByText(/Read-only fixture/)).toBeVisible()

    await state.selectOption('default')
    await expect(page.getByText('No heritage sites yet')).toHaveCount(0)
  })


  test('creates a heritage site draft through the wizard', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.goto('/then-now/sites/new', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.getByLabel('Site name').fill('Test Heritage Site')
    await expect(page.getByLabel('Site name')).toHaveValue('Test Heritage Site')
    await page.getByLabel('County').fill('Nairobi')
    await expect(page.getByLabel('County')).toHaveValue('Nairobi')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Access mode').first()).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Map picker.')).toBeVisible()
    await page.getByRole('button', { name: 'Create draft' }).click()
    await page.waitForURL(/\/then-now\/sites\/site-/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Test Heritage Site' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publish site' })).toBeDisabled()
    await expect(page.getByText('At least one published experience')).toBeVisible()
  })

  test('creates an experience draft through the wizard', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.goto('/then-now/experiences/new', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Experience title').fill('Test experience')
    await expect(page.getByLabel('Experience title')).toHaveValue('Test experience')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Choose the current-scene video master')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Two or three short cards')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('The wizard creates a draft.')).toBeVisible()
    await page.getByRole('button', { name: 'Create draft' }).click()
    await page.waitForURL(/\/then-now\/experiences\/exp-/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Test experience' })).toBeVisible()
    await expect(page.getByText('Review readiness')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit for review' })).toBeDisabled()
    await expect(page.getByText('Site video master')).toBeVisible()
  })

  test('dirty guard keeps the editor, and conflict reload recovers', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.goto('/then-now/experiences/railway-exp', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const title = page.getByLabel('Title')
    await title.fill('The railway that built Nairobi — edited')
    await expect(title).toHaveValue('The railway that built Nairobi — edited')
    await page.getByRole('button', { name: 'All experiences' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Unsaved changes')).toBeVisible()
    await page.getByRole('button', { name: 'Stay on this page' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/then-now\/experiences\/railway-exp/)

    await page.getByLabel('Fixture state').selectOption('conflict')
    await expect(page.getByRole('status').filter({ hasText: '409 conflict' })).toBeVisible()
    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/Version conflict/)).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Reload latest' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: '409 conflict' })).toHaveCount(0)
  })

  test('review detail and lists fit a 390 px screen', async ({ page }) => {
    await loginAs(page, 'grace@example.com')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/then-now', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Heritage sites' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

    await page.goto('/then-now/review/cemetery-exp', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'A place of remembrance' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  })
})
