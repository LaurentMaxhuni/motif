import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.ts';

test('compiled React app and assets are served without exposing source or private files',async()=>{
  const {server,store}=createApp({database:':memory:'});await server.listen({port:0,host:'127.0.0.1'});
  const base=`http://127.0.0.1:${(server.server.address() as AddressInfo).port}`;
  try{
    const response=await fetch(base);assert.equal(response.status,200);const html=await response.text();
    const script=html.match(/src="(\/assets\/[^" ]+\.js)"/);assert.ok(script,'compiled JS entry should be served');
    const css=html.match(/href="(\/assets\/[^" ]+\.css)"/);assert.ok(css,'compiled stylesheet should be served');
    for(const [path,type] of [[script[1],'javascript'],[css[1],'text/css']]){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').includes(type));}
    assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
    assert.match(html,/<script src="\/theme\.js"><\/script>/);
    const theme=await fetch(base+'/theme.js');
    assert.equal(theme.status,200);
    assert.match(theme.headers.get('content-type')!,/text\/javascript/);
    assert.match(await theme.text(),/prefers-color-scheme: dark/);
    for(const path of ['/src/App.tsx','/lib/theme-bootstrap.ts','/app.js','/features.js','/style.css','/data/motif.sqlite','/package.json','/.git/config','/assets/missing.js','/assets/..%2F..%2Fserver.ts','/assets/test.js.map'])assert.equal((await fetch(base+path)).status,404,path);
  }finally{await server.close();}
});
