import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { openStore } from '../lib/core.js';
import { createConnectorService, publicMediaURL } from '../lib/connectors.js';

const token='fixture-secret-token';
const future=()=>new Date(Date.now()+3600000).toISOString();
function setup(provider='buffer', handler) {
  const store=openStore(':memory:');
  const brand=store.save('brand',{name:'Fixture'}), other=store.save('brand',{name:'Other'});
  const content=store.save('content',{brandId:brand.id,channel:'LinkedIn',body:'Reviewed fixture caption',title:'Fixture',status:'Approved'});
  const calls=[];
  const fetchImpl=async(url,options)=>{
    const call={url:String(url),...options,body:options.body ? JSON.parse(options.body) : undefined}; calls.push(call);
    if (handler) return handler(call,calls.length);
    if (call.body?.query?.includes('MotifChannels')) return Response.json({data:{channels:[{id:'account-1',name:'Fixture',service:'linkedin'}]}});
    if (call.body?.query?.includes('MotifCreatePost')) return Response.json({data:{createPost:{__typename:'PostActionSuccess',post:{id:'post-1'}}}});
    if (call.url.includes('/accounts')) return Response.json({accounts:[{_id:'account-1',displayName:'Fixture',platform:'linkedin',isActive:true}]});
    if (call.url.includes('simpleProfiles')) return Response.json([{id:42,linkedinCompany:'Fixture'}]);
    if (call.url.includes('metricool')) return Response.json({data:{id:17}});
    return Response.json({post:{_id:'post-1'}});
  };
  const key=randomBytes(32);
  const service=createConnectorService({store,secretKey:key,fetchImpl,resolveMediaHost:async()=>[{address:'8.8.8.8'}]});
  const connection=service.save({brandId:brand.id,provider,name:'Fixture connector',token,config:provider==='buffer'?{organizationId:'org-1'}:provider==='metricool'?{userId:'7',blogId:'42'}:{profileId:'507f1f77bcf86cd799439011'}});
  const input={brandId:brand.id,connectionId:connection.id,connectionVersion:connection.version,contentId:content.id,contentVersion:content.version,accountId:provider==='metricool'?'42:linkedin':'account-1',platform:'linkedin',mode:'draft'};
  return {store,service,connection,content,brand,other,calls,input,key};
}

for(const provider of ['buffer','metricool','zernio']) test(`${provider}: official account discovery and draft HTTP contract`,async t=>{
  const x=setup(provider);t.after(()=>x.store.db.close());
  const result=await x.service.test(x.connection.id,x.brand.id);
  assert.equal(result.accounts[0].platform,'linkedin');
  const delivery=await x.service.send(x.input);
  assert.equal(delivery.status,'draft');
  assert.ok(delivery.remoteId);
  const call=x.calls.at(-1);
  assert.equal(call.redirect,'error'); assert.ok(call.signal instanceof AbortSignal);
  assert.equal(call.method,'POST');
  if(provider==='buffer') {
    assert.equal(call.url,'https://api.buffer.com');assert.equal(call.headers.Authorization,`Bearer ${token}`);
    assert.equal(call.body.variables.input.saveToDraft,true);assert.equal(call.body.variables.input.needsApproval,false);assert.deepEqual(call.body.variables.input.assets,[]);
    assert.equal(call.body.variables.input.mode,'addToQueue');assert.match(call.body.query,/CreatePostInput!/);
  } else if(provider==='metricool') {
    const u=new URL(call.url);assert.equal(u.origin,'https://app.metricool.com');assert.equal(u.pathname,'/api/v2/scheduler/posts');assert.equal(u.searchParams.get('blogId'),'42');assert.equal(u.searchParams.get('userId'),'7');
    assert.equal(call.headers['X-Mc-Auth'],token);assert.equal(call.body.draft,true);assert.equal(call.body.autoPublish,false);assert.deepEqual(call.body.providers,[{network:'linkedin'}]);
  } else {
    assert.equal(call.url,'https://zernio.com/api/v1/posts');assert.equal(call.headers.Authorization,`Bearer ${token}`);assert.equal(call.headers['Idempotency-Key'],delivery.id);
    assert.equal(call.body.isDraft,true);assert.equal(call.body.publishNow,false);assert.deepEqual(call.body.platforms,[{platform:'linkedin',accountId:'account-1'}]);
  }
});

for(const provider of ['buffer','metricool','zernio']) test(`${provider}: explicit future scheduling`,async t=>{
  const x=setup(provider);t.after(()=>x.store.db.close()); const scheduledAt=future();
  assert.equal((await x.service.send({...x.input,mode:'schedule',scheduledAt})).status,'scheduled');
  const body=x.calls.at(-1).body;
  if(provider==='buffer') {assert.equal(body.variables.input.mode,'customScheduled');assert.equal(body.variables.input.dueAt,scheduledAt);assert.equal(body.variables.input.saveToDraft,false);}
  if(provider==='zernio') {assert.equal(body.scheduledFor,scheduledAt);assert.equal(body.publishNow,false);assert.equal(body.isDraft,false);}
  if(provider==='metricool') {assert.equal(body.draft,false);assert.equal(body.publicationDate.dateTime,scheduledAt.slice(0,19));assert.equal(body.publicationDate.timezone,'UTC');}
});

test('credentials encrypted outside documents; omitted token preserved; versions checked',async t=>{
  const x=setup();t.after(()=>x.store.db.close());
  assert.ok(!JSON.stringify(x.store.all('connection')).includes(token));
  const sealed=x.store.db.prepare('SELECT sealed FROM connector_secrets').get().sealed;
  assert.ok(!Buffer.from(sealed,'base64').toString().includes(token));
  assert.ok(!JSON.stringify(x.service.list(x.brand.id)).includes(token));
  const c=x.service.save({...x.connection,name:'Renamed'});
  await x.service.test(c.id,x.brand.id);assert.equal(x.calls.at(-1).headers.Authorization,`Bearer ${token}`);
  assert.throws(()=>x.service.save({...x.connection,name:'Stale'}),/changed/);
  assert.throws(()=>x.service.remove(c.id,c.version,x.other.id),/belong/);
  x.service.remove(c.id,c.version,x.brand.id);assert.equal(x.store.db.prepare('SELECT count(*) n FROM connector_secrets').get().n,0);
});

test('invalid credentials/config, missing brand and brand reassignment rejected',t=>{
  const x=setup();t.after(()=>x.store.db.close());
  for(const value of ['', 'abc\n12345678','Bearer token with space']) assert.throws(()=>x.service.save({...x.connection,token:value}));
  assert.throws(()=>x.service.save({...x.connection,provider:'evil'}));
  assert.throws(()=>x.service.save({...x.connection,brandId:x.other.id}),/belong/);
  assert.throws(()=>x.service.save({...x.connection,brandId:'missing'}),/not found/);
  assert.throws(()=>x.service.save({brandId:x.brand.id,provider:'metricool',token,config:{userId:'https://evil',blogId:'1'}}));
  assert.throws(()=>createConnectorService({store:x.store,secretKey:Buffer.alloc(10)}),/32-byte/);
});

test('cross-brand, unreviewed, account mismatch, long content and unsafe scheduling never write',async t=>{
  const x=setup();t.after(()=>x.store.db.close());
  await assert.rejects(x.service.send({...x.input,brandId:x.other.id}),/belong/);
  const cross=x.store.save('content',{...x.content,brandId:x.other.id});
  await assert.rejects(x.service.send({...x.input,contentId:cross.id}),/belong/);
  for(const status of ['Draft','Unknown']) { const c=x.store.save('content',{...x.content,status});await assert.rejects(x.service.send({...x.input,contentId:c.id}),/Approve/); }
  const long=x.store.save('content',{...x.content,body:'a'.repeat(3001)});await assert.rejects(x.service.send({...x.input,contentId:long.id}),/limit/);
  await assert.rejects(x.service.send({...x.input,platform:'facebook'}),/match/);
  await assert.rejects(x.service.send({...x.input,mode:'publishNow'}));
  for(const date of ['2020-01-01T00:00:00Z','2030-01-01T00:00:00','bad']) await assert.rejects(x.service.send({...x.input,mode:'schedule',scheduledAt:date}),/future/);
  await assert.rejects(x.service.send({...x.input,accountId:'not-owned'}),/connected/);
  assert.ok(!x.calls.some(c=>c.body?.query?.includes('MotifCreatePost')));
});

test('public media validates HTTPS, credentials, DNS and local/special IPs',async()=>{
  for(const url of ['data:image/png;base64,a','file:///a.png','http://example.org/a.png','https://user:pass@example.org/a.png','https://127.0.0.1/a.png','https://10.0.0.1/a.png','https://[::1]/a.png','https://localhost/a.png','https://metadata.internal/a.png','https://0x7f000001/a.png']) await assert.rejects(publicMediaURL(url));
  await assert.rejects(publicMediaURL('https://example.org/a.png',async()=>[{address:'192.168.1.1'}]));
  await assert.rejects(publicMediaURL('https://images.acme.org/a.png?X-Amz-Signature=secret',async()=>[{address:'8.8.8.8'}]),/credentials/);
  assert.equal(await publicMediaURL('https://images.acme.org/a.png',async()=>[{address:'8.8.8.8'}]),'https://images.acme.org/a.png');
});

test('content edits during account lookup invalidate the reviewed delivery',async t=>{
  let x;
  x=setup('buffer',()=>{x.store.save('content',{...x.content,body:'Changed after review'},x.content.id,x.content.version);return Response.json({data:{channels:[{id:'account-1',name:'Fixture',service:'linkedin'}]}});});t.after(()=>x.store.db.close());
  await assert.rejects(x.service.send(x.input),/changed during review/);
  assert.equal(x.service.deliveries(x.brand.id).length,0);assert.equal(x.calls.length,1);
});

test('missing or stale reviewed versions refuse delivery before any remote call',async t=>{
  const x=setup();t.after(()=>x.store.db.close());
  for(const change of [{contentVersion:undefined},{connectionVersion:undefined},{contentVersion:'1'},{connectionVersion:'1'},{contentVersion:0},{connectionVersion:0}]) {
    await assert.rejects(x.service.send({...x.input,...change}),e=>e.status===409 && /since review/.test(e.message));
  }
  const edited=x.store.save('content',{...x.content,body:'Edited before click'},x.content.id,x.content.version);
  await assert.rejects(x.service.send(x.input),/since review/);
  x.service.save({...x.connection,name:'Connection edited'});
  await assert.rejects(x.service.send({...x.input,contentVersion:edited.version}),/since review/);
  assert.equal(x.calls.length,0);assert.equal(x.service.deliveries(x.brand.id).length,0);
});

test('Buffer/Zernio image URLs use documented image payload; Metricool media explicitly refused',async t=>{
  for(const provider of ['buffer','zernio','metricool']) {
    const x=setup(provider);t.after(()=>x.store.db.close()); const mediaUrl='https://images.acme.org/creative.png';
    if(provider==='metricool') {await assert.rejects(x.service.send({...x.input,mediaUrl}),/mediaId/);assert.equal(x.calls.length,0);continue;}
    assert.equal((await x.service.send({...x.input,mediaUrl})).status,'draft');
    const body=x.calls.at(-1).body;
    if(provider==='buffer') assert.deepEqual(body.variables.input.assets,[{image:{url:mediaUrl}}]);
    else assert.deepEqual(body.mediaItems,[{type:'image',url:mediaUrl}]);
  }
});

test('successful and ambiguous deliveries suppress duplicates including concurrent clicks',async t=>{
  const x=setup();t.after(()=>x.store.db.close());
  const [first,second]=await Promise.all([x.service.send(x.input),x.service.send(x.input)]);
  assert.equal(first.id,second.id);assert.equal(x.calls.filter(c=>c.body?.query?.includes('MotifCreatePost')).length,1);
  assert.equal((await x.service.send(x.input)).duplicate,true);
  const y=setup('zernio',call=>{if(call.url.includes('/accounts')) return Response.json({accounts:[{_id:'account-1',platform:'linkedin'}]});throw new Error(`Network failed ${token}`);});t.after(()=>y.store.db.close());
  const uncertain=await y.service.send(y.input);assert.equal(uncertain.status,'uncertain');assert.ok(!JSON.stringify(uncertain).includes(token));
  const count=y.calls.length;assert.equal((await y.service.send(y.input)).duplicate,true);assert.equal(y.calls.length,count);
});

test('provider response errors and reflected credentials are redacted',async t=>{
  const x=setup('buffer',()=>Response.json({errors:[{message:token}] }));t.after(()=>x.store.db.close());
  await assert.rejects(x.service.test(x.connection.id,x.brand.id),e=>!e.message.includes(token));
  const y=setup('buffer',call=>Response.json(call.body.query.includes('MotifChannels') ? {data:{channels:[{id:'account-1',name:token,service:'linkedin'}]}} : {data:{createPost:{__typename:'MutationError',message:token}}}));t.after(()=>y.store.db.close());
  const result=await y.service.test(y.connection.id,y.brand.id);assert.equal(result.accounts[0].name,'[redacted]');
  const delivery=await y.service.send(y.input);assert.equal(delivery.status,'failed');assert.ok(!JSON.stringify(delivery).includes(token));
});

test('redirect, malformed/oversized responses and 5xx writes stay uncertain without retry',async t=>{
  for(const outcome of ['redirect','malformed','oversized','5xx']) {
    const x=setup('zernio',call=>{
      if(call.url.includes('/accounts'))return Response.json({accounts:[{_id:'account-1',platform:'linkedin'}]});
      if(outcome==='redirect')throw new TypeError('redirect disallowed');
      if(outcome==='malformed')return new Response('not-json');
      if(outcome==='oversized')return new Response('a'.repeat(1_000_001));
      return new Response(token,{status:503});
    });t.after(()=>x.store.db.close());
    assert.equal((await x.service.send(x.input)).status,'uncertain');
    const count=x.calls.length;await x.service.send(x.input);assert.equal(x.calls.length,count);
  }
});
