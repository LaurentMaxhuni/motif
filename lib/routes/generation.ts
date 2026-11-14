import { randomUUID } from 'node:crypto';
import { contentInput, fail, generate, generationInput, text } from '../core.ts';
import { renderDesign } from '../render.ts';
import type { GenerationJob, GenerationRequest } from '../../src/lib/generation.ts';
import type { ApiRoutes, BodyRequest } from './types.ts';

interface JobEntry {
  job: GenerationJob;
  input: GenerationRequest;
  controller: AbortController;
}

interface BrandRequest extends BodyRequest { Params: { brandId: string } }
interface JobRequest extends BodyRequest { Params: { brandId: string; jobId: string } }

export const generationRoutes: ApiRoutes = async (app, { store, settings, images }) => {
  const latest = new Map<string, JobEntry>();

  async function createDrafts(brandId: string, input: GenerationRequest, entry?: JobEntry) {
    const brand = store.get('brand', brandId);
    const config = settings();
    if (input.mode === 'hybrid') images.assertReady(config);
    const signal = entry?.controller.signal;
    const generated = await generate(config, brand, input, signal);
    signal?.throwIfAborted();
    for (const item of generated) {
      if (item.design) {
        if (entry) entry.job.stage = 'artwork';
        item.image = await images.generate(config, item.design.imagePrompt, undefined, signal);
        signal?.throwIfAborted();
        if (entry) entry.job.stage = 'render';
        item.rendered = (await renderDesign(item, brand, signal)).rendered;
        signal?.throwIfAborted();
      }
      if (entry) entry.job.completed++;
    }
    if (entry) entry.job.stage = 'save';
    store.get('brand', brandId);
    const items = generated.map((item, index) => contentInput({
      ...item, brandId, status: 'Draft', scheduledAt: input.scheduledDates?.[index],
    }, [brandId]));
    store.db.exec('BEGIN');
    try {
      const saved = items.map(item => store.save('content', item));
      store.db.exec('COMMIT');
      if (entry) entry.job.status = 'completed';
      return saved;
    } catch (error) {
      store.db.exec('ROLLBACK');
      throw error;
    }
  }

  function start(brandId: string, input: GenerationRequest) {
    store.get('brand', brandId);
    if (latest.get(brandId)?.job.status === 'running')
      fail('Generation is already running for this brand.', 409);
    const entry: JobEntry = {
      input, controller: new AbortController(),
      job: { id: randomUUID(), status: 'running', stage: 'design', completed: 0, count: input.count, weekly: !!input.scheduledDates },
    };
    latest.set(brandId, entry);
    void createDrafts(brandId, input, entry).catch(error => {
      if (entry.job.status !== 'running') return;
      entry.job.status = 'failed';
      entry.job.error = error.status ? error.message : 'Generation failed. Check your providers and try again.';
      if (!error.status) console.error(error);
    });
    return { ...entry.job };
  }

  function getEntry({ brandId, jobId }: JobRequest['Params']) {
    const entry = latest.get(brandId);
    if (!entry || entry.job.id !== jobId) fail('This generation job is no longer current.', 404);
    return entry;
  }

  function cancel(entry: JobEntry) {
    if (entry.job.status === 'running') {
      entry.job.status = 'cancelled';
      entry.controller.abort();
    }
    return entry.job;
  }

  app.addHook('preClose', async () => {
    for (const entry of latest.values()) cancel(entry);
  });

  // Keep the synchronous API available to existing clients.
  app.post<BodyRequest>('/generate', async (request, reply) => {
    const brandId = text(request.body.brandId, 100);
    const items = await createDrafts(brandId, generationInput(request.body));
    return reply.code(201).send({ items });
  });

  const brandPath = '/generation-jobs/:brandId(^[a-zA-Z0-9-]+$)';
  const jobPath = brandPath + '/:jobId(^[a-zA-Z0-9-]+$)';
  app.get<BrandRequest>(brandPath, async request => ({
    job: latest.get(request.params.brandId)?.job ?? null,
  }));
  app.post<BrandRequest>(brandPath, async (request, reply) => {
    const input: GenerationRequest = generationInput(request.body);
    const dates = request.body.scheduledDates;
    if (dates !== undefined) {
      if (!Array.isArray(dates) || dates.length !== input.count ||
          dates.some(date => typeof date !== 'string' || date.length > 100 ||
            !/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date)))) {
        fail('Choose a valid calendar date for each draft.');
      }
      input.scheduledDates = dates;
    }
    return reply.code(202).send({ job: start(request.params.brandId, input) });
  });
  app.delete<JobRequest>(jobPath, async request => ({ job: cancel(getEntry(request.params)) }));
  app.post<JobRequest>(jobPath + '/retry', async (request, reply) => {
    const entry = getEntry(request.params);
    if (entry.job.status !== 'failed' && entry.job.status !== 'cancelled')
      fail('Only failed or cancelled generation can be retried.', 409);
    return reply.code(202).send({ job: start(request.params.brandId, entry.input) });
  });
};
