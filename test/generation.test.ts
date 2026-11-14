import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.ts';
import { defaultSettings } from '../lib/core.ts';
import type { GenerationJob } from '../src/lib/generation.ts';

test('failed generation can be retried with the original calendar dates', async t => {
  const { server, store } = createApp({ database: ':memory:', seed: true });
  t.after(() => server.close());
  const host = 'localhost:3333';
  const state = (await server.inject({ url: '/api/state', headers: { host } })).json();
  const headers = { host, 'x-motif-token': state.token };
  const brandId = state.brands[0].id;
  const path = '/api/generation-jobs/' + brandId;
  const scheduledDates = ['2027-03-04T09:00:00.000Z', '2027-03-05T09:00:00.000Z'];
  const input = { kind: 'Social post', mode: 'ai', count: 2, brief: 'A new collection', scheduledDates };

  async function finished(): Promise<GenerationJob> {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const response = await server.inject({ url: path, headers });
      assert.equal(response.statusCode, 200);
      const job: GenerationJob = response.json().job;
      if (job.status !== 'running') return job;
      await setTimeout(20);
    }
    assert.fail('Generation did not finish in time');
  }

  const invalid = await server.inject({ method: 'POST', url: path, headers, payload: { ...input, scheduledDates: [] } });
  assert.equal(invalid.statusCode, 400);
  const started = await server.inject({ method: 'POST', url: path, headers, payload: input });
  assert.equal(started.statusCode, 202);
  const failed = await finished();
  assert.equal(failed.status, 'failed');
  assert.match(failed.error!, /text model/);
  assert.equal(store.all('content').length, 4);

  store.save('settings', {
    ...defaultSettings, textProvider: 'claude',
    cliProfiles: { claude: { executable: fileURLToPath(new URL('./fixtures/cli-provider.ts', import.meta.url)), model: 'fixture/claude' } },
  });
  const retried = await server.inject({ method: 'POST', url: `${path}/${failed.id}/retry`, headers, payload: {} });
  assert.equal(retried.statusCode, 202);
  const complete = await finished();
  assert.notEqual(complete.id, failed.id);
  assert.equal(complete.status, 'completed', complete.error);
  assert.equal(complete.completed, 2);
  assert.equal(store.all('content').length, 6);
  const planned = store.all('content').filter(item => item.scheduledAt);
  assert.deepEqual(planned.map(item => item.scheduledAt).sort(), scheduledDates);
  assert.ok(planned.every(item => item.status === 'Draft' && item.brandId === brandId));
  assert.equal((await server.inject({ method: 'POST', url: `${path}/${complete.id}/retry`, headers, payload: {} })).statusCode, 409);
});
