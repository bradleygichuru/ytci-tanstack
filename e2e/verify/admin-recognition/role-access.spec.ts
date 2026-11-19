/**
 * RBAC proof for the widened admin access — ytci-mobile#407.
 *
 * The role contract now grants `platform.admin_access` to the content and
 * review roles (`content_editor`, `species_expert`, `translator`,
 * `language_reviewer`, `rights_reviewer`). This suite proves that the widened
 * grant reaches the running app: each content role sees the admin shell and the
 * species nav entry and can open `/programme/species`, while a reader (`user`)
 * is still sent to `/no-access` and sees no species entry.
 *
 * Live mode only. It signs into the real app on VERIFY_BASE_URL against a
 * disposable seed and never touches :3000, production, or a shared database.
 *
 *   VERIFY_MODE=live VERIFY_SEED_ID=verify-rbac-407 \
 *   VERIFY_BASE_URL=http://127.0.0.1:3213 VERIFY_ALLOW_PORT=1 \
 *   VERIFY_ADMIN_PASSWORD=password \
 *     bun run test:e2e:verify -- admin-recognition/role-access.spec.ts
 */
import { expect, test, type Page } from '@playwright/test'
import { loginAs, logout } from '../helpers/auth'
import { assertDisposableTarget } from '../helpers/seed'

test.skip(process.env.VERIFY_MODE !== 'live', 'Role access proof is live-mode only.')

/** Users seeded by scripts/seed-test-users.ts at the shared test password. */
const CONTENT_ROLES = [
  { email: 'editor@example.com', role: 'content_editor' },
  { email: 'translator@example.com', role: 'translator' },
  { email: 'reviewer@example.com', role: 'language_reviewer' },
] as const

const READER = { email: 'alice@example.com', role: 'user' } as const

const SPECIES_NAV = { name: 'Species', exact: true } as const
const SPECIES_PATH = '/programme/species'

test.beforeAll(() => {
  assertDisposableTarget()
})

async function expectAdminShell(page: Page): Promise<void> {
  await expect(page.getByAltText('YTC Explorer logo')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Admin Portal', { exact: true })).toBeVisible()
}

async function expectSpeciesEntryVisible(page: Page): Promise<void> {
  await expect(page.getByRole('link', SPECIES_NAV)).toBeVisible({ timeout: 20_000 })
}

test.describe('widened admin access', () => {
  for (const user of CONTENT_ROLES) {
    test(`${user.role} reaches the admin shell and species screen`, async ({ page }) => {
      await loginAs(page, user.email)

      // The default post-login destination is analytics, which this role does
      // not necessarily hold. Go straight to the surface the role is for.
      await page.goto(SPECIES_PATH, { waitUntil: 'domcontentloaded' })

      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 30_000 })
      await expectAdminShell(page)
      await expectSpeciesEntryVisible(page)
      await expect(page.getByRole('heading', { name: 'Species overview', exact: true })).toBeVisible({
        timeout: 30_000,
      })

      // The species section tabs only render inside the authenticated shell.
      await expect(page.getByRole('navigation', { name: 'Species admin sections' })).toBeVisible()
    })
  }

  test(`${READER.role} is denied the admin shell and species screen`, async ({ page }) => {
    await loginAs(page, READER.email)

    // A reader has no `platform.admin_access`; the shell guard must already
    // have sent them to the denial page after sign-in.
    await expect(page).toHaveURL(/\/no-access/, { timeout: 30_000 })
    await expect(page.getByAltText('YTC Explorer logo')).toHaveCount(0)
    await expect(page.getByRole('link', SPECIES_NAV)).toHaveCount(0)

    // A direct deep link must not bypass the shell or route gate.
    await page.goto(SPECIES_PATH, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/no-access/, { timeout: 30_000 })
    await expect(page.getByRole('link', SPECIES_NAV)).toHaveCount(0)

    await logout(page)
  })
})
