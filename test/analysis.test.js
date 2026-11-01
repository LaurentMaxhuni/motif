import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWebsite, robotsPolicy } from '../lib/analysis.js';

const root = 'https://example.com/';
const home = `<html lang="en"><head><title>Acme | Useful software</title><meta property="og:site_name" content="Acme"><meta name="description" content="Simple scheduling software for growing teams."><meta name="theme-color" content="#123456"><link rel="canonical" href="/"><link rel="stylesheet" href="/main.css"></head><body><main><h1>Scheduling for growing teams</h1><p>We build simple scheduling software for growing teams.</p><p>Built for teams who want to save time and simplify their work.</p><a href="/about">About</a><a href="/products">Products</a><a href="/pricing">Pricing</a><a href="/private">Hidden</a><a href="/login">Login</a><a href="https://other.example/about">Outside</a><a href="/about?tracking=1#story">About duplicate</a><img src="/logo.svg" alt="Acme logo"><a href="/contact">Book a demo</a></main></body></html>`;
const fixtures = { [root + 'robots.txt']: 'User-agent: *\nDisallow: /private\nSitemap: https://example.com/sitemap.xml', [root + 'sitemap.xml']: '<urlset><url><loc>https://example.com/services</loc></url></urlset>', [root]: home, [root + 'about']: '<html><title>About Acme</title><h1>Our story</h1><p>Our mission is to help teams organize work with clarity.</p></html>', [root + 'products']: '<html><title>Products</title><h1>Team scheduling</h1><script type="application/ld+json">{"@type":"SoftwareApplication","name":"Acme Scheduler","description":"Shared team calendars"}</script><p>Save time with shared team calendars and clear availability.</p></html>', [root + 'main.css']: ':root{--brand:#abcdef}body{font-family:Inter,sans-serif;background:#fff}' };
function transport(overrides = {}) {
  const calls = [];
  return { calls, fetchDocument: async (url, _redirects, options) => {
    calls.push({ url, options });
    const value = { ...fixtures, ...overrides }[url];
    if (value instanceof Error) throw value;
    if (value === undefined) throw Object.assign(new Error('Missing'), { statusCode: 404 });
    return typeof value === 'object' ? value : { html: value, url };
  } };
}
test('deep extraction follows prioritized public pages, robots, assets and provenance', async () => {
  const fixture = transport(); const progress = [];
  const result = await analyzeWebsite({ url: root, maxPages: 4 }, {}, { ...fixture, onProgress: v => progress.push(v.stage) });
  assert.equal(result.name, 'Acme'); assert.equal(result.analysis.mode, 'extraction');
  assert.equal(result.analysis.coverage.analyzedPages, 3);
  assert.equal(result.analysis.pages[1].url, root + 'about');
  assert.ok(result.product.includes('Acme Scheduler')); assert.ok(result.audience.includes('Built for teams')); assert.equal(result.voice, '');
  assert.ok(result.analysis.findings.visualIdentity.palette.some(v => v.color === '#abcdef' && v.sourceUrls.includes(root + 'main.css')));
  assert.ok(result.analysis.findings.visualIdentity.fonts.includes('Inter,sans-serif'));
  assert.ok(result.analysis.evidence.every(e => e.sourceUrls.length && ['observed', 'inferred'].includes(e.kind)));
  assert.ok(result.analysis.coverage.failures.some(v => v.url === root + 'pricing'));
  assert.ok(!fixture.calls.some(c => /other.example|\/private$|\/login$|tracking/.test(c.url)));
  assert.ok(fixture.calls.every(c => c.options.sameOrigin === 'https://example.com' && c.options.signal));
  assert.equal(progress.at(-1), 'complete');
});
test('reject unsafe inputs before transport and validate explicit bounds', async () => {
  let calls = 0; const dependencies = { fetchDocument: async () => { calls++; } };
  for (const url of ['file:///secret', 'http://localhost/', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/', 'https://user:secret@example.com/', 'https://example.com:444/', 'http://10.0.0.1', 'http://0x7f000001']) await assert.rejects(analyzeWebsite({ url }, {}, dependencies));
  for (const maxPages of [0, 21, 1.5, 'wrong']) await assert.rejects(analyzeWebsite({ url: root, maxPages }, {}, dependencies));
  await assert.rejects(analyzeWebsite({ url: root, useAI: 'yes' }, {}, dependencies));
  assert.equal(calls, 0);
});
test('page limit and canonical deduplication bound crawl', async () => {
  const fixture = transport({ [root + 'about']: '<head><title>Duplicate</title><link rel="canonical" href="/"></head><body><h1>Duplicate home</h1></body>' });
  const result = await analyzeWebsite({ url: root, maxPages: 2 }, {}, fixture);
  assert.equal(result.analysis.pages.length, 2); assert.ok(!result.analysis.pages.some(p => p.title === 'Duplicate'));
  assert.ok(result.analysis.coverage.requests <= 36);
  assert.ok(result.analysis.warnings.some(v => v.includes('Bounded scan')));
});
test('robots fail closed except explicit missing status and obey agent/rule specificity', async () => {
  const policy = robotsPolicy('User-agent: *\nDisallow: /\nUser-agent: MotifLocal\nDisallow: /private*\nAllow: /private/public$');
  assert.ok(policy.allowed(new URL(root))); assert.ok(!policy.allowed(new URL(root + 'private/a')));
  assert.ok(policy.allowed(new URL(root + 'private/public'))); assert.ok(!policy.allowed(new URL(root + 'private/public/a')));
  await assert.rejects(analyzeWebsite({ url: root }, {}, transport({ [root + 'robots.txt']: new Error('Timeout') })), /verify robots/);
  await assert.rejects(analyzeWebsite({ url: root }, {}, transport({ [root + 'robots.txt']: 'User-agent: *\nDisallow: /' })), /disallows/);
  const result = await analyzeWebsite({ url: root, maxPages: 1 }, {}, transport({ [root + 'robots.txt']: Object.assign(new Error('Missing'), { statusCode: 404 }) }));
  assert.equal(result.analysis.coverage.robots, 'not-published');
});
test('cross-origin redirect is excluded, partial page failures retain useful draft', async () => {
  const fixture = transport({ [root + 'about']: { html: '<h1>Evil</h1>', url: 'http://127.0.0.1/' } });
  const result = await analyzeWebsite({ url: root, maxPages: 3 }, {}, fixture);
  assert.ok(result.analysis.coverage.failures.some(v => v.url.endsWith('/about') && /Cross-origin/.test(v.error)));
  assert.ok(result.analysis.pages.every(p => new URL(p.url).origin === 'https://example.com'));
  assert.equal(result.name, 'Acme');
});
const settings = { textEndpoint: 'http://127.0.0.1:11434/v1', textModel: 'local-model' };
test('local synthesis accepts cited interpretations and retains observed evidence', async () => {
  let invocation; const controller = new AbortController();
  const result = await analyzeWebsite({ url: root, maxPages: 1, useAI: true }, settings, { ...transport(), signal: controller.signal, infer: async (...args) => { invocation = args; return JSON.stringify({ claims: [{ field: 'voice', value: 'Clear and practical', sourceUrls: [root], quote: 'We build simple scheduling software for growing teams.' }] }); } });
  assert.equal(result.voice, 'Clear and practical'); assert.equal(result.analysis.mode, 'local-ai');
  assert.ok(result.analysis.evidence.some(e => e.kind === 'inferred' && e.quote));
  assert.equal(invocation[0], settings); assert.equal(invocation[2], true);
  assert.equal(invocation[4], controller.signal);
  assert.ok(invocation[1][1].content.length < 60000);
});
test('malformed or fabricated synthesis falls back atomically without losing extraction', async () => {
  for (const response of ['not-json', '{"claims":[{"field":"name","value":"Fake"}]}', JSON.stringify({ claims: [{ field: 'voice', value: 'Luxury', sourceUrls: ['https://evil.example/'], quote: 'We build simple scheduling software for growing teams.' }] }), JSON.stringify({ claims: [{ field: 'voice', value: 'Luxury', sourceUrls: [root], quote: 'Made up quote completely absent.' }] })]) {
    const result = await analyzeWebsite({ url: root, maxPages: 1, useAI: true }, settings, { ...transport(), infer: async () => response });
    assert.equal(result.analysis.mode, 'extraction'); assert.equal(result.voice, ''); assert.equal(result.name, 'Acme');
    assert.ok(result.analysis.warnings.some(v => v.includes('observed extraction retained')));
    assert.ok(result.analysis.evidence.every(e => e.kind === 'observed'));
  }
  await assert.rejects(analyzeWebsite({ url: root, useAI: true }, { textEndpoint: 'https://cloud.example' }, transport()), /local/);
});

test('caller cancellation aborts between requests and is not converted to partial success', async () => {
  const controller = new AbortController(); const fixture = transport();
  await assert.rejects(analyzeWebsite({ url: root }, {}, { ...fixture, signal: controller.signal, onProgress: value => { if (value.stage === 'crawl') controller.abort(new Error('Canceled by user')); } }), /Canceled by user/);
  assert.ok(!fixture.calls.some(c => c.url === root));
});

test('transport redirect callback excludes robots-disallowed and cross-origin targets before fetching', async () => {
  const fixture = transport();
  let inspected = false;
  const result = await analyzeWebsite({ url: root, maxPages: 2 }, {}, { fetchDocument: async (url, redirects, options) => {
    if (url === root + 'about') {
      inspected = true;
      assert.equal(options.allowUrl(root + 'private/secret'), false);
      assert.equal(options.allowUrl(root + 'login'), false);
      assert.equal(options.allowUrl('https://other.example/about'), false);
      assert.equal(options.allowUrl('http://127.0.0.1/'), false);
      assert.equal(options.allowUrl(root + 'products'), true);
      throw new Error('Redirect rejected by crawl policy.');
    }
    return fixture.fetchDocument(url, redirects, options);
  } });
  assert.equal(inspected, true);
  assert.ok(result.analysis.coverage.failures.some(f => f.url.endsWith('/about')));
});
