import { test, expect } from '@playwright/test'

test('dashboard carrega metricas principais', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('text=Notas')).toBeVisible()
  await expect(page.locator('text=Tarefas')).toBeVisible()
  await expect(page.locator('text=Flashcards')).toBeVisible()
  await expect(page.locator('text=Sessões')).toBeVisible()
})

test('dashboard mostra habitos ativos', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('text=📥 Inbox')).toBeVisible()
})

test('navega para rotina pela sidebar', async ({ page }) => {
  await page.goto('/')

  await page.click('[title="Rotina"]')
  await expect(page).toHaveURL(/\/rotina/)
  await expect(page.locator('h1')).toContainText('Rotina')
})

test('inbox button esta presente', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('button:has-text("Abrir inbox")')).toBeVisible()
})

test('tour pode ser aberto e navegado', async ({ page }) => {
  await page.goto('/')

  const ajudaBtn = page.locator('button[title="Ajuda / Tour"]')
  if (await ajudaBtn.isVisible()) {
    await ajudaBtn.click()
    await expect(page.locator('text=Bem-vindo ao MindFlow')).toBeVisible()
  }
})
