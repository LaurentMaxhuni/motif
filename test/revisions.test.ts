import type { AddressInfo } from 'node:net';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server.ts';
import { fixtureDesign, fixturePNG } from './fixtures.ts';

let app, base, token, original, model, modelBase, behavior='normal', requests=[], duringCompletion;
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
async function call(path,body,method='POST'){
  const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json','X-Motif-Token':token},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
}
before(async()=>{
  app=createApp({database:':memory:',seed:true});base=await app.server.listen({port:0,host:'127.0.0.1'});
  const state=(await call('state',null,'GET')).data;token=state.token;
  original=app.store.save('content',{...state.contents[0],image:`data:image/png;base64,${fixturePNG().toString('base64')}`,status:'Approved',scheduledAt:'2026-12-01T10:00:00.000Z'});
  model=http.createServer(async(req,res)=>{
    let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);requests.push({path:req.url,body});res.setHeader('Content-Type','application/json');
    if(req.url.endsWith('/images/generations')){res.statusCode=behavior==='image-failure'?503:200;return res.end(JSON.stringify({data:[{b64_json:fixturePNG().toString('base64')}]}));}
    if(duringCompletion){const callback=duringCompletion;duringCompletion=null;callback();}
    const input=JSON.parse(body.messages.at(-1).content);
    const item={title:'Revised campaign',headline:input.current.headline==='A bolder morning'?'A calmer morning':'A bolder morning',body:'Revised caption.',cta:'Explore',subhead:'Made with intention',design:{...fixtureDesign,css:fixtureDesign.css+'.ad{background:#181818;color:#ffffff}'}};
    if(behavior==='unsafe')item.design.html+='<script>alert(1)</script>';
    res.end(JSON.stringify({choices:[{message:{content:behavior==='bad'?'not JSON':JSON.stringify(item)}}]}));
  });modelBase=await listen(model);
  await call('settings',{textEndpoint:modelBase+'/v1',textModel:'fixture-text',imageEndpoint:modelBase+'/v1',imageModel:'fixture-image'},'PUT');
});
after(async()=>{await Promise.all([app.server.close(),new Promise(r=>model.close(r))]);});

test('AI revisions preview without saving, preserve artwork, chain, save and reload',async()=>{
  const count=app.store.all('content').length;
  const preview=await call('revise',{...original,instruction:'Make it dark and bolder',regenerateArtwork:false});
  assert.equal(preview.status,200,preview.data.error);const item=preview.data.item;
  assert.equal(item.id,original.id);assert.equal(item.version,original.version);
  assert.equal(item.headline,'A bolder morning');assert.match(item.design.css,/#181818/);
  assert.equal(item.image,original.image);assert.equal(item.status,'Draft');assert.equal(item.scheduledAt,'');
  assert.ok(item.rendered.startsWith('data:image/png;base64,'));
  const png=Buffer.from(item.rendered.split(',')[1],'base64');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1080);
  assert.equal(app.store.get('content',original.id).headline,original.headline);assert.equal(app.store.all('content').length,count);
  assert.equal(requests.filter(r=>r.path.endsWith('/images/generations')).length,0);
  assert.equal(JSON.parse(requests.at(-1).body.messages.at(-1).content).instruction,'Make it dark and bolder');
  const again=await call('revise',{...item,instruction:'Now make it calmer'});assert.equal(again.status,200);assert.equal(again.data.item.headline,'A calmer morning');
  const saved=await call('contents/'+item.id,again.data.item,'PUT');assert.equal(saved.status,200);assert.equal(saved.data.version,item.version+1);
  const state=(await call('state',null,'GET')).data;assert.equal(state.contents.find(c=>c.id===item.id).headline,'A calmer morning');
  original=saved.data;
});

test('revision validation rejects stale versions, wrong brands and empty instructions before inference',async()=>{
  const count=requests.length;
  assert.equal((await call('revise',{...original,version:0,instruction:'Change it'})).status,409);
  assert.equal((await call('revise',{...original,brandId:'other-brand',instruction:'Change it'})).status,400);
  for(const instruction of ['', ' '.repeat(4), 'x'.repeat(4001)])assert.equal((await call('revise',{...original,instruction})).status,400);
  assert.equal((await call('revise',{...original,instruction:'Change it',regenerateArtwork:'false'})).status,400);
  assert.equal(requests.length,count);
});

test('invalid or unsafe AI output leaves the saved creation intact',async()=>{
  const snapshot=app.store.get('content',original.id);
  for(const mode of ['bad','unsafe']){behavior=mode;const r=await call('revise',{...original,instruction:'Change it'});assert.ok(r.status>=400);assert.deepEqual(app.store.get('content',original.id),snapshot);}
  behavior='normal';
});

test('new artwork is explicit and image failure preserves saved data',async()=>{
  const snapshot=app.store.get('content',original.id);behavior='image-failure';
  assert.equal((await call('revise',{...original,instruction:'New artwork',regenerateArtwork:true})).status,502);
  assert.deepEqual(app.store.get('content',original.id),snapshot);behavior='normal';
  const r=await call('revise',{...original,instruction:'New artwork',regenerateArtwork:true});assert.equal(r.status,200);
  assert.equal(r.data.item.image,`data:image/png;base64,${fixturePNG().toString('base64')}`);
  assert.equal(app.store.get('content',original.id).image,snapshot.image);
});

test('legacy creations without artwork get AI artwork before rendering',async()=>{
  const count=requests.filter(r=>r.path.endsWith('/images/generations')).length;
  const r=await call('revise',{...original,image:'',instruction:'Make a finished poster'});
  assert.equal(r.status,200,r.data.error);assert.ok(r.data.item.image);assert.ok(r.data.item.rendered);
  assert.equal(requests.filter(r=>r.path.endsWith('/images/generations')).length,count+1);
});

test('concurrent content and brand changes invalidate pending previews',async()=>{
  duringCompletion=()=>{original=app.store.save('content',{...original,title:'Changed elsewhere'},original.id,original.version);};
  assert.equal((await call('revise',{...original,instruction:'Change it'})).status,409);
  duringCompletion=()=>{const b=app.store.get('brand',original.brandId);app.store.save('brand',{...b,voice:'New voice'},b.id,b.version);};
  assert.equal((await call('revise',{...original,instruction:'Change it'})).status,409);
});

test('missing local models fail clearly without a template fallback',async()=>{
  const count=requests.length;
  await call('settings',{textEndpoint:modelBase+'/v1',textModel:'',imageEndpoint:modelBase+'/v1',imageModel:''},'PUT');
  const r=await call('revise',{...original,instruction:'Change it'});assert.equal(r.status,400);assert.match(r.data.error,/text model/i);assert.equal(requests.length,count);
});
