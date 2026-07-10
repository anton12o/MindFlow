import { test, expect } from '@playwright/test'

test('intencao diaria salva e aparece no banner', async ({ page }) => {
  await page.goto('/rotina')

  const input = page.locator('input[placeholder*="Terminar"]')
  await input.fill('Foco do teste')

  await expect(page.locator('span:has-text("Salvo")')).toBeVisible()
  await expect(input).toHaveValue('Foco do teste')

  await page.reload()
  await expect(input).toHaveValue('Foco do teste')
})

test('intencao limita a 280 caracteres', async ({ page }) => {
  await page.goto('/rotina')
  const input = page.locator('input[placeholder*="Terminar"]')

  await input.fill('a'.repeat(280))
  await expect(input).toHaveValue('a'.repeat(280))

  await input.fill('a'.repeat(281))
  await expect(input).toHaveValue('a'.repeat(280))
})
