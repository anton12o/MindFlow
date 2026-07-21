const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const CHROME_PATH = 'C:\\Users\\AntonioF\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe'
const out = path.resolve(__dirname, '..', 'docs', 'screenshots')
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true })

const VIEWS = [
  { key: 'full', click: null },
  { key: 'eisenhower', click: 'button:has-text("Eisenhower")' },
  { key: 'gut', click: 'button:has-text("GUT")' },
  { key: 'esforco_impacto', click: 'button:has-text("Esfor")' },
  { key: 'rice', click: 'button:has-text("RICE")' },
]

const THEMES = ['dark', 'light']

async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()

  for (const theme of THEMES) {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 20000 })
    await page.evaluate((t) => {
      localStorage.setItem('mindflow-theme', t)
      document.documentElement.setAttribute('data-theme', t)
    }, theme)
    await page.waitForTimeout(500)
    await page.goto('http://localhost:5173/matriz', { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)

    for (const v of VIEWS) {
      const suffix = theme === 'dark' ? '' : `_light`
      const filename = `matriz_${v.key}${suffix}.png`
      if (v.click) {
        const btn = page.locator(v.click).first()
        if (await btn.count() > 0) {
          await btn.click()
          await page.waitForTimeout(2500)
        }
      }
      await page.screenshot({ path: path.join(out, filename), fullPage: true })
      console.log(`Saved: ${filename}`)
    }
  }
  await browser.close()
  console.log('Done')
}
run().catch(e => { console.error(e); process.exit(1) })
