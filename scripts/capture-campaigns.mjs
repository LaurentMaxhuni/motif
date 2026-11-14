import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { renderDesign } from '../lib/render.ts'
import { createApp } from '../server.ts'
import { brandInput, contentInput } from '../lib/core.ts'
import { campaignBrand, campaigns } from '../src/marketing/campaigns.mjs'

const folder = 'src/marketing/assets'
mkdirSync('output/campaigns', { recursive: true })
const renderedCampaigns = []
const image = `data:image/jpeg;base64,${readFileSync(`${folder}/campaign-art.jpg`).toString('base64')}`
const { server, store } = createApp({ database: ':memory:' })
const brand = store.save('brand', brandInput(campaignBrand))
store.save('workspace', { onboardingCompleted: true })
for (const [index, campaign] of campaigns.entries()) {
  const item = { ...campaign, brandId: brand.id, image, status: 'Draft', body: 'An original creative for Motif’s own brand.', source: 'Motif campaign study', layout: 0, color: campaignBrand.colors[0] }
  const result = await renderDesign(item, brand)
  const rendered = result.rendered
  writeFileSync(`output/campaigns/campaign-${index + 1}.png`, Buffer.from(rendered.split(',')[1], 'base64'))
  renderedCampaigns.push(rendered)
  store.save('content', contentInput({ ...item, rendered }, [brand.id]))
}
const base = await server.listen({ port: 0, host: '127.0.0.1' })
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const artwork = await browser.newPage({ viewport: { width: 640, height: 640 } })
  for (const [index, rendered] of renderedCampaigns.entries()) {
    await artwork.setViewportSize({ width: 1080, height: 1080 })
    await artwork.setContent(`<style>body{margin:0}img{display:block;width:1080px;height:1080px}</style><img src="${rendered}">`)
    await artwork.locator('img').evaluate(img => img.decode())
    await artwork.screenshot({ path: `${folder}/campaign-${index + 1}-large.jpg`, type: 'jpeg', quality: 90 })
    await artwork.setViewportSize({ width: 640, height: 640 })
    await artwork.setContent(`<style>body{margin:0}img{display:block;width:640px;height:640px}</style><img src="${rendered}">`)
    await artwork.locator('img').evaluate(img => img.decode())
    await artwork.screenshot({ path: `${folder}/campaign-${index + 1}.jpg`, type: 'jpeg', quality: 90 })
  }
  await artwork.close()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  await page.addInitScript(() => localStorage.setItem('motif-theme', 'dark'))
  await page.goto(base + '/app')
  await page.getByRole('heading', { name: 'New creative' }).waitFor()
  await page.locator('[data-sidebar="menu-button"]').filter({ hasText: /^Workspace$/ }).click()
  await page.getByRole('heading', { name: 'Workspace', exact: true }).waitFor()
  await page.screenshot({ path: `${folder}/workspace-dark.jpg`, type: 'jpeg', quality: 90 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${folder}/workspace-phone.jpg`, type: 'jpeg', quality: 92 })
  console.log('Rendered three original Motif campaigns with renderDesign and captured the real desktop and phone workspace. Only isolated in-memory data was used.')
} finally {
  await browser.close()
  await server.close()
}
