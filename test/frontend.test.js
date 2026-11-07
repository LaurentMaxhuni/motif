import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

test('compiled React app and assets are served without exposing source or private files',async()=>{
  const {server,store}=createApp({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const response=await fetch(base);assert.equal(response.status,200);const html=await response.text();
    const script=html.match(/src="(\/assets\/[^" ]+\.js)"/);assert.ok(script,'compiled JS entry should be served');
    const css=html.match(/href="(\/assets\/[^" ]+\.css)"/);assert.ok(css,'compiled stylesheet should be served');
    for(const [path,type] of [[script[1],'javascript'],[css[1],'text/css']]){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').includes(type));}
    assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
    for(const path of ['/src/App.tsx','/app.js','/features.js','/style.css','/data/motif.sqlite','/package.json','/.git/config','/assets/missing.js','/assets/..%2F..%2Fserver.js','/assets/test.js.map'])assert.equal((await fetch(base+path)).status,404,path);
  }finally{await new Promise(r=>server.close(r));store.db.close();}
});

test('public pages ship real HTML and workspace routing stays explicitly allowlisted',async()=>{
  const {server,store}=createApp({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const landing=await (await fetch(base)).text();
    assert.match(landing,/<h1[^>]*>Your next campaign/);
    assert.match(landing,/href="\/app"/);
    assert.match(landing,/href="\/privacy"/);
    assert.match(landing,/MIT licensed/);
    for(const route of ['/privacy','/privacy/']){
      const res=await fetch(base+route);assert.equal(res.status,200);
      const html=await res.text();assert.match(html,/<title>Privacy policy/);assert.match(html,/SQLite/);assert.match(html,/functional sidebar cookie/);
    }
    for(const route of ['/app','/app/']){
      const res=await fetch(base+route);assert.equal(res.status,200);
      const html=await res.text();assert.match(html,/<title>Motif — AI creative workspace/);assert.match(html,/<div id="root"><\/div>/);
    }
    for(const path of new Set([...landing.matchAll(/(?:src|srcSet)="(\/assets\/[^" ]+\.png)"/g)].map(match=>match[1]))){
      const res=await fetch(base+path);assert.equal(res.status,200,path);assert.match(res.headers.get('content-type'),/^image\/png/);
    }
    for(const route of ['/privacy/source','/app/settings','/LICENSE','/assets/../../LICENSE','/src/marketing/assets/brand.png'])assert.equal((await fetch(base+route)).status,404,route);
    assert.deepEqual(store.all('brand'),[],'reading public pages cannot create a brand');
  }finally{await new Promise(r=>server.close(r));store.db.close();}
});
