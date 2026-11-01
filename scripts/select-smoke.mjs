import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createApp } from '../server.js'
import { selectChoice } from './browser-helpers.mjs'

mkdirSync('output/playwright',{recursive:true})
const {server,store}=createApp({database:':memory:',seed:true});await new Promise(r=>server.listen(0,'127.0.0.1',r))
const base=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const errors=[]
try{
  for(const width of [390,768,1440]){
    const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base);await page.getByRole('heading',{name:'What will you create next?',exact:true}).waitFor()
    const type=page.getByRole('combobox',{name:'Content type',exact:true})
    assert.equal(await type.evaluate(el=>el.tagName),'BUTTON','Dropdown must use the shadcn custom trigger')
    await type.click();await page.getByRole('listbox').waitFor();await page.screenshot({animations:'disabled',path:`output/playwright/dropdown-${width}.png`})
    await page.getByRole('option',{name:'Ad creative',exact:true}).click();assert.equal(await type.textContent(),'Ad creative');await type.focus();await type.press('ArrowDown');await page.getByRole('listbox').waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');await page.keyboard.press('End');await page.waitForFunction(()=>document.activeElement?.textContent==='Video script');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[aria-label="Content type"]')?.textContent==='Video script')
    await type.click();await page.keyboard.press('Escape');await page.getByRole('listbox').waitFor({state:'hidden'});assert.equal(await type.evaluate(el=>el===document.activeElement),true)
    await type.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));const focus=await type.evaluate(el=>({ring:getComputedStyle(el).getPropertyValue('--tw-ring-shadow'),border:getComputedStyle(el).borderWidth}));assert.equal(focus.border,'1px');assert.match(focus.ring,/2px/,'Keyboard focus should use a slim 2px ring')
    if(width<768)await page.getByRole('button',{name:'Toggle Sidebar',exact:true}).click()
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('heading',{name:'Settings',exact:true}).waitFor()
    const appearance=page.getByRole('combobox',{name:'Appearance',exact:true});await appearance.click();await page.getByRole('option',{name:'Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark')
    await appearance.click();await page.screenshot({animations:'disabled',path:`output/playwright/dropdown-dark-${width}.png`});await page.keyboard.press('Escape')
    async function navigate(name,heading=name){
      if(width<768){
        await page.getByRole('dialog',{name:'Sidebar',exact:true}).waitFor({state:'hidden'})
        await page.getByRole('button',{name:'Toggle Sidebar',exact:true}).click()
        await page.getByRole('dialog',{name:'Sidebar',exact:true}).waitFor()
      }
      const target=page.getByRole('button',{name,exact:true}).first()
      await target.click();await page.getByRole('heading',{name:heading,exact:true}).waitFor()
      if(width<768)await page.getByRole('dialog',{name:'Sidebar',exact:true}).waitFor({state:'hidden'})
    }
    for(const [name,heading] of [['Workspace','Workspace'],['Calendar','Content calendar'],['Brand DNA','Brand DNA'],['Connections','Connections'],['Assistant','Brand assistant'],['Activity','Activity']]){
      await navigate(name,heading);await page.screenshot({animations:'disabled',path:`output/playwright/soft-${name.replaceAll(' ','-')}-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow at ${width}`)
      await page.screenshot({animations:'disabled',path:`output/playwright/soft-${name.replaceAll(' ','-')}-${width}.png`})
      if(name==='Workspace'){
        await page.locator('.preview-button').first().click();await page.getByRole('dialog').waitFor()
        await selectChoice(page,page.getByLabel('Channel',{exact:true}),'LinkedIn')
        await page.getByLabel('Status',{exact:true}).click();await page.getByRole('listbox').waitFor();await page.screenshot({animations:'disabled',path:`output/playwright/soft-editor-select-${width}.png`});assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollTop),0,'Dialog header must stay visible when opening a custom menu');await page.keyboard.press('Escape')
        await page.getByRole('button',{name:'Close',exact:true}).click()
      }
      if(name==='Calendar')await selectChoice(page,page.getByRole('combobox',{name:'Calendar status',exact:true}),'Approved')
      if(name==='Brand DNA'){
        await page.getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('dialog').waitFor()
        await selectChoice(page,page.getByLabel('Page limit',{exact:true}),'20 pages · deep');await page.screenshot({animations:'disabled',path:`output/playwright/soft-research-${width}.png`});await page.getByRole('button',{name:'Close',exact:true}).click()
      }
      if(name==='Connections'){
        await page.getByRole('button',{name:'Connect Buffer',exact:true}).click();await page.getByRole('dialog').waitFor();await page.screenshot({animations:'disabled',path:`output/playwright/soft-connection-form-${width}.png`});await page.getByRole('button',{name:'Close',exact:true}).click()
      }
    }
    await page.getByRole('button',{name:width<640?'Brand':'Add brand',exact:true}).click();await page.getByLabel('Business name',{exact:true}).waitFor();await page.getByRole('button',{name:'Enter Brand DNA myself',exact:true}).click();await page.screenshot({animations:'disabled',path:`output/playwright/soft-onboarding-${width}.png`})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await page.close()
  }
  assert.deepEqual(errors,[]);console.log('Custom dropdown smoke passed: pointer, keyboard, Escape/focus, slim rings, light/dark and 390/768/1440px layouts.')
}finally{await browser.close();await new Promise(r=>server.close(r));store.db.close()}
