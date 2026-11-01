import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server.js';
import {defaultSettings} from '../lib/core.js';
import {fixturePNG} from '../test/fixtures.js';
import {selectChoice} from './browser-helpers.mjs';

const png=fixturePNG().toString('base64'),calls=[],checks=[];let limited=false;
const {server,store}=createApp({database:':memory:',seed:true,imageFetch:async(url,options)=>{
  calls.push({url,options});const body=url.endsWith('/models')?{data:[{id:'studio-image'}]}:url.startsWith('https://api.cloudflare.com/')?{success:true,result:{image:png}}:{data:[{b64_json:png}]};
  return new Response(JSON.stringify(limited?{error:'fixture-private-token'}:body),{status:limited?429:200,headers:{'Content-Type':'application/json'}});
}});
store.save('settings',{...defaultSettings,textProvider:'claude',cliProfiles:{claude:{executable:fileURLToPath(new URL('../test/fixtures/cli-provider.mjs',import.meta.url)),model:'fixture/claude'}}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],external=[];page.setDefaultTimeout(15000);
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url())});
mkdirSync('output/playwright',{recursive:true});
const choose=label=>selectChoice(page,page.getByLabel('Image AI provider',{exact:true}),label);
async function save(){await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByRole('button',{name:'Save settings',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('button[type=submit]')?.disabled);await page.getByText('AI provider settings saved.',{exact:true}).last().waitFor()}
async function test(){await page.getByRole('button',{name:'Generate test image',exact:true}).click();await page.getByAltText('Image provider test result').waitFor();assert.ok(await page.getByAltText('Image provider test result').evaluate(image=>image.complete&&image.naturalWidth>0))}
try{
  await page.goto(base);await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await page.locator('#image-endpoint').inputValue(),defaultSettings.imageEndpoint);checks.push('legacy custom local URL preserved');
  await choose('Cloudflare Workers AI');await page.getByLabel('Cloudflare account ID').fill('a'.repeat(32));await page.getByLabel('Cloudflare API token').fill('fixture-cloud-token');
  assert.equal(await page.locator('#image-model').count(),0);await test();assert.equal(store.all('settings')[0].imageProvider,undefined);assert.equal(store.all('content').length,4);checks.push('Cloudflare preview without saving settings or creations');
  await save();assert.equal(store.all('settings')[0].imageProvider,'cloudflare');assert.equal(await page.getByLabel('Cloudflare API token').inputValue(),'');assert.ok(!JSON.stringify(store.all('settings')).includes('fixture-cloud-token'));checks.push('secret saved separately and cleared from form');
  await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();assert.match(await page.getByLabel('Image AI provider').innerText(),/Cloudflare/);await test();checks.push('saved token reused after reload');
  await page.getByRole('button',{name:'Creative studio',exact:true}).click();await selectChoice(page,page.getByLabel('Number of variations',{exact:true}),'1 variation');await page.getByRole('button',{name:'Create content',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('CLI campaign'));assert.equal(store.all('content').length,5);assert.match(store.all('content')[0].source,/Cloudflare FLUX/);checks.push('full creative generation uses Cloudflare with blank local image model');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await choose('Unsloth Studio');assert.equal(await page.locator('#unsloth-image-endpoint').inputValue(),'http://127.0.0.1:8888/v1');await page.getByLabel('Unsloth API key').fill('fixture-studio-token');
  await page.getByRole('button',{name:'Detect image models',exact:true}).click();await page.getByLabel('Detected models',{exact:true}).waitFor();await selectChoice(page,page.getByLabel('Detected models',{exact:true}),'studio-image');assert.equal(calls.at(-1).options.headers.Authorization,'Bearer fixture-studio-token');await test();assert.equal(calls.at(-1).url,'http://127.0.0.1:8888/v1/images/generations');checks.push('authenticated Unsloth discovery and image preview');await save();
  await choose('Custom local URL');assert.equal(await page.locator('#image-endpoint').inputValue(),defaultSettings.imageEndpoint);await page.locator('#image-model').fill('custom-image');await test();assert.equal(calls.at(-1).options.headers.Authorization,undefined);checks.push('custom local image provider has independent credentials');
  const callCount=calls.length;await page.locator('#image-endpoint').fill('https://outside.example/v1');await page.getByRole('button',{name:'Generate test image',exact:true}).click();await page.getByRole('alert').filter({hasText:'localhost'}).waitFor();assert.equal(calls.length,callCount);checks.push('custom local URL rejects hosted endpoints before sending credentials');
  await page.locator('#image-endpoint').fill(defaultSettings.imageEndpoint);await choose('Cloudflare Workers AI');limited=true;await page.getByRole('button',{name:'Generate test image',exact:true}).click();await page.getByRole('alert').filter({hasText:'quota or rate limit'}).waitFor();assert.equal(store.all('settings')[0].imageProvider,'unsloth');assert.equal(await page.getByAltText('Image provider test result').count(),0);limited=false;checks.push('quota errors preserve saved provider and show no fallback image');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`output/playwright/image-providers-${width}.png`,fullPage:true})}checks.push('responsive settings at three widths');
  await page.getByRole('button',{name:'Remove saved key',exact:true}).click();await save();const state=await(await fetch(base+'/api/state')).json();assert.equal(state.imageCredentials.cloudflare,false);assert.equal(state.imageCredentials.unsloth,true);checks.push('explicit key removal preserves other provider key');
  const backup=await(await fetch(base+'/api/export')).json();assert.ok(!JSON.stringify(backup).includes('fixture-cloud-token'));assert.ok(!JSON.stringify(backup).includes('fixture-studio-token'));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('no secret export, browser errors or external browser traffic');
  writeFileSync('output/playwright/image-provider-result.json',JSON.stringify({checks},null,2));console.log(`Image provider browser smoke passed: ${checks.length} checks.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));store.db.close()}

