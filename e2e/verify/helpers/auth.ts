import { expect, type Page } from '@playwright/test'
import { assertDisposableTarget, VERIFY_FIXTURES } from './seed'

/**
 * Auth helpers for live verification only. Fixture mode has no auth.
 *
 * The live app must already be running on VERIFY_BASE_URL with a disposable
 * seed. Credentials come from the environment; never commit them.
 */
export const VERIFY_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD

export async function loginAs(page: Page, email: string): Promise<void> {
  const target = assertDisposableTarget()
  if (target.mode !== 'live') {
    throw new Error('loginAs() is only available with VERIFY_MODE=live.')
  }
  if (!VERIFY_PASSWORD) {
    throw new Error(
      'VERIFY_ADMIN_PASSWORD is required for live verification; set it in the shell, never in a spec.',
    )
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(VERIFY_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle').catch(() => {
    // Streaming/devtools sockets can keep the network busy; the URL assertion
    // above is the real gate.
  })
}

export async function loginAsVerifyAdmin(page: Page): Promise<void> {
  await loginAs(page, VERIFY_FIXTURES.users.superAdmin.email)
}

export async function loginAsVerifyModerator(page: Page): Promise<void> {
  await loginAs(page, VERIFY_FIXTURES.users.moderator.email)
}

export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/login')
}

/** Wait until the admin shell has finished its skeleton phase. */
export async function waitForAdminData(page: Page): Promise<void> {
  const skeleton = page.locator('[data-slot="skeleton"]')
  if ((await skeleton.count()) > 0) {
    await expect(skeleton.first()).not.toBeVisible({ timeout: 15_000 })
  }
}
