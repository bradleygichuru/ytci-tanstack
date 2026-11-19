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

  // The login form is a React onSubmit handler. If the click lands before the
  // route hydrates, the browser performs a native GET to `/login?` and the
  // controlled fields look empty to the handler. Type after networkidle and
  // retry once on that native-submit signature.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login', { waitUntil: 'networkidle' })
    const emailInput = page.locator('#login-email')
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 })
    await emailInput.pressSequentially(email, { delay: 5 })
    await page.locator('#login-password').pressSequentially(VERIFY_PASSWORD, { delay: 5 })
    await page.getByRole('button', { name: /sign in/i }).click()

    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
      break
    } catch (error) {
      if (attempt === 1) {
        const alert = await page.getByRole('alert').allInnerTexts().catch(() => [])
        throw new Error(`login failed for ${email}: ${alert.join(' / ') || String(error)}`)
      }
    }
  }

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
