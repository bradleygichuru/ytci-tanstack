import { test, expect, type Page } from '@playwright/test'

test.describe('User Management E2E', () => {
  test.describe.configure({ timeout: 90000 })

  async function loginAs(page: Page, email: string) {
    await page.goto('/login')
    await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
    await page.waitForTimeout(500)
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL('**/analytics', { timeout: 20000 })
    await page.waitForTimeout(1000)
  }

  async function waitForData(page: Page) {
    await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 15000 })
  }

  async function clickFirstRow(page: Page) {
    const firstCell = page.locator('table tbody td:not([colspan])').first()
    await firstCell.waitFor({ state: 'visible', timeout: 10000 })
    await firstCell.click()
    await page.waitForTimeout(500)
  }

  function editPanel(page: Page) {
    return page.locator('table tbody td[colspan]')
  }

  test.describe('Page access', () => {
    test('super_admin can access /users', async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      await page.goto('/users')
      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 10000 })
      await expect(page.locator('h1')).toContainText('User Management & Security')
    })

    test('administrator can access /users', async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      await page.goto('/users')
      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 10000 })
      await expect(page.locator('h1')).toContainText('User Management & Security')
    })

    test('moderator is redirected from /users', async ({ page }) => {
      await loginAs(page, 'moderator@example.com')
      await page.goto('/users')
      await expect(page).toHaveURL(/\/no-access/, { timeout: 10000 })
    })

    test('county_officer is redirected from /users', async ({ page }) => {
      await loginAs(page, 'officer@example.com')
      await page.goto('/users')
      await expect(page).toHaveURL(/\/no-access/, { timeout: 10000 })
    })
  })

  test.describe('Super admin user management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      await page.goto('/users')
      await expect(page.locator('h1')).toContainText('User Management & Security')
      await waitForData(page)
    })

    test('displays stat cards and user table', async ({ page }) => {
      await expect(page.locator('text=Total Users').first()).toBeVisible()
      await expect(page.locator('text=Active Directory').first()).toBeVisible()
      await expect(page.locator('text=Roles').first()).toBeVisible()
      const userRows = page.locator('table tbody tr').filter({ hasText: '@' })
      await expect(userRows.first()).toBeVisible({ timeout: 10000 })
    })

    test('can create a new user', async ({ page }) => {
      // Ensure no stale dialog is open
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      await page.click('button:has-text("New User")')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 10000 })

      const testEmail = `e2e-create-${Date.now()}@example.com`
      await dialog.locator('input').nth(0).fill('E2E Test User')
      await dialog.locator('input').nth(1).fill(testEmail)

      await page.getByText('I attest that user consent has been obtained').click()
      await page.click('button:has-text("Create User")')

      await expect(page.getByText('User created')).toBeVisible({ timeout: 15000 })
      await expect(page.getByText('Share this securely')).toBeVisible()
      await expect(page.locator('font-mono')).not.toBeEmpty()

      await page.click('button:has-text("Done")')
      await waitForData(page)
      await expect(page.getByText(testEmail).first()).toBeVisible({ timeout: 10000 })
    })

    test('can edit user name', async ({ page }) => {
      await clickFirstRow(page)
      const nameInput = editPanel(page).locator('input').first()
      await nameInput.waitFor({ state: 'visible', timeout: 5000 })
      await nameInput.fill('Updated Admin Name')

      await page.click('button:has-text("Save")')
      await waitForData(page)
      await expect(page.getByText('Updated Admin Name').first()).toBeVisible({ timeout: 5000 })
    })

    test('can ban and unban a user', async ({ page }) => {
      await clickFirstRow(page)
      const panel = editPanel(page)
      const suspendCheckbox = panel.locator('label:has-text("Suspend account")').locator('input[type="checkbox"]')
      await suspendCheckbox.first().waitFor({ state: 'visible', timeout: 5000 })
      const isChecked = await suspendCheckbox.first().isChecked()

      if (isChecked) {
        await suspendCheckbox.first().uncheck()
      } else {
        await suspendCheckbox.first().check()
      }

      const reasonInput = page.locator('input[placeholder="Reason for suspension..."]')
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('E2E test ban')
      }

      await page.click('button:has-text("Save")')
      await waitForData(page)

      await clickFirstRow(page)
      const toggleBack = editPanel(page).locator('label:has-text("Suspend account")').locator('input[type="checkbox"]').first()
      if (await toggleBack.isChecked()) { await toggleBack.uncheck() } else { await toggleBack.check() }
      await page.click('button:has-text("Save")')
      await waitForData(page)
    })

    test('can toggle user consent', async ({ page }) => {
      await clickFirstRow(page)
      const grantOrRevoke = editPanel(page).locator('button:has-text("Grant Consent"), button:has-text("Revoke Consent")').first()
      if (await grantOrRevoke.isVisible()) { await grantOrRevoke.click() }
      await page.click('button:has-text("Save")')
      await waitForData(page)
    })

    test('can change user role and audit log shows it', async ({ page }) => {
      await clickFirstRow(page)
      const panel = editPanel(page)
      const roleSelect = panel.locator('select')
      await roleSelect.waitFor({ state: 'visible', timeout: 5000 })
      const currentRole = await roleSelect.inputValue()
      const newRole = currentRole === 'super_admin' ? 'administrator' : 'super_admin'
      await roleSelect.selectOption(newRole)

      await page.click('button:has-text("Save")')
      await waitForData(page)
      await expect(page.locator('table').getByText(newRole, { exact: true }).first()).toBeVisible({ timeout: 5000 })

      await clickFirstRow(page)
      await editPanel(page).locator('select').selectOption(currentRole)
      await page.click('button:has-text("Save")')
      await waitForData(page)

      await page.click('button:has-text("Consent Audit")')
      await page.waitForTimeout(1500)
      await expect(page.getByText('role_assigned').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Administrator limitations', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      await page.goto('/users')
      await expect(page.locator('h1')).toContainText('User Management & Security')
      await waitForData(page)
    })

    test('role dropdown is disabled', async ({ page }) => {
      await clickFirstRow(page)
      const roleSelect = editPanel(page).locator('select')
      await expect(roleSelect).toBeDisabled()
      await expect(page.getByText('Only super-admin can change roles')).toBeVisible()
    })

    test('suspend checkbox is disabled', async ({ page }) => {
      await clickFirstRow(page)
      const suspendCheckbox = editPanel(page).locator('label:has-text("Suspend account")').locator('input[type="checkbox"]')
      await expect(suspendCheckbox).toBeDisabled()
      await expect(page.getByText('Only super-admin can suspend users')).toBeVisible()
    })
  })
})
