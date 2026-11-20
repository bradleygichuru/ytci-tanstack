import { expect, test, type Page } from '@playwright/test'

const email = process.env.REPOSITORY_ADMIN_EMAIL ?? 'admin@example.com'
const password = process.env.REPOSITORY_ADMIN_PASSWORD ?? 'password'

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 })
  await page.waitForTimeout(1500)
}

test.describe('repository admin', () => {
  test('lists live entries and opens the editor', async ({ page }) => {
    await login(page)
    await page.goto('/repository')

    await expect(page.getByRole('heading', { name: 'Repository', exact: true })).toBeVisible()
    await expect(page.getByText('Maasai Mara National Reserve')).toBeVisible({ timeout: 20000 })

    await page.getByText('Maasai Mara National Reserve').first().click()
    await expect(
      page.getByRole('heading', { name: 'Maasai Mara National Reserve' }),
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Save draft/i })).toBeVisible()
    await page.getByRole('button', { name: 'Close panel' }).click()
  })

  test('opens the submissions queue and settings', async ({ page }) => {
    await login(page)
    await page.goto('/repository')

    await page.getByRole('button', { name: 'Submissions', exact: true }).click()
    await expect(page.getByText('No submissions are waiting for review.')).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByText('Public submissions open')).toBeVisible({ timeout: 15000 })
  })
})
