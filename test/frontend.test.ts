import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.ts';

test('compiled React app and assets are served without exposing source or private files',async()=>{
  const {server}=createApp({database:':memory:'});
  const base=await server.listen({port:0,host:'127.0.0.1'});
  try{
    const response=await fetch(base+'/app');assert.equal(response.status,200);const html=await response.text();
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

test('public pages ship real HTML and workspace routes stay allowlisted', async () => {
  const { server, store } = createApp({ database: ':memory:' });
  const base = await server.listen({ port: 0, host: '127.0.0.1' });
  try {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    const landing = await home.text();
    assert.match(landing, /<h1[^>]*>AI creatives for/);
    assert.match(landing, /href="\/app"/);
    assert.match(landing, /href="\/privacy"/);
    assert.match(landing, /MIT licensed/);
    for (const route of ['/privacy', '/privacy/']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<title>Privacy policy/);
      assert.match(html, /SQLite/);
      assert.match(html, /functional sidebar cookie/);
    }
    for (const route of ['/app', '/app/']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<title>Motif — AI creative workspace/);
      assert.match(html, /<div id="root"><\/div>/);
    }
    for (const path of new Set([...landing.matchAll(/(?:src|srcSet)="(\/assets\/[^" ]+\.jpg)"/g)].map(match => match[1]))) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type')!, /^image\/jpeg/);
    }
    for (const [route, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'application/xml']]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('content-type')?.startsWith(type));
    }
    for (const route of ['/privacy/source', '/app/settings', '/LICENSE', '/assets/../../LICENSE', '/src/marketing/assets/brand.png']) {
      assert.equal((await fetch(base + route)).status, 404, route);
    }
    assert.deepEqual(store.all('brand'), []);
  } finally {
    await server.close();
  }
});
