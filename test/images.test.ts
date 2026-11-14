import type { AddressInfo } from 'node:net';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageSettings, imageReady, generateProviderImage, createImageService} from '../lib/images.ts';
import {defaultSettings, openStore} from '../lib/core.ts';
import {fixturePNG} from './fixtures.ts';
import {createApp} from '../server.ts';
import {fileURLToPath} from 'node:url';
const account='a'.repeat(32);
const png=fixturePNG().toString('base64');
const dataURI='data:image/png;base64,'+png;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('image settings preserve the local default and validate Cloudflare/Unsloth boundaries',()=>{
  assert.equal(imageSettings({}).imageProvider,'local');
  assert.throws(()=>imageSettings({imageProvider:'other'}),/provider/i);
  assert.throws(()=>imageSettings({imageProvider:'cloudflare',cloudflareAccountId:'../outside'}),/account/i);
  assert.throws(()=>imageSettings({unslothImageEndpoint:'https://outside.example/v1'}),/localhost/i);
  assert.equal(imageSettings({unslothImageEndpoint:'http://localhost:8888/v1/'}).unslothImageEndpoint,'http://127.0.0.1:8888/v1');
  assert.equal(imageReady({imageProvider:'cloudflare',cloudflareAccountId:account}),true);
});

test('Cloudflare uses its fixed origin, bounded prompt and JPEG/PNG byte detection',async()=>{
  let call;
  const fetchImpl=async(url,options)=>{call={url,options};return json({success:true,result:{image:png}})};
  const image=await generateProviderImage({imageProvider:'cloudflare',cloudflareAccountId:account},'A handmade mug',{apiKey:'fixture-secret',fetchImpl});
  assert.equal(image,dataURI);assert.equal(call.url,`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`);
  assert.equal(call.options.headers.Authorization,'Bearer fixture-secret');assert.equal(call.options.redirect,'error');assert.equal(JSON.parse(call.options.body).steps,4);
  await assert.rejects(generateProviderImage({imageProvider:'cloudflare',cloudflareAccountId:account},'x'.repeat(2049),{apiKey:'fixture',fetchImpl}),/2048/);
  const jpeg=Buffer.from([255,216,255,224,0,16]).toString('base64');
  assert.match(await generateProviderImage({imageProvider:'cloudflare',cloudflareAccountId:account},'A mug',{apiKey:'fixture',fetchImpl:async()=>json({success:true,result:{image:jpeg}})}),/^data:image\/jpeg;base64,/);
});

test('local and Unsloth requests use the correct model, base URL and optional Bearer auth',async()=>{
  for(const provider of ['local','unsloth'] as const){
    let call;const settings={...defaultSettings,imageProvider:provider,imageModel:'local-image',unslothImageEndpoint:'http://localhost:8888/v1',unslothImageModel:'unsloth-image'};
    assert.equal(await generateProviderImage(settings,'A mug',{apiKey:'fixture-key',fetchImpl:async(url,options)=>{call={url,options};return json({data:[{b64_json:png}]})}}),dataURI);
    assert.equal(call.url,provider==='local'?'http://127.0.0.1:7860/v1/images/generations':'http://127.0.0.1:8888/v1/images/generations');
    const body=JSON.parse(call.options.body);assert.equal(body.model,provider==='local'?'local-image':'unsloth-image');assert.equal(body.response_format,'b64_json');assert.equal(body.n,1);assert.equal(call.options.headers.Authorization,'Bearer fixture-key');
  }
});

test('image failures never fetch returned URLs or expose provider diagnostics/secrets',async()=>{
  const settings={...defaultSettings,imageModel:'fixture'};let calls=0;
  await assert.rejects(generateProviderImage(settings,'A mug',{fetchImpl:async()=>{calls++;return json({data:[{url:'https://outside.example/private'}]})}}),/b64_json/);assert.equal(calls,1);
  for(const [status,pattern] of [[401,/API key|token/i],[429,/quota|limit/i],[503,/unavailable|model/i]] as const){
    await assert.rejects(generateProviderImage({imageProvider:'cloudflare',cloudflareAccountId:account},'A mug',{apiKey:'super-secret',fetchImpl:async()=>json({error:'super-secret'},status)}),error=>error instanceof Error&&pattern.test(error.message)&&!error.message.includes('super-secret'));
  }
  await assert.rejects(generateProviderImage(settings,'A mug',{fetchImpl:async()=>json({data:[{b64_json:Buffer.from('<script>bad</script>').toString('base64')}]})}),/image|format/i);
  await assert.rejects(generateProviderImage(settings,'A mug',{fetchImpl:async()=>json({data:[{b64_json:'a'.repeat(8000000)}]})}),/size limit/i);
  await assert.rejects(generateProviderImage(settings,'A mug',{fetchImpl:async()=>json(null)}),/invalid JSON/i);
});

test('image credentials are encrypted, independently scoped and explicitly removable',async()=>{
  const store=openStore(':memory:');const secretKey=Buffer.alloc(32,7);let auth;
  try{
    let service=createImageService({store,secretKey,fetchImpl:async(url,options)=>{auth=options.headers.Authorization;return json({success:true,result:{image:png}})}});
    service.saveCredentials({cloudflare:'fixture-secret',unsloth:'another-secret'});
    assert.equal(service.credentialStatus().cloudflare,true);assert.ok(!JSON.stringify(store.db.prepare('SELECT * FROM image_secrets').all()).includes('fixture-secret'));
    service=createImageService({store,secretKey,fetchImpl:async(url,options)=>{auth=options.headers.Authorization;return json({success:true,result:{image:png}})}});
    assert.equal(await service.generate({imageProvider:'cloudflare',cloudflareAccountId:account},'A mug'),dataURI);assert.equal(auth,'Bearer fixture-secret');
    const wrongKey=createImageService({store,secretKey:Buffer.alloc(32,9)});
    await assert.rejects(wrongKey.generate({imageProvider:'cloudflare',cloudflareAccountId:account},'A mug'),/decrypt/i);
    service.saveCredentials({cloudflare:''});assert.equal(service.credentialStatus().cloudflare,true);
    service.saveCredentials({cloudflare:null});assert.equal(service.credentialStatus().cloudflare,false);assert.equal(service.credentialStatus().unsloth,true);
    assert.throws(()=>service.saveCredentials({local:'ok',unsloth:'bad\nheader'}),/key|credential/i);assert.equal(service.credentialStatus().local,false);
  }finally{store.db.close()}
});

test('provider API keeps secrets out of state/backups and uses Cloudflare for generation/revisions atomically',async()=>{
  const calls=[];let failImage=false;
  const app=createApp({database:':memory:',seed:true,imageFetch:async(url,options)=>{
    calls.push({url,options});
    if(failImage)return json({errors:[{message:'private-token'}]},429);
    if(url.endsWith('/models'))return json({data:[{id:'studio-image'}]});
    return url.startsWith('https://api.cloudflare.com/')?json({success:true,result:{image:png}}):json({data:[{b64_json:png}]});
  }});
  await app.server.listen({port:0,host:'127.0.0.1'});const base=`http://127.0.0.1:${(app.server.server.address() as AddressInfo).port}/api/`;
  const initial=await(await fetch(base+'state')).json();
  const call=async(path,body?)=>{const response=await fetch(base+path,{method:body?(path==='settings'?'PUT':'POST'):'GET',headers:{'Content-Type':'application/json','X-Motif-Token':initial.token},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()}};
  const config={...defaultSettings,textProvider:'claude',cliProfiles:{claude:{executable:fileURLToPath(new URL('./fixtures/cli-provider.ts',import.meta.url)),model:'fixture/claude'}},imageProvider:'cloudflare',cloudflareAccountId:account};
  try{
    assert.equal((await call('image/test',{...config,imageCredentials:{cloudflare:'private-token'}})).data.image,dataURI);
    assert.equal(app.store.all('settings').length,0);assert.equal((await call('state')).data.imageCredentials.cloudflare,false);
    const saved=await call('settings',{...config,imageCredentials:{cloudflare:'private-token'}});assert.equal(saved.status,200);assert.ok(!JSON.stringify(saved.data).includes('private-token'));
    const state=(await call('state')).data;assert.equal(state.imageCredentials.cloudflare,true);assert.ok(!JSON.stringify(state).includes('private-token'));assert.ok(!JSON.stringify((await call('export')).data).includes('private-token'));
    const generated=await call('generate',{brandId:initial.brands[0].id,kind:'Ad creative',mode:'hybrid',count:1,brief:'A thoughtful launch'});
    assert.equal(generated.status,201,JSON.stringify(generated.data));const item=generated.data.items[0];assert.equal(item.image,dataURI);assert.match(item.source,/Cloudflare FLUX/);assert.match(item.rendered,/^data:image\/png/);
    const revision=await call('revise',{...item,instruction:'A quieter headline',regenerateArtwork:true});assert.equal(revision.status,200,JSON.stringify(revision.data));assert.equal(revision.data.item.headline,'Made with care');
    const count=app.store.all('content').length;failImage=true;assert.equal((await call('generate',{brandId:initial.brands[0].id,kind:'Ad creative',mode:'hybrid',count:1,brief:'A launch'})).status,502);assert.equal(app.store.all('content').length,count);failImage=false;
    const unsloth={...config,imageProvider:'unsloth',unslothImageEndpoint:'http://127.0.0.1:8888/v1',unslothImageModel:'studio-image'};
    const models=await call('image/models',{...unsloth,imageCredentials:{unsloth:'studio-token'}});assert.deepEqual(models.data.models,['studio-image']);assert.equal(calls.at(-1).options.headers.Authorization,'Bearer studio-token');
    assert.equal((await call('settings',{...unsloth,imageCredentials:{unsloth:'studio-token'}})).status,200);assert.equal((await call('image',{prompt:'A ceramic mug'})).data.image,dataURI);assert.equal(calls.at(-1).url,'http://127.0.0.1:8888/v1/images/generations');
    const previous=app.store.all('settings')[0];assert.equal((await call('settings',{...unsloth,imageCredentials:{local:'valid',unsloth:'bad\nheader'}})).status,400);assert.deepEqual(app.store.all('settings')[0],previous);assert.equal((await call('state')).data.imageCredentials.local,false);
    assert.equal((await call('settings',{...unsloth,imageCredentials:{unsloth:null}})).status,200);const credentials=(await call('state')).data.imageCredentials;assert.equal(credentials.unsloth,false);assert.equal(credentials.cloudflare,true);
    assert.equal((await call('settings',{...config,imageCredentials:{cloudflare:null},cliProfiles:{claude:{...config.cliProfiles.claude,model:'fixture/failure'}}})).status,200);
    const missingKey=await call('generate',{brandId:initial.brands[0].id,kind:'Ad creative',mode:'hybrid',count:1,brief:'A launch'});assert.equal(missingKey.status,400);assert.match(missingKey.data.error,/Cloudflare API token/);assert.equal(app.store.all('content').length,count);
  }finally{await app.server.close()}
});
