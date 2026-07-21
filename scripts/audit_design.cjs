/** Auditoria de design — extrai estilos computados do DOM para análise textual.
 *
 * Uso: node scripts/audit_design.cjs
 * Requer: backend + frontend rodando (localhost:5173)
 * Saída: relatório textual em docs/auditoria-design-matrizes.txt
 */

const path = require('path')
const fs = require('fs')
const playwrightDir = path.resolve(__dirname, '..', 'frontend', 'node_modules', 'playwright')
const { chromium } = require(path.join(playwrightDir, 'index.js'))

const BROWSER_EXE = process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  path.join(process.env.USERPROFILE, 'AppData', 'Local', 'ms-playwright', 'chromium-1228', 'chrome-win64', 'chrome.exe')

const VIEWS = [
  { tipo: 'eisenhower', label: 'Eisenhower', tabLabel: 'Eisenhower' },
  { tipo: 'esforco_impacto', label: 'Esforço x Impacto', tabLabel: 'Esforço x Impacto' },
]

async function clickView(page, label) {
  const btn = page.locator('button').filter({ hasText: label }).first()
  if (await btn.count() > 0 && await btn.first().isVisible()) {
    await btn.first().click()
    await page.waitForTimeout(1500)
  }
}

async function voltarSelecao(page) {
  const voltar = page.locator('button[title="Voltar para todas as matrizes"]')
  if (await voltar.count() > 0 && await voltar.first().isVisible()) {
    await voltar.first().click()
    await page.waitForTimeout(1000)
  }
}

async function scanView(page, vv, fn) {
  await clickView(page, vv.label)
  await fn()
  await voltarSelecao(page)
}

function px(v) { return Math.round(v) + 'px' }

let report = []
function section(title) { report.push('', '='.repeat(60), title, '-'.repeat(60)) }
function line(label, value) { report.push('  ' + label + ': ' + value) }

// Helpers injetados no browser via evaluate
const BROWSER_HELPERS = `window.__audit={luminance:function(r,g,b){var rs=r/255,gs=g/255,bs=b/255;var rl=rs<=0.03928?rs/12.92:Math.pow((rs+0.055)/1.055,2.4);var gl=gs<=0.03928?gs/12.92:Math.pow((gs+0.055)/1.055,2.4);var bl=bs<=0.03928?bs/12.92:Math.pow((bs+0.055)/1.055,2.4);return 0.2126*rl+0.7152*gl+0.0722*bl},parseColor:function(cs){var m=cs.match(/^rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/);if(!m)return null;var c={r:+m[1],g:+m[2],b:+m[3],alpha:m[4]!==undefined?parseFloat(m[4]):1};c.lum=window.__audit.luminance(c.r,c.g,c.b);return c},composite:function(fg,bg){if(!fg||!bg)return fg;if(fg.alpha>=1)return fg;var a=fg.alpha,ia=1-a;return{r:Math.round(bg.r*ia+fg.r*a),g:Math.round(bg.g*ia+fg.g*a),b:Math.round(bg.b*ia+fg.b*a),lum:0,alpha:1}},_contrast:function(l1,l2){return(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)}}`

;(async () => {
  console.log('Auditando design...')

  const browser = await chromium.launch({ headless: true, executablePath: BROWSER_EXE })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto('http://localhost:5173/matriz', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(4000)

  // Injeta helpers
  await page.evaluate(BROWSER_HELPERS)

  section('AUDITORIA DE DESIGN — MATRIZES')
  report.push('  Data:', '  Viewport: 1440x900')

  // ─── 1. Theme / CSS vars ──────────────────────────────
  section('1. CORES DO TEMA (CSS Variables)')
  const theme = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    const vars = ['--color-bg-primary', '--color-bg-secondary', '--color-text-primary', '--color-text-muted', '--color-accent', '--color-border', '--color-danger', '--color-success']
    const r = {}
    for (const v of vars) r[v] = s.getPropertyValue(v).trim() || '(não definida)'
    return r
  })
  for (const [k, v] of Object.entries(theme)) line(k, v)

  // ─── 2. Paleta de cores renderizada ───────────────────
  section('2. PALETA CORES RENDERIZADA')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const colors = await page.evaluate(() => {
      const all = document.querySelectorAll('*')
      const seen = new Set()
      const result = []
      for (const el of all) {
        if (el.tagName === 'HTML' || el.tagName === 'BODY' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue
        const cn = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '')
        if (!cn && !el.id) continue // só elementos com classe ou id
        const cs = getComputedStyle(el)
        const bg = window.__audit.parseColor(cs.backgroundColor)
        const text = window.__audit.parseColor(cs.color)
        const tag = el.tagName + (cn ? '.' + cn.split(/\s+/).slice(0, 3).join('.') : '')
        if (bg && !seen.has(cs.backgroundColor)) { seen.add(cs.backgroundColor); result.push({ role: 'bg', el: tag, color: cs.backgroundColor }) }
        if (text && !seen.has(cs.color)) { seen.add(cs.color); result.push({ role: 'text', el: tag, color: cs.color }) }
        if (cs.borderColor && cs.borderColor !== 'rgba(0, 0, 0, 0)' && !seen.has(cs.borderColor)) { seen.add(cs.borderColor); result.push({ role: 'border', el: tag, color: cs.borderColor }) }
      }
      return result.slice(0, 25)
    })
    line(vv.label, '')
    for (const c of colors) line('  ' + c.role, c.color + '  (ex: <' + c.el + '>)')
    })
  }

  // ─── 3. Tipografia ────────────────────────────────────
  section('3. TIPOGRAFIA')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const fonts = await page.evaluate(() => {
      const textEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, button, label'))
        .filter(el => el.textContent.trim().length > 0)
      const seen = new Set()
      const result = []
      for (const el of textEls) {
        const cs = getComputedStyle(el)
        const key = cs.fontSize + '-' + cs.fontWeight + '-' + cs.fontFamily.split(',')[0].trim()
        if (!seen.has(key) && el.textContent.trim().length < 60) {
          seen.add(key)
          result.push({
            text: el.textContent.trim().slice(0, 40),
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            fontFamily: cs.fontFamily.split(',')[0].trim(),
            color: cs.color,
          })
        }
      }
      return result.slice(0, 15)
    })
    line(vv.label, '')
    for (const f of fonts) line('  "' + f.text + '"', f.fontSize + ' ' + f.fontWeight + ' ' + f.fontFamily + ' cor:' + f.color)
    })
  }

  // ─── 4. Layout ────────────────────────────────────────
  section('4. LAYOUT E DIMENSOES')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const layout = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div[class*="rounded-xl"], div[class*="rounded-2xl"], div[class*="rounded-lg"]'))
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 150 && r.height > 40 })
      return cards.slice(0, 5).map(c => {
        const r = c.getBoundingClientRect()
        const cs = getComputedStyle(c)
        const sh = cs.boxShadow
        return {
          w: Math.round(r.width), h: Math.round(r.height),
          padding: Math.round(parseFloat(cs.paddingLeft)) + 'px ' + Math.round(parseFloat(cs.paddingTop)) + 'px',
          radius: cs.borderRadius,
          bg: cs.backgroundColor,
          shadow: sh && sh !== 'none' ? sh.slice(0, 50) : 'none',
          text: c.textContent.trim().slice(0, 25),
        }
      })
    })
    line(vv.label, '')
    for (const l of layout) line('  card ' + l.w + 'x' + l.h, 'pad:' + l.padding + ' radius:' + l.radius + ' bg:' + l.bg + ' shadow:' + l.shadow)
    })
  }

  // ─── 5. Badges de score ──────────────────────────────
  section('5. BADGES DE SCORE')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const badges = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span, div'))
        .filter(el => /^\d+(\.\d+)?$/.test(el.textContent.trim()) && el.textContent.trim().length <= 5)
        .filter(el => { const r = el.getBoundingClientRect(); return r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 })
      return spans.slice(0, 5).map(el => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return { text: el.textContent.trim(), dim: Math.round(r.width) + 'x' + Math.round(r.height), bg: cs.backgroundColor, color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, radius: cs.borderRadius }
      })
    })
    if (!badges.length) { line(vv.label, 'nenhum (sem dados)') }
    else {
    line(vv.label, '')
    for (const b of badges) line('  "' + b.text + '"', b.dim + ' fs:' + b.fontSize + ' fw:' + b.fontWeight + ' bg:' + b.bg + ' text:' + b.color + ' radius:' + b.radius)
    }
    })
  }

  // ─── 6. Sliders ──────────────────────────────────────
  section('6. SLIDERS')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const sliders = await page.evaluate(() => {
      const rangeInputs = Array.from(document.querySelectorAll('input[type="range"]')).map(el => {
        const cs = getComputedStyle(el)
        const label = el.getAttribute('aria-label') || (el.closest('label') ? el.closest('label').textContent.trim().slice(0, 20) : 'sem label')
        return { tipo: 'range', label, min: el.min, max: el.max, step: el.step, value: el.value, accentColor: cs.accentColor || 'default', width: Math.round(el.getBoundingClientRect().width) + 'px' }
      })
      const customSliders = Array.from(document.querySelectorAll('[aria-label*="Esforço"], [aria-label*="Impacto"]')).map(el => {
        const cs = getComputedStyle(el)
        return { tipo: 'custom', label: el.getAttribute('aria-label') || '', value: el.textContent.trim(), width: Math.round(el.getBoundingClientRect().width) + 'px', color: cs.color, bg: cs.backgroundColor }
      })
      const parentDivs = Array.from(document.querySelectorAll('div'))
        .filter(d => {
          const txt = d.textContent || ''
          const hasButtons = d.querySelectorAll('button').length >= 2
          const hasNumber = /\b[1-5]\b/.test(txt)
          return hasButtons && hasNumber && (txt.includes('Esfor') || txt.includes('Impa'))
        })
        .slice(0, 4)
      const eiSliders = parentDivs.map(d => {
        const labelEl = d.querySelector('span')
        const valEl = d.querySelector('span.tabular-nums')
        return { tipo: 'ei', label: labelEl?.textContent?.trim() || '', value: valEl?.textContent?.trim() || '', width: Math.round(d.getBoundingClientRect().width) + 'px' }
      })
      return [...rangeInputs, ...customSliders, ...eiSliders].slice(0, 6)
    })
    if (sliders.length) {
      line(vv.label, '')
      for (const s of sliders) line('  ' + s.label, 'min:' + s.min + ' max:' + s.max + ' step:' + s.step + ' val:' + s.value + ' ' + s.width + ' accent:' + s.accentColor)
    }
    })
  }

  // ─── 7. Contraste WCAG ───────────────────────────────
  section('7. CONTRASTE WCAG AA')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const contrast = await page.evaluate(() => {
      const all = document.querySelectorAll('*')
      const results = []
      for (const el of all) {
        const t = el.textContent.trim()
        if (el.children.length > 0 || !t) continue
        const cs = getComputedStyle(el)
        // Ignora elementos ocultos, script, style, e Vite HMR
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity < 0.1) continue
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue
        if (t.length > 40) continue // Vite chunks/JS são longos
        const bgC = window.__audit.parseColor(cs.backgroundColor)
        const textC = window.__audit.parseColor(cs.color)
        if (bgC && textC) {
          let fg = textC.alpha < 1 ? window.__audit.composite(textC, bgC) : textC
          fg.lum = window.__audit.luminance(fg.r, fg.g, fg.b)
          const ratio = window.__audit._contrast(bgC.lum, fg.lum)
          if (ratio < 4.5) {
            results.push({ text: t.slice(0, 30), fg: cs.color, bg: cs.backgroundColor, ratio: Math.round(ratio * 100) / 100, fs: cs.fontSize })
          }
        }
      }
      return results.slice(0, 10)
    })
    if (contrast.length) {
      line(vv.label, 'FALHAS:')
      for (const c of contrast) line('  "' + c.text + '"', 'ratio:' + c.ratio + ':1 fg:' + c.fg + ' bg:' + c.bg + ' fs:' + c.fs)
    } else {
      line(vv.label, 'Nenhuma falha')
    }
    })
  }

  // ─── 8. Botoes colapsar ──────────────────────────────
  section('8. BOTOES COLAPSAR')
  for (const vv of VIEWS) {
    await scanView(page, vv, async () => {
    const btns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .filter(b => /colapsar|expandir|Ocultar|Mostrar/i.test(b.textContent))
        .slice(0, 4)
        .map(b => {
          const cs = getComputedStyle(b)
          return { text: b.textContent.trim(), fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color, bg: cs.backgroundColor }
        })
    })
    if (btns.length) {
      line(vv.label, '')
      for (const b of btns) line('  "' + b.text + '"', 'fs:' + b.fontSize + ' fw:' + b.fontWeight + ' bg:' + b.bg + ' text:' + b.color)
    }
    })
  }

  // ─── Write ──────────────────────────────────────────
  const outPath = path.resolve(__dirname, '..', 'docs', 'auditoria-design-matrizes.txt')
  fs.writeFileSync(outPath, report.join('\n'), 'utf-8')
  console.log('Relatorio salvo em ' + outPath)

  await browser.close()
  console.log('Done')
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
