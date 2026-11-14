import type { AddressInfo } from 'node:net';
import { selectChoice } from './browser-helpers.ts'
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { createApp } from '../server.ts';
import { templates } from '../lib/core.ts';
import { fixturePNG } from '../test/fixtures.ts';

const site='https://example.com/';
const documents={
  [site+'robots.txt']:'User-agent: *\nDisallow: /account\nSitemap: https://example.com/sitemap.xml',
  [site+'sitemap.xml']:'<urlset><url><loc>https://example.com/about</loc></url><url><loc>https://example.com/services</loc></url></urlset>',
  [site]:'<title>Northline Studio</title><meta property="og:site_name" content="Northline"><meta name="description" content="Brand strategy and thoughtful websites for independent businesses."><meta name="theme-color" content="#b25278"><link rel="stylesheet" href="/brand.css"><h1>A clear direction for independent brands</h1><p>Built for independent businesses who want to communicate clearly.</p><a href="/about">About us</a><a href="/services">Our services</a>',
  [site+'about']:'<title>About Northline</title><h1>A thoughtful approach to your next chapter</h1><p>Our mission is to give independent businesses a clear direction.</p>',
  [site+'services']:'<title>Services · Northline</title><h1>Brand strategy</h1><h2>Website design</h2><p>We help independent businesses tell their story through strategy and considered design.</p>',
  [site+'brand.css']:':root{--brand:#b25278}body{font-family:Georgia,serif;background:#f8f5f9}'
};
const providerCalls=[];
const zernioCalls=[];
let rejectUpload = true;
const savedArtworkUrl = 'https://media.zernio.com/temp/motif-creative.png';
const {server,store}=createApp({database:':memory:',analysisDependencies:{fetchDocument:async url=>{if(!(url in documents))throw Object.assign(new Error('Not found'),{statusCode:404});return{html:documents[url],url};}},connectorFetch:async(url,options)=>{
  if (url.startsWith('https://zernio.com/') || url.startsWith('https://fixture.r2.cloudflarestorage.com/')) {
    zernioCalls.push({ url, method: options.method, body: options.body });
    if (new URL(url).pathname.endsWith('/accounts')) return Response.json({ accounts: [{ _id: 'zernio-facebook', displayName: 'Zernio Northline', platform: 'facebook' }] });
    if (url.endsWith('/media/presign')) return Response.json({ uploadUrl: 'https://fixture.r2.cloudflarestorage.com/motif-creative.png?X-Amz-Signature=fixture', publicUrl: savedArtworkUrl });
    if (options.method === 'PUT') return new Response(null, { status: rejectUpload ? 503 : 200 });
    if (url.endsWith('/posts')) return Response.json({ post: { _id: 'zernio-artwork-draft' } });
    assert.fail('Unexpected Zernio request');
  }
const body=JSON.parse(options.body);providerCalls.push({url,body});return new Response(JSON.stringify(body.query.includes('createPost')?{data:{createPost:{__typename:'PostActionSuccess',post:{id:'fixture-post'}}}}:{data:{channels:[{id:'facebook-1',name:'Northline',displayName:'Northline',service:'facebook',isDisconnected:false,isLocked:false}]}}),{headers:{'Content-Type':'application/json'}});}});
mkdirSync('output/playwright',{recursive:true});await server.listen({port:0,host:'127.0.0.1'});const origin=`http://127.0.0.1:${(server.server.address() as AddressInfo).port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});const page=await context.newPage();const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
const failures=[];
async function navigate(name){
  const button=page.getByRole('button',{name,exact:true});
  if(!await button.isVisible())await page.getByRole('button',{name:'Toggle Sidebar',exact:true}).click();
  await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('dialog',{name:'Sidebar',exact:true}).waitFor({state:'hidden'});
}
async function noOverflow(){if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))failures.push(await page.evaluate(()=>({issue:'page overflows viewport',width:innerWidth,scrollWidth:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth).slice(0,8).map(el=>({tag:el.tagName,text:el.textContent.slice(0,100),className:el.className}))})));}
try{
  await page.goto(origin);
  await page.getByRole('heading',{name:'Make it unmistakably yours.',exact:true}).waitFor();
  const artwork = page.getByRole('img', { name: /Cobalt ceramic mug/ });
  await artwork.evaluate((image: HTMLImageElement) => image.decode());
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getByRole('main').count(), 1);
  await page.screenshot({path:'output/playwright/onboarding-desktop.png',fullPage:true});
  await page.setViewportSize({width:360,height:800});
  await noOverflow();
  await page.screenshot({path:'output/playwright/onboarding-mobile.png',fullPage:true});
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await noOverflow();
  await page.screenshot({path:'output/playwright/onboarding-dark-mobile.png',fullPage:true});
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('link',{name:'How it works',exact:true}).click();
  assert.equal(new URL(page.url()).hash,'#how-motif-works');
  await page.getByRole('link',{name:'Set up my brand',exact:true}).first().click();
  assert.equal(new URL(page.url()).hash,'#brand-setup');
  await page.getByRole('button',{name:'Enter Brand DNA myself',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement?.textContent==='Make this brand your own.');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement?.id==='brand-setup');
  assert.equal(await page.getByLabel('Page limit',{exact:true}).isVisible(),false);
  await page.getByText('Research options',{exact:true}).click();
  await page.getByLabel('Page limit',{exact:true}).waitFor();
  assert.equal(store.all('brand').length,0);
  await page.getByLabel('Business name',{exact:true}).fill('Northline');await page.getByLabel('Public website',{exact:true}).fill(site);await page.getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('heading',{name:'Make this brand your own.',exact:true}).waitFor();assert.equal(store.all('brand').length,0);
  assert.ok(await page.getByLabel('Your story',{exact:true}).inputValue());await page.getByText('Visual Identity',{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Make this my Brand DNA',exact:false}).click();await page.getByRole('heading',{name:'Northline has a home.',exact:true}).waitFor();await page.getByRole('button',{name:'Create my first campaign',exact:false}).click();
  assert.equal(store.all('brand').length,1);assert.equal(store.all('brand')[0].analysis.pages.length,3);assert.equal(store.all('workspace')[0].onboardingCompleted,true);
  await page.getByRole('button',{name:/Theme:/}).click();await page.getByRole('menuitem',{name:'Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');await page.reload();await page.getByRole('heading',{name:'What will you create next?'}).waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.screenshot({path:'output/playwright/studio-dark.png',fullPage:true});
  const fixtureBrand=store.all('brand')[0];for(const item of templates(fixtureBrand,'Social post','Connector fixture',3))store.save('content',{...item,brandId:fixtureBrand.id,status:'Draft',notes:'',scheduledAt:''});await page.reload();await page.getByTestId('content-card').nth(2).waitFor();await page.getByRole('button',{name:/^Edit /}).first().click();await selectChoice(page,page.getByLabel('Status',{exact:true}),'Approved');await selectChoice(page,page.getByLabel('Channel',{exact:true}),'Facebook');const today=new Date();await page.getByLabel('Calendar date & time',{exact:true}).fill(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}T12:00`);await page.screenshot({path:'output/playwright/editor-dark.png',fullPage:true});await page.getByRole('button',{name:'Save creation',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await navigate('Brand DNA');await page.getByRole('button',{name:'Company',exact:true}).click();await page.screenshot({path:'output/playwright/brand-dna-dark.png',fullPage:true});
  await navigate('Connections');await page.getByRole('button',{name:'Connect Buffer',exact:true}).click();await page.getByLabel('API key',{exact:true}).fill('fixture-connector-secret');await page.getByLabel('Organization ID',{exact:true}).fill('fixture-org');await page.getByRole('button',{name:'Save connection',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(providerCalls.length,0);
  await page.getByRole('button',{name:'Test & load channels',exact:true}).click();await page.getByText('1 channel(s) found.',{exact:true}).waitFor();await page.getByRole('button',{name:'Send content',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Send draft to platform',exact:true}).isDisabled(),true);await page.getByRole('checkbox',{name:'I reviewed this saved creation and destination. Send it to this external platform.',exact:true}).check();await page.getByRole('button',{name:'Send draft to platform',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('fixture-post',{exact:false}).waitFor();assert.equal(providerCalls.filter(r=>r.body.query.includes('createPost')).length,1);await page.screenshot({path:'output/playwright/connections-dark.png',fullPage:true});
  await page.getByRole('button',{name:'Send content',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Send draft to platform',exact:true}).isDisabled(),true);await page.getByRole('checkbox',{name:'I reviewed this saved creation and destination. Send it to this external platform.',exact:true}).check();await page.getByRole('button',{name:'Send draft to platform',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(providerCalls.filter(r=>r.body.query.includes('createPost')).length,1);
  await page.getByRole('button',{name:'Send content',exact:true}).click();const approved=store.all('content').find(c=>c.status==='Approved');store.save('content',{...approved,body:'Changed in another tab after review.'},approved.id,approved.version);await page.getByRole('checkbox',{name:'I reviewed this saved creation and destination. Send it to this external platform.',exact:true}).check();await page.getByRole('button',{name:'Send draft to platform',exact:true}).click();await page.getByText('Content or connection changed since review. Reload and review before sending.',{exact:true}).waitFor();assert.equal(providerCalls.filter(r=>r.body.query.includes('createPost')).length,1);await page.getByRole('button',{name:'Close',exact:true}).click();
  const existing = store.get('content', approved.id);
  store.save('content', { ...existing, rendered: 'data:image/png;base64,' + fixturePNG().toString('base64') }, existing.id, existing.version);
  await page.reload();
  await navigate('Connections');
  await page.getByRole('button', { name: 'Connect Zernio', exact: true }).click();
  await page.getByLabel('Connection name', { exact: true }).fill('Zernio fixture');
  await page.getByLabel('API key', { exact: true }).fill('fixture-zernio-secret');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  const zernio = page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: 'Zernio fixture', exact: true }) });
  await zernio.getByRole('button', { name: 'Test & load channels', exact: true }).click();
  await zernio.getByText(/1 channel\(s\)/).waitFor();
  await zernio.getByRole('button', { name: 'Send content', exact: true }).click();
  const sendDialog = page.getByRole('dialog', { name: 'Send to Zernio' });
  const attach = sendDialog.getByRole('checkbox', { name: 'Attach saved artwork' });
  assert.equal(await attach.isChecked(), false);
  await attach.check();
  await sendDialog.getByRole('img', { name: 'Artwork to send' }).waitFor();
  const confirm = sendDialog.getByRole('checkbox', { name: 'I reviewed this saved creation and destination. Send it to this external platform.', exact: true });
  await confirm.check();
  await sendDialog.getByRole('button', { name: 'Send draft to platform' }).click();
  await page.getByText('Could not upload the artwork to Zernio. No draft was sent.', { exact: true }).first().waitFor();
  assert.equal(zernioCalls.some(call => call.url.endsWith('/posts')), false);
  rejectUpload = false;
  await confirm.check();
  await sendDialog.getByRole('button', { name: 'Send draft to platform' }).click();
  await sendDialog.waitFor({ state: 'hidden' });
  await page.getByText('zernio-artwork-draft', { exact: false }).waitFor();
  const posts = zernioCalls.filter(call => call.url.endsWith('/posts'));
  assert.equal(posts.length, 1);
  const payload = JSON.parse(posts[0].body);
  assert.equal(payload.isDraft, true);
  assert.deepEqual(payload.mediaItems, [{ type: 'image', url: savedArtworkUrl }]);
  await page.setViewportSize({width:390,height:844});await noOverflow();await page.screenshot({path:'output/playwright/connections-dark-mobile.png',fullPage:true});
  const toggle=page.getByRole('button',{name:'Toggle Sidebar',exact:true});await toggle.click();const sheet=page.getByRole('dialog',{name:'Sidebar',exact:true});await sheet.waitFor();assert.ok(await sheet.evaluate(el=>el.contains(document.activeElement)),'mobile sidebar receives focus');await page.keyboard.press('Tab');assert.ok(await sheet.evaluate(el=>el.contains(document.activeElement)),'Tab stays inside sidebar');await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Toggle Sidebar',null,{timeout:3000}).catch(async()=>failures.push('Sidebar Escape fails to restore focus: '+await page.evaluate(()=>document.activeElement?.outerHTML)));
  await navigate('Brand DNA');await noOverflow();await page.screenshot({path:'output/playwright/brand-dna-dark-mobile.png',fullPage:true});
  assert.ok(!JSON.stringify(await page.evaluate(()=>({...localStorage}))).includes('fixture-connector-secret'));
  await page.getByRole('button',{name:/Theme:/}).click();await page.getByRole('menuitem',{name:'System',exact:true}).click();await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await navigate('Calendar');await page.getByRole('heading',{name:'Content calendar',exact:true}).waitFor();await page.getByRole('tab',{name:'Month',exact:true}).click();await page.getByRole('grid').waitFor();await noOverflow();await page.screenshot({path:'output/playwright/calendar-month-mobile.png',fullPage:true});await page.getByRole('tab',{name:'Agenda',exact:true}).click();await page.getByText(approved.title,{exact:true}).waitFor();await noOverflow();await page.screenshot({path:'output/playwright/calendar-agenda-mobile.png',fullPage:true});
  const first=store.all('brand')[0];const secondReport=structuredClone(first.analysis);secondReport.pages[0].title='Second business source';const second=store.save('brand',{...first,name:'Second business',analysis:secondReport});await page.reload();await navigate('Brand DNA');await page.getByRole('button',{name:'Toggle Sidebar',exact:true}).click();await selectChoice(page,page.getByRole('combobox',{name:'Active brand',exact:true}),'Second business');await page.getByRole('dialog',{name:'Sidebar',exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByLabel('Business name',{exact:true}).inputValue(),'Second business');const reportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Full report',exact:false}).click();const reportFile=await reportDownload;await reportFile.saveAs('output/playwright/second-brand-report.json');assert.equal(JSON.parse(readFileSync('output/playwright/second-brand-report.json','utf8')).pages[0].title,'Second business source');
  writeFileSync('output/playwright/features-diagnostics.json',JSON.stringify({failures,errors,external},null,2));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failures,[]);
  writeFileSync('output/playwright/features-result.json',JSON.stringify({passed:true,checks:['fresh onboarding','multi-page extraction','review before save','persisted report','first campaign','dark mode persistence','system theme response','dark editor','connector credentials local','explicit test request','explicit draft send','duplicate suppression','stale review refused','Zernio artwork upload failure and retry','mobile connectors','mobile report','report download brand isolation','mobile Sheet keyboard focus and Escape','mobile calendar month','mobile calendar agenda','no browser errors','no external browser calls'],errors,external,providerMutations:providerCalls.filter(r=>r.body.query.includes('createPost')).length},null,2));console.log('Feature browser smoke passed: 22 checks; provider writes used fixtures only.');
}finally{await browser.close();await server.close();}
