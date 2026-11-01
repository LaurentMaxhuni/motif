import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { createApp } from '../server.js'

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const {server,store}=createApp({database:':memory:',seed:true});store.save('workspace',{onboardingCompleted:false})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000)
try{
  await page.goto(base);await page.getByLabel('Business name',{exact:true}).fill('Abandoned brand')
  await page.getByRole('button',{name:'Add brand',exact:true}).click();assert.equal(await page.getByLabel('Business name',{exact:true}).inputValue(),'','Add brand must reset mounted onboarding')
  let releaseStudio;const intercepted=new Promise(resolve=>{void page.route('**/assets/Studio-*.js',async route=>{await new Promise(r=>{releaseStudio=r;resolve()});await route.continue()})})
  await page.getByRole('button',{name:'Calendar',exact:true}).click();await page.getByRole('heading',{name:'Content calendar',exact:true}).waitFor()
  await page.getByRole('button',{name:'Plan my week',exact:true}).click();await intercepted;releaseStudio();await page.getByRole('dialog').getByText('A week, with a little intention.',{exact:true}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.getByRole('button',{name:'Brand DNA',exact:true}).click();await page.getByLabel('Brand voice',{exact:true}).fill('Saved while navigating away')
  let releaseBrand,brandHeld;const held=new Promise(r=>brandHeld=r);await page.route('**/api/brands/*',async route=>{await new Promise(r=>{releaseBrand=r;brandHeld()});await route.continue()})
  await page.getByRole('button',{name:'Save Brand DNA',exact:true}).click();await held;await page.getByRole('button',{name:'Workspace',exact:true}).click()
  await page.getByRole('button',{name:'Brand DNA',exact:true}).click()
  const refreshed=page.waitForResponse(r=>r.url().endsWith('/api/state'));releaseBrand();await refreshed;await page.unroute('**/api/brands/*')
  await page.waitForFunction(()=>document.querySelector('[name=voice]')?.value==='Saved while navigating away')
  await page.getByLabel('Brand voice',{exact:true}).fill('Pending brand version')
  let releaseDirty,dirtyHeld;const heldDirty=new Promise(r=>dirtyHeld=r);await page.route('**/api/brands/*',async route=>{await new Promise(r=>{releaseDirty=r;dirtyHeld()});await route.continue()})
  await page.getByRole('button',{name:'Save Brand DNA',exact:true}).click();await heldDirty;await page.getByRole('button',{name:'Workspace',exact:true}).click();await page.getByRole('button',{name:'Brand DNA',exact:true}).click()
  await page.getByLabel('Brand voice',{exact:true}).fill('New unsaved edits')
  const dirtyRefreshed=page.waitForResponse(r=>r.url().endsWith('/api/state'));releaseDirty();await dirtyRefreshed;await page.unroute('**/api/brands/*')
  await page.getByRole('button',{name:'Load saved version',exact:true}).waitFor();assert.equal(await page.getByLabel('Brand voice',{exact:true}).inputValue(),'New unsaved edits')
  await page.getByRole('button',{name:'Load saved version',exact:true}).click();assert.equal(await page.getByLabel('Brand voice',{exact:true}).inputValue(),'Pending brand version')
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#text-model').fill('saved-after-navigation')
  let releaseSettings,settingsHeld;const heldSettings=new Promise(r=>settingsHeld=r);await page.route('**/api/settings',async route=>{await new Promise(r=>{releaseSettings=r;settingsHeld()});await route.continue()})
  await page.getByRole('button',{name:'Save settings',exact:true}).click();await heldSettings;await page.getByRole('button',{name:'Workspace',exact:true}).click()
  await page.getByRole('button',{name:'Settings',exact:true}).click()
  const settingsRefreshed=page.waitForResponse(r=>r.url().endsWith('/api/state'));releaseSettings();await settingsRefreshed;await page.unroute('**/api/settings')
  await page.waitForFunction(()=>document.querySelector('#text-model')?.value==='saved-after-navigation')
  await page.getByRole('button',{name:'Add brand',exact:true}).click();await page.getByLabel('Business name',{exact:true}).fill('Pending saved brand');await page.getByRole('button',{name:'Enter Brand DNA myself',exact:true}).click()
  let releaseOnboarding,onboardingHeld;const heldOnboarding=new Promise(r=>onboardingHeld=r);await page.route('**/api/brands',async route=>{await new Promise(r=>{releaseOnboarding=r;onboardingHeld()});await route.continue()})
  await page.getByRole('button',{name:'Make this my Brand DNA',exact:true}).click();await heldOnboarding
  await page.getByRole('button',{name:'Add brand',exact:true}).click();await page.getByLabel('Business name',{exact:true}).fill('Newer unsaved brand')
  const onboardingRefreshed=page.waitForResponse(r=>r.url().endsWith('/api/state'));releaseOnboarding();await onboardingRefreshed;await page.unroute('**/api/brands')
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('motif-onboarding')).draft.name),'Newer unsaved brand')
  console.log('Navigation smoke passed: 6 checks for fresh onboarding, cold lazy planning, late saves, preserved dirty edits, and onboarding session isolation.')
}finally{await browser.close();await new Promise(r=>server.close(r));store.db.close()}
