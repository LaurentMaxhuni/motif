import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs'
import { createApp } from '../server.ts'
const site='https://brand.example/'
const schema={'@context':'https://schema.org','@graph':[{'@type':'WebSite',name:'Morrow',url:site},{'@type':'ProductGroup',name:'Linen overshirt',description:'A breathable everyday layer.',hasVariant:[{'@type':'Product',name:'Linen overshirt size M'},{'@type':'Product',name:'Linen overshirt size L'}]}]}
const docs={
 [site+'robots.txt']:'User-agent: *\nDisallow: /account\nSitemap: '+site+'sitemap.xml',
 [site+'sitemap.xml']:`<sitemapindex><sitemap><loc>${site}pages.xml</loc></sitemap></sitemapindex>`,
 [site+'pages.xml']:`<urlset><url><loc>${site}about</loc></url><url><loc>${site}products/overshirt</loc></url></urlset>`,
 [site]:`<html lang="en"><head><title>Morrow</title><meta name="description" content="Everyday clothing, made with care."><script type="application/ld+json">${JSON.stringify(schema)}</script><style>:root{--brand:#6d28d9;--accent:hsl(180 100% 25%)}</style></head><body><nav><h2>Added to Cart</h2></nav><main><header><h1>Make room for the everyday.</h1></header><p>Built for independent people who value comfortable, lasting clothes.</p><a href="/about">Our story</a></main><div role="dialog"><h2>Accept cookies</h2></div></body></html>`,
 [site+'about']:'<title>About Morrow</title><main><h1>Our story</h1><p>We make practical clothing with thoughtful details for everyday routines.</p></main>',
 [site+'products/overshirt']:`<title>Linen overshirt | Morrow</title><script type="application/ld+json">${JSON.stringify(schema['@graph'][1])}</script><main><h1>Linen overshirt</h1><p>A breathable everyday layer that gets better with wear.</p></main>`,
}
let blocked=false,requestStarted
const started=new Promise(r=>requestStarted=r)
const {server,store}=createApp({database:':memory:',analysisDependencies:{fetchDocument:async(url,_redirects,options)=>{
 if(!(url in docs))throw Object.assign(new Error('Missing'),{statusCode:404})
 if(blocked&&url===site){requestStarted();await new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});if(options.signal.aborted)reject(options.signal.reason)})}
 return{html:docs[url],url}
}}})
await server.listen({port:0,host:'127.0.0.1'});const base=`http://127.0.0.1:${(server.server.address() as AddressInfo).port}`
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});page.setDefaultTimeout(15000)
const errors=[],external=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url())})
mkdirSync('output/playwright',{recursive:true})
try{
 await page.goto(base);await page.getByLabel('Public website',{exact:true}).fill(site);await page.getByRole('button',{name:'Analyze website',exact:true}).click()
 await page.getByRole('heading',{name:'Make this brand your own.',exact:true}).waitFor();assert.equal(store.all('brand').length,0);checks.push('no automatic save')
 assert.equal(await page.getByLabel('Business name',{exact:true}).inputValue(),'Morrow');assert.equal(await page.getByLabel('Products & services',{exact:true}).inputValue(),'Linen overshirt');assert.equal(await page.getByLabel('Brand voice',{exact:true}).inputValue(),'');checks.push('nested product group and honest voice')
 assert.match(await page.getByLabel('Your audience',{exact:true}).inputValue(),/Built for independent people/);checks.push('source-backed audience')
 await page.getByLabel('Your story',{exact:true}).fill('Reviewed clothing story.');await page.getByRole('button',{name:'Make this my Brand DNA',exact:true}).click();await page.getByRole('heading',{name:'Morrow has a home.',exact:true}).waitFor()
 assert.equal(store.all('brand').length,1);let brand=store.all('brand')[0];assert.equal(brand.description,'Reviewed clothing story.');assert.equal(brand.colors[0],'#6d28d9');assert.equal(brand.analysis.pages.length,3);assert.ok(!/Added to Cart|Accept cookies/.test(brand.product));checks.push('reviewed fields and full report persist')
 await page.getByRole('button',{name:'Create my first campaign',exact:true}).click();await page.getByRole('button',{name:'Brand DNA',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Brand DNA',exact:true}).click();assert.equal(await page.getByLabel('Your story',{exact:true}).inputValue(),'Reviewed clothing story.');checks.push('saved research survives reload')
 const reportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Full report',exact:false}).click();await(await reportDownload).saveAs('output/playwright/brand-quality-report.json');assert.equal(JSON.parse(readFileSync('output/playwright/brand-quality-report.json','utf8')).pages.length,3);checks.push('complete report download')
 await page.getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('heading',{name:'Review researched Brand DNA',exact:true}).waitFor();assert.equal(store.get('brand',brand.id).description,'Reviewed clothing story.');await page.getByRole('button',{name:'Discard research',exact:true}).click();checks.push('discard preserves existing Brand DNA')
 await page.getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('heading',{name:'Review researched Brand DNA',exact:true}).waitFor()
 brand=store.get('brand',brand.id);store.save('brand',{...brand,voice:'Edited in another window'},brand.id,brand.version);await page.getByRole('button',{name:'Apply reviewed Brand DNA',exact:true}).click();await page.getByRole('dialog').getByRole('alert').filter({hasText:'changed in another window'}).waitFor();assert.equal(store.get('brand',brand.id).voice,'Edited in another window');await page.getByRole('button',{name:'Discard research',exact:true}).click();checks.push('stale review cannot overwrite newer data')
 blocked=true;await page.getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Analyze website',exact:true}).click();await started;await page.getByRole('button',{name:'Cancel analysis',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Analyze website',exact:true}).waitFor();assert.equal(store.all('brand').length,1);assert.equal(store.get('brand',brand.id).voice,'Edited in another window');checks.push('cancel aborts without saving')
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('no browser errors or external browser calls')
 writeFileSync('output/playwright/brand-quality-result.json',JSON.stringify({passed:true,checks,errors,external},null,2));console.log(`Brand research browser smoke passed: ${checks.length} checks.`)
}finally{await browser.close();await server.close()}
