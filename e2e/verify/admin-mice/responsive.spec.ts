import { expect, test, type Page } from '@playwright/test'
import { assertDisposableTarget } from '../helpers/seed'
import { login, openRoute, SCREENS } from './mice.helpers'

/**
 * Responsive gates for the MICE admin (#396).
 *
 * 1400 and 900 must keep the document inside the viewport and make the
 * right-most Actions/evidence column reachable by scrolling the table, with the
 * row identity pinned. At 200% text the KPI strip and the overview grid must
 * reflow instead of overlapping.
 */
test.setTimeout(180_000)

test.describe('MICE admin — responsive', () => {
  test.skip(process.env.VERIFY_MODE !== 'live', 'live admin run only')

  test.beforeAll(() => {
    if (process.env.VERIFY_MODE === 'live') assertDisposableTarget()
  })

  async function expectNoHorizontalOverflow(page: Page, label: string) {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow, `${label}: document horizontal overflow ${overflow}px`).toBeLessThanOrEqual(1)
  }

  for (const width of [1400, 900]) {
    test(`${width}: no document overflow and every table reaches its action column`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 })
      await login(page)

      for (const [key, route] of SCREENS) {
        await openRoute(page, route)
        await expectNoHorizontalOverflow(page, `${key} @ ${width}`)

        const tables = page.locator('[data-slot="table-container"]')
        const count = await tables.count()
        for (let index = 0; index < count; index += 1) {
          const result = await tables.nth(index).evaluate((container) => {
            const headers = container.querySelectorAll('thead th')
            const last = headers[headers.length - 1]
            const first = headers[0]
            if (!last) return { ok: true, reason: 'no header', sticky: null }

            // Scroll to the end: the action/evidence header must be fully
            // inside the scrollport rather than cut off at the card edge.
            container.scrollLeft = container.scrollWidth
            const viewport = container.getBoundingClientRect()
            const action = last.getBoundingClientRect()
            const reachable =
              action.left >= viewport.left - 1 &&
              action.right <= viewport.right + 1

            return {
              ok: reachable,
              reason: `${last.textContent?.trim() ?? 'column'} is ${
                Math.round(action.right - viewport.right)
              }px beyond the scrollport`,
              sticky: first ? getComputedStyle(first).position : 'none',
            }
          })

          expect(
            result.ok,
            `${key} table ${index} @ ${width}: ${result.reason}`,
          ).toBe(true)
          if (result.sticky !== null) {
            expect(
              result.sticky,
              `${key} table ${index} @ ${width}: first column is not pinned`,
            ).toBe('sticky')
          }
        }
      }
    })
  }

  test('200% text: KPIs and the overview grid reflow without overlap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 1000 })
    await login(page)
    await openRoute(page, '/programme/events')
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await page.waitForTimeout(400)

    await expectNoHorizontalOverflow(page, 'overview @ 200% text')

    const layout = await page.evaluate(() => {
      const columns = (selector: string) => {
        const element = document.querySelector(selector)
        if (!element) return null
        return getComputedStyle(element).gridTemplateColumns
          .split(' ')
          .filter(Boolean).length
      }

      const cards = [
        ...document.querySelectorAll('[data-testid="mice-kpi-strip"] > div'),
      ].map((card) => card.getBoundingClientRect())

      const overlaps = cards.flatMap((a, index) =>
        cards.slice(index + 1).filter(
          (b) =>
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top,
        ),
      ).length

      return {
        kpiColumns: columns('[data-testid="mice-kpi-strip"]'),
        gridColumns: columns('[data-testid="mice-overview-grid"]'),
        overlaps,
        cards: cards.length,
      }
    })

    expect(layout.cards, 'all four KPI cards render').toBe(4)
    expect(layout.overlaps, 'KPI cards do not overlap at 200% text').toBe(0)
    expect(layout.kpiColumns, 'KPI strip reflows to 2-up or 1-up').not.toBeNull()
    expect(layout.kpiColumns!).toBeLessThanOrEqual(2)
    expect(layout.gridColumns, 'attention/check-in grid does not collapse').not.toBeNull()
    expect(layout.gridColumns!).toBeLessThanOrEqual(2)
  })

  test('900: the agenda header stacks its actions below the title', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await login(page)
    await openRoute(page, '/programme/events/agenda')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Agenda & speakers' }),
    ).toBeVisible()

    const geometry = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('h1')].find(
        (element) => element.textContent?.trim() === 'Agenda & speakers',
      )
      const header = heading?.closest('header')
      const actions = header?.lastElementChild
      if (!heading || !actions) return null
      return {
        title: heading.getBoundingClientRect().toJSON(),
        actions: actions.getBoundingClientRect().toJSON(),
      }
    })

    expect(geometry, 'agenda header and action group render').not.toBeNull()
    expect(
      geometry!.actions.top,
      'actions start below the title line instead of squeezing it',
    ).toBeGreaterThanOrEqual(geometry!.title.bottom)
  })
})
