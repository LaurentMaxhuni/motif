import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { skillPrompt, skills, skillsFor } from '../lib/creative/skills/index.ts';
import { buildImagePrompt, colorName } from '../lib/creative/image-prompt.ts';
import { assessComposition, needsRefinement } from '../lib/creative/audit.ts';
import type { CompositionMeasure, TextMeasure } from '../lib/creative/audit.ts';
import { finalizeCreative, planConcepts } from '../lib/creative/workflow.ts';
import { renderDesign } from '../lib/render.ts';
import { fixtureDesign, fixturePNG } from './fixtures.ts';

const image = `data:image/png;base64,${fixturePNG().toString('base64')}`;
const brand = { name: 'Aster', website: '', description: 'Ceramics studio', audience: 'Home cooks', voice: 'Warm', product: 'Stoneware', colors: ['#d95279', '#243c32'], image: '', source: 'Manual' };
// Deliberately broken: headline off canvas and pale, subhead collides with the CTA, brand tiny at the edge.
const brokenDesign = {
  imagePrompt: fixtureDesign.imagePrompt,
  html: '<main class="ad"><img data-asset="artwork"><h1>{{headline}}</h1><p class="sub">{{subhead}}</p><strong>{{cta}}</strong><small>{{brand}}</small></main>',
  css: '.ad{width:1080px;height:1080px;position:relative;background:#fff;font-family:Arial}.ad img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}h1{position:absolute;left:900px;top:100px;font-size:40px;color:#eee;margin:0;white-space:nowrap}.sub{position:absolute;left:40px;top:500px;font-size:38px;color:#e0b0a0;margin:0}strong{position:absolute;left:40px;top:505px;font-size:30px;color:#222}small{position:absolute;left:10px;bottom:10px;font-size:12px}',
};

test('skills are composed per workflow stage and content kind', () => {
  assert.equal(new Set(skills.map(skill => skill.id)).size, skills.length);
  const ids = (stage: Parameters<typeof skillsFor>[0], kind = 'Ad creative') => skillsFor(stage, { kind }).map(skill => skill.id);
  assert.deepEqual(ids('concept'), ['creative-direction', 'advertising', 'graphic-design', 'brand-consistency', 'image-generation']);
  assert.ok(ids('critique').includes('visual-critique') && !ids('critique').includes('advertising'));
  assert.ok(!ids('layout').includes('visual-critique'));
  // Visual craft does not leak into non-visual formats.
  assert.ok(!ids('copy', 'Email').includes('typography'));
  const prompt = skillPrompt('copy', { kind: 'Social post', channel: 'LinkedIn' });
  assert.match(prompt, /^You are a senior copywriter/);
  assert.match(prompt, /LinkedIn: professional context/);
  assert.match(prompt, /the contract wins/);
});

test('image prompts are art directed, provider bounded and never ask for text', () => {
  assert.equal(colorName('#243c32'), 'deep green');
  assert.equal(colorName('#d95279'), 'pink');
  assert.equal(colorName('#f7f7f5'), 'off-white');
  assert.equal(colorName('bad'), '');
  const prompt = buildImagePrompt({ prompt: 'Editorial still life of a stoneware bowl', artDirection: 'Soft window light from the left', brandColors: brand.colors, provider: 'local' });
  assert.match(prompt, /^Editorial still life of a stoneware bowl\. Art direction: Soft window light/);
  assert.match(prompt, /pink, deep green/);
  assert.match(prompt, /no text, letters, numbers, logos/);
  const long = buildImagePrompt({ prompt: 'A detailed scene. '.repeat(300), artDirection: 'x'.repeat(500), brandColors: brand.colors, provider: 'cloudflare' });
  assert.ok(long.length <= 2048);
  assert.match(long, /no text, letters, numbers, logos/);
});

const text = (patch: Partial<TextMeasure>): TextMeasure => ({ role: 'text', label: 'p', text: 'Words', fontSize: 28, fontWeight: 400, fontFamily: 'arial', color: [20, 20, 20, 1], rects: [{ x: 80, y: 600, w: 400, h: 36 }], hidden: false, clipped: false, aided: false, ...patch });
const measure = (texts: TextMeasure[]): CompositionMeasure => ({ width: 1080, height: 1080, texts, artworkCoverage: 0.5 });

test('audit scoring rewards clean hierarchy and flags measurable defects', () => {
  const clean = measure([
    text({ role: 'headline', label: 'h1', text: 'Slow mornings', fontSize: 120, fontWeight: 700, rects: [{ x: 80, y: 120, w: 760, h: 130 }] }),
    text({ role: 'cta', label: 'strong', text: 'Shop the cups', rects: [{ x: 80, y: 900, w: 220, h: 36 }] }),
  ]);
  const light = clean.texts.map(() => Array(40).fill(0.95));
  assert.deepEqual(assessComposition(clean, light), { score: 100, issues: [] });

  const weak = measure([
    text({ role: 'headline', label: 'h1', fontSize: 40, rects: [{ x: 80, y: 120, w: 600, h: 50 }] }),
    text({ role: 'cta', label: 'strong', rects: [{ x: 80, y: 130, w: 300, h: 40 }] }),
  ]);
  const audit = assessComposition(weak, weak.texts.map(() => Array(40).fill(0.02)));
  const codes = audit.issues.map(issue => issue.code);
  assert.ok(codes.includes('overlap') && codes.includes('contrast') && codes.includes('hierarchy'), codes.join());
  assert.equal(audit.issues[0].severity, 'critical');
  assert.ok(needsRefinement(audit));
  assert.ok(assessComposition(measure([text({ role: 'headline', fontSize: 120 })])).issues.some(issue => issue.code === 'missing-cta'));
});

test('rendering audits real pixels: clean fixtures pass, broken layouts are diagnosed', async () => {
  const good = await renderDesign({ title: 'Good', design: fixtureDesign, headline: 'Slow mornings', cta: 'Explore', subhead: 'Made with intention', image }, brand);
  assert.equal(good.audit?.score, 100, JSON.stringify(good.audit));
  const bad = await renderDesign({ title: 'Bad', design: brokenDesign, headline: 'Slow mornings', cta: 'Explore', subhead: 'Made with intention', image }, brand);
  const codes = new Set(bad.audit!.issues.map(issue => issue.code));
  for (const code of ['off-canvas', 'contrast', 'overlap', 'tiny-text', 'hierarchy']) assert.ok(codes.has(code), code);
  assert.ok(needsRefinement(bad.audit!));
});

async function modelServer(respond: (input: any, system: string) => unknown) {
  const calls: any[] = [];
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); calls.push(body);
    const content = respond(JSON.parse(body.messages.at(-1).content), body.messages[0].content);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const settings = { textEndpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, textModel: 'fixture', imageEndpoint: 'http://127.0.0.1:9/v1', imageModel: 'fixture' };
  return { calls, settings, close: () => new Promise(resolve => server.close(resolve)) };
}

test('review refines failing designs once, keeps copy, and only accepts improvements', async t => {
  const model = await modelServer((input, system) => {
    assert.equal(input.task, 'design-refinement');
    assert.match(system, /## Visual critique/);
    assert.ok(input.findings.some((finding: string) => finding.startsWith('[critical]')));
    // Attempt to rewrite the copy as well; the workflow must ignore it.
    return { headline: 'Changed copy', design: { ...fixtureDesign, imagePrompt: 'ignored' } };
  });
  t.after(model.close);
  const item = { kind: 'Ad creative', channel: 'Instagram', title: 'Broken', headline: 'Slow mornings', cta: 'Explore', subhead: 'Made with intention', image, design: brokenDesign };
  const stages: string[] = [];
  const result = await finalizeCreative(item, { settings: model.settings, brand, concept: 'Route 1: Quiet rituals', onStage: stage => stages.push(stage) });
  assert.deepEqual(stages, ['render', 'review']);
  assert.equal(model.calls.length, 1);
  assert.equal(result.headline, 'Slow mornings');
  assert.equal(result.design.css, fixtureDesign.css);
  assert.equal(result.design.imagePrompt, brokenDesign.imagePrompt);
  assert.equal(result.review?.score, 100);
  assert.equal(result.review?.concept, 'Route 1: Quiet rituals');
  assert.ok(result.rendered?.startsWith('data:image/png;base64,'));

  // A refinement that is no better (or unreadable) is discarded; the original stays.
  const worse = await modelServer(() => 'not json');
  t.after(worse.close);
  const kept = await finalizeCreative(item, { settings: worse.settings, brand });
  assert.equal(kept.design.css, brokenDesign.css);
  assert.ok(kept.review!.score! < 70 && kept.review!.issues.length > 0);
});

test('concept planning returns one distinct route per draft and degrades gracefully', async t => {
  const model = await modelServer((input, system) => {
    assert.equal(input.task, 'creative-plan');
    assert.match(system, /## Creative direction/);
    assert.match(system, /exactly 2 concepts, each a genuinely different route/);
    return { concepts: [{ name: 'A', idea: 'One', artDirection: 'Light', extra: 'dropped' }, { name: 'B', idea: 'Two' }, { name: 'C', idea: 'Three' }] };
  });
  t.after(model.close);
  const concepts = await planConcepts(model.settings, brand, { kind: 'Ad creative', count: 2, brief: '' });
  assert.deepEqual(concepts?.map(concept => concept.name), ['A', 'B']);
  assert.equal(concepts?.[0].artDirection, 'Light');
  assert.ok(!('extra' in concepts![0]));
  const broken = await modelServer(() => 'no plan here');
  t.after(broken.close);
  assert.equal(await planConcepts(broken.settings, brand, { kind: 'Ad creative', count: 1, brief: '' }), undefined);
});
