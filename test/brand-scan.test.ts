import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { analyzeWebsite } from '../lib/analysis.ts';
import { summarizePalette, brandColorsFrom } from '../lib/brand-palette.ts';
import { findFigures, voiceProfile } from '../lib/brand-voice.ts';
import { renderSite } from '../lib/brand-render.ts';
import type { RenderSite } from '../lib/brand-render.ts';
import { chromePath } from '../lib/render.ts';
import { parseModelList } from '../lib/cli.ts';
import { brandInput } from '../lib/core.ts';
import type { publicDocument } from '../lib/core.ts';
import { brandContext } from '../lib/brand-data.ts';
import { fixturePNG } from './fixtures.ts';

const color = (value: string, roles: Partial<Record<'background' | 'text' | 'action' | 'logo' | 'heading', number>>) => {
  const entry = { background: 0, text: 0, action: 0, logo: 0, heading: 0, ...roles };
  return { color: value, ...entry, weight: entry.background + entry.text + entry.action + entry.logo + entry.heading };
};

test('palette favours the color on buttons and the logo over a large illustration tint', () => {
  const palette = summarizePalette([
    color('#ffffff', { background: 5_000_000 }),
    color('#e7b75f', { background: 900_000 }),
    color('#ffe01b', { action: 400_000 }),
    color('#ffe11c', { action: 20_000 }), // a hover shade, merged with the yellow
    color('#007c89', { action: 60_000, text: 2_000 }),
    color('#241c15', { text: 90_000, heading: 40_000 }),
    color('#f7bf8b', { text: 30 }), // a tiny label color is not a brand color
  ]);
  assert.deepEqual(palette.slice(0, 2).map(item => [item.color, item.role]), [['#ffe01b', 'primary'], ['#007c89', 'secondary']]);
  assert.equal(palette.find(item => item.role === 'text')?.color, '#241c15');
  assert.equal(palette.find(item => item.role === 'background')?.color, '#ffffff');
  assert.ok(!palette.some(item => item.color === '#f7bf8b' || item.color === '#ffe11c'));
  assert.deepEqual(brandColorsFrom(palette).slice(0, 2), ['#ffe01b', '#007c89']);
  const mono = summarizePalette([color('#08090a', { background: 4_000_000, action: 1000 }), color('#f7f8f8', { text: 50_000, heading: 30_000, logo: 8000 })]);
  assert.equal(mono[0].role, 'primary');
  assert.ok(brandColorsFrom(mono).length >= 2);
});

test('figures are quoted statistics, not phone numbers, years or rankings', () => {
  const blocks = ['Trusted by 12,000+ teams in 40 countries.', 'Rated 4.9/5 from 2,300 reviews.', 'Founded in 2014 in Berlin.', 'Call +1 555 123 4567 today.', '© 2024 Acme. All rights reserved.', 'Loved by major enterprise and Fortune 500 companies.', 'Plans start at $19 per month.'].map(quote => ({ quote, sourceUrl: 'https://acme.test/' }));
  const figures = findFigures(blocks).map(item => item.figure);
  assert.deepEqual(figures, ['12,000+ teams', '40 countries', '4.9/5', '2,300 reviews', 'Founded in 2014', '$19']);
  assert.equal(findFigures(blocks)[3].context, 'Rated 4.9/5 from 2,300 reviews.');
});

test('voice profile is measured from the copy itself', () => {
  const copy = ['We’re a small team that builds calm software. You’ll love how simple it is. Try it free for 14 days.', 'Our tools help you plan, write and publish in one place. You can start in minutes and invite your team when you’re ready.', 'Plan your week. Write your posts. Publish when it suits you, not when the algorithm says so.'].map(quote => ({ quote, sourceUrl: 'https://acme.test/' }));
  const profile = voiceProfile(copy, ['Plan your week in minutes', 'The calm way to publish', 'Built for teams that ship'])!;
  assert.ok(profile.traits.some(trait => /Short, punchy/.test(trait)));
  assert.ok(profile.traits.includes('Talks to the reader as "you"'));
  assert.ok(profile.traits.some(trait => /contractions/.test(trait) && /Conversational/.test(trait)));
  assert.ok(profile.traits.includes('Headlines in sentence case'));
  assert.ok(!profile.traits.includes('Uses emoji'));
  assert.equal(voiceProfile([{ quote: 'Too short to judge.', sourceUrl: 'x' }], []), undefined);
});

test('CLI model lists are parsed from each tool’s own output', () => {
  assert.deepEqual(parseModelList('opencode', 'lmstudio/qwen/qwen3-30b\nopenai/gpt-5\n\nnot a model line').map(m => m.id), ['lmstudio/qwen/qwen3-30b', 'openai/gpt-5']);
  assert.deepEqual(parseModelList('pi', 'provider  model  context\nfree-kilo  kilo-auto/free  256K\nanthropic  claude-sonnet  200K').map(m => m.id), ['free-kilo/kilo-auto/free', 'anthropic/claude-sonnet']);
  assert.deepEqual(parseModelList('omp', 'free-aion (2)\n┌──┐\n│ model │ context │\n├──┤\n│ aion-labs/aion-2.0 │ 128K │\n│ --evil │ 1 │\nlocal (1)\n│ qwen3 │ 32K │').map(m => m.id), ['free-aion/aion-labs/aion-2.0', 'local/qwen3']);
});

test('brands keep up to six colors and image data never reaches model prompts', () => {
  const base = { name: 'Acme', colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'] };
  assert.equal(brandInput(base).colors.length, 6);
  assert.throws(() => brandInput({ ...base, colors: [...base.colors, '#777777'] }), /six/);
  assert.deepEqual(brandInput({ name: 'Acme' }).colors, ['#d95279', '#243c32']);
  const context = brandContext({ ...brandInput(base), analysis: { mode: 'extraction', findings: { visualIdentity: { logoImages: [{ dataUrl: 'data:image/png;base64,AAAA', alt: 'Acme' }], screenshot: 'data:image/jpeg;base64,BBBB' }, figures: [{ figure: '40 countries' }] }, evidence: [] } as never });
  const findings = (context as { research: { findings: string } }).research.findings;
  assert.doesNotMatch(findings, /data:image|BBBB/);
  assert.match(findings, /40 countries/);
});

const root = 'https://brand.example/';
function site(documents: Record<string, string>) {
  const calls: { url: string; options: Record<string, unknown> }[] = [];
  return { calls, fetchDocument: (async (url: string, _redirects: number, options: Record<string, unknown> = {}) => {
    calls.push({ url, options });
    if (!(url in documents)) throw Object.assign(new Error('Missing'), { statusCode: 404 });
    return options.binary ? { html: '', url, body: Buffer.from(documents[url]), contentType: url.endsWith('.css') ? 'text/css' : 'text/html' } : { html: documents[url], url };
  }) as unknown as typeof publicDocument };
}

test('the browser scan fills in JavaScript-only pages, palette, logos and imagery', async () => {
  const network = site({ [root]: '<title>Brand</title><meta property="og:site_name" content="Brand"><div id="app"></div>' });
  let received: Parameters<RenderSite>[1] | undefined, targets: string[] = [];
  const renderer: RenderSite = async (urls, options) => {
    received = options; targets = urls;
    await options.fetch(root, { document: true });
    return { warnings: [], pages: [{ url: root, requestedUrl: root, html: '<title>Brand</title><main><h1>Coffee for slow mornings</h1><p>We roast small batches every Tuesday for 300 cafés in 12 cities, and we deliver them to your door within two days.</p></main>', palette: [color('#ffffff', { background: 3_000_000 }), color('#c2410c', { action: 200_000, logo: 30_000 }), color('#1c1917', { text: 80_000 })], fonts: { heading: 'Fraunces', body: 'Inter', loaded: ['Fraunces', 'Inter'] }, logos: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgo=', width: 120, height: 32, alt: 'Brand', sourceUrl: root, backdrop: '#ffffff' }], images: [{ dataUrl: 'data:image/jpeg;base64,/9j/4AAQ', width: 900, height: 600, alt: 'Beans', src: root + 'beans.jpg', sourceUrl: root }], screenshot: 'data:image/jpeg;base64,/9j/4AAQ' }] };
  };
  const result = await analyzeWebsite({ url: root, maxPages: 1, render: true }, {}, { ...network, renderSite: renderer });
  assert.deepEqual(targets, [root]);
  assert.equal(received!.allowDocument(root + 'about'), true);
  assert.equal(received!.allowDocument('https://elsewhere.example/'), false);
  assert.equal(received!.allowDocument(root + 'login'), false);
  const documentCall = network.calls.find(call => call.options.binary);
  assert.equal(documentCall?.options.sameOrigin, 'https://brand.example');
  assert.equal(result.analysis.pages[0].quality, 'rendered-html');
  assert.equal(result.colors[0], '#c2410c');
  const visual = result.analysis.findings.visualIdentity;
  assert.equal(visual.typography.headings, 'Fraunces');
  assert.equal(visual.logoImages[0].alt, 'Brand');
  assert.equal(visual.images[0].alt, 'Beans');
  assert.ok(result.analysis.findings.figures.some(item => item.figure === '300 cafés' || item.figure === '12 cities'));
  assert.equal(result.analysis.findings.technical.javascriptExecuted, true);
  // Without the browser scan the same site has no readable content.
  await assert.rejects(analyzeWebsite({ url: root, maxPages: 1 }, {}, network), /readable/);
});

test('a failing browser scan keeps the HTML results', async () => {
  const network = site({ [root]: '<title>Brand</title><main><h1>Coffee</h1><p>We roast small batches of coffee for cafés and homes every single week.</p></main>' });
  const result = await analyzeWebsite({ url: root, maxPages: 1, render: true }, {}, { ...network, renderSite: async () => { throw new Error('Chrome crashed'); } });
  assert.equal(result.analysis.pages.length, 1);
  assert.ok(result.analysis.warnings.some(warning => /browser scan stopped early: Chrome crashed/.test(warning)));
});

test('real Chrome scan routes every request through Motif and cannot reach local servers directly', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  let localHits = 0;
  const local = http.createServer((_req, res) => { localHits++; res.end('x'); });
  await new Promise<void>(resolve => local.listen(0, '127.0.0.1', resolve));
  const port = (local.address() as AddressInfo).port;
  const png = fixturePNG(400);
  const page = `<!doctype html><html><head><title>Brand</title><style>body{margin:0;background:#fafaf9;color:#1c1917;font-family:Georgia}header{height:80px}a.cta{display:inline-block;padding:14px 24px;background:#c2410c;color:#fff}.hero{width:900px;height:500px}</style></head><body><header><a href="/"><img src="/logo.png" alt="Brand logo" width="140" height="40"></a></header><main><h1>Coffee for slow mornings</h1><p id="late"></p><a class="cta" href="/shop">Shop coffee</a><img class="hero" src="/hero.png" alt="Beans"><img src="http://127.0.0.1:${port}/leak.png"></main><script>document.getElementById('late').textContent='Written by JavaScript after load.'</script></body></html>`;
  const seen: string[] = [];
  try {
    const result = await renderSite([root], { allowDocument: url => url.startsWith(root), brandName: 'Brand', fetch: async url => {
      seen.push(url);
      if (url === root) return { url, body: Buffer.from(page), contentType: 'text/html' };
      if (url.startsWith(root)) return { url, body: png, contentType: 'image/png' };
      throw new Error('Private addresses are refused.');
    } });
    assert.deepEqual(result.warnings, []);
    const view = result.pages[0];
    assert.match(view.html, /Written by JavaScript after load/);
    assert.ok(view.palette.some(entry => entry.color === '#c2410c' && entry.action > 0));
    assert.equal(view.fonts.heading, 'Georgia');
    assert.equal(view.logos[0]?.alt, 'Brand logo');
    assert.ok(view.images.some(image => image.alt === 'Beans'));
    assert.ok(seen.includes(`http://127.0.0.1:${port}/leak.png`), 'the local request went through Motif’s fetcher');
    assert.equal(localHits, 0, 'Chrome never connected to the local server itself');
  } finally { await new Promise(resolve => local.close(resolve)); }
});
