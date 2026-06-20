import { test, expect } from '@playwright/test'

test('app loads and navigates between pages', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await expect(page.locator('h1')).toContainText('Dashboard')

  await page.click('text=Rotina')
  await expect(page).toHaveURL(/\/rotina/)
  await expect(page.locator('h1')).toContainText('Rotina')

  await page.click('text=Hábitos')
  await expect(page).toHaveURL(/\/habitos/)
  await expect(page.locator('h1')).toContainText('Hábitos')

  await page.click('text=Pomodoro')
  await expect(page).toHaveURL(/\/pomodoro/)
  await expect(page.locator('h1')).toContainText('Pomodoro')

  await page.click('text=Ideias')
  await expect(page).toHaveURL(/\/ideias/)
  await expect(page.locator('h1')).toContainText('Ideias')
})
