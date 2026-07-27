import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

function makeItem(id: string, overrides: Record<string, unknown> = {}) {
  return { id, ...overrides }
}

function paginated(items: Record<string, unknown>[]) {
  return { items, nextCursor: items.length > 0 ? 'c-' + items[items.length - 1].id : null, hasMore: false }
}

test.describe('UI Structure Tests', () => {
  test.describe.configure({ timeout: 45000 })

  test('destinations page renders — header, filter buttons, new button', async ({ page }) => {
    await page.route('**/v1/destinations', (route) => route.fulfill({ json: paginated([makeItem('d1', { name: 'Test Dest', slug: 'test-dest', county: 'Nairobi', category: 'wildlife', status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })]) }))
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await expect(page.locator('h1')).toContainText('Destination CMS')
    await expect(page.getByRole('button', { name: /^New Destination$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^All$/ })).toBeVisible()
  })

  test('destinations — new destination opens form with 8 tabs', async ({ page }) => {
    await page.route('**/v1/destinations', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.getByRole('button', { name: /^New Destination$/ }).click()
    await page.waitForTimeout(500)
    const tabNames = ['Identity', 'Location', 'Overview', 'Experience', 'Planning', 'Media', 'Related', 'Governance']
    for (const name of tabNames) {
      const btn = page.locator(`button:has-text("${name}")`).first()
      await expect(btn).toBeVisible({ timeout: 3000 })
    }
  })

  test('destinations — create form validates required fields', async ({ page }) => {
    await page.route('**/v1/destinations', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.getByRole('button', { name: /^New Destination$/ }).click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("Create Destination")').first().click()
    await expect(page.locator('text=Required').or(page.locator('text=required')).first()).toBeVisible({ timeout: 5000 })
  })

  test('events page renders — status workflow buttons', async ({ page }) => {
    await page.route('**/v1/events', (route) => route.fulfill({ json: paginated([makeItem('evt-1', { title: 'Test Event', organizer: 'Test Org', county: 'Nairobi', type: 'cultural', status: 'scheduled', date: new Date().toISOString(), endDate: new Date().toISOString(), description: '', contactEmail: '', contactPhone: '', reminderEnabled: false, reminderTime: '' })]) }))
    await loginAsAdmin(page)
    await page.goto('/events')
    await expect(page.locator('h1')).toContainText('Events Calendar Admin')
    await page.getByText('Test Event').click()
    await expect(page.getByRole('button', { name: /postponed/ }).first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /cancelled/ }).first()).toBeVisible({ timeout: 3000 })
  })

  test('campaigns — type switch shows conditional fields', async ({ page }) => {
    await page.route('**/v1/campaigns', (route) => route.fulfill({ json: paginated([makeItem('cmp-1', { title: 'Test Campaign', type: 'push_notification', status: 'draft' })]) }))
    await loginAsAdmin(page)
    await page.goto('/campaigns')
    await expect(page.locator('h1')).toContainText('Campaigns')
    await page.getByText('Test Campaign').click()
    await expect(page.getByText('Send Now')).toBeVisible({ timeout: 3000 })
  })

  test('conservation — activities and evidence tabs switch', async ({ page }) => {
    await page.route('**/v1/conservation/activities', (route) => route.fulfill({ json: paginated([makeItem('act-1', { title: 'Tree Planting', organizer: 'Green Africa', status: 'active' })]) }))
    await page.route('**/v1/conservation/evidence', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/conservation')
    await expect(page.locator('h1')).toContainText('Conservation Tracker Administration')
    await page.getByRole('button', { name: /Evidence Review/ }).click()
    await expect(page.locator('text=Evidence').first()).toBeVisible()
  })

  test('courses — inline edit shows lesson/quiz/certificate/settings tabs', async ({ page }) => {
    await page.route('**/v1/courses', (route) => route.fulfill({ json: paginated([makeItem('crs-1', { title: 'Test Course', difficulty: 'beginner', status: 'draft', lessons: [], lessonCount: 0, passThreshold: 70, quizQuestions: [], certificateEnabled: false, certificateTemplate: 'standard', enrollmentCount: 0, completionCount: 0 })]) }))
    await loginAsAdmin(page)
    await page.goto('/lms')
    await expect(page.locator('h1')).toContainText('Learning Hub')
    await page.getByText('Test Course').click()
    await expect(page.getByRole('button', { name: /^Lessons$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Quiz$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Certificate$/ })).toBeVisible()
    const settingsBtns = page.getByRole('button', { name: /^Settings$/ })
    await expect(settingsBtns.last()).toBeVisible()
  })

  test('challenges page renders — create form opens', async ({ page }) => {
    await page.route('**/v1/challenges', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/challenges')
    await expect(page.locator('h1')).toContainText('Challenges')
    await page.getByRole('button', { name: /New Challenge/ }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: /Create Challenge/ })).toBeVisible()
  })

  test('media queue — stories show approve/reject/flag buttons', async ({ page }) => {
    await page.route('**/v1/stories/moderation', (route) => route.fulfill({ json: paginated([makeItem('st-1', { creatorHandle: 'testuser', caption: 'Nice photo', mediaType: 'image', location: 'Nairobi', tags: [], status: 'pending', likeCount: 0, saveCount: 0, submittedAt: new Date().toISOString() })]) }))
    await page.route('**/v1/media', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/media')
    await expect(page.getByRole('button', { name: /Approve/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Reject/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Flag/ })).toBeVisible()
  })

  test('media upload area renders', async ({ page }) => {
    await page.route('**/v1/media', (route) => route.fulfill({ json: paginated([]) }))
    await page.route('**/v1/stories/moderation', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/media')
    await page.getByRole('button', { name: /Media Library/ }).click()
    await page.getByRole('button', { name: /Upload Asset/ }).click()
    await expect(page.getByText('Choose a file')).toBeVisible()
  })

  test('api error — 500 response handled gracefully', async ({ page }) => {
    await page.route('**/v1/destinations', (route) => route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Server error' } } }))
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.waitForTimeout(2000)
    await expect(page.locator('h1')).toContainText('Destination CMS')
  })

  test('pagination — next button active when hasMore is true', async ({ page }) => {
    await page.route('**/v1/destinations', (route) => route.fulfill({ json: { items: [makeItem('d1', { name: 'Test', slug: 'test', county: 'Nairobi', category: 'wildlife', status: 'draft' })], nextCursor: 'abc123', hasMore: true } }))
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await expect(page.getByRole('button', { name: /Next/ })).not.toBeDisabled()
  })

  test('conservation evidence list shows approve/reject', async ({ page }) => {
    await page.route('**/v1/conservation/evidence', (route) => route.fulfill({ json: paginated([makeItem('ev-1', { userId: 'u1', activityId: 'a1', activityTitle: 'Beach Cleanup', userName: 'Test User', description: 'Some evidence', imageUrl: '', status: 'pending', submittedAt: new Date().toISOString() })]) }))
    await page.route('**/v1/conservation/activities', (route) => route.fulfill({ json: paginated([]) }))
    await loginAsAdmin(page)
    await page.goto('/conservation')
    await page.getByRole('button', { name: /Evidence Review/ }).click()
    await expect(page.getByRole('button', { name: /Approve/ }).or(page.getByRole('button', { name: /Reject/ }))).toBeVisible()
  })

  test('user management page renders', async ({ page }) => {
    await page.route('**/api/admin/users/list', (route) => route.fulfill({ json: { users: [{ id: 'u1', email: 'admin@example.com', name: 'Admin', role: 'super_admin', banned: false, createdAt: new Date().toISOString() }], total: 1 } }))
    await page.route('**/api/admin/users/audit', (route) => route.fulfill({ json: { items: [{ id: 'aud-1', userId: 'u1', userName: 'Admin', action: 'user_created', details: 'User account created', performedBy: 'system', performedByName: 'System', createdAt: new Date().toISOString() }] } }))
    await loginAsAdmin(page)
    await page.goto('/users')
    await expect(page.locator('h1')).toContainText('User Management')
  })
})
