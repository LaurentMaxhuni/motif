import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createApp } from '../server.js'

const { server, store } = createApp({ database: ':memory:' })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const errors = [], apiRequests = [], externalRequests = []
let checks = 0
try {
  mkdirSync('output/playwright', { recursive: true })
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
      assert.ok(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily.includes('IBM Plex Sans')), 'real display font selected')
      assert.ok(await page.evaluate(() => document.fonts.check('500 48px "IBM Plex Sans"')), 'display font loaded')
      assert.ok(await page.evaluate(() => document.fonts.check('400 16px "IBM Plex Sans"')), 'body font loaded')
      assert.ok(await page.evaluate(() => [...document.querySelectorAll('.marketing *')].every(el => !getComputedStyle(el).backgroundImage.includes('gradient'))), 'no gradients')
      assert.ok(await page.evaluate(() => [...document.querySelectorAll('.marketing *')].every(el => !/Inter|Space Grotesk|Poppins|Geist/.test(getComputedStyle(el).fontFamily))), 'no banned fonts')
      if (width === 1280 && path === '/') {
        for (const selector of ['h1', '.m-hero-aside p', '.m-hero-aside .m-button']) assert.ok(await page.locator(selector).evaluate(el => el.getBoundingClientRect().bottom < 800), `${selector} below fold`)
      }
      if ([375, 834, 1440].includes(width)) await page.screenshot({ path: `output/playwright/${path === '/' ? 'landing' : 'privacy'}-${width}.png`, fullPage: true })
      checks++
    }
  }
  assert.deepEqual(apiRequests, [], 'public pages must not load the user workspace')
  assert.deepEqual(externalRequests, [], 'public page assets must be self-hosted')
  checks += 2
  await page.goto(base)
  const views = page.getByRole('group', { name: 'Explore the workflow' })
  const brandView = views.getByRole('radio', { name: /Keep your Brand DNA close/ })
  await brandView.focus()
  assert.ok(await page.locator('[data-preview="brand"]').isVisible(), 'brand context visible by default')
  await page.keyboard.press('ArrowRight')
  assert.ok(await page.locator('[data-preview="review"]').isVisible(), 'arrow key switches to creative outputs')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  assert.ok(await page.locator('[data-preview="brief"]').isVisible(), 'arrow key switches to brief')
  await brandView.check()
  assert.ok(await page.locator('[data-preview="brand"]').isVisible(), 'pointer switches back to brand context')
  checks += 4
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(base)
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content')
  assert.equal(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'solid')
  await page.keyboard.press('Enter')
  assert.equal(new URL(page.url()).hash, '#main')
  const primary = page.locator('.m-hero-aside .m-button')
  const resting = await primary.evaluate(el => getComputedStyle(el).backgroundColor)
  await primary.hover()
  await page.waitForTimeout(250)
  assert.notEqual(await primary.evaluate(el => getComputedStyle(el).backgroundColor), resting, 'hover feedback')
  await page.mouse.down()
  assert.notEqual(await primary.evaluate(el => getComputedStyle(el).transform), 'none', 'pressed feedback')
  // Release away from the link so this checks the pressed state without navigating.
  await page.mouse.move(5, 5)
  await page.mouse.up()
  const question = page.locator('summary').first()
  await question.focus()
  await page.keyboard.press('Enter')
  assert.ok(await page.locator('details').first().evaluate(el => el.open), 'keyboard disclosure opens')
  await page.keyboard.press('Enter')
  assert.ok(await page.locator('details').first().evaluate(el => !el.open), 'keyboard disclosure closes')
  checks += 6
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await primary.hover()
  assert.ok(await primary.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) < .001), 'reduced motion')
  await page.screenshot({ path: 'output/playwright/landing-reduced-motion.png', fullPage: true })
  checks++
  await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Privacy policy' }).click()
  await page.getByRole('heading', { name: 'Privacy policy.' }).waitFor()
  await page.getByRole('navigation', { name: 'Privacy contents' }).getByRole('link', { name: 'External services' }).click()
  assert.equal(new URL(page.url()).hash, '#providers')
  await page.getByRole('link', { name: 'Open studio', exact: true }).click()
  await page.getByLabel('Business name', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/app')
  assert.ok(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily.includes('Segoe UI')), 'public typography must not leak into the app')
  checks += 3
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } })
  for (const path of ['/', '/privacy']) {
    const offlinePage = await noScript.newPage()
    await offlinePage.goto(base + path)
    assert.ok(await offlinePage.locator('h1').isVisible(), `${path} readable without JavaScript`)
    if (path === '/') {
      await offlinePage.getByRole('radio', { name: /Revise, save, export/ }).check()
      assert.ok(await offlinePage.locator('[data-preview="review"]').isVisible(), 'walkthrough works without JavaScript')
      await offlinePage.locator('summary').first().click()
      assert.ok(await offlinePage.locator('details').first().evaluate(el => el.open), 'native FAQ without JavaScript')
    }
    await offlinePage.close()
    checks++
  }
  await noScript.close()
  assert.deepEqual(errors, [], 'browser runtime or hydration errors')
  assert.deepEqual(store.all('brand'), [], 'public navigation must not save sample data')
  console.log(`Landing smoke passed: ${checks} checks covering responsive pages, real fonts, local-only assets, focus, hover, active, keyboard disclosures, reduced motion, navigation, workspace entry, and no-JavaScript rendering.`)
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
  store.db.close()
}
