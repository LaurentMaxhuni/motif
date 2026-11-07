import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { createApp } from '../server.js'

// Only synthetic, in-memory example data can enter the public product captures.
const { server, store } = createApp({ database: ':memory:', seed: true })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  mkdirSync('src/marketing/assets', { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1.5 })
  await page.addInitScript(() => localStorage.setItem('motif-theme', 'light'))
  await page.goto(`http://127.0.0.1:${server.address().port}${process.argv.includes('--before') ? '/' : '/app'}`)
  await page.getByRole('heading', { name: 'What will you create next?' }).waitFor()
  await page.locator('[data-sidebar="menu-button"]').filter({ hasText: /^Workspace$/ }).click()
  await page.getByRole('heading', { name: 'Workspace', exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  const grid = await page.locator('#main .grid.gap-5').boundingBox()
  const card = await page.locator('#main .grid.gap-5 > *').first().boundingBox()
  const preview = await page.locator('#main .preview-button').first().boundingBox()
  if (!grid || !card || !preview) throw new Error('Example creative grid could not be captured.')
  await page.screenshot({ path: 'src/marketing/assets/creatives.png', clip: { ...grid, height: preview.height } })
  await page.locator('#main .grid.gap-5 > *').first().screenshot({ path: 'src/marketing/assets/creative-mobile.png' })
  await page.getByRole('button', { name: 'Brand DNA', exact: true }).click()
  await page.getByLabel('Brand voice', { exact: true }).waitFor()
  await page.screenshot({ path: 'src/marketing/assets/brand.png' })
  await page.setViewportSize({ width: 390, height: 1100 })
  await page.locator('#main form').first().screenshot({ path: 'src/marketing/assets/brand-mobile.png' })
  console.log('Captured workspace and Brand DNA using isolated example data (Playwright fallback; Hallmark capture requires unavailable Puppeteer).')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
  store.db.close()
}
