import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.ts';
import { defaultSettings } from '../lib/core.ts';
import { selectChoice } from './browser-helpers.ts';

const {server,store}=createApp({database:':memory:',seed:true,analysisDependencies:{fetchDocument:async url=>{
  if(/robots\.txt|sitemap\.xml/.test(url))throw Object.assign(new Error('Missing'),{statusCode:404});
  return {url,html:'<title>Morrow</title><main><h1>Everyday objects</h1><p>We build practical everyday objects with care for independent people.</p></main>'};
}}});
const executable=fileURLToPath(new URL('../test/fixtures/cli-provider.ts',import.meta.url));
const ids=['codex','claude','opencode','pi','omp'],names=['Codex','Claude Code','OpenCode','Pi','OMP'];
store.save('settings',{...defaultSettings,cliProfiles:Object.fromEntries(ids.map(id=>[id,{executable,model:'fixture/'+id}]))});
await server.listen({port:0,host:'127.0.0.1'});const base=`http://127.0.0.1:${(server.server.address() as AddressInfo).port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],external=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url())});
page.setDefaultTimeout(12000);mkdirSync('output/playwright',{recursive:true});
try{
  await page.goto(base);await page.getByRole('button',{name:'Settings',exact:true}).click();
  for(let i=0;i<ids.length;i++){
    await selectChoice(page,page.getByLabel('Text AI provider',{exact:true}),names[i]+' CLI');
    assert.equal(await page.getByLabel('CLI model override').inputValue(),'fixture/'+ids[i]);
    assert.equal(await page.getByLabel('CLI executable path').inputValue(),executable);
    assert.equal(await page.locator('#text-endpoint').count(),0);assert.equal(await page.locator('#image-endpoint').count(),1);
  }checks.push('five provider dropdown choices and separate retained profiles');
  await selectChoice(page,page.getByLabel('Text AI provider',{exact:true}),'Claude Code CLI');
  await page.getByText('which may be a cloud service.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Detect installed CLIs',exact:true}).click();await page.getByRole('list',{name:'CLI installations'}).waitFor();assert.equal(await page.getByRole('list',{name:'CLI installations'}).getByRole('listitem').count(),5);
  assert.equal(store.all('settings')[0].textProvider,undefined);checks.push('installation detection without saving or model calls');
  await page.getByRole('button',{name:'Test selected CLI',exact:true}).click();await page.getByText('Claude Code · fixture/claude: test reply received.',{exact:true}).waitFor();assert.equal(store.all('settings')[0].textProvider,undefined);checks.push('explicit CLI test without saving');
  await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByText('AI provider settings saved.',{exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Text AI provider').waitFor();assert.match(await page.getByLabel('Text AI provider').innerText(),/Claude Code/);checks.push('provider persisted through reload');
  await page.getByRole('button',{name:'Assistant',exact:true}).click();await page.locator('#assistant-message').fill('Suggest a launch');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByRole('log').getByText('A thoughtful campaign for your brand.',{exact:true}).waitFor();checks.push('assistant uses CLI with no local text model');
  await page.getByRole('button',{name:'Brand DNA',exact:true}).click();await page.getByRole('button',{name:'Analyze website',exact:true}).click();
  await page.getByLabel('Public website',{exact:true}).fill('https://fixture.example/');assert.equal(await page.getByRole('checkbox',{name:'Interpret findings with my AI provider'}).isChecked(),true);checks.push('research interpretation enabled for CLI');
  await page.getByRole('dialog').getByRole('button',{name:'Analyze website',exact:true}).click();await page.getByRole('heading',{name:'Review researched Brand DNA',exact:true}).waitFor();await page.getByText('AI interpretation + evidence',{exact:false}).waitFor();assert.equal(store.all('brand')[0].analysis,undefined);await page.getByRole('button',{name:'Discard research',exact:true}).click();checks.push('CLI research retains review before saving');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('CLI model override').fill('fixture/failure');await page.getByRole('button',{name:'Test selected CLI',exact:true}).click();await page.getByRole('alert').filter({hasText:'CLI exited unsuccessfully'}).waitFor();assert.equal(store.all('settings')[0].cliProfiles.claude.model,'fixture/claude');checks.push('failed CLI test preserves saved configuration');
  await page.getByLabel('CLI model override').fill('fixture/claude');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`output/playwright/cli-settings-${width}.png`,fullPage:true})}checks.push('responsive CLI settings at three widths');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('no browser errors or external requests');
  writeFileSync('output/playwright/cli-result.json',JSON.stringify({checks},null,2));console.log(`CLI browser smoke passed: ${checks.length} checks.`);
}finally{await browser.close();await server.close()}
