import { test, expect } from '@playwright/test'

test.describe.configure({ timeout: 120000 })

const COURSE_TITLE = 'Kenya Wildlife Conservation 101'
const LESSON_1 = 'Introduction to Wildlife Conservation'
const LESSON_2 = 'Conservation Success Stories'
const PASS_THRESHOLD = '67'

const QUIZ_QUESTIONS = [
  { text: 'What is the main goal of wildlife conservation?', correct: 0 },
  { text: 'Which country has the largest elephant population?', correct: 1 },
  { text: 'What is an endangered species in Kenya?', correct: 1 },
]

const OPTION_LABELS = ['A', 'B', 'C', 'D']

test('LMS — seed course with lessons and quiz', async ({ page }) => {
  await page.goto('/login')
  await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
  await page.waitForTimeout(500)
  await page.fill('input[type="email"]', 'admin@example.com')
  await page.fill('input[type="password"]', 'password')
  await page.click('button:has-text("Sign In")')
  await page.waitForURL('**/analytics', { timeout: 20000 })
  await page.waitForTimeout(500)

  await page.goto('/lms')
  await expect(page.getByText(/courses/)).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: 'New Course' }).click()
  await expect(page.getByLabel('Title')).toBeVisible({ timeout: 10000 })

  await page.getByLabel('Title').fill(COURSE_TITLE)
  await page.getByLabel('Difficulty').selectOption('beginner')
  await page.getByLabel('Status').selectOption('published')
  await page.getByLabel('Pass Threshold').fill(PASS_THRESHOLD)

  await page.getByRole('button', { name: 'Create Course' }).click()
  await expect(page.locator('button:has-text("Save Changes")')).toBeVisible({ timeout: 10000 })

  await page.getByRole('button', { name: 'Lessons' }).click()
  await page.waitForTimeout(500)

  await page.locator('button:has-text("Add Lesson")').click()
  await page.waitForTimeout(500)
  await page.locator('input').filter({ hasValue: 'New Lesson' }).first().fill(LESSON_1)

  await page.locator('button:has-text("Add Lesson")').click()
  await page.waitForTimeout(500)
  await page.locator('input').filter({ hasValue: 'New Lesson' }).first().fill(LESSON_2)

  await page.locator('button:has-text("Save Changes")').click()
  await page.waitForTimeout(2000)

  await page.getByRole('button', { name: 'Quiz' }).click()
  await page.waitForTimeout(500)

  for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
    const q = QUIZ_QUESTIONS[i]
    await page.locator('button:has-text("Add Question")').click()
    await page.waitForTimeout(500)
    await page.locator('input').filter({ hasValue: 'New question?' }).first().fill(q.text)
    await page.locator(`div:has(> span:text("Q${i + 1}"))`).locator('label').nth(q.correct).click()
    await page.waitForTimeout(300)
  }

  await page.locator('button:has-text("Save Changes")').click()
  await page.waitForTimeout(2000)

  await expect(page.getByText(COURSE_TITLE).first()).toBeVisible({ timeout: 10000 })

  console.log('=== SEED COMPLETE ===')
  console.log(`Course: ${COURSE_TITLE}`)
  console.log(`Lesson 1: ${LESSON_1}`)
  console.log(`Lesson 2: ${LESSON_2}`)
  console.log(`Pass threshold: ${PASS_THRESHOLD}%`)
  QUIZ_QUESTIONS.forEach((q, i) => {
    console.log(`Q${i + 1}: "${q.text}" → correct: ${OPTION_LABELS[q.correct]}`)
  })
})
