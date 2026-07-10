import { test } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
]

async function fecharTour(page: import('@playwright/test').Page) {
  for (let i = 0; i < 5; i++) {
    const tour = page.locator('.fixed.inset-0.bg-black\\/60')
    if (await tour.count() > 0 && await tour.first().isVisible()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    } else {
      break
    }
  }
}

async function capturar(page: import('@playwright/test').Page, nome: string) {
  await page.screenshot({
    path: `e2e/screenshots/${nome}.png`,
    fullPage: true,
  })
}

for (const vp of VIEWPORTS) {
  test.describe(`viewport: ${vp.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
    })

    test(`ideias-empty-${vp.name}`, async ({ page }) => {
      await page.goto('/ideias')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      await capturar(page, `ideias-empty-${vp.name}`)
    })

    test(`ideias-select-mode-${vp.name}`, async ({ page }) => {
      await page.goto('/ideias')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      const selectBtn = page.locator('[title="Selecionar múltiplas notas"]')
      if (await selectBtn.isVisible()) {
        await selectBtn.click({ force: true })
        await page.waitForTimeout(300)
      }
      await capturar(page, `ideias-select-mode-${vp.name}`)
    })

    test(`ideias-grafo-${vp.name}`, async ({ page }) => {
      await page.goto('/ideias')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      const grafoBtn = page.locator('[title="Grafo de conexões"]')
      if (await grafoBtn.isVisible()) {
        await grafoBtn.click()
        await page.waitForTimeout(500)
      }
      await capturar(page, `ideias-grafo-${vp.name}`)
    })

    test(`ideias-template-modal-${vp.name}`, async ({ page }) => {
      await page.goto('/ideias')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      const templateBtn = page.locator('[title="Criar a partir de modelo"]')
      if (await templateBtn.isVisible()) {
        await templateBtn.click()
        await page.waitForTimeout(300)
      }
      await capturar(page, `ideias-template-modal-${vp.name}`)
    })

    test(`dashboard-${vp.name}`, async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      await capturar(page, `dashboard-${vp.name}`)
    })

    test(`rotina-${vp.name}`, async ({ page }) => {
      await page.goto('/rotina')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      await capturar(page, `rotina-${vp.name}`)
    })

    test(`pomodoro-${vp.name}`, async ({ page }) => {
      await page.goto('/pomodoro')
      await page.waitForLoadState('networkidle')
      await fecharTour(page)
      await capturar(page, `pomodoro-${vp.name}`)
    })
  })
}
