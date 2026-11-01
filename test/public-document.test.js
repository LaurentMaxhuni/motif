import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { gzipSync, deflateSync, brotliCompressSync } from 'node:zlib';
import { publicDocument } from '../lib/core.js';

const origin = 'http://93.184.216.34';
function transport(t, replies) {
  const calls = [];
  t.mock.method(http, 'get', (url, options, callback) => {
    const reply = replies[calls.length];
    const req = new EventEmitter();
    req.destroy = error => { if (error) queueMicrotask(() => req.emit('error', error)); };
    const res = new PassThrough();
    Object.assign(res, { statusCode: reply.status || 200, headers: { 'content-type': 'text/html', ...reply.headers } });
    calls.push({ url: url.href, options, res });
    queueMicrotask(() => {
      callback(res);
      for (const chunk of reply.chunks || []) { if (res.destroyed) break; res.write(chunk); }
      if (reply.error) res.destroy(new Error(reply.error));
      else if (!reply.open) res.end();
    });
    return req;
  });
  return calls;
}

test('counts each HTTP hop before dispatch and every raw chunk', async t => {
  const seen = [], bytes = [];
  const calls = transport(t, [{ status: 302, headers: { location: '/next' }, open: true }, { chunks: [Buffer.from('hello'), Buffer.from(' world')] }]);
  const result = await publicDocument(origin, 0, {
    onRequest: url => { assert.equal(calls.length, seen.length); seen.push(url); },
    onBytes: count => bytes.push(count),
  });
  assert.deepEqual(seen, [origin + '/', origin + '/next']);
  assert.deepEqual(bytes, [5, 6]);
  assert.deepEqual(result, { html: 'hello world', url: origin + '/next' });
  assert.equal(calls[0].res.destroyed, true);
  calls[0].options.lookup('', {}, (error, address) => { assert.equal(error, null); assert.equal(address, '93.184.216.34'); });
});

test('request callback rejection prevents dispatch; byte callback rejection safely aborts', async t => {
  const calls = transport(t, [{ chunks: [Buffer.from('hello')] }]);
  await assert.rejects(publicDocument(origin, 0, { onRequest() { throw new Error('request budget'); } }), /request budget/);
  assert.equal(calls.length, 0);
  await assert.rejects(publicDocument(origin, 0, { onBytes() { throw new Error('byte budget'); } }), /byte budget/);
  assert.equal(calls[0].res.destroyed, true);
});

test('unsupported responses are destroyed without draining', async t => {
  const calls = transport(t, [{ status: 500, open: true }]);
  await assert.rejects(publicDocument(origin), /HTTP 500/);
  assert.equal(calls[0].res.destroyed, true);
});

for (const [encoding, compress] of [['gzip', gzipSync], ['deflate', deflateSync], ['br', brotliCompressSync]]) {
  test(`decodes ${encoding} while counting compressed bytes`, async t => {
    const raw = compress(Buffer.from('<title>Café</title>'));
    transport(t, [{ headers: { 'content-encoding': encoding }, chunks: [raw] }]);
    let bytes = 0;
    const result = await publicDocument(origin, 0, { onBytes: count => { bytes += count; } });
    assert.equal(result.html, '<title>Café</title>');
    assert.equal(bytes, raw.length);
  });
}

test('compressed and decoded payloads are both bounded, including oversize raw chunk', async t => {
  const bomb = gzipSync(Buffer.alloc(10000, 97));
  const calls = transport(t, [
    { headers: { 'content-encoding': 'gzip' }, chunks: [bomb] },
    { chunks: [Buffer.alloc(101)] },
  ]);
  await assert.rejects(publicDocument(origin, 0, { maxBytes: 100 }), /size limit/);
  let bytes = 0;
  await assert.rejects(publicDocument(origin, 0, { maxBytes: 100, onBytes: count => { bytes += count; } }), /size limit/);
  assert.equal(bytes, 101);
  assert.ok(calls.every(call => call.res.destroyed));
});

test('rejects malformed compression and unsupported encodings', async t => {
  transport(t, [
    { headers: { 'content-encoding': 'gzip' }, chunks: [Buffer.from('bad gzip')] },
    { headers: { 'content-encoding': '__proto__' }, open: true },
  ]);
  await assert.rejects(publicDocument(origin));
  await assert.rejects(publicDocument(origin), /encoding/);
});

test('counts bytes received before transfer failure', async t => {
  const calls = transport(t, [{ chunks: [Buffer.from('partial')], error: 'transfer failed' }]);
  let bytes = 0;
  await assert.rejects(publicDocument(origin, 0, { onBytes: count => { bytes += count; } }), /transfer failed/);
  assert.equal(bytes, 7);
  assert.equal(calls[0].res.destroyed, true);
});

test('policy, private addresses and cancellation block dispatch', async t => {
  const calls = transport(t, []);
  for (const [url, options] of [
    ['http://127.0.0.1', {}],
    [origin, { sameOrigin: 'https://example.com' }],
    [origin, { allowUrl: () => false }],
    [origin, { signal: AbortSignal.abort(new Error('cancelled')) }],
  ]) await assert.rejects(publicDocument(url, 0, options));
  assert.equal(calls.length, 0);
});

test('redirect target still passes origin and policy checks before another request', async t => {
  const calls = transport(t, [
    { status: 302, headers: { location: 'http://8.8.8.8/next' }, open: true },
    { status: 302, headers: { location: '/blocked' }, open: true },
  ]);
  await assert.rejects(publicDocument(origin, 0, { sameOrigin: origin }), /Cross-origin/);
  await assert.rejects(publicDocument(origin, 0, { allowUrl: url => !url.endsWith('/blocked') }), /site policy/);
  assert.equal(calls.length, 2);
});

test('honors declared Latin-1 text charset', async t => {
  transport(t, [{ headers: { 'content-type': 'text/html; charset=iso-8859-1' }, chunks: [Buffer.from('<title>Caf\xe9</title>', 'latin1')] }]);
  assert.equal((await publicDocument(origin)).html, '<title>Café</title>');
});
