import { test, expect } from '@playwright/test'

test('app loads and navigates between pages', async ({ page }) => {
  await page.goto('http://localhost:5173')

  await page.waitForTimeout(1000)

  let tourClosed = false
  for (let i = 0; i < 5; i++) {
    const tour = page.locator('.fixed.inset-0.bg-black\\/60')
    if (await tour.count() > 0 && await tour.first().isVisible()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    } else {
      tourClosed = true
      break
    }
  }

  if (!tourClosed) {
    await page.screenshot({ path: 'test-results/tour-still-open.png' })
  }

  await page.click('[title="Rotina"]')
  await expect(page).toHaveURL(/\/rotina/)
  await expect(page.locator('h1')).toContainText('Rotina')

  await page.click('[title="Hábitos"]')
  await expect(page).toHaveURL(/\/habitos/)
  await expect(page.locator('h1')).toContainText('Hábitos')

  await page.click('[title="Pomodoro"]')
  await expect(page).toHaveURL(/\/pomodoro/)
  await expect(page.locator('h1')).toContainText('Pomodoro')

  await page.click('[title="Ideias"]')
  await expect(page).toHaveURL(/\/ideias/)
  await expect(page.locator('h1')).toContainText('Notas', { timeout: 8000 })
})
