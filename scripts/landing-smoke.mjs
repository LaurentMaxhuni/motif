import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { createApp } from '../server.ts'

const { server, store } = createApp({ database: ':memory:' })
const base = await server.listen({ port: 0, host: '127.0.0.1' })
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const errors = [], apiRequests = [], externalRequests = []
let checks = 0
try {
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
    if (!request.url().startsWith(base)) externalRequests.push(request.url())
  })
  for (const width of [320, 375, 834, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 })
    for (const path of ['/', '/privacy']) {
      await page.goto(base + path)
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => Promise.all([...document.images].map(async img => { img.loading = 'eager'; await img.decode() })))
      await page.locator('h1').waitFor()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow at ${width}`)
      assert.ok(await page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0)), `${path} broken image at ${width}`)
      assert.ok(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily.includes('Instrument Sans')), 'display font selected')
      for (const weight of [400, 500]) assert.ok(await page.evaluate(w => document.fonts.check(`${w} 16px "Instrument Sans"`), weight), 'self-hosted font loaded')
      if (width === 1280 && path === '/') {
        for (const selector of ['h1', '.hero__lead', '#hero .btn--primary']) assert.ok(await page.locator(selector).evaluate(el => el.getBoundingClientRect().bottom < 800), `${selector} below fold`)
      }
      checks++
    }
  }
  assert.deepEqual(apiRequests, [], 'public pages must not load the user workspace')
  assert.deepEqual(externalRequests, [], 'public page assets must be self-hosted')
  checks += 2
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base)
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1')
  const toggle = page.getByRole('button', { name: 'Toggle navigation' })
  await toggle.click()
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
  await page.keyboard.press('Escape')
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
  assert.ok(await toggle.evaluate(el => el === document.activeElement))
  await page.keyboard.press('Enter')
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Workflow', exact: true }).click()
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
  assert.equal(new URL(page.url()).hash, '#workflow')
  checks += 5
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(base)
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content')
  assert.equal(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'solid')
  await page.keyboard.press('Enter')
  assert.equal(new URL(page.url()).hash, '#main')
  const primary = page.locator('#hero .btn--primary')
  await primary.hover()
  await page.waitForTimeout(250)
  assert.notEqual(await primary.evaluate(el => getComputedStyle(el).transform), 'none', 'hover feedback')
  await page.mouse.down()
  assert.notEqual(await primary.evaluate(el => getComputedStyle(el).transform), 'none', 'pressed feedback')
  await page.mouse.move(5, 5)
  await page.mouse.up()
  checks += 4
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await primary.hover()
  assert.equal(await primary.evaluate(el => getComputedStyle(el).transform), 'none', 'reduced motion stops movement')
  checks++
  await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Privacy policy' }).click()
  await page.getByRole('heading', { name: 'Privacy policy.' }).waitFor()
  await page.getByRole('navigation', { name: 'Privacy contents' }).getByRole('link', { name: 'External services' }).click()
  assert.equal(new URL(page.url()).hash, '#providers')
  await page.locator('header').getByRole('link', { name: 'Try Motif', exact: true }).click()
  await page.getByLabel('Business name', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/app')
  const welcome = page.getByRole('heading', { name: 'Posts and ads that look like you made them.', exact: true })
  assert.ok(await welcome.evaluate(el => getComputedStyle(el).fontFamily.includes('Bricolage Grotesque')), 'onboarding display font loaded')
  assert.ok(await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.every(el => !el.href.includes('Marketing-'))), 'public stylesheet must not load in app')
  checks += 4
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } })
  for (const path of ['/', '/privacy']) {
    const offlinePage = await noScript.newPage()
    await offlinePage.goto(base + path)
    assert.ok(await offlinePage.locator('h1').isVisible(), `${path} readable without JavaScript`)
    if (path === '/') assert.ok(await offlinePage.getByText('Node.js 22.13+ and Chrome, Chromium, or Edge.', { exact: true }).isVisible(), 'setup requirements available without scripts')
    await offlinePage.close()
    checks++
  }
  await noScript.close()
  assert.deepEqual(errors, [], 'browser runtime or hydration errors')
  assert.deepEqual(store.all('brand'), [], 'public navigation must not save sample data')
  console.log(`Landing smoke passed: ${checks} checks covering responsive pages, local fonts/assets, menu keyboard and pointer interaction, focus, hover, reduced motion, privacy navigation, app CSS isolation, and no-JavaScript rendering.`)
} finally {
  await browser.close()
  await server.close()
}
