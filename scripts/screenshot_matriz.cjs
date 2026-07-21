const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const dir = __dirname
const out = path.resolve(dir, '..', 'docs', 'screenshots')
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true })

const VIEWS = ['eisenhower', 'gut', 'esforco_impacto', 'rice']

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // Go to matriz page with a short timeout to let data load
  await page.goto('http://localhost:5173/matriz', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(3000)

  // 1. Screenshot full page
  await page.screenshot({ path: path.join(out, 'matriz_full.png'), fullPage: true })

  // 2. Try to find the matrix selector buttons and click each view
  const selector = page.locator('[class*="MatrixSelector"] button, [class*="matrix-selector"] button, button:has-text("Eisenhower"), button:has-text("GUT"), button:has-text("Esfor"), button:has-text("RICE")')
  const count = await selector.count()
  console.log(`Found ${count} view selector buttons`)

  // Click through each view if selectors exist
  for (const view of VIEWS) {
    // Try various selector patterns
    const btn = page.locator(`button:has-text("${view === 'esforco_impacto' ? 'Esfor' : view.charAt(0).toUpperCase() + view.slice(1).replace('_', ' ')}")`).first()
    if (await btn.count() > 0) {
      await btn.click()
      await page.waitForTimeout(2000)
    }
    await page.screenshot({ path: path.join(out, `matriz_${view}.png`), fullPage: true })
    console.log(`Screenshot: matriz_${view}.png`)
  }

  await browser.close()
  console.log('Done')
}

run().catch(e => { console.error(e); process.exit(1) })
