import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../server.ts';

test('saved versions survive reopening SQLite and restore as a new draft', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'motif-history-'));
  const database = join(directory, 'motif.sqlite');
  let app = createApp({ database, seed: true });
  t.after(async () => {
    await app.server.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const host = 'localhost:3333';
  const initial = (await app.server.inject({ url: '/api/state', headers: { host } })).json();
  let headers = { host, 'x-motif-token': initial.token };
  const original = initial.contents[0];
  const path = '/api/contents/' + original.id;
  const read = async (suffix: string) => (await app.server.inject({ url: path + suffix, headers })).json();
  assert.deepEqual(await read('/versions'), { versions: [] });

  const saved = await app.server.inject({
    method: 'PUT', url: path, headers,
    payload: { ...original, title: 'Scheduled copy', status: 'Scheduled', scheduledAt: '2027-03-04T10:00:00.000Z' },
  });
  assert.equal(saved.statusCode, 200);
  const current = saved.json();
  assert.equal(current.version, original.version + 1);
  assert.deepEqual((await read('/versions/' + original.version)).item, original);

  await app.server.close();
  app = createApp({ database });
  const reopened = (await app.server.inject({ url: '/api/state', headers: { host } })).json();
  headers = { host, 'x-motif-token': reopened.token };
  const restore = (version: number) => app.server.inject({
    method: 'POST', url: path + '/versions/' + original.version + '/restore', headers, payload: { version },
  });
  assert.equal((await restore(original.version)).statusCode, 409);
  assert.equal((await read('/versions')).versions.length, 1);
  const restored = await restore(current.version);
  assert.equal(restored.statusCode, 200);
  assert.deepEqual(restored.json().item, {
    ...original, version: current.version + 1, status: 'Draft', scheduledAt: '', updatedAt: restored.json().item.updatedAt,
  });
  assert.deepEqual((await read('/versions')).versions.map(version => version.version), [current.version, original.version]);
  assert.deepEqual((await read('/versions/' + current.version)).item, current);
  assert.equal(app.store.all('content').length, initial.contents.length);

  const deleted = await app.server.inject({ method: 'DELETE', url: path, headers, payload: { version: current.version + 1 } });
  assert.equal(deleted.statusCode, 200);
  assert.equal((await app.server.inject({ url: path + '/versions', headers })).statusCode, 404);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS count FROM content_versions WHERE content_id = ?').get(original.id)?.count, 0);
});
