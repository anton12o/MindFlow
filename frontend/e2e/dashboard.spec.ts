import { test, expect } from '@playwright/test'

test('dashboard carrega metricas principais', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('[title="Notas"]')).toBeVisible()
  await expect(page.locator('[title="Rotina"]')).toBeVisible()
  await expect(page.locator('[title="Flashcards"]')).toBeVisible()
  await expect(page.locator('[title="Hábitos"]')).toBeVisible()
})

test('dashboard mostra habitos ativos', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('[title*="Captura"]')).toBeVisible()
})

test('navega para rotina pela sidebar', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Rotina' }).click()
  await expect(page).toHaveURL(/\/rotina/)
  await expect(page.locator('h1')).toContainText('Rotina')
})

test('sidebar captura rapida esta presente', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Captura rápida' })).toBeVisible()
})

test('tour pode ser aberto e navegado', async ({ page }) => {
  await page.goto('/')

  const ajudaBtn = page.getByRole('button', { name: /(Ajuda|Tour)/ })
  if (await ajudaBtn.isVisible()) {
    await ajudaBtn.click()
    await expect(page.locator('text=Bem-vindo ao MindFlow')).toBeVisible()
  }
})
