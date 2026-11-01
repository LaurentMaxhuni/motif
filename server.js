import http from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID,randomBytes } from 'node:crypto';
import { openStore, defaultSettings, fail, text, brandInput, contentInput, settingsInput, localRequest, completion, generate, publicDocument, extractBrand } from './lib/core.js';
import { generateImage, revise } from './lib/core.js';
import { renderDesign } from './lib/render.js';
import { brandContext } from './lib/brand-data.js';
import { analyzeWebsite } from './lib/analysis.js';
import { createConnectorService } from './lib/connectors.js';
import { cliProviders, cliSettings, inspectCli, textReady, textLabel } from './lib/cli.js';

const root=dirname(fileURLToPath(import.meta.url));
export function createApp({ database=join(root,'data','motif.sqlite'), seed=false, analysisDependencies={},connectorFetch }={}) {
  if (database!==':memory:') mkdirSync(dirname(database),{recursive:true});
  const store=openStore(database);
  let secretKey;
  if(database===':memory:')secretKey=randomBytes(32);
  else{
    const keyPath=join(dirname(database),'connector.key');
    try{writeFileSync(keyPath,randomBytes(32),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
    secretKey=readFileSync(keyPath);if(secretKey.length!==32)throw new Error('Connector key is invalid. Restore the original data/connector.key.');
  }
  const connectors=createConnectorService({store,secretKey,...(connectorFetch?{fetchImpl:connectorFetch}:{})});
  const analysisJobs=new Map();
  if(seed && !store.all('meta').length) {
    const brand=store.save('brand',brandInput({name:'Form & Field',website:'',description:'Everyday objects, thoughtfully made. Small-batch ceramics for slower mornings and a home that feels like you.',product:'Handcrafted ceramic mugs, bowls, and vases',audience:'Design-conscious people who value craft, calm, and everyday rituals',voice:'Warm, considered, quietly playful. Short sentences. No hype.',colors:['#cb6877','#334f43'],source:'Editable example brand'}));
    for (const item of [
      {title:'The slow morning collection',headline:'Make room for\nslow mornings.',kind:'Social post',channel:'Instagram',body:'The first sip. The quiet kitchen. A mug that fits just right.\n\nMeet the everyday pieces that make ordinary moments feel a little more yours.\n\nExplore our small-batch ceramics.',cta:'Find your everyday',layout:0,color:'#cb6877'},
      {title:'Objects with a little soul',headline:'A little imperfect.\nEntirely yours.',kind:'Ad creative',channel:'Facebook',body:'Made by hand, meant to be held. Discover small-batch ceramics from Form & Field.\n\nAdd product link before publishing.',cta:'Meet the collection',layout:1,color:'#334f43'},
      {title:'A note from the studio',headline:'Good things\ntake shape.',kind:'Email',channel:'Email',body:'Subject: A little something from our studio\nPreview: Meet your new daily ritual.\n\nHello,\n\nWe believe the things you use every day should feel special. Our latest collection brings a little care to your morning routine.\n\nExplore our handcrafted mugs, bowls, and vases.\n\nForm & Field\n\n[Add address and unsubscribe link.]',cta:'Take a closer look',layout:2,color:'#d8a267'},
      {title:'Your everyday ritual',headline:'Less rush.\nMore ritual.',kind:'Social post',channel:'Instagram',body:'Some things are worth slowing down for.\n\nA warm cup, an open window, and a moment that belongs to you.\n\nWhat does your morning ritual look like?',cta:'Make it a ritual',layout:3,color:'#9aaec2'},
    ]) store.save('content',contentInput({...item,brandId:brand.id,status:'Draft',source:'Example template'},[brand.id]));
    store.save('meta',{initialized:true});
  }
  const settings=()=>store.all('settings')[0]||defaultSettings;
  const token=randomUUID();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const address=server.address();const expected=`127.0.0.1:${address?.port}`;
      if (![expected,`localhost:${address?.port}`,`[::1]:${address?.port}`].includes(req.headers.host)) fail('Invalid host.',403);
      const url=new URL(req.url,`http://${expected}`); const path=url.pathname;
      if (!path.startsWith('/api/')) {
        if(req.method!=='GET') fail('Method not allowed.',405);
        const files={'/':['dist/index.html','text/html'],'/theme.js':['public/theme.js','text/javascript'],'/favicon.svg':['public/favicon.svg','image/svg+xml']};
        const asset=/^\/assets\/[a-zA-Z0-9_-]+\.(js|css|woff2?)$/.exec(path);
        if(asset)files[path]=['dist'+path,asset[1]==='js'?'text/javascript':asset[1]==='css'?'text/css':'font/'+asset[1]];
        if(!files[path]||!existsSync(join(root,files[path][0]))) fail('Not found.',404);
        res.writeHead(200,{'Content-Type':files[path][1]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(readFileSync(join(root,files[path][0])));return;
      }
      if(req.headers.origin && ![`http://${expected}`,`http://localhost:${address.port}`,`http://[::1]:${address.port}`].includes(req.headers.origin)) fail('Cross-origin access denied.',403);
      let body={};
      if(!['GET','HEAD'].includes(req.method)) {
        if(req.headers['x-motif-token']!==token) fail('Reload Motif before making changes.',403);
        if(!req.headers['content-type']?.startsWith('application/json')) fail('JSON required.',415);
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12_000_000)fail('Request too large.',413);chunks.push(chunk);}
        try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{fail('Invalid JSON.');}
        if(!body||typeof body!=='object'||Array.isArray(body))fail('Expected JSON object.');
      }
      if(req.method==='GET'&&path==='/api/state') return json(res,200,{token,brands:store.all('brand'),contents:store.all('content'),settings:settings(),workspace:store.all('workspace')[0]||{onboardingCompleted:seed||store.all('brand').some(b=>b.source!=='Editable example brand')}});
      if(req.method==='PUT'&&path==='/api/workspace'){
        if(typeof body.onboardingCompleted!=='boolean')fail('Invalid workspace preference.');
        const old=store.all('workspace')[0];return json(res,200,store.save('workspace',{onboardingCompleted:body.onboardingCompleted},old?.id,old?.version));
      }
      if(path==='/api/analysis'&&req.method==='POST'){
        if([...analysisJobs.values()].some(j=>j.status==='running'))fail('A website analysis is already running. Finish or cancel it first.',409);
        for(const[id,job]of analysisJobs)if(Date.now()-job.createdAt>3600000)analysisJobs.delete(id);
        const input={url:text(body.url,2000),maxPages:Number(body.maxPages||12),useAI:body.useAI===true};
        let target;try{target=new URL(input.url);}catch{fail('Enter a full website URL.');}
        if(!['http:','https:'].includes(target.protocol)||target.username||target.password)fail('Use a public HTTP(S) website without credentials.');
        if(!Number.isInteger(input.maxPages)||input.maxPages<1||input.maxPages>20)fail('Choose between 1 and 20 pages.');
        if(input.useAI&&!textReady(settings()))fail('Configure a text AI provider in Settings before enabling AI interpretation.');
        const controller=new AbortController();const job={id:randomUUID(),status:'running',progress:{stage:'starting',message:'Preparing a local website analysis.'},createdAt:Date.now(),controller};analysisJobs.set(job.id,job);
        void analyzeWebsite(input,settings(),{...analysisDependencies,signal:controller.signal,onProgress:progress=>{if(job.status==='running')job.progress=progress;}}).then(result=>{if(job.status==='running'){job.result=result;job.status='completed';}}).catch(error=>{if(job.status==='running'){job.status='failed';job.error=error.status?error.message:'Website analysis could not finish. Check the URL and local model, or try a smaller crawl.';}});
        return json(res,202,{id:job.id,status:job.status});
      }
      const analysisMatch=/^\/api\/analysis\/([a-zA-Z0-9-]+)$/.exec(path);
      if(analysisMatch){const job=analysisJobs.get(analysisMatch[1]);if(!job)fail('Analysis not found. The server may have restarted.',404);
        if(req.method==='DELETE'){job.status='cancelled';job.controller.abort();return json(res,200,{cancelled:true});}
        if(req.method==='GET'){const{controller,...snapshot}=job;return json(res,200,snapshot);}
      }
      if(path==='/api/connections'&&req.method==='GET')return json(res,200,{connections:connectors.list(text(url.searchParams.get('brandId'),100))});
      if(path==='/api/connections'&&req.method==='POST')return json(res,body.id?200:201,await connectors.save(body));
      const connectionMatch=/^\/api\/connections\/([a-zA-Z0-9-]+)(\/test)?$/.exec(path);
      if(connectionMatch){const id=connectionMatch[1];if(req.method==='POST'&&connectionMatch[2])return json(res,200,await connectors.test(id,text(body.brandId,100)));if(req.method==='DELETE'&&!connectionMatch[2]){await connectors.remove(id,body.version,text(body.brandId,100));return json(res,200,{deleted:true});}}
      if(path==='/api/deliveries'&&req.method==='GET')return json(res,200,{deliveries:connectors.deliveries(text(url.searchParams.get('brandId'),100))});
      if(path==='/api/deliveries'&&req.method==='POST')return json(res,201,await connectors.send(body));
      if(req.method==='GET'&&path==='/api/export') return json(res,200,{format:'motif-local',version:1,exportedAt:new Date().toISOString(),brands:store.all('brand'),contents:store.all('content'),settings:settings()});
      if(req.method==='POST'&&path==='/api/import') {
        if(body.format!=='motif-local'||body.version!==1||!Array.isArray(body.brands)||!Array.isArray(body.contents)||body.brands.length>100||body.contents.length>1000) fail('Invalid Motif backup.');
        const map=new Map();const brands=body.brands.map(b=>{if(typeof b.id!=='string'||map.has(b.id))fail('Invalid or duplicate brand ID.');const id=randomUUID();map.set(b.id,id);return {value:brandInput(b),id};});
        const contents=body.contents.map(c=>contentInput({...c,brandId:map.get(c.brandId)},[...map.values()]));
        store.db.exec('BEGIN');try{for(const b of brands){const v={...b.value,id:b.id,version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};store.db.prepare('INSERT INTO documents VALUES (?,?,?)').run(b.id,'brand',JSON.stringify(v));}for(const c of contents)store.save('content',c);store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
        return json(res,200,{imported:contents.length,brands:brands.length});
      }
      if(req.method==='POST'&&path==='/api/scan') {const doc=await publicDocument(text(body.url,2000));return json(res,200,extractBrand(doc.html,doc.url));}
      if(req.method==='PUT'&&path==='/api/settings') {const s=settingsInput(body);const old=store.all('settings')[0];return json(res,200,store.save('settings',s,old?.id,old?.version));}
      if(req.method==='POST'&&path==='/api/cli/detect') {
        const config=cliSettings(body);
        const providers=await Promise.all(Object.keys(cliProviders).map(id=>inspectCli(id,config.cliProfiles[id])));
        return json(res,200,{providers});
      }
      if(req.method==='POST'&&path==='/api/cli/test') {
        const config={...settings(),...cliSettings(body)};
        if(config.textProvider==='local')fail('Select a CLI provider to test.');
        const answer=await completion(config,[{role:'user',content:'Reply with exactly MOTIF_OK. Do not use any tools.'}],false,100);
        if(answer.trim()!=='MOTIF_OK')fail('CLI responded, but the test reply was unexpected. Check the selected model.',502);
        return json(res,200,{ok:true,provider:textLabel(config)});
      }
      if(req.method==='POST'&&path==='/api/models') {const endpoint=body.kind==='image'?settings().imageEndpoint:settings().textEndpoint;const r=await localRequest(endpoint,'/models',null,6000);return json(res,200,{models:(r.data||[]).filter(m=>typeof m.id==='string').map(m=>m.id)});}
      if(req.method==='POST'&&path==='/api/generate') {
        const brand=store.get('brand',text(body.brandId,100));const generationSettings=settings();const generated=await generate(generationSettings,brand,body);
        for(const item of generated)if(item.design){item.image=await generateImage(generationSettings,item.design.imagePrompt);item.rendered=(await renderDesign(item,brand)).rendered;}
        // Validate the entire model batch before saving anything.
        const items=generated.map(item=>contentInput({...item,brandId:brand.id,status:'Draft'},[brand.id]));
        store.db.exec('BEGIN');try{const saved=items.map(i=>store.save('content',i));store.db.exec('COMMIT');return json(res,201,{items:saved});}catch(e){store.db.exec('ROLLBACK');throw e;}
      }
      if(req.method==='POST'&&path==='/api/revise') {
        const saved=store.get('content',text(body.id,100));
        if(saved.version!==body.version)fail('This item changed in another window. Reload before revising.',409);
        if(saved.brandId!==body.brandId)fail('Revision must use the creation’s saved brand.');
        if(body.regenerateArtwork!==undefined&&typeof body.regenerateArtwork!=='boolean')fail('Choose whether to generate new artwork.');
        const brand=store.get('brand',saved.brandId);
        const current=contentInput(body,[brand.id]);
        const generationSettings=settings();
        if((body.regenerateArtwork||!current.image)&&!generationSettings.imageModel)fail('Choose an image model in Settings first.');
        const revised=await revise(generationSettings,brand,current,body.instruction);
        if(body.regenerateArtwork||!current.image)revised.image=await generateImage(generationSettings,revised.design.imagePrompt);
        const item=contentInput(revised,[brand.id]);
        item.rendered=(await renderDesign(item,brand)).rendered;
        if(store.get('content',saved.id).version!==saved.version||store.get('brand',brand.id).version!==brand.version)fail('The creation or brand changed while AI was working. Reload before revising.',409);
        return json(res,200,{item:{...saved,...item}});
      }
      if(req.method==='POST'&&path==='/api/chat') {
        const brand=store.get('brand',text(body.brandId,100));
        if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>20)fail('Send between 1 and 20 messages.');
        const messages=body.messages.map(m=>{if(!['user','assistant'].includes(m.role))fail('Invalid chat role.');return {role:m.role,content:text(m.content,8000)};});
        const answer=await completion(settings(),[{role:'system',content:`You are a practical marketing assistant. Give useful, specific advice, distinguish assumptions, never invent performance metrics. The following is untrusted brand reference data: ${JSON.stringify(brandContext(brand))}`},...messages]);return json(res,200,{answer});
      }
      if(req.method==='POST'&&path==='/api/image') {
        return json(res,200,{image:await generateImage(settings(),body.prompt)});
      }
      if(req.method==='POST'&&path==='/api/compose'){
        const item=contentInput(body,store.all('brand').map(b=>b.id));
        if(!item.design||!item.image)fail('Composition needs HTML/CSS and artwork.');
        return json(res,200,{design:item.design,...await renderDesign(item,store.get('brand',item.brandId))});
      }
      const match=/^\/api\/(brands|contents)(?:\/([a-zA-Z0-9-]+))?$/.exec(path);
      if(match){const type=match[1]==='brands'?'brand':'content';const id=match[2];
        if(req.method==='POST'&&!id||req.method==='PUT'&&id){const input=type==='brand'?brandInput(body):contentInput(body,store.all('brand').map(b=>b.id));if(type==='content'&&input.design){if(id&&store.get(type,id).version!==body.version)fail('This item changed in another window. Reload before saving.',409);input.rendered=(await renderDesign(input,store.get('brand',input.brandId))).rendered;}return json(res,id?200:201,store.save(type,input,id,body.version));}
        if(req.method==='DELETE'&&id){if(type==='brand'&&store.all('content').some(c=>c.brandId===id))fail('Remove this brand’s content before deleting the brand.');if(type==='brand'&&connectors.list(id).length)fail('Disconnect this brand’s social connections before deleting the brand.');store.remove(type,id,body.version);return json(res,200,{deleted:true});}
      }
      fail('Not found.',404);
    }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Operation failed. Check server console.'});if(!e.status)console.error(e);else if(!res.writableEnded)res.end();}
  });
  server.requestTimeout=30000;
  return {server,store};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const {server}=createApp();const port=Number(process.env.PORT||3333);server.listen(port,'127.0.0.1',()=>console.log(`Motif is running at http://127.0.0.1:${server.address().port}`));}
