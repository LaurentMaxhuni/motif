import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { existsSync } from 'node:fs';
import { designDocument } from './design.ts';

let pending: Promise<unknown>=Promise.resolve();
export function renderDesign(...[item,brand]: Parameters<typeof designDocument>){
  // Bound browser memory when multiple generation requests finish together.
  const job=pending.then(async()=>{
    const executablePath=process.env.CHROME_PATH||[
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      '/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ].find(existsSync);
    let browser: Browser | undefined;
    try{
      const document=designDocument(item,brand);
      browser=await chromium.launch({headless:true,executablePath,timeout:15000});
      const context=await browser.newContext({viewport:{width:1080,height:1080},deviceScaleFactor:1,javaScriptEnabled:false,serviceWorkers:'block',acceptDownloads:false,reducedMotion:'reduce'});
      await context.route('**/*',route=>route.abort());
      const page=await context.newPage();
      page.setDefaultTimeout(10000);
      await page.setContent(document,{waitUntil:'load',timeout:10000});
      const imageOK=await page.locator('img').evaluateAll<boolean, HTMLImageElement>(images=>images.length>0&&images.every(img=>img.complete&&img.naturalWidth>0));
      if(!imageOK)throw new Error('Generated artwork could not be decoded.');
      const png=await page.screenshot({type:'png',timeout:10000});
      if(png.length>5_000_000)throw new Error('Rendered composition exceeds 5 MB.');
      return {rendered:`data:image/png;base64,${png.toString('base64')}`,document};
    }catch(error){throw Object.assign(new Error(`Local composition render failed: ${error.message}. Check Chrome installation or CHROME_PATH.`),{status:422});}
    finally{await browser?.close();}
  });
  pending=job.catch(()=>{});
  return job;
}
